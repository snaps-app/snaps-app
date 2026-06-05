import { api, getCachedData, setCachedData } from './client';
import type { Board } from './types';

export const getProjectBoard = async (projectId: string): Promise<Board> => {
    const cacheKey = `project_board_${projectId}`;
    const cached = getCachedData(cacheKey);
    if (cached) return cached;

    const response = await api.get(`/projects/${projectId}/board`);
    setCachedData(cacheKey, response.data);
    return response.data;
};

export const getProjectBoards = async (projectId: string): Promise<Board[]> => {
    const cacheKey = `project_boards_${projectId}`;
    const cached = getCachedData(cacheKey);
    if (cached) return cached;

    const response = await api.get(`/projects/${projectId}/boards`);
    setCachedData(cacheKey, response.data);
    return response.data;
};

export const getBoard = async (boardId: string): Promise<Board> => {
    const response = await api.get(`/boards/${boardId}`);
    return response.data;
};

export const createBoard = async (projectId: string, data: Partial<Board>): Promise<Board> => {
    const response = await api.post(`/projects/${projectId}/boards`, { project_id: projectId, ...data });
    return response.data;
};

export const updateBoard = async (boardId: string, data: Partial<Board>): Promise<Board> => {
    const response = await api.patch(`/boards/${boardId}`, data);
    return response.data;
};
