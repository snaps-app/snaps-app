import { Bot, Zap, Network, Wrench, Cpu } from 'lucide-react';
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

        </div>
    );
};
