import { api } from './client';
import type { AgentTaskExecution, AgentTaskExecutionCreate } from './types';

export const createAgentExecution = async (data: AgentTaskExecutionCreate): Promise<AgentTaskExecution> => {
    const response = await api.post('/api/agent-executions/', data);
    return response.data;
};

export const getAgentExecution = async (executionId: string): Promise<AgentTaskExecution> => {
    const response = await api.get(`/api/agent-executions/${executionId}`);
    return response.data;
};

export const getAgentExecutionTree = async (executionId: string): Promise<AgentTaskExecution[]> => {
    const response = await api.get(`/api/agent-executions/${executionId}/tree`);
    return response.data;
};

export const getActiveAgentExecutions = async (projectId: string): Promise<AgentTaskExecution[]> => {
    const response = await api.get(`/api/projects/${projectId}/agent-executions/active`);
    return response.data;
};

export const getProjectAgentExecutions = async (projectId: string, skip = 0, limit = 100): Promise<AgentTaskExecution[]> => {
    const response = await api.get(`/api/projects/${projectId}/agent-executions`, { params: { skip, limit } });
    return response.data;
};

export const advanceAgentExecution = async (
    executionId: string, 
    instructions?: string, 
    docIds?: string[], 
    decisionIds?: string[]
): Promise<AgentTaskExecution> => {
    const response = await api.patch(`/api/agent-executions/${executionId}/advance`, { 
        instructions, 
        doc_ids: docIds, 
        decision_ids: decisionIds 
    });
    return response.data;
};

export const updateAgentExecutionStatus = async (executionId: string, status: string): Promise<AgentTaskExecution> => {
    const response = await api.patch(`/api/agent-executions/${executionId}/status`, { status });
    return response.data;
};

export const rollbackAgentExecution = async (executionId: string, targetPhase: string): Promise<AgentTaskExecution> => {
    const response = await api.patch(`/api/agent-executions/${executionId}/rollback?target_phase=${targetPhase}`);
    return response.data;
};

export const syncAgentExecution = async (
    executionId: string,
    instructions?: string,
    docIds?: string[],
    decisionIds?: string[],
    testPlanIds?: string[]
): Promise<AgentTaskExecution> => {
    const response = await api.post(`/api/agent-executions/${executionId}/sync`, {
        instructions,
        doc_ids: docIds,
        decision_ids: decisionIds,
        test_plan_ids: testPlanIds
    });
    return response.data;
};

export const getAllAgentExecutions = async (skip = 0, limit = 100): Promise<AgentTaskExecution[]> => {
    const response = await api.get('/api/agent-executions/', { params: { skip, limit } });
    return response.data;
};

export const deleteAgentExecution = async (executionId: string): Promise<void> => {
    await api.delete(`/api/agent-executions/${executionId}`);
};
