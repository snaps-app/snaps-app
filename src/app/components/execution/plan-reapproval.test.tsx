/**
 * Reaprovacao de plano editado durante a execucao (TP4: in_execution, rev 3,
 * aprovacao invalidada). O cockpit nao oferecia como aprovar a revisao
 * corrente porque so o status `draft` tinha botao de aprovacao.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, renderHook, screen } from '@testing-library/react';

vi.mock('@/services/plans', () => ({
    approvePlan: vi.fn(),
    updatePlan: vi.fn(),
    deletePlan: vi.fn(),
}));

import { approvePlan, updatePlan } from '@/services/plans';
import type { AgentTaskExecution } from '@/services/types';
import { planApprovalState } from './plan-approval';
import { PlanPanel } from './plan-panel';
import { useCockpitPlans } from './useCockpitPlans';

const TP4 = {
    id: 'tp4', title: 'TP4 — Perfis, modelos e baseline A3', status: 'in_execution',
    author: 'micro-planner', content: 'conteudo rev 3', content_revision: 3,
    approved_revision: null, approved_content_hash: null, approved_at: null,
};
const APROVADO = {
    ...TP4, id: 'tp1', title: 'TP-1', status: 'selected', approved_revision: 2, content_revision: 2,
    approved_content_hash: 'h1',
};

const execucao = (plans: any[] = [TP4, APROVADO]): AgentTaskExecution => ({
    id: 'exec-1', project_id: 'p1', status: 'pending', phase: 'execution',
    sprint_ids: [], card_ids: [], agent_name: '@executor', advance_conditions: {},
    lock_version: 1, created_at: '', updated_at: '', plan_id: 'tp4',
    context_data: { plans },
});

beforeEach(() => {
    vi.mocked(approvePlan).mockReset();
    vi.mocked(updatePlan).mockReset();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    vi.spyOn(window, 'alert').mockImplementation(() => {});
});

afterEach(() => vi.restoreAllMocks());

describe('planApprovalState', () => {
    it('em execucao sem aprovacao da revisao corrente fica com reaprovacao pendente', () => {
        expect(planApprovalState(TP4)).toBe('reapproval_pending');
        expect(planApprovalState({ ...TP4, status: 'selected' })).toBe('reapproval_pending');
        expect(planApprovalState({ ...TP4, approved_revision: 2, approved_content_hash: 'h' }))
            .toBe('reapproval_pending');
    });

    it('aprovacao da revisao corrente e rascunho nao pedem reaprovacao', () => {
        expect(planApprovalState(APROVADO)).toBe('current');
        expect(planApprovalState({ ...TP4, status: 'draft' })).toBe('none');
    });
});

const painel = (reapprovePlan = vi.fn(async () => {})) => {
    render(<PlanPanel
        execution={execucao()} sprints={[]} isSequential={false} currentPlan={null}
        isPlanWaiting={() => false} isEditingPlan={false} setIsEditingPlan={vi.fn()}
        editingPlanId={null} setEditingPlanId={vi.fn()} planContent="" setPlanContent={vi.fn()}
        planTitle="" setPlanTitle={vi.fn()} isSavingPlan={false} handleSavePlan={vi.fn()}
        handleEditPlan={vi.fn()} handleCopy={vi.fn()} copiedId={null}
        handleOpenPeerReview={vi.fn()} updatePlanStatus={vi.fn()}
        reapprovePlan={reapprovePlan} deletePlanFn={vi.fn()} />);
    return reapprovePlan;
};

describe('PlanPanel', () => {
    it('mostra reaprovacao pendente mesmo com status in_execution e oferece aprovar a rev 3', () => {
        const reapprovePlan = painel();

        expect(screen.getByText('In Execution')).toBeTruthy();
        expect(screen.getByTestId('reapproval-pending-tp4').textContent).toMatch(/Reaprovação pendente · rev 3/);
        expect(screen.queryByTestId('reapproval-pending-tp1')).toBeNull();

        fireEvent.click(screen.getByRole('button', { name: /Aprovar rev 3/ }));
        expect(reapprovePlan).toHaveBeenCalledWith('tp4');
    });
});

describe('useCockpitPlans.reapprovePlan', () => {
    const montar = () => {
        const setExecution = vi.fn();
        const recarregada = execucao([{ ...TP4, approved_revision: 3, approved_content_hash: 'h3' }]);
        const getExecution = vi.fn(async () => recarregada);
        const { result } = renderHook(() => useCockpitPlans(execucao(), setExecution, false, null));
        return { result, setExecution, getExecution, recarregada };
    };

    it('aprova a revisao que o PO viu pelo servico de aprovacao, sem mudar status', async () => {
        vi.mocked(approvePlan).mockResolvedValue({} as any);
        const { result, setExecution, getExecution, recarregada } = montar();

        await act(() => result.current.reapprovePlan('tp4', getExecution));

        expect(window.confirm).toHaveBeenCalled();
        expect(approvePlan).toHaveBeenCalledWith('tp4', 3, 'cockpit:reapproval-confirmed');
        expect(updatePlan).not.toHaveBeenCalled();
        expect(setExecution).toHaveBeenCalledWith(recarregada);
    });

    it('sem confirmacao humana nao aprova', async () => {
        vi.mocked(window.confirm).mockReturnValue(false);
        const { result, getExecution } = montar();

        await act(() => result.current.reapprovePlan('tp4', getExecution));

        expect(approvePlan).not.toHaveBeenCalled();
    });

    it('conteudo que mudou durante a operacao vira aviso e recarga, nao sucesso', async () => {
        vi.mocked(approvePlan).mockRejectedValue({
            response: { status: 409, data: { detail: 'Plan revision changed: expected 3, current 4' } },
        });
        const { result, setExecution, getExecution, recarregada } = montar();

        await act(() => result.current.reapprovePlan('tp4', getExecution));

        expect(window.alert).toHaveBeenCalledWith(expect.stringMatching(/mudou durante a aprovacao.*current 4/));
        expect(setExecution).toHaveBeenCalledWith(recarregada);
    });
});
