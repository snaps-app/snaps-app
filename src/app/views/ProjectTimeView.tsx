import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock, Download, Loader2, ChevronDown, ChevronRight, Calendar, CalendarDays, List } from 'lucide-react';
import { getProjectTimeLogs, downloadTimeReport } from '@/services/timeLogs';
import { getProject } from '@/services/projects';
import type { TimeLog } from '@/types/timeLogs';
import { ProjectTimesheetView } from './ProjectTimesheetView';

type ViewTab = 'report' | 'timesheet';

interface CardGroup {
    card_id: string | null;
    card_title: string;
    logs: TimeLog[];
    totalHours: number;
}

function groupByCard(logs: TimeLog[]): CardGroup[] {
    const map = new Map<string, CardGroup>();
    for (const log of logs) {
        const key = log.card_id ?? '__none__';
        if (!map.has(key)) {
            map.set(key, { card_id: log.card_id, card_title: log.card_title ?? 'Sem card', logs: [], totalHours: 0 });
        }
        const g = map.get(key)!;
        g.logs.push(log);
        g.totalHours += log.hours;
    }
    return Array.from(map.values()).sort((a, b) => b.totalHours - a.totalHours);
}

export function ProjectTimeView() {
    const { projectId } = useParams<{ projectId: string }>();
    const navigate = useNavigate();
    const [projectName, setProjectName] = useState('');
    const [logs, setLogs] = useState<TimeLog[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isExporting, setIsExporting] = useState(false);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
    const [activeTab, setActiveTab] = useState<ViewTab>('report');

    const load = useCallback(async () => {
        if (!projectId) return;
        setIsLoading(true);
        try {
            const data = await getProjectTimeLogs(projectId, { start_date: startDate || undefined, end_date: endDate || undefined });
            setLogs(data);
        } catch (err) {
            console.error('[ProjectTimeView] load error:', err);
        } finally {
            setIsLoading(false);
        }
    }, [projectId, startDate, endDate]);

    useEffect(() => {
        if (!projectId) return;
        getProject(projectId).then((p) => setProjectName(p.name)).catch(() => {});
    }, [projectId]);

    useEffect(() => { load(); }, [load]);

    const handleExportPDF = async () => {
        if (!projectId) return;
        setIsExporting(true);
        try {
            const blob = await downloadTimeReport(projectId, startDate || undefined, endDate || undefined, 'dark');
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'snaps-time-report.pdf';
            a.click();
            URL.revokeObjectURL(url);
        } catch (err) {
            console.error('[ProjectTimeView] export error:', err);
        } finally {
            setIsExporting(false);
        }
    };

    const toggleCard = (key: string) => {
        setExpandedCards((prev) => { const next = new Set(prev); if (next.has(key)) next.delete(key); else next.add(key); return next; });
    };

    const groups = groupByCard(logs);
    const totalHours = logs.reduce((acc, l) => acc + l.hours, 0);
    const uniqueUsers = [...new Set(logs.map((l) => l.user_display_name).filter(Boolean))];

    return (
        <div className="min-h-screen bg-[#0a0a0c] text-white">
            <div className="border-b border-white/5 px-8 py-5">
                <div className="flex items-center justify-between max-w-5xl mx-auto">
                    <div className="flex items-center gap-4">
                        <button onClick={() => navigate(`/project/${projectId}/board`)} className="text-white/30 hover:text-white/60 transition-colors">
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <div className="flex items-center gap-2">
                            <Clock className="w-5 h-5 text-purple-400" />
                            <div>
                                <h1 className="text-white font-semibold text-lg leading-tight">Time Report</h1>
                                {projectName && <p className="text-white/40 text-xs">{projectName}</p>}
                            </div>
                        </div>
                    </div>
                    {activeTab === 'report' && (
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-white/30" />
                                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:border-purple-500/50" />
                                <span className="text-white/30 text-sm">→</span>
                                <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:border-purple-500/50" />
                            </div>
                            <button onClick={handleExportPDF} disabled={isExporting || logs.length === 0}
                                className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed text-white px-4 py-1.5 rounded-lg text-sm font-medium transition-colors">
                                {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                                Exportar PDF
                            </button>
                        </div>
                    )}
                </div>

                <div className="max-w-5xl mx-auto mt-4 flex items-center gap-1 bg-white/5 rounded-lg p-1 w-fit">
                    <button
                        onClick={() => setActiveTab('report')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${activeTab === 'report' ? 'bg-purple-500/20 text-purple-300' : 'text-white/40 hover:text-white/60'}`}
                    >
                        <List className="w-3.5 h-3.5" /> Relatório
                    </button>
                    <button
                        onClick={() => setActiveTab('timesheet')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${activeTab === 'timesheet' ? 'bg-purple-500/20 text-purple-300' : 'text-white/40 hover:text-white/60'}`}
                    >
                        <CalendarDays className="w-3.5 h-3.5" /> Timesheet
                    </button>
                </div>
            </div>

            <div className="max-w-5xl mx-auto px-8 py-8 space-y-6">
                {activeTab === 'report' ? (
                    <>
                        <div className="flex items-center gap-4 flex-wrap">
                            <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl px-5 py-3">
                                <div className="text-white/40 text-xs uppercase tracking-wider mb-1">Total de horas</div>
                                <div className="text-purple-300 text-2xl font-bold font-mono">{totalHours.toFixed(1)}h</div>
                            </div>
                            <div className="bg-white/3 border border-white/5 rounded-xl px-5 py-3">
                                <div className="text-white/40 text-xs uppercase tracking-wider mb-1">Cards</div>
                                <div className="text-white text-2xl font-bold">{groups.length}</div>
                            </div>
                            <div className="bg-white/3 border border-white/5 rounded-xl px-5 py-3">
                                <div className="text-white/40 text-xs uppercase tracking-wider mb-1">Colaboradores</div>
                                <div className="text-white text-2xl font-bold">{uniqueUsers.length}</div>
                            </div>
                        </div>

                        {isLoading ? (
                            <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 text-purple-400 animate-spin" /></div>
                        ) : groups.length === 0 ? (
                            <div className="text-center py-20 text-white/30">
                                <Clock className="w-10 h-10 mx-auto mb-3 opacity-30" />
                                <p>Nenhum apontamento encontrado para o período selecionado.</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {groups.map((group) => {
                                    const key = group.card_id ?? '__none__';
                                    const isExpanded = expandedCards.has(key);
                                    return (
                                        <div key={key} className="bg-[#0f1117] border border-white/5 rounded-xl overflow-hidden">
                                            <button onClick={() => toggleCard(key)} className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/2 transition-colors">
                                                <div className="flex items-center gap-3">
                                                    {isExpanded ? <ChevronDown className="w-4 h-4 text-white/30" /> : <ChevronRight className="w-4 h-4 text-white/30" />}
                                                    <span className="text-white text-sm font-medium">{group.card_title}</span>
                                                    <span className="text-white/30 text-xs">{group.logs.length} apontamento{group.logs.length !== 1 ? 's' : ''}</span>
                                                </div>
                                                <span className="text-purple-300 font-mono font-semibold text-sm">{group.totalHours.toFixed(1)}h</span>
                                            </button>
                                            {isExpanded && (
                                                <div className="border-t border-white/5">
                                                    <table className="w-full text-sm">
                                                        <thead>
                                                            <tr className="bg-white/2">
                                                                <th className="text-left px-5 py-2.5 text-white/30 text-xs font-medium uppercase tracking-wider">Data</th>
                                                                <th className="text-left px-5 py-2.5 text-white/30 text-xs font-medium uppercase tracking-wider">Colaborador</th>
                                                                <th className="text-left px-5 py-2.5 text-white/30 text-xs font-medium uppercase tracking-wider">Descrição</th>
                                                                <th className="text-right px-5 py-2.5 text-white/30 text-xs font-medium uppercase tracking-wider">Horas</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {group.logs.map((log, i) => (
                                                                <tr key={log.id} className={i % 2 === 0 ? '' : 'bg-white/2'}>
                                                                    <td className="px-5 py-2.5 text-white/40 font-mono text-xs">{log.date}</td>
                                                                    <td className="px-5 py-2.5 text-white/60">{log.user_display_name ?? '—'}</td>
                                                                    <td className="px-5 py-2.5 text-white/50">{log.description ?? '—'}</td>
                                                                    <td className="px-5 py-2.5 text-purple-300 font-mono font-medium text-right">{log.hours.toFixed(2)}h</td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </>
                ) : (
                    projectId && <ProjectTimesheetView projectId={projectId} />
                )}
            </div>
        </div>
    );
}
