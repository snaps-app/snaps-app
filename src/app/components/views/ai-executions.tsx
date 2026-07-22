import type { AgentTaskExecution, WorkflowTemplate } from '@/services/types';
import React from 'react';
import {
    Bot,
    ChevronRight,
    ChevronDown,
    Clock,
    Zap,
    CheckCircle2,
    AlertCircle,
    History,
    Search,
    Layout as LayoutIcon,
    GitBranch,
    ArrowRight,
    Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { WorkflowFlowPreview } from '@/app/components/workflow/workflow-flow-preview';
import { Spinner } from '@/app/components/ui/spinner';
import { StrategyConfiguratorModal } from '@/app/components/modals/strategy-configurator-modal';
import { useAiExecutions } from '@/app/components/views/useAiExecutions';

export const AIExecutions = () => {
    const {
        navigate,
        projectId,
        executions,
        projects,
        isLoading,
        isCreating,
        error,
        searchTerm,
        setSearchTerm,
        expandedBranch,
        setExpandedBranch,
        isModalOpen,
        setIsModalOpen,
        templates,
        handleDeleteExecution,
        getProjectName,
        isExecutionStuck,
        getBranchStatus,
        isBranchStuck,
        getStalenessDuration,
        sortedRootExecs,
        getBranchChildren,
        getSprintDisplay,
    } = useAiExecutions();

    const statusConfig: Record<string, { icon: React.ReactNode; color: string; bg: string }> = {
        pending: { icon: <Clock className="w-5 h-5" />, color: 'text-white/40', bg: 'bg-white/5 border-white/10' },
        in_progress: { icon: <Zap className="w-5 h-5" />, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
        awaiting_advance: { icon: <Zap className="w-5 h-5" />, color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/20' },
        done: { icon: <CheckCircle2 className="w-5 h-5" />, color: 'text-green-400', bg: 'bg-green-500/10 border-green-500/20' },
        completed: { icon: <CheckCircle2 className="w-5 h-5" />, color: 'text-green-400', bg: 'bg-green-500/10 border-green-500/20' },
        failed: { icon: <AlertCircle className="w-5 h-5" />, color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20' },
    };

    const phaseLabels: Record<string, string> = {
        macro_planning: 'Macro-Planning',
        micro_planning: 'Micro-Planning',
        execution: 'Implementation',
        assurance: 'QA & Testing',
        retro: 'Retrospective',
    };

    const phaseColors: Record<string, string> = {
        macro_planning: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
        micro_planning: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
        execution: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
        assurance: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
        retro: 'text-green-400 bg-green-500/10 border-green-500/20',
    };

    const branchPhaseOrder = ['macro_planning', 'micro_planning', 'execution', 'assurance', 'retro'];
    const getLatestPhase = (execs: AgentTaskExecution[]) => {
        let maxIdx = -1;
        execs.forEach(e => {
            const idx = branchPhaseOrder.indexOf(e.phase);
            if (idx > maxIdx) {
                maxIdx = idx;
            }
        });
        if (maxIdx === -1 && execs.length > 0) {
            return execs[execs.length - 1].phase;
        }
        return maxIdx >= 0 ? branchPhaseOrder[maxIdx] : 'macro_planning';
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
        <div className="min-h-screen" style={{ backgroundColor: 'var(--snaps-bg)' }}>
            <AnimatePresence>
                {(isLoading || isCreating) && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-md"
                    >
                        <Spinner size="lg" label={isCreating ? "Initializing session..." : "Loading sessions..."} color="purple" />
                    </motion.div>
                )}
            </AnimatePresence>
            <div className="max-w-5xl mx-auto px-6 py-12">

                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
                    <div>
                        <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em] mb-2">Orchestration</p>
                        <h1 className="text-3xl font-black text-white flex items-center gap-3 tracking-tight">
                            <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center">
                                <Bot className="w-5 h-5 text-purple-400" />
                            </div>
                            {projectId ? 'Project AI Executions' : 'Global AI Execution History'}
                        </h1>
                        <p className="text-white/30 text-sm mt-2">
                            {projectId
                                ? `Agentic orchestration sessions for ${projects.find(p => p.id === projectId)?.name || 'this project'}.`
                                : 'All agentic orchestration sessions across your projects.'
                            }
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        {projectId && (
                            <button
                                onClick={() => setIsModalOpen(true)}
                                disabled={isCreating}
                                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold text-sm hover:from-purple-500 hover:to-indigo-500 transition-all shadow-lg shadow-purple-500/20 disabled:opacity-50"
                            >
                                <Zap className={`w-4 h-4 ${isCreating ? 'animate-pulse' : ''}`} />
                                {isCreating ? 'Initializing...' : 'New Execution'}
                            </button>
                        )}
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                            <input
                                type="text"
                                placeholder="Search sessions..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-11 pr-5 py-2.5 rounded-xl bg-white/[0.03] border border-white/10 text-white text-sm focus:outline-none focus:border-purple-500/50 w-64 transition-all"
                            />
                        </div>
                    </div>
                </div>

                <StrategyConfiguratorModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    projectId={projectId!}
                />

                {/* Stats */}
                {!isLoading && executions.length > 0 && (
                    <div className="flex items-center gap-6 mb-8 p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                        {[
                            { label: 'Total', value: executions.length, color: 'text-white' },
                            { label: 'Done', value: executions.filter(e => e.status === 'done').length, color: 'text-green-400' },
                            { label: 'Active', value: executions.filter(e => e.status !== 'done' && e.status !== 'failed').length, color: 'text-purple-400' },
                            { label: 'Failed', value: executions.filter(e => e.status === 'failed').length, color: 'text-red-400' },
                        ].map((stat, i) => (
                            <React.Fragment key={stat.label}>
                                {i > 0 && <div className="w-px h-8 bg-white/10" />}
                                <div className="text-center">
                                    <p className={`text-2xl font-black ${stat.color}`}>{stat.value}</p>
                                    <p className="text-[10px] text-white/30 uppercase tracking-widest">{stat.label}</p>
                                </div>
                            </React.Fragment>
                        ))}
                    </div>
                )}

                {/* Error state */}
                {error && (
                    <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                        {error}
                    </div>
                )}

                {/* Branch List */}
                {sortedRootExecs.length > 0 ? (
                    <div className="space-y-3">
                        {sortedRootExecs.map((root) => {
                            const children = getBranchChildren(root.id);
                            const allInBranch = [root, ...children];
                            const latestPhase = getLatestPhase(allInBranch);
                            const branchStatus = getBranchStatus(allInBranch);
                            const sc = statusConfig[branchStatus] || statusConfig['pending'];
                            const isExpanded = expandedBranch === root.id;
                            const branchLabel = root.branch_type === 'hotfix' ? 'Hotfix' : root.branch_type === 'parallel' ? 'Parallel' : 'Main';
                            const branchColor = root.branch_type === 'hotfix' ? 'text-red-400 bg-red-500/10 border-red-500/20' : root.branch_type === 'parallel' ? 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20' : 'text-purple-400 bg-purple-500/10 border-purple-500/20';

                            return (
                                <div key={root.id} className="rounded-2xl border border-white/5 overflow-hidden">
                                    {/* Branch Header */}
                                    <div
                                        onClick={() => setExpandedBranch(isExpanded ? null : root.id)}
                                        className={`group p-5 flex items-center justify-between gap-4 cursor-pointer transition-all ${
                                            isExpanded ? 'bg-white/[0.04] border-b border-white/5' : 'bg-white/[0.02] hover:bg-white/[0.04]'
                                        }`}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className={`w-11 h-11 rounded-xl flex items-center justify-center border shrink-0 ${sc.bg} ${sc.color}`}>
                                                <GitBranch className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <h3 className="font-bold text-white group-hover:text-purple-300 transition-colors">
                                                        {getProjectName(root.project_id)}
                                                    </h3>
                                                    {getSprintDisplay(root.sprint_ids) && (
                                                        <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-lg border border-amber-500/20 text-amber-400 bg-amber-500/10">
                                                            {getSprintDisplay(root.sprint_ids)}
                                                        </span>
                                                    )}
                                                    <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-lg border ${branchColor}`}>
                                                        {branchLabel}
                                                    </span>
                                                    <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-lg border ${phaseColors[latestPhase] || 'text-white/30 bg-white/5 border-white/10'}`}>
                                                        {getDynamicPhaseLabel(latestPhase, root.workflow_template_id)}
                                                    </span>
                                                    {isBranchStuck(allInBranch) && (
                                                        <span 
                                                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-orange-500/20 text-orange-400 border border-orange-500/30 text-[9px] font-black uppercase tracking-wider animate-pulse"
                                                            title={`Uma ou mais execuções travadas na branch. Sem atividade há ${getStalenessDuration(
                                                                [...allInBranch].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())[0]?.updated_at
                                                            )}`}
                                                        >
                                                            ⚠️ Travada
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-4 text-xs text-white/25">
                                                    <span className="flex items-center gap-1.5">
                                                        <History className="w-3 h-3" />
                                                        {new Date(root.created_at).toLocaleString()}
                                                    </span>
                                                    <span className="font-mono text-white/20">{allInBranch.length} executions</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4 shrink-0">
                                            {/* Phase Pipeline */}
                                            <div className="hidden md:flex items-center gap-1">
                                                {branchPhaseOrder.map((ph, i) => {
                                                    const sortedForPh = [...allInBranch].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
                                                    const phExecs = sortedForPh.filter(e => e.phase === ph);
                                                    const phExec = phExecs[phExecs.length - 1];
                                                    if (!phExec) return (
                                                        <div key={ph} className="flex items-center gap-1">
                                                            {i > 0 && <div className="w-3 h-px bg-white/10" />}
                                                            <div className="w-2 h-2 rounded-full bg-white/5 border border-white/10" title={phaseLabels[ph]} />
                                                        </div>
                                                    );
                                                    const phSc = statusConfig[phExec.status] || statusConfig['pending'];
                                                    return (
                                                        <div key={ph} className="flex items-center gap-1">
                                                            {i > 0 && <div className="w-3 h-px bg-white/20" />}
                                                            <div className={`w-2 h-2 rounded-full border ${phSc.bg} ${phSc.color}`} title={`${phaseLabels[ph]}: ${phExec.status}`} />
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                            <span className={`text-xs font-bold uppercase tracking-wider ${sc.color}`}>
                                                {branchStatus.replace(/_/g, ' ')}
                                            </span>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDeleteExecution(root.id);
                                                }}
                                                className="p-2 rounded-xl text-white/20 hover:text-red-400 hover:bg-red-500/10 transition-all border border-transparent hover:border-red-500/20 shrink-0"
                                                title="Excluir Execução"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                            {isExpanded
                                                ? <ChevronDown className="w-4 h-4 text-purple-400" />
                                                : <ChevronRight className="w-4 h-4 text-white/20 group-hover:text-purple-400 transition-colors" />
                                            }
                                        </div>
                                    </div>

                                    {/* Expanded: individual executions */}
                                    <AnimatePresence>
                                        {isExpanded && (() => {
                                            const branchTemplate = templates.find(t => t.id === root.workflow_template_id) || templates[0];
                                            const activeExec = allInBranch.find(e => ['in_progress', 'awaiting_advance', 'pending'].includes(e.status));
                                            const activePhaseKey = activeExec ? activeExec.phase : (allInBranch[allInBranch.length - 1]?.phase);
                                            const completedPhaseKeys = allInBranch.filter(e => ['done', 'completed'].includes(e.status)).map(e => e.phase);

                                            return (
                                                <motion.div
                                                    initial={{ height: 0, opacity: 0 }}
                                                    animate={{ height: 'auto', opacity: 1 }}
                                                    exit={{ height: 0, opacity: 0 }}
                                                    transition={{ duration: 0.2 }}
                                                    className="overflow-hidden bg-black/20"
                                                >
                                                    {branchTemplate && (
                                                        <div className="px-5 py-4 border-b border-white/5 space-y-3 bg-white/[0.01]">
                                                            <div className="flex items-center justify-between">
                                                                <p className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em] flex items-center gap-1.5">
                                                                    <LayoutIcon className="w-3.5 h-3.5 text-purple-400" />
                                                                    Workflow Progress Pipeline
                                                                </p>
                                                                <span className="text-[9px] text-white/40 font-mono">Template: {branchTemplate.name}</span>
                                                            </div>
                                                            <div className="h-40 w-full">
                                                                <WorkflowFlowPreview 
                                                                    phases={branchTemplate.phases} 
                                                                    activePhaseKey={activePhaseKey}
                                                                    completedPhaseKeys={completedPhaseKeys}
                                                                />
                                                            </div>
                                                        </div>
                                                    )}
                                                    <div className="p-3 space-y-1">
                                                    {allInBranch
                                                        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
                                                        .map((exec, idx) => {
                                                            const esc = statusConfig[exec.status] || statusConfig['pending'];
                                                            return (
                                                                <div
                                                                    key={exec.id}
                                                                    onClick={() => navigate(`/project/${exec.project_id}/execution/${exec.id}`)}
                                                                    className="group flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/5 cursor-pointer transition-all"
                                                                >
                                                                    <div className="flex items-center gap-2 shrink-0">
                                                                        <div className="w-px h-4 bg-white/10" />
                                                                        <div className={`w-6 h-6 rounded-lg flex items-center justify-center border text-[10px] ${esc.bg} ${esc.color}`}>
                                                                            {idx + 1}
                                                                        </div>
                                                                    </div>
                                                                    <div className="flex-1 min-w-0">
                                                                        <div className="flex items-center gap-2">
                                                                            <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded border ${phaseColors[exec.phase] || 'text-white/30 bg-white/5 border-white/10'}`}>
                                                                                {getDynamicPhaseLabel(exec.phase, root.workflow_template_id)}
                                                                            </span>
                                                                            {getSprintDisplay(exec.sprint_ids) && (
                                                                                <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded border border-amber-500/20 text-amber-400 bg-amber-500/10">
                                                                                    {getSprintDisplay(exec.sprint_ids)}
                                                                                </span>
                                                                            )}
                                                                            <span className="text-xs text-white/40 font-mono truncate">{exec.agent_name}</span>
                                                                        </div>
                                                                        <p className="text-[10px] text-white/20 mt-0.5">{new Date(exec.created_at).toLocaleString()}</p>
                                                                    </div>
                                                                    <div className="flex items-center gap-2 shrink-0">
                                                                        {isExecutionStuck(exec) && (
                                                                            <span 
                                                                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-orange-500/20 text-orange-400 border border-orange-500/30 text-[9px] font-black uppercase tracking-wider"
                                                                                title={`Sem atividade há ${getStalenessDuration(exec.updated_at)} (Última atividade: ${new Date(exec.updated_at).toLocaleString()})`}
                                                                            >
                                                                                ⚠️ Travada
                                                                            </span>
                                                                        )}
                                                                        <span className={`text-[10px] font-bold uppercase ${esc.color}`}>{exec.status.replace(/_/g, ' ')}</span>
                                                                        <ArrowRight className="w-3.5 h-3.5 text-white/10 group-hover:text-purple-400 transition-colors" />
                                                                    </div>
                                                                </div>
                                                            );
                                                        })
                                                    }
                                                    </div>
                                                </motion.div>
                                            );
                                        })()}
                                    </AnimatePresence>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="py-32 text-center rounded-3xl border border-dashed border-white/10">
                        <Bot className="w-14 h-14 text-white/5 mx-auto mb-5" />
                        <h3 className="text-lg font-bold text-white/20 mb-2">No executions yet</h3>
                        <p className="text-white/10 text-sm">Select Sprints on the Board and click Execute to start.</p>
                    </div>
                )}

            </div>
        </div>
    );
};
