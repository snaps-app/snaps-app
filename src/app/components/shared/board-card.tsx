import type { Card } from '@/services/types';
import { motion } from 'motion/react';
import { Card as CardContainer } from '@/app/components/shared/card';
import { Flame, AlertCircle, CircleMinus, Calendar, Bug, LifeBuoy, Wrench, Sparkles, ShieldCheck } from 'lucide-react';
import { formatToSaoPauloShort } from '@/lib/date-utils';

interface BoardCardProps {
    card: Card;
    onClick?: (card: Card) => void;
    projectName?: string;
    boardColor?: string; // Expected to be in a format compatible with CSS background/border
    epic?: { name: string; color: string };
    sprint?: { name: string; tag: string };
}

export function BoardCard({ card, onClick, projectName, boardColor = 'rgba(168, 85, 247, 0.5)', epic, sprint }: BoardCardProps) {
    const taskCount = card.task_count || card.tasks?.length || 0;

    const getPriorityIcon = () => {
        switch (card.priority) {
            case 'High':
                return <Flame className="w-4 h-4 text-red-500 filter drop-shadow-[0_0_5px_rgba(239, 68, 68, 0.5)]" />;
            case 'Medium':
                return <AlertCircle className="w-4 h-4 text-yellow-500 filter drop-shadow-[0_0_5px_rgba(245, 158, 11, 0.5)]" />;
            case 'Low':
                return <CircleMinus className="w-4 h-4 text-green-500 filter drop-shadow-[0_0_5px_rgba(34, 197, 94, 0.5)]" />;
            default:
                return null;
        }
    };

    const getTypeIcon = () => {
        switch (card.card_type) {
            case 'bug':
                return <Bug className="w-3 h-3 text-red-400" />;
            case 'support':
                return <LifeBuoy className="w-3 h-3 text-blue-400" />;
            case 'tech-debt':
                return <Wrench className="w-3 h-3 text-orange-400" />;
            case 'feature':
            default:
                return <Sparkles className="w-3 h-3 text-emerald-400" />;
        }
    };

    const getTypeColor = () => {
        switch (card.card_type) {
            case 'bug': return '#ef4444';
            case 'support': return '#3b82f6';
            case 'tech-debt': return '#f59e0b';
            case 'feature':
            default: return '#10b981';
        }
    };

    // Ensure boardColor has correct opacity for border
    const borderStyle = boardColor.includes('rgba')
        ? boardColor
        : boardColor.startsWith('#')
            ? `${boardColor}80` // Add 50% opacity to hex
            : `rgba(${boardColor}, 0.5)`;

    return (
        <motion.div
            whileHover={{ scale: 1.02, y: -2 }}
            onClick={() => onClick?.(card)}
            className="cursor-pointer mb-3"
        >
            <CardContainer
                size="compact"
                style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    backdropFilter: 'blur(20px)',
                    border: `1px solid ${borderStyle}`,
                    position: 'relative',
                    boxShadow: `0 4px 15px rgba(0, 0, 0, 0.2)`,
                    borderLeft: `3px solid ${getTypeColor()}`
                }}
            >
                <div className="flex flex-col gap-1">
                    {/* Top row: Project Name and Epic Tag (Global Board) */}
                    <div className="flex items-start justify-between gap-4 mb-1.5">
                        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
                            {projectName && (
                                <div
                                    className="text-[10px] font-bold uppercase tracking-widest truncate"
                                    style={{ color: boardColor.includes('#') ? boardColor : `rgb(${boardColor})` }}
                                >
                                    {projectName}
                                </div>
                            )}
                            
                            {/* Card Type Tag */}
                            <div 
                                className="text-[8px] px-1 py-0.25 rounded uppercase font-bold flex items-center gap-1"
                                style={{
                                    backgroundColor: `${getTypeColor()}20`,
                                    border: `1px solid ${getTypeColor()}40`,
                                    color: getTypeColor()
                                }}
                            >
                                {getTypeIcon()}
                                {card.card_type || 'feature'}
                            </div>

                            {epic && (
                                <div
                                    className="text-[9px] px-1.5 py-0.5 rounded-full flex items-center gap-1 font-medium"
                                    style={{
                                        backgroundColor: `${epic.color}20`,
                                        border: `1px solid ${epic.color}40`,
                                        color: epic.color
                                    }}
                                >
                                    <div className="w-1 h-1 rounded-full shadow-[0_0_3px_currentColor]" style={{ backgroundColor: epic.color }} />
                                    {epic.name}
                                </div>
                            )}
                            {sprint && (
                                <div className="text-[9px] px-1.5 py-0.5 rounded-full flex items-center gap-1 font-medium bg-purple-500/20 border border-purple-500/40 text-purple-400">
                                    🚀 {sprint.tag}
                                </div>
                            )}
                        </div>
                        {card.code && (
                            <div className="flex-shrink-0 text-white/50 text-[10px] bg-white/5 border border-white/10 px-1.5 py-0.5 rounded font-mono leading-none h-fit">
                                {card.code}
                            </div>
                        )}
                    </div>

                    <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2 mb-1">
                                <h3
                                    className="font-bold text-sm truncate flex-1"
                                    style={{ color: 'var(--snaps-text-primary)' }}
                                >
                                    {card.title}
                                </h3>
                                <div className="flex-shrink-0 flex items-center gap-2">
                                    {card.bdd_validated ? (
                                        <span title="BDD Validated"><ShieldCheck className="w-4 h-4 text-green-500 filter drop-shadow-[0_0_5px_rgba(34,197,94,0.4)]" /></span>
                                    ) : card.bdd_scenarios && card.bdd_scenarios.length > 0 ? (
                                        <span title="Has BDD Scenarios"><ShieldCheck className="w-4 h-4 text-purple-400 opacity-60" /></span>
                                    ) : (
                                        <span title="Missing BDD"><ShieldCheck className="w-4 h-4 text-white/10" /></span>
                                    )}
                                    {getPriorityIcon()}
                                </div>
                            </div>

                            <div
                                className="text-[11px] font-medium opacity-60 flex items-center justify-between gap-1.5"
                                style={{ color: 'var(--snaps-text-secondary)' }}
                            >
                                <div className="flex items-center gap-1.5">
                                    <span className="w-1 h-1 rounded-full bg-current" />
                                    {taskCount} tasks
                                </div>

                                {card.due_date && (
                                    <div className="flex items-center gap-1 text-[10px]">
                                        <Calendar className="w-3 h-3 opacity-50" />
                                        {formatToSaoPauloShort(card.due_date)}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </CardContainer>
        </motion.div>
    );
}
