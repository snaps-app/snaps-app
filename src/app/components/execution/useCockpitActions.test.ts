/**
 * SNA-SUP-81: a recusa de avanco que lista condicoes dispensaveis oferece o
 * override ali mesmo. Em 09/10 o PO recebeu "Human override available ...
 * peer_review_generated" no plan_review da be34b326 e nao teve como agir: a
 * condicao ja estava no template, entao nenhum item novo apareceu, e o alerta
 * so informava.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';

vi.mock('@/services/agentExecutions', () => ({
    advanceAgentExecution: vi.fn(),
    createExecutionOverrideDecision: vi.fn(),
    rollbackAgentExecution: vi.fn(),
    syncAgentExecution: vi.fn(),
}));
vi.mock('@/services/cards', () => ({ getCard: vi.fn(), updateCard: vi.fn() }));
vi.mock('@/services/sprints', () => ({ getCardsBySprint: vi.fn(), getSprints: vi.fn() }));

import { advanceAgentExecution, createExecutionOverrideDecision } from '@/services/agentExecutions';
import { useCockpitActions } from './useCockpitActions';

const RECUSA = 'Cannot advance phase. Requirements not met:\n'
    + "- No Peer Review Report generated. Use snaps_create_agent_artifact_tool (type='walkthrough') before advancing.\n"
    + 'Human override available (project admin, with reason; agents cannot): peer_review_generated';

const recusa = (detail: string, status = 400) => ({ response: { status, data: { detail } } });

const montar = (manualOverrides: Record<string, boolean> = {}) => {
    const props = {
        projectId: 'p1',
        executionId: 'review-1',
        execution: { id: 'review-1', lock_version: 3 } as any,
        missionInstructions: '',
        selectedDocIds: [],
        selectedDecisionIds: [],
        manualOverrides,
        setExecution: vi.fn(),
        setSelectedTestPlanIds: vi.fn(),
        setIsSavingTestPlanContext: vi.fn(),
        setIsRefreshing: vi.fn(),
        setIsAdvancing: vi.fn(),
        setIsRollingBack: vi.fn(),
        setMissionInstructions: vi.fn(),
        setManualOverrides: vi.fn(),
        setRefusedConditions: vi.fn(),
        setIsTimeTrackingModalOpen: vi.fn(),
        setSprints: vi.fn(),
        setCards: vi.fn(),
        fetchSisters: vi.fn(async () => []),
        fetchTroubleReport: vi.fn(async () => {}),
        loadExecutionTroubleReport: vi.fn(async () => {}),
        navigate: vi.fn(),
    };
    const { result } = renderHook(() => useCockpitActions(props));
    return { result, props };
};

beforeEach(() => {
    vi.mocked(advanceAgentExecution).mockReset();
    vi.mocked(createExecutionOverrideDecision).mockReset();
    vi.spyOn(window, 'alert').mockImplementation(() => {});
    vi.spyOn(window, 'confirm').mockReset();
    vi.spyOn(window, 'prompt').mockReset();
});

describe('handleAdvance: override oferecido na recusa', () => {
    it('recusa com condicao dispensavel oferece o override e avanca com a decisao humana', async () => {
        vi.mocked(advanceAgentExecution)
            .mockRejectedValueOnce(recusa(RECUSA))
            .mockResolvedValueOnce({ id: 'exec-tp1', status: 'pending' } as any);
        vi.mocked(createExecutionOverrideDecision).mockResolvedValue({
            decision_id: 'dec-1', execution_revision: 3,
        } as any);
        vi.spyOn(window, 'confirm').mockReturnValue(true);
        vi.spyOn(window, 'prompt').mockReturnValue('humano dispensou peer review nesta rodada');
        const { result, props } = montar();

        await act(async () => { await result.current.handleAdvance(); });

        expect(window.confirm).toHaveBeenCalledWith(expect.stringContaining('peer_review_generated'));
        expect(createExecutionOverrideDecision).toHaveBeenCalledWith(
            'review-1', 'humano dispensou peer review nesta rodada', ['peer_review_generated']);
        expect(advanceAgentExecution).toHaveBeenLastCalledWith(
            'review-1', '', [], [], true, 3, 'dec-1', ['peer_review_generated']);
        expect(props.navigate).toHaveBeenCalledWith('/project/p1/execution/exec-tp1');
    });

    it('humano recusa a oferta: nada de decisao, a condicao fica marcada no checklist', async () => {
        vi.mocked(advanceAgentExecution).mockRejectedValueOnce(recusa(RECUSA));
        vi.spyOn(window, 'confirm').mockReturnValue(false);
        const { result, props } = montar();

        await act(async () => { await result.current.handleAdvance(); });

        expect(createExecutionOverrideDecision).not.toHaveBeenCalled();
        expect(advanceAgentExecution).toHaveBeenCalledTimes(1);
        expect(props.setRefusedConditions).toHaveBeenCalledWith(['peer_review_generated']);
    });

    it('override ja selecionado e recusado por outra condicao: oferece so a que falta, somando as duas', async () => {
        const outra = RECUSA.replace('peer_review_generated', 'dispatch_scope_fan_out')
            .replace('No Peer Review Report generated', 'TP-1 approval is approval_stale');
        vi.mocked(createExecutionOverrideDecision)
            .mockResolvedValueOnce({ decision_id: 'dec-1', execution_revision: 3 } as any)
            .mockResolvedValueOnce({ decision_id: 'dec-2', execution_revision: 3 } as any);
        vi.mocked(advanceAgentExecution)
            .mockRejectedValueOnce(recusa(outra))
            .mockResolvedValueOnce({ id: 'exec-tp1', status: 'pending' } as any);
        vi.spyOn(window, 'confirm').mockReturnValue(true);
        vi.spyOn(window, 'prompt').mockReturnValue('motivo');
        const { result } = montar({ peer_review_generated: true });

        await act(async () => { await result.current.handleAdvance(); });

        expect(window.confirm).toHaveBeenCalledWith(expect.stringContaining('dispatch_scope_fan_out'));
        expect(createExecutionOverrideDecision).toHaveBeenLastCalledWith(
            'review-1', 'motivo', ['peer_review_generated', 'dispatch_scope_fan_out']);
    });

    it('recusa sem condicao dispensavel (conflito de revisao) so informa', async () => {
        vi.mocked(advanceAgentExecution).mockRejectedValueOnce(
            recusa('execution revision mismatch: expected 3, current 4', 409));
        const { result } = montar();

        await act(async () => { await result.current.handleAdvance(); });

        expect(window.confirm).not.toHaveBeenCalled();
        expect(window.alert).toHaveBeenCalledWith(expect.stringContaining('revision mismatch'));
    });

    it('motivo vazio cancela o override sem avancar', async () => {
        vi.mocked(advanceAgentExecution).mockRejectedValueOnce(recusa(RECUSA));
        vi.spyOn(window, 'confirm').mockReturnValue(true);
        vi.spyOn(window, 'prompt').mockReturnValue('  ');
        const { result } = montar();

        await act(async () => { await result.current.handleAdvance(); });

        expect(createExecutionOverrideDecision).not.toHaveBeenCalled();
        expect(advanceAgentExecution).toHaveBeenCalledTimes(1);
    });
});
