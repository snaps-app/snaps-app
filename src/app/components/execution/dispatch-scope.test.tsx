/** SNA-SUP-81: escopo de despacho e override humano sempre disponivel. */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

vi.mock('@/services/agentExecutions', () => ({
    setDispatchScope: vi.fn(),
}));

import { setDispatchScope } from '@/services/agentExecutions';
import type { AgentTaskExecution } from '@/services/types';
import { parseOverridableConditions } from './dispatch-scope';
import { DispatchScopePanel } from './dispatch-scope-panel';
import { ExecutionRequirementsChecklist } from './execution-requirements-checklist';

const plano = (id: string, title: string, status: string, extra: Record<string, unknown> = {}) => ({
    id, title, status, author: 'micro-planner', content_revision: 2,
    approved_revision: 2, approved_content_hash: `h-${id}`, ...extra,
});

const PLANOS = [
    { id: 'macro', title: 'Strategic', status: 'approved', author: 'macro-planner' },
    plano('tp1', 'TP-1', 'selected'),
    plano('tp2', 'TP-2', 'selected'),
    plano('tp3', 'TP-3', 'in_execution', { approved_content_hash: null, approved_revision: null }),
    plano('tp4', 'TP-4', 'approved'),
    plano('tp5', 'TP-5', 'selected', { content_revision: 3 }),
];

const execucao = (over: Partial<AgentTaskExecution> = {}): AgentTaskExecution => ({
    id: 'exec-1', project_id: 'p1', status: 'pending', phase: 'micro_planning',
    sprint_ids: ['s1'], card_ids: [], agent_name: '@micro', advance_conditions: {},
    lock_version: 7, created_at: '', updated_at: '',
    context_data: { plans: PLANOS }, ...over,
});

const ESCOPO = {
    plan_ids: ['tp1', 'tp2'],
    card_ids: ['c1', 'c2', 'c3', 'c4'],
    plans: [
        { id: 'tp1', title: 'TP-1', status: 'selected', approval: 'current', approved_revision: 2 },
        { id: 'tp2', title: 'TP-2', status: 'selected', approval: 'current', approved_revision: 2 },
    ],
    deferred_plans: [
        { id: 'tp4', title: 'TP-4', status: 'approved' },
        { id: 'tp5', title: 'TP-5', status: 'selected' },
    ],
    reason: 'Executar somente TP-1 e TP-2 nesta rodada',
    set_by: { actor_id: 'humano-1', actor_kind: 'human' },
    set_at: '2026-10-09T18:00:00+00:00',
    phase: 'micro_planning',
};

beforeEach(() => {
    vi.mocked(setDispatchScope).mockReset();
});

describe('parseOverridableConditions', () => {
    it('le as condicoes que o humano pode dispensar da ultima linha da recusa', () => {
        const detalhe = 'Cannot advance phase. Requirements not met:\n- 5 plans ...\n'
            + 'Human override available (project admin, with reason; agents cannot): '
            + 'tactical_plans_approved, single_execution_multiple_plans';
        expect(parseOverridableConditions(detalhe)).toEqual([
            'tactical_plans_approved', 'single_execution_multiple_plans',
        ]);
    });

    it('recusa sem a linha nao inventa condicao', () => {
        expect(parseOverridableConditions('execution revision mismatch')).toEqual([]);
        expect(parseOverridableConditions(undefined)).toEqual([]);
    });
});

