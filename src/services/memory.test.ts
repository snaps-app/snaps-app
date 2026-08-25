/**
 * O cliente da Memory global.
 *
 * A tela pedia todos os snaps de todos os projetos -- 33 requisicoes, 6,2 MB e
 * 29 segundos ate existir, para mostrar vinte cartoes. Estas funcoes existem
 * para que contar seja trabalho do banco e a grade carregue conforme rola.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/services/client', () => ({
  api: { get: vi.fn() },
  API_URL: 'http://api.test',
}));

import { api } from '@/services/client';
import { getSnapsSummary, getSnapsGlobal, getReviewBatches } from '@/services/memory';

const PROJETO = '7d17a48e-5615-4c90-9602-531f1b5a603d';

beforeEach(() => vi.clearAllMocks());

describe('resumo', () => {
  it('pede os numeros numa chamada so', async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: { total: 906, por_status: { active: 792, staged: 114 }, por_projeto: [] },
    });

    const r = await getSnapsSummary();

    expect(api.get).toHaveBeenCalledTimes(1);
    expect(api.get).toHaveBeenCalledWith('/snaps/summary');
    expect(r.total).toBe(906);
  });

  it('deixa a falha subir', async () => {
    vi.mocked(api.get).mockRejectedValue({ response: { status: 401 } });
    await expect(getSnapsSummary()).rejects.toBeTruthy();
  });
});

describe('grade paginada', () => {
  it('pede uma pagina, nao a base', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: [] });

    await getSnapsGlobal({ skip: 60, limit: 60 });

    const [rota, cfg] = vi.mocked(api.get).mock.calls[0] as any;
    expect(rota).toBe('/snaps/');
    expect(cfg.params).toMatchObject({ skip: 60, limit: 60 });
  });

  it('carrega um lote pelo projeto e pelo group_id', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: [] });

    await getSnapsGlobal({ status: 'staged', projectId: PROJETO, groupId: 'lote-1' });

    const [, cfg] = vi.mocked(api.get).mock.calls[0] as any;
    expect(cfg.params).toMatchObject({
      status: 'staged', project_id: PROJETO, group_id: 'lote-1',
    });
  });

  it('alcanca o lote SEM group_id', async () => {
    // Sem isto o grupo "sem lote de importacao" -- a maioria da fila -- seria
    // visivel e inalcancavel.
    vi.mocked(api.get).mockResolvedValue({ data: [] });

    await getSnapsGlobal({ status: 'staged', projectId: PROJETO, semGrupo: true });

    const [, cfg] = vi.mocked(api.get).mock.calls[0] as any;
    expect(cfg.params.sem_grupo).toBe(true);
    expect(cfg.params.group_id).toBeUndefined();
  });

  it('nao manda filtro vazio', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: [] });

    await getSnapsGlobal({});

    const [, cfg] = vi.mocked(api.get).mock.calls[0] as any;
    expect(cfg.params.status).toBeUndefined();
    expect(cfg.params.project_id).toBeUndefined();
    expect(cfg.params.sem_grupo).toBeUndefined();
  });
});

describe('lotes da revisao', () => {
  it('traz os lotes agregados, sem as notas', async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: [{ project_id: PROJETO, project_name: 'Curso PM3', group_id: 'lote-1', total: 30, importado: true }],
    });

    const lotes = await getReviewBatches();

    expect(api.get).toHaveBeenCalledWith('/snaps/review/batches');
    expect(lotes[0].total).toBe(30);
    expect(lotes[0].importado).toBe(true);
  });
});
