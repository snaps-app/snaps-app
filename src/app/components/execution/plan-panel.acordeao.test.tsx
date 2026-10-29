/**
 * Planos da aba Plano em acordeão (cenário #31 do card dac9dcef). Em produção
 * o nó concluído abria com todos os planos fechados e só o texto do título,
 * sem nenhuma marca, abria o plano: o PO não tinha como ver o conteúdo.
 */
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import type { PendenciaDoNo } from '@/services/resumoDoNo';
import type { AgentTaskExecution } from '@/services/types';
import { PlanPanel } from './plan-panel';

const plano = (id: string, ordem: number, status = 'draft') => ({
    id, title: id.toUpperCase(), status, content: `conteúdo do ${id}`, content_revision: 1, execution_order: ordem,
});
const PLANOS = [plano('tp1', 1), plano('tp2', 2), plano('tp3', 3)];

const execucao = (planId: string | null = null): AgentTaskExecution => ({
    id: 'exec-1', project_id: 'p1', status: 'completed', phase: 'ci_gate',
    sprint_ids: [], card_ids: [], agent_name: '@ci', advance_conditions: {},
    lock_version: 1, created_at: '', updated_at: '', plan_id: planId,
    context_data: { plans: PLANOS },
} as AgentTaskExecution);

const montar = (opcoes: { planId?: string | null; pendencias?: PendenciaDoNo[]; somenteLeitura?: boolean } = {}) =>
    render(<PlanPanel
        execution={execucao(opcoes.planId ?? null)} sprints={[]} isSequential={false} currentPlan={null}
        isPlanWaiting={() => false} isEditingPlan={false} setIsEditingPlan={vi.fn()}
        editingPlanId={null} setEditingPlanId={vi.fn()} planContent="" setPlanContent={vi.fn()}
        planTitle="" setPlanTitle={vi.fn()} isSavingPlan={false} handleSavePlan={vi.fn()}
        handleEditPlan={vi.fn()} handleCopy={vi.fn()} copiedId={null}
        handleOpenPeerReview={vi.fn()} updatePlanStatus={vi.fn()} deletePlanFn={vi.fn()}
        somenteLeitura={opcoes.somenteLeitura} pendencias={opcoes.pendencias ?? []} />);

const abertos = () => PLANOS.filter((p) => screen.queryByText(p.content)).map((p) => p.id);

describe('PlanPanel em acordeão', () => {
    it('nó concluído sem pendência abre o plano ativo; cada plano tem a seta para abrir', () => {
        montar({ planId: 'tp2', somenteLeitura: true });
        expect(abertos()).toEqual(['tp2']);
        expect(screen.getByRole('button', { name: 'Abrir plano TP1' })).toHaveAttribute('aria-expanded', 'false');
        expect(screen.getByRole('button', { name: 'Fechar plano TP2' })).toHaveAttribute('aria-expanded', 'true');
    });

    it('sem plano ativo nem pendência, abre o primeiro', () => {
        montar();
        expect(abertos()).toEqual(['tp1']);
    });

    it('o plano com aprovação pendente para mim vem aberto, antes do ativo', () => {
        montar({
            planId: 'tp1',
            pendencias: [{ tipo: 'plano_aguardando_aprovacao', aba: 'plano', recurso_id: 'tp3', desde: 'd', acao: 'Aprovar' } as PendenciaDoNo],
        });
        expect(abertos()).toEqual(['tp3']);
    });

    it('abrir outro plano fecha o anterior; clicar de novo fecha o aberto', () => {
        montar({ planId: 'tp1' });
        fireEvent.click(screen.getByRole('button', { name: 'Abrir plano TP3' }));
        expect(abertos()).toEqual(['tp3']);
        fireEvent.click(screen.getByRole('button', { name: 'TP3' }));
        expect(abertos()).toEqual([]);
    });

    it('o cabeçalho inteiro abre o plano, mas os botões dele não abrem nem fecham', () => {
        const atualizar = vi.fn();
        render(<PlanPanel
            execution={execucao('tp1')} sprints={[]} isSequential={false} currentPlan={null}
            isPlanWaiting={() => false} isEditingPlan={false} setIsEditingPlan={vi.fn()}
            editingPlanId={null} setEditingPlanId={vi.fn()} planContent="" setPlanContent={vi.fn()}
            planTitle="" setPlanTitle={vi.fn()} isSavingPlan={false} handleSavePlan={vi.fn()}
            handleEditPlan={vi.fn()} handleCopy={vi.fn()} copiedId={null}
            handleOpenPeerReview={vi.fn()} updatePlanStatus={atualizar} deletePlanFn={vi.fn()} pendencias={[]} />);
        fireEvent.click(screen.getByTestId('cabecalho-plano-tp2'));
        expect(abertos()).toEqual(['tp2']);
        fireEvent.click(screen.getAllByRole('button', { name: /Approve Plan/ })[2]);
        expect(atualizar).toHaveBeenCalledWith('tp3', 'approved');
        expect(abertos()).toEqual(['tp2']);
    });
});
