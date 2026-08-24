/**
 * A revisao lateral: o portao entre "um material de terceiro foi lido" e "isto
 * entra no contexto dos agentes".
 *
 * As notas nascem `staged` e invisiveis de proposito (SNA-RD-129). Este painel e
 * o unico lugar onde alguem decide o contrario, entao ele carrega o peso de
 * duas garantias:
 *
 *  - o filtro nunca sai vazio. Sem documento nem lote o backend devolveria a
 *    base inteira do projeto, e aprovar "tudo" aprovaria notas de outros
 *    materiais;
 *
 *  - promover manda os IDS selecionados, nao o lote. Mandar `group_id` depois de
 *    o usuario ter desmarcado notas promoveria exatamente as que ele recusou.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('@/services/sourceDocuments', () => ({ getReviewSnaps: vi.fn() }));
vi.mock('@/services/snaps', () => ({
  promoteSnaps: vi.fn(),
  discardSnaps: vi.fn(),
  updateSnap: vi.fn(),
}));

import { getReviewSnaps } from '@/services/sourceDocuments';
import { promoteSnaps, discardSnaps, updateSnap } from '@/services/snaps';
import { ReviewPanel } from '@/app/components/documents/review-panel';

const PROJETO = '7d17a48e-5615-4c90-9602-531f1b5a603d';
const DOC = 'doc-1';

const nota = (n: number, over: any = {}) => ({
  id: `s${n}`,
  project_id: PROJETO,
  name: `Nota ${n}`,
  description: `Resumo ${n}`,
  content: `Conteudo da nota ${n}`,
  status: 'staged',
  source_ref: { page: n },
  created_at: '2026-08-24T00:00:00Z',
  updated_at: '2026-08-24T00:00:00Z',
  ...over,
});

const abrir = (props: any = {}) =>
  render(
    <ReviewPanel
      projectId={PROJETO}
      filtro={{ sourceDocumentId: DOC }}
      onFechar={vi.fn()}
      {...props}
    />,
  );

beforeEach(() => vi.clearAllMocks());

describe('carregamento', () => {
  it('busca so as notas do material aberto', async () => {
    vi.mocked(getReviewSnaps).mockResolvedValue([nota(1)] as any);

    abrir();

    await waitFor(() =>
      expect(getReviewSnaps).toHaveBeenCalledWith(PROJETO, { sourceDocumentId: DOC }),
    );
  });

  it('falha e uma tela propria, nunca "nada a revisar"', async () => {
    vi.mocked(getReviewSnaps).mockRejectedValue({
      response: { data: { detail: 'Sessão expirada' } },
    });

    abrir();

    expect(await screen.findByText(/Sessão expirada/)).toBeInTheDocument();
    expect(screen.queryByText(/nada a revisar/i)).not.toBeInTheDocument();
  });

  it('lote ja revisado diz isso', async () => {
    vi.mocked(getReviewSnaps).mockResolvedValue([] as any);

    abrir();

    expect(await screen.findByText(/nada a revisar/i)).toBeInTheDocument();
  });

  it('mostra o que cada nota diz, nao so o titulo', async () => {
    vi.mocked(getReviewSnaps).mockResolvedValue([nota(1), nota(2)] as any);

    abrir();

    expect(await screen.findByText('Nota 1')).toBeInTheDocument();
    expect(screen.getByText('Conteudo da nota 2')).toBeInTheDocument();
  });
});

describe('selecao', () => {
  it('tudo comeca marcado, porque o caso comum e aprovar o lote', async () => {
    vi.mocked(getReviewSnaps).mockResolvedValue([nota(1), nota(2), nota(3)] as any);

    abrir();

    await screen.findByText('Nota 1');
    screen.getAllByRole('checkbox').forEach((c) => expect(c).toBeChecked());
    expect(screen.getByRole('button', { name: /aprovar 3/i })).toBeEnabled();
  });

  it('desmarcar tudo desliga as duas acoes', async () => {
    vi.mocked(getReviewSnaps).mockResolvedValue([nota(1), nota(2)] as any);

    abrir();

    await screen.findByText('Nota 1');
    await userEvent.click(screen.getByRole('button', { name: /desmarcar tudo/i }));

    expect(screen.getByRole('button', { name: /aprovar/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /descartar/i })).toBeDisabled();
  });
});

describe('decidir', () => {
  it('aprova pelos ids selecionados, nunca pelo lote inteiro', async () => {
    vi.mocked(getReviewSnaps)
      .mockResolvedValueOnce([nota(1), nota(2), nota(3)] as any)
      .mockResolvedValueOnce([] as any);
    vi.mocked(promoteSnaps).mockResolvedValue({ promovidos: 2, ids: ['s1', 's3'] } as any);

    abrir();

    await screen.findByText('Nota 2');
    await userEvent.click(within(screen.getByTestId('nota-s2')).getByRole('checkbox'));
    await userEvent.click(screen.getByRole('button', { name: /aprovar 2/i }));

    expect(promoteSnaps).toHaveBeenCalledWith(PROJETO, { snap_ids: ['s1', 's3'] });
    expect(promoteSnaps).not.toHaveBeenCalledWith(PROJETO, expect.objectContaining({ group_id: expect.anything() }));
  });

  it('descarta pelos ids selecionados', async () => {
    vi.mocked(getReviewSnaps)
      .mockResolvedValueOnce([nota(1), nota(2)] as any)
      .mockResolvedValueOnce([] as any);
    vi.mocked(discardSnaps).mockResolvedValue({ descartados: 2 } as any);

    abrir();

    await screen.findByText('Nota 1');
    await userEvent.click(screen.getByRole('button', { name: /descartar 2/i }));

    expect(discardSnaps).toHaveBeenCalledWith(PROJETO, { snap_ids: ['s1', 's2'] });
  });

  it('o que foi decidido some da lista, e quem abriu fica sabendo', async () => {
    vi.mocked(getReviewSnaps)
      .mockResolvedValueOnce([nota(1), nota(2)] as any)
      .mockResolvedValueOnce([nota(2)] as any);
    vi.mocked(promoteSnaps).mockResolvedValue({ promovidos: 1, ids: ['s1'] } as any);
    const onMudou = vi.fn();

    abrir({ onMudou });

    await screen.findByText('Nota 1');
    await userEvent.click(within(screen.getByTestId('nota-s2')).getByRole('checkbox'));
    await userEvent.click(screen.getByRole('button', { name: /aprovar 1/i }));

    await waitFor(() => expect(screen.queryByText('Nota 1')).not.toBeInTheDocument());
    expect(screen.getByText('Nota 2')).toBeInTheDocument();
    expect(onMudou).toHaveBeenCalled();
  });

  it('falha ao aprovar nao apaga a lista nem finge sucesso', async () => {
    vi.mocked(getReviewSnaps).mockResolvedValue([nota(1)] as any);
    vi.mocked(promoteSnaps).mockRejectedValue({
      response: { data: { detail: 'sem permissão de escrita' } },
    });

    abrir();

    await screen.findByText('Nota 1');
    await userEvent.click(screen.getByRole('button', { name: /aprovar 1/i }));

    expect(await screen.findByText(/sem permissão de escrita/)).toBeInTheDocument();
    expect(screen.getByText('Nota 1')).toBeInTheDocument();
  });
});

describe('editar antes de aprovar', () => {
  it('salva a correcao no snap, e a lista passa a mostrar o texto novo', async () => {
    // O modelo erra o titulo com alguma frequencia. Sem edicao aqui a escolha
    // seria aprovar errado ou descartar conteudo bom.
    vi.mocked(getReviewSnaps).mockResolvedValue([nota(1)] as any);
    vi.mocked(updateSnap).mockResolvedValue({ ...nota(1), name: 'Fotossíntese: etapa clara' } as any);

    abrir();

    await userEvent.click(await screen.findByRole('button', { name: /editar/i }));
    const campo = screen.getByLabelText(/título/i);
    await userEvent.clear(campo);
    await userEvent.type(campo, 'Fotossíntese: etapa clara');
    await userEvent.click(screen.getByRole('button', { name: /salvar/i }));

    await waitFor(() =>
      expect(updateSnap).toHaveBeenCalledWith(
        's1',
        expect.objectContaining({ name: 'Fotossíntese: etapa clara' }),
      ),
    );
    expect(await screen.findByText('Fotossíntese: etapa clara')).toBeInTheDocument();
  });

  it('editar nao promove nada por conta propria', async () => {
    vi.mocked(getReviewSnaps).mockResolvedValue([nota(1)] as any);
    vi.mocked(updateSnap).mockResolvedValue(nota(1) as any);

    abrir();

    await userEvent.click(await screen.findByRole('button', { name: /editar/i }));
    await userEvent.click(screen.getByRole('button', { name: /salvar/i }));

    expect(promoteSnaps).not.toHaveBeenCalled();
  });

  it('cancelar a edicao devolve o texto original', async () => {
    vi.mocked(getReviewSnaps).mockResolvedValue([nota(1)] as any);

    abrir();

    await userEvent.click(await screen.findByRole('button', { name: /editar/i }));
    await userEvent.type(screen.getByLabelText(/título/i), ' rabisco');
    await userEvent.click(screen.getByRole('button', { name: /cancelar/i }));

    expect(updateSnap).not.toHaveBeenCalled();
    expect(screen.getByText('Nota 1')).toBeInTheDocument();
  });
});
