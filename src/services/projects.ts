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
    ProjectApiKeyCreated,
    ProjectConfigEntry,
    ProjectConfigEntryWrite,
    ProjectConfigImportResult,
    ProjectEnvironment
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

// ── Environments de projeto (Sprint 21.7) ──────────────────────────────────

export const getProjectEnvironments = async (
    projectId: string,
): Promise<ProjectEnvironment[]> => {
    const response = await api.get(`/projects/${projectId}/environments`);
    return response.data;
};

// ── Configuracao de projeto (Sprint 21.5) ──────────────────────────────────
//
// `environmentId` (card SNA-RD-163): explicito, escolhido na tela pelo
// seletor de ambiente. Omitido, o backend cai em `preview` por default —
// nunca em `production` por omissao — mas a tela SEMPRE o envia a partir do
// momento em que carrega a lista de ambientes, para nunca deixar essa
// decisao implicita.

export const getProjectConfigEntries = async (
    projectId: string, repoName?: string, environmentId?: string,
): Promise<ProjectConfigEntry[]> => {
    const response = await api.get(`/projects/${projectId}/config-entries`, {
        params: {
            ...(repoName ? { repo_name: repoName } : {}),
            ...(environmentId ? { environment_id: environmentId } : {}),
        },
    });
    return response.data;
};

export const upsertProjectConfigEntry = async (
    projectId: string, data: ProjectConfigEntryWrite, environmentId?: string,
): Promise<ProjectConfigEntry> => {
    const response = await api.put(`/projects/${projectId}/config-entries`, data, {
        params: environmentId ? { environment_id: environmentId } : undefined,
    });
    return response.data;
};

export const deleteProjectConfigEntry = async (
    projectId: string, entryId: string,
): Promise<void> => {
    await api.delete(`/projects/${projectId}/config-entries/${entryId}`);
};

/**
 * Importa um arquivo `.env`.
 *
 * O conteudo vai como TEXTO e e parseado no SERVIDOR, pelo mesmo `dotenv` que
 * le o arquivo no workspace. Parsear aqui criaria uma segunda gramatica para o
 * mesmo formato, e a divergencia apareceria como "a chave existe mas o valor
 * esta errado".
 *
 * `apply=false` (o default) nao grava: devolve o que seria criado, o que seria
 * sobrescrito e o que ja esta igual.
 */
export const importProjectConfigEntries = async (
    projectId: string, content: string, repoName?: string | null, apply = false,
    environmentId?: string,
): Promise<ProjectConfigImportResult> => {
    const response = await api.post(`/projects/${projectId}/config-entries/import`, {
        content, repo_name: repoName || null, apply,
    }, {
        params: environmentId ? { environment_id: environmentId } : undefined,
    });
    return response.data;
};
