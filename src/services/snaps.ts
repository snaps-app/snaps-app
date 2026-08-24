import { api, getCachedData, setCachedData, invalidateCachedData } from './client';
import { getProjects } from './projects';
import type { Snap, SnapCreate, Project, SnapSearchResult, ReviewPending } from './types';

/** Alcance do filtro por execução.
 *  - `exact`: só as notas do nó informado (comportamento histórico, default).
 *  - `tree`:  as notas de toda a árvore de execuções (mesmo `root_id`). */
export type ExecutionScope = 'exact' | 'tree';

interface GetSnapsOptions {
    executionScope?: ExecutionScope;
    /** Ignora o cache de 30 s. Necessário nos refetches periódicos: sem isso a
     *  lista voltaria do cache e a atualização de outra pessoa não apareceria. */
    bypassCache?: boolean;
}

const snapsCachePrefix = (projectId: string) => `project_snaps_${projectId}_`;

export const getSnaps = async (
    projectId: string,
    skip: number = 0,
    limit: number = 100,
    sprintId?: string,
    agentExecutionId?: string,
    options: GetSnapsOptions = {}
): Promise<Snap[]> => {
    const { executionScope = 'exact', bypassCache = false } = options;

    // O escopo entra na chave: sem isso as variantes `exact` e `tree` da mesma
    // execução colidiriam e uma serviria a resposta da outra.
    const cacheKey = `${snapsCachePrefix(projectId)}${skip}_${limit}_${sprintId || 'none'}_${agentExecutionId || 'none'}_${executionScope}`;
    if (!bypassCache) {
        const cached = getCachedData(cacheKey);
        if (cached) return cached;
    }

    const params = new URLSearchParams({
        skip: skip.toString(),
        limit: limit.toString(),
    });
    if (sprintId) params.append('sprint_id', sprintId);
    if (agentExecutionId) params.append('agent_execution_id', agentExecutionId);
    if (executionScope !== 'exact') params.append('execution_scope', executionScope);

    const response = await api.get(`/projects/${projectId}/snaps/`, { params });
    setCachedData(cacheKey, response.data);
    return response.data;
};

/** Descarta o cache de listagem de snaps do projeto. Chamar após toda escrita. */
export const invalidateSnapsCache = (projectId: string) => {
    invalidateCachedData(snapsCachePrefix(projectId));
};

export const createSnap = async (data: SnapCreate): Promise<Snap> => {
    const response = await api.post('/snaps/', data);
    invalidateSnapsCache(data.project_id);
    return response.data;
};

export const updateSnap = async (snapId: string, data: Partial<SnapCreate>): Promise<Snap> => {
    const response = await api.patch(`/snaps/${snapId}`, data);
    invalidateSnapsCache(response.data.project_id);
    return response.data;
};

export const deleteSnap = async (snapId: string, projectId?: string): Promise<void> => {
    await api.delete(`/snaps/${snapId}`);
    if (projectId) invalidateSnapsCache(projectId);
};

// Quantos snaps o endpoint devolve por chamada. E o mesmo default do
// `read_snaps` da API; pedir mais que isso nao adianta.
const PAGINA = 100;

export const getAllSnaps = async (): Promise<{ snaps: Snap[], projects: Project[] }> => {
    const projects = await getProjects();
    // Antes isto chamava `getSnaps(p.id)` UMA vez, com o default de 100. Projeto
    // com mais que isso aparecia truncado sem nenhum sinal: o contador da barra
    // lateral marcava exatamente 100 e o resto simplesmente nao existia para a
    // tela. Nubo Conecta tem 246 notas ativas e Snaps tem 190 -- os dois
    // mostravam 100.
    const snapsPromises = projects.map(async p => {
        const todos: Snap[] = [];
        for (let skip = 0; ; skip += PAGINA) {
            const lote = await getSnaps(p.id, skip, PAGINA);
            todos.push(...lote);
            // Lote menor que a pagina significa que acabou. Trava em 100 paginas
            // para que um endpoint que ignore `skip` nao vire laco infinito.
            if (lote.length < PAGINA || skip >= PAGINA * 100) break;
        }
        return todos.map(s => ({ ...s, project_name: p.name }));
    });
    const snapsArrays = await Promise.all(snapsPromises);
    const allSnaps = snapsArrays.flat();
    return { snaps: allSnaps, projects };
};

export const updateSnapStatus = async (snapId: string, status: string): Promise<any> => {
    const response = await api.patch(`/snaps/${snapId}/status`, { status });
    if (response.data?.project_id) invalidateSnapsCache(response.data.project_id);
    return response.data;
};

// --- Busca hibrida (Sprint 19.0, cards SNA-RD-128 / SNA-RD-129) ---
//
// Substitui o filtro por substring que rodava no cliente. Duas diferencas que
// importam:
//
// 1. O termo vai ao SERVIDOR. Antes, `getAllSnaps()` trazia a base inteira para
//    o browser -- uma requisicao por projeto, cada uma com limit=100 -- e
//    filtrava aqui. Alem do trafego, isso significava que projeto com mais de
//    100 snaps tinha resultados INVISIVEIS: eles nunca chegavam ao cliente.
//
// 2. O escopo e decidido pelo servidor, nao por parametro. Por isso sao duas
//    funcoes, e nao uma com flag.

export const searchSnapsInProject = async (
    projectId: string,
    q: string,
    limit: number = 20,
    incluirStaged: boolean = false
): Promise<SnapSearchResult[]> => {
    const params = new URLSearchParams({ q, limit: String(limit) });
    if (incluirStaged) params.append('incluir_staged', 'true');
    const response = await api.get(`/projects/${projectId}/snaps/search`, { params });
    return response.data;
};

export const searchSnapsGlobal = async (
    q: string,
    limit: number = 20
): Promise<SnapSearchResult[]> => {
    const response = await api.get('/snaps/search', { params: { q, limit } });
    return response.data;
};

export const getEmbeddingCoverage = async (projectId: string): Promise<any> => {
    const response = await api.get(`/projects/${projectId}/snaps/embedding-coverage`);
    return response.data;
};

// --- Revisao do staging ---

export const getReviewPending = async (projectId: string): Promise<ReviewPending> => {
    const response = await api.get(`/projects/${projectId}/snaps/review/pending`);
    return response.data;
};

/** Promove snaps de `staged` para `active`. Passe snapIds OU groupId. */
export const promoteSnaps = async (
    projectId: string,
    payload: { snap_ids?: string[]; group_id?: string }
): Promise<{ promovidos: number; ids: string[] }> => {
    const response = await api.post(`/projects/${projectId}/snaps/review/promote`, payload);
    return response.data;
};

/** Descarta snaps em staging. So alcanca `staged` -- snap ja promovido fica. */
export const discardSnaps = async (
    projectId: string,
    payload: { snap_ids?: string[]; group_id?: string }
): Promise<{ descartados: number }> => {
    const response = await api.post(`/projects/${projectId}/snaps/review/discard`, payload);
    return response.data;
};
