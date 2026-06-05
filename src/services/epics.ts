import { api } from './client';
import type { Epic, EpicCreate } from './types';

export const getEpics = async (projectId: string): Promise<Epic[]> => {
    const response = await api.get(`/projects/${projectId}/epics/`);
    return response.data;
};

export const createEpic = async (projectId: string, data: EpicCreate): Promise<Epic> => {
    const response = await api.post(`/projects/${projectId}/epics/`, data);
    return response.data;
};

export const updateEpic = async (epicId: string, data: Partial<EpicCreate>): Promise<Epic> => {
    const response = await api.patch(`/epics/${epicId}`, data);
    return response.data;
};

export const deleteEpic = async (epicId: string): Promise<void> => {
    await api.delete(`/epics/${epicId}`);
};
