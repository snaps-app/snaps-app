import { api } from './client';
import type { Decision, DecisionCreate } from './types';

export const getDecisions = async (projectId: string): Promise<Decision[]> => {
    const response = await api.get(`/projects/${projectId}/decisions/`);
    return response.data;
};

export const createDecision = async (projectId: string, data: Omit<DecisionCreate, 'project_id'>): Promise<Decision> => {
    const response = await api.post(`/projects/${projectId}/decisions/`, { project_id: projectId, ...data });
    return response.data;
};

export const updateDecision = async (decisionId: string, data: Partial<DecisionCreate>): Promise<Decision> => {
    const response = await api.patch(`/decisions/${decisionId}`, data);
    return response.data;
};

export const deleteDecision = async (decisionId: string): Promise<void> => {
    await api.delete(`/decisions/${decisionId}`);
};
