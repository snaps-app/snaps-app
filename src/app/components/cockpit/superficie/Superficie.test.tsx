import { chavesDeConsulta } from '@/services/chavesDeConsulta';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import { renderComConsulta } from '@/test/comConsulta';
import type { AgentTaskExecution } from '@/services/types';

const papel = vi.hoisted(() => ({ role: 'member' as string | null }));
vi.mock('@/contexts/project-role-context', () => ({
    useProjectRole: () => ({
        role: papel.role,
        loading: false,
        can: (acao: string) => acao === 'write' && papel.role !== null && papel.role !== 'viewer',
    }),
}));
vi.mock('@/services/resumoDoNo', async (original) => ({
    ...(await original<typeof import('@/services/resumoDoNo')>()),
    getResumoDoNo: vi.fn(),
}));
vi.mock('@/services/agentExecutions', () => ({
    getAgentExecution: vi.fn(), advanceAgentExecution: vi.fn(), rollbackAgentExecution: vi.fn(),
    createExecutionOverrideDecision: vi.fn(), syncAgentExecution: vi.fn(), updateAgentExecutionStatus: vi.fn(),
    setDispatchScope: vi.fn(),
}));
vi.mock('@/services/snaps', () => ({ getSnaps: vi.fn(), createSnap: vi.fn(), updateSnap: vi.fn() }));
vi.mock('@/services/testPlans', () => ({
    getTestPlans: vi.fn(), getExecutionTroubleReport: vi.fn(), updateTestPlan: vi.fn(),
}));
vi.mock('@/services/cards', () => ({ getCard: vi.fn(), updateCard: vi.fn() }));
vi.mock('@/services/sprints', () => ({ getCardsBySprint: vi.fn(), getSprints: vi.fn() }));
vi.mock('@/services/ambienteDoNo', async (original) => ({
    ...(await original<typeof import('@/services/ambienteDoNo')>()), getAmbienteDoNo: vi.fn(),
}));
vi.mock('@/services/atividadeDoNo', async (original) => ({
    ...(await original<typeof import('@/services/atividadeDoNo')>()), getAtividadeDoNo: vi.fn(),
}));
vi.mock('@/services/arquivosDePr', async (original) => ({
    ...(await original<typeof import('@/services/arquivosDePr')>()), getArquivosDaPr: vi.fn(),
}));
vi.mock('@/services/governance', () => ({ getAgents: vi.fn() }));
vi.mock('@/services/workflowTemplates', () => ({ getWorkflowTemplates: vi.fn() }));
vi.mock('@/services/contextSelection', async (original) => ({
    ...(await original<typeof import('@/services/contextSelection')>()), getExecutionContextSelection: vi.fn(),
}));

import { getResumoDoNo } from '@/services/resumoDoNo';
import { getAgentExecution } from '@/services/agentExecutions';
import { createSnap, getSnaps, updateSnap } from '@/services/snaps';
import { getExecutionTroubleReport, getTestPlans } from '@/services/testPlans';
import { getCard } from '@/services/cards';
import { getCardsBySprint, getSprints } from '@/services/sprints';
import { getAmbienteDoNo } from '@/services/ambienteDoNo';
import { getAtividadeDoNo } from '@/services/atividadeDoNo';
import { getArquivosDaPr } from '@/services/arquivosDePr';
import { getAgents } from '@/services/governance';
import { getWorkflowTemplates } from '@/services/workflowTemplates';
import { getExecutionContextSelection } from '@/services/contextSelection';
import { Superficie } from './Superficie';

const no = (campos: Partial<AgentTaskExecution> = {}): AgentTaskExecution => ({
    id: 'no-1', project_id: 'p', status: 'in_progress', phase: 'micro_planning', sprint_ids: ['s'],
    card_ids: [], agent_name: '@micro-planner', advance_conditions: {}, lock_version: 3,
    created_at: '2026-10-20T10:00:00Z', updated_at: '2026-10-20T10:00:00Z',
    context_data: { plans: [{ id: 'pl', title: 'TP-2', status: 'draft', content: 'c', content_revision: 1 }] },
    ...campos,
});

