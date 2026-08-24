/**
 * A aba que substitui os dados falsos.
 *
 * Antes disto, `Imported Documents` mostrava tres itens fixos no codigo
 * ("Zettelkasten Method Guide", "PARA Method Explained"...). O contador parecia
 * informacao e nao era.
 *
 * O que cada linha precisa dizer, sem que o usuario abra nada: em que ponto do
 * pipeline o material esta, e o que fazer com ele agora.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('@/services/sourceDocuments', () => ({
  listSourceDocuments: vi.fn(),
  getReviewSnaps: vi.fn(),
}));

import { listSourceDocuments, getReviewSnaps } from '@/services/sourceDocuments';
import { SourceDocumentsTab } from '@/app/components/documents/source-documents-tab';

const PROJETO = '7d17a48e-5615-4c90-9602-531f1b5a603d';

const doc = (over: any = {}) => ({
  id: over.id ?? 'doc-1',
  project_id: PROJETO,
  name: 'Aula 03.pdf',
  status: 'extracted',
  content: 'texto',
  raw_data: { mimetype: 'application/pdf', size: 2_400_000 },
  ...over,
});

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getReviewSnaps).mockResolvedValue([]);
});

describe('lista', () => {
  it('mostra os documentos do projeto', async () => {
    vi.mocked(listSourceDocuments).mockResolvedValue([doc(), doc({ id: 'doc-2', name: 'Aula 02.pdf' })] as any);
    render(<SourceDocumentsTab projectId={PROJETO} onAbrir={vi.fn()} />);
    expect(await screen.findByText('Aula 03.pdf')).toBeInTheDocument();
    expect(screen.getByText('Aula 02.pdf')).toBeInTheDocument();
  });

  it('diz que esta vazio em vez de mostrar uma lista inventada', async () => {
    vi.mocked(listSourceDocuments).mockResolvedValue([] as any);
    render(<SourceDocumentsTab projectId={PROJETO} onAbrir={vi.fn()} />);
    expect(await screen.findByText(/nenhum material/i)).toBeInTheDocument();
  });

  it('mostra a falha, e nao uma lista vazia', async () => {
    // Vazio silencioso por erro foi o bug que custou duas mensagens de
    // diagnostico na busca. Nao se repete aqui.
    vi.mocked(listSourceDocuments).mockRejectedValue(new Error('Network Error'));
    render(<SourceDocumentsTab projectId={PROJETO} onAbrir={vi.fn()} />);
    expect(await screen.findByText(/nao foi possivel carregar/i)).toBeInTheDocument();
    expect(screen.queryByText(/nenhum material/i)).not.toBeInTheDocument();
  });
});

describe('o que cada linha comunica', () => {
  it('extração falhada mostra a causa e oferece nova tentativa', async () => {
    // O binario fica guardado, entao reprocessar nao pede upload novo -- e o
    // botao precisa dizer isso, senao o usuario sobe o arquivo de novo.
    vi.mocked(listSourceDocuments).mockResolvedValue([
      doc({ status: 'extraction_failed', extraction_error: 'PdfReadError: arquivo corrompido' }),
    ] as any);
    render(<SourceDocumentsTab projectId={PROJETO} onAbrir={vi.fn()} />);
    expect(await screen.findByText(/arquivo corrompido/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /tentar de novo/i })).toBeInTheDocument();
  });

  it('conta quantas notas daquele material ainda esperam revisao', async () => {
    vi.mocked(listSourceDocuments).mockResolvedValue([doc()] as any);
    vi.mocked(getReviewSnaps).mockResolvedValue([{ id: 'a' }, { id: 'b' }, { id: 'c' }] as any);
    render(<SourceDocumentsTab projectId={PROJETO} onAbrir={vi.fn()} />);
    expect(await screen.findByText(/3 a revisar/i)).toBeInTheDocument();
  });

  it('material sem pendencia nao oferece revisao', async () => {
    vi.mocked(listSourceDocuments).mockResolvedValue([doc()] as any);
    vi.mocked(getReviewSnaps).mockResolvedValue([] as any);
    render(<SourceDocumentsTab projectId={PROJETO} onAbrir={vi.fn()} />);
    await screen.findByText('Aula 03.pdf');
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: /revisar/i })).not.toBeInTheDocument(),
    );
  });
});

describe('navegacao', () => {
  it('abrir o material entrega o documento inteiro, nao so o id', async () => {
    // Quem recebe precisa do status e do raw_data para decidir o proximo passo
    // sem uma segunda ida ao servidor.
    const onAbrir = vi.fn();
    vi.mocked(listSourceDocuments).mockResolvedValue([doc()] as any);
    render(<SourceDocumentsTab projectId={PROJETO} onAbrir={onAbrir} />);
    await userEvent.click(await screen.findByRole('button', { name: /aula 03\.pdf/i }));
    expect(onAbrir).toHaveBeenCalledWith(expect.objectContaining({ id: 'doc-1', status: 'extracted' }));
  });
});
