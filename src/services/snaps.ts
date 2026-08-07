import { api, getCachedData, setCachedData, invalidateCachedData } from './client';
import { getProjects } from './projects';
import type { Snap, SnapCreate, Project } from './types';

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

export const getAllSnaps = async (): Promise<{ snaps: Snap[], projects: Project[] }> => {
    const projects = await getProjects();
    const snapsPromises = projects.map(p => getSnaps(p.id).then(snaps => snaps.map(s => ({ ...s, project_name: p.name }))));
    const snapsArrays = await Promise.all(snapsPromises);
    const allSnaps = snapsArrays.flat();
    return { snaps: allSnaps, projects };
};

export const updateSnapStatus = async (snapId: string, status: string): Promise<any> => {
    const response = await api.patch(`/snaps/${snapId}/status`, { status });
    if (response.data?.project_id) invalidateSnapsCache(response.data.project_id);
    return response.data;
};
