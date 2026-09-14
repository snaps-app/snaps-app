import { api } from './client';
import { escritaVersionada } from './versionedWrite';
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

/**
 * PATCH de template carregando a versão que o editor leu.
 *
 * `workflow_templates` entrou no escopo do CAS junto com as três tabelas de
 * governança, mas esta função — a única que grava essa tabela pela UI — não
 * tinha como enviar a versão: o tipo do payload não a comportava. Coluna,
 * trigger, ORM e tipo existiam, e a tela seguia escrevendo cega.
 */
export const updateWorkflowTemplate = async (
    templateId: string,
    data: Partial<WorkflowTemplateCreate>,
    expectedLockVersion?: number,
): Promise<WorkflowTemplate> => {
    return escritaVersionada<WorkflowTemplate>(
        `/workflow-templates/${templateId}`, data, expectedLockVersion);
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
