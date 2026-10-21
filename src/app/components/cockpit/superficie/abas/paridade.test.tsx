/**
 * Paridade com o Cockpit antigo nas abas (TP-4): o que o antigo fazia e a aba
 * do TP-2 ainda não ligava — abrir o card, acrescentar docs e ADRs ao contexto
 * e excluir uma nota do Scratch.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { renderComConsulta } from '@/test/comConsulta';
import type { AgentTaskExecution, Card } from '@/services/types';
import type { AcoesDoNo } from '../useAcoesDoNo';

vi.mock('@/services/cards', () => ({ getCard: vi.fn(), updateCard: vi.fn() }));
vi.mock('@/services/sprints', () => ({ getCardsBySprint: vi.fn(), getSprints: vi.fn(async () => []) }));
vi.mock('@/services/epics', () => ({ getEpics: vi.fn(async () => []) }));
vi.mock('@/services/boards', () => ({ getProjectBoards: vi.fn(async () => []) }));
vi.mock('@/services/projects', () => ({ getGithubConfig: vi.fn(async () => ({ repo_names: 'snaps-app' })), getProject: vi.fn() }));
vi.mock('@/services/agentExecutions', () => ({ getAgentExecution: vi.fn() }));
vi.mock('@/services/governance', () => ({ getGovernanceDocs: vi.fn(), updateGovernanceDoc: vi.fn(), getAgents: vi.fn() }));
vi.mock('@/services/decisions', () => ({ getDecisions: vi.fn(async () => []) }));
vi.mock('@/services/snaps', () => ({ getSnaps: vi.fn(), deleteSnap: vi.fn(), createSnap: vi.fn(), updateSnap: vi.fn() }));
vi.mock('@/services/contextSelection', async (original) => ({
    ...(await original<typeof import('@/services/contextSelection')>()),
    getExecutionContextSelection: vi.fn(async () => ({
        execution_id: 'no-1', status: 'in_progress', revisavel: false,
        camadas: { nucleo: [], descoberta: [], mission_context: null }, handoff: [], historico: [], omitted: [],
    })),
}));

import { getCard } from '@/services/cards';
import { getEpics } from '@/services/epics';
import { getAgentExecution } from '@/services/agentExecutions';
import { getGovernanceDocs } from '@/services/governance';
import { deleteSnap, getSnaps } from '@/services/snaps';
import { AbaCards } from './AbasDeCards';
import { AbaContexto } from './AbasDeContexto';
import AbaScratch from './AbaScratch';

const NO = {
    id: 'no-1', project_id: 'p', root_id: 'raiz', status: 'in_progress', phase: 'execution', sprint_ids: ['s'],
    card_ids: ['c1'], agent_name: '@coder', advance_conditions: {}, lock_version: 3, created_at: '', updated_at: '',
} as AgentTaskExecution;

function acoesFalsas(): AcoesDoNo {
    return {
        acoes: { salvarContexto: vi.fn(async () => NO) } as unknown as AcoesDoNo['acoes'],
        copiarPrompt: vi.fn(),
        pode: () => true,
        podeAgir: true,
        ehAdmin: true,
        emAndamento: null,
    };
}

const props = (acoes = acoesFalsas()) => ({
    execucao: NO, somenteLeitura: false, ativa: true, acoes, onSelecionarAba: vi.fn(),
});

beforeEach(() => vi.clearAllMocks());

describe('paridade com o Cockpit antigo', () => {
    it('Cards: clicar num card abre o CardModal, e o que ele precisa só é buscado aí', async () => {
        const card = { id: 'c1', title: 'Cockpit em três colunas', status: 'todo', priority: 'Medium', board_id: 'b' } as Card;
        vi.mocked(getCard).mockResolvedValue(card);
        renderComConsulta(<AbaCards {...props()} />);

        fireEvent.click(await screen.findByText('Cockpit em três colunas'));

        await waitFor(() => expect(getEpics).toHaveBeenCalledWith('p'));
        expect(await screen.findByDisplayValue('Cockpit em três colunas')).toBeInTheDocument();
    });

    it('Contexto: "Acrescentar docs e ADRs" abre o seletor e salva pelo contexto do nó', async () => {
        vi.mocked(getAgentExecution).mockResolvedValue({ ...NO, context_data: { doc_ids: ['d0'] } } as AgentTaskExecution);
        vi.mocked(getGovernanceDocs).mockResolvedValue([{ id: 'd1', name: 'Runbook de deploy', content: '' } as never]);
        const acoes = acoesFalsas();
        renderComConsulta(<AbaContexto {...props(acoes)} />);

        fireEvent.click(await screen.findByRole('button', { name: 'Acrescentar docs e ADRs' }));
        fireEvent.click(await screen.findByText('Runbook de deploy'));
        fireEvent.click(screen.getByRole('button', { name: 'Done' }));

        await waitFor(() => expect(acoes.acoes.salvarContexto).toHaveBeenCalledWith({ docIds: ['d0', 'd1'], decisionIds: [] }));
    });

    it('Scratch: excluir uma nota pede confirmação e apaga', async () => {
        vi.mocked(getSnaps).mockResolvedValue([{ id: 'n1', name: 'Ideias', content: 'x', snadds: { type: 'scratch' } } as never]);
        const confirmar = vi.spyOn(window, 'confirm').mockReturnValue(true);
        renderComConsulta(<AbaScratch {...props()} />);

        fireEvent.click(await screen.findByRole('button', { name: 'Ideias' }));
        fireEvent.click(screen.getByRole('button', { name: 'Excluir nota' }));

        expect(confirmar).toHaveBeenCalled();
        await waitFor(() => expect(deleteSnap).toHaveBeenCalledWith('n1', 'p'));
    });
});
