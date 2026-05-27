import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
    Bot,
    ArrowRight,
    Copy,
    Check,
    ChevronRight,
    Layout,
    FileText,
    ShieldCheck,
    Loader2,
    ArrowLeft,
    Clock,
    X,
    Zap,
    RefreshCcw,
    AlertTriangle,
    Bug,
    Network,
    StickyNote,
    Trash2,
    Plus,
    Pencil,
    CheckSquare,
    FolderGit2,
    Target,
    Wrench,
    Cpu,
    GitBranch,
    ExternalLink,
    Eye,
    Edit2,
    Download,
    ClipboardCheck
} from 'lucide-react';
import apiService, {
    getAgentExecution,
    advanceAgentExecution,
    AgentTaskExecution,
    getAgents,
    getCardsBySprint,
    getEpics,
    getSprints,
    rollbackAgentExecution,
    syncAgentExecution,
    getAgentExecutionTree,
    Card,
    Epic,
    Sprint,
    getSnaps,
    updateSnap,
    deleteSnap,
    createSnap,
    Snap,
    GovernanceDoc,
    getGovernanceDocs,
    Decision,
    getDecisions,
    getProject,
    ProjectDetail,
    WorkflowTemplate,
    getWorkflowTemplates
} from '@/services/api';
import { Tag } from '@/app/components/tag';
import { BoardCard } from './board-card';
import { CardModal } from './card-modal';
import { getGithubConfig, getProjectBoards, updateCard, updatePlan } from '@/services/api';
import { WorkflowFlowPreview } from './workflow-flow-preview';
import { DocumentViewModal } from './document-view-modal';

