import { api, getCachedData, setCachedData } from './client';
import { getProjects } from './projects';
import type { Snap, SnapCreate, Project } from './types';

export const getSnaps = async (
    projectId: string, 
    skip: number = 0, 
    limit: number = 100, 
    sprintId?: string, 
    agentExecutionId?: string
): Promise<Snap[]> => {
    const cacheKey = `project_snaps_${projectId}_${skip}_${limit}_${sprintId || 'none'}_${agentExecutionId || 'none'}`;
    const cached = getCachedData(cacheKey);
    if (cached) return cached;

    const params = new URLSearchParams({
        skip: skip.toString(),
        limit: limit.toString(),
    });
    if (sprintId) params.append('sprint_id', sprintId);
    if (agentExecutionId) params.append('agent_execution_id', agentExecutionId);
    
    const response = await api.get(`/projects/${projectId}/snaps/`, { params });
    setCachedData(cacheKey, response.data);
    return response.data;
};

export const createSnap = async (data: SnapCreate): Promise<Snap> => {
    const response = await api.post('/snaps/', data);
    return response.data;
};

export const updateSnap = async (snapId: string, data: Partial<SnapCreate>): Promise<Snap> => {
    const response = await api.patch(`/snaps/${snapId}`, data);
    return response.data;
};

export const deleteSnap = async (snapId: string): Promise<void> => {
    await api.delete(`/snaps/${snapId}`);
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
    return response.data;
};
