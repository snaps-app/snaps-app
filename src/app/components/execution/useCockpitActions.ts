import {
    advanceAgentExecution,
    createExecutionOverrideDecision,
    rollbackAgentExecution,
    syncAgentExecution,
} from '@/services/agentExecutions';
import { getCard, updateCard } from '@/services/cards';
import { getCardsBySprint, getSprints } from '@/services/sprints';
import type { AgentTaskExecution, Card } from '@/services/types';

interface UseCockpitActionsProps {
    projectId?: string;
    executionId?: string;
    execution: AgentTaskExecution | null;
    missionInstructions: string;
    selectedDocIds: string[];
    selectedDecisionIds: string[];
    manualOverrides: Record<string, boolean>;
    setExecution: (exec: any) => void;
    setSelectedTestPlanIds: (ids: string[]) => void;
    setIsSavingTestPlanContext: (v: boolean) => void;
    setIsRefreshing: (v: boolean) => void;
    setIsAdvancing: (v: boolean) => void;
    setIsRollingBack: (v: boolean) => void;
    setMissionInstructions: (v: string) => void;
    setManualOverrides: (v: any) => void;
    setIsTimeTrackingModalOpen: (v: boolean) => void;
    setSprints: (sprints: any[]) => void;
    setCards: React.Dispatch<React.SetStateAction<Card[]>>;
    fetchSisters: () => Promise<any[]>;
    fetchTroubleReport: (sprintIds: string[]) => Promise<void>;
    loadExecutionTroubleReport: (execId: string, tree: any[]) => Promise<void>;
    navigate: (path: string) => void;
}

