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
