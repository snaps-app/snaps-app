import { api } from './client';
import type { AgentTaskExecution, AgentTaskExecutionCreate } from './types';

const commandConfig = () => ({
    headers: { 'Idempotency-Key': crypto.randomUUID() },
});

export interface OverrideDecision {
    decision_id: string;
    conditions: string[];
    expires_at: string;
    gate_hash: string;
    execution_revision: number;
}

export const createAgentExecution = async (data: AgentTaskExecutionCreate): Promise<AgentTaskExecution> => {
    const response = await api.post('/api/agent-executions/', data, commandConfig());
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
    decisionIds?: string[],
    force = false,
    expectedRevision?: number,
    overrideDecisionId?: string,
    overrideConditions: string[] = [],
): Promise<AgentTaskExecution> => {
    const response = await api.patch(`/api/agent-executions/${executionId}/advance`, {
        instructions,
        doc_ids: docIds,
        decision_ids: decisionIds,
        force,
        override_decision_id: overrideDecisionId,
        override_conditions: overrideConditions,
        expected_revision: expectedRevision,
    }, commandConfig());
    return response.data;
};

export const updateAgentExecutionStatus = async (executionId: string, status: string, expectedRevision?: number): Promise<AgentTaskExecution> => {
    const response = await api.patch(`/api/agent-executions/${executionId}/status`, {
        status, expected_revision: expectedRevision,
    }, commandConfig());
    return response.data;
};

export const rollbackAgentExecution = async (executionId: string, targetPhase: string, expectedRevision?: number): Promise<AgentTaskExecution> => {
    const response = await api.patch(
        `/api/agent-executions/${executionId}/rollback`,
        undefined,
        { ...commandConfig(), params: { target_phase: targetPhase, expected_revision: expectedRevision } },
    );
    return response.data;
};

export const syncAgentExecution = async (
    executionId: string,
    instructions?: string,
    docIds?: string[],
    decisionIds?: string[],
    testPlanIds?: string[],
    expectedRevision?: number,
): Promise<AgentTaskExecution> => {
    const response = await api.post(`/api/agent-executions/${executionId}/sync`, {
        instructions,
        doc_ids: docIds,
        decision_ids: decisionIds,
        test_plan_ids: testPlanIds,
        expected_revision: expectedRevision,
    }, commandConfig());
    return response.data;
};

export const getAllAgentExecutions = async (skip = 0, limit = 100): Promise<AgentTaskExecution[]> => {
    const response = await api.get('/api/agent-executions/', { params: { skip, limit } });
    return response.data;
};

export const deleteAgentExecution = async (executionId: string, expectedRevision?: number): Promise<void> => {
    await api.delete(`/api/agent-executions/${executionId}`, {
        ...commandConfig(), params: { expected_revision: expectedRevision },
    });
};

export const createExecutionOverrideDecision = async (
    executionId: string,
    reason: string,
    conditions: string[],
): Promise<OverrideDecision> => {
    const response = await api.post(
        `/api/agent-executions/${executionId}/override-decisions`,
        { reason, conditions },
    );
    return response.data;
};
