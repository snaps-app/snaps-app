import { api } from './client';
import type { Routine, RoutineCreate, RoutineWithStatus } from './types';

export const createRoutine = async (data: RoutineCreate): Promise<Routine> => {
    const response = await api.post('/routines/', data);
    return response.data;
};

export const getRoutines = async (): Promise<Routine[]> => {
    const response = await api.get('/routines/');
    return response.data;
};

export const getRoutinesForDate = async (date: string): Promise<RoutineWithStatus[]> => {
    const response = await api.get('/routines/today', { params: { date } });
    return response.data;
};

export const updateRoutine = async (id: string, data: Partial<RoutineCreate & { active?: boolean }>): Promise<Routine> => {
    const response = await api.patch(`/routines/${id}`, data);
    return response.data;
};

export const deleteRoutine = async (id: string): Promise<void> => {
    await api.delete(`/routines/${id}`);
};

export const setRoutineCompletion = async (routineId: string, date: string, status: string): Promise<void> => {
    await api.put(`/routines/${routineId}/complete`, { date, status });
};
