import type { CardWithProject, DailyExecutionWithProject, SchedulingWithProject } from '@/services/types';
import { useMemo } from 'react';
import {
    startOfWeek, endOfWeek, eachDayOfInterval, format, isToday
} from 'date-fns';
import { Repeat, Check, Ban } from 'lucide-react';
import type { ExecuteTodayData } from '@/app/components/calendar/execute-today-modal';
import { ScrollArea } from '@/app/components/ui/scroll-area';
import { parseServerDate, formatServerTime } from '@/lib/date-utils';

interface WeekViewProps {
    currentDate: Date;
    schedulings: SchedulingWithProject[];
    dailyExecutions: DailyExecutionWithProject[];
    cards: CardWithProject[];
    loading: boolean;
    onExecute?: (data: ExecuteTodayData) => void;
    onEditExecution?: (execution: DailyExecutionWithProject) => void;
    onEditScheduling?: (s: SchedulingWithProject) => void;
}

export function WeekView({ currentDate, schedulings, dailyExecutions, cards, loading, onExecute, onEditExecution, onEditScheduling }: WeekViewProps) {
    const daysInWeek = useMemo(() => {
        const start = startOfWeek(currentDate, { weekStartsOn: 0 }); // Sunday
        const end = endOfWeek(currentDate, { weekStartsOn: 0 });
        return eachDayOfInterval({ start, end });
    }, [currentDate]);

    const hours = Array.from({ length: 24 }, (_, i) => i);

    if (loading) {
        return (
            <div className="h-full flex items-center justify-center">
                <div className="text-zinc-400">Loading Week View...</div>
            </div>
        );
    }

    // Helper to extract HH:MM into fractional hour (e.g., "09:30" -> 9.5)
    const parseHour = (timeStr: string) => {
        if (!timeStr) return 0;
        const [h, m] = timeStr.split(':').map(Number);
        return (h || 0) + (m || 0) / 60;
    };

    return (
        <div className="flex flex-col h-full bg-black/40 backdrop-blur-md rounded-2xl border border-white/10 shadow-2xl overflow-hidden">
            {/* Header: Days */}
            <div className="flex border-b border-white/10 bg-white/5 pl-16">
                {daysInWeek.map((day, i) => {
                    const isDayToday = isToday(day);
                    return (
                        <div key={day.toISOString()} className={`flex-1 flex flex-col items-center py-3 border-r border-white/5 ${i === 6 ? 'border-r-0' : ''}`}>
                            <span className="text-xs text-zinc-400 uppercase font-semibold">{format(day, 'EEE')}</span>
                            <span className={`text-lg font-bold w-8 h-8 flex flex-col items-center justify-center rounded-full mt-1
                                ${isDayToday ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/30' : 'text-zinc-200'}
                            `}>
                                {format(day, 'd')}
                            </span>
                        </div>
                    );
                })}
            </div>

            {/* All-day / Top events (Schedulings + Cards) */}
            <div className="flex border-b border-white/10 bg-white/[0.02] pl-16 min-h-[40px]">
                {daysInWeek.map((day, i) => {
                    // Filter schedulings and cards for this day
                    const daySchedulings = schedulings.filter(s => {
                        const sStart = parseServerDate(s.start_date);
                        const sEnd = parseServerDate(s.end_date);
                        sStart.setHours(0, 0, 0, 0);
                        sEnd.setHours(23, 59, 59, 999);
                        const d = new Date(day);
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

                    const dayCards = cards.filter(c => {
                        if (!c.due_date) return false;
                        const datePart = c.due_date.substring(0, 10);
                        const [year, month, d] = datePart.split('-').map(Number);
                        return d === day.getDate() &&
                            (month - 1) === day.getMonth() &&
                            year === day.getFullYear();
                    });

                    return (
                        <div key={`allday-${i}`} className={`flex-1 border-r border-white/5 p-1 flex flex-col gap-1 ${i === 6 ? 'border-r-0' : ''}`}>
                            {daySchedulings.filter(s => {
                                const start = parseServerDate(s.start_date);
                                const end = parseServerDate(s.end_date);
                                // If it spans exactly the whole day or more, keep it at top
                                // Otherwise if it's a specific time block, we'll move it to the grid
                                const isAllDay = (start.getHours() === 0 && start.getMinutes() === 0 &&
                                    end.getHours() === 23 && end.getMinutes() === 59);
                                return isAllDay;
                            }).map(s => (
                                <div
                                    key={s.id}
                                    onClick={() => onEditScheduling?.(s)}
                                    className="text-xs px-2 py-0.5 rounded truncate bg-purple-500/20 text-purple-300 border border-purple-500/30 cursor-pointer hover:brightness-110"
                                    title={s.title}
                                >
                                    <div className="flex flex-col gap-0.5 pointer-events-none">
                                        <div className="flex items-center gap-1 truncate mb-0.5">
                                            <span
                                                className="text-[8px] uppercase font-bold px-1 rounded-sm border border-current whitespace-nowrap overflow-hidden text-ellipsis"
                                                style={{ color: s.board_color || '#A855F7', backgroundColor: `${s.board_color || '#A855F7'}10` }}
                                            >
                                                {s.project_name}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-1 truncate font-medium">
                                            {s.recurrence && s.recurrence !== 'none' && <Repeat className="w-2.5 h-2.5" />}
                                            <span className="truncate">{s.title}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {dayCards.map(c => (
                                <div
                                    key={c.id}
                                    onClick={() => onExecute?.({ type: 'card', id: c.id, title: c.title, project_id: c.project_id })}
                                    className="flex items-center gap-1 text-[10px] px-1 py-0.5 rounded border border-white/10 bg-white/5 text-zinc-300 cursor-pointer hover:bg-white/10"
                                    title={c.title}
                                >
                                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: c.board_color || '#A855F7' }} />
                                    <span className="truncate">{c.title}</span>
                                </div>
                            ))}
                        </div>
                    );
                })}
            </div>

            {/* Time Grid */}
            <ScrollArea className="flex-1 flex">
                <div className="relative w-full min-w-[800px] h-[1440px] flex"> {/* 60px per hour * 24 = 1440px */}

                    {/* Hours Column */}
                    <div className="w-16 flex flex-col border-r border-white/10 bg-black/20 text-xs text-zinc-500 select-none">
                        {hours.map(hour => (
                            <div key={hour} className="h-[60px] relative border-b border-white/5 flex items-start justify-end pr-2 py-1">
                                {hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`}
                            </div>
                        ))}
                    </div>

                    {/* Columns */}
                    <div className="flex-1 flex relative">
                        {/* Horizontal grid lines */}
                        <div className="absolute inset-0 flex flex-col pointer-events-none">
                            {hours.map(hour => (
                                <div key={`grid-${hour}`} className="h-[60px] border-b border-white/5 w-full" />
                            ))}
                        </div>

                        {daysInWeek.map((day, i) => {
                            // Filter daily executions for this day
                            const dayStr = format(day, 'yyyy-MM-dd');
                            const dayExecutions = dailyExecutions.filter(de => de.date === dayStr);

                            const dayGridSchedulings = schedulings.filter(s => {
                                const sStart = parseServerDate(s.start_date);
                                const sEnd = parseServerDate(s.end_date);
                                const d = new Date(day);
                                d.setHours(12, 0, 0, 0);

                                let matchesDate = false;
                                const dTime = d.getTime();
                                const sStartTime = new Date(sStart).setHours(0, 0, 0, 0);
                                const sEndTime = new Date(sEnd).setHours(23, 59, 59, 999);

                                if (dTime >= sStartTime && dTime <= sEndTime) {
                                    matchesDate = true;
                                } else if (s.recurrence && s.recurrence !== 'none' && dTime >= sStartTime) {
                                    if (s.recurrence === 'daily') matchesDate = true;
                                    else if (s.recurrence === 'weekly') {
                                        const diffDays = Math.floor((dTime - sStartTime) / (1000 * 60 * 60 * 24));
                                        matchesDate = diffDays % 7 === 0;
                                    }
                                    else if (s.recurrence === 'monthly') matchesDate = d.getDate() === sStart.getDate();
                                }

                                if (!matchesDate) return false;

                                // Only show in grid if it's NOT all-day
                                const isAllDay = (sStart.getHours() === 0 && sStart.getMinutes() === 0 &&
                                    sEnd.getHours() === 23 && sEnd.getMinutes() === 59);
                                return !isAllDay;
                            });

                            return (
                                <div key={`col-${i}`} className={`flex-1 relative border-r border-white/5 ${i === 6 ? 'border-r-0' : ''}`}>
                                    {/* Schedulings in Grid */}
                                    {dayGridSchedulings.map(s => {
                                        const sStart = parseServerDate(s.start_date);
                                        const sEnd = parseServerDate(s.end_date);
                                        const startH = sStart.getHours() + sStart.getMinutes() / 60;
                                        const endH = sEnd.getHours() + sEnd.getMinutes() / 60;
                                        const top = startH * 60;
                                        const height = (endH - startH) * 60;

                                        return (
                                            <div
                                                key={`grid-sched-${s.id}`}
                                                onClick={() => onEditScheduling?.(s)}
                                                className="absolute left-1 right-1 rounded-md p-1.5 text-xs shadow-lg border border-purple-500/30 bg-purple-500/10 text-purple-300 overflow-hidden group hover:z-10 transition-all cursor-pointer"
                                                style={{
                                                    top: `${top}px`,
                                                    height: `${Math.max(height, 24)}px`,
                                                    borderLeftWidth: '4px',
                                                    borderLeftColor: s.epic_color || '#A855F7'
                                                }}
                                                title={`${s.title}\n${formatServerTime(s.start_date)} - ${formatServerTime(s.end_date)}`}
                                            >
                                                <div className="flex flex-col mb-0.5">
                                                    <span
                                                        className="text-[8px] uppercase font-bold px-1 py-0.5 rounded-sm bg-black/20 w-max border border-white/5 whitespace-nowrap"
                                                        style={{ color: s.board_color || '#A855F7' }}
                                                    >
                                                        {s.project_name}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-1 font-semibold truncate leading-tight">
                                                    {s.recurrence && s.recurrence !== 'none' && <Repeat className="w-2.5 h-2.5" />}
                                                    {s.title}
                                                </div>
                                                <div className="text-[9px] opacity-70 mt-0.5 truncate">{formatServerTime(s.start_date)} - {formatServerTime(s.end_date)}</div>
                                            </div>
                                        );
                                    })}

                                    {/* Executions */}
                                    {dayExecutions.map(exec => {
                                        const startH = parseHour(exec.start_hour);
                                        const endH = parseHour(exec.end_hour);
                                        const top = startH * 60;
                                        const height = (endH - startH) * 60;

                                        return (
                                            <div
                                                key={exec.id}
                                                onClick={() => onEditExecution?.(exec)}
                                                className="absolute left-1 right-1 rounded-md p-1.5 text-xs shadow-lg border border-solid overflow-hidden group hover:z-10 transition-all cursor-pointer"
                                                style={{
                                                    top: `${top}px`,
                                                    height: `${Math.max(height, 20)}px`,
                                                    backgroundColor: exec.epic_color ? `${exec.epic_color}30` : 'rgba(0, 212, 255, 0.2)',
                                                    borderColor: exec.epic_color ? `${exec.epic_color}50` : 'rgba(0, 212, 255, 0.3)',
                                                    color: exec.epic_color || '#00D4FF'
                                                }}
                                                title={`${exec.title}\n${exec.start_hour} - ${exec.end_hour}`}
                                            >
                                                <div className="flex flex-col mb-0.5">
                                                    <span
                                                        className="text-[8px] uppercase font-bold px-1 py-0.5 rounded-sm bg-black/20 w-max border border-white/5 whitespace-nowrap"
                                                        style={{ color: exec.board_color || '#00D4FF' }}
                                                    >
                                                        {exec.project_name}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-1 font-semibold truncate leading-tight">
                                                    <span className="truncate">{exec.title}</span>
                                                    {exec.status === 'executed' && <Check className="w-3 h-3 text-green-400 flex-shrink-0" />}
                                                    {exec.status === 'blocked' && <Ban className="w-3 h-3 text-red-400 flex-shrink-0" />}
                                                </div>
                                                <div className="text-[9px] opacity-70 mt-0.5 truncate">{exec.start_hour} - {exec.end_hour}</div>
                                            </div>
                                        );
                                    })}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </ScrollArea>
        </div>
    );
}
