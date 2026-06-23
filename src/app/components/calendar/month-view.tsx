import type { CardWithProject, SchedulingWithProject } from '@/services/types';
import { useMemo } from 'react';
import {
    startOfMonth, endOfMonth, startOfWeek, endOfWeek,
    eachDayOfInterval, format, isSameMonth, isToday, isWeekend
} from 'date-fns';
import Holidays from 'date-holidays';
import type { ExecuteTodayData } from '@/app/components/calendar/execute-today-modal';
import { Loader2, Repeat } from 'lucide-react';
import { ScrollArea } from '@/app/components/ui/scroll-area';
import { parseServerDate } from '@/lib/date-utils';

interface MonthViewProps {
    currentDate: Date;
    schedulings: SchedulingWithProject[];
    cards: CardWithProject[];
    loading: boolean;
    onExecute?: (data: ExecuteTodayData) => void;
    onEditScheduling?: (s: SchedulingWithProject) => void;
}

export function MonthView({ currentDate, schedulings, cards, loading, onExecute, onEditScheduling }: MonthViewProps) {
    const hd = useMemo(() => new Holidays('BR'), []);

    const daysInMonth = useMemo(() => {
        const monthStart = startOfMonth(currentDate);
        const monthEnd = endOfMonth(monthStart);
        const startDate = startOfWeek(monthStart, { weekStartsOn: 0 }); // Sunday
        const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 }); // Saturday

        return eachDayOfInterval({ start: startDate, end: endDate });
    }, [currentDate]);

    if (loading) {
        return (
            <div className="h-full flex items-center justify-center">
                <Loader2 className="w-10 h-10 animate-spin text-purple-500" />
            </div>
        );
    }

    const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    return (
        <div className="flex flex-col h-full bg-black/40 backdrop-blur-md rounded-2xl border border-white/10 overflow-hidden shadow-2xl">
            {/* Weekdays Header */}
            <div className="grid grid-cols-7 border-b border-white/10 bg-white/5">
                {WEEKDAYS.map(day => (
                    <div key={day} className="py-3 text-center text-sm font-medium text-zinc-400">
                        {day}
                    </div>
                ))}
            </div>

            {/* Grid */}
            <div className="flex-1 grid grid-cols-7 grid-rows-5 auto-rows-fr">
                {daysInMonth.map((day, i) => {
                    const isHoliday = hd.isHoliday(day);
                    const isDayWeekend = isWeekend(day);
                    const isCurrentMonth = isSameMonth(day, currentDate);
                    const isDayToday = isToday(day);

                    // Filter items for this day
                    const daySchedulings = schedulings.filter(s => {
                        const sStart = parseServerDate(s.start_date);
                        const sEnd = parseServerDate(s.end_date);
                        sStart.setHours(0, 0, 0, 0);
                        sEnd.setHours(23, 59, 59, 999);
                        const d = new Date(day);
                        d.setHours(12, 0, 0, 0); // noon avoids timezone boundary issues

                        // Basic overlap
                        if (d >= sStart && d <= sEnd) return true;

                        // Recurrence overlap
                        if (!s.recurrence || s.recurrence === 'none' || d < sStart) return false;

                        if (s.recurrence === 'daily') {
                            return true; // Shows every day after start
                        }

                        if (s.recurrence === 'weekly') {
                            const diffDays = Math.floor((d.getTime() - sStart.getTime()) / (1000 * 60 * 60 * 24));
                            return diffDays % 7 === 0;
                        }

                        if (s.recurrence === 'monthly') {
                            return d.getDate() === sStart.getDate();
                        }

                        return false;
                    });

                    const dayCards = cards.filter(c => {
                        if (!c.due_date) return false;
                        const datePart = c.due_date.substring(0, 10); // Reliable YYYY-MM-DD
                        const [year, month, d] = datePart.split('-').map(Number);
                        return d === day.getDate() &&
                            (month - 1) === day.getMonth() &&
                            year === day.getFullYear();
                    });

                    return (
                        <div
                            key={day.toISOString()}
                            className={`p-2 border-r border-b border-white/5 relative flex flex-col gap-1 transition-colors group hover:bg-white/5
                                ${!isCurrentMonth ? 'opacity-40 bg-black/20' : ''}
                                ${isDayWeekend && isCurrentMonth ? 'bg-red-500/5' : ''}
                                ${isHoliday ? 'bg-amber-500/5' : ''}
                                ${(i + 1) % 7 === 0 ? 'border-r-0' : ''}
                            `}
                        >
                            <div className="flex justify-between items-start">
                                <span className={`text-sm font-semibold w-7 h-7 flex items-center justify-center rounded-full
                                    ${isDayToday ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/30' :
                                        isDayWeekend || isHoliday ? 'text-red-400' : 'text-zinc-300'
                                    }
                                `}>
                                    {format(day, 'd')}
                                </span>
                                {isHoliday && (
                                    <span className="text-[10px] text-amber-500/80 truncate ml-1 leading-tight flex-1" title={isHoliday[0].name}>
                                        {isHoliday[0].name}
                                    </span>
                                )}
                            </div>

                            <ScrollArea className="flex-1 mt-1 flex flex-col gap-1">
                                {daySchedulings.map(s => (
                                    <div
                                        key={`sched-${s.id}`}
                                        onClick={() => onEditScheduling?.(s)}
                                        className="text-xs px-2 py-1 rounded truncate shadow-sm cursor-pointer hover:brightness-110 transition-all border border-solid"
                                        style={{
                                            backgroundColor: s.epic_color ? `${s.epic_color}30` : `${s.board_color || '#A855F7'}20`,
                                            color: s.epic_color || s.board_color || '#d8b4fe',
                                            borderColor: s.epic_color || s.board_color || '#A855F7'
                                        }}
                                        title={s.title}
                                    >
                                        <div className="flex flex-col gap-0.5">
                                            <span
                                                className="text-[8px] uppercase font-bold px-1 rounded-sm w-max border border-current opacity-80"
                                                style={{ color: s.board_color || '#A855F7' }}
                                            >
                                                {s.project_name}
                                            </span>
                                            <div className="flex items-center gap-1 truncate">
                                                {s.recurrence && s.recurrence !== 'none' && <Repeat className="w-2 h-2" />}
                                                <span className="truncate">{s.title}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {dayCards.map(c => (
                                    <div
                                        key={`card-${c.id}`}
                                        onClick={() => onExecute?.({ type: 'card', id: c.id, title: c.title, project_id: c.project_id })}
                                        className="flex items-center gap-1 text-[10px] px-1.5 py-1 rounded shadow-sm border border-white/10 bg-white/5 text-zinc-300 cursor-pointer hover:bg-white/10 transition-colors"
                                        title={c.title}
                                    >
                                        <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: c.board_color || '#A855F7' }} />
                                        <span className="truncate">{c.title}</span>
                                    </div>
                                ))}
                            </ScrollArea>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
