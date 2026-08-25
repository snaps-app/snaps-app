/**
 * A fila de revisao em Memory.
 *
 * Ate aqui o lote so tinha dois botoes grossos: aprovar tudo ou descartar tudo.
 * Decidir nota a nota ja era possivel pela API (`promote` e `discard` sempre
 * aceitaram `snap_ids`) -- faltava a tela oferecer.
 *
 * O detalhe que amarra o desenho: os lotes SEM `group_id` -- artefato de agente,
 * a maioria da fila -- nao podem ser rebuscados por filtro, porque
 * `getReviewSnaps` exige documento ou lote. Memory ja carregou as notas para
 * agrupar, entao ela ENTREGA a lista ao painel em vez de pedir uma nova busca.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('@/services/snaps', () => ({
  getAllSnaps: vi.fn(),
  searchSnapsGlobal: vi.fn(),
  promoteSnaps: vi.fn(),
  discardSnaps: vi.fn(),
  updateSnap: vi.fn(),
}));
vi.mock('@/services/sourceDocuments', () => ({ getReviewSnaps: vi.fn() }));

import { getAllSnaps, promoteSnaps } from '@/services/snaps';
import { getReviewSnaps } from '@/services/sourceDocuments';
import { MemoryView } from '@/app/components/views/memory-view';

/** A fila de lotes vive atras do filtro `Staged Rules`. */
const abrirFila = async () => {
  render(<MemoryView />);
  await userEvent.click(await screen.findByRole('button', { name: /staged rules/i }));
};

/** As assercoes precisam olhar DENTRO do painel: a grade atras dele mostra as
 *  mesmas notas, e buscar no documento inteiro acharia as duas. */
const abrirPainel = async () => {
  await userEvent.click(await screen.findByRole('button', { name: /revisar uma a uma/i }));
  return await screen.findByTestId('painel-revisao');
};

const PROJETO = '7d17a48e-5615-4c90-9602-531f1b5a603d';

const staged = (n: number, over: any = {}) => ({
  id: `s${n}`,
  project_id: PROJETO,
  project_name: 'Curso PM3',
  name: `Nota ${n}`,
  description: '',
  content: `Conteudo ${n}`,
  status: 'staged',
  trust_level: 'imported',
  snadds: { group_id: 'lote-a' },
  created_at: '2026-08-25T00:00:00Z',
  updated_at: '2026-08-25T00:00:00Z',
  ...over,
});

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getAllSnaps).mockResolvedValue({
    snaps: [staged(1), staged(2), staged(3)],
    projects: [{ id: PROJETO, name: 'Curso PM3' }],
  } as any);
});

describe('abrir o lote', () => {
  it('clicar no lote abre a revisao com as notas dele', async () => {
    await abrirFila();

    const painel = await abrirPainel();

    expect(within(painel).getByText('Nota 1')).toBeInTheDocument();
    expect(within(painel).getByText('Conteudo 3')).toBeInTheDocument();
  });

  it('nao vai a rede buscar o que ja esta carregado', async () => {
    await abrirFila();

    await abrirPainel();

    expect(getReviewSnaps).not.toHaveBeenCalled();
  });

  it('lote sem group_id tambem abre -- e o caso que nao da para rebuscar', async () => {
    vi.mocked(getAllSnaps).mockResolvedValue({
      snaps: [staged(9, { snadds: {} })],
      projects: [{ id: PROJETO, name: 'Curso PM3' }],
    } as any);

    await abrirFila();

    const painel = await abrirPainel();

    expect(within(painel).getByText('Nota 9')).toBeInTheDocument();
  });

  it('decidir parte do lote promove so o que foi marcado', async () => {
    vi.mocked(promoteSnaps).mockResolvedValue({ promovidos: 2, ids: ['s1', 's3'] } as any);

    await abrirFila();

    const painel = await abrirPainel();
    await userEvent.click(within(within(painel).getByTestId('nota-s2')).getByRole('checkbox'));
    await userEvent.click(within(painel).getByRole('button', { name: /aprovar 2/i }));

    await waitFor(() =>
      expect(promoteSnaps).toHaveBeenCalledWith(PROJETO, { snap_ids: ['s1', 's3'] }),
    );
  });

  it('o atalho de aprovar o lote inteiro continua existindo', async () => {
    // Quem confia no lote nao deve ser obrigado a passar pelo painel.
    await abrirFila();

    expect(await screen.findByRole('button', { name: /aprovar lote/i })).toBeInTheDocument();
  });
});
