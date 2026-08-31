import { api } from './client';
import type { AgentInstruction, GovernanceDoc, Skill, Resource, BridgeProcessResult } from './types';

/**
 * Escrita recusada porque a tela estava sobre uma versão antiga (API 409).
 *
 * Existe como erro tipado, e não como um `Error` genérico, porque a tela precisa
 * reagir de forma diferente: um 500 é "tente de novo", enquanto isto é
 * "recarregue e reaplique". Tratar os dois igual devolveria o usuário ao mesmo
 * botão, sobre a mesma base velha, para falhar de novo.
 */
export class VersionConflictError extends Error {
    readonly expectedLockVersion?: number;
    readonly currentLockVersion?: number;
    readonly lastModifiedBy?: string;
    readonly lastModifiedAt?: string;

    constructor(corpo: any) {
        super(
            corpo?.detail ??
            'Este item foi alterado por outra pessoa depois que você o abriu.'
        );
        this.name = 'VersionConflictError';
        this.expectedLockVersion = corpo?.expected_lock_version ?? undefined;
        this.currentLockVersion = corpo?.current_lock_version ?? undefined;
        this.lastModifiedBy = corpo?.last_modified_by ?? undefined;
        this.lastModifiedAt = corpo?.last_modified_at ?? undefined;
    }
}

/**
 * PATCH carregando a versão que a tela leu (migration 056 da API).
 *
 * `expectedLockVersion` é opcional de propósito enquanto o rollout está em
 * expansão: uma tela que ainda não a conhece continua salvando. Sem ela, porém,
 * não há compare-and-swap nenhum — a garantia vale só para quem a envia.
 */
async function escritaVersionada<T>(
    caminho: string,
    data: Record<string, unknown>,
    expectedLockVersion?: number,
): Promise<T> {
    const corpo = expectedLockVersion === undefined
        ? data
        : { ...data, expected_lock_version: expectedLockVersion };
    try {
        const response = await api.patch(caminho, corpo);
        return response.data;
    } catch (err: any) {
        if (err?.response?.status === 409) {
            throw new VersionConflictError(err.response.data);
        }
        throw err;
    }
}

export const getAgents = async (projectId?: string): Promise<AgentInstruction[]> => {
    const params = projectId ? { project_id: projectId } : {};
    const response = await api.get('/agents/', { params });
    return response.data;
};

export const getAgent = async (agentId: string): Promise<AgentInstruction> => {
    const response = await api.get(`/agents/${agentId}`);
    return response.data;
};

export const createAgent = async (data: Partial<AgentInstruction>): Promise<AgentInstruction> => {
    const response = await api.post('/agents/', data);
    return response.data;
};

export const updateAgent = async (
    agentId: string,
    data: Partial<AgentInstruction>,
    expectedLockVersion?: number,
): Promise<AgentInstruction> =>
    escritaVersionada(`/agents/${agentId}`, data, expectedLockVersion);

export const deleteAgent = async (agentId: string): Promise<void> => {
    await api.delete(`/agents/${agentId}`);
};

export const bindSkillToAgent = async (agentId: string, skillId: string): Promise<AgentInstruction> => {
    const response = await api.post(`/agents/${agentId}/skills/${skillId}`);
    return response.data;
};

export const unbindSkillFromAgent = async (agentId: string, skillId: string): Promise<AgentInstruction> => {
    const response = await api.delete(`/agents/${agentId}/skills/${skillId}`);
    return response.data;
};

export const getGovernanceDocs = async (projectId?: string): Promise<GovernanceDoc[]> => {
    const params = projectId ? { project_id: projectId } : {};
    const response = await api.get('/governance-docs/', { params });
    return response.data;
};

export const createGovernanceDoc = async (data: Partial<GovernanceDoc>): Promise<GovernanceDoc> => {
    const response = await api.post('/governance-docs/', data);
    return response.data;
};

export const updateGovernanceDoc = async (
    docId: string,
    data: Partial<GovernanceDoc>,
    expectedLockVersion?: number,
): Promise<GovernanceDoc> =>
    escritaVersionada(`/governance-docs/${docId}`, data, expectedLockVersion);

export const deleteGovernanceDoc = async (docId: string): Promise<void> => {
    await api.delete(`/governance-docs/${docId}`);
};

export const processGovernanceDoc = async (docId: string): Promise<BridgeProcessResult> => {
    const response = await api.post(`/governance-docs/${docId}/process`);
    return response.data;
};

export const getSkills = async (projectId?: string): Promise<Skill[]> => {
    const params = projectId ? { project_id: projectId } : {};
    const response = await api.get('/skills/', { params });
    return response.data;
};

export const createSkill = async (data: Partial<Skill>): Promise<Skill> => {
    const response = await api.post('/skills/', data);
    return response.data;
};

export const updateSkill = async (
    skillId: string,
    data: Partial<Skill>,
    expectedLockVersion?: number,
): Promise<Skill> =>
    escritaVersionada(`/skills/${skillId}`, data, expectedLockVersion);

export const deleteSkill = async (skillId: string): Promise<void> => {
    await api.delete(`/skills/${skillId}`);
};

export const getResources = async (projectId?: string): Promise<Resource[]> => {
    const params = projectId ? { project_id: projectId } : {};
    const response = await api.get('/resources/', { params });
    return response.data;
};

export const createResource = async (data: Partial<Resource>): Promise<Resource> => {
    const response = await api.post('/resources/', data);
    return response.data;
};

export const updateResource = async (resourceId: string, data: Partial<Resource>): Promise<Resource> => {
    const response = await api.patch(`/resources/${resourceId}`, data);
    return response.data;
};

export const deleteResource = async (resourceId: string): Promise<void> => {
    await api.delete(`/resources/${resourceId}`);
};
