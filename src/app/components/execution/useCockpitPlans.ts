import { useSessaoDoNo } from '@/app/components/cockpit/sessao/useSessaoDoNo';
import { useState } from 'react';
import { approvePlan, updatePlan, deletePlan } from '@/services/plans';
import type { AgentTaskExecution } from '@/services/types';

export const useCockpitPlans = (
    execution: AgentTaskExecution | null,
    setExecution: React.Dispatch<React.SetStateAction<AgentTaskExecution | null>>,
    isSequential: boolean,
    currentPlan: any
) => {
    const sessao=useSessaoDoNo();
    // Plan Editing States
    const [isEditingPlan, setIsEditingPlan] = useState(false);
    const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
    const [planContent, setPlanContent] = useState('');
    const [planTitle, setPlanTitle] = useState('');
    const [isSavingPlan, setIsSavingPlan] = useState(false);

    const isPlanWaiting = (plan: any) => {
        if (!isSequential || !currentPlan) return false;
        const planOrder = plan.execution_order;
        const currentOrder = currentPlan?.execution_order;
        if (planOrder === undefined || planOrder === null) return false;
        if (currentOrder === undefined || currentOrder === null) return false;
        return planOrder > currentOrder && ['selected', 'approved', 'draft'].includes(plan.status);
    };

    const handleEditPlan = (plan: any) => {
        setEditingPlanId(plan.id);
        setPlanTitle(plan.title);
        setPlanContent(plan.content || '');
        setIsEditingPlan(true);
    };

    const handleSavePlan = async () => {
        if (!editingPlanId) return;
        const abrirSessao=sessao.capturarEscrita(execution?.id ?? "");
        setIsSavingPlan(true);
        try {
            const current = (execution?.context_data?.plans || []).find(
                (plan: any) => plan.id === editingPlanId
            );
            const saved = await updatePlan(editingPlanId, {
                title: planTitle,
                content: planContent,
                expected_content_revision: current?.content_revision,
            });

            await abrirSessao();
            if (execution && execution.context_data?.plans) {
                const updatedPlans = execution.context_data.plans.map((p: any) =>
                    p.id === editingPlanId ? { ...p, ...saved } : p
                );
                setExecution({
                    ...execution,
                    context_data: {
                        ...execution.context_data,
                        plans: updatedPlans
                    }
                });
            }

            setIsEditingPlan(false);
            setEditingPlanId(null);
        } catch (err) {
            console.error('Failed to save plan:', err);
            alert('Failed to save plan. Please check server logs.');
        } finally {
            setIsSavingPlan(false);
        }
    };

    const updatePlanStatus = async (planId: string, status: string, getAgentExecutionFn: (id: string) => Promise<AgentTaskExecution>) => {
        if (!execution) return;
        const abrirSessao=sessao.capturarEscrita(execution.id);
        try {
            const plan = (execution.context_data?.plans || []).find(
                (candidate: any) => candidate.id === planId
            );
            if (status === 'approved' && !plan?.approved_content_hash) {
                if (typeof plan?.content_revision !== 'number') {
                    throw new Error('Plan revision is missing; reload before approving.');
                }
                await approvePlan(planId, plan.content_revision);
            } else {
                await updatePlan(planId, {
                    status,
                    expected_content_revision: plan?.content_revision,
                });
            }
            await abrirSessao();
            const updated = await getAgentExecutionFn(execution.id);
            setExecution(updated);
        } catch (err) {
            console.error('Failed to update plan status:', err);
        }
    };

    // Reaprovacao sem mexer no status: o plano segue selected/in_execution.
    // A revisao enviada e a que o PO viu; se o conteudo mudou no meio, a API
    // recusa com 409 em vez de aprovar o que ele nao leu.
    const reapprovePlan = async (planId: string, getAgentExecutionFn: (id: string) => Promise<AgentTaskExecution>) => {
        if (!execution) return;
        const abrirSessao=sessao.capturarEscrita(execution.id);
        const plan = (execution.context_data?.plans || []).find(
            (candidate: any) => candidate.id === planId
        );
        if (typeof plan?.content_revision !== 'number') {
            alert('Revisao do plano ausente; recarregue antes de aprovar.');
            return;
        }
        if (!confirm(`Aprovar a revisao ${plan.content_revision} de "${plan.title}"? O plano continua no status atual.`)) return;
        try {
            await approvePlan(planId, plan.content_revision, 'cockpit:reapproval-confirmed');
            await abrirSessao();
        } catch (err: any) {
            const detail = err?.response?.data?.detail;
            alert(err?.response?.status === 409
                ? `O plano mudou durante a aprovacao (${detail}). Revise o conteudo atual e aprove de novo.`
                : `Falha ao aprovar: ${detail || err?.message || err}`);
        }
        const updated = await getAgentExecutionFn(execution.id);
        setExecution(updated);
    };

    const deletePlanFn = async (planId: string, getAgentExecutionFn: (id: string) => Promise<AgentTaskExecution>) => {
        if (!execution) return;
        const abrirSessao=sessao.capturarEscrita(execution.id);
        if (!confirm('Are you sure you want to delete this plan?')) return;
        try {
            await deletePlan(planId);
            await abrirSessao();
            const updated = await getAgentExecutionFn(execution.id);
            setExecution(updated);
        } catch (err) {
            console.error('Failed to delete plan:', err);
        }
    };

    return {
        isEditingPlan,
        setIsEditingPlan,
        editingPlanId,
        setEditingPlanId,
        planContent,
        setPlanContent,
        planTitle,
        setPlanTitle,
        isSavingPlan,
        isPlanWaiting,
        handleEditPlan,
        handleSavePlan,
        updatePlanStatus,
        reapprovePlan,
        deletePlanFn,
    };
};
