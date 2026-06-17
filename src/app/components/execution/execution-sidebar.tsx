import { useNavigate } from 'react-router-dom';
import {
    ArrowRight,
    ArrowLeft,
    Clock,
    Network,
    RefreshCcw,
    Loader2,
    GitBranch,
    ExternalLink
} from 'lucide-react';
import { Tag } from '@/app/components/shared/tag';
import type { AgentTaskExecution, Card, ProjectDetail, Sprint, WorkflowTemplate } from '@/services/types';
import { ExecutionHistoryTree } from '@/app/components/execution/execution-history-tree';
import { ExecutionRequirementsChecklist } from '@/app/components/execution/execution-requirements-checklist';
import { ExecutionPromptSnapshot } from '@/app/components/execution/execution-prompt-snapshot';
import { ExecutionProjectSprintDetails } from '@/app/components/execution/execution-project-sprint-details';
import { ExecutionAgentContext } from '@/app/components/execution/execution-agent-context';
import { updateCard } from '@/services/cards';

interface ExecutionSidebarProps {
    projectId: string;
    execution: AgentTaskExecution;
    project: ProjectDetail | null;
    sprints: Sprint[];
    templates: WorkflowTemplate[];
    executionTree: AgentTaskExecution[];
    sisterExecutions: AgentTaskExecution[];
    troubleReport: any;
    cards: Card[];
    agentInstructions: string | null;
    viewMode: 'cockpit' | 'branches';
    setViewMode: React.Dispatch<React.SetStateAction<'cockpit' | 'branches'>>;
    entryReviewed: boolean;
    setEntryReviewed: React.Dispatch<React.SetStateAction<boolean>>;
    missionInstructions: string;
    setMissionInstructions: React.Dispatch<React.SetStateAction<string>>;
    selectedDocIds: string[];
    selectedDecisionIds: string[];
    isRefreshing: boolean;
    isAdvancing: boolean;
    isRollingBack: boolean;
    handleRefresh: () => Promise<void>;
    handleAdvance: () => Promise<void>;
    handleRollback: (targetPhase?: string) => Promise<void>;
    setIsAgentModalOpen: (open: boolean) => void;
    setIsToolsModalOpen: (open: boolean) => void;
}

export const ExecutionSidebar: React.FC<ExecutionSidebarProps> = ({
    projectId,
    execution,
    project,
    sprints,
    templates,
    executionTree,
    troubleReport,
    cards,
    viewMode,
    setViewMode,
    entryReviewed,
    setEntryReviewed,
    missionInstructions,
    setMissionInstructions,
    isRefreshing,
    isAdvancing,
    isRollingBack,
    handleRefresh,
    handleAdvance,
    handleRollback,
    setIsAgentModalOpen,
    setIsToolsModalOpen
}) => {
    const navigate = useNavigate();

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

    const handleRequirementToggle = async (requirementKey: string, value: boolean) => {
        try {
            if (requirementKey === 'bdd_validated') {
                // Mark ALL cards in all sprints as bdd_validated
                if (execution.sprint_ids && execution.sprint_ids.length > 0) {
                    const { api } = await import('@/services/client');
                    // Get all cards for these sprints
                    const response = await api.get(`/cards/`, {
                        params: { sprint_ids: execution.sprint_ids.join(',') }
                    });
                    const sprintCards = response.data;
                    await Promise.all(
                        sprintCards.map((c: any) => updateCard(c.id, { bdd_validated: value }))
                    );
                }
            } else if (requirementKey === 'cards_done') {
                // Mark ALL cards as done
                if (execution.sprint_ids && execution.sprint_ids.length > 0) {
                    const { api } = await import('@/services/client');
                    const response = await api.get(`/cards/`, {
                        params: { sprint_ids: execution.sprint_ids.join(',') }
                    });
                    const sprintCards = response.data;
                    await Promise.all(
                        sprintCards.map((c: any) => updateCard(c.id, { status: value ? 'done' : 'assurance' }))
                    );
                }
            }
        } catch (err) {
            console.error('Failed to toggle requirement:', err);
        }
    };

    return (
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
                {(() => {
                    const ctx = execution.context_data || {};
                    const gitBranch = ctx.git_branch;
                    const prUrl = ctx.pr_url;
                    const ciStatus = ctx.ci_status;
                    const retryCount = ctx.retry_count;
                    if (!gitBranch && !prUrl && !ciStatus) return null;
                    const ciBadge = ciStatus === 'success'
                        ? <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/20 border border-emerald-500/30 text-emerald-300">CI: passed</span>
                        : (ciStatus === 'failed' || ciStatus === 'failure')
                        ? <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-red-500/20 border border-red-500/30 text-red-300">CI: failed</span>
                        : ciStatus
                        ? <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/20 border border-amber-500/30 text-amber-300">CI: {ciStatus}</span>
                        : null;
                    return (
                        <div className="flex flex-wrap items-center gap-3 mt-2 text-[9px] text-white/40">
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

            {/* Left Panel Content */}
            {viewMode === 'cockpit' ? (
                <div className="flex-1 flex flex-col overflow-hidden">
                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                        {/* Project & Sprints Header */}
                        <ExecutionProjectSprintDetails
                            project={project}
                            sprints={sprints}
                            execution={execution}
                            templates={templates}
                            executionTree={executionTree}
                        />

                        {/* Agent Context Header */}
                        <ExecutionAgentContext
                            execution={execution}
                            templates={templates}
                            setIsAgentModalOpen={setIsAgentModalOpen}
                            setIsToolsModalOpen={setIsToolsModalOpen}
                        />

                        <div className="p-6 space-y-8">
                            <ExecutionPromptSnapshot
                                execution={execution}
                                entryReviewed={entryReviewed}
                                setEntryReviewed={setEntryReviewed}
                                handleRefresh={handleRefresh}
                                isRefreshing={isRefreshing}
                            />

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
                        <ExecutionRequirementsChecklist
                            execution={execution}
                            templates={templates}
                            cards={cards}
                            onRequirementToggle={handleRequirementToggle}
                        />

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
                <ExecutionHistoryTree
                    projectId={projectId}
                    execution={execution}
                    executionTree={executionTree}
                    setViewMode={setViewMode}
                />
            )}
        </div>
    );
};
