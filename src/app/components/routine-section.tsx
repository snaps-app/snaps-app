import { useState } from 'react';
import { Repeat, Check, Ban, Circle, SkipForward, Pencil } from 'lucide-react';
import type { RoutineWithStatus } from '@/services/api';

interface RoutineSectionProps {
    routines: RoutineWithStatus[];
    loading?: boolean;
    date: string;
    onToggleStatus: (routineId: string, date: string, newStatus: string) => Promise<void>;
    onAddRoutine?: () => void;
    onEditRoutine?: (routine: RoutineWithStatus) => void;
    className?: string;
}

const STATUS_CYCLE = ['planned', 'executed', 'blocked', 'skipped'] as const;

const STATUS_CONFIG: Record<string, { icon: typeof Check; color: string; bg: string; border: string }> = {
    planned: { icon: Circle, color: 'text-zinc-400', bg: 'bg-white/5', border: 'border-white/10' },
    executed: { icon: Check, color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/20' },
    blocked: { icon: Ban, color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20' },
    skipped: { icon: SkipForward, color: 'text-zinc-500', bg: 'bg-zinc-500/10', border: 'border-zinc-500/20' },
};

export function RoutineSection({
    routines,
    loading = false,
    date,
    onToggleStatus,
    onAddRoutine,
    onEditRoutine,
    className = ''
}: RoutineSectionProps) {
    const [togglingId, setTogglingId] = useState<string | null>(null);

    const handleToggle = async (routine: RoutineWithStatus) => {
        if (togglingId) return;
        const currentStatus = routine.completion_status || 'planned';
        const currentIdx = STATUS_CYCLE.indexOf(currentStatus as any);
        const nextStatus = STATUS_CYCLE[(currentIdx + 1) % STATUS_CYCLE.length];

        setTogglingId(routine.id);
        try {
            await onToggleStatus(routine.id, date, nextStatus);
        } finally {
            setTogglingId(null);
        }
    };

    const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    return (
        <div className={`flex flex-col bg-black/40 backdrop-blur-md rounded-2xl border border-white/10 shadow-2xl p-6 ${className}`}>
            <div className="flex items-center gap-3 mb-4">
                <Repeat className="w-5 h-5 text-amber-400" />
                <h2 className="text-xl font-bold text-white">Routines</h2>
                {!loading && (
                    <span className="text-xs bg-white/10 text-zinc-300 px-2 py-0.5 rounded-full">{routines.length}</span>
                )}
                <div className="flex-1" />
                {onAddRoutine && (
                    <button
                        onClick={onAddRoutine}
                        className="text-sm px-4 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white font-medium transition-colors border border-white/5"
                    >
                        + Add Routine
                    </button>
                )}
            </div>

            {loading ? (
                <div className="text-zinc-500 text-sm flex items-center justify-center italic animate-pulse py-4">
                    Loading routines...
                </div>
            ) : routines.length === 0 ? (
                <div className="text-zinc-500 text-sm flex flex-col items-center justify-center italic py-4">
                    <Repeat className="w-10 h-10 text-zinc-700/50 mb-2" />
                    No routines for today
                </div>
            ) : (
                <div className="space-y-2">
                    {routines.map((routine) => {
                        const status = routine.completion_status || 'planned';
                        const config = STATUS_CONFIG[status] || STATUS_CONFIG.planned;
                        const Icon = config.icon;
                        const isToggling = togglingId === routine.id;

                        return (
                            <div
                                key={routine.id}
                                className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${config.bg} ${config.border} ${status === 'executed' || status === 'skipped' ? 'opacity-60' : ''}`}
                            >
                                {/* Status toggle button */}
                                <button
                                    onClick={() => handleToggle(routine)}
                                    disabled={isToggling}
                                    className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:scale-110 active:scale-95 ${config.color} disabled:opacity-50 border ${config.border}`}
                                    title={`Status: ${status} — click to cycle`}
                                >
                                    <Icon className="w-4 h-4" />
                                </button>

                                {/* Info */}
                                <div className="flex flex-col flex-1 min-w-0">
                                    <span className={`font-medium text-sm ${status === 'executed' ? 'line-through text-zinc-400' : status === 'skipped' ? 'line-through text-zinc-500' : 'text-zinc-100'}`}>
                                        {routine.title}
                                    </span>
                                    {routine.default_start_hour && routine.default_end_hour && (
                                        <span className="text-[10px] text-zinc-500 font-mono">
                                            {routine.default_start_hour} - {routine.default_end_hour}
                                        </span>
                                    )}
                                </div>

                                {/* Recurrence badge */}
                                <span className="text-[10px] uppercase font-bold text-amber-400/60 flex items-center gap-1 whitespace-nowrap">
                                    <Repeat className="w-3 h-3" />
                                    {routine.recurrence_type === 'daily'
                                        ? 'Daily'
                                        : routine.recurrence_days.map(d => DAY_LABELS[d]).join(', ')
                                    }
                                </span>

                                {/* Edit button */}
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
                        );
                    })}
                </div>
            )}
        </div>
    );
}
