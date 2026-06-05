import type { DailyExecutionWithProject, RoutineWithStatus } from '@/services/types';
import { useState, useMemo } from 'react';
import { Rocket, Check, Ban, Copy, Repeat, Circle, SkipForward, Pencil } from 'lucide-react';
import { ScrollArea } from '@/app/components/ui/scroll-area';

interface DailyExecutionTimelineProps {
    executions: DailyExecutionWithProject[];
    routines?: RoutineWithStatus[];
    loading?: boolean;
    onAddExecution?: () => void;
    onEditExecution?: (execution: DailyExecutionWithProject) => void;
    onCloneYesterday?: () => Promise<void>;
    onToggleRoutineStatus?: (routineId: string, date: string, newStatus: string) => Promise<void>;
    onEditRoutine?: (routine: RoutineWithStatus) => void;
    onAddRoutine?: () => void;
    date?: string;
    className?: string;
}

type TimelineItem =
    | { type: 'execution'; data: DailyExecutionWithProject; sortKey: string }
    | { type: 'routine'; data: RoutineWithStatus; sortKey: string };

const ROUTINE_STATUS_CYCLE = ['planned', 'executed', 'blocked', 'skipped'] as const;

const ROUTINE_STATUS_CONFIG: Record<string, { icon: typeof Check; color: string }> = {
    planned: { icon: Circle, color: 'text-zinc-400' },
    executed: { icon: Check, color: 'text-green-400' },
    blocked: { icon: Ban, color: 'text-red-400' },
    skipped: { icon: SkipForward, color: 'text-zinc-500' },
};

