import { api } from './client';
import type { TimeLog, TimeLogCreate, TimeLogFilters, TimeDraftResponse, ExecutionSession } from '@/types/timeLogs';

export const startExecutionSession = async (executionId: string): Promise<{ session_id: string; started_at: string }> => {
    const response = await api.post(`/agent-executions/${executionId}/sessions/start`);
    return response.data;
};

export const endExecutionSession = async (executionId: string, sessionId: string): Promise<void> => {
    await api.patch(`/agent-executions/${executionId}/sessions/${sessionId}/end`);
};

export const saveSessionHeartbeat = async (executionId: string, sessionId: string, elapsedSeconds: number): Promise<void> => {
    await api.patch(`/agent-executions/${executionId}/sessions/${sessionId}/heartbeat`, {
        elapsed_seconds: elapsedSeconds
    });
};

export const listExecutionSessions = async (executionId: string): Promise<ExecutionSession[]> => {
    const response = await api.get(`/agent-executions/${executionId}/sessions`);
    return response.data;
};

export const createExecutionSession = async (executionId: string, data: { started_at: string; ended_at: string; user_id?: string }): Promise<ExecutionSession> => {
    const response = await api.post(`/agent-executions/${executionId}/sessions`, data);
    return response.data;
};

export const updateExecutionSession = async (executionId: string, sessionId: string, data: { started_at?: string; ended_at?: string; user_id?: string }): Promise<ExecutionSession> => {
    const response = await api.patch(`/agent-executions/${executionId}/sessions/${sessionId}`, data);
    return response.data;
};

export const deleteExecutionSession = async (executionId: string, sessionId: string): Promise<void> => {
    await api.delete(`/agent-executions/${executionId}/sessions/${sessionId}`);
};

export const getTimeDraft = async (executionId: string): Promise<TimeDraftResponse> => {
    const response = await api.get(`/agent-executions/${executionId}/time-draft`);
    return response.data;
};

export const createTimeLog = async (projectId: string, data: TimeLogCreate): Promise<TimeLog> => {
    const response = await api.post(`/projects/${projectId}/time-logs/`, data);
    return response.data;
};

export const updateTimeLog = async (logId: string, data: { hours?: number; description?: string; date?: string }): Promise<TimeLog> => {
    const response = await api.patch(`/time-logs/${logId}`, data);
    return response.data;
};

export const getProjectTimeLogs = async (projectId: string, params?: TimeLogFilters): Promise<TimeLog[]> => {
    const response = await api.get(`/projects/${projectId}/time-logs/`, { params });
    return response.data;
};

export const getGlobalTimeLogs = async (params?: TimeLogFilters): Promise<TimeLog[]> => {
    const response = await api.get(`/time-logs/`, { params });
    return response.data;
};

export const downloadTimeReport = async (
    projectId: string,
    startDate?: string,
    endDate?: string,
    theme = 'dark'
): Promise<Blob> => {
    const response = await api.get(`/projects/${projectId}/time-logs/report`, {
        params: { start_date: startDate, end_date: endDate, theme },
        responseType: 'blob',
    });
    return response.data;
};
