import { useState, useEffect } from 'react';
import { getAgentExecution } from '@/services/agentExecutions';
import { getProjectBoards } from '@/services/boards';
import { getCard } from '@/services/cards';
import { getEpics } from '@/services/epics';
import { getAgents } from '@/services/governance';
import { getGithubConfig, getProject } from '@/services/projects';
import { getCardsBySprint, getSprints } from '@/services/sprints';
import { getExecutionTroubleReport, getTestPlans, getTroubleReport } from '@/services/testPlans';
import { getWorkflowTemplates } from '@/services/workflowTemplates';
import { getSnaps } from '@/services/snaps';

import type { AgentTaskExecution, Card, Epic, ProjectDetail, Snap, Sprint, WorkflowTemplate } from '@/services/types';

export const useCockpitState = (
    projectId?: string,
    executionId?: string,
    fetchSisters?: () => Promise<AgentTaskExecution[]>
) => {
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
    const [isSessionManagerOpen, setIsSessionManagerOpen] = useState(false);
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
    const [isRollingBack, setIsRollingBack] = useState(false);
    const [manualOverrides, setManualOverrides] = useState<Record<string, boolean>>({});
    const setManualOverride = (key: string, value: boolean) =>
        setManualOverrides(prev => ({ ...prev, [key]: value }));
    const [missionInstructions, setMissionInstructions] = useState('');

    // Peer Review Report States
    const [isPeerReviewModalOpen, setIsPeerReviewModalOpen] = useState(false);
    const [peerReviewSnap, setPeerReviewSnap] = useState<Snap | null>(null);
    const [isLoadingPeerReview, setIsLoadingPeerReview] = useState(false);

    // Agent Tools & Skills State
    const [isToolsModalOpen, setIsToolsModalOpen] = useState(false);

    // Tasks Modal State
    const [isTasksModalOpen, setIsTasksModalOpen] = useState(false);

    const [templates, setTemplates] = useState<WorkflowTemplate[]>([]);

    const activeTemplate = templates.find(t => t.id === execution?.workflow_template_id);
    const isSequential = activeTemplate?.phases?.find(p => p.key === 'execution')?.execution_mode === 'sequential';
    const currentPlan = execution ? (execution.context_data?.plans || []).find((p: any) => p.id === execution.plan_id) : null;

    const fetchTroubleReport = async (sprintIds: string[]) => {
        if (!projectId || !sprintIds || sprintIds.length === 0) return;
        try {
            const report = await getTroubleReport(projectId, sprintIds[0]);
            setTroubleReport(report);
        } catch (err) {
            console.error('Failed to fetch trouble report:', err);
        }
    };

    const loadExecutionTroubleReport = async (execId: string, tree: AgentTaskExecution[]) => {
        if (!projectId || !execId) return;
        try {
            let report: any = null;
            try {
                report = await getExecutionTroubleReport(execId);
            } catch {
                /* execução sem report base */
            }

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

    useEffect(() => {
        const fetchExecution = async () => {
            try {
                if (!executionId) return;

                const data = await getAgentExecution(executionId);
                setExecution(data);
                const tree = fetchSisters ? await fetchSisters() : [];

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

    return {
        execution,
        setExecution,
        project,
        setProject,
        cards,
        setCards,
        epics,
        setEpics,
        sprints,
        setSprints,
        repoNames,
        columns,
        agentInstructions,
        isAgentModalOpen,
        setIsAgentModalOpen,
        isTimeTrackingModalOpen,
        setIsTimeTrackingModalOpen,
        isSessionManagerOpen,
        setIsSessionManagerOpen,
        viewMode,
        setViewMode,
        selectedCard,
        setSelectedCard,
        isLoading,
        activeTab,
        setActiveTab,
        troubleReport,
        selectedTestPlanIds,
        setSelectedTestPlanIds,
        isSavingTestPlanContext,
        setIsSavingTestPlanContext,
        copiedId,
        setCopiedId,
        entryReviewed,
        setEntryReviewed,
        isRefreshing,
        setIsRefreshing,
        isAdvancing,
        setIsAdvancing,
        isRollingBack,
        setIsRollingBack,
        manualOverrides,
        setManualOverrides,
        setManualOverride,
        missionInstructions,
        setMissionInstructions,
        isPeerReviewModalOpen,
        setIsPeerReviewModalOpen,
        peerReviewSnap,
        isLoadingPeerReview,
        isToolsModalOpen,
        setIsToolsModalOpen,
        isTasksModalOpen,
        setIsTasksModalOpen,
        templates,
        activeTemplate,
        isSequential,
        currentPlan,
        fetchTroubleReport,
        loadExecutionTroubleReport,
        handleOpenPeerReview,
    };
};
