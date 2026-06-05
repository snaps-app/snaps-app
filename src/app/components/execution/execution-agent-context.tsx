import React from 'react';
import { Bot, Zap, Network, Wrench, Cpu, GitBranch, ExternalLink } from 'lucide-react';
import type { AgentTaskExecution, WorkflowTemplate } from '@/services/types';

interface ExecutionAgentContextProps {
    execution: AgentTaskExecution;
    templates: WorkflowTemplate[];
    setIsAgentModalOpen: (open: boolean) => void;
    setIsToolsModalOpen: (open: boolean) => void;
}

export const ExecutionAgentContext: React.FC<ExecutionAgentContextProps> = ({
    execution,
    templates,
    setIsAgentModalOpen,
    setIsToolsModalOpen,
}) => {
    return (
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
    );
};