describe('DispatchScopePanel', () => {
    it('oferece so planos taticos selected/approved e marca aprovacao desatualizada', () => {
        render(<DispatchScopePanel execution={execucao()} onExecutionUpdated={vi.fn()} />);

        expect(screen.getByLabelText('TP-1')).toBeTruthy();
        expect(screen.getByLabelText('TP-4')).toBeTruthy();
        expect(screen.queryByLabelText('TP-3')).toBeNull();
        expect(screen.queryByLabelText('Strategic')).toBeNull();
        expect(screen.getByText(/TP-5/).closest('label')?.textContent).toMatch(/desatualizada/i);
    });

    it('exige motivo e envia os planos escolhidos com a revisao', async () => {
        const atualizada = execucao({ context_data: { plans: PLANOS, dispatch_scope: ESCOPO } });
        vi.mocked(setDispatchScope).mockResolvedValue(atualizada);
        const onUpdated = vi.fn();
        render(<DispatchScopePanel execution={execucao()} onExecutionUpdated={onUpdated} />);

        fireEvent.click(screen.getByLabelText('TP-1'));
        fireEvent.click(screen.getByLabelText('TP-2'));
        const definir = screen.getByRole('button', { name: /definir escopo/i }) as HTMLButtonElement;
        expect(definir.disabled).toBe(true);

        fireEvent.change(screen.getByLabelText('Motivo do escopo'), {
            target: { value: 'Executar somente TP-1 e TP-2 nesta rodada' },
        });
        fireEvent.click(definir);

        await waitFor(() => expect(onUpdated).toHaveBeenCalledWith(atualizada));
        expect(setDispatchScope).toHaveBeenCalledWith(
            'exec-1', ['tp1', 'tp2'], 'Executar somente TP-1 e TP-2 nesta rodada', 7,
        );
    });

    it('mostra a recusa da API sem fingir sucesso', async () => {
        vi.mocked(setDispatchScope).mockRejectedValue({
            response: { status: 403, data: { detail: 'dispatch scope is a human decision' } },
        });
        const onUpdated = vi.fn();
        render(<DispatchScopePanel execution={execucao()} onExecutionUpdated={onUpdated} />);
        fireEvent.click(screen.getByLabelText('TP-1'));
        fireEvent.change(screen.getByLabelText('Motivo do escopo'), { target: { value: 'x' } });
        fireEvent.click(screen.getByRole('button', { name: /definir escopo/i }));

        expect(await screen.findByText(/human decision/)).toBeTruthy();
        expect(onUpdated).not.toHaveBeenCalled();
    });

    it('com escopo definido mostra planos, adiados, motivo e autor, e permite limpar', async () => {
        vi.mocked(setDispatchScope).mockResolvedValue(execucao());
        const exec = execucao({ context_data: { plans: PLANOS, dispatch_scope: ESCOPO } });
        render(<DispatchScopePanel execution={exec} onExecutionUpdated={vi.fn()} />);

        const banner = screen.getByTestId('dispatch-scope-banner');
        expect(banner.textContent).toMatch(/TP-1/);
        expect(banner.textContent).toMatch(/TP-2/);
        expect(banner.textContent).toMatch(/Adiados.*TP-4.*TP-5/s);
        expect(banner.textContent).toMatch(/Executar somente TP-1 e TP-2 nesta rodada/);
        expect(banner.textContent).toMatch(/humano-1/);
        expect(banner.textContent).toMatch(/4 cards/);

        fireEvent.change(screen.getByLabelText('Motivo para limpar'), { target: { value: 'voltar' } });
        fireEvent.click(screen.getByRole('button', { name: /limpar escopo/i }));
        await waitFor(() => expect(setDispatchScope).toHaveBeenCalledWith('exec-1', [], 'voltar', 7));
    });

    it('em execucao por plano mostra o escopo herdado so para leitura', () => {
        const exec = execucao({ phase: 'execution', plan_id: 'tp1',
            context_data: { plans: PLANOS, dispatch_scope: ESCOPO } });
        render(<DispatchScopePanel execution={exec} onExecutionUpdated={vi.fn()} />);
        expect(screen.getByTestId('dispatch-scope-banner')).toBeTruthy();
        expect(screen.queryByRole('button', { name: /limpar escopo/i })).toBeNull();
        expect(screen.queryByLabelText('Motivo do escopo')).toBeNull();
    });

    it('micro_planning com o plano estrategico herdado continua editavel', () => {
        render(<DispatchScopePanel execution={execucao({ plan_id: 'macro' })} onExecutionUpdated={vi.fn()} />);
        expect(screen.getByLabelText('Motivo do escopo')).toBeTruthy();
    });

    it('em execucao por plano sem escopo nao renderiza nada', () => {
        const { container } = render(
            <DispatchScopePanel execution={execucao({ phase: 'execution', plan_id: 'tp1' })}
                onExecutionUpdated={vi.fn()} />);
        expect(container.textContent).toBe('');
    });
});

describe('ExecutionRequirementsChecklist: override humano sempre disponivel', () => {
    const template = {
        id: 't1', name: 'SDLC', phases: [{
            key: 'micro_planning', label: 'Micro',
            advance_conditions: { tactical_plans_approved: true, plan_approved: true },
        }],
    } as any;

    it('aprovacao de plano tambem tem toggle de override', () => {
        const onToggle = vi.fn(async () => {});
        render(<ExecutionRequirementsChecklist execution={execucao({ workflow_template_id: 't1' })}
            templates={[template]} cards={[]} manualOverrides={{}} onRequirementToggle={onToggle} />);

        fireEvent.click(screen.getByRole('button', { name: /All Tactical Plans Approved/ }));
        fireEvent.click(screen.getByRole('button', { name: /Strategic Plan Approved/ }));
        expect(onToggle).toHaveBeenCalledWith('tactical_plans_approved', true);
        expect(onToggle).toHaveBeenCalledWith('plan_approved', true);
    });

    it('com escopo, plano approved escolhido conta para a aprovacao tatica', () => {
        const escopo = { ...ESCOPO, plan_ids: ['tp4'] };
        const { container } = render(<ExecutionRequirementsChecklist
            execution={execucao({ workflow_template_id: 't1',
                context_data: { plans: PLANOS, dispatch_scope: escopo } })}
            templates={[template]} cards={[]} manualOverrides={{}} />);
        const item = screen.getByRole('button', { name: /All Tactical Plans Approved/ });
        expect(item.textContent).not.toMatch(/missing or stale/);
        expect(container).toBeTruthy();
    });

    it('recusa estrutural vira item dispensavel com rotulo', () => {
        const onToggle = vi.fn(async () => {});
        render(<ExecutionRequirementsChecklist execution={execucao({ workflow_template_id: 't1' })}
            templates={[template]} cards={[]} manualOverrides={{}} onRequirementToggle={onToggle}
            refusedConditions={['single_execution_multiple_plans', 'tactical_plans_approved']} />);

        const item = screen.getByRole('button', { name: /varios planos/i });
        fireEvent.click(item);
        expect(onToggle).toHaveBeenCalledWith('single_execution_multiple_plans', true);
        // Condicao do template nao aparece duas vezes.
        expect(screen.getAllByRole('button', { name: /All Tactical Plans Approved/ })).toHaveLength(1);
    });
});
