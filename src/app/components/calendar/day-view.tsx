import type { CardWithProject, DailyExecutionWithProject, RoutineWithStatus, SchedulingWithProject } from '@/services/types';
import { useMemo } from 'react';
import { format } from 'date-fns';
import { CheckCircle2, Clock, CalendarDays, Repeat, Plus } from 'lucide-react';
import type { ExecuteTodayData } from '@/app/components/calendar/execute-today-modal';
import { ScrollArea } from '@/app/components/ui/scroll-area';
import { DailyExecutionTimeline } from '@/app/components/execution/daily-execution-timeline';
import { parseServerDate, formatServerTime } from '@/lib/date-utils';

interface DayViewProps {
    currentDate: Date;
    schedulings: SchedulingWithProject[];
    dailyExecutions: DailyExecutionWithProject[];
    cards: CardWithProject[];
    routines?: RoutineWithStatus[];
    loading: boolean;
    onExecute?: (data: ExecuteTodayData) => void;
    onEditScheduling?: (s: SchedulingWithProject) => void;
    onAddScheduling?: () => void;
    onAddExecution?: () => void;
    onEditExecution?: (execution: DailyExecutionWithProject) => void;
    onCloneYesterday?: () => Promise<void>;
    onToggleRoutineStatus?: (routineId: string, date: string, newStatus: string) => Promise<void>;
    onAddRoutine?: () => void;
    onEditRoutine?: (routine: RoutineWithStatus) => void;
}

