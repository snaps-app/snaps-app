import { api } from './client';
import type { Sprint, SprintCreate, Card } from './types';

export const getSprints = async (projectId: string): Promise<Sprint[]> => {
    const response = await api.get(`/projects/${projectId}/sprints/`);
    return response.data;
};

export const getCardsBySprint = async (sprintId: string): Promise<Card[]> => {
    const response = await api.get(`/sprints/${sprintId}/cards`);
    return response.data;
};

export const createSprint = async (projectId: string, data: Omit<SprintCreate, 'project_id'>): Promise<Sprint> => {
    const response = await api.post(`/projects/${projectId}/sprints/`, { project_id: projectId, ...data });
    return response.data;
};

export const updateSprint = async (sprintId: string, data: Partial<SprintCreate>): Promise<Sprint> => {
    const response = await api.patch(`/sprints/${sprintId}`, data);
    return response.data;
};

export const deleteSprint = async (sprintId: string): Promise<void> => {
    await api.delete(`/sprints/${sprintId}`);
};

export const getSprintExecutionPrompt = async (sprintId: string): Promise<string> => {
    const response = await api.get(`/api/sprints/${sprintId}/execution-prompt`);
    return response.data.prompt;
};