export const ExecutionCockpit: React.FC = () => {
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
    const [viewMode, setViewMode] = useState<'cockpit' | 'branches'>('cockpit');
    const [selectedCard, setSelectedCard] = useState<Card | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'plan' | 'cards' | 'bdd' | 'trouble' | 'retro'>('plan');
    const [troubleReport, setTroubleReport] = useState<any>(null);
    const [copied, setCopied] = useState(false);
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [entryReviewed, setEntryReviewed] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isAdvancing, setIsAdvancing] = useState(false);
    const [isRollingBack, setIsRollingBack] = useState(false);
    const [missionInstructions, setMissionInstructions] = useState('');

    // Walkthrough States
    const [isWalkthroughModalOpen, setIsWalkthroughModalOpen] = useState(false);
    const [walkthroughs, setWalkthroughs] = useState<Snap[]>([]);
    const [isLoadingWalkthroughs, setIsLoadingWalkthroughs] = useState(false);
    const [selectedWalkthrough, setSelectedWalkthrough] = useState<Snap | null>(null);
    const [isEditingWalkthrough, setIsEditingWalkthrough] = useState(false);
    const [walkthroughContent, setWalkthroughContent] = useState('');
    const [isSavingWalkthrough, setIsSavingWalkthrough] = useState(false);

    // Governance Docs States
    const [isDocsModalOpen, setIsDocsModalOpen] = useState(false);
    const [governanceDocs, setGovernanceDocs] = useState<GovernanceDoc[]>([]);
    const [isLoadingDocs, setIsLoadingDocs] = useState(false);
    const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
    const [docsModalTab, setDocsModalTab] = useState<'governance' | 'adrs'>('governance');
    const [decisions, setDecisions] = useState<Decision[]>([]);
    const [selectedDecisionIds, setSelectedDecisionIds] = useState<string[]>([]);
    const [viewDoc, setViewDoc] = useState<GovernanceDoc | null>(null);
    const [isEditingDoc, setIsEditingDoc] = useState(false);
    const [editedDocContent, setEditedDocContent] = useState('');
    const [isSavingDoc, setIsSavingDoc] = useState(false);

    // Peer Review Report States
    const [isPeerReviewModalOpen, setIsPeerReviewModalOpen] = useState(false);
    const [peerReviewSnap, setPeerReviewSnap] = useState<Snap | null>(null);
    const [isLoadingPeerReview, setIsLoadingPeerReview] = useState(false);

    // Agent Tools & Skills State
    const [isToolsModalOpen, setIsToolsModalOpen] = useState(false);

    // Tasks Modal State
    const [isTasksModalOpen, setIsTasksModalOpen] = useState(false);

    const [sisterExecutions, setSisterExecutions] = useState<AgentTaskExecution[]>([]);
    const [isLoadingSisters, setIsLoadingSisters] = useState(false);

    // Workflow templates
    const [templates, setTemplates] = useState<WorkflowTemplate[]>([]);

    // Plan Editing States
    const [isEditingPlan, setIsEditingPlan] = useState(false);
    const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
    const [planContent, setPlanContent] = useState('');
    const [planTitle, setPlanTitle] = useState('');
    const [isSavingPlan, setIsSavingPlan] = useState(false);

    const handleCopy = (id: string, text: string) => {
        navigator.clipboard.writeText(text);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const fetchTroubleReport = async (sprintIds: string[]) => {
        if (!projectId || !sprintIds || sprintIds.length === 0) return;
        try {
            const report = await apiService.getTroubleReport(projectId, sprintIds[0]);
            setTroubleReport(report);
        } catch (err) {
            console.error('Failed to fetch trouble report:', err);
        }
    };

    const handleOpenDocs = async () => {
        if (!projectId) return;
        setIsDocsModalOpen(true);
        setDocsModalTab('governance');
        setIsLoadingDocs(true);
        try {
            const [docs, decisionList] = await Promise.all([
                getGovernanceDocs(projectId),
                getDecisions(projectId)
            ]);
            setGovernanceDocs(docs);
            setDecisions(decisionList);
            if (execution?.context_data?.doc_ids) {
                setSelectedDocIds(execution.context_data.doc_ids);
            }
            if (execution?.context_data?.decision_ids) {
                setSelectedDecisionIds(execution.context_data.decision_ids);
            }
        } catch (err) {
            console.error('Failed to fetch governance docs:', err);
        } finally {
            setIsLoadingDocs(false);
        }
    };

    const toggleDecisionSelection = (id: string) => {
        setSelectedDecisionIds(prev =>
            prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id]
        );
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

    const toggleDocSelection = (id: string) => {
        setSelectedDocIds(prev =>
            prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id]
        );
    };

    const handleSaveDoc = async () => {
        if (!viewDoc) return;
        setIsSavingDoc(true);
        try {
            const updated = await apiService.updateGovernanceDoc(viewDoc.id, { content: editedDocContent });
            setGovernanceDocs(prev => prev.map(d => d.id === viewDoc.id ? updated : d));
            setViewDoc(updated);
            setIsEditingDoc(false);
        } catch (err) {
            console.error('Failed to save document:', err);
        } finally {
            setIsSavingDoc(false);
        }
    };

    const handleOpenWalkthroughs = async () => {
        if (!projectId || !execution) return;
        setIsWalkthroughModalOpen(true);
        setIsLoadingWalkthroughs(true);
        try {
            // Fetch snaps strictly for the sprints associated with this execution
            let allSprintSnaps: Snap[] = [];
            if (execution.sprint_ids && execution.sprint_ids.length > 0) {
                for (const sId of execution.sprint_ids) {
                    try {
                        const sprintSnaps = await getSnaps(projectId, 0, 100, sId);
                        allSprintSnaps.push(...(sprintSnaps || []));
                    } catch (err) {
                        console.error(`Failed to fetch snaps for sprint ${sId}:`, err);
                    }
                }
            }

            // Deduplicate
            const uniqueSnaps = Array.from(new Map(allSprintSnaps.map(s => [s.id, s])).values());

            // Filter for walkthroughs
            const walkthroughSnaps = uniqueSnaps.filter(s =>
                s.name.toLowerCase().includes('walkthrough') ||
                s.content?.toLowerCase().includes('walkthrough') ||
                (s.snadds as any)?.artifact_type === 'walkthrough' ||
                (s.snadds as any)?.type === 'walkthrough' ||
                (s.snadds as any)?.type === 'execution_order' ||
                (s.snadds as any)?.type === 'task' ||
                (s.snadds as any)?.artifact_type === 'execution_order' ||
                (s.snadds as any)?.artifact_type === 'task'
            );

            setWalkthroughs(walkthroughSnaps);
        } catch (err) {
            console.error('Failed to fetch walkthroughs:', err);
        } finally {
            setIsLoadingWalkthroughs(false);
        }
    };

    const handleSaveWalkthrough = async () => {
        if (!selectedWalkthrough) return;
        setIsSavingWalkthrough(true);
        try {
            await updateSnap(selectedWalkthrough.id, { content: walkthroughContent });
            setIsEditingWalkthrough(false);
            // Refresh list strictly for the sprints
            let allSprintSnaps: Snap[] = [];
            if (execution?.sprint_ids && execution.sprint_ids.length > 0) {
                for (const sId of execution.sprint_ids) {
                    try {
                        const sprintSnaps = await getSnaps(projectId!, 0, 100, sId);
                        allSprintSnaps.push(...(sprintSnaps || []));
                    } catch (err) {
                        console.error(`Failed to refresh snaps for sprint ${sId}:`, err);
                    }
                }
            }

            // Deduplicate
            const unique = Array.from(new Map(allSprintSnaps.map(s => [s.id, s])).values());
            const walkthroughSnaps = unique.filter(s =>
                s.name.toLowerCase().includes('walkthrough') ||
                s.content?.toLowerCase().includes('walkthrough') ||
                (s.snadds as any)?.artifact_type === 'walkthrough' ||
                (s.snadds as any)?.type === 'walkthrough' ||
                (s.snadds as any)?.type === 'execution_order' ||
                (s.snadds as any)?.type === 'task' ||
                (s.snadds as any)?.artifact_type === 'execution_order' ||
                (s.snadds as any)?.artifact_type === 'task'
            );
            setWalkthroughs(walkthroughSnaps);

            // Update selected walkthrough content in local state if still selected
            setSelectedWalkthrough(prev => prev ? { ...prev, content: walkthroughContent } : null);
        } catch (err) {
            console.error('Failed to save walkthrough:', err);
        } finally {
            setIsSavingWalkthrough(false);
        }
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

            // Update local execution state to reflect changes
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


    const [executionTree, setExecutionTree] = useState<AgentTaskExecution[]>([]);

    const fetchSisters = async () => {
        if (!projectId || !executionId) return;
        setIsLoadingSisters(true);
        try {
            const tree = await getAgentExecutionTree(executionId);
            setExecutionTree(tree);

            // Find current execution's parent
            const currentEx = tree.find(e => e.id === executionId);
            if (currentEx) {
                // Sisters are those with the same parent (and phase)
                setSisterExecutions(tree.filter(ex =>
                    ex.id !== executionId &&
                    ex.parent_id === currentEx.parent_id
                ));
            } else {
                setSisterExecutions([]);
            }
        } catch (err) {
            console.error('Failed to fetch sister executions:', err);
        } finally {
            setIsLoadingSisters(false);
        }
    };

    useEffect(() => {
        const fetchExecution = async () => {
            try {
                if (!executionId) return;

                const data = await getAgentExecution(executionId);
                setExecution(data);

                // Fetch sister executions
                fetchSisters();

                // Fetch agent instructions (global + project specific)
                try {
                    const [globalAgents, projectAgents, projectEpics, projectSprints, projectData, templatesData] = await Promise.all([
                        getAgents(), // Global
                        projectId ? getAgents(projectId) : Promise.resolve([]), // Project specific
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

                    // Fetch repo names from GitHub config
                    try {
                        const ghConfig = await getGithubConfig(projectId!);
                        if (ghConfig?.repo_names) {
                            setRepoNames(ghConfig.repo_names.split(',').map((r: string) => r.trim()).filter(Boolean));
                        }
                    } catch (e) {
                        console.error('Failed to fetch github config:', e);
                    }

                    // Fetch boards to get columns
                    try {
                        const boards = await getProjectBoards(projectId!);
                        if (boards && boards.length > 0) {
                            // Use columns from the first roadmap board, or just the first board
                            const mainBoard = boards.find(b => b.board_type === 'roadmap') || boards[0];
                            setColumns(mainBoard.columns || []);
                        } else {
                            // Fallback default columns
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

                    // Handle agent name with or without @
                    const cleanName = data.agent_name.startsWith('@') ? data.agent_name.slice(1) : data.agent_name;
                    const agent = allAgents.find(a => a.name === data.agent_name || a.name === cleanName || `@${a.name}` === data.agent_name);
                    if (agent) {
                        setAgentInstructions(agent.instructions);
                    }
                } catch (err) {
                    console.error('Failed to fetch agents:', err);
                }

                // Fetch cards for the sprints
                if (data.sprint_ids && data.sprint_ids.length > 0) {
                    const allCards: Card[] = [];
                    for (const sId of data.sprint_ids) {
                        try {
                            const sprintCards = await getCardsBySprint(sId);
                            allCards.push(...(sprintCards || []));
                        } catch (err) {
                            console.error(`Failed to fetch cards for sprint ${sId}:`, err);
                        }
                    }
                    setCards(allCards);
                }

                // Auto-set tab based on phase
                if (data.phase === 'micro_planning') setActiveTab('plan');
                else if (data.phase === 'plan_review') setActiveTab('plan');
                else if (data.phase === 'execution') setActiveTab('cards');
                else if (data.phase === 'assurance') setActiveTab('bdd');
                else if (data.phase === 'retro') setActiveTab('retro');

                // Fetch trouble report if in assurance or retro
                if (data.phase === 'assurance' || data.phase === 'retro') {
                    fetchTroubleReport(data.sprint_ids);
                }

            } catch (error) {
                console.error('Failed to fetch execution:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchExecution();
    }, [executionId, projectId]);

    useEffect(() => {
        if (execution?.context_data?.doc_ids) {
            setSelectedDocIds(execution.context_data.doc_ids);
        }
        if (execution?.context_data?.decision_ids) {
            setSelectedDecisionIds(execution.context_data.decision_ids);
        }
    }, [execution]);

    const handleCopyPrompt = () => {
        if (!execution?.prompt_snapshot) return;
        const promptToCopy = typeof execution.prompt_snapshot === 'object' && execution.prompt_snapshot !== null
            ? `${(execution.prompt_snapshot as any).entry}\n\n---\n\n${(execution.prompt_snapshot as any).exit || ''}`
            : execution.prompt_snapshot as string;
        navigator.clipboard.writeText(promptToCopy);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleRefresh = async () => {
        if (!executionId) return;
        setIsRefreshing(true);
        try {
            const updated = await syncAgentExecution(executionId, missionInstructions, selectedDocIds, selectedDecisionIds);
            setExecution(updated);
            fetchSisters(); // Refresh sisters on sync

            if (updated.sprint_ids && updated.sprint_ids.length > 0) {
                const sprintData = await getSprints(projectId!);
                setSprints(sprintData.filter(s => updated.sprint_ids.includes(s.id)));

                const allCards: any[] = [];
                for (const sId of updated.sprint_ids) {
                    try {
                        const sprintCards = await getCardsBySprint(sId);
                        allCards.push(...(sprintCards || []));
                    } catch (err) {
                        console.error(`Failed to refresh cards for sprint ${sId}:`, err);
                    }
                }
                setCards(allCards);
                await fetchTroubleReport(updated.sprint_ids);
            }
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
            const updated = await advanceAgentExecution(executionId, missionInstructions, selectedDocIds, selectedDecisionIds);
            console.log("[Cockpit] Advance response:", updated);
            setExecution(updated);
            setMissionInstructions('');
            fetchSisters(); // Refresh sisters on advance

            if (updated.id !== executionId) {
                console.log("[Cockpit] Branching to new execution:", updated.id);
                navigate(`/project/${projectId}/execution/${updated.id}`);
            } else if (updated.status === 'done') {
                console.log("[Cockpit] Execution complete, navigating back to overview");
                navigate(`/project/${projectId}/executions`);
            } else {
                console.log("[Cockpit] Phase advanced in same execution:", updated.phase, "Status:", updated.status);
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

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center h-screen bg-[#0a0a0c] gap-4">
                <div className="relative">
                    <div className="w-16 h-16 rounded-full border-2 border-purple-500/20 border-t-purple-500 animate-spin" />
                    <Bot className="w-8 h-8 text-purple-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                </div>
                <p className="text-white/40 text-sm font-medium animate-pulse">Initializing Execution Cockpit...</p>
            </div>
        );
    }

    if (!execution) {
        return (
            <div className="flex flex-col items-center justify-center h-screen bg-[#0a0a0c] gap-4">
                <Bot className="w-12 h-12 text-white/10" />
                <p className="text-white/30 text-sm">Execution not found.</p>
                <button
                    onClick={() => navigate(`/project/${projectId}/board`)}
                    className="text-purple-400 text-sm underline"
                >
                    Back to Board
                </button>
            </div>
        );
    }

    const phaseLabels: Record<string, string> = {
        macro_planning: 'Macro-Planning',
        micro_planning: 'Micro-Planning & BDD',
        execution: 'Execution (TDD)',
        plan_review: 'Plan Review',
        assurance: 'QA & Assurance',
        retro: 'Retrospective'
    };

    const getDynamicPhaseLabel = (phaseKey: string, templateId?: string | null) => {
        if (templateId) {
            const tmpl = templates.find(t => t.id === templateId);
            if (tmpl && tmpl.phases) {
                const phaseConfig = tmpl.phases.find(p => p.key === phaseKey);
                if (phaseConfig && phaseConfig.label) return phaseConfig.label;
            }
        }
        return phaseLabels[phaseKey] || phaseKey.replace(/_/g, ' ').toUpperCase();
    };

    return (
        <div className="flex h-screen bg-[#0a0a0c] overflow-hidden">
            {/* Left Panel: Orchestrator */}
            <div className="w-[450px] flex flex-col border-r border-white/5 bg-[#0d0d0f]">
                {/* Header */}
                <div className="p-5 border-b border-white/5 bg-white/[0.02] shrink-0">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => navigate(`/project/${projectId}/board`)}
                                className="flex items-center gap-2 text-white/40 hover:text-white text-[10px] transition-colors group"
                            >
                                <ArrowLeft className="w-3 h-3 group-hover:-translate-x-1 transition-transform" />
                                Board
                            </button>
                            <div className="w-px h-2 bg-white/10" />
                            <button
                                onClick={() => navigate(`/project/${projectId}/executions`)}
                                className="flex items-center gap-2 text-white/40 hover:text-white text-[10px] transition-colors group"
                            >
                                Executions
                            </button>
                        </div>
                        <button
                            onClick={() => setViewMode(prev => prev === 'cockpit' ? 'branches' : 'cockpit')}
                            className={`px-2 py-1 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-all flex items-center gap-1.5 border border-white/5 ${viewMode === 'branches' ? 'bg-purple-500/20 text-purple-300 border-purple-500/30' : 'bg-white/5'}`}
                            title={viewMode === 'cockpit' ? "View Execution Tree" : "View Cockpit"}
                        >
                            <Network className="w-3.5 h-3.5" />
                            <span className="text-[9px] font-bold uppercase tracking-wider">{viewMode === 'cockpit' ? 'Branches' : 'Cockpit'}</span>
                        </button>
                    </div>

                    <div className="flex items-center justify-between mb-1">
                        {execution.phase === 'plan_review' ? (
                            <span className="inline-flex items-center px-2 py-0.5 text-[9px] uppercase tracking-wider font-bold rounded-md bg-violet-500/20 text-violet-300 border border-violet-500/30">
                                Phase: {getDynamicPhaseLabel(execution.phase, execution.workflow_template_id)}
                            </span>
                        ) : (
                            <Tag variant="purple" className="px-2 py-0.5 text-[9px] uppercase tracking-wider font-bold">
                                Phase: {getDynamicPhaseLabel(execution.phase, execution.workflow_template_id)}
                            </Tag>
                        )}
                        <div className="flex items-center gap-2 text-[9px] text-white/40">
                            <Clock className="w-3 h-3" />
                            {new Date(execution.created_at).toLocaleString()}
                        </div>
                    </div>
                    <div className="flex items-center justify-between mt-1">
                        <h1 className="text-lg font-bold text-white tracking-tight">Execution Cockpit</h1>
                        <span className="text-[9px] font-mono text-white/20 uppercase tracking-widest select-all">ID: {execution.id}</span>
                    </div>
                </div>

                {/* Left Panel Content */}
                {viewMode === 'cockpit' ? (
                    <div className="flex-1 flex flex-col overflow-hidden">
                        <div className="flex-1 overflow-y-auto custom-scrollbar">
                            {/* Project & Sprints Header */}
                            <div className="p-6 border-b border-white/5 bg-white/[0.015]">
                                <div className="flex flex-col gap-3">
                                    {/* Project */}
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20 text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.1)]">
                                                <FolderGit2 className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <p className="text-[10px] uppercase font-black text-white/30 tracking-[0.2em] mb-0.5">Project Scope</p>
                                                <h3 className="text-sm font-extrabold text-white tracking-tight">{project ? project.name : 'Loading Project...'}</h3>
                                            </div>
                                        </div>
                                        {project?.template && (
                                            <span className="text-[10px] px-2.5 py-1 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-300 font-mono uppercase tracking-wider font-bold">
                                                {project.template}
                                            </span>
                                        )}
                                    </div>

                                    {/* Sprints */}
                                    <div className="flex flex-col gap-2 pt-3 mt-1 border-t border-white/5">
                                        <p className="text-[10px] uppercase font-black text-white/30 tracking-[0.2em] flex items-center gap-1.5">
                                            <Target className="w-3.5 h-3.5 text-purple-400" />
                                            Target Sprint{sprints.filter(s => execution.sprint_ids?.includes(s.id)).length !== 1 ? 's' : ''} ({sprints.filter(s => execution.sprint_ids?.includes(s.id)).length})
                                        </p>
                                        {sprints.filter(s => execution.sprint_ids?.includes(s.id)).length > 0 ? (
                                            <div className="flex flex-wrap gap-2">
                                                {sprints.filter(s => execution.sprint_ids?.includes(s.id)).map(sprint => (
                                                    <div key={sprint.id} className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-xs text-purple-200 font-bold shadow-[0_0_15px_rgba(168,85,247,0.05)]">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
                                                        <span>{sprint.name}</span>
                                                        {sprint.tag && (
                                                            <span className="text-[9px] px-1.5 py-0.5 bg-purple-500/20 border border-purple-500/30 rounded-md text-purple-300 uppercase tracking-wider font-mono">{sprint.tag}</span>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-xs text-white/30 italic">No specific sprints assigned to this execution branch.</p>
                                        )}
                                    </div>

                                    {/* Current Plan */}
                                    <div className="flex flex-col gap-2 pt-3 mt-1 border-t border-white/5">
                                        <p className="text-[10px] uppercase font-black text-white/30 tracking-[0.2em] flex items-center gap-1.5">
                                            <FileText className="w-3.5 h-3.5 text-blue-400" />
                                            Current Plan
                                        </p>
                                        {execution.plan_id ? (
                                            <div className="flex flex-wrap gap-2">
                                                {(() => {
                                                    const plan = (execution.context_data?.plans || []).find((p: any) => p.id === execution.plan_id);
                                                    return plan ? (
                                                        <div
                                                            key={plan.id}
                                                            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-200 font-bold shadow-[0_0_15px_rgba(59,130,246,0.05)] hover:bg-blue-500/20 hover:border-blue-500/40 transition-colors cursor-pointer"
                                                            title={`Plan ID: ${plan.id}`}
                                                        >
                                                            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                                                            <span>{plan.title}</span>
                                                        </div>
                                                    ) : (
                                                        <p className="text-xs text-white/30 italic">Plan not found ({execution.plan_id})</p>
                                                    );
                                                })()}
                                            </div>
                                        ) : (
                                            <p className="text-xs text-white/30 italic">No plan linked to this execution.</p>
                                        )}
                                    </div>

                                    {/* Workflow Progress Pipeline */}
                                    {(() => {
                                        if (!execution) return null;
                                        const activeTemplate = templates.find(t => t.id === execution.workflow_template_id) || templates[0];
                                        if (!activeTemplate) return null;

                                        // Determine completed phases: all phases in execution tree that are done/completed
                                        const completedPhaseKeys = executionTree
                                            .filter(e => ['done', 'completed'].includes(e.status))
                                            .map(e => e.phase);

                                        return (
                                            <div className="flex flex-col gap-2 pt-3 mt-1 border-t border-white/5">
                                                <p className="text-[10px] uppercase font-black text-white/30 tracking-[0.2em] flex items-center gap-1.5">
                                                    <Target className="w-3.5 h-3.5 text-purple-400" />
                                                    Workflow Progress Pipeline
                                                </p>
                                                <div className="h-40 w-full mt-1">
                                                    <WorkflowFlowPreview
                                                        phases={activeTemplate.phases}
                                                        activePhaseKey={execution.phase}
                                                        completedPhaseKeys={completedPhaseKeys}
                                                    />
                                                </div>
                                            </div>
                                        );
                                    })()}
                                </div>
                            </div>

                            {/* Agent Context Header */}
                            <div className="p-6 border-b border-white/5 bg-white/[0.01]">
                                <div className="flex items-center gap-4 mb-4">
                                    <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center border border-purple-500/20 shadow-[0_0_15px_rgba(168,85,247,0.1)]">
                                        <Bot className="w-5 h-5 text-purple-400" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-[10px] uppercase font-black text-white/30 tracking-[0.2em] mb-0.5">Active Mission Agent</p>
                                        <div className="flex items-center gap-2">
                                            <h2
                                                className="text-sm font-bold text-white truncate cursor-pointer hover:underline"
                                                onClick={() => setIsAgentModalOpen(true)}
                                                title="View agent instructions"
                                            >
                                                {execution.agent_name}
                                            </h2>
                                            <div className="flex items-center gap-1.5">
                                                <div className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" />
                                                <span className="text-[8px] font-bold text-purple-400 uppercase tracking-tighter">Running</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Mission Breadcrumb/Status */}
                                <div className="flex flex-wrap items-center gap-4 text-[9px] font-medium text-white/30">
                                    <div className="flex items-center gap-1.5 whitespace-nowrap">
                                        <Zap className="w-3 h-3 text-amber-400/50" />
                                        <span>Hotfix Mode</span>
                                    </div>
                                    <div className="w-px h-2.5 bg-white/10" />
                                    <div className="flex items-center gap-1.5 whitespace-nowrap">
                                        <Network className="w-3 h-3 text-purple-400/50" />
                                        <span>Branch: {execution.id.split('-')[0]}</span>
                                    </div>
                                    {(() => {
                                        const activeTemplate = templates.find(t => t.id === execution.workflow_template_id);
                                        const activePhase = activeTemplate?.phases.find(p => p.key === execution.phase);
                                        if (!activePhase) return null;

                                        return (
                                            <>
                                                <div className="w-px h-2.5 bg-white/10" />
                                                <div
                                                    onClick={() => setIsToolsModalOpen(true)}
                                                    className="flex items-center gap-1.5 hover:text-white transition-colors cursor-pointer group whitespace-nowrap"
                                                >
                                                    <Wrench className="w-3 h-3 text-blue-400/50 group-hover:text-blue-400 transition-colors" />
                                                    <span>Tools: {activePhase.tools?.length || 0}</span>
                                                </div>
                                                <div className="w-px h-2.5 bg-white/10" />
                                                <div
                                                    onClick={() => setIsToolsModalOpen(true)}
                                                    className="flex items-center gap-1.5 hover:text-white transition-colors cursor-pointer group whitespace-nowrap"
                                                >
                                                    <Cpu className="w-3 h-3 text-green-400/50 group-hover:text-green-400 transition-colors" />
                                                    <span>Skills: {activePhase.skills?.length || 0}</span>
                                                </div>
                                            </>
                                        );
                                    })()}
                                </div>

                                {/* GitFlow Status Bar */}
                                {(() => {
                                    const ctx = execution.context_data || {};
                                    const gitBranch = ctx.git_branch;
                                    const prUrl = ctx.pr_url;
                                    const ciStatus = ctx.ci_status;
                                    const retryCount = ctx.retry_count;
                                    if (!gitBranch && !prUrl && !ciStatus) return null;

                                    const ciBadge = ciStatus === 'success'
                                        ? <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/20 border border-emerald-500/30 text-emerald-300">CI: passed</span>
                                        : ciStatus === 'failed'
                                        ? <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-red-500/20 border border-red-500/30 text-red-300">CI: failed</span>
                                        : ciStatus
                                        ? <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/20 border border-amber-500/30 text-amber-300">CI: {ciStatus}</span>
                                        : null;

                                    return (
                                        <div className="flex flex-wrap items-center gap-3 mt-3 pt-3 border-t border-white/5 text-[9px] text-white/40">
                                            {gitBranch && (
                                                <div className="flex items-center gap-1.5 whitespace-nowrap">
                                                    <GitBranch className="w-3 h-3 text-blue-400/60" />
                                                    <span className="font-mono text-blue-300/70">{gitBranch}</span>
                                                </div>
                                            )}
                                            {prUrl && (
                                                <a href={prUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-purple-300 transition-colors whitespace-nowrap">
                                                    <ExternalLink className="w-3 h-3 text-purple-400/60" />
                                                    <span>PR Link</span>
                                                </a>
                                            )}
                                            {ciBadge}
                                            {retryCount !== undefined && retryCount > 0 && (
                                                <span className="text-[9px] text-white/30">Retries: {retryCount}</span>
                                            )}
                                        </div>
                                    );
                                })()}
                            </div>

                            <div className="p-6 space-y-8">
                                {execution.prompt_snapshot ? (
                                    <div className="space-y-4">
                                        {typeof execution.prompt_snapshot === 'object' && execution.prompt_snapshot !== null ? (
                                            <>
                                                <div className="flex items-center justify-between">
                                                    <p className="text-xs font-bold text-blue-400/80 uppercase tracking-widest">Entry Prompt</p>
                                                    <button
                                                        onClick={() => {
                                                            navigator.clipboard.writeText((execution.prompt_snapshot as any).entry);
                                                            setCopiedId('entry');
                                                            setTimeout(() => setCopiedId(null), 2000);
                                                        }}
                                                        className="flex items-center gap-2 text-[10px] font-bold text-blue-400 hover:text-blue-300 transition-colors uppercase tracking-widest"
                                                    >
                                                        {copiedId === 'entry' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                                                        {copiedId === 'entry' ? 'Copied!' : 'Copy Entry'}
                                                    </button>
                                                </div>
                                                <div className="relative group">
                                                    <div className="absolute inset-0 bg-blue-500/5 blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                                                    <div className="relative p-5 rounded-2xl bg-[#050505] border border-blue-500/20 overflow-hidden">
                                                        <pre className="text-xs text-white/70 whitespace-pre-wrap leading-relaxed font-mono max-h-[300px] overflow-y-auto custom-scrollbar">
                                                            {(execution.prompt_snapshot as any).entry}
                                                        </pre>
                                                    </div>
                                                </div>

                                                {/* Mark as Reviewed Divider */}
                                                <div className="px-6 py-4 flex items-center justify-center border-b border-white/5">
                                                    {entryReviewed ? (
                                                        <div className="flex items-center gap-2 text-green-400">
                                                            <Check className="w-4 h-4" />
                                                            <span className="text-xs font-bold uppercase tracking-wider">Entry Reviewed — Exit Unlocked</span>
                                                        </div>
                                                    ) : (
                                                        <button
                                                            onClick={() => setEntryReviewed(true)}
                                                            className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold transition-all hover:scale-[1.02] active:scale-[0.98]"
                                                            style={{
                                                                background: 'linear-gradient(135deg, rgba(234,179,8,0.15) 0%, rgba(251,146,60,0.15) 100%)',
                                                                border: '1px solid rgba(234,179,8,0.4)',
                                                                color: '#FACC15',
                                                            }}
                                                        >
                                                            <Check className="w-4 h-4" />
                                                            Mark Entry as Executed
                                                        </button>
                                                    )}
                                                </div>

                                                {(execution.prompt_snapshot as any).exit && (
                                                    <div style={{ opacity: entryReviewed ? 1 : 0.35, pointerEvents: entryReviewed ? 'auto' : 'none', transition: 'opacity 0.3s ease' }}>
                                                        <div className="flex items-center justify-between pt-4">
                                                            <p className="text-xs font-bold text-amber-400/80 uppercase tracking-widest">Exit Prompt</p>
                                                            <button
                                                                onClick={() => {
                                                                    navigator.clipboard.writeText((execution.prompt_snapshot as any).exit);
                                                                    setCopiedId('exit');
                                                                    setTimeout(() => setCopiedId(null), 2000);
                                                                }}
                                                                className="flex items-center gap-2 text-[10px] font-bold text-amber-400 hover:text-amber-300 transition-colors uppercase tracking-widest"
                                                            >
                                                                {copiedId === 'exit' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                                                                {copiedId === 'exit' ? 'Copied!' : 'Copy Exit'}
                                                            </button>
                                                        </div>
                                                        <div className="relative group mt-4">
                                                            <div className="absolute inset-0 bg-amber-500/5 blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                                                            <div className="relative p-5 rounded-2xl bg-[#050505] border border-amber-500/20 overflow-hidden">
                                                                <pre className="text-xs text-white/70 whitespace-pre-wrap leading-relaxed font-mono max-h-[300px] overflow-y-auto custom-scrollbar">
                                                                    {(execution.prompt_snapshot as any).exit}
                                                                </pre>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </>
                                        ) : (
                                            <>
                                                <div className="flex items-center justify-between">
                                                    <p className="text-xs font-bold text-white/60 uppercase tracking-widest">Next Prompt</p>
                                                    <button
                                                        onClick={handleCopyPrompt}
                                                        className="flex items-center gap-2 text-[10px] font-bold text-purple-400 hover:text-purple-300 transition-colors uppercase tracking-widest"
                                                    >
                                                        {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                                                        {copied ? 'Copied!' : 'Copy Prompt'}
                                                    </button>
                                                </div>

                                                <div className="relative group">
                                                    <div className="absolute inset-0 bg-purple-500/5 blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                                                    <div className="relative p-5 rounded-2xl bg-[#050505] border border-white/10 overflow-hidden">
                                                        <pre className="text-xs text-white/70 whitespace-pre-wrap leading-relaxed font-mono max-h-[450px] overflow-y-auto custom-scrollbar">
                                                            {execution.prompt_snapshot as string}
                                                        </pre>
                                                    </div>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                ) : (
                                    <div className="p-6 rounded-2xl border border-dashed border-white/10 bg-white/[0.01] flex flex-col items-center justify-center text-center gap-3">
                                        <Bot className="w-10 h-10 text-white/20 mb-2" />
                                        <div>
                                            <p className="text-sm font-bold text-white/70">No Prompt Generated Yet</p>
                                            <p className="text-xs text-white/40 mt-1 max-w-xs leading-relaxed">Review the selected cards on the right, provide your mission inputs below, and generate the prompt.</p>
                                        </div>
                                        <button
                                            onClick={handleRefresh}
                                            disabled={isRefreshing}
                                            className="mt-4 px-6 py-2.5 rounded-xl bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 font-bold text-xs uppercase tracking-widest transition-all flex items-center gap-2"
                                        >
                                            {isRefreshing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bot className="w-4 h-4" />}
                                            Generate Prompt
                                        </button>
                                    </div>
                                )}

                                {/* Mission Inputs */}
                                <div className="pt-4 space-y-3">
                                    <p className="text-[10px] font-bold text-white/40 uppercase tracking-[0.2em]">Mission Inputs</p>
                                    <textarea
                                        value={missionInstructions}
                                        onChange={(e) => setMissionInstructions(e.target.value)}
                                        placeholder="Add Figma links, API keys, or custom instructions for the next phase..."
                                        className="w-full h-24 p-4 rounded-xl bg-white/[0.02] border border-white/5 text-xs text-white/70 placeholder:text-white/20 focus:outline-none focus:border-purple-500/30 transition-all resize-none"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Footer Actions */}
                        <div className="p-5 border-t border-white/5 bg-white/[0.01] shrink-0">
                            {/* Advance Requirements Checklist */}
                            <div className="mb-4 space-y-2">
                                <p className="text-[9px] font-bold text-white/40 uppercase tracking-[0.2em] mb-3">Phase Requirements</p>

                                {(() => {
                                    const activeTemplate = templates.find(t => t.id === execution.workflow_template_id) || templates[0];
                                    const activePhaseConfig = activeTemplate?.phases?.find((p: any) => p.key === execution.phase);

                                    let activeRules = activePhaseConfig?.advance_conditions;
                                    if (!activeRules || Object.keys(activeRules).length === 0) {
                                        if (execution.phase === 'macro_planning') {
                                            activeRules = { sprint_linked: true, plan_approved: true };
                                        } else if (execution.phase === 'micro_planning') {
                                            activeRules = { tactical_plans_approved: true, plan_selected: true, bdd_scenarios_generated: true };
                                        } else if (execution.phase === 'execution') {
                                            activeRules = { tasks_finished: true };
                                        } else if (execution.phase === 'assurance') {
                                            activeRules = { cards_done: true, bdd_validated: true };
                                        } else {
                                            activeRules = {};
                                        }
                                    }

                                    const hasAnyRule = Object.values(activeRules).some(v => !!v);

                                    return (
                                        <>
                                            {!hasAnyRule && (
                                                <p className="text-[11px] text-white/30 italic">No transition requirements set for this phase.</p>
                                            )}

                                            {activeRules.sprint_linked && (
                                                <div className="flex items-center gap-3">
                                                    {execution.sprint_ids?.length > 0 ? (
                                                        <div className="w-4 h-4 rounded-full bg-green-500/20 flex items-center justify-center border border-green-500/30">
                                                            <Check className="w-2.5 h-2.5 text-green-400" />
                                                        </div>
                                                    ) : (
                                                        <div className="w-4 h-4 rounded-full bg-white/5 border border-white/10" />
                                                    )}
                                                    <span className={`text-[11px] ${execution.sprint_ids?.length > 0 ? 'text-white/60' : 'text-white/30'}`}>
                                                        Sprint Created & Linked
                                                    </span>
                                                </div>
                                            )}

                                            {activeRules.plan_approved && (
                                                <div className="flex items-center gap-3">
                                                    {(execution.context_data?.plans || []).some((p: any) => ['approved', 'selected', 'in_execution', 'executed'].includes(p.status)) ? (
                                                        <div className="w-4 h-4 rounded-full bg-green-500/20 flex items-center justify-center border border-green-500/30">
                                                            <Check className="w-2.5 h-2.5 text-green-400" />
                                                        </div>
                                                    ) : (
                                                        <div className="w-4 h-4 rounded-full bg-white/5 border border-white/10" />
                                                    )}
                                                    <span className={`text-[11px] ${(execution.context_data?.plans || []).some((p: any) => ['approved', 'selected', 'in_execution', 'executed'].includes(p.status)) ? 'text-white/60' : 'text-white/30'}`}>
                                                        Strategic Plan Approved
                                                    </span>
                                                </div>
                                            )}

                                            {activeRules.tactical_plans_approved && (
                                                <div className="flex items-center gap-3">
                                                    {(execution.context_data?.plans || []).every((p: any) => ['approved', 'selected', 'in_execution', 'executed'].includes(p.status)) ? (
                                                        <div className="w-4 h-4 rounded-full bg-green-500/20 flex items-center justify-center border border-green-500/30">
                                                            <Check className="w-2.5 h-2.5 text-green-400" />
                                                        </div>
                                                    ) : (
                                                        <div className="w-4 h-4 rounded-full bg-white/5 border border-white/10" />
                                                    )}
                                                    <span className={`text-[11px] ${(execution.context_data?.plans || []).every((p: any) => ['approved', 'selected', 'in_execution', 'executed'].includes(p.status)) ? 'text-white/60' : 'text-white/30'}`}>
                                                        All Tactical Plans Approved
                                                    </span>
                                                </div>
                                            )}

                                            {activeRules.plan_selected && (
                                                <div className="flex items-center gap-3">
                                                    {(execution.context_data?.plans || []).some((p: any) => ['selected', 'in_execution', 'executed'].includes(p.status)) ? (
                                                        <div className="w-4 h-4 rounded-full bg-green-500/20 flex items-center justify-center border border-green-500/30">
                                                            <Check className="w-2.5 h-2.5 text-green-400" />
                                                        </div>
                                                    ) : (
                                                        <div className="w-4 h-4 rounded-full bg-white/5 border border-white/10" />
                                                    )}
                                                    <span className={`text-[11px] ${(execution.context_data?.plans || []).some((p: any) => ['selected', 'in_execution', 'executed'].includes(p.status)) ? 'text-white/60' : 'text-white/30'}`}>
                                                        At least one plan selected
                                                    </span>
                                                </div>
                                            )}

                                            {activeRules.bdd_scenarios_generated && (
                                                <div className="flex items-center gap-3">
                                                    {cards.length > 0 && cards.every(c => (c.bdd_scenarios?.length || 0) > 0) ? (
                                                        <div className="w-4 h-4 rounded-full bg-green-500/20 flex items-center justify-center border border-green-500/30">
                                                            <Check className="w-2.5 h-2.5 text-green-400" />
                                                        </div>
                                                    ) : (
                                                        <div className="w-4 h-4 rounded-full bg-white/5 border border-white/10" />
                                                    )}
                                                    <span className={`text-[11px] ${cards.length > 0 && cards.every(c => (c.bdd_scenarios?.length || 0) > 0) ? 'text-white/60' : 'text-white/30'}`}>
                                                        BDD Scenarios Generated
                                                    </span>
                                                </div>
                                            )}

                                            {activeRules.tasks_finished && (
                                                <div className="flex items-center gap-3">
                                                    {cards.length > 0 && cards.every(c => c.status === 'assurance' || c.status === 'done') ? (
                                                        <div className="w-4 h-4 rounded-full bg-green-500/20 flex items-center justify-center border border-green-500/30">
                                                            <Check className="w-2.5 h-2.5 text-green-400" />
                                                        </div>
                                                    ) : (
                                                        <div className="w-4 h-4 rounded-full bg-white/5 border border-white/10" />
                                                    )}
                                                    <span className={`text-[11px] ${cards.length > 0 && cards.every(c => c.status === 'assurance' || c.status === 'done') ? 'text-white/60' : 'text-white/30'}`}>
                                                        All Tasks Finished (Assurance)
                                                    </span>
                                                </div>
                                            )}

                                            {activeRules.cards_done && (
                                                <div className="flex items-center gap-3">
                                                    {cards.length > 0 && cards.every(c => c.status === 'done') ? (
                                                        <div className="w-4 h-4 rounded-full bg-green-500/20 flex items-center justify-center border border-green-500/30">
                                                            <Check className="w-2.5 h-2.5 text-green-400" />
                                                        </div>
                                                    ) : (
                                                        <div className="w-4 h-4 rounded-full bg-white/5 border border-white/10" />
                                                    )}
                                                    <span className={`text-[11px] ${cards.length > 0 && cards.every(c => c.status === 'done') ? 'text-white/60' : 'text-white/30'}`}>
                                                        All Cards Validated & Done
                                                    </span>
                                                </div>
                                            )}

                                            {activeRules.bdd_validated && (
                                                <div className="flex items-center gap-3">
                                                    {cards.length > 0 && cards.every(c => c.bdd_validated) ? (
                                                        <div className="w-4 h-4 rounded-full bg-green-500/20 flex items-center justify-center border border-green-500/30">
                                                            <Check className="w-2.5 h-2.5 text-green-400" />
                                                        </div>
                                                    ) : (
                                                        <div className="w-4 h-4 rounded-full bg-white/5 border border-white/10" />
                                                    )}
                                                    <span className={`text-[11px] ${cards.length > 0 && cards.every(c => c.bdd_validated) ? 'text-white/60' : 'text-white/30'}`}>
                                                        BDD Design Approved (Scenario Review)
                                                    </span>
                                                </div>
                                            )}
                                        </>
                                    );
                                })()}
                            </div>

                            <div className="flex gap-2 mb-4">
                                <button
                                    onClick={handleRefresh}
                                    disabled={isRefreshing}
                                    className="flex-1 h-10 rounded-xl bg-white/[0.05] border border-white/10 text-white/40 hover:text-white hover:bg-white/[0.1] transition-all flex items-center justify-center gap-2"
                                    title="Refresh execution state"
                                >
                                    <RefreshCcw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                                    <span className="text-[10px] font-bold uppercase tracking-wider">Sync State</span>
                                </button>


                                {(() => {
                                    const activeTemplate = templates.find(t => t.id === execution.workflow_template_id) || templates[0];
                                    const activePhaseConfig = activeTemplate?.phases.find(p => p.key === execution.phase);

                                    const showLegacyRollback = !activePhaseConfig?.on_failure && (execution.phase === 'assurance' || execution.phase === 'retro' || (troubleReport && execution.phase === 'execution'));

                                    if (activePhaseConfig?.on_failure) {
                                        const failurePhaseKey = activePhaseConfig.on_failure;
                                        const failurePhaseLabel = activeTemplate?.phases.find(p => p.key === failurePhaseKey)?.label || failurePhaseKey;
                                        return (
                                            <button
                                                onClick={() => handleRollback(failurePhaseKey)}
                                                disabled={isRollingBack}
                                                className="flex-[2] h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400 text-[10px] font-bold hover:bg-orange-500/20 transition-all flex items-center justify-center gap-2"
                                            >
                                                {isRollingBack ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCcw className="w-4 h-4" />}
                                                <span className="uppercase tracking-wider">Rollback to {failurePhaseLabel}</span>
                                            </button>
                                        );
                                    } else if (showLegacyRollback) {
                                        return (
                                            <button
                                                onClick={() => handleRollback('micro_planning')}
                                                disabled={isRollingBack}
                                                className="flex-[2] h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400 text-[10px] font-bold hover:bg-orange-500/20 transition-all flex items-center justify-center gap-2"
                                            >
                                                {isRollingBack ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCcw className="w-4 h-4" />}
                                                <span className="uppercase tracking-wider">Rollback to Planning</span>
                                            </button>
                                        );
                                    }
                                    return null;
                                })()}
                            </div>

                            {execution.advance_conditions?.error && (
                                <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 animate-in shake duration-500">
                                    <p className="text-[10px] text-red-400 font-medium whitespace-pre-wrap">
                                        {execution.advance_conditions.error}
                                    </p>
                                </div>
                            )}
                            <button
                                onClick={execution.status === 'done' ? () => navigate(`/project/${projectId}/executions`) : handleAdvance}
                                disabled={isAdvancing}
                                className={`w-full h-12 ${execution.status === 'done' ? 'bg-green-600 hover:bg-green-500 shadow-green-900/20' : 'bg-purple-600 hover:bg-purple-500 shadow-purple-900/20'} text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50`}
                            >
                                {isAdvancing ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                                    <>
                                        {execution.status === 'done'
                                            ? 'Execution Complete — Exit'
                                            : (execution.phase === 'retro' ? 'Finalize & Conclude Sprint' : 'Advance to Next Phase')
                                        }
                                        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 overflow-y-auto custom-scrollbar bg-black/20">
                        <div className="p-4 border-b border-white/5 flex items-center justify-between">
                            <div>
                                <h2 className="text-[10px] font-black text-white/50 uppercase tracking-[0.2em]">Execution History</h2>
                                <p className="text-[9px] text-white/20 mt-0.5">Hierarchical session branching</p>
                            </div>
                        </div>

                        <div className="py-2 relative">
                            {executionTree.map(ex => {
                                const isCurrent = ex.id === execution.id;
                                let depth = 0;
                                let curr = executionTree.find(e => e.id === ex.id);
                                while (curr?.parent_id) {
                                    depth++;
                                    curr = executionTree.find(e => e.id === curr?.parent_id);
                                }

                                return (
                                    <button
                                        key={ex.id}
                                        onClick={() => {
                                            setViewMode('cockpit');
                                            navigate(`/project/${projectId}/execution/${ex.id}`);
                                        }}
                                        className={`w-full group flex items-center gap-2 px-4 py-1.5 transition-all relative hover:bg-white/[0.03] ${isCurrent ? 'bg-purple-500/5' : ''}`}
                                    >
                                        {/* Active Indicator */}
                                        {isCurrent && <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.5)]" />}

                                        {/* Indentation Guides */}
                                        {Array.from({ length: depth }).map((_, i) => (
                                            <div key={i} className="w-4 h-full border-l border-white/5 shrink-0" />
                                        ))}

                                        <div className="flex items-center gap-2 min-w-0 flex-1">
                                            <Bot className={`w-3.5 h-3.5 shrink-0 ${isCurrent ? 'text-purple-400' : 'text-white/20 group-hover:text-white/40'}`} />

                                            <div className="flex items-center gap-1.5 min-w-0">
                                                <span className={`text-xs font-medium truncate ${isCurrent ? 'text-purple-300' : 'text-white/60 group-hover:text-white/80'}`}>
                                                    {ex.agent_name.replace('@', '')}
                                                </span>

                                                <div className="flex items-center gap-1 shrink-0">
                                                    <span className={`text-[8px] px-1 py-0.5 rounded uppercase font-bold tracking-tighter ${ex.phase === 'macro_planning' ? 'bg-blue-500/10 text-blue-400' :
                                                        ex.phase === 'micro_planning' ? 'bg-indigo-500/10 text-indigo-400' :
                                                            ex.phase === 'execution' ? 'bg-emerald-500/10 text-emerald-400' :
                                                                'bg-purple-500/10 text-purple-400'
                                                        }`}>
                                                        {ex.phase.split('_')[0]}
                                                    </span>

                                                    {ex.branch_type === 'hotfix' && (
                                                        <span className="text-[8px] bg-red-500/10 text-red-400 px-1 py-0.5 rounded uppercase font-bold tracking-tighter">
                                                            Fix
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="hidden group-hover:flex items-center gap-2 text-[9px] font-mono text-white/20 whitespace-nowrap">
                                            <span>{ex.id.split('-')[0]}</span>
                                            <ChevronRight className="w-3 h-3" />
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            {/* Right Panel: Context Dashboard */}
            <div className="flex-1 flex flex-col relative">
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-purple-500/5 blur-[120px] rounded-full -mr-64 -mt-64" />

                {/* Tabs */}
                <div className="flex items-center justify-between px-8 pt-8 relative z-10 border-b border-white/5">
                    <div className="flex items-center gap-6 overflow-x-auto pb-2 -mb-px">
                        {[
                            { id: 'plan', label: 'Plans', icon: FileText },
                            { id: 'cards', label: 'Cards', icon: Layout },
                            { id: 'bdd', label: 'Scenarios', icon: ShieldCheck },
                            { id: 'trouble', label: 'Reports', icon: Bug },
                            { id: 'retro', label: 'Retrospective', icon: Network },
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`flex items-center gap-2 pb-4 text-xs font-medium transition-all relative shrink-0 ${activeTab === tab.id
                                    ? 'text-purple-400'
                                    : 'text-white/40 hover:text-white/70'
                                    }`}
                            >
                                <tab.icon className="w-4 h-4" />
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    <div className="flex items-center gap-2 mb-4">
                        <button
                            onClick={handleOpenDocs}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[10px] font-bold transition-all group ${selectedDocIds.length > 0
                                ? 'bg-blue-500/20 border-blue-500/30 text-blue-400 hover:bg-blue-500/30'
                                : 'bg-white/5 border-white/10 text-white/60 hover:text-white hover:bg-white/10'
                                }`}
                        >
                            <Layout className="w-3.5 h-3.5" />
                            Docs {selectedDocIds.length > 0 && `(${selectedDocIds.length})`}
                        </button>

                        {/* Tasks Button */}
                        {(() => {
                            const allTasks = cards.flatMap(c => c.tasks || []);
                            const doneTasks = allTasks.filter(t => t.completed).length;
                            const hasTasks = allTasks.length > 0;
                            return hasTasks ? (
                                <button
                                    onClick={() => setIsTasksModalOpen(true)}
                                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[10px] font-bold transition-all group ${doneTasks === allTasks.length
                                        ? 'bg-green-500/20 border-green-500/30 text-green-400 hover:bg-green-500/30'
                                        : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20'
                                        }`}
                                >
                                    <CheckSquare className="w-3.5 h-3.5" />
                                    Tasks ({doneTasks}/{allTasks.length})
                                </button>
                            ) : null;
                        })()}

                        <button
                            onClick={handleOpenWalkthroughs}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-purple-500/10 border border-purple-500/20 text-[10px] font-bold text-purple-400 hover:text-white hover:bg-purple-500/20 transition-all group"
                        >
                            <Bot className="w-3.5 h-3.5" />
                            Walkthroughs
                        </button>

                        <button
                            onClick={() => {
                                const width = 1200;
                                const height = 800;
                                const left = window.screenX + (window.outerWidth - width) / 2;
                                const top = window.screenY + (window.outerHeight - height) / 2;
                                window.open(
                                    `/project/${projectId}/execution/${execution.id}/scratch`,
                                    '_blank',
                                    `width=${width},height=${height},left=${left},top=${top},noopener,noreferrer`
                                );
                            }}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-orange-500/10 border border-orange-500/20 text-[10px] font-bold text-orange-400 hover:text-white hover:bg-orange-500/20 transition-all group"
                        >
                            <StickyNote className="w-3.5 h-3.5" />
                            Scratch
                        </button>

                        <button
                            onClick={handleRefresh}
                            disabled={isRefreshing}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-[10px] font-bold text-white/60 hover:text-white hover:bg-white/10 transition-all group"
                        >
                            <RefreshCcw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}`} />
                            {isRefreshing ? 'Refreshing...' : 'Refresh Context'}
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 p-8 overflow-y-auto relative z-10">
                    {activeTab === 'plan' && (
                        <div className="space-y-8">
                            {execution.phase === 'plan_review' && (
                                <div className="flex items-center justify-between px-1">
                                    <div className="flex items-center gap-2">
                                        <span className="inline-flex items-center px-2 py-0.5 text-[9px] uppercase tracking-wider font-bold rounded-md bg-violet-500/20 text-violet-300 border border-violet-500/30">
                                            Plan Review Phase
                                        </span>
                                        <span className="text-[10px] text-white/30">Review plans and check the peer review report below.</span>
                                    </div>
                                    <button
                                        onClick={handleOpenPeerReview}
                                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-500/10 border border-violet-500/20 text-[10px] font-bold text-violet-400 hover:bg-violet-500/20 hover:text-violet-300 transition-all"
                                    >
                                        <FileText className="w-3.5 h-3.5" />
                                        View Review Report
                                    </button>
                                </div>
                            )}
                            {(execution.context_data?.plans || []).length > 0 ? (
                                (execution.context_data?.plans || []).map((plan: any) => (
                                    <div
                                        key={plan.id}
                                        className={`p-8 rounded-3xl border relative overflow-hidden group/plan transition-all ${plan.id === execution.plan_id
                                            ? 'bg-blue-500/[0.05] border-blue-500/30 shadow-[0_0_20px_rgba(59,130,246,0.05)]'
                                            : 'bg-white/[0.03] border-white/10'
                                            } hover:border-blue-500/40`}
                                    >
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 blur-3xl -mr-16 -mt-16 group-hover/plan:bg-blue-500/10 transition-colors" />

                                        <div className="flex items-center gap-3 mb-6 relative z-10">
                                            <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center border border-blue-500/30 shrink-0">
                                                <FileText className="w-5 h-5 text-blue-400" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                {isEditingPlan && editingPlanId === plan.id ? (
                                                    <input
                                                        type="text"
                                                        value={planTitle}
                                                        onChange={(e) => setPlanTitle(e.target.value)}
                                                        className="bg-black/40 border border-white/10 rounded-lg px-3 py-1 text-xl font-bold text-white focus:outline-none focus:border-blue-500/50 w-full mb-1"
                                                        placeholder="Plan Title..."
                                                    />
                                                ) : (
                                                    <h2 className="text-xl font-bold text-white leading-tight truncate">{plan.title}</h2>
                                                )}
                                                {plan.sprint_id && (
                                                    <p className="text-[10px] text-white/30 uppercase font-bold tracking-widest mt-1">
                                                        Sprint: {sprints.find(s => s.id === plan.sprint_id)?.tag || 'Linked Sprint'}
                                                    </p>
                                                )}
                                            </div>

                                            {/* Action Bar */}
                                            <div className="flex items-center gap-4 shrink-0">
                                                {isEditingPlan && editingPlanId === plan.id ? (
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            onClick={() => setIsEditingPlan(false)}
                                                            className="px-3 py-1 bg-white/5 hover:bg-white/10 text-white/60 text-[10px] font-bold rounded-lg transition-colors border border-white/10"
                                                        >
                                                            Cancel
                                                        </button>
                                                        <button
                                                            onClick={handleSavePlan}
                                                            disabled={isSavingPlan}
                                                            className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-bold rounded-lg transition-colors flex items-center gap-1 shadow-lg shadow-blue-900/20 disabled:opacity-50"
                                                        >
                                                            {isSavingPlan ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                                                            Save Changes
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-4">
                                                        {/* Status & Transitions */}
                                                        <div className="flex items-center gap-2">
                                                            {plan.status === 'draft' && (
                                                                <>
                                                                    <Tag variant="orange" className="px-2 py-0.5 text-[9px] uppercase font-bold tracking-wider">Draft</Tag>
                                                                    <button
                                                                        onClick={async () => {
                                                                            try {
                                                                                await updatePlan(plan.id, { status: 'approved' });
                                                                                const updated = await getAgentExecution(execution.id);
                                                                                setExecution(updated);
                                                                            } catch (err) { console.error('Failed to approve plan:', err); }
                                                                        }}
                                                                        className="px-3 py-1.5 bg-green-600 hover:bg-green-500 text-white text-[10px] font-bold rounded-lg transition-all flex items-center gap-1.5 shadow-lg shadow-green-900/20 group/btn"
                                                                    >
                                                                        <Check className="w-3.5 h-3.5 group-hover/btn:scale-110 transition-transform" />
                                                                        Approve Plan
                                                                    </button>
                                                                </>
                                                            )}
                                                            {plan.status === 'approved' && (
                                                                <>
                                                                    <Tag variant="green" className="px-2 py-0.5 text-[9px] uppercase font-bold tracking-wider">Approved</Tag>
                                                                    <button
                                                                        onClick={async () => {
                                                                            try {
                                                                                await updatePlan(plan.id, { status: 'selected' });
                                                                                const updated = await getAgentExecution(execution.id);
                                                                                setExecution(updated);
                                                                            } catch (err) { console.error('Failed to select plan:', err); }
                                                                        }}
                                                                        className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white text-[10px] font-bold rounded-lg transition-all flex items-center gap-1.5 shadow-lg shadow-purple-900/20 group/btn"
                                                                    >
                                                                        <Zap className="w-3.5 h-3.5 group-hover/btn:scale-110 transition-transform" />
                                                                        Select for Execution
                                                                    </button>
                                                                </>
                                                            )}
                                                            {plan.status === 'selected' && (
                                                                <>
                                                                    <Tag variant="purple" className="px-2 py-0.5 text-[9px] uppercase font-bold tracking-wider">Selected</Tag>
                                                                    <button
                                                                        onClick={async () => {
                                                                            try {
                                                                                await updatePlan(plan.id, { status: 'approved' });
                                                                                const updated = await getAgentExecution(execution.id);
                                                                                setExecution(updated);
                                                                            } catch (err) { console.error('Failed to deselect plan:', err); }
                                                                        }}
                                                                        className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white/60 text-[10px] font-bold rounded-lg transition-all flex items-center gap-1.5 border border-white/10 group/btn"
                                                                    >
                                                                        <RefreshCcw className="w-3.5 h-3.5 group-hover/btn:rotate-180 transition-transform duration-500" />
                                                                        Deselect
                                                                    </button>
                                                                </>
                                                            )}
                                                            {plan.status === 'in_execution' && (
                                                                <>
                                                                    <Tag variant="blue" className="px-2 py-0.5 text-[9px] uppercase font-bold tracking-wider">In Execution</Tag>
                                                                    {(execution.phase === 'macro_planning' || execution.phase === 'micro_planning') && (
                                                                        <button
                                                                            onClick={async () => {
                                                                                try {
                                                                                    await updatePlan(plan.id, { status: 'selected' });
                                                                                    const updated = await getAgentExecution(execution.id);
                                                                                    setExecution(updated);
                                                                                } catch (err) { console.error('Failed to reset plan status:', err); }
                                                                            }}
                                                                            className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white/60 text-[10px] font-bold rounded-lg transition-all flex items-center gap-1.5 border border-white/10"
                                                                        >
                                                                            <RefreshCcw className="w-3.5 h-3.5" />
                                                                            Return to Selected
                                                                        </button>
                                                                    )}
                                                                </>
                                                            )}
                                                        </div>

                                                        {/* Management Icons */}
                                                        <div className="flex items-center gap-1 pl-4 border-l border-white/10">
                                                            <button
                                                                onClick={() => handleEditPlan(plan)}
                                                                className="p-2 bg-white/5 hover:bg-white/10 text-white/40 hover:text-white rounded-lg transition-all border border-white/5 hover:border-white/20"
                                                                title="Edit Plan"
                                                            >
                                                                <Pencil className="w-3.5 h-3.5" />
                                                            </button>
                                                            {plan.status !== 'in_execution' && plan.status !== 'executed' && (
                                                                <button
                                                                    onClick={async () => {
                                                                        if (!confirm('Are you sure you want to delete this plan?')) return;
                                                                        try {
                                                                            const { deletePlan } = await import('@/services/api');
                                                                            await deletePlan(plan.id);
                                                                            const updated = await getAgentExecution(execution.id);
                                                                            setExecution(updated);
                                                                        } catch (err) { console.error('Failed to delete plan:', err); }
                                                                    }}
                                                                    className="p-2 bg-red-500/5 hover:bg-red-500/10 text-red-400/60 hover:text-red-400 rounded-lg transition-all border border-red-500/10 hover:border-red-500/20"
                                                                    title="Delete Plan"
                                                                >
                                                                    <Trash2 className="w-3.5 h-3.5" />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="relative group/content z-10">
                                            {!isEditingPlan && (
                                                <button
                                                    onClick={() => handleCopy(plan.id, plan.content || '')}
                                                    className="absolute top-4 right-4 p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-all border border-white/5 opacity-0 group-hover/content:opacity-100"
                                                    title="Copy Plan Content"
                                                >
                                                    {copiedId === plan.id ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                                                </button>
                                            )}
                                            {isEditingPlan && editingPlanId === plan.id ? (
                                                <textarea
                                                    value={planContent}
                                                    onChange={(e) => setPlanContent(e.target.value)}
                                                    className="w-full h-[400px] bg-black/40 border border-white/10 rounded-2xl p-6 text-sm text-white/80 font-mono focus:outline-none focus:border-blue-500/50 transition-all resize-none"
                                                    placeholder="Enter plan content (Markdown supported)..."
                                                />
                                            ) : (
                                                <div className="p-6 rounded-2xl bg-black/20 border border-white/5 overflow-hidden">
                                                    {plan.content ? (
                                                        <div className="prose prose-invert max-w-none select-text cursor-text text-sm text-white/80 marker:text-white/40">
                                                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                                                {plan.content}
                                                            </ReactMarkdown>
                                                        </div>
                                                    ) : (
                                                        <div className="text-white/60 text-sm font-mono">
                                                            No content available for this plan.
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="p-8 rounded-3xl bg-white/[0.03] border border-white/10">
                                    <div className="flex items-center gap-3 mb-6">
                                        <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center border border-blue-500/30">
                                            <FileText className="w-5 h-5 text-blue-400" />
                                        </div>
                                        <h2 className="text-xl font-bold text-white">Strategic Plan</h2>
                                    </div>
                                    <div className="relative group/content">
                                        <button
                                            onClick={() => handleCopy('strategic', execution.context_data?.strategic_plan || '')}
                                            className="absolute top-4 right-4 p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-all border border-white/5 opacity-0 group-hover/content:opacity-100"
                                            title="Copy Strategic Plan"
                                        >
                                            {copiedId === 'strategic' ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                                        </button>
                                        <div className="p-6 rounded-2xl bg-black/20 border border-white/5 overflow-hidden">
                                            {execution.context_data?.strategic_plan ? (
                                                <div className="prose prose-invert max-w-none select-text cursor-text text-sm text-white/80 marker:text-white/40">
                                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                                        {execution.context_data.strategic_plan}
                                                    </ReactMarkdown>
                                                </div>
                                            ) : (
                                                <div className="text-white/60 text-sm font-mono">
                                                    No strategic plan attached to this execution.
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'cards' && (
                        <div className="flex flex-col gap-10 animate-in fade-in slide-in-from-bottom-4 duration-300">
                            {cards.length > 0 ? (
                                ['todo', 'in_progress', 'review', 'assurance', 'done', 'blocked'].map(status => {
                                    const laneCards = cards.filter(c => c.status === status);
                                    if (laneCards.length === 0) return null;

                                    const statusDisplay = {
                                        todo: { label: 'To Do', color: 'text-zinc-400', border: 'border-zinc-800' },
                                        in_progress: { label: 'In Progress', color: 'text-blue-400', border: 'border-blue-500/20' },
                                        review: { label: 'Review', color: 'text-yellow-400', border: 'border-yellow-500/20' },
                                        assurance: { label: 'Assurance', color: 'text-purple-400', border: 'border-purple-500/20' },
                                        done: { label: 'Done', color: 'text-emerald-400', border: 'border-emerald-500/20' },
                                        blocked: { label: 'Blocked', color: 'text-red-400', border: 'border-red-500/20' }
                                    }[status] || { label: status.toUpperCase(), color: 'text-white/60', border: 'border-white/10' };

                                    return (
                                        <div key={status} className="flex flex-col gap-4">
                                            <div className={`flex items-center gap-3 border-b ${statusDisplay.border} pb-2`}>
                                                <h3 className={`font-bold uppercase tracking-wider text-xs ${statusDisplay.color}`}>
                                                    {statusDisplay.label}
                                                </h3>
                                                <span className="bg-white/5 px-2 py-0.5 rounded-full text-[10px] text-white/40 font-mono">
                                                    {laneCards.length}
                                                </span>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                                {laneCards.map(card => (
                                                    <BoardCard
                                                        key={card.id}
                                                        card={card}
                                                        onClick={(c) => setSelectedCard(c)}
                                                        boardColor="#A855F7"
                                                        epic={epics.find(e => e.id === card.epic_id)}
                                                        sprint={sprints.find(s => s.id === card.sprint_id)}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="col-span-full py-20 text-center bg-white/[0.02] rounded-3xl border border-white/5 border-dashed">
                                    <Zap className="w-10 h-10 text-white/10 mx-auto mb-4" />
                                    <p className="text-white/20 italic">No cards found for these sprints.</p>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'bdd' && (
                        <div className="space-y-4">
                            {cards.filter(c => c.bdd_scenarios?.length > 0).length > 0 ? (
                                cards.filter(c => c.bdd_scenarios?.length > 0).map(card => (
                                    <div key={card.id} className="space-y-4">
                                        <div className="flex items-center justify-between px-2">
                                            <h2 className="text-xs font-bold text-white/30 uppercase tracking-widest">{card.title}</h2>
                                            {!card.bdd_validated ? (
                                                <button
                                                    onClick={async () => {
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
                                                    }}
                                                    className="px-3 py-1 bg-purple-600 hover:bg-purple-500 text-white text-[10px] font-bold rounded-lg transition-colors flex items-center gap-1 shadow-lg shadow-purple-900/20"
                                                >
                                                    <ShieldCheck className="w-3 h-3" />
                                                    Approve BDD
                                                </button>
                                            ) : (
                                                <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-green-500/10 border border-green-500/20">
                                                    <ShieldCheck className="w-3 h-3 text-green-400" />
                                                    <span className="text-[9px] font-bold text-green-400 uppercase tracking-wider">BDD Approved</span>
                                                </div>
                                            )}
                                        </div>
                                        {card.bdd_scenarios.map((scenario: any, idx: number) => (
                                            <div key={idx} className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 relative group/scenario">
                                                <div className="absolute inset-0 bg-purple-500/[0.01] opacity-0 group-hover/scenario:opacity-100 transition-opacity" />

                                                <div className="flex items-center justify-between mb-4 relative z-10">
                                                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                                                        <ChevronRight className="w-4 h-4 text-purple-500" />
                                                        {scenario.title}
                                                    </h3>
                                                    <button
                                                        onClick={async () => {
                                                            try {
                                                                const updatedScenarios = [...card.bdd_scenarios];
                                                                updatedScenarios[idx] = { ...scenario, validated: !scenario.validated };

                                                                // Check if all are validated now
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
                                                        }}
                                                        className={`px-2 py-1 rounded text-[9px] font-bold uppercase tracking-wider transition-all border ${scenario.validated
                                                            ? 'bg-green-500/20 border-green-500/30 text-green-400'
                                                            : 'bg-white/5 border-white/10 text-white/30 hover:text-white/60'
                                                            }`}
                                                    >
                                                        {scenario.validated ? 'Validated' : 'Approve'}
                                                    </button>
                                                </div>

                                                <div className="space-y-2 pl-6 relative z-10">
                                                    {scenario.steps?.map((step: any, sIdx: number) => (
                                                        <div key={sIdx} className="flex items-start gap-3">
                                                            <span className="text-[10px] font-bold text-purple-500 uppercase mt-0.5 w-10 shrink-0">{step.type}</span>
                                                            <p className="text-xs text-white/50">{step.content}</p>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ))
                            ) : (
                                <div className="py-20 text-center text-white/20 italic">No BDD scenarios found.</div>
                            )}
                        </div>
                    )}

                    {activeTab === 'trouble' && (
                        <div className="space-y-6">
                            {troubleReport ? (
                                <div className="p-8 rounded-3xl bg-white/[0.03] border border-white/10 relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 blur-3xl -mr-16 -mt-16" />

                                    <div className="flex items-center justify-between mb-8">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-2xl bg-red-500/20 flex items-center justify-center border border-red-500/30">
                                                <AlertTriangle className="w-6 h-6 text-red-400" />
                                            </div>
                                            <div>
                                                <h2 className="text-2xl font-bold text-white">Trouble Report</h2>
                                                <p className="text-xs text-white/40 uppercase tracking-widest font-bold mt-1">
                                                    {troubleReport.sprint_name} • {troubleReport.total_cards} Cards
                                                </p>
                                            </div>
                                        </div>
                                        {troubleReport.markdown_report && (
                                            <button
                                                onClick={() => {
                                                    navigator.clipboard.writeText(troubleReport.markdown_report);
                                                    setCopiedId('troubleReport');
                                                    setTimeout(() => setCopiedId(null), 2000);
                                                }}
                                                className="flex items-center gap-2 text-[10px] font-bold text-red-400 hover:text-red-300 transition-colors uppercase tracking-widest"
                                            >
                                                {copiedId === 'troubleReport' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                                                {copiedId === 'troubleReport' ? 'Copied!' : 'Copy Report'}
                                            </button>
                                        )}
                                    </div>

                                    <div className="prose prose-invert prose-sm max-w-none prose-headings:text-red-400/90 prose-a:text-red-400 prose-strong:text-white/90 prose-code:text-red-300 prose-pre:bg-black/40 prose-pre:border prose-pre:border-white/5 select-text cursor-text" style={{ userSelect: 'text', cursor: 'text' }}>
                                        <div className="text-white/75 leading-relaxed bg-black/20 p-6 rounded-2xl border border-white/5">
                                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                                {troubleReport.markdown_report || "No critical issues reported yet."}
                                            </ReactMarkdown>
                                        </div>
                                    </div>

                                    {troubleReport.failed_bdd_cards?.length > 0 && (
                                        <div className="mt-8 space-y-4">
                                            <h3 className="text-[10px] font-bold text-red-400 uppercase tracking-[0.2em] px-2">Failed BDD Cards</h3>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                {troubleReport.failed_bdd_cards.map((card: any) => (
                                                    <div key={card.id} className="p-4 rounded-xl bg-red-500/5 border border-red-500/10 flex items-center gap-3">
                                                        <Bug className="w-4 h-4 text-red-400" />
                                                        <span className="text-xs text-white/60 font-medium">{card.title}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {troubleReport.test_plans?.length > 0 && (
                                        <div className="mt-8 space-y-4">
                                            <h3 className="text-[10px] font-bold text-orange-400 uppercase tracking-[0.2em] px-2">QA Reports & Trouble Reports</h3>
                                            <div className="space-y-3">
                                                {troubleReport.test_plans.map((tp: any) => (
                                                    <div key={tp.id} className="p-5 rounded-2xl bg-orange-500/5 border border-orange-500/10">
                                                        <div className="flex items-center gap-3 mb-3">
                                                            <AlertTriangle className="w-3.5 h-3.5 text-orange-400" />
                                                            <span className="text-xs font-bold text-orange-300">{tp.title}</span>
                                                            <div className="ml-auto flex items-center gap-3">
                                                                {tp.content && (
                                                                    <button
                                                                        onClick={() => {
                                                                            navigator.clipboard.writeText(tp.content);
                                                                            setCopiedId(`tp-${tp.id}`);
                                                                            setTimeout(() => setCopiedId(null), 2000);
                                                                        }}
                                                                        className="flex items-center gap-1.5 text-[10px] font-bold text-orange-400 hover:text-orange-300 transition-colors uppercase tracking-widest"
                                                                    >
                                                                        {copiedId === `tp-${tp.id}` ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                                                                        {copiedId === `tp-${tp.id}` ? 'Copied!' : 'Copy'}
                                                                    </button>
                                                                )}
                                                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${tp.status === 'failed' ? 'bg-red-500/20 text-red-400' : tp.status === 'passed' ? 'bg-green-500/20 text-green-400' : 'bg-white/10 text-white/40'}`}>
                                                                    {tp.status}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        {tp.content && (
                                                            <div
                                                                className="text-white/75 text-xs leading-relaxed bg-black/20 p-5 rounded-xl border border-white/5 select-text cursor-text prose prose-invert prose-sm max-w-none prose-headings:text-orange-400 prose-a:text-orange-400 prose-strong:text-white/90 prose-code:text-orange-300 prose-pre:bg-black/40 prose-pre:border prose-pre:border-white/5"
                                                                style={{ userSelect: 'text', cursor: 'text' }}
                                                            >
                                                                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                                                    {tp.content}
                                                                </ReactMarkdown>
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="py-20 text-center bg-white/[0.02] rounded-3xl border border-white/5 border-dashed">
                                    <Check className="w-10 h-10 text-green-500/20 mx-auto mb-4" />
                                    <p className="text-white/20 italic">No trouble report generated. Phase might not have failed QA.</p>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'retro' && (() => {
                        const retroSprints = sprints.filter(s => execution.sprint_ids?.includes(s.id));
                        const hasRetro = retroSprints.some(s => s.retrospective && Object.keys(s.retrospective).length > 0);
                        return (
                            <div className="space-y-6">
                                <div className="flex items-center gap-4 mb-2">
                                    <div className="w-12 h-12 rounded-2xl bg-violet-500/20 flex items-center justify-center border border-violet-500/30">
                                        <Network className="w-6 h-6 text-violet-400" />
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-bold text-white">Sprint Retrospective</h2>
                                        <p className="text-xs text-white/40 uppercase tracking-widest font-bold mt-1">
                                            {retroSprints.map(s => s.name).join(' · ')}
                                        </p>
                                    </div>
                                </div>

                                {hasRetro ? retroSprints.map(sprint => {
                                    const retro = sprint.retrospective || {};
                                    if (!Object.keys(retro).length) return null;
                                    const sections = [
                                        { key: 'went_well', label: '✅ O que funcionou bem', color: 'green' },
                                        { key: 'to_improve', label: '🔧 O que melhorar', color: 'amber' },
                                        { key: 'action_items', label: '📋 Action Items', color: 'blue' },
                                        { key: 'technical_debt', label: '⚠️ Débito Técnico', color: 'orange' },
                                        { key: 'risks', label: '🚨 Riscos Remanescentes', color: 'red' },
                                    ];
                                    const colorMap: Record<string, string> = {
                                        green: 'bg-green-500/10 border-green-500/20 text-green-300',
                                        amber: 'bg-amber-500/10 border-amber-500/20 text-amber-300',
                                        blue: 'bg-blue-500/10 border-blue-500/20 text-blue-300',
                                        orange: 'bg-orange-500/10 border-orange-500/20 text-orange-300',
                                        red: 'bg-red-500/10 border-red-500/20 text-red-300',
                                    };
                                    return (
                                        <div key={sprint.id}>
                                            {retroSprints.length > 1 && (
                                                <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] mb-3">{sprint.tag} — {sprint.name}</p>
                                            )}
                                            <div className="grid grid-cols-1 gap-4">
                                                {sections.map(({ key, label, color }) => {
                                                    const value = retro[key];
                                                    if (!value) return null;
                                                    return (
                                                        <div key={key} className={`p-5 rounded-2xl border ${colorMap[color]}`}>
                                                            <p className="text-[10px] font-black uppercase tracking-[0.15em] mb-2 opacity-70">{label}</p>
                                                            <p className="text-sm leading-relaxed opacity-90 whitespace-pre-wrap">{typeof value === 'string' ? value : JSON.stringify(value, null, 2)}</p>
                                                        </div>
                                                    );
                                                })}
                                                {/* Render any extra keys not in sections */}
                                                {Object.entries(retro)
                                                    .filter(([k]) => !sections.map(s => s.key).includes(k))
                                                    .map(([k, v]) => (
                                                        <div key={k} className="p-5 rounded-2xl bg-white/5 border border-white/10">
                                                            <p className="text-[10px] font-black uppercase tracking-[0.15em] mb-2 text-white/40">{k}</p>
                                                            <p className="text-sm text-white/70 leading-relaxed whitespace-pre-wrap">{typeof v === 'string' ? v : JSON.stringify(v, null, 2)}</p>
                                                        </div>
                                                    ))}
                                            </div>
                                        </div>
                                    );
                                }) : (
                                    <div className="py-20 text-center bg-white/[0.02] rounded-3xl border border-white/5 border-dashed">
                                        <Network className="w-10 h-10 text-violet-500/20 mx-auto mb-4" />
                                        <p className="text-white/30 font-medium mb-1">Retrospectiva ainda não registrada</p>
                                        <p className="text-white/20 text-xs italic">O @antigravity-retro-analyst preencherá o campo <code className="text-violet-400/60">sprint.retrospective</code> ao finalizar a fase Retro.</p>
                                    </div>
                                )}
                            </div>
                        );
                    })()}
                </div>
            </div>

            {/* Agent Instructions Modal */}
            {isAgentModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
                    <div
                        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                        onClick={() => setIsAgentModalOpen(false)}
                    />
                    <div className="relative w-full max-w-2xl bg-[#0d0d0f] border border-white/10 rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center border border-purple-500/30">
                                    <Bot className="w-5 h-5 text-purple-400" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-white leading-tight">Agent Instructions</h2>
                                    <p className="text-xs text-white/40">{execution?.agent_name}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsAgentModalOpen(false)}
                                className="p-2 hover:bg-white/5 rounded-xl text-white/20 hover:text-white transition-all"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-8 max-h-[70vh] overflow-y-auto">
                            <div className="prose prose-invert max-w-none">
                                <pre className="text-sm text-white/70 whitespace-pre-wrap leading-relaxed font-sans">
                                    {agentInstructions || "No specific instructions found for this agent in the database."}
                                </pre>
                            </div>
                        </div>
                        <div className="p-6 border-t border-white/5 bg-white/[0.01] flex justify-end">
                            <button
                                onClick={() => setIsAgentModalOpen(false)}
                                className="px-6 py-2.5 bg-white/5 hover:bg-white/10 text-white text-sm font-bold rounded-xl transition-all"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}


            <CardModal
                isOpen={!!selectedCard}
                onClose={() => setSelectedCard(null)}
                onSave={async (cardData) => {
                    if (selectedCard) {
                        try {
                            await updateCard(selectedCard.id, cardData);
                            setCards(prev => prev.map(c => c.id === selectedCard.id ? { ...c, ...cardData } : c));
                        } catch (err) {
                            console.error('Failed to update card:', err);
                        }
                    }
                }}
                initialData={selectedCard}
                epics={epics}
                sprints={sprints}
                columns={columns}
                repoNames={repoNames}
            />

            {/* Walkthroughs Modal */}
            {isWalkthroughModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
                    <div
                        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                        onClick={() => {
                            setIsWalkthroughModalOpen(false);
                            setSelectedWalkthrough(null);
                        }}
                    />
                    <div className="relative w-full max-w-4xl bg-[#0d0d0f] border border-white/10 rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col h-[80vh]">
                        <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center border border-purple-500/30">
                                    <Bot className="w-5 h-5 text-purple-400" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-white leading-tight">Agent Walkthroughs</h2>
                                    <p className="text-xs text-white/40">Contextual Memory & Decision Logs</p>
                                </div>
                            </div>
                            <button
                                onClick={() => {
                                    setIsWalkthroughModalOpen(false);
                                    setSelectedWalkthrough(null);
                                }}
                                className="p-2 hover:bg-white/5 rounded-xl text-white/20 hover:text-white transition-all"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="flex-1 flex overflow-hidden">
                            {/* List of Walkthroughs */}
                            <div className="w-72 border-r border-white/5 overflow-y-auto bg-white/[0.01]">
                                {isLoadingWalkthroughs ? (
                                    <div className="p-8 flex justify-center">
                                        <Loader2 className="w-6 h-6 text-purple-500 animate-spin" />
                                    </div>
                                ) : walkthroughs.length > 0 ? (
                                    <div className="p-2 space-y-1">
                                        {walkthroughs.map(w => (
                                            <button
                                                key={w.id}
                                                onClick={() => {
                                                    setSelectedWalkthrough(w);
                                                    setWalkthroughContent(w.content || '');
                                                    setIsEditingWalkthrough(false);
                                                }}
                                                className={`w-full text-left px-4 py-3 rounded-xl transition-all border ${selectedWalkthrough?.id === w.id
                                                    ? 'bg-purple-500/20 border-purple-500/30 text-purple-300'
                                                    : 'hover:bg-white/5 text-white/50 hover:text-white/80 border-transparent'
                                                    }`}
                                            >
                                                <p className="text-xs font-bold truncate">{w.name}</p>
                                                <p className="text-[10px] opacity-50 mt-1">{new Date(w.created_at).toLocaleDateString()} · {w.status}</p>
                                            </button>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="p-8 text-center">
                                        <p className="text-[10px] text-white/20 italic">No walkthroughs found.</p>
                                    </div>
                                )}
                            </div>

                            {/* Walkthrough Content */}
                            <div className="flex-1 overflow-y-auto p-8 bg-black/20">
                                {selectedWalkthrough ? (
                                    <div className="space-y-6">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <h3 className="text-xl font-bold text-white">{selectedWalkthrough.name}</h3>
                                                <p className="text-xs text-white/40 mt-1">ID: {selectedWalkthrough.id}</p>
                                            </div>
                                            <button
                                                onClick={() => setIsEditingWalkthrough(!isEditingWalkthrough)}
                                                className={`px-4 py-1.5 rounded-lg border text-[10px] font-bold transition-all ${isEditingWalkthrough
                                                    ? 'bg-white/10 border-white/20 text-white'
                                                    : 'bg-white/5 border-white/10 text-white/60 hover:text-white'
                                                    }`}
                                            >
                                                {isEditingWalkthrough ? 'Cancel' : 'Edit content'}
                                            </button>
                                        </div>

                                        {isEditingWalkthrough ? (
                                            <div className="space-y-4">
                                                <textarea
                                                    value={walkthroughContent}
                                                    onChange={(e) => setWalkthroughContent(e.target.value)}
                                                    className="w-full h-[450px] bg-black/40 border border-white/10 rounded-2xl p-6 text-sm text-white/80 font-mono focus:outline-none focus:border-purple-500/50 transition-all resize-none"
                                                    placeholder="Enter walkthrough content (Markdown supported)..."
                                                />
                                                <div className="flex justify-end">
                                                    <button
                                                        onClick={handleSaveWalkthrough}
                                                        disabled={isSavingWalkthrough}
                                                        className="flex items-center gap-2 px-6 py-2.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-purple-500/20"
                                                    >
                                                        {isSavingWalkthrough ? (
                                                            <Loader2 className="w-4 h-4 animate-spin" />
                                                        ) : (
                                                            <Check className="w-4 h-4" />
                                                        )}
                                                        Save Changes
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-8 overflow-y-auto max-h-[60vh] scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                                                <div className="prose prose-invert prose-sm max-w-none prose-headings:text-purple-400 prose-a:text-purple-400 prose-strong:text-white/90 prose-code:text-purple-300 prose-pre:bg-black/40 prose-pre:border prose-pre:border-white/5">
                                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                                        {selectedWalkthrough.content || "_This walkthrough has no content._"}
                                                    </ReactMarkdown>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="h-full flex flex-col items-center justify-center opacity-20">
                                        <Bot className="w-16 h-16 mb-4" />
                                        <p className="text-sm font-medium">Select a walkthrough to view its details</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {/* Docs Modal */}
            {isDocsModalOpen && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-8">
                    <div className="bg-[#0a0a0c] border border-white/10 rounded-3xl w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden shadow-2xl">
                        {/* Header */}
                        <div className="p-6 border-b border-white/5 flex items-center justify-between shrink-0 bg-white/[0.02]">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center border border-blue-500/30">
                                    <Layout className="w-5 h-5 text-blue-400" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-white tracking-tight">Context Docs</h2>
                                    <p className="text-[10px] text-white/40 uppercase tracking-widest mt-1">Select context for execution</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsDocsModalOpen(false)}
                                className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors border border-white/10"
                            >
                                <X className="w-5 h-5 text-white/60" />
                            </button>
                        </div>

                        {/* Tabs */}
                        <div className="flex items-center gap-1 px-6 pt-4 pb-0 border-b border-white/5 shrink-0">
                            <button
                                onClick={() => setDocsModalTab('governance')}
                                className={`px-4 py-2 text-xs font-bold rounded-t-lg transition-all border-b-2 -mb-px ${docsModalTab === 'governance' ? 'text-blue-400 border-blue-500 bg-blue-500/5' : 'text-white/40 border-transparent hover:text-white/70'}`}
                            >
                                Governance
                                {selectedDocIds.length > 0 && <span className="ml-2 px-1.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-[9px]">{selectedDocIds.length}</span>}
                            </button>
                            <button
                                onClick={() => setDocsModalTab('adrs')}
                                className={`px-4 py-2 text-xs font-bold rounded-t-lg transition-all border-b-2 -mb-px ${docsModalTab === 'adrs' ? 'text-violet-400 border-violet-500 bg-violet-500/5' : 'text-white/40 border-transparent hover:text-white/70'}`}
                            >
                                ADRs (Decisions)
                                {selectedDecisionIds.length > 0 && <span className="ml-2 px-1.5 py-0.5 rounded-full bg-violet-500/20 text-violet-300 text-[9px]">{selectedDecisionIds.length}</span>}
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                            {isLoadingDocs ? (
                                <div className="h-full flex items-center justify-center">
                                    <Loader2 className="w-8 h-8 text-blue-500 animate-spin opacity-50" />
                                </div>
                            ) : docsModalTab === 'governance' ? (
                                governanceDocs.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center text-white/30">
                                        <FileText className="w-12 h-12 mb-4 opacity-50" />
                                        <p>No governance documents found for this project.</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {governanceDocs.map(doc => {
                                            const isSelected = selectedDocIds.includes(doc.id);
                                            return (
                                                <div
                                                    key={doc.id}
                                                    onClick={() => toggleDocSelection(doc.id)}
                                                    className={`p-4 rounded-2xl border cursor-pointer transition-all ${isSelected
                                                        ? 'bg-blue-500/10 border-blue-500/50 shadow-lg shadow-blue-500/10'
                                                        : 'bg-white/5 border-white/10 hover:bg-white/[0.07]'
                                                        }`}
                                                >
                                                    <div className="flex items-start justify-between">
                                                        <div>
                                                            <h3 className={`font-bold text-sm ${isSelected ? 'text-blue-400' : 'text-white/80'}`}>{doc.name}</h3>
                                                            <p className="text-[10px] text-white/40 uppercase tracking-wider mt-1">{doc.type}</p>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setViewDoc(doc);
                                                                }}
                                                                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-all border border-white/10"
                                                                title="View Document"
                                                            >
                                                                <Eye className="w-3.5 h-3.5" />
                                                            </button>
                                                            <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${isSelected ? 'bg-blue-500 border-blue-400' : 'border-white/20'
                                                                }`}>
                                                                {isSelected && <Check className="w-3 h-3 text-white" />}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <p className="text-xs text-white/50 mt-3 line-clamp-2 leading-relaxed">
                                                        {doc.content.substring(0, 150)}...
                                                    </p>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )
                            ) : (
                                decisions.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center text-white/30">
                                        <FileText className="w-12 h-12 mb-4 opacity-50" />
                                        <p>No ADRs found for this project.</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {decisions.map(dec => {
                                            const isSelected = selectedDecisionIds.includes(dec.id);
                                            return (
                                                <div
                                                    key={dec.id}
                                                    onClick={() => toggleDecisionSelection(dec.id)}
                                                    className={`p-4 rounded-2xl border cursor-pointer transition-all ${isSelected
                                                        ? 'bg-violet-500/10 border-violet-500/50 shadow-lg shadow-violet-500/10'
                                                        : 'bg-white/5 border-white/10 hover:bg-white/[0.07]'
                                                        }`}
                                                >
                                                    <div className="flex items-start justify-between">
                                                        <div>
                                                            <p className="text-[10px] font-bold text-white/30 uppercase tracking-wider mb-0.5">{dec.code}</p>
                                                            <h3 className={`font-bold text-sm ${isSelected ? 'text-violet-400' : 'text-white/80'}`}>{dec.title}</h3>
                                                            <p className="text-[10px] text-white/40 uppercase tracking-wider mt-1">{dec.status}</p>
                                                        </div>
                                                        <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors shrink-0 ml-2 ${isSelected ? 'bg-violet-500 border-violet-400' : 'border-white/20'
                                                            }`}>
                                                            {isSelected && <Check className="w-3 h-3 text-white" />}
                                                        </div>
                                                    </div>
                                                    {dec.context && (
                                                        <p className="text-xs text-white/50 mt-3 line-clamp-2 leading-relaxed">
                                                            {dec.context.substring(0, 150)}...
                                                        </p>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )
                            )}
                        </div>

                        <div className="p-6 border-t border-white/5 bg-white/[0.02] flex justify-between items-center">
                            <p className="text-xs text-white/40">
                                Selected docs & ADRs will be injected into the prompt when syncing or advancing.
                            </p>
                            <button
                                onClick={() => {
                                    setIsDocsModalOpen(false);
                                    handleRefresh();
                                }}
                                className="px-6 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold transition-all shadow-lg shadow-blue-900/20"
                            >
                                Done
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Peer Review Report Modal */}
            {isPeerReviewModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
                    <div
                        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                        onClick={() => setIsPeerReviewModalOpen(false)}
                    />
                    <div className="relative w-full max-w-3xl bg-[#0d0d0f] border border-violet-500/20 rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col h-[80vh]">
                        <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/[0.02] shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-violet-500/20 flex items-center justify-center border border-violet-500/30">
                                    <FileText className="w-5 h-5 text-violet-400" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-white leading-tight">Peer Review Report</h2>
                                    <p className="text-xs text-white/40">Plan Review Audit</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsPeerReviewModalOpen(false)}
                                className="p-2 hover:bg-white/5 rounded-xl text-white/20 hover:text-white transition-all"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-8 bg-black/20">
                            {isLoadingPeerReview ? (
                                <div className="h-full flex items-center justify-center">
                                    <Loader2 className="w-8 h-8 text-violet-500 animate-spin opacity-50" />
                                </div>
                            ) : peerReviewSnap ? (
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <h3 className="text-lg font-bold text-white">{peerReviewSnap.name}</h3>
                                        <span className="text-[10px] text-white/30 font-mono">ID: {peerReviewSnap.id}</span>
                                    </div>
                                    <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-8 overflow-y-auto max-h-[55vh]">
                                        <div className="prose prose-invert prose-sm max-w-none prose-headings:text-violet-400 prose-a:text-violet-400 prose-strong:text-white/90 prose-code:text-violet-300 prose-pre:bg-black/40 prose-pre:border prose-pre:border-white/5">
                                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                                {peerReviewSnap.content || '_No content available._'}
                                            </ReactMarkdown>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center opacity-30">
                                    <FileText className="w-16 h-16 mb-4" />
                                    <p className="text-sm font-medium">No Peer Review Report found</p>
                                    <p className="text-xs mt-1 text-white/50">The agent will create a "Peer Review Report" artifact during plan review.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
            {/* Tasks Modal */}
            {isTasksModalOpen && (() => {
                const allTaskCards = cards.filter(c => (c.tasks?.length || 0) > 0);
                const totalTasks = allTaskCards.reduce((sum, c) => sum + (c.tasks?.length || 0), 0);
                const doneTasks = allTaskCards.reduce((sum, c) => sum + (c.tasks?.filter(t => t.completed).length || 0), 0);
                const pct = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;
                return (
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-8">
                        <div className="bg-[#0a0a0c] border border-white/10 rounded-3xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden shadow-2xl">
                            {/* Header */}
                            <div className="p-6 border-b border-white/5 flex items-center justify-between shrink-0 bg-white/[0.02]">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30">
                                        <CheckSquare className="w-5 h-5 text-emerald-400" />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-bold text-white tracking-tight">Consolidated Tasks</h2>
                                        <p className="text-[10px] text-white/40 uppercase tracking-widest mt-1">
                                            {doneTasks} of {totalTasks} completed across {allTaskCards.length} card{allTaskCards.length !== 1 ? 's' : ''}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setIsTasksModalOpen(false)}
                                    className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors border border-white/10"
                                >
                                    <X className="w-5 h-5 text-white/60" />
                                </button>
                            </div>

                            {/* Global Progress Bar */}
                            <div className="px-6 py-4 border-b border-white/5 shrink-0">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Overall Progress</span>
                                    <span className={`text-sm font-black tabular-nums ${pct === 100 ? 'text-green-400' : 'text-emerald-400'}`}>{pct}%</span>
                                </div>
                                <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full rounded-full transition-all duration-700 ${pct === 100 ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'bg-emerald-500'}`}
                                        style={{ width: `${pct}%` }}
                                    />
                                </div>
                            </div>

                            {/* Task List grouped by Card */}
                            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar space-y-5">
                                {allTaskCards.map(card => {
                                    const cardDone = (card.tasks || []).filter(t => t.completed).length;
                                    const cardTotal = (card.tasks || []).length;
                                    const cardPct = Math.round((cardDone / cardTotal) * 100);
                                    return (
                                        <div key={card.id} className="rounded-2xl border border-white/[0.07] bg-white/[0.02] overflow-hidden">
                                            {/* Card header */}
                                            <div className="flex items-center justify-between px-5 py-3 bg-white/[0.03] border-b border-white/5">
                                                <div className="flex items-center gap-2 min-w-0">
                                                    {card.code && (
                                                        <span className="text-[9px] font-mono font-bold text-white/30 shrink-0">{card.code}</span>
                                                    )}
                                                    <span className="text-xs font-semibold text-white/80 truncate">{card.title}</span>
                                                </div>
                                                <div className="flex items-center gap-2 shrink-0 ml-3">
                                                    <div className="w-20 h-1.5 bg-white/5 rounded-full overflow-hidden">
                                                        <div
                                                            className={`h-full rounded-full transition-all ${cardPct === 100 ? 'bg-green-500' : 'bg-emerald-500'}`}
                                                            style={{ width: `${cardPct}%` }}
                                                        />
                                                    </div>
                                                    <span className={`text-[9px] font-bold tabular-nums ${cardPct === 100 ? 'text-green-400' : 'text-white/40'}`}>
                                                        {cardDone}/{cardTotal}
                                                    </span>
                                                </div>
                                            </div>
                                            {/* Task rows */}
                                            <ul className="divide-y divide-white/[0.04]">
                                                {(card.tasks || []).map(task => (
                                                    <li key={task.id} className="flex items-start gap-3 px-5 py-3 group">
                                                        <div className={`mt-0.5 w-4 h-4 rounded flex items-center justify-center shrink-0 border transition-colors ${task.completed
                                                            ? 'bg-green-500/20 border-green-500/40'
                                                            : 'bg-white/5 border-white/10'
                                                            }`}>
                                                            {task.completed && <Check className="w-2.5 h-2.5 text-green-400" />}
                                                        </div>
                                                        <span className={`text-xs leading-relaxed transition-colors ${task.completed ? 'text-white/30 line-through' : 'text-white/70'
                                                            }`}>
                                                            {task.title}
                                                        </span>
                                                        {task.runner_id && (
                                                            <span className="ml-auto text-[9px] font-mono text-white/20 shrink-0">{task.runner_id}</span>
                                                        )}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Footer */}
                            <div className="p-5 border-t border-white/5 bg-white/[0.02] flex justify-end shrink-0">
                                <button
                                    onClick={() => setIsTasksModalOpen(false)}
                                    className="px-6 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold transition-all shadow-lg shadow-emerald-900/20"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                );
            })()}

            {/* Agent Tools & Skills Modal */}
            {isToolsModalOpen && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-8">
                    <div className="bg-[#0a0a0c] border border-white/10 rounded-3xl w-full max-w-2xl h-[70vh] flex flex-col overflow-hidden shadow-2xl">
                        <div className="p-6 border-b border-white/5 flex items-center justify-between shrink-0 bg-white/[0.02]">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center border border-blue-500/30">
                                    <Wrench className="w-5 h-5 text-blue-400" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-white tracking-tight">Agent Capabilities</h2>
                                    <p className="text-xs text-white/40 mt-1">Tools and Skills available for this execution phase</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsToolsModalOpen(false)}
                                className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-white/40 hover:text-white hover:bg-white/10 transition-all"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent space-y-8">
                            {(() => {
                                const activeTemplate = templates.find(t => t.id === execution?.workflow_template_id);
                                const activePhase = activeTemplate?.phases.find(p => p.key === execution?.phase);

                                return (
                                    <>
                                        <div>
                                            <div className="flex items-center gap-2 mb-4">
                                                <Wrench className="w-4 h-4 text-blue-400" />
                                                <h3 className="text-sm font-bold text-white">Tools ({activePhase?.tools?.length || 0})</h3>
                                            </div>
                                            <div className="grid gap-2">
                                                {activePhase?.tools && activePhase.tools.length > 0 ? activePhase.tools.map(tool => (
                                                    <div key={tool} className="p-3 rounded-xl bg-white/5 border border-white/5 flex items-center gap-3">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                                                        <span className="text-xs text-white/80 font-mono">{tool}</span>
                                                    </div>
                                                )) : (
                                                    <p className="text-xs text-white/40 italic">No tools configured for this phase.</p>
                                                )}
                                            </div>
                                        </div>

                                        <div>
                                            <div className="flex items-center gap-2 mb-4">
                                                <Cpu className="w-4 h-4 text-green-400" />
                                                <h3 className="text-sm font-bold text-white">Skills ({activePhase?.skills?.length || 0})</h3>
                                            </div>
                                            <div className="grid gap-2">
                                                {activePhase?.skills && activePhase.skills.length > 0 ? activePhase.skills.map(skill => (
                                                    <div key={skill} className="p-3 rounded-xl bg-white/5 border border-white/5 flex items-center gap-3">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
                                                        <span className="text-xs text-white/80 font-mono">{skill}</span>
                                                    </div>
                                                )) : (
                                                    <p className="text-xs text-white/40 italic">No skills configured for this phase.</p>
                                                )}
                                            </div>
                                        </div>
                                    </>
                                );
                            })()}
                        </div>
                    </div>
                </div>
            )}

            {/* Document View Modal */}
            <DocumentViewModal
                isOpen={!!viewDoc}
                doc={viewDoc}
                onClose={() => { setViewDoc(null); setIsEditingDoc(false); }}
                onSave={async (newContent) => {
                    if (!viewDoc) return;
                    setIsSavingDoc(true);
                    try {
                        const updated = await apiService.updateGovernanceDoc(viewDoc.id, { content: newContent });
                        setGovernanceDocs(prev => prev.map(d => d.id === viewDoc.id ? updated : d));
                        setViewDoc(updated);
                        setIsEditingDoc(false);
                    } catch (err) {
                        console.error('Failed to save document:', err);
                        throw err;
                    } finally {
                        setIsSavingDoc(false);
                    }
                }}
            />
        </div>
    );
};