const resumo = (pendencias: any[] = []) => ({
    pendencias,
    abas: { testplans: { total: 0, motivo_vazio: 'O roteiro do PO nasce na assurance' } },
    atividade: { chamadas: 0, falhas: 0, recusas: 0, tempo_total_ms: 0, ultima_atividade_em: null, diagnostico_expirado: false },
});

const OUTRAS_14 = [getSnaps, getTestPlans, getExecutionTroubleReport, getCard, getCardsBySprint, getSprints,
    getAmbienteDoNo, getAtividadeDoNo, getArquivosDaPr, getAgents, getExecutionContextSelection];

beforeEach(() => {
    papel.role = 'member';
    vi.mocked(getResumoDoNo).mockResolvedValue(resumo());
    vi.mocked(getAgentExecution).mockResolvedValue(no());
    vi.mocked(getSnaps).mockResolvedValue([]);
    vi.mocked(getAgents).mockResolvedValue([]);
    vi.mocked(getCardsBySprint).mockResolvedValue([]);
});

const montar = (props: Partial<Parameters<typeof Superficie>[0]> = {}) =>
    renderComConsulta(
        <Superficie faseKey="micro_planning" execucao={no()} somenteLeitura={false}
            abaAtiva="plano" onSelecionarAba={vi.fn()} {...props} />,
    );

describe('Superficie', () => {
    it('renderiza sem Router e, com a aba Plano aberta, não chama o conteúdo das outras 14 abas', async () => {
        montar();
        expect(await screen.findByText('TP-2')).toBeInTheDocument();
        expect(getResumoDoNo).toHaveBeenCalledTimes(1);
        expect(getAgentExecution).toHaveBeenCalledTimes(1);
        for (const servico of OUTRAS_14) expect(servico).not.toHaveBeenCalled();
    });

    it('as 15 abas estão disponíveis, visíveis ou dentro de "Mais", e a vazia explica quando nasce', async () => {
        montar();
        await screen.findByText('TP-2');
        const visiveis = screen.getAllByRole('tab').length;
        fireEvent.click(screen.getByRole('button', { name: /Mais/ }));
        const noMais = screen.getAllByRole('menuitem');
        expect(visiveis + noMais.length).toBe(15);
        expect(screen.getByText('O roteiro do PO nasce na assurance')).toBeInTheDocument();
        // O menu flutua sobre a aba aberta: fundo opaco, não o realce
        // translúcido `--snaps-surface` (aceite DEV da 24.0: o Scratch vazava).
        const menu = screen.getByRole('menu');
        expect(menu.className).toContain('bg-[var(--snaps-bg)]');
        expect(menu.className).not.toContain('--snaps-surface');
    });

    it('a luz vem do /resumo: plano aguardando aprovação acende a aba Plano', async () => {
        vi.mocked(getResumoDoNo).mockResolvedValue(resumo([
            { tipo: 'plano_aguardando_aprovacao', aba: 'plano', recurso_id: 'pl', desde: '2026-10-20T10:00:00Z', acao: 'Aprovar plano' },
        ]));
        montar({ abaAtiva: 'tasks' });
        await waitFor(() => expect(document.querySelector('[data-aba="plano"][data-luz]')).not.toBeNull());
    });

    it('sem pendência no /resumo, nenhuma aba acende, mesmo com plano em draft na tela', async () => {
        montar();
        await screen.findByText('TP-2');
        expect(document.querySelector('[data-luz]')).toBeNull();
    });

    it('member vê a ação de aprovar no nó atual', async () => {
        montar();
        expect(await screen.findByRole('button', { name: /Approve Plan/ })).toBeInTheDocument();
    });

    it('somenteLeitura esconde toda escrita no nó concluído, com as mesmas abas', async () => {
        montar({ somenteLeitura: true, execucao: no({ status: 'completed' }) });
        await screen.findByText('TP-2');
        expect(screen.queryByRole('button', { name: /Approve Plan/ })).toBeNull();
        expect(screen.queryByTitle('Edit Plan')).toBeNull();
        expect(screen.queryByTitle('Delete Plan')).toBeNull();
    });

    it('viewer não vê ação, nem no nó atual', async () => {
        papel.role = 'viewer';
        montar();
        await screen.findByText('TP-2');
        expect(screen.queryByRole('button', { name: /Approve Plan/ })).toBeNull();
    });

    it('a aba Nó lê a fase do snapshot por prop e nunca chama getWorkflowTemplates', async () => {
        montar({
            abaAtiva: 'no',
            fase: { key: 'micro_planning', label: 'Micro planning', tools: ['snaps_git_commit_tool'], skills: ['tdd'] },
        });
        expect(await screen.findByText('snaps_git_commit_tool')).toBeInTheDocument();
        expect(screen.getByText('tdd')).toBeInTheDocument();
        expect(getWorkflowTemplates).not.toHaveBeenCalled();
    });

    it('abrir a aba Scratch e sair sem escrever não cria nota', async () => {
        const { unmount } = montar({ abaAtiva: 'scratch', somenteLeitura: true });
        await screen.findByText('Nenhuma nota do time nesta árvore.');
        unmount();
        expect(createSnap).not.toHaveBeenCalled();
        expect(updateSnap).not.toHaveBeenCalled();
    });

    it('walkthroughs e peer review aparecem como abas, não como modal', async () => {
        vi.mocked(getSnaps).mockResolvedValue([
            { id: 'pr', name: 'Peer Review Report', content: 'ok', snadds: { type: 'peer_review' } } as any,
        ]);
        montar({ abaAtiva: 'revisoes' });
        expect(await screen.findByText('Peer Review Report', { selector: 'h3' })).toBeInTheDocument();
        expect(document.querySelector('.fixed.inset-0')).toBeNull();
    });
});

