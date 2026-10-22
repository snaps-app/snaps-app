/**
 * Recusa ao criar execução (aceite DEV da Sprint 24.0, 22/10/2026).
 *
 * O PO criou um projeto e um card no preview, clicou em "Launch Agent Session"
 * e recebeu só "Failed to start agent session": o 400 da API trazia o motivo
 * escrito, e o `alert` genérico o jogava fora.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

vi.mock('@/services/agentExecutions', () => ({ createAgentExecution: vi.fn() }));
vi.mock('@/services/sprints', () => ({ getSprints: vi.fn() }));
vi.mock('@/services/workflowTemplates', () => ({ getWorkflowTemplates: vi.fn() }));
vi.mock('@/app/components/workflow/workflow-flow-preview', () => ({ WorkflowFlowPreview: () => null }));

import { createAgentExecution } from '@/services/agentExecutions';
import { getSprints } from '@/services/sprints';
import { getWorkflowTemplates } from '@/services/workflowTemplates';
import { StrategyConfiguratorModal } from './strategy-configurator-modal';

const MOTIVO = 'execucao nao criada: a fase `triage` pede o agente `antigravity-rca-analyst`, e o perfil dele nao resolve.';

const recusa = (detail: unknown, status = 400) => Object.assign(
    new Error(`Request failed with status code ${status}`),
    { response: { status, data: { detail } } },
);

const abrir = async () => {
    render(
        <MemoryRouter>
            <StrategyConfiguratorModal isOpen onClose={vi.fn()} projectId="p1" initialCardIds={['c1']} />
        </MemoryRouter>,
    );
    await screen.findByText('Bug Resolution - Fast Track');
};

describe('StrategyConfiguratorModal — recusa ao criar', () => {
    let alerta: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
        vi.mocked(getWorkflowTemplates).mockResolvedValue([
            { id: 't1', name: 'Bug Resolution - Fast Track', phases: [{ key: 'triage', label: 'Bug Triage' }] },
        ] as any);
        vi.mocked(getSprints).mockResolvedValue([]);
        vi.spyOn(console, 'error').mockImplementation(() => {});
        alerta = vi.spyOn(window, 'alert').mockImplementation(() => {});
    });

    afterEach(() => {
        cleanup();
        vi.restoreAllMocks();
    });

    it('mostra no modal o motivo que a API devolveu, sem alerta genérico', async () => {
        vi.mocked(createAgentExecution).mockRejectedValue(recusa(MOTIVO));
        await abrir();

        await userEvent.click(screen.getByRole('button', { name: /launch agent session/i }));

        expect(await screen.findByRole('alert')).toHaveTextContent(MOTIVO);
        expect(alerta).not.toHaveBeenCalled();
        expect(screen.getByRole('button', { name: /launch agent session/i })).toBeEnabled();
    });

    it('sem motivo na resposta, diz que não criou e pede para tentar de novo', async () => {
        vi.mocked(createAgentExecution).mockRejectedValue(new Error('Network Error'));
        await abrir();

        await userEvent.click(screen.getByRole('button', { name: /launch agent session/i }));

        expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível criar a execução. Tente de novo.');
    });

    it('a nova tentativa limpa o motivo anterior', async () => {
        vi.mocked(createAgentExecution)
            .mockRejectedValueOnce(recusa(MOTIVO))
            .mockReturnValueOnce(new Promise(() => {}));
        await abrir();
        const lancar = screen.getByRole('button', { name: /launch agent session/i });

        await userEvent.click(lancar);
        await screen.findByRole('alert');
        await userEvent.click(lancar);

        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
});