export function DailyExecutionTimeline({
    executions,
    routines = [],
    loading = false,
    onAddExecution,
    onEditExecution,
    onCloneYesterday,
    onToggleRoutineStatus,
    onEditRoutine,
    onAddRoutine,
    date,
    className = ""
}: DailyExecutionTimelineProps) {
    const [cloning, setCloning] = useState(false);
    const [togglingId, setTogglingId] = useState<string | null>(null);

    const handleClone = async () => {
        if (!onCloneYesterday || cloning) return;
        setCloning(true);
        try {
            await onCloneYesterday();
        } finally {
            setCloning(false);
        }
    };

    const handleToggleRoutine = async (routine: RoutineWithStatus) => {
        if (!onToggleRoutineStatus || !date || togglingId) return;
        const currentStatus = routine.completion_status || 'planned';
        const currentIdx = ROUTINE_STATUS_CYCLE.indexOf(currentStatus as any);
        const nextStatus = ROUTINE_STATUS_CYCLE[(currentIdx + 1) % ROUTINE_STATUS_CYCLE.length];
        setTogglingId(routine.id);
        try {
            await onToggleRoutineStatus(routine.id, date, nextStatus);
        } finally {
            setTogglingId(null);
        }
    };

    // Merge executions + routines into a single chronological list
    const timelineItems = useMemo<TimelineItem[]>(() => {
        const items: TimelineItem[] = [];

        executions.forEach(exec => {
            items.push({ type: 'execution', data: exec, sortKey: exec.start_hour || '99:99' });
        });

        routines.forEach(routine => {
            items.push({ type: 'routine', data: routine, sortKey: routine.default_start_hour || '99:99' });
        });

        items.sort((a, b) => a.sortKey.localeCompare(b.sortKey));
        return items;
    }, [executions, routines]);

    const totalCount = executions.length + routines.length;

    return (
        <div className={`flex flex-col bg-black/40 backdrop-blur-md rounded-2xl border border-white/10 shadow-2xl p-4 md:p-6 relative ${className}`}>
            <div className="flex items-center gap-2 md:gap-3 mb-4 md:mb-6 flex-wrap">
                <Rocket className="w-5 h-5 text-rose-400" />
                <h2 className="text-lg md:text-xl font-bold text-white">Daily Executions</h2>
                {!loading && (
                    <span className="text-xs bg-white/10 text-zinc-300 px-2 py-0.5 rounded-full">{totalCount}</span>
                )}
                <div className="flex-1" />
                {onAddRoutine && (
                    <button
                        onClick={onAddRoutine}
                        className="text-xs md:text-sm px-2 md:px-3 py-1 md:py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 font-medium transition-colors border border-amber-500/20"
                    >
                        + Routine
                    </button>
                )}
                {onAddExecution && (
                    <button
                        onClick={onAddExecution}
                        className="text-xs md:text-sm px-2 md:px-4 py-1 md:py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white font-medium transition-colors border border-white/5"
                    >
                        + Execution
                    </button>
                )}
            </div>

            <ScrollArea className="flex-1 flex flex-col gap-3 pr-2 relative">
                {loading ? (
                    <div className="text-zinc-500 text-sm flex-1 flex flex-col items-center justify-center italic animate-pulse">
                        Loading executions...
                    </div>
                ) : totalCount === 0 ? (
                    <div className="text-zinc-500 text-sm flex-1 flex flex-col items-center justify-center italic">
                        <Rocket className="w-12 h-12 text-zinc-700/50 mb-3" />
                        No planned executions for today
                    </div>
                ) : (
                    <div className="ml-4 pl-6 border-l-2 border-white/5 space-y-6 py-2">
                        {timelineItems.map((item) => {
                            if (item.type === 'execution') {
                                const exec = item.data;
                                return (
                                    <div key={`exec-${exec.id}`} className="relative">
                                        {/* Timeline dot */}
                                        <div className="absolute -left-[30px] top-4 w-[10px] h-[10px] rounded-full ring-4 ring-black"
                                            style={{ backgroundColor: exec.epic_color || '#F43F5E' }}
                                        />

                                        <div
                                            onClick={() => onEditExecution?.(exec)}
                                            className="bg-white/5 border border-white/10 p-4 rounded-xl flex flex-col gap-2 hover:bg-white/10 transition-all cursor-pointer group"
                                        >
                                            <div className="flex justify-between items-start">
                                                <div className="flex flex-col gap-1 min-w-0 flex-1">
                                                    <div className="flex items-center gap-2">
                                                        <h3 className="font-semibold text-zinc-100 group-hover:text-rose-300 transition-colors text-base md:text-lg truncate">
                                                            {exec.title}
                                                        </h3>
                                                        {exec.status === 'executed' && <Check className="w-4 h-4 text-green-400 flex-shrink-0" />}
                                                        {exec.status === 'blocked' && <Ban className="w-4 h-4 text-red-400 flex-shrink-0" />}
                                                    </div>
                                                </div>
                                                <span className="text-xs font-mono bg-black/40 px-2 py-1 rounded text-zinc-400 whitespace-nowrap ml-2 md:ml-3 border border-white/5">
                                                    {exec.start_hour} - {exec.end_hour}
                                                </span>
                                            </div>
                                            {exec.description && (
                                                <p className="text-sm text-zinc-400 leading-relaxed line-clamp-2">{exec.description}</p>
                                            )}
                                            <div className="mt-2 flex items-center gap-2 text-[10px] uppercase font-bold text-zinc-500">
                                                <span
                                                    className="px-2 py-0.5 rounded-full border border-white/5"
                                                    style={exec.board_color ? { backgroundColor: `${exec.board_color}20`, color: exec.board_color, borderColor: `${exec.board_color}30` } : { backgroundColor: 'rgba(255,255,255,0.05)' }}
                                                >
                                                    {exec.project_name}
                                                </span>
                                                {exec.epic_name && (
                                                    <span className="px-2 py-0.5 rounded-full border border-current" style={{ color: exec.epic_color || '#F43F5E' }}>
                                                        {exec.epic_name}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            } else {
                                // Routine item
                                const routine = item.data;
                                const status = routine.completion_status || 'planned';
                                const config = ROUTINE_STATUS_CONFIG[status] || ROUTINE_STATUS_CONFIG.planned;
                                const StatusIcon = config.icon;
                                const isToggling = togglingId === routine.id;
                                const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

                                return (
                                    <div key={`routine-${routine.id}`} className="relative">
                                        {/* Timeline dot — amber for routines */}
                                        <div className="absolute -left-[30px] top-4 w-[10px] h-[10px] rounded-full ring-4 ring-black bg-amber-400" />

                                        <div className={`border border-amber-500/20 p-3 md:p-4 rounded-xl flex items-center gap-2 md:gap-3 transition-all flex-wrap ${status === 'executed' || status === 'skipped' ? 'opacity-50 bg-amber-500/5' : 'bg-amber-500/10 hover:bg-amber-500/15'}`}>
                                            {/* Status toggle */}
                                            <button
                                                onClick={() => handleToggleRoutine(routine)}
                                                disabled={isToggling}
                                                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:scale-110 active:scale-95 ${config.color} disabled:opacity-50 border border-amber-500/20`}
                                                title={`Status: ${status} — click to cycle`}
                                            >
                                                <StatusIcon className="w-4 h-4" />
                                            </button>

                                            {/* Content */}
                                            <div className="flex flex-col flex-1 min-w-0">
                                                <span className={`font-semibold text-sm ${status === 'executed' ? 'line-through text-zinc-400' : status === 'skipped' ? 'line-through text-zinc-500' : 'text-zinc-100'}`}>
                                                    {routine.title}
                                                </span>
                                                {routine.description && (
                                                    <p className="text-xs text-zinc-500 line-clamp-1 mt-0.5">{routine.description}</p>
                                                )}
                                            </div>

                                            {/* Time */}
                                            {routine.default_start_hour && (
                                                <span className="text-xs font-mono bg-black/40 px-2 py-1 rounded text-amber-400/70 whitespace-nowrap border border-amber-500/10">
                                                    {routine.default_start_hour}{routine.default_end_hour ? ` - ${routine.default_end_hour}` : ''}
                                                </span>
                                            )}

                                            {/* Recurrence badge - hidden on small screens */}
                                            <span className="hidden sm:flex text-[10px] uppercase font-bold text-amber-400/60 items-center gap-1 whitespace-nowrap">
                                                <Repeat className="w-3 h-3" />
                                                {routine.recurrence_type === 'daily'
                                                    ? 'Daily'
                                                    : routine.recurrence_days.map(d => DAY_LABELS[d]).join(', ')
                                                }
                                            </span>

                                            {/* Edit */}
                                            {onEditRoutine && (
                                                <button
                                                    onClick={() => onEditRoutine(routine)}
                                                    className="p-1.5 rounded-lg hover:bg-white/10 text-zinc-500 hover:text-zinc-300 transition-colors"
                                                    title="Edit routine"
                                                >
                                                    <Pencil className="w-3.5 h-3.5" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            }
                        })}
                    </div>
                )}

                {onCloneYesterday && (
                    <button
                        onClick={handleClone}
                        disabled={cloning}
                        className="mt-4 w-full text-sm py-2.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 font-medium transition-colors border border-amber-500/20 flex items-center justify-center gap-2 disabled:opacity-50"
                        title="Clone yesterday's planned executions"
                    >
                        <Copy className="w-3.5 h-3.5" />
                        {cloning ? 'Cloning...' : 'Clone Yesterday'}
                    </button>
                )}
            </ScrollArea>
        </div>
    );
}