it('Prompt reconhecido não reacende por pendência nem replay; versão posterior reacende', async () => {
    const r = {...resumo([{tipo:'prompt_aguardando_despacho',aba:'prompt',recurso_id:'no-1',desde:'d',acao:'Despachar'}]), abas:{prompt:{total:1,motivo_vazio:null,versao:'v1'}}};
    vi.mocked(getResumoDoNo).mockResolvedValue(r);
    const props = {faseKey:'micro_planning',execucao:no(),somenteLeitura:false,onSelecionarAba:vi.fn()} as const;
    const view = renderComConsulta(<Superficie {...props} abaAtiva="plano" />);
    await waitFor(() => expect(document.querySelector('[data-aba="prompt"] [aria-label*="novidade"]')).not.toBeNull());
    view.rerender(<Superficie {...props} abaAtiva="prompt" />);
    await waitFor(() => expect(getAgentExecution).toHaveBeenCalled());
    await waitFor(() => expect(document.querySelector('[data-aba="prompt"] [aria-label*="novidade"]')).toBeNull());
    view.rerender(<Superficie {...props} abaAtiva="plano" />);
    await waitFor(() => expect(document.querySelector('[data-aba="prompt"] [aria-label*="novidade"]')).toBeNull());
    act(() => view.cliente.setQueryData(chavesDeConsulta.resumo('no-1'),{...r,abas:{prompt:{total:1,motivo_vazio:null,versao:'v2'}}}));
    await waitFor(() => expect(document.querySelector('[data-aba="prompt"] [aria-label*="novidade"]')).not.toBeNull());
});

it('Revisões ganha prioridade sem substituir a aba ativa', async () => {
    vi.mocked(getResumoDoNo).mockResolvedValue({...resumo(),abas:{revisoes:{total:1,motivo_vazio:null,versao:'r1'}}});
    montar({eventos:[{name:'artifact_submitted',seq:10,payload:{artifact_type:'peer_review',artifact_id:'r'}}]});
    await waitFor(() => expect(screen.getAllByRole('tab')[0]).toHaveAttribute('data-aba','plano'));
    await waitFor(() => expect(screen.getAllByRole('tab')[1]).toHaveAttribute('data-aba','revisoes'));
    expect(document.querySelector('[data-aba="revisoes"] [aria-label*="novidade"]')).not.toBeNull();
});
