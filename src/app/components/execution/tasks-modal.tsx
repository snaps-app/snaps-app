import React from 'react';
import { CheckSquare, X, Check } from 'lucide-react';
import type { Card } from '@/services/types';

interface TasksModalProps {
    isOpen: boolean;
    onClose: () => void;
    cards: Card[];
}

export const TasksModal: React.FC<TasksModalProps> = ({
    isOpen,
    onClose,
    cards
}) => {
    if (!isOpen) return null;

    const allTaskCards = cards.filter(c => c.tasks && c.tasks.length > 0);
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
                        onClick={onClose}
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
                                            <span className={`text-xs leading-relaxed transition-colors ${task.completed ? 'text-white/30 line-through' : 'text-white/70'}`}>
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
                        onClick={onClose}
                        className="px-6 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold transition-all shadow-lg shadow-emerald-900/20"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};
