import { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, Loader2, Calendar, Filter, List, CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { getGlobalTimeLogs } from '@/services/timeLogs';
import type { TimeLog, TimeLogFilters } from '@/types/timeLogs';

type ViewTab = 'report' | 'calendar';

function startOfMonth(d: Date): Date {
    return new Date(d.getFullYear(), d.getMonth(), 1);
}

function toISODate(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

const WEEKDAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export function TimeView() {
    const navigate = useNavigate();
    const [logs, setLogs] = useState<TimeLog[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [filterUserId, setFilterUserId] = useState('');
    const [filterProjectId, setFilterProjectId] = useState('');
    const [activeTab, setActiveTab] = useState<ViewTab>('report');
    const [calendarMonth, setCalendarMonth] = useState(() => startOfMonth(new Date()));
    const [selectedDay, setSelectedDay] = useState<string | null>(null);

    const load = useCallback(async () => {
        setIsLoading(true);
        try {
            const params: TimeLogFilters = {};
            if (activeTab === 'calendar') {
                const monthEnd = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 0);
                params.start_date = toISODate(calendarMonth);
                params.end_date = toISODate(monthEnd);
            } else {
                if (startDate) params.start_date = startDate;
                if (endDate) params.end_date = endDate;
            }
            if (filterUserId) params.user_id = filterUserId;
            if (filterProjectId) params.project_id = filterProjectId;
            const data = await getGlobalTimeLogs(params);
            setLogs(data);
        } catch (err) {
            console.error('[TimeView] load error:', err);
        } finally {
            setIsLoading(false);
        }
    }, [activeTab, startDate, endDate, filterUserId, filterProjectId, calendarMonth]);

    useEffect(() => { load(); }, [load]);
    useEffect(() => { setSelectedDay(null); }, [calendarMonth]);

    const calendarDays = useMemo(() => {
        const monthStart = startOfMonth(calendarMonth);
        const monthEnd = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 0);
        const gridStart = new Date(monthStart);
        gridStart.setDate(gridStart.getDate() - gridStart.getDay());
        const gridEnd = new Date(monthEnd);
        gridEnd.setDate(gridEnd.getDate() + (6 - gridEnd.getDay()));
        const days: Date[] = [];
        for (const d = new Date(gridStart); d <= gridEnd; d.setDate(d.getDate() + 1)) days.push(new Date(d));
        return days;
    }, [calendarMonth]);

    const logsByDay = useMemo(() => {
        const map = new Map<string, TimeLog[]>();
        for (const log of logs) {
            const list = map.get(log.date) ?? [];
            list.push(log);
            map.set(log.date, list);
        }
        return map;
    }, [logs]);

    function heatClass(hours: number): string {
        if (hours <= 0) return 'bg-transparent';
        if (hours < 2) return 'bg-purple-500/10';
        if (hours < 5) return 'bg-purple-500/25';
        return 'bg-purple-500/45';
    }

    const totalHours = logs.reduce((acc, l) => acc + l.hours, 0);

    const byProject = new Map<string, { name: string; hours: number }>();
    for (const log of logs) {
        const key = log.project_id;
        if (!byProject.has(key)) byProject.set(key, { name: log.project_name ?? log.project_id.slice(0, 8), hours: 0 });
        byProject.get(key)!.hours += log.hours;
    }
    const topProjects = [...byProject.entries()].sort((a, b) => b[1].hours - a[1].hours).slice(0, 3);
    const uniqueUsers = [...new Set(logs.map((l) => l.user_display_name).filter(Boolean))];
    const uniqueProjectIds = [...new Set(logs.map((l) => l.project_id))];

    return (
        <div className="min-h-screen bg-[#0a0a0c] text-white">
            <div className="border-b border-white/5 px-8 py-5">
                <div className="flex items-center justify-between max-w-6xl mx-auto">
                    <div className="flex items-center gap-3">
                        <Clock className="w-5 h-5 text-purple-400" />
                        <h1 className="text-white font-semibold text-lg">Time Dashboard</h1>
                    </div>
                    <div className="flex items-center gap-3 flex-wrap justify-end">
                        {activeTab === 'report' && (
                            <div className="flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-white/30" />
                                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:border-purple-500/50" />
                                <span className="text-white/30 text-sm">→</span>
                                <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:border-purple-500/50" />
                            </div>
                        )}
                        {uniqueUsers.length > 1 && (
                            <div className="flex items-center gap-2">
                                <Filter className="w-4 h-4 text-white/30" />
                                <select value={filterUserId} onChange={(e) => setFilterUserId(e.target.value)}
                                    className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:border-purple-500/50">
                                    <option value="">Todos usuários</option>
                                    {logs.filter((l, i, arr) => arr.findIndex((x) => x.user_id === l.user_id) === i).map((l) => (
                                        <option key={l.user_id} value={l.user_id}>{l.user_display_name ?? l.user_id.slice(0, 8)}</option>
                                    ))}
                                </select>
                            </div>
                        )}
                        {uniqueProjectIds.length > 1 && (
                            <select value={filterProjectId} onChange={(e) => setFilterProjectId(e.target.value)}
                                className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:border-purple-500/50">
                                <option value="">Todos projetos</option>
                                {logs.filter((l, i, arr) => arr.findIndex((x) => x.project_id === l.project_id) === i).map((l) => (
                                    <option key={l.project_id} value={l.project_id}>{l.project_name ?? l.project_id.slice(0, 8)}</option>
                                ))}
                            </select>
                        )}
                    </div>
                </div>

                <div className="max-w-6xl mx-auto mt-4 flex items-center gap-1 bg-white/5 rounded-lg p-1 w-fit">
                    <button
                        onClick={() => setActiveTab('report')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${activeTab === 'report' ? 'bg-purple-500/20 text-purple-300' : 'text-white/40 hover:text-white/60'}`}
                    >
                        <List className="w-3.5 h-3.5" /> Relatório
                    </button>
                    <button
                        onClick={() => setActiveTab('calendar')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${activeTab === 'calendar' ? 'bg-purple-500/20 text-purple-300' : 'text-white/40 hover:text-white/60'}`}
                    >
                        <CalendarDays className="w-3.5 h-3.5" /> Calendário
                    </button>
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-8 py-8 space-y-8">
                {activeTab === 'calendar' ? (
                    <div className="space-y-6">
                        <div className="flex items-center justify-between flex-wrap gap-3">
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => setCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
                                    className="text-white/40 hover:text-white/70 transition-colors p-1.5 rounded-lg hover:bg-white/5"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                </button>
                                <span className="text-white text-sm font-medium capitalize">
                                    {calendarMonth.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                                </span>
                                <button
                                    onClick={() => setCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
                                    className="text-white/40 hover:text-white/70 transition-colors p-1.5 rounded-lg hover:bg-white/5"
                                >
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => setCalendarMonth(startOfMonth(new Date()))}
                                    className="text-purple-400 hover:text-purple-300 text-xs font-medium transition-colors ml-2"
                                >
                                    Hoje
                                </button>
                            </div>
                            <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg px-4 py-2">
                                <span className="text-white/40 text-xs uppercase tracking-wider mr-2">Total do mês</span>
                                <span className="text-purple-300 font-mono font-bold">{totalHours.toFixed(1)}h</span>
                            </div>
                        </div>

                        {isLoading ? (
                            <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 text-purple-400 animate-spin" /></div>
                        ) : (
                            <div className="rounded-xl border border-white/5 overflow-hidden">
                                <div className="grid grid-cols-7 bg-white/3">
                                    {WEEKDAY_LABELS.map((label) => (
                                        <div key={label} className="text-center text-white/40 text-xs font-medium uppercase tracking-wider py-2">{label}</div>
                                    ))}
                                </div>
                                <div className="grid grid-cols-7">
                                    {calendarDays.map((d) => {
                                        const iso = toISODate(d);
                                        const dayLogs = logsByDay.get(iso) ?? [];
                                        const dayTotal = dayLogs.reduce((acc, l) => acc + l.hours, 0);
                                        const isCurrentMonth = d.getMonth() === calendarMonth.getMonth();
                                        const isToday = iso === toISODate(new Date());
                                        const isSelected = iso === selectedDay;
                                        return (
                                            <button
                                                key={iso}
                                                onClick={() => setSelectedDay(dayLogs.length > 0 ? iso : null)}
                                                className={`min-h-[76px] border-t border-l border-white/5 p-2 text-left transition-colors ${heatClass(dayTotal)} ${isSelected ? 'ring-1 ring-inset ring-purple-400/60' : ''} ${isCurrentMonth ? '' : 'opacity-30'}`}
                                            >
                                                <div className={`text-xs font-mono ${isToday ? 'text-purple-300 font-bold' : 'text-white/50'}`}>{d.getDate()}</div>
                                                {dayTotal > 0 && (
                                                    <div className="text-white/80 text-xs font-mono font-semibold mt-1">{dayTotal.toFixed(1)}h</div>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {selectedDay && (
                            <div className="bg-[#0f1117] border border-white/5 rounded-xl overflow-hidden">
                                <div className="px-4 py-3 border-b border-white/5 text-white/60 text-xs uppercase tracking-wider font-medium">
                                    Apontamentos de {new Date(`${selectedDay}T00:00:00`).toLocaleDateString('pt-BR')}
                                </div>
                                <table className="w-full text-sm">
                                    <tbody>
                                        {(logsByDay.get(selectedDay) ?? []).map((log) => (
                                            <tr key={log.id} className="border-t border-white/5">
                                                <td className="px-4 py-2">
                                                    <button onClick={() => navigate(`/project/${log.project_id}/time`)} className="text-purple-400/70 hover:text-purple-300 text-xs transition-colors">
                                                        {log.project_name ?? log.project_id.slice(0, 8)}
                                                    </button>
                                                </td>
                                                <td className="px-4 py-2 text-white/50 text-xs">{log.card_title ?? '—'}</td>
                                                <td className="px-4 py-2 text-white/60 text-xs">{log.user_display_name ?? '—'}</td>
                                                <td className="px-4 py-2 text-purple-300 font-mono font-medium text-right text-xs">{log.hours.toFixed(2)}h</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                ) : (
                <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl px-5 py-4">
                        <div className="text-white/40 text-xs uppercase tracking-wider mb-1">Total de horas</div>
                        <div className="text-purple-300 text-3xl font-bold font-mono">{totalHours.toFixed(1)}h</div>
                    </div>
                    <div className="bg-white/3 border border-white/5 rounded-xl px-5 py-4">
                        <div className="text-white/40 text-xs uppercase tracking-wider mb-1">Apontamentos</div>
                        <div className="text-white text-3xl font-bold">{logs.length}</div>
                    </div>
                    <div className="bg-white/3 border border-white/5 rounded-xl px-5 py-4">
                        <div className="text-white/40 text-xs uppercase tracking-wider mb-1">Projetos</div>
                        <div className="text-white text-3xl font-bold">{byProject.size}</div>
                    </div>
                    <div className="bg-white/3 border border-white/5 rounded-xl px-5 py-4">
                        <div className="text-white/40 text-xs uppercase tracking-wider mb-1">Colaboradores</div>
                        <div className="text-white text-3xl font-bold">{uniqueUsers.length}</div>
                    </div>
                </div>

                {topProjects.length > 0 && (
                    <div>
                        <h2 className="text-white/60 text-xs uppercase tracking-wider font-medium mb-3">Top projetos</h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            {topProjects.map(([pid, info]) => (
                                <button key={pid} onClick={() => navigate(`/project/${pid}/time`)}
                                    className="bg-[#0f1117] border border-white/5 hover:border-purple-500/20 rounded-xl px-5 py-4 text-left transition-colors group">
                                    <div className="text-white font-medium text-sm group-hover:text-purple-300 transition-colors">{info.name}</div>
                                    <div className="text-purple-400 font-mono font-bold text-lg mt-1">{info.hours.toFixed(1)}h</div>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                <div>
                    <h2 className="text-white/60 text-xs uppercase tracking-wider font-medium mb-3">Apontamentos</h2>
                    {isLoading ? (
                        <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 text-purple-400 animate-spin" /></div>
                    ) : logs.length === 0 ? (
                        <div className="text-center py-20 text-white/30">
                            <Clock className="w-10 h-10 mx-auto mb-3 opacity-30" />
                            <p>Nenhum apontamento encontrado.</p>
                        </div>
                    ) : (
                        <div className="bg-[#0f1117] border border-white/5 rounded-xl overflow-hidden">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-white/2 border-b border-white/5">
                                        <th className="text-left px-5 py-3 text-white/30 text-xs font-medium uppercase tracking-wider">Projeto</th>
                                        <th className="text-left px-5 py-3 text-white/30 text-xs font-medium uppercase tracking-wider">Card</th>
                                        <th className="text-left px-5 py-3 text-white/30 text-xs font-medium uppercase tracking-wider">Data</th>
                                        <th className="text-left px-5 py-3 text-white/30 text-xs font-medium uppercase tracking-wider">Colaborador</th>
                                        <th className="text-left px-5 py-3 text-white/30 text-xs font-medium uppercase tracking-wider">Descrição</th>
                                        <th className="text-right px-5 py-3 text-white/30 text-xs font-medium uppercase tracking-wider">Horas</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {logs.map((log, i) => (
                                        <tr key={log.id} className={i % 2 !== 0 ? 'bg-white/2' : ''}>
                                            <td className="px-5 py-2.5">
                                                <button onClick={() => navigate(`/project/${log.project_id}/time`)} className="text-purple-400/70 hover:text-purple-300 text-xs transition-colors">
                                                    {log.project_name ?? log.project_id.slice(0, 8)}
                                                </button>
                                            </td>
                                            <td className="px-5 py-2.5 text-white/50 text-xs">{log.card_title ?? '—'}</td>
                                            <td className="px-5 py-2.5 text-white/40 font-mono text-xs">{log.date}</td>
                                            <td className="px-5 py-2.5 text-white/60 text-xs">{log.user_display_name ?? '—'}</td>
                                            <td className="px-5 py-2.5 text-white/40 text-xs max-w-[200px] truncate">{log.description ?? '—'}</td>
                                            <td className="px-5 py-2.5 text-purple-300 font-mono font-medium text-right text-xs">{log.hours.toFixed(2)}h</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
                </>
                )}
            </div>
        </div>
    );
}
