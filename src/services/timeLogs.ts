import { api } from './client';
import type { TimeLog, TimeLogCreate, TimeLogFilters, TimeDraftResponse } from '@/types/timeLogs';

export const startExecutionSession = async (executionId: string): Promise<{ session_id: string; started_at: string }> => {
    const response = await api.post(`/agent-executions/${executionId}/sessions/start`);
    return response.data;
};

export const endExecutionSession = async (executionId: string, sessionId: string): Promise<void> => {
    await api.patch(`/agent-executions/${executionId}/sessions/${sessionId}/end`);
};

export const getTimeDraft = async (executionId: string): Promise<TimeDraftResponse> => {
    const response = await api.get(`/agent-executions/${executionId}/time-draft`);
    return response.data;
};

export const createTimeLog = async (projectId: string, data: TimeLogCreate): Promise<TimeLog> => {
    const response = await api.post(`/projects/${projectId}/time-logs/`, data);
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
