import { Zap } from 'lucide-react';
import { BoardCard } from '@/app/components/shared/board-card';
import type { Card, Epic, Sprint } from '@/services/types';

interface CardsPanelProps {
    cards: Card[];
    epics: Epic[];
    sprints: Sprint[];
    setSelectedCard: (card: Card | null) => void;
}

export const CardsPanel: React.FC<CardsPanelProps> = ({
    cards,
    epics,
    sprints,
    setSelectedCard
}) => {
    // Known lanes in display order (Support + Roadmap taxonomies). Any other status
    // present in the cards (e.g. a card-scoped execution) gets its own lane too.
    const KNOWN_STATUSES = ['new-issues', 'triaging', 'backlog', 'planning', 'todo', 'in_progress', 'doing', 'review', 'assurance', 'testing', 'done', 'blocked'];
    const extraStatuses = Array.from(new Set(cards.map(c => c.status))).filter(s => !KNOWN_STATUSES.includes(s));
    const statuses = [...KNOWN_STATUSES, ...extraStatuses];

    return (
        <div className="flex flex-col gap-10 animate-in fade-in slide-in-from-bottom-4 duration-300">
            {cards.length > 0 ? (
                statuses.map(status => {
                    const laneCards = cards.filter(c => c.status === status);
                    if (laneCards.length === 0) return null;

                    const statusDisplay = {
                        'new-issues': { label: 'New Issues', color: 'text-rose-400', border: 'border-rose-500/20' },
                        triaging: { label: 'Triaging', color: 'text-amber-400', border: 'border-amber-500/20' },
                        backlog: { label: 'Backlog', color: 'text-zinc-400', border: 'border-zinc-800' },
                        planning: { label: 'Planning', color: 'text-indigo-400', border: 'border-indigo-500/20' },
                        todo: { label: 'To Do', color: 'text-zinc-400', border: 'border-zinc-800' },
                        in_progress: { label: 'In Progress', color: 'text-blue-400', border: 'border-blue-500/20' },
                        doing: { label: 'In Progress', color: 'text-blue-400', border: 'border-blue-500/20' },
                        review: { label: 'Review', color: 'text-yellow-400', border: 'border-yellow-500/20' },
                        assurance: { label: 'Assurance', color: 'text-purple-400', border: 'border-purple-500/20' },
                        testing: { label: 'Testing', color: 'text-purple-400', border: 'border-purple-500/20' },
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
                    <p className="text-white/20 italic">No cards found for this execution.</p>
                </div>
            )}
        </div>
    );
};
