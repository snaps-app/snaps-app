import { api } from './client';
import type { DailyExecution, DailyExecutionCreate, DailyExecutionWithProject, DashboardStats } from './types';

export const createDailyExecution = async (projectId: string, data: DailyExecutionCreate): Promise<DailyExecution> => {
    const response = await api.post(`/projects/${projectId}/daily_executions/`, { project_id: projectId, ...data });
    return response.data;
};

export const getDailyExecutions = async (projectId: string): Promise<DailyExecution[]> => {
    const response = await api.get(`/projects/${projectId}/daily_executions/`);
    return response.data;
};

export const updateDailyExecution = async (executionId: string, data: Partial<DailyExecutionCreate>): Promise<DailyExecution> => {
    const response = await api.patch(`/daily_executions/${executionId}`, data);
    return response.data;
};

export const deleteDailyExecution = async (executionId: string): Promise<void> => {
    await api.delete(`/daily_executions/${executionId}`);
};

export const getAllDailyExecutions = async (skip = 0, limit = 500, date?: string): Promise<DailyExecutionWithProject[]> => {
    const response = await api.get('/daily_executions/', { params: { skip, limit, date } });
    return response.data;
};

export const cloneYesterdayExecutions = async (date?: string): Promise<DailyExecution[]> => {
    const response = await api.post('/daily_executions/clone_yesterday', null, { params: { date } });
    return response.data;
};

export const getDashboardStats = async (): Promise<DashboardStats> => {
    const response = await api.get('/dashboard/stats');
    return response.data;
};
