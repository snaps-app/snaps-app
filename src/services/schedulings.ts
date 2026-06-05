import { api } from './client';
import type { Scheduling, SchedulingCreate, SchedulingWithProject } from './types';

export const createScheduling = async (projectId: string, data: SchedulingCreate): Promise<Scheduling> => {
    const response = await api.post(`/projects/${projectId}/schedulings/`, { project_id: projectId, ...data });
    return response.data;
};

export const getSchedulings = async (projectId: string): Promise<Scheduling[]> => {
    const response = await api.get(`/projects/${projectId}/schedulings/`);
    return response.data;
};

export const updateScheduling = async (schedulingId: string, data: Partial<SchedulingCreate>): Promise<Scheduling> => {
    const response = await api.patch(`/schedulings/${schedulingId}`, data);
    return response.data;
};

export const deleteScheduling = async (schedulingId: string): Promise<void> => {
    await api.delete(`/schedulings/${schedulingId}`);
};

export const getAllSchedulings = async (skip = 0, limit = 500): Promise<SchedulingWithProject[]> => {
    const response = await api.get('/schedulings/', { params: { skip, limit } });
    return response.data;
};
