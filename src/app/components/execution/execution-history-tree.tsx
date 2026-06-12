import { useNavigate } from 'react-router-dom';
import { Bot, ChevronRight } from 'lucide-react';
import type { AgentTaskExecution } from '@/services/types';

interface ExecutionHistoryTreeProps {
    projectId: string;
    execution: AgentTaskExecution;
    executionTree: AgentTaskExecution[];
    setViewMode: (mode: 'cockpit' | 'branches') => void;
}

export const ExecutionHistoryTree: React.FC<ExecutionHistoryTreeProps> = ({
    projectId,
    execution,
    executionTree,
    setViewMode,
}) => {
    const navigate = useNavigate();

    return (
        <div className="flex-1 flex flex-col min-h-0 bg-black/20">
            <div className="p-4 border-b border-white/5 flex items-center justify-between shrink-0">
                <div>
                    <h2 className="text-[10px] font-black text-white/50 uppercase tracking-[0.2em]">Execution History</h2>
                    <p className="text-[9px] text-white/20 mt-0.5">Hierarchical session branching</p>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto overflow-x-auto custom-scrollbar">
                <div className="py-2 relative min-w-full w-max flex flex-col">
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

                                <div className="flex items-center gap-2 shrink-0">
                                    <Bot className={`w-3.5 h-3.5 shrink-0 ${isCurrent ? 'text-purple-400' : 'text-white/20 group-hover:text-white/40'}`} />

                                    <div className="flex items-center gap-1.5 shrink-0">
                                        <span className={`text-xs font-medium whitespace-nowrap ${isCurrent ? 'text-purple-300' : 'text-white/60 group-hover:text-white/80'}`}>
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

                                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2 text-[9px] font-mono text-white/20 whitespace-nowrap shrink-0 ml-auto pl-4">
                                    <span>{ex.id.split('-')[0]}</span>
                                    <ChevronRight className="w-3 h-3" />
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};