export function DayView({
    currentDate,
    schedulings,
    dailyExecutions,
    cards,
    routines = [],
    loading,
    onExecute,
    onEditScheduling,
    onAddScheduling,
    onAddExecution,
    onEditExecution,
    onCloneYesterday,
    onToggleRoutineStatus,
    onAddRoutine,
    onEditRoutine
}: DayViewProps) {

    // Filter data for current day
    const daySchedulings = useMemo(() => {
        const daySchedulings = schedulings.filter(s => {
            const sStart = parseServerDate(s.start_date);
            const sEnd = parseServerDate(s.end_date);
            sStart.setHours(0, 0, 0, 0);
            sEnd.setHours(23, 59, 59, 999);
            const d = new Date(currentDate);
            d.setHours(12, 0, 0, 0);

            // Basic overlap
            if (d >= sStart && d <= sEnd) return true;

            // Recurrence overlap
            if (!s.recurrence || s.recurrence === 'none' || d < sStart) return false;

            if (s.recurrence === 'daily') return true;
            if (s.recurrence === 'weekly') {
                const diffDays = Math.floor((d.getTime() - sStart.getTime()) / (1000 * 60 * 60 * 24));
                return diffDays % 7 === 0;
            }
            if (s.recurrence === 'monthly') return d.getDate() === sStart.getDate();

            return false;
        });
        return daySchedulings;
    }, [schedulings, currentDate]);

    const dayExecutions = useMemo(() => {
        const targetDateStr = format(currentDate, 'yyyy-MM-dd');
        return dailyExecutions
            .filter(de => de.date === targetDateStr)
            .sort((a, b) => a.start_hour.localeCompare(b.start_hour));
    }, [dailyExecutions, currentDate]);

    const activeCards = useMemo(() => {
        // All cards on team_kanban boards that are NOT Done (cards are already scoped to
        // team_kanban boards upstream). "Done" matches any status containing "done".
        const relevant = cards.filter(c => !(c.status?.toLowerCase() || '').includes('done'));

        // Cards with a due date first (earliest first), then the remaining ones.
        const withDue = relevant
            .filter(c => c.due_date)
            .sort((a, b) => a.due_date!.substring(0, 10).localeCompare(b.due_date!.substring(0, 10)));
        const noDue = relevant.filter(c => !c.due_date);

        return [...withDue, ...noDue];
    }, [cards]);

    if (loading) {
        return (
            <div className="h-full flex items-center justify-center">
                <div className="text-zinc-400">Loading Day View...</div>
            </div>
        );
    }

    return (
        <div className="flex flex-col md:flex-row gap-6 h-full">
            {/* Left Column: Schedulings & Cards */}
            <div className="w-full md:w-1/2 flex flex-col gap-6 md:h-full">

                {/* Schedulings Container */}
                <div className="flex flex-col bg-black/40 backdrop-blur-md rounded-2xl border border-white/10 shadow-2xl p-4 md:p-6 h-fit max-h-[50%] flex-shrink-0 transition-all">
                    <div className="flex items-center gap-3 mb-4">
                        <CalendarDays className="w-5 h-5 text-purple-400" />
                        <h2 className="text-xl font-bold text-white">Schedulings</h2>
                        <span className="text-xs bg-white/10 text-zinc-300 px-2 py-0.5 rounded-full">{daySchedulings.length}</span>
                        {onAddScheduling && (
                            <button
                                onClick={onAddScheduling}
                                className="ml-auto flex items-center gap-1 text-xs font-medium text-purple-300 hover:text-purple-200 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 rounded-lg px-2.5 py-1 transition-colors"
                                title="Novo agendamento neste dia"
                            >
                                <Plus className="w-3.5 h-3.5" /> Agendamento
                            </button>
                        )}
                    </div>
                    <ScrollArea className="flex flex-col gap-3 pr-2">
                        {daySchedulings.length === 0 ? (
                            <div className="text-zinc-500 text-sm flex-1 flex items-center justify-center italic">No schedulings for today</div>
                        ) : (
                            daySchedulings.map(s => (
                                <div
                                    key={s.id}
                                    onClick={() => onEditScheduling?.(s)}
                                    className="bg-white/5 border border-white/10 p-3 rounded-xl flex flex-col gap-2 hover:bg-white/10 transition-colors cursor-pointer group"
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-2 min-w-0 flex-1">
                                            <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: s.epic_color || '#A855F7' }} />
                                            <div className="flex items-center gap-1.5 min-w-0">
                                                {s.recurrence && s.recurrence !== 'none' && <Repeat className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />}
                                                <h3 className="font-semibold text-zinc-200 group-hover:text-purple-300 transition-colors truncate text-sm md:text-base">{s.title}</h3>
                                            </div>
                                        </div>
                                    </div>
                                    {s.description && <p className="text-xs text-zinc-400 line-clamp-2">{s.description}</p>}
                                    <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                                        <div className="flex items-center gap-2 text-[10px] uppercase font-bold text-zinc-500">
                                            <span
                                                className="px-2 py-0.5 rounded-full border border-white/5"
                                                style={s.board_color ? { backgroundColor: `${s.board_color}20`, color: s.board_color, borderColor: `${s.board_color}30` } : { backgroundColor: 'rgba(255,255,255,0.05)' }}
                                            >
                                                {s.project_name}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-4 text-[10px] text-zinc-500 font-medium">
                                            <div className="flex items-center gap-1">
                                                <Clock className="w-3 h-3" />
                                                {formatServerTime(s.start_date)} - {formatServerTime(s.end_date)}
                                            </div>
                                            {s.recurrence && s.recurrence !== 'none' && (
                                                <div className="flex items-center gap-1 text-purple-400/80 capitalize">
                                                    <Repeat className="w-3 h-3" />
                                                    {s.recurrence === 'daily' ? 'Repeats daily' :
                                                        s.recurrence === 'weekly' ? 'Repeats weekly' :
                                                            s.recurrence === 'monthly' ? 'Repeats monthly' : s.recurrence}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </ScrollArea>
                </div>

                {/* Cards Container */}
                <div className="flex flex-col bg-black/40 backdrop-blur-md rounded-2xl border border-white/10 shadow-2xl p-4 md:p-6 flex-1 min-h-0">
                    <div className="flex items-center gap-3 mb-4">
                        <CheckCircle2 className="w-5 h-5 text-[#00D4FF]" />
                        <h2 className="text-xl font-bold text-white">Active Cards</h2>
                        <span className="text-xs bg-white/10 text-zinc-300 px-2 py-0.5 rounded-full">{activeCards.length}</span>
                    </div>
                    <ScrollArea className="flex-1 flex flex-col gap-3 pr-2">
                        {activeCards.length === 0 ? (
                            <div className="text-zinc-500 text-sm flex-1 flex items-center justify-center italic">No active cards found</div>
                        ) : (
                            activeCards.map(c => {
                                const st = c.status?.toLowerCase() || '';
                                const isDoing = st.includes('in progress') || st.includes('doing');

                                return (
                                    <div
                                        key={c.id}
                                        onClick={() => onExecute?.({ type: 'card', id: c.id, title: c.title, project_id: c.project_id })}
                                        className="bg-white/5 border border-white/10 p-3 rounded-xl flex flex-col gap-2 hover:bg-white/10 transition-colors cursor-pointer group"
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className="mt-1 flex-shrink-0">
                                                {isDoing ? (
                                                    <div className="w-4 h-4 rounded-full border-2 border-amber-400 border-t-transparent animate-spin" />
                                                ) : (
                                                    <div className="w-4 h-4 rounded-full border-2 border-zinc-500" />
                                                )}
                                            </div>
                                            <div className="flex flex-col flex-1 min-w-0">
                                                <h3 className="font-semibold text-zinc-200 group-hover:text-[#00D4FF] transition-colors truncate">{c.title}</h3>
                                                <div className="flex items-center gap-3 mt-1.5 text-[10px] uppercase font-bold tracking-wider">
                                                    <span
                                                        className="px-2 py-0.5 rounded-full border border-white/5 whitespace-nowrap"
                                                        style={c.board_color ? { backgroundColor: `${c.board_color}20`, color: c.board_color, borderColor: `${c.board_color}30` } : { backgroundColor: 'rgba(255,255,255,0.05)', color: '#a1a1aa' }}
                                                    >
                                                        {c.project_name}
                                                    </span>
                                                    {c.due_date && (
                                                        <span className="text-amber-300 flex items-center gap-1 whitespace-nowrap">
                                                            <Clock className="w-3 h-3" />
                                                            {format(new Date(c.due_date.substring(0, 10) + 'T12:00:00'), 'MMM d')}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </ScrollArea>
                </div>

            </div>

            {/* Right Column: Daily Executions + Routines */}
            <DailyExecutionTimeline
                executions={dayExecutions}
                routines={routines}
                onAddExecution={onAddExecution}
                onEditExecution={onEditExecution}
                onCloneYesterday={onCloneYesterday}
                onToggleRoutineStatus={onToggleRoutineStatus}
                onEditRoutine={onEditRoutine}
                onAddRoutine={onAddRoutine}
                date={format(currentDate, 'yyyy-MM-dd')}
                className="w-full md:w-1/2 md:h-full"
            />
        </div>
    );
}