export const useCockpitActions = ({
    projectId,
    executionId,
    execution,
    missionInstructions,
    selectedDocIds,
    selectedDecisionIds,
    manualOverrides,
    setExecution,
    setSelectedTestPlanIds,
    setIsSavingTestPlanContext,
    setIsRefreshing,
    setIsAdvancing,
    setIsRollingBack,
    setMissionInstructions,
    setManualOverrides,
    setIsTimeTrackingModalOpen,
    setSprints,
    setCards,
    fetchSisters,
    fetchTroubleReport,
    loadExecutionTroubleReport,
    navigate
}: UseCockpitActionsProps) => {

    const handleSaveTestPlanContext = async (ids: string[]) => {
        if (!executionId) return;
        setIsSavingTestPlanContext(true);
        try {
            const updated = await syncAgentExecution(
                executionId, undefined, undefined, undefined, ids, execution?.lock_version,
            );
            setExecution(updated);
            setSelectedTestPlanIds(ids);
        } catch (err) {
            console.error('Failed to save test plan context:', err);
        } finally {
            setIsSavingTestPlanContext(false);
        }
    };

    const handleRefresh = async () => {
        if (!executionId) return;
        setIsRefreshing(true);
        try {
            const updated = await syncAgentExecution(
                executionId, missionInstructions, selectedDocIds, selectedDecisionIds,
                undefined, execution?.lock_version,
            );
            setExecution(updated);
            const tree = await fetchSisters();

            const allCards: any[] = [];
            if (updated.sprint_ids && updated.sprint_ids.length > 0) {
                const sprintData = await getSprints(projectId!);
                setSprints(sprintData.filter(s => updated.sprint_ids.includes(s.id)));

                for (const sId of updated.sprint_ids) {
                    try {
                        const sprintCards = await getCardsBySprint(sId);
                        allCards.push(...(sprintCards || []));
                    } catch (err) {
                        console.error(`Failed to refresh cards for sprint ${sId}:`, err);
                    }
                }
                await fetchTroubleReport(updated.sprint_ids);
            }
            if (updated.card_ids && updated.card_ids.length > 0) {
                const existing = new Set(allCards.map(c => c.id));
                for (const cId of updated.card_ids) {
                    if (existing.has(cId)) continue;
                    try {
                        const card = await getCard(cId);
                        if (card) allCards.push(card);
                    } catch (err) {
                        console.error(`Failed to refresh scoped card ${cId}:`, err);
                    }
                }
            }
            if ((updated.sprint_ids?.length || 0) > 0 || (updated.card_ids?.length || 0) > 0) {
                setCards(allCards);
            }
            await loadExecutionTroubleReport(executionId, tree);
        } catch (error) {
            console.error('Failed to sync state:', error);
        } finally {
            setIsRefreshing(false);
        }
    };

    const handleAdvance = async () => {
        if (!executionId) return;
        setIsAdvancing(true);
        try {
            const overrideConditions = Object.entries(manualOverrides)
                .filter(([, selected]) => selected)
                .map(([condition]) => condition);
            let decisionId: string | undefined;
            let expectedRevision = execution?.lock_version;

            if (overrideConditions.length > 0) {
                const reason = window.prompt(
                    `Explain why these requirements may be overridden: ${overrideConditions.join(', ')}`,
                );
                if (!reason?.trim()) {
                    alert('Override cancelled: a human reason is required.');
                    return;
                }
                const decision = await createExecutionOverrideDecision(
                    executionId, reason.trim(), overrideConditions,
                );
                decisionId = decision.decision_id;
                expectedRevision = decision.execution_revision;
            }

            const updated = await advanceAgentExecution(
                executionId,
                missionInstructions,
                selectedDocIds,
                selectedDecisionIds,
                overrideConditions.length > 0,
                expectedRevision,
                decisionId,
                overrideConditions,
            );
            setExecution(updated);
            setMissionInstructions('');
            setManualOverrides({});
            fetchSisters();

            if (updated.id !== executionId) {
                navigate(`/project/${projectId}/execution/${updated.id}`);
            } else if (updated.status === 'done') {
                setIsTimeTrackingModalOpen(true);
            }
        } catch (error: any) {
            console.error('Failed to advance phase:', error);
            const errorMsg = error.response?.data?.detail || 'Failed to advance phase. Please check requirements.';
            alert(errorMsg);
        } finally {
            setIsAdvancing(false);
        }
    };

    const handleRollback = async (targetPhase: string = 'micro_planning') => {
        if (!executionId) return;
        if (!confirm(`Are you sure you want to rollback to ${targetPhase}?`)) return;

        setIsRollingBack(true);
        try {
            const updated = await rollbackAgentExecution(
                executionId, targetPhase, execution?.lock_version,
            );
            setExecution(updated);
            alert(`Execution rolled back to ${targetPhase}. Prompt has been regenerated.`);
            if (updated.id !== executionId) {
                navigate(`/project/${projectId}/execution/${updated.id}`);
            }
        } catch (error: any) {
            console.error('Failed to rollback phase:', error);
            alert(error.response?.data?.detail || 'Failed to rollback phase.');
        } finally {
            setIsRollingBack(false);
        }
    };

    const handleApproveBDD = async (card: Card) => {
        try {
            const updatedScenarios = (card.bdd_scenarios || []).map((s: any) => ({ ...s, validated: true }));
            await updateCard(card.id, {
                bdd_validated: true,
                bdd_scenarios: updatedScenarios
            });
            setCards(prev => prev.map(c => c.id === card.id ? { ...c, bdd_validated: true, bdd_scenarios: updatedScenarios } : c));
            await handleRefresh();
        } catch (err) {
            console.error('Failed to approve BDD:', err);
        }
    };

    const handleToggleScenario = async (card: Card, idx: number, scenario: any) => {
        try {
            const updatedScenarios = [...(card.bdd_scenarios || [])];
            updatedScenarios[idx] = { ...scenario, validated: !scenario.validated };
            const allValidated = updatedScenarios.every((s: any) => s.validated);

            await updateCard(card.id, {
                bdd_scenarios: updatedScenarios,
                bdd_validated: allValidated
            });

            setCards(prev => prev.map(c => c.id === card.id ? {
                ...c,
                bdd_scenarios: updatedScenarios,
                bdd_validated: allValidated
            } : c));
        } catch (err) {
            console.error('Failed to toggle scenario validation:', err);
        }
    };

    return {
        handleSaveTestPlanContext,
        handleRefresh,
        handleAdvance,
        handleRollback,
        handleApproveBDD,
        handleToggleScenario,
    };
};
