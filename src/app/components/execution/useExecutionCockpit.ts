import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { advanceAgentExecution, getAgentExecution, getAgentExecutionTree, rollbackAgentExecution, syncAgentExecution } from '@/services/agentExecutions';
import { getProjectBoards } from '@/services/boards';
import { getCard, updateCard } from '@/services/cards';
import { getEpics } from '@/services/epics';
import { getAgents } from '@/services/governance';
import { getGithubConfig, getProject } from '@/services/projects';
import { getCardsBySprint, getSprints } from '@/services/sprints';
import { getExecutionTroubleReport, getTestPlans, getTroubleReport } from '@/services/testPlans';
import { getWorkflowTemplates } from '@/services/workflowTemplates';
import { getSnaps } from '@/services/snaps';

import type { AgentTaskExecution, Card, Epic, ProjectDetail, Snap, Sprint, WorkflowTemplate } from '@/services/types';
import { useCockpitWalkthroughs } from '@/app/components/execution/useCockpitWalkthroughs';
import { useCockpitDocs } from '@/app/components/execution/useCockpitDocs';
import { useCockpitPlans } from '@/app/components/execution/useCockpitPlans';

export const useExecutionCockpit = () => {
    const { projectId, executionId } = useParams<{ projectId: string; executionId: string }>();
    const navigate = useNavigate();
    const [execution, setExecution] = useState<AgentTaskExecution | null>(null);
    const [project, setProject] = useState<ProjectDetail | null>(null);
    const [cards, setCards] = useState<Card[]>([]);
    const [epics, setEpics] = useState<Epic[]>([]);
    const [sprints, setSprints] = useState<Sprint[]>([]);
    const [repoNames, setRepoNames] = useState<string[]>([]);
    const [columns, setColumns] = useState<{ id: string; title: string }[]>([]);
    const [agentInstructions, setAgentInstructions] = useState<string | null>(null);
    const [isAgentModalOpen, setIsAgentModalOpen] = useState(false);
    const [isTimeTrackingModalOpen, setIsTimeTrackingModalOpen] = useState(false);
    const [viewMode, setViewMode] = useState<'cockpit' | 'branches'>('cockpit');
    const [selectedCard, setSelectedCard] = useState<Card | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'plan' | 'cards' | 'bdd' | 'trouble' | 'retro'>('plan');
    const [troubleReport, setTroubleReport] = useState<any>(null);
    const [selectedTestPlanIds, setSelectedTestPlanIds] = useState<string[]>([]);
    const [isSavingTestPlanContext, setIsSavingTestPlanContext] = useState(false);
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [entryReviewed, setEntryReviewed] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isAdvancing, setIsAdvancing] = useState(false);
    // Manual override (bypass): when the user hand-validates Phase Requirements,
    // advancing forces past ALL automated advance_conditions via the backend `force` flag.
    const [manualOverrides, setManualOverrides] = useState<Record<string, boolean>>({});
    const setManualOverride = (key: string, value: boolean) =>
        setManualOverrides(prev => ({ ...prev, [key]: value }));
    const [isRollingBack, setIsRollingBack] = useState(false);
    const [missionInstructions, setMissionInstructions] = useState('');

    // Peer Review Report States
    const [isPeerReviewModalOpen, setIsPeerReviewModalOpen] = useState(false);
    const [peerReviewSnap, setPeerReviewSnap] = useState<Snap | null>(null);
    const [isLoadingPeerReview, setIsLoadingPeerReview] = useState(false);

    // Agent Tools & Skills State
    const [isToolsModalOpen, setIsToolsModalOpen] = useState(false);

    // Tasks Modal State
    const [isTasksModalOpen, setIsTasksModalOpen] = useState(false);

    const [sisterExecutions, setSisterExecutions] = useState<AgentTaskExecution[]>([]);
    const [executionTree, setExecutionTree] = useState<AgentTaskExecution[]>([]);
    const [templates, setTemplates] = useState<WorkflowTemplate[]>([]);

    const activeTemplate = templates.find(t => t.id === execution?.workflow_template_id);
    const isSequential = activeTemplate?.phases?.find(p => p.key === 'execution')?.execution_mode === 'sequential';
    const currentPlan = execution ? (execution.context_data?.plans || []).find((p: any) => p.id === execution.plan_id) : null;

    // Sub-hooks delegation
    const {
        isWalkthroughModalOpen,
        setIsWalkthroughModalOpen,
        walkthroughs,
        setWalkthroughs,
        isLoadingWalkthroughs,
        selectedWalkthrough,
        setSelectedWalkthrough,
        isEditingWalkthrough,
        setIsEditingWalkthrough,
        walkthroughContent,
        setWalkthroughContent,
        isSavingWalkthrough,
        handleOpenWalkthroughs,
        handleSaveWalkthrough
    } = useCockpitWalkthroughs(projectId, execution);

    const {
        isDocsModalOpen,
        setIsDocsModalOpen,
        governanceDocs,
        setGovernanceDocs,
        isLoadingDocs,
        selectedDocIds,
        setSelectedDocIds,
        docsModalTab,
        setDocsModalTab,
        decisions,
        setDecisions,
        selectedDecisionIds,
        setSelectedDecisionIds,
        viewDoc,
        setViewDoc,
        isEditingDoc,
        setIsEditingDoc,
        isSavingDoc,
        setIsSavingDoc,
        handleOpenDocs,
        toggleDecisionSelection,
        toggleDocSelection
    } = useCockpitDocs(projectId, execution);

    const {
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
        updatePlanStatus: updatePlanStatusBase,
        deletePlanFn: deletePlanFnBase
    } = useCockpitPlans(execution, setExecution, isSequential, currentPlan);

    const updatePlanStatus = (planId: string, status: string) => updatePlanStatusBase(planId, status, getAgentExecution);
    const deletePlanFn = (planId: string) => deletePlanFnBase(planId, getAgentExecution);

    const handleCopy = (id: string, text: string) => {
        navigator.clipboard.writeText(text);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const fetchTroubleReport = async (sprintIds: string[]) => {
        if (!projectId || !sprintIds || sprintIds.length === 0) return;
        try {
            const report = await getTroubleReport(projectId, sprintIds[0]);
            setTroubleReport(report);
        } catch (err) {
            console.error('Failed to fetch trouble report:', err);
        }
    };

    // Resolve o trouble report / test_plans pela agent-task-execution, agregando
    // TODAS as executions do branching (a árvore). Cobre execuções de bug/RCA sem sprint.
    const loadExecutionTroubleReport = async (execId: string, tree: AgentTaskExecution[]) => {
        if (!projectId || !execId) return;
        try {
            // Report base resolvido por execution (test_plans por execution_id OU sprint + failed_bdd_cards)
            let report: any = null;
            try {
                report = await getExecutionTroubleReport(execId);
            } catch {
                /* execução sem report base (ex.: sem sprint e sem cards) — segue com agregação */
            }

            // Agrega test_plans de cada execution do branching (current + árvore inteira)
            const ids = Array.from(new Set([execId, ...tree.map(e => e.id)]));
            const lists = await Promise.all(
                ids.map(id => getTestPlans(projectId, undefined, id).catch(() => []))
            );

            const byId = new Map<string, any>();
            for (const p of (report?.test_plans ?? [])) byId.set(p.id, p);
            for (const list of lists) for (const p of list) if (!byId.has(p.id)) byId.set(p.id, p);
            const mergedPlans = Array.from(byId.values());

            if (!report && mergedPlans.length === 0) {
                setTroubleReport(null);
                return;
            }

            setTroubleReport({
                total_cards: 0,
                failed_bdd_cards: [],
                sprint_name: 'Execução (test plans)',
                ...(report ?? {}),
                test_plans: mergedPlans,
            });
        } catch (err) {
            console.error('Failed to load execution trouble report:', err);
        }
    };

    const handleOpenPeerReview = async () => {
        if (!projectId || !execution) return;
        setIsPeerReviewModalOpen(true);
        setIsLoadingPeerReview(true);
        try {
            const snaps = await getSnaps(projectId, 0, 50, undefined, execution.id);
            const reviewSnap = snaps.find(s =>
                s.name.toLowerCase().includes('peer review report') ||
                s.name.toLowerCase().includes('peer review')
            );
            setPeerReviewSnap(reviewSnap || null);
        } catch (err) {
            console.error('Failed to fetch peer review report:', err);
        } finally {
            setIsLoadingPeerReview(false);
        }
    };

    const fetchSisters = async (): Promise<AgentTaskExecution[]> => {
        if (!projectId || !executionId) return [];
        try {
            const tree = await getAgentExecutionTree(executionId);
            setExecutionTree(tree);

            const currentEx = tree.find(e => e.id === executionId);
            if (currentEx) {
                setSisterExecutions(tree.filter(ex =>
                    ex.id !== executionId &&
                    ex.parent_id === currentEx.parent_id
                ));
            } else {
                setSisterExecutions([]);
            }
            return tree;
        } catch (err) {
            console.error('Failed to fetch sister executions:', err);
            return [];
        }
    };

    useEffect(() => {
        const fetchExecution = async () => {
            try {
                if (!executionId) return;

                const data = await getAgentExecution(executionId);
                setExecution(data);
                const tree = await fetchSisters();

                try {
                    const [globalAgents, projectAgents, projectEpics, projectSprints, projectData, templatesData] = await Promise.all([
                        getAgents(),
                        projectId ? getAgents(projectId) : Promise.resolve([]),
                        projectId ? getEpics(projectId) : Promise.resolve([]),
                        projectId ? getSprints(projectId) : Promise.resolve([]),
                        projectId ? getProject(projectId) : Promise.resolve(null),
                        getWorkflowTemplates()
                    ]);

                    const allAgents = [...globalAgents, ...projectAgents];
                    setEpics(projectEpics);
                    setSprints(projectSprints);
                    setProject(projectData);
                    setTemplates(templatesData);

                    try {
                        const ghConfig = await getGithubConfig(projectId!);
                        if (ghConfig?.repo_names) {
                            setRepoNames(ghConfig.repo_names.split(',').map((r: string) => r.trim()).filter(Boolean));
                        }
                    } catch (e) {
                        console.error('Failed to fetch github config:', e);
                    }

                    try {
                        const boards = await getProjectBoards(projectId!);
                        if (boards && boards.length > 0) {
                            const mainBoard = boards.find(b => b.board_type === 'roadmap') || boards[0];
                            setColumns(mainBoard.columns || []);
                        } else {
                            setColumns([
                                { id: 'todo', title: 'To Do' },
                                { id: 'inprogress', title: 'In Progress' },
                                { id: 'review', title: 'Review' },
                                { id: 'done', title: 'Done' }
                            ]);
                        }
                    } catch (e) {
                        console.error('Failed to fetch boards:', e);
                    }

                    const cleanName = data.agent_name.startsWith('@') ? data.agent_name.slice(1) : data.agent_name;
                    const agent = allAgents.find(a => a.name === data.agent_name || a.name === cleanName || `@${a.name}` === data.agent_name);
                    if (agent) {
                        setAgentInstructions(agent.instructions);
                    }
                } catch (err) {
                    console.error('Failed to fetch agents:', err);
                }

                const allCards: Card[] = [];
                if (data.sprint_ids && data.sprint_ids.length > 0) {
                    for (const sId of data.sprint_ids) {
                        try {
                            const sprintCards = await getCardsBySprint(sId);
                            allCards.push(...(sprintCards || []));
                        } catch (err) {
                            console.error(`Failed to fetch cards for sprint ${sId}:`, err);
                        }
                    }
                }
                if (data.card_ids && data.card_ids.length > 0) {
                    const existing = new Set(allCards.map(c => c.id));
                    for (const cId of data.card_ids) {
                        if (existing.has(cId)) continue;
                        try {
                            const card = await getCard(cId);
                            if (card) allCards.push(card);
                        } catch (err) {
                            console.error(`Failed to fetch scoped card ${cId}:`, err);
                        }
                    }
                }
                setCards(allCards);

                if (data.phase === 'micro_planning' || data.phase === 'plan_review') setActiveTab('plan');
                else if (data.phase === 'execution') setActiveTab('cards');
                else if (data.phase === 'assurance') setActiveTab('bdd');
                else if (data.phase === 'retro') setActiveTab('retro');

                // Test plans / trouble report resolvidos pela execution + árvore de branching
                // (cobre execuções de bug/RCA sem sprint, que antes não exibiam nada).
                await loadExecutionTroubleReport(executionId, tree);

                const savedIds = data.context_data?.selected_test_plan_ids;
                if (Array.isArray(savedIds)) setSelectedTestPlanIds(savedIds);

            } catch (error) {
                console.error('Failed to fetch execution:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchExecution();
    }, [executionId, projectId]);

    const handleSaveTestPlanContext = async (ids: string[]) => {
        if (!executionId) return;
        setIsSavingTestPlanContext(true);
        try {
            const updated = await syncAgentExecution(executionId, undefined, undefined, undefined, ids);
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
            const updated = await syncAgentExecution(executionId, missionInstructions, selectedDocIds, selectedDecisionIds);
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
            const force = Object.values(manualOverrides).some(Boolean);
            const updated = await advanceAgentExecution(executionId, missionInstructions, selectedDocIds, selectedDecisionIds, force);
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

            const refreshed = await getAgentExecution(executionId);
            setExecution(refreshed);
        } finally {
            setIsAdvancing(false);
        }
    };

    const handleRollback = async (targetPhase: string = 'micro_planning') => {
        if (!executionId) return;
        if (!confirm(`Are you sure you want to rollback to ${targetPhase}?`)) return;

        setIsRollingBack(true);
        try {
            const updated = await rollbackAgentExecution(executionId, targetPhase);
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
        projectId: projectId!,
        executionId,
        execution,
        setExecution,
        project,
        cards,
        setCards,
        epics,
        sprints,
        setSprints,
        repoNames,
        columns,
        agentInstructions,
        isAgentModalOpen,
        setIsAgentModalOpen,
        viewMode,
        setViewMode,
        selectedCard,
        setSelectedCard,
        isLoading,
        activeTab,
        setActiveTab,
        troubleReport,
        copiedId,
        entryReviewed,
        setEntryReviewed,
        isRefreshing,
        isAdvancing,
        isRollingBack,
        missionInstructions,
        setMissionInstructions,
        isWalkthroughModalOpen,
        setIsWalkthroughModalOpen,
        walkthroughs,
        isLoadingWalkthroughs,
        selectedWalkthrough,
        setSelectedWalkthrough,
        isEditingWalkthrough,
        setIsEditingWalkthrough,
        walkthroughContent,
        setWalkthroughContent,
        isSavingWalkthrough,
        isDocsModalOpen,
        setIsDocsModalOpen,
        governanceDocs,
        setGovernanceDocs,
        isLoadingDocs,
        selectedDocIds,
        setSelectedDocIds,
        docsModalTab,
        setDocsModalTab,
        decisions,
        setDecisions,
        selectedDecisionIds,
        setSelectedDecisionIds,
        viewDoc,
        setViewDoc,
        isEditingDoc,
        setIsEditingDoc,
        isSavingDoc,
        setIsSavingDoc,
        isPeerReviewModalOpen,
        setIsPeerReviewModalOpen,
        peerReviewSnap,
        isLoadingPeerReview,
        isToolsModalOpen,
        setIsToolsModalOpen,
        isTasksModalOpen,
        setIsTasksModalOpen,
        sisterExecutions,
        executionTree,
        templates,
        isSequential,
        currentPlan,
        isPlanWaiting,
        isEditingPlan,
        setIsEditingPlan,
        editingPlanId,
        setEditingPlanId,
        planContent,
        setPlanContent,
        planTitle,
        setPlanTitle,
        isSavingPlan,
        handleCopy,
        handleOpenDocs,
        toggleDecisionSelection,
        handleOpenPeerReview,
        toggleDocSelection,
        handleOpenWalkthroughs,
        handleSaveWalkthrough,
        handleEditPlan,
        handleSavePlan,
        selectedTestPlanIds,
        setSelectedTestPlanIds,
        isSavingTestPlanContext,
        handleSaveTestPlanContext,
        handleRefresh,
        handleAdvance,
        manualOverrides,
        setManualOverride,
        handleRollback,
        updatePlanStatus,
        deletePlanFn,
        handleApproveBDD,
        handleToggleScenario,
        isTimeTrackingModalOpen,
        setIsTimeTrackingModalOpen,
    };
};
