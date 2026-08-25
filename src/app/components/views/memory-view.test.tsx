/**
 * A Memory global, depois de parar de baixar a base inteira.
 *
 * Medido no preview: 33 requisicoes, 6,2 MB e 29 segundos ate a tela existir --
 * para mostrar cerca de vinte cartoes. A causa nunca foi o tamanho do acervo
 * (906 notas em 11 projetos), e a tela precisar dele INTEIRO para responder
 * perguntas que o banco responde com COUNT.
 *
 * O que estes testes amarram:
 *
 *  - a montagem nao lista nada alem da primeira pagina;
 *  - trocar de aba refaz a pergunta ao SERVIDOR. Filtrar no cliente sobre o que
 *    ja chegou daria uma tela que parece vazia com resultados na pagina
 *    seguinte;
 *  - os lotes vem agregados, com contagem exata. Contagem parcial num botao que
 *    aprova em massa e pior do que tela lenta;
 *  - a decisao continua indo pelos IDS, nunca por group_id, mesmo agora que o
 *    agrupamento acontece no servidor.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('@/services/memory', () => ({
  getSnapsSummary: vi.fn(),
  getSnapsGlobal: vi.fn(),
  getReviewBatches: vi.fn(),
}));
vi.mock('@/services/snaps', () => ({
  searchSnapsGlobal: vi.fn(),
  promoteSnaps: vi.fn(),
  discardSnaps: vi.fn(),
  updateSnap: vi.fn(),
}));
vi.mock('@/services/sourceDocuments', () => ({ getReviewSnaps: vi.fn() }));

import { getSnapsSummary, getSnapsGlobal, getReviewBatches } from '@/services/memory';
import { promoteSnaps } from '@/services/snaps';
import { MemoryView, PAGINA_MEMORY } from '@/app/components/views/memory-view';

const PROJETO = '7d17a48e-5615-4c90-9602-531f1b5a603d';

const nota = (n: number, over: any = {}) => ({
  id: `s${n}`,
  project_id: PROJETO,
  project_name: 'Curso PM3',
  name: `Nota ${n}`,
  description: '',
  content: `Conteudo ${n}`,
  status: 'active',
  snadds: { labels: [] },
  created_at: '2026-08-25T00:00:00Z',
  updated_at: '2026-08-25T00:00:00Z',
  ...over,
});

const ultimoFiltro = () => {
  const chamadas = vi.mocked(getSnapsGlobal).mock.calls;
  return chamadas[chamadas.length - 1]?.[0] as any;
};

/** Uma pagina CHEIA: e o que sinaliza "pode haver mais". */
const paginaCheia = () => Array.from({ length: PAGINA_MEMORY }, (_, i) => nota(i + 1));

beforeEach(() => {
  vi.clearAllMocks();
  // `Aprovar lote` confirma por dialogo do navegador, que no ambiente de teste
  // recusa por padrao. O que esta em teste aqui e o que a acao MANDA, nao o
  // dialogo.
  vi.spyOn(window, 'confirm').mockReturnValue(true);
  vi.mocked(getSnapsSummary).mockResolvedValue({
    total: 906,
    por_status: { active: 792, staged: 114 },
    por_projeto: [
      { id: PROJETO, name: 'Curso PM3', total: 319 },
      { id: 'p2', name: 'Nubo Conecta', total: 246 },
    ],
  });
  vi.mocked(getSnapsGlobal).mockResolvedValue([nota(1), nota(2)] as any);
  vi.mocked(getReviewBatches).mockResolvedValue([]);
});

describe('montagem', () => {
  it('pede o resumo e UMA pagina, nunca o acervo', async () => {
    render(<MemoryView />);

    await waitFor(() => expect(getSnapsSummary).toHaveBeenCalledTimes(1));
    expect(getSnapsGlobal).toHaveBeenCalledTimes(1);
    expect(ultimoFiltro().skip).toBe(0);
    expect(ultimoFiltro().limit).toBeLessThanOrEqual(200);
  });

  it('o total vem do resumo, nao de contar cartoes na tela', async () => {
    render(<MemoryView />);

    expect(await screen.findByText('906')).toBeInTheDocument();
  });

  it('a barra lateral conta cada projeto pelo resumo', async () => {
    render(<MemoryView />);

    // O nome aparece na barra lateral E no rodape de cada cartao; o que
    // importa aqui sao as contagens, que so o resumo sabe.
    expect(await screen.findByText('319')).toBeInTheDocument();
    expect(screen.getByText('246')).toBeInTheDocument();
    expect(screen.getAllByText('Nubo Conecta').length).toBeGreaterThan(0);
  });

  it('falha de carregamento aparece, em vez de virar base vazia', async () => {
    vi.mocked(getSnapsSummary).mockRejectedValue({
      response: { data: { detail: 'Sessao expirada' } },
    });

    render(<MemoryView />);

    expect(await screen.findByText(/Sessao expirada/)).toBeInTheDocument();
  });
});

