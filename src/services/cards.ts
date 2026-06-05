import { api } from './client';
import type { Card, CardWithProject } from './types';

export const getAllCards = async (skip = 0, limit = 100): Promise<CardWithProject[]> => {
    const response = await api.get('/cards/', { params: { skip, limit } });
    return response.data;
};

export const createCard = async (boardId: string, data: Partial<Card>): Promise<Card> => {
    const response = await api.post(`/boards/${boardId}/cards/`, { board_id: boardId, ...data });
    return response.data;
};

export const updateCard = async (cardId: string, data: Partial<Card>): Promise<Card> => {
    const response = await api.patch(`/cards/${cardId}`, data);
    return response.data;
};

export const getCard = async (cardId: string): Promise<Card> => {
    const response = await api.get(`/cards/${cardId}`);
    return response.data;
};

export const deleteCard = async (cardId: string): Promise<void> => {
    await api.delete(`/cards/${cardId}`);
};

export const updateCardStatus = async (cardId: string, status: string): Promise<Card> => {
    const response = await api.patch(`/cards/${cardId}/status`, null, { params: { status } });
    return response.data;
};

export const getCardExecutionPrompt = async (cardId: string): Promise<string> => {
    const response = await api.get(`/api/cards/${cardId}/execution-prompt`);
    return response.data.prompt;
};
