import { api } from './client';
import type { Task } from './types';

export const createTask = async (cardId: string, title: string): Promise<Task> => {
    const response = await api.post(`/cards/${cardId}/tasks/`, { title });
    return response.data;
};

export const updateTask = async (taskId: string, data: Partial<Task>): Promise<Task> => {
    const response = await api.patch(`/tasks/${taskId}`, data);
    return response.data;
};

export const deleteTask = async (taskId: string): Promise<void> => {
    await api.delete(`/tasks/${taskId}`);
};