describe('carregar mais', () => {
  it('a proxima pagina continua de onde parou, e acrescenta', async () => {
    vi.mocked(getSnapsGlobal)
      .mockResolvedValueOnce(paginaCheia() as any)
      .mockResolvedValueOnce([nota(999)] as any);

    render(<MemoryView />);
    await screen.findByText('Nota 1');

    await userEvent.click(screen.getByRole('button', { name: /carregar mais/i }));

    await waitFor(() => expect(screen.getByText('Nota 999')).toBeInTheDocument());
    expect(ultimoFiltro().skip).toBe(PAGINA_MEMORY);
    // Paginar acrescenta, nao troca.
    expect(screen.getByText('Nota 1')).toBeInTheDocument();
  });

  it('pagina incompleta significa fim, e o botao some', async () => {
    vi.mocked(getSnapsGlobal).mockResolvedValue([nota(1)] as any);

    render(<MemoryView />);
    await screen.findByText('Nota 1');

    expect(screen.queryByRole('button', { name: /carregar mais/i })).not.toBeInTheDocument();
  });
});

describe('trocar de aba pergunta ao servidor', () => {
  it('Active Rules filtra por status no backend', async () => {
    render(<MemoryView />);
    await screen.findByText('Nota 1');

    await userEvent.click(screen.getByRole('button', { name: /active rules/i }));

    await waitFor(() => {
      expect(ultimoFiltro().status).toBe('active');
      expect(ultimoFiltro().skip).toBe(0);
    });
  });

  it('Agent Memory filtra por LABEL, nao por status', async () => {
    render(<MemoryView />);
    await screen.findByText('Nota 1');

    await userEvent.click(screen.getByRole('button', { name: /agent memory/i }));

    await waitFor(() => {
      expect(ultimoFiltro().label).toBe('agent-memory');
      expect(ultimoFiltro().status).toBeUndefined();
    });
  });
});

describe('a fila de revisao', () => {
  const lote = (over: any = {}) => ({
    project_id: PROJETO,
    project_name: 'Curso PM3',
    group_id: 'lote-1',
    total: 30,
    importado: true,
    ...over,
  });

  it('mostra a contagem que veio do servidor, nao a do que coube na tela', async () => {
    vi.mocked(getReviewBatches).mockResolvedValue([lote()]);

    render(<MemoryView />);
    await userEvent.click(await screen.findByRole('button', { name: /staged rules/i }));

    expect(await screen.findByText(/30 snap/i)).toBeInTheDocument();
  });

  it('abrir o lote busca as notas DELE', async () => {
    vi.mocked(getReviewBatches).mockResolvedValue([lote()]);

    render(<MemoryView />);
    await userEvent.click(await screen.findByRole('button', { name: /staged rules/i }));
    await userEvent.click(await screen.findByRole('button', { name: /revisar uma a uma/i }));

    await waitFor(() =>
      expect(ultimoFiltro()).toMatchObject({
        status: 'staged', projectId: PROJETO, groupId: 'lote-1',
      }),
    );
  });

  it('lote sem group_id e alcancado por semGrupo', async () => {
    // E a maioria da fila: artefato de agente nasce staged e sem lote. Sem
    // isto ele seria visivel e inalcancavel.
    vi.mocked(getReviewBatches).mockResolvedValue([lote({ group_id: null, total: 10 })]);

    render(<MemoryView />);
    await userEvent.click(await screen.findByRole('button', { name: /staged rules/i }));
    await userEvent.click(await screen.findByRole('button', { name: /revisar uma a uma/i }));

    await waitFor(() => {
      expect(ultimoFiltro().semGrupo).toBe(true);
      expect(ultimoFiltro().groupId).toBeUndefined();
    });
  });

  it('aprovar o lote inteiro promove pelos IDS, nunca pelo group_id', async () => {
    // O group_id pode repetir entre projetos e a rota e por projeto. Mandar
    // ids e inequivoco -- e isso sobreviveu a agregacao no servidor.
    vi.mocked(getReviewBatches).mockResolvedValue([lote({ total: 2 })]);
    vi.mocked(getSnapsGlobal).mockResolvedValue([
      nota(1, { status: 'staged' }), nota(2, { status: 'staged' }),
    ] as any);
    vi.mocked(promoteSnaps).mockResolvedValue({ promovidos: 2, ids: ['s1', 's2'] } as any);

    render(<MemoryView />);
    await userEvent.click(await screen.findByRole('button', { name: /staged rules/i }));
    await userEvent.click(await screen.findByRole('button', { name: /aprovar lote/i }));

    await waitFor(() =>
      expect(promoteSnaps).toHaveBeenCalledWith(PROJETO, { snap_ids: ['s1', 's2'] }),
    );
  });
});
