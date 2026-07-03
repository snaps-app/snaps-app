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
    manualOverrides: Record<string, boolean>;
    setManualOverride: (key: string, value: boolean) => void;
    setIsTimeTrackingModalOpen: (open: boolean) => void;
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
    manualOverrides,
    setManualOverride,
    setIsTimeTrackingModalOpen,
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
        // Primary bypass path: mark the override locally so the next Advance sends force=true.
        setManualOverride(requirementKey, value);
        // Secondary: persist the override server-side (best-effort, non-blocking).
        try {
            const { api } = await import('@/services/client');
            await api.patch(`/api/agent-executions/${execution.id}/manual-requirement`, {
                requirement_key: requirementKey,
                value
            });
        } catch (err) {
            console.error('Failed to persist requirement override:', err);
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
                    const prUrls: string[] = ctx.pr_urls ?? (ctx.pr_url ? [ctx.pr_url] : []);
                    const ciStatus = ctx.ci_status;
                    const retryCount = ctx.retry_count;
                    const prs = ctx.prs;

                    const hasPrsArray = Array.isArray(prs) && prs.length > 0;
                    const hasLegacyGit = gitBranch || prUrls.length > 0;

                    if (!hasPrsArray && !hasLegacyGit && !ciStatus) return null;

                    const ciBadge = ciStatus === 'success'
                        ? <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/20 border border-emerald-500/30 text-emerald-300">CI: passed</span>
                        : (ciStatus === 'failed' || ciStatus === 'failure')
                        ? <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-red-500/20 border border-red-500/30 text-red-300">CI: failed</span>
                        : ciStatus
                        ? <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/20 border border-amber-500/30 text-amber-300">CI: {ciStatus}</span>
                        : null;

                    return (
                        <div className="mt-3 space-y-2">
                            {/* Structured PRs List */}
                            {hasPrsArray ? (
                                <div className="space-y-1 w-full">
                                    <p className="text-[8px] font-black text-white/20 uppercase tracking-widest mb-1.5">Active Repos & PRs</p>
                                    {prs.map((pr: any, i: number) => (
                                        <div key={i} className="flex items-center justify-between gap-3 px-2.5 py-1.5 bg-white/[0.01] border border-white/5 rounded-lg hover:bg-white/[0.03] hover:border-white/10 transition-all group/pr">
                                            <div className="flex items-center gap-2 min-w-0">
                                                <GitBranch className="w-3.5 h-3.5 text-blue-400/50 group-hover/pr:text-blue-400 transition-colors shrink-0" />
                                                <div className="flex flex-col min-w-0">
                                                    <span className="font-bold text-white/50 text-[9px] group-hover/pr:text-white/70 transition-colors truncate" title={pr.repo}>
                                                        {pr.repo}
                                                    </span>
                                                    <span className="font-mono text-blue-300/60 text-[8px] truncate" title={pr.branch}>
                                                        {pr.branch}
                                                    </span>
                                                </div>
                                            </div>
                                            {pr.pr_url && (
                                                <a 
                                                    href={pr.pr_url} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer" 
                                                    className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-purple-500/10 border border-purple-500/20 text-[8px] font-bold text-purple-400 hover:text-white hover:bg-purple-500/20 transition-all shrink-0"
                                                >
                                                    <ExternalLink className="w-2 h-2" />
                                                    <span>PR #{pr.pr_number || 'Link'}</span>
                                                </a>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                /* Legacy Fallback */
                                hasLegacyGit && (
                                    <div className="flex flex-wrap items-center gap-3 text-[9px] text-white/40">
                                        {gitBranch && (
                                            <div className="flex items-center gap-1.5 whitespace-nowrap">
                                                <GitBranch className="w-3 h-3 text-blue-400/60" />
                                                <span className="font-mono text-blue-300/70">{gitBranch}</span>
                                            </div>
                                        )}
                                        {prUrls.map((url, i) => (
                                            <a key={url} href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-purple-300 transition-colors whitespace-nowrap">
                                                <ExternalLink className="w-3 h-3 text-purple-400/60" />
                                                <span>PR{prUrls.length > 1 ? ` #${i + 1}` : ' Link'}</span>
                                            </a>
                                        ))}
                                    </div>
                                )
                            )}

                            {/* CI Status & Retries */}
                            {(ciBadge || (retryCount !== undefined && retryCount > 0)) && (
                                <div className="flex items-center gap-2.5 pt-1">
                                    {ciBadge}
                                    {retryCount !== undefined && retryCount > 0 && (
                                        <span className="text-[9px] text-white/30 font-medium">Retries: {retryCount}</span>
                                    )}
                                </div>
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
                            manualOverrides={manualOverrides}
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
                        {execution.advance_conditions?.info && (
                            <div className="mb-4 p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 animate-in fade-in duration-500">
                                <p className="text-[10px] text-blue-400 font-medium whitespace-pre-wrap">
                                    {execution.advance_conditions.info}
                                </p>
                            </div>
                        )}
                        {(() => {
                            const force = Object.values(manualOverrides).some(Boolean);
                            const isCompleted = execution.status === 'completed';
                            const isDone = execution.status === 'done';
                            const disabled = isAdvancing || (isCompleted && !force);
                            
                            return (
                                <button
                                    onClick={isDone ? () => setIsTimeTrackingModalOpen(true) : handleAdvance}
                                    disabled={disabled}
                                    className={`w-full h-12 ${isDone ? 'bg-green-600 hover:bg-green-500 shadow-green-900/20' : (isCompleted && !force) ? 'bg-blue-600 shadow-blue-900/20 opacity-50 cursor-not-allowed' : 'bg-purple-600 hover:bg-purple-500 shadow-purple-900/20'} text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50`}
                                >
                                    {isAdvancing ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                                        <>
                                            {isDone
                                                ? 'Execution Complete — Exit'
                                                : (isCompleted && !force)
                                                    ? 'Waiting for Siblings...' 
                                                    : (force ? 'Force Advance to Next Phase' : (execution.phase === 'retro' ? 'Finalize & Conclude Sprint' : 'Advance to Next Phase'))
                                            }
                                            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                        </>
                                    )}
                                </button>
                            );
                        })()}
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
