import { api, getCachedData, setCachedData } from './client';
import type { 
    Project, 
    ProjectDetail, 
    ProjectCreate, 
    GovernanceDoc, 
    GithubConfig, 
    GithubConfigCreate,
    ProjectApiKeyPublic,
    ProjectApiKeyCreate,
    ProjectApiKeyCreated
} from './types';

export const getProjects = async (skip = 0, limit = 100): Promise<Project[]> => {
    const response = await api.get('/projects/', { params: { skip, limit } });
    return response.data;
};

export const getProjectGovernanceDocs = async (projectId: string): Promise<GovernanceDoc[]> => {
    const response = await api.get('/governance-docs/', { params: { project_id: projectId } });
    return response.data.filter((d: any) => d.project_id === projectId);
};

export const getProject = async (projectId: string): Promise<ProjectDetail> => {
    const cacheKey = `project_${projectId}`;
    const cached = getCachedData(cacheKey);
    if (cached) return cached;

    const response = await api.get(`/projects/${projectId}`);
    setCachedData(cacheKey, response.data);
    return response.data;
};

export const createProject = async (data: ProjectCreate): Promise<Project> => {
    const response = await api.post('/projects/', data);
    return response.data;
};

export const updateProject = async (projectId: string, data: Partial<ProjectCreate>): Promise<Project> => {
    const response = await api.patch(`/projects/${projectId}`, data);
    return response.data;
};

export const getGithubConfig = async (projectId: string): Promise<GithubConfig> => {
    const response = await api.get(`/projects/${projectId}/github-config`);
    return response.data;
};

export const upsertGithubConfig = async (projectId: string, data: GithubConfigCreate): Promise<GithubConfig> => {
    const response = await api.post(`/projects/${projectId}/github-config`, data);
    return response.data;
};

export const syncGithubProject = async (projectId: string): Promise<{ message: string }> => {
    const response = await api.post(`/projects/${projectId}/github-config/sync`);
    return response.data;
};

export const getProjectApiKeys = async (projectId: string): Promise<ProjectApiKeyPublic[]> => {
    const response = await api.get(`/projects/${projectId}/api-keys`);
    return response.data;
};

export const createProjectApiKey = async (projectId: string, data: ProjectApiKeyCreate): Promise<ProjectApiKeyCreated> => {
    const response = await api.post(`/projects/${projectId}/api-keys`, data);
    return response.data;
};

export const revokeProjectApiKey = async (projectId: string, keyId: string): Promise<void> => {
    await api.delete(`/projects/${projectId}/api-keys/${keyId}`);
};
