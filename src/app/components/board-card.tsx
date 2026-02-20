import { motion } from 'motion/react';
import { Card as CardContainer } from './card';
import { Flame, AlertCircle, CircleMinus, Calendar } from 'lucide-react';
import { Card as CardType } from '@/services/api';
import { formatToSaoPauloShort } from '@/lib/date-utils';

interface BoardCardProps {
    card: CardType;
    onClick?: (card: CardType) => void;
    projectName?: string;
    boardColor?: string; // Expected to be in a format compatible with CSS background/border
    epic?: { name: string; color: string };
}

export function BoardCard({ card, onClick, projectName, boardColor = 'rgba(168, 85, 247, 0.5)', epic }: BoardCardProps) {
    const taskCount = card.tasks?.length || 0;

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
                    boxShadow: `0 4px 15px rgba(0, 0, 0, 0.2)`
                }}
            >
                <div className="flex flex-col gap-1">
                    {/* Top row: Project Name and Epic Tag (Global Board) */}
                    {projectName ? (
                        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                            <div
                                className="text-[10px] font-bold uppercase tracking-widest"
                                style={{ color: boardColor.includes('#') ? boardColor : `rgb(${boardColor})` }}
                            >
                                {projectName}
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
                        </div>
                    ) : (
                        /* Top row: Epic Tag only (Project Board) */
                        epic && (
                            <div className="mb-1.5">
                                <div
                                    className="text-[9px] px-1.5 py-0.5 rounded-full flex items-center gap-1 font-medium w-fit"
                                    style={{
                                        backgroundColor: `${epic.color}20`,
                                        border: `1px solid ${epic.color}40`,
                                        color: epic.color
                                    }}
                                >
                                    <div className="w-1.5 h-1.5 rounded-full shadow-[0_0_5px_currentColor]" style={{ backgroundColor: epic.color }} />
                                    {epic.name}
                                </div>
                            </div>
                        )
                    )}

                    <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2 mb-1">
                                <h3
                                    className="font-bold text-sm truncate"
                                    style={{ color: 'var(--snaps-text-primary)' }}
                                >
                                    {card.title}
                                </h3>
                                <div className="flex-shrink-0">
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
