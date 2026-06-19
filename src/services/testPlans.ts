import { api } from './client';
import type { TestPlan, TestPlanCreate, TroubleReport } from './types';

export const getTestPlans = async (projectId: string, sprintId?: string, executionId?: string): Promise<TestPlan[]> => {
    const params: Record<string, string> = {};
    if (sprintId) params.sprint_id = sprintId;
    if (executionId) params.execution_id = executionId;
    const response = await api.get(`/projects/${projectId}/test_plans/`, { params });
    return response.data;
};

export const createTestPlan = async (projectId: string, data: Omit<TestPlanCreate, 'project_id'>): Promise<TestPlan> => {
    const response = await api.post(`/projects/${projectId}/test_plans/`, { project_id: projectId, ...data });
    return response.data;
};

export const updateTestPlan = async (testPlanId: string, data: Partial<TestPlanCreate>): Promise<TestPlan> => {
    const response = await api.patch(`/test_plans/${testPlanId}`, data);
    return response.data;
};

export const deleteTestPlan = async (testPlanId: string): Promise<void> => {
    await api.delete(`/test_plans/${testPlanId}`);
};

export const getTroubleReport = async (projectId: string, sprintId: string): Promise<TroubleReport> => {
    const response = await api.get(`/projects/${projectId}/sprints/${sprintId}/trouble-report`);
    return response.data;
};

// Trouble report resolvido pela agent-task-execution (test_plans por execution_id OU sprint).
// Usado por execuções de bug/RCA que não têm sprint.
export const getExecutionTroubleReport = async (executionId: string): Promise<TroubleReport> => {
    const response = await api.get(`/api/agent-executions/${executionId}/trouble-report`);
    return response.data;
};
