import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { act, renderHook } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { novoClienteDeTeste } from '@/test/comConsulta';

const papel = vi.hoisted(() => ({ role: 'member' as string | null }));
vi.mock('@/contexts/project-role-context', () => ({
    useProjectRole: () => ({
        role: papel.role,
        loading: false,
        can: (acao: string) => acao === 'write' && papel.role !== null && papel.role !== 'viewer',
    }),
}));
vi.mock('@/services/agentExecutions', () => ({
    advanceAgentExecution: vi.fn(async () => ({})), rollbackAgentExecution: vi.fn(async () => ({})),
    createExecutionOverrideDecision: vi.fn(async () => ({ decision_id: 'd', execution_revision: 4 })),
    syncAgentExecution: vi.fn(async () => ({})), updateAgentExecutionStatus: vi.fn(async () => ({})),
}));
vi.mock('@/services/plans', () => ({ approvePlan: vi.fn(async () => ({})), updatePlan: vi.fn(async () => ({})) }));
vi.mock('@/services/cards', () => ({ updateCard: vi.fn(async () => ({})) }));
vi.mock('@/services/testPlans', () => ({ updateTestPlan: vi.fn(async () => ({})) }));

import {
    advanceAgentExecution, createExecutionOverrideDecision, rollbackAgentExecution, syncAgentExecution,
    updateAgentExecutionStatus,
} from '@/services/agentExecutions';
import { approvePlan, updatePlan } from '@/services/plans';
import { updateCard } from '@/services/cards';
import { updateTestPlan } from '@/services/testPlans';
import { acoesPermitidas, useAcoesDoNo } from './useAcoesDoNo';

const NO = { id: 'no', lock_version: 3, root_id: 'raiz' };

function montar() {
    const cliente = novoClienteDeTeste();
    const invalidar = vi.spyOn(cliente, 'invalidateQueries');
    const wrapper = ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={cliente}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(() => useAcoesDoNo(NO), { wrapper });
    const chavesInvalidadas = () => invalidar.mock.calls.map(([f]) => f?.queryKey);
    return { result, chavesInvalidadas };
}

beforeEach(() => { papel.role = 'member'; });

describe('useAcoesDoNo — papel', () => {
    it('viewer não tem ação nenhuma', () => {
        papel.role = 'viewer';
        const { result } = montar();
        expect(result.current.podeAgir).toBe(false);
        expect(acoesPermitidas('viewer', false).size).toBe(0);
    });

    it('member age, mas sem rollback nem override', () => {
        const { result } = montar();
        expect(result.current.pode('avancar')).toBe(true);
        expect(result.current.pode('aprovarPlano')).toBe(true);
        expect(result.current.pode('rollback')).toBe(false);
        expect(result.current.pode('override')).toBe(false);
        expect(result.current.ehAdmin).toBe(false);
    });

    it('admin também faz rollback e override', () => {
        papel.role = 'admin';
        const { result } = montar();
        expect(result.current.pode('rollback') && result.current.pode('override')).toBe(true);
        expect(result.current.ehAdmin).toBe(true);
    });

    it('a ação recusada pelo papel não chama o serviço', async () => {
        const { result } = montar();
        await expect(result.current.acoes.rollback('micro_planning')).rejects.toThrow(/não permitida/);
        expect(rollbackAgentExecution).not.toHaveBeenCalled();
    });
});

describe('useAcoesDoNo — as mesmas funções de serviço do Cockpit atual', () => {
    it('avançar chama advanceAgentExecution e invalida resumo, aba, raiz (árvore e rótulo) e snapshot', async () => {
        const { result, chavesInvalidadas } = montar();
        await act(() => result.current.acoes.avancar());
        expect(advanceAgentExecution).toHaveBeenCalledWith('no', undefined, undefined, undefined, false, 3);
        expect(chavesInvalidadas()).toEqual([
            ['execucao', 'no', 'resumo'], ['execucao', 'no', 'aba', 'no'],
            ['raiz', 'raiz'], ['execucao', 'no', 'snapshot'],
        ]);
    });

    it('aprovar o plano chama approvePlan com a revisão vista', async () => {
        const { result, chavesInvalidadas } = montar();
        await act(() => result.current.acoes.aprovarPlano({ id: 'pl', content_revision: 2 }));
        expect(approvePlan).toHaveBeenCalledWith('pl', 2, 'cockpit:reapproval-confirmed');
        expect(chavesInvalidadas()).toEqual([['execucao', 'no', 'resumo'], ['execucao', 'no', 'aba', 'plano']]);
    });

    it('mudar status e pedir ajuste seguem o caminho de updatePlanStatus', async () => {
        const { result } = montar();
        await act(() => result.current.acoes.mudarStatusDoPlano({ id: 'pl', content_revision: 2 }, 'approved'));
        expect(approvePlan).toHaveBeenCalledWith('pl', 2);
        await act(() => result.current.acoes.pedirAjusteNoPlano({ id: 'pl', content_revision: 2, approved_content_hash: 'h' }));
        expect(updatePlan).toHaveBeenCalledWith('pl', { status: 'draft', expected_content_revision: 2 });
    });

    it('validar BDD e aprovar cenário chamam updateCard como handleApproveBDD e handleToggleScenario', async () => {
        const { result } = montar();
        const card: any = { id: 'c', bdd_scenarios: [{ title: 'a', validated: false }] };
        await act(() => result.current.acoes.validarBdd(card));
        expect(updateCard).toHaveBeenCalledWith('c', { bdd_validated: true, bdd_scenarios: [{ title: 'a', validated: true }] });
        await act(() => result.current.acoes.aprovarCenario(card, 0, card.bdd_scenarios[0]));
        expect(updateCard).toHaveBeenLastCalledWith('c', { bdd_scenarios: [{ title: 'a', validated: true }], bdd_validated: true });
    });

    it('registrar resultado, contexto e entrada executada usam as rotas que já existem', async () => {
        const { result } = montar();
        await act(() => result.current.acoes.registrarResultadoDeTestPlan('tp', 'passed'));
        expect(updateTestPlan).toHaveBeenCalledWith('tp', { status: 'passed' });
        await act(() => result.current.acoes.salvarContexto({ missionContext: 'foco' }));
        expect(syncAgentExecution).toHaveBeenCalledWith('no', 'foco', undefined, undefined, undefined, 3);
        await act(() => result.current.acoes.marcarEntradaExecutada());
        expect(updateAgentExecutionStatus).toHaveBeenCalledWith('no', 'in_progress', 3);
    });

    it('override num ponto só: decisão com motivo e avanço com ela; motivo vazio é recusado', async () => {
        papel.role = 'admin';
        const { result } = montar();
        await expect(result.current.acoes.override(['ci_passed'], '  ')).rejects.toThrow(/motivo/);
        expect(createExecutionOverrideDecision).not.toHaveBeenCalled();
        await act(() => result.current.acoes.override(['ci_passed'], 'CI fora do ar'));
        expect(createExecutionOverrideDecision).toHaveBeenCalledWith('no', 'CI fora do ar', ['ci_passed']);
        expect(advanceAgentExecution).toHaveBeenLastCalledWith('no', undefined, undefined, undefined, true, 4, 'd', ['ci_passed']);
    });
});
