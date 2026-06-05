import { api } from './client';
import type { Plan, PlanCreate } from './types';

export const getPlans = async (projectId: string, sprintId?: string): Promise<Plan[]> => {
    const response = await api.get(`/projects/${projectId}/plans/`, {
        params: sprintId ? { sprint_id: sprintId } : {}
    });
    return response.data;
};

export const createPlan = async (projectId: string, data: Omit<PlanCreate, 'project_id'>): Promise<Plan> => {
    const response = await api.post(`/projects/${projectId}/plans/`, { project_id: projectId, ...data });
    return response.data;
};

export const updatePlan = async (planId: string, data: Partial<PlanCreate>): Promise<Plan> => {
    const response = await api.patch(`/plans/${planId}`, data);
    return response.data;
};

export const deletePlan = async (planId: string): Promise<void> => {
    await api.delete(`/plans/${planId}`);
};
