/**
 * O painel de um material.
 *
 * A lista responde "em que ponto isto esta". O painel responde as perguntas que
 * a lista nao cabe: por que a extracao falhou, o que exatamente foi lido do
 * arquivo, e o que ainda falta decidir.
 *
 * Duas regras que valem mais do que a aparencia:
 *
 *  - falha de carregamento e uma tela propria, nunca um material vazio. Foi
 *    assim que a busca passou a desenhar 401 como "nenhum resultado";
 *
 *  - a esteira mostra o estado REAL do documento. Um passo desenhado como
 *    concluido quando nao esta e pior do que nao desenhar passo nenhum.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('@/services/sourceDocuments', () => ({
  getSourceDocument: vi.fn(),
  extractSourceDocument: vi.fn(),
  decomposeSourceDocument: vi.fn(),
  getSourceDocumentDownloadUrl: vi.fn(),
  getReviewSnaps: vi.fn(),
}));

import {
  getSourceDocument,
  extractSourceDocument,
  decomposeSourceDocument,
  getSourceDocumentDownloadUrl,
  getReviewSnaps,
} from '@/services/sourceDocuments';
import { SourceDocumentPanel } from '@/app/components/documents/source-document-panel';

const PROJETO = '7d17a48e-5615-4c90-9602-531f1b5a603d';
const DOC = 'doc-1';

const bloco = (n: number) => ({
  id: `b${n}`,
  block_id: `p${n}-b1`,
  page: n,
  ordem: n - 1,
  tipo: 'paragrafo',
  content: `Conteudo do bloco ${n}`,
});

const doc = (over: any = {}) => ({
  id: DOC,
  project_id: PROJETO,
  name: 'Aula 03 - Fotossintese.pdf',
  status: 'extracted',
  content: 'texto extraido',
  raw_data: { mimetype: 'application/pdf', size: 2_400_000, paginas: 12 },
  blocks: [bloco(1), bloco(2)],
  ...over,
});

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getReviewSnaps).mockResolvedValue([]);
});

describe('carregamento', () => {
  it('falha de carregamento vira tela de erro, nao material vazio', async () => {
    vi.mocked(getSourceDocument).mockRejectedValue({
      response: { data: { detail: 'Documento nao encontrado' } },
    });

    render(<SourceDocumentPanel projectId={PROJETO} docId={DOC} onVoltar={vi.fn()} />);

    expect(await screen.findByText(/Documento nao encontrado/)).toBeInTheDocument();
    expect(screen.queryByText(/Nenhum bloco/i)).not.toBeInTheDocument();
  });

  it('mostra o nome e o que se sabe do arquivo', async () => {
    vi.mocked(getSourceDocument).mockResolvedValue(doc() as any);

    render(<SourceDocumentPanel projectId={PROJETO} docId={DOC} onVoltar={vi.fn()} />);

    expect(await screen.findByText('Aula 03 - Fotossintese.pdf')).toBeInTheDocument();
    expect(screen.getByText(/2\.3 MB|2\.4 MB/)).toBeInTheDocument();
    expect(screen.getByText(/12 páginas/)).toBeInTheDocument();
  });
});

describe('a esteira', () => {
  it('um documento so enviado nao desenha a extracao como concluida', async () => {
    vi.mocked(getSourceDocument).mockResolvedValue(
      doc({ status: 'uploaded', content: null, blocks: [] }) as any,
    );

    render(<SourceDocumentPanel projectId={PROJETO} docId={DOC} onVoltar={vi.fn()} />);

    const extracao = await screen.findByTestId('etapa-extracao');
    expect(extracao).toHaveAttribute('data-estado', 'pendente');
    expect(screen.getByTestId('etapa-upload')).toHaveAttribute('data-estado', 'concluida');
    expect(screen.getByTestId('etapa-decomposicao')).toHaveAttribute('data-estado', 'pendente');
  });

  it('extraido sem notas deixa so a decomposicao pendente', async () => {
    vi.mocked(getSourceDocument).mockResolvedValue(doc() as any);

    render(<SourceDocumentPanel projectId={PROJETO} docId={DOC} onVoltar={vi.fn()} />);

    await waitFor(() =>
      expect(screen.getByTestId('etapa-extracao')).toHaveAttribute('data-estado', 'concluida'),
    );
    expect(screen.getByTestId('etapa-decomposicao')).toHaveAttribute('data-estado', 'pendente');
  });

  it('a extracao que falhou aparece como falha, com a causa', async () => {
    vi.mocked(getSourceDocument).mockResolvedValue(
      doc({
        status: 'extraction_failed',
        blocks: [],
        extraction_error: 'PDF protegido por senha',
      }) as any,
    );

    render(<SourceDocumentPanel projectId={PROJETO} docId={DOC} onVoltar={vi.fn()} />);

    await waitFor(() =>
      expect(screen.getByTestId('etapa-extracao')).toHaveAttribute('data-estado', 'falhou'),
    );
    expect(screen.getByText('PDF protegido por senha')).toBeInTheDocument();
  });
});

describe('reprocessar', () => {
  it('tentar de novo re-extrai sem pedir novo upload', async () => {
    // O binario continua no storage. Este e o motivo de a extracao ser um passo
    // separado do upload: repetir custa uma chamada, nao um arquivo de novo.
    vi.mocked(getSourceDocument)
      .mockResolvedValueOnce(doc({ status: 'extraction_failed', blocks: [], extraction_error: 'timeout' }) as any)
      .mockResolvedValueOnce(doc() as any);
    vi.mocked(extractSourceDocument).mockResolvedValue({ blocos: 2, status: 'extracted' } as any);

    render(<SourceDocumentPanel projectId={PROJETO} docId={DOC} onVoltar={vi.fn()} />);

    await userEvent.click(await screen.findByRole('button', { name: /tentar de novo/i }));

    expect(extractSourceDocument).toHaveBeenCalledWith(PROJETO, DOC);
    await waitFor(() =>
      expect(screen.getByTestId('etapa-extracao')).toHaveAttribute('data-estado', 'concluida'),
    );
  });

  it('a falha da nova tentativa aparece, e o painel continua de pe', async () => {
    vi.mocked(getSourceDocument).mockResolvedValue(
      doc({ status: 'extraction_failed', blocks: [], extraction_error: 'timeout' }) as any,
    );
    vi.mocked(extractSourceDocument).mockRejectedValue({
      response: { data: { detail: 'PDF tem 90 páginas, o limite é 60' } },
    });

    render(<SourceDocumentPanel projectId={PROJETO} docId={DOC} onVoltar={vi.fn()} />);

    await userEvent.click(await screen.findByRole('button', { name: /tentar de novo/i }));

    expect(await screen.findByText(/90 páginas/)).toBeInTheDocument();
    expect(screen.getByText('Aula 03 - Fotossintese.pdf')).toBeInTheDocument();
  });
});

describe('decompor', () => {
  it('um documento so enviado nao oferece decompor', async () => {
    vi.mocked(getSourceDocument).mockResolvedValue(
      doc({ status: 'uploaded', content: null, blocks: [] }) as any,
    );

    render(<SourceDocumentPanel projectId={PROJETO} docId={DOC} onVoltar={vi.fn()} />);

    await screen.findByText('Aula 03 - Fotossintese.pdf');
    expect(screen.queryByRole('button', { name: /decompor/i })).not.toBeInTheDocument();
  });

  it('poucos blocos decompoem direto', async () => {
    vi.mocked(getSourceDocument).mockResolvedValue(doc() as any);
    vi.mocked(decomposeSourceDocument).mockResolvedValue({
      group_id: 'g1', criados: 5, pulados_ja_promovidos: 0, blocos: 2,
    } as any);

    render(<SourceDocumentPanel projectId={PROJETO} docId={DOC} onVoltar={vi.fn()} />);

    await userEvent.click(await screen.findByRole('button', { name: /decompor/i }));

    expect(decomposeSourceDocument).toHaveBeenCalledWith(PROJETO, DOC);
  });

  it('muitos blocos param e mostram a conta antes de gastar a espera', async () => {
    // Mesma regra do modal de importacao: acima do limite a esteira para e
    // mostra chamadas e minutos, porque as chamadas saem em sequencia.
    vi.mocked(getSourceDocument).mockResolvedValue(
      doc({ blocks: Array.from({ length: 127 }, (_, i) => bloco(i + 1)) }) as any,
    );

    render(<SourceDocumentPanel projectId={PROJETO} docId={DOC} onVoltar={vi.fn()} />);

    await userEvent.click(await screen.findByRole('button', { name: /decompor/i }));

    expect(decomposeSourceDocument).not.toHaveBeenCalled();
    const portao = await screen.findByTestId('portao-decomposicao');
    expect(within(portao).getByText(/127 blocos/)).toBeInTheDocument();
    expect(within(portao).getByText(/11 chamadas/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /decompor mesmo assim/i }));
    expect(decomposeSourceDocument).toHaveBeenCalledWith(PROJETO, DOC);
  });
});

describe('os blocos extraidos', () => {
  it('mostra o que foi lido do arquivo, com a pagina de origem', async () => {
    vi.mocked(getSourceDocument).mockResolvedValue(doc() as any);

    render(<SourceDocumentPanel projectId={PROJETO} docId={DOC} onVoltar={vi.fn()} />);

    await userEvent.click(await screen.findByRole('button', { name: /ver blocos extraídos/i }));

    expect(screen.getByText('Conteudo do bloco 1')).toBeInTheDocument();
    expect(screen.getByText(/página 2/i)).toBeInTheDocument();
  });
});

describe('baixar o original', () => {
  it('pede a URL assinada em vez de montar um caminho de API', async () => {
    vi.mocked(getSourceDocument).mockResolvedValue(doc() as any);
    vi.mocked(getSourceDocumentDownloadUrl).mockResolvedValue('https://storage.test/x');
    const abrir = vi.spyOn(window, 'open').mockReturnValue(null);

    render(<SourceDocumentPanel projectId={PROJETO} docId={DOC} onVoltar={vi.fn()} />);

    await userEvent.click(await screen.findByRole('button', { name: /baixar original/i }));

    await waitFor(() => expect(abrir).toHaveBeenCalledWith('https://storage.test/x', '_blank'));
  });

  it('documento sem binario diz isso, em vez de abrir uma aba quebrada', async () => {
    vi.mocked(getSourceDocument).mockResolvedValue(doc() as any);
    vi.mocked(getSourceDocumentDownloadUrl).mockRejectedValue({
      response: { data: { detail: 'documento nao tem binario associado' } },
    });
    const abrir = vi.spyOn(window, 'open').mockReturnValue(null);

    render(<SourceDocumentPanel projectId={PROJETO} docId={DOC} onVoltar={vi.fn()} />);

    await userEvent.click(await screen.findByRole('button', { name: /baixar original/i }));

    expect(await screen.findByText(/nao tem binario associado/)).toBeInTheDocument();
    expect(abrir).not.toHaveBeenCalled();
  });
});

describe('revisao', () => {
  it('notas pendentes viram um convite com o numero', async () => {
    vi.mocked(getSourceDocument).mockResolvedValue(doc() as any);
    vi.mocked(getReviewSnaps).mockResolvedValue([{ id: 's1' }, { id: 's2' }, { id: 's3' }] as any);

    render(<SourceDocumentPanel projectId={PROJETO} docId={DOC} onVoltar={vi.fn()} />);

    expect(await screen.findByRole('button', { name: /revisar 3 notas/i })).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByTestId('etapa-decomposicao')).toHaveAttribute('data-estado', 'concluida'),
    );
  });

  it('sem notas pendentes nao ha o que revisar', async () => {
    vi.mocked(getSourceDocument).mockResolvedValue(doc() as any);

    render(<SourceDocumentPanel projectId={PROJETO} docId={DOC} onVoltar={vi.fn()} />);

    await screen.findByText('Aula 03 - Fotossintese.pdf');
    expect(screen.queryByRole('button', { name: /revisar \d+ nota/i })).not.toBeInTheDocument();
  });
});
