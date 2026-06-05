import { useState } from 'react';
import { updatePlan, deletePlan } from '@/services/plans';
import type { AgentTaskExecution } from '@/services/types';

export const useCockpitPlans = (
    execution: AgentTaskExecution | null,
    setExecution: React.Dispatch<React.SetStateAction<AgentTaskExecution | null>>,
    isSequential: boolean,
    currentPlan: any
) => {
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
        setIsSavingPlan(true);
        try {
            await updatePlan(editingPlanId, {
                title: planTitle,
                content: planContent
            });

            if (execution && execution.context_data?.plans) {
                const updatedPlans = execution.context_data.plans.map((p: any) =>
                    p.id === editingPlanId ? { ...p, title: planTitle, content: planContent } : p
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
        try {
            await updatePlan(planId, { status });
            const updated = await getAgentExecutionFn(execution.id);
            setExecution(updated);
        } catch (err) {
            console.error('Failed to update plan status:', err);
        }
    };

    const deletePlanFn = async (planId: string, getAgentExecutionFn: (id: string) => Promise<AgentTaskExecution>) => {
        if (!execution) return;
        if (!confirm('Are you sure you want to delete this plan?')) return;
        try {
            await deletePlan(planId);
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
        deletePlanFn,
    };
};
