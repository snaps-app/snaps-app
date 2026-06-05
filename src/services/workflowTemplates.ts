import { api } from './client';
import type { WorkflowTemplate, WorkflowTemplateCreate } from './types';

export const getWorkflowTemplates = async (): Promise<WorkflowTemplate[]> => {
    const response = await api.get('/workflow-templates/');
    return response.data;
};

export const getWorkflowTemplate = async (templateId: string): Promise<WorkflowTemplate> => {
    const response = await api.get(`/workflow-templates/${templateId}`);
    return response.data;
};

export const createWorkflowTemplate = async (data: WorkflowTemplateCreate): Promise<WorkflowTemplate> => {
    const response = await api.post('/workflow-templates/', data);
    return response.data;
};

export const updateWorkflowTemplate = async (templateId: string, data: Partial<WorkflowTemplateCreate>): Promise<WorkflowTemplate> => {
    const response = await api.patch(`/workflow-templates/${templateId}`, data);
    return response.data;
};

export const deleteWorkflowTemplate = async (templateId: string): Promise<void> => {
    await api.delete(`/workflow-templates/${templateId}`);
};

export const getWorkflowTemplatesMetadata = async (): Promise<{
    available_tools: string[];
    available_skills: string[];
    available_agents: string[];
}> => {
    const response = await api.get('/workflow-templates/metadata');
    return response.data;
};
