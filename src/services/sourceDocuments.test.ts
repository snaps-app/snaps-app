/**
 * O cliente do pipeline de ingestao.
 *
 * Dois comportamentos aqui nao sao detalhe de implementacao, sao decisoes que ja
 * custaram caro neste repositorio:
 *
 *  - o upload precisa LIMPAR o Content-Type para o browser montar o
 *    multipart/form-data com boundary. Definir na mao omite o boundary e o
 *    backend nao consegue separar as partes. Ja ha um comentario sobre isso em
 *    services/storage.ts;
 *
 *  - falha NAO pode virar valor vazio. Foi exatamente assim que a busca passou a
 *    desenhar 401 como "nenhum resultado", e levou duas mensagens de diagnostico
 *    para descobrir. Aqui o erro sobe.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/services/client', () => ({
  api: { get: vi.fn(), post: vi.fn() },
  API_URL: 'http://api.test',
}));

import { api } from '@/services/client';
import {
  listSourceDocuments,
  uploadSourceDocument,
  decomposeSourceDocument,
  extractSourceDocument,
  getReviewSnaps,
  getSourceDocument,
  getSourceDocumentDownloadUrl,
  getDocumentSnaps,
} from '@/services/sourceDocuments';

const PROJETO = '7d17a48e-5615-4c90-9602-531f1b5a603d';
const DOC = '11111111-2222-4333-8444-555555555555';

beforeEach(() => vi.clearAllMocks());

describe('listar', () => {
  it('busca os documentos do projeto', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: [{ id: DOC, name: 'Aula 03.pdf' }] });
    const docs = await listSourceDocuments(PROJETO);
    expect(vi.mocked(api.get).mock.calls[0][0]).toBe(`/projects/${PROJETO}/source_documents/`);
    expect(docs).toHaveLength(1);
  });

  it('deixa o erro subir em vez de devolver lista vazia', async () => {
    // Lista vazia por falha e indistinguivel de "nao ha documento nenhum", e a
    // tela desenha as duas coisas igual.
    vi.mocked(api.get).mockRejectedValue(new Error('401'));
    await expect(listSourceDocuments(PROJETO)).rejects.toThrow('401');
  });
});

describe('upload', () => {
  it('manda multipart e limpa o Content-Type para o browser por o boundary', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: { id: DOC, status: 'uploaded' } });
    const arquivo = new File(['conteudo'], 'aula.pdf', { type: 'application/pdf' });

    await uploadSourceDocument(PROJETO, arquivo);

    const [rota, corpo, opcoes] = vi.mocked(api.post).mock.calls[0];
    expect(rota).toBe(`/projects/${PROJETO}/source_documents/upload`);
    expect(corpo).toBeInstanceOf(FormData);
    expect((corpo as FormData).get('file')).toBe(arquivo);
    expect((opcoes as any).headers['Content-Type']).toBeUndefined();
  });

  it('propaga a recusa do backend com a mensagem dele', async () => {
    // Limite de tamanho e allowlist de mimetype sao recusas com texto util. A
    // tela precisa mostrar o texto, nao um "algo deu errado".
    const recusa: any = new Error('Request failed');
    recusa.response = { status: 413, data: { detail: 'arquivo de 40 MB excede o limite de 25 MB' } };
    vi.mocked(api.post).mockRejectedValue(recusa);
    await expect(uploadSourceDocument(PROJETO, new File([''], 'x.pdf'))).rejects.toMatchObject({
      response: { status: 413 },
    });
  });
});

describe('extrair e decompor', () => {
  it('extrai o documento informado', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: { blocos: 54, status: 'extracted' } });
    const r = await extractSourceDocument(PROJETO, DOC);
    expect(vi.mocked(api.post).mock.calls[0][0]).toBe(
      `/projects/${PROJETO}/source_documents/${DOC}/extract`,
    );
    expect(r.blocos).toBe(54);
  });

  it('devolve o lote criado pela decomposicao', async () => {
    // `group_id` e o que amarra as notas ao lote; sem ele a tela de revisao nao
    // tem por onde agrupar.
    vi.mocked(api.post).mockResolvedValue({
      data: { group_id: 'lote-1', criados: 14, pulados_ja_promovidos: 0, blocos: 54 },
    });
    const r = await decomposeSourceDocument(PROJETO, DOC);
    expect(r.group_id).toBe('lote-1');
    expect(r.criados).toBe(14);
  });
});

describe('notas de um lote', () => {
  it('pede so o que ainda espera revisao, do documento certo', async () => {
    // Sem `status=staged` a lista traria de volta o que o humano ja aprovou, e
    // ele revisaria duas vezes a mesma nota.
    vi.mocked(api.get).mockResolvedValue({ data: [] });
    await getReviewSnaps(PROJETO, { sourceDocumentId: DOC });

    const [rota, config] = vi.mocked(api.get).mock.calls[0];
    expect(rota).toBe(`/projects/${PROJETO}/snaps/`);
    expect((config as any).params).toMatchObject({
      source_document_id: DOC,
      status: 'staged',
    });
  });

  it('alcanca lote sem documento de origem, pelo group_id', async () => {
    // Artefato de agente nasce `staged` sem source_document_id. Filtrar so por
    // documento deixaria esses lotes inalcancaveis.
    vi.mocked(api.get).mockResolvedValue({ data: [] });
    await getReviewSnaps(PROJETO, { groupId: 'lote-9' });
    expect((vi.mocked(api.get).mock.calls[0][1] as any).params).toMatchObject({
      group_id: 'lote-9',
      status: 'staged',
    });
  });

  it('nao manda parametro vazio quando nao ha filtro', async () => {
    // `source_document_id=undefined` viraria querystring lixo e, pior, o backend
    // devolveria a base inteira do projeto na tela de revisao de um lote.
    vi.mocked(api.get).mockResolvedValue({ data: [] });
    await expect(getReviewSnaps(PROJETO, {})).rejects.toThrow(/documento ou lote/i);
    expect(api.get).not.toHaveBeenCalled();
  });
});

describe('baixar o original', () => {
  it('devolve a URL assinada que o backend gera, nao um caminho de API', async () => {
    // O bucket e privado. O binario so e alcancavel pela URL assinada de
    // validade curta que a rota devolve -- montar `/download` na mao e apontar
    // o navegador para um endpoint que exige o header de autenticacao que uma
    // navegacao de aba nova nao carrega.
    vi.mocked(api.get).mockResolvedValue({
      data: { url: 'https://storage.test/assinada?token=abc', expira_em_segundos: 300 },
    });

    const url = await getSourceDocumentDownloadUrl(PROJETO, DOC);

    expect(api.get).toHaveBeenCalledWith(
      `/projects/${PROJETO}/source_documents/${DOC}/download`,
    );
    expect(url).toBe('https://storage.test/assinada?token=abc');
  });

  it('deixa subir a recusa de documento sem binario', async () => {
    // 404 aqui e informacao: o documento nasceu por texto e nao ha original
    // para baixar. Virar string vazia esconderia isso do botao.
    vi.mocked(api.get).mockRejectedValue({ response: { status: 404 } });
    await expect(getSourceDocumentDownloadUrl(PROJETO, DOC)).rejects.toBeTruthy();
  });
});

describe('abrir um documento', () => {
  it('carrega os blocos extraidos junto do documento', async () => {
    // A rota por id responde SourceDocumentWithBlocks. Sem tipar `blocks` o
    // painel nao tem como mostrar de onde cada nota saiu.
    vi.mocked(api.get).mockResolvedValue({
      data: {
        id: DOC,
        name: 'Aula 03.pdf',
        status: 'extracted',
        blocks: [
          { id: 'b1', block_id: 'p1-b1', page: 1, ordem: 0, tipo: 'paragrafo', content: 'Primeiro' },
          { id: 'b2', block_id: 'p2-b1', page: 2, ordem: 1, tipo: 'paragrafo', content: 'Segundo' },
        ],
      },
    });

    const doc = await getSourceDocument(PROJETO, DOC);

    expect(doc.blocks).toHaveLength(2);
    expect(doc.blocks?.[0].page).toBe(1);
    expect(doc.blocks?.[1].content).toBe('Segundo');
  });
});

describe('todas as notas de um material', () => {
  it('nao filtra por status: aprovada e pendente vem juntas', async () => {
    // `getReviewSnaps` forca status=staged, entao depois de aprovar o lote ele
    // devolve vazio -- e do documento nao havia caminho ate o que saiu dele.
    vi.mocked(api.get).mockResolvedValue({
      data: [{ id: 's1', status: 'active' }, { id: 's2', status: 'staged' }],
    });

    const notas = await getDocumentSnaps(PROJETO, DOC);

    const [, cfg] = vi.mocked(api.get).mock.calls[0] as any;
    expect(cfg.params.source_document_id).toBe(DOC);
    expect(cfg.params.status).toBeUndefined();
    expect(notas).toHaveLength(2);
  });

  it('deixa a falha subir, como o resto do modulo', async () => {
    vi.mocked(api.get).mockRejectedValue({ response: { status: 403 } });
    await expect(getDocumentSnaps(PROJETO, DOC)).rejects.toBeTruthy();
  });
});
