import { api } from './client';
import type { Snap } from './types';

/**
 * O cliente da Memory global.
 *
 * A tela pedia TODOS os snaps de TODOS os projetos, paginando de cem em cem, e
 * so entao contava e desenhava: 33 requisicoes, 6,2 MB e 29 segundos ate
 * existir -- para mostrar cerca de vinte cartoes.
 *
 * O erro nunca foi o tamanho da base. Era a tela precisar da base inteira para
 * responder perguntas que o banco responde com um COUNT. Aqui contar volta a
 * ser trabalho do banco, e a grade carrega conforme rola.
 *
 * Como no resto de `sourceDocuments`, nada aqui trata erro: falha que vira
 * valor vazio ja custou caro neste repositorio.
 */

export interface ProjetoContado {
  id: string;
  name: string;
  total: number;
}

export interface ResumoMemoria {
  total: number;
  por_status: Record<string, number>;
  por_projeto: ProjetoContado[];
}

export interface LoteRevisao {
  project_id: string;
  project_name: string;
  /** `null` para o grupo sem lote -- artefato de agente, a maioria da fila. */
  group_id: string | null;
  total: number;
  importado: boolean;
}

export interface SnapGlobal extends Snap {
  project_name?: string;
}

export const getSnapsSummary = async (): Promise<ResumoMemoria> => {
  const r = await api.get('/snaps/summary');
  return r.data;
};

export interface FiltroGlobal {
  skip?: number;
  limit?: number;
  status?: string;
  projectId?: string;
  groupId?: string;
  /** Apenas notas sem lote. Sem isto o grupo "sem lote de importacao" seria
   *  visivel na fila e inalcancavel. */
  semGrupo?: boolean;
}

export const getSnapsGlobal = async (f: FiltroGlobal): Promise<SnapGlobal[]> => {
  // Chaves ausentes em vez de vazias: `status=''` filtraria por string vazia e
  // devolveria nada, que a tela leria como "acabou".
  const params: Record<string, unknown> = {
    skip: f.skip ?? 0,
    limit: f.limit ?? 60,
  };
  if (f.status) params.status = f.status;
  if (f.projectId) params.project_id = f.projectId;
  if (f.groupId) params.group_id = f.groupId;
  if (f.semGrupo) params.sem_grupo = true;

  const r = await api.get('/snaps/', { params });
  return r.data;
};

export const getReviewBatches = async (): Promise<LoteRevisao[]> => {
  const r = await api.get('/snaps/review/batches');
  return r.data;
};
