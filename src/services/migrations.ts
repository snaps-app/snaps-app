import { api } from './client';

export const applyMigrations = async (): Promise<any> => {
    const response = await api.post('/migrations/apply');
    return response.data;
};

export const getMigrationStatus = async (): Promise<any> => {
    const response = await api.get('/migrations/status');
    return response.data;
};
