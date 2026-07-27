import { useEffect, useState, useCallback, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Plus, X, Loader2, Lock } from 'lucide-react';
import { getProjectTimeLogs, createTimeLog, updateTimeLog } from '@/services/timeLogs';
import { getProjectBoards, getBoard } from '@/services/boards';
import { createCard } from '@/services/cards';
import { getSchedulings, createScheduling } from '@/services/schedulings';
import { supabase } from '@/lib/supabaseClient';
import type { Board, Card, Scheduling } from '@/services/types';
import type { TimeLog } from '@/types/timeLogs';

interface ProjectTimesheetViewProps {
    projectId: string;
}

function startOfWeek(d: Date): Date {
    const date = new Date(d);
    date.setDate(date.getDate() - date.getDay());
    date.setHours(0, 0, 0, 0);
    return date;
}

function toISODate(d: Date): string {
    return d.toISOString().split('T')[0];
}

// datetime-local value (local time) -> ISO (UTC) string for the API.
function localDateTimeToIso(val: string): string {
    return new Date(val).toISOString();
}

function startOfDay(d: Date): Date {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

interface SchedulingOccurrence {
    scheduling: Scheduling;
    iso: string;
    label: string;
}

// Expand a scheduling into its selectable occurrences. A recurring scheduling
// (daily/weekly/monthly) yields one option per occurrence from its start date up
// to and including today — never a future occurrence. Non-recurring schedulings
// yield a single option. Mirrors the recurrence rules used by the calendar views.
function expandSchedulingOccurrences(s: Scheduling, today: Date): SchedulingOccurrence[] {
    const start = startOfDay(new Date(s.start_date));
    const todayDay = startOfDay(today);
    const dm = (d: Date) => d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    const occ: SchedulingOccurrence[] = [];
    const push = (d: Date, n: number) => occ.push({
        scheduling: s,
        iso: toISODate(d),
        label: n === 1 ? `${s.title} (${dm(d)})` : `${s.title} ${n} (${dm(d)})`,
    });

    const rec = s.recurrence;
    if (!rec || rec === 'none' || (rec !== 'daily' && rec !== 'weekly' && rec !== 'monthly')) {
        push(start, 1);
        return occ;
    }

    const cursor = new Date(start);
    // Cap iterations defensively so a bad date can never spin forever.
    for (let n = 1; n <= 1000 && startOfDay(cursor) <= todayDay; n++) {
        push(new Date(cursor), n);
        if (rec === 'daily') cursor.setDate(cursor.getDate() + 1);
        else if (rec === 'weekly') cursor.setDate(cursor.getDate() + 7);
        else cursor.setMonth(cursor.getMonth() + 1);
    }
    return occ;
}

const WEEKDAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

interface RowKey {
    type: 'card' | 'scheduling';
    refId: string;
    userId: string;
}

interface TimesheetRow extends RowKey {
    key: string;
    title: string;
    userLabel: string;
}

// Rows are grouped per task AND per collaborator, so a privileged viewer sees
// who logged what (owner/admin/visualizer see everyone; member only their own).
function rowKeyOf(r: RowKey): string {
    return `${r.type}:${r.refId}:${r.userId}`;
}

// Base row emitted by the add-row modal — the collaborator is filled in by the parent.
type NewRowInput = { type: 'card' | 'scheduling'; refId: string; title: string };

export function ProjectTimesheetView({ projectId }: ProjectTimesheetViewProps) {
    const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
    const [logs, setLogs] = useState<TimeLog[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [pendingRows, setPendingRows] = useState<TimesheetRow[]>([]);
    const [isAddRowOpen, setIsAddRowOpen] = useState(false);

    const weekDays = useMemo(() => (
        Array.from({ length: 7 }, (_, i) => {
            const d = new Date(weekStart);
            d.setDate(d.getDate() + i);
            return d;
        })
    ), [weekStart]);

    const weekEnd = weekDays[6];

    useEffect(() => {
        supabase.auth.getUser().then(({ data }) => setCurrentUserId(data.user?.id ?? null));
    }, []);

    const load = useCallback(async () => {
        if (!currentUserId) return;
        setIsLoading(true);
        try {
            // No user_id filter: the backend scopes visibility by project role
            // (owner/admin/visualizer see everyone; member sees only their own).
            const data = await getProjectTimeLogs(projectId, {
                start_date: toISODate(weekStart),
                end_date: toISODate(weekEnd),
            });
            setLogs(data);
        } catch (err) {
            console.error('[ProjectTimesheetView] load error:', err);
        } finally {
            setIsLoading(false);
        }
    }, [projectId, weekStart, weekEnd, currentUserId]);

    useEffect(() => { load(); }, [load]);

    // Reseta linhas adicionadas manualmente (ainda sem apontamento) ao trocar de semana.
    useEffect(() => { setPendingRows([]); }, [weekStart]);

    const rowKeyForLog = (log: TimeLog): RowKey => ({
        type: log.card_id ? 'card' : 'scheduling',
        refId: (log.card_id ?? log.scheduling_id) as string,
        userId: log.user_id,
    });

    const rows = useMemo(() => {
        const map = new Map<string, TimesheetRow>();
        for (const log of logs) {
            const rk = rowKeyForLog(log);
            const key = rowKeyOf(rk);
            if (!map.has(key)) {
                map.set(key, {
                    ...rk, key,
                    title: log.card_title ?? log.scheduling_title ?? log.description ?? 'Apontamento',
                    userLabel: log.user_display_name ?? '',
                });
            }
        }
        for (const pr of pendingRows) {
            if (!map.has(pr.key)) map.set(pr.key, pr);
        }
        return Array.from(map.values());
    }, [logs, pendingRows]);

    const cellsByRowAndDate = useMemo(() => {
        const map = new Map<string, TimeLog[]>();
        for (const log of logs) {
            const cellKey = `${rowKeyOf(rowKeyForLog(log))}|${log.date}`;
            const list = map.get(cellKey) ?? [];
            list.push(log);
            map.set(cellKey, list);
        }
        return map;
    }, [logs]);

    // Show the collaborator on each row only when more than one person is in view.
    const showCollaborator = useMemo(() => new Set(logs.map((l) => l.user_id)).size > 1, [logs]);

    const dayTotals = useMemo(() => {
        const totals = new Map<string, number>();
        for (const log of logs) totals.set(log.date, (totals.get(log.date) ?? 0) + log.hours);
        return totals;
    }, [logs]);

    const weekTotal = logs.reduce((acc, l) => acc + l.hours, 0);
    const todayISO = toISODate(new Date());

    const handleAddRow = async (base: NewRowInput, scheduling?: Scheduling, occurrenceIso?: string) => {
        setIsAddRowOpen(false);
        const uid = currentUserId as string;
        // A manually-added row always belongs to the current user.
        const pendingRow: TimesheetRow = {
            type: base.type, refId: base.refId, userId: uid,
            key: `${base.type}:${base.refId}:${uid}`, title: base.title, userLabel: 'Você',
        };

        // Cards have no inherent date/duration — they become an empty row for the
        // user to fill in. A scheduling does, so log it at its own date rather than
        // in whichever week happens to be on screen.
        if (!scheduling) {
            setPendingRows((prev) => [...prev, pendingRow]);
            return;
        }

        // Log at the chosen occurrence's date (for a recurring scheduling), falling
        // back to the scheduling's own start date.
        const start = new Date(scheduling.start_date);
        const end = new Date(scheduling.end_date);
        const hours = Math.round(((end.getTime() - start.getTime()) / 3600000) * 100) / 100;
        const logDate = occurrenceIso ?? toISODate(start);
        if (!(hours > 0)) {
            setPendingRows((prev) => [...prev, pendingRow]);
            return;
        }

        try {
            await createTimeLog(projectId, {
                user_id: currentUserId as string,
                scheduling_id: scheduling.id,
                date: logDate,
                hours,
                status: 'confirmed',
            });
            // Jump to the occurrence's week so the new entry is actually visible;
            // this also re-runs load() via the weekStart dependency.
            setWeekStart(startOfWeek(new Date(`${logDate}T12:00:00`)));
        } catch (err) {
            console.error('[ProjectTimesheetView] failed to log scheduling:', err);
            setPendingRows((prev) => [...prev, pendingRow]);
        }
    };

    const handleCellCommit = async (row: TimesheetRow, iso: string, newValue: number) => {
        const cellKey = `${row.key}|${iso}`;
        const existing = cellsByRowAndDate.get(cellKey) ?? [];
        if (existing.length > 1) return; // célula agregada de múltiplas entradas — não editável nesta versão

        if (existing.length === 0) {
            if (newValue <= 0) return;
            await createTimeLog(projectId, {
                // Log for the row's collaborator (their own row for a member; any member
                // for a privileged viewer editing someone else's row).
                user_id: row.userId || (currentUserId as string),
                card_id: row.type === 'card' ? row.refId : undefined,
                scheduling_id: row.type === 'scheduling' ? row.refId : undefined,
                date: iso,
                hours: newValue,
                status: 'confirmed',
            });
        } else {
            const log = existing[0];
            if (newValue <= 0 || newValue === log.hours) return; // remover célula não é suportado nesta versão
            await updateTimeLog(log.id, { hours: newValue });
        }
        await load();
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setWeekStart((prev) => { const d = new Date(prev); d.setDate(d.getDate() - 7); return d; })}
                        className="text-white/40 hover:text-white/70 transition-colors p-1.5 rounded-lg hover:bg-white/5"
                    >
                        <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-white text-sm font-medium">
                        {weekStart.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} — {weekEnd.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                    </span>
                    <button
                        onClick={() => setWeekStart((prev) => { const d = new Date(prev); d.setDate(d.getDate() + 7); return d; })}
                        className="text-white/40 hover:text-white/70 transition-colors p-1.5 rounded-lg hover:bg-white/5"
                    >
                        <ChevronRight className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => setWeekStart(startOfWeek(new Date()))}
                        className="text-purple-400 hover:text-purple-300 text-xs font-medium transition-colors ml-2"
                    >
                        Hoje
                    </button>
                </div>
                <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg px-4 py-2">
                    <span className="text-white/40 text-xs uppercase tracking-wider mr-2">Total da semana</span>
                    <span className="text-purple-300 font-mono font-bold">{weekTotal.toFixed(1)}h</span>
                </div>
            </div>

            {isLoading ? (
                <div className="flex items-center justify-center py-16">
                    <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
                </div>
            ) : (
                <div className="overflow-x-auto rounded-xl border border-white/5">
                    <table className="w-full text-sm border-collapse">
                        <thead>
                            <tr className="bg-white/3">
                                <th className="text-left px-4 py-3 text-white/40 text-xs font-medium uppercase tracking-wider min-w-[220px]">Tarefa</th>
                                {weekDays.map((d) => {
                                    const iso = toISODate(d);
                                    const isToday = iso === todayISO;
                                    return (
                                        <th key={iso} className={`px-2 py-3 text-xs font-medium uppercase tracking-wider min-w-[64px] ${isToday ? 'text-purple-300' : 'text-white/40'}`}>
                                            <div>{WEEKDAY_LABELS[d.getDay()]}</div>
                                            <div className="font-mono normal-case">{d.getDate()}</div>
                                        </th>
                                    );
                                })}
                                <th className="px-4 py-3 text-white/40 text-xs font-medium uppercase tracking-wider text-right">Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.length === 0 ? (
                                <tr>
                                    <td colSpan={9} className="text-center py-10 text-white/30 text-sm">
                                        Nenhuma tarefa nesta semana ainda. Use "Adicionar tarefa" abaixo.
                                    </td>
                                </tr>
                            ) : (
                                rows.map((row) => {
                                    let rowTotal = 0;
                                    return (
                                        <tr key={row.key} className="border-t border-white/5">
                                            <td className="px-4 py-2 text-white text-sm">
                                                <div className="flex items-center gap-2">
                                                    <span className={`text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded ${row.type === 'card' ? 'bg-purple-500/10 text-purple-300' : 'bg-blue-500/10 text-blue-300'}`}>
                                                        {row.type === 'card' ? 'Card' : 'Agend.'}
                                                    </span>
                                                    <span className="truncate">{row.title}</span>
                                                    {showCollaborator && row.userLabel && (
                                                        <span className="flex items-center gap-1 text-[10px] text-white/40 whitespace-nowrap">
                                                            <span className="w-3.5 h-3.5 rounded-full bg-purple-500/20 text-purple-200 flex items-center justify-center text-[8px] font-bold">
                                                                {row.userLabel.charAt(0).toUpperCase()}
                                                            </span>
                                                            {row.userLabel}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            {weekDays.map((d) => {
                                                const iso = toISODate(d);
                                                const cellLogs = cellsByRowAndDate.get(`${row.key}|${iso}`) ?? [];
                                                const sum = cellLogs.reduce((acc, l) => acc + l.hours, 0);
                                                rowTotal += sum;
                                                const editable = cellLogs.length <= 1;
                                                return (
                                                    <td key={iso} className="px-1 py-1 text-center">
                                                        {editable ? (
                                                            <EditableCell value={sum} onCommit={(v) => handleCellCommit(row, iso, v)} />
                                                        ) : (
                                                            <span className="inline-flex items-center gap-1 text-white/50 text-xs font-mono" title="Múltiplos apontamentos neste dia — edite pela aba Relatório">
                                                                <Lock className="w-2.5 h-2.5" />{sum.toFixed(1)}
                                                            </span>
                                                        )}
                                                    </td>
                                                );
                                            })}
                                            <td className="px-4 py-2 text-right text-purple-300 font-mono font-semibold text-sm">{rowTotal.toFixed(1)}h</td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                        {rows.length > 0 && (
                            <tfoot>
                                <tr className="border-t border-white/10 bg-white/3">
                                    <td className="px-4 py-2 text-white/40 text-xs uppercase tracking-wider">Total do dia</td>
                                    {weekDays.map((d) => {
                                        const iso = toISODate(d);
                                        const total = dayTotals.get(iso) ?? 0;
                                        return (
                                            <td key={iso} className="px-1 py-2 text-center text-white/70 text-xs font-mono font-semibold">
                                                {total > 0 ? `${total.toFixed(1)}h` : '—'}
                                            </td>
                                        );
                                    })}
                                    <td className="px-4 py-2 text-right text-purple-300 font-mono font-bold text-sm">{weekTotal.toFixed(1)}h</td>
                                </tr>
                            </tfoot>
                        )}
                    </table>
                </div>
            )}

            <button
                onClick={() => setIsAddRowOpen(true)}
                className="flex items-center gap-2 text-purple-400 hover:text-purple-300 text-sm font-medium transition-colors"
            >
                <Plus className="w-4 h-4" /> Adicionar tarefa
            </button>

            {isAddRowOpen && (
                <AddRowModal
                    projectId={projectId}
                    existingKeys={new Set(rows.filter((r) => r.userId === currentUserId).map((r) => `${r.type}:${r.refId}`))}
                    onClose={() => setIsAddRowOpen(false)}
                    onAdd={handleAddRow}
                />
            )}
        </div>
    );
}

interface EditableCellProps {
    value: number;
    onCommit: (value: number) => void;
}

function EditableCell({ value, onCommit }: EditableCellProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [draft, setDraft] = useState(value > 0 ? String(value) : '');

    useEffect(() => { if (!isEditing) setDraft(value > 0 ? String(value) : ''); }, [value, isEditing]);

    const commit = () => {
        setIsEditing(false);
        const parsed = parseFloat(draft);
        if (!Number.isNaN(parsed) && parsed !== value) onCommit(parsed);
    };

    if (!isEditing) {
        return (
            <button
                onClick={() => setIsEditing(true)}
                className={`w-14 h-8 rounded-md text-xs font-mono font-semibold transition-colors ${value > 0 ? 'text-purple-300 bg-purple-500/5 hover:bg-purple-500/10' : 'text-white/20 hover:bg-white/5 hover:text-white/40'}`}
            >
                {value > 0 ? value.toFixed(2) : '+'}
            </button>
        );
    }

    return (
        <input
            autoFocus
            type="number" min="0" step="0.25"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); if (e.key === 'Escape') setIsEditing(false); }}
            className="w-14 h-8 bg-white/10 border border-purple-500/40 rounded-md text-white text-xs font-mono text-center focus:outline-none"
        />
    );
}

interface AddRowModalProps {
    projectId: string;
    existingKeys: Set<string>;
    onClose: () => void;
    // A scheduling carries its own date and duration, so it is handed back to the
    // parent to log immediately instead of becoming an empty row to fill in by hand.
    // occurrenceIso pins which occurrence of a recurring scheduling was picked.
    onAdd: (row: NewRowInput, scheduling?: Scheduling, occurrenceIso?: string) => void;
}

type AddRowMode = 'card' | 'scheduling';

function AddRowModal({ projectId, existingKeys, onClose, onAdd }: AddRowModalProps) {
    const [mode, setMode] = useState<AddRowMode>('card');
    // Within each tab: pick an existing item or create a new one ("Novo card"/"Novo agendamento").
    const [isNew, setIsNew] = useState(false);
    const [cards, setCards] = useState<Card[]>([]);
    const [schedulings, setSchedulings] = useState<Scheduling[]>([]);
    const [boards, setBoards] = useState<Board[]>([]);
    const [selectedCardId, setSelectedCardId] = useState('');
    const [selectedSchedulingId, setSelectedSchedulingId] = useState('');
    const [newCardTitle, setNewCardTitle] = useState('');
    const [newCardBoardId, setNewCardBoardId] = useState('');
    const [newSchedTitle, setNewSchedTitle] = useState('');
    const [newSchedStart, setNewSchedStart] = useState('');
    const [newSchedEnd, setNewSchedEnd] = useState('');
    const [isLoadingOptions, setIsLoadingOptions] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Switch tab: reset the existing/new sub-mode and any error.
    const switchMode = (m: AddRowMode) => { setMode(m); setIsNew(false); setError(null); };

    useEffect(() => {
        const loadOptions = async () => {
            setIsLoadingOptions(true);
            try {
                const [projectBoards, projectSchedulings] = await Promise.all([
                    getProjectBoards(projectId),
                    getSchedulings(projectId).catch(() => []),
                ]);
                setBoards(projectBoards);
                setSchedulings(projectSchedulings);

                // The boards list endpoint returns summaries without nested cards, so
                // fetch the Team Kanban board's detail (which includes cards). Fall back
                // to all boards if this project has no Team Kanban. Newest cards first.
                const teamKanban = projectBoards.find((b) => b.board_type === 'team_kanban');
                const sourceBoards = teamKanban ? [teamKanban] : projectBoards;
                const detailed = await Promise.all(
                    sourceBoards.map((b) => getBoard(b.id).catch(() => null)),
                );
                const allCards = detailed.flatMap((b) => b?.cards ?? []);
                allCards.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
                setCards(allCards);
            } catch (err) {
                console.error('[AddRowModal] failed to load options:', err);
            } finally {
                setIsLoadingOptions(false);
            }
        };
        loadOptions();
    }, [projectId]);

    const handleSubmit = async () => {
        // Validation per tab × existing/new.
        if (mode === 'card' && isNew && (!newCardTitle.trim() || !newCardBoardId)) { setError('Informe o título e o board do novo card.'); return; }
        if (mode === 'card' && !isNew && !selectedCardId) { setError('Selecione um card.'); return; }
        if (mode === 'card' && !isNew && existingKeys.has(`card:${selectedCardId}`)) { setError('Esse card já está na lista desta semana.'); return; }
        if (mode === 'scheduling' && isNew && !newSchedTitle.trim()) { setError('Informe o título do novo agendamento.'); return; }
        if (mode === 'scheduling' && isNew && (!newSchedStart || !newSchedEnd)) { setError('Informe início e fim do agendamento.'); return; }
        if (mode === 'scheduling' && isNew && new Date(newSchedEnd) <= new Date(newSchedStart)) { setError('O fim deve ser depois do início.'); return; }
        if (mode === 'scheduling' && !isNew && !selectedSchedulingId) { setError('Selecione um agendamento.'); return; }
        // No existingKeys guard for schedulings: distinct occurrences of a recurring
        // scheduling share one scheduling_id but log to different dates.

        setIsSubmitting(true);
        setError(null);
        try {
            if (mode === 'card' && isNew) {
                const newCard = await createCard(newCardBoardId, { title: newCardTitle.trim(), status: 'todo' });
                onAdd({ type: 'card', refId: newCard.id, title: newCard.title });
            } else if (mode === 'card') {
                const card = cards.find((c) => c.id === selectedCardId)!;
                onAdd({ type: 'card', refId: card.id, title: card.title });
            } else if (mode === 'scheduling' && isNew) {
                // Create the scheduling, then log it immediately at its start date (like an existing one).
                const created = await createScheduling(projectId, {
                    title: newSchedTitle.trim(),
                    start_date: localDateTimeToIso(newSchedStart),
                    end_date: localDateTimeToIso(newSchedEnd),
                });
                onAdd(
                    { type: 'scheduling', refId: created.id, title: created.title },
                    created,
                    toISODate(new Date(newSchedStart)),
                );
            } else {
                // selectedSchedulingId is a composite "<schedulingId>::<occurrenceIso>".
                const [schedulingId, occurrenceIso] = selectedSchedulingId.split('::');
                const scheduling = schedulings.find((s) => s.id === schedulingId)!;
                onAdd(
                    { type: 'scheduling', refId: scheduling.id, title: scheduling.title },
                    scheduling,
                    occurrenceIso,
                );
            }
        } catch (err: any) {
            console.error('[AddRowModal] submit error:', err);
            setError(err?.response?.data?.detail || 'Erro ao adicionar tarefa.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-[#0f1117] border border-purple-500/20 rounded-2xl w-full max-w-md shadow-2xl shadow-purple-900/20">
                <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
                    <h3 className="text-white font-semibold text-sm">Adicionar tarefa à semana</h3>
                    <button onClick={onClose} className="text-white/30 hover:text-white/60 transition-colors">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <div className="px-5 py-4 space-y-4">
                    {isLoadingOptions ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="w-5 h-5 text-purple-400 animate-spin" />
                        </div>
                    ) : (
                        <>
                            {/* Two tabs: Card / Agendamento */}
                            <div className="flex items-center gap-1 bg-white/5 rounded-lg p-0.5">
                                {(['card', 'scheduling'] as AddRowMode[]).map((m) => (
                                    <button
                                        key={m}
                                        type="button"
                                        onClick={() => switchMode(m)}
                                        className={`flex-1 px-2 py-1.5 rounded-md text-xs font-medium transition-colors ${mode === m ? 'bg-purple-500/20 text-purple-300' : 'text-white/40 hover:text-white/60'}`}
                                    >
                                        {m === 'card' ? 'Card' : 'Agendamento'}
                                    </button>
                                ))}
                            </div>

                            {/* Within the tab: pick existing or create new */}
                            <div className="flex items-center gap-1 bg-white/[0.03] rounded-lg p-0.5">
                                <button
                                    type="button"
                                    onClick={() => { setIsNew(false); setError(null); }}
                                    className={`flex-1 px-2 py-1 rounded-md text-[11px] font-medium transition-colors ${!isNew ? 'bg-white/10 text-white/80' : 'text-white/40 hover:text-white/60'}`}
                                >
                                    Selecionar existente
                                </button>
                                <button
                                    type="button"
                                    onClick={() => { setIsNew(true); setError(null); }}
                                    className={`flex-1 px-2 py-1 rounded-md text-[11px] font-medium transition-colors ${isNew ? 'bg-white/10 text-white/80' : 'text-white/40 hover:text-white/60'}`}
                                >
                                    {mode === 'card' ? 'Novo card' : 'Novo agendamento'}
                                </button>
                            </div>

                            {/* Card: existing */}
                            {mode === 'card' && !isNew && (
                                cards.length === 0 ? (
                                    <p className="text-white/30 text-sm italic">Nenhum card encontrado neste projeto.</p>
                                ) : (
                                    <select
                                        value={selectedCardId}
                                        onChange={(e) => setSelectedCardId(e.target.value)}
                                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500/50"
                                    >
                                        <option value="">Selecione um card...</option>
                                        {cards.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
                                    </select>
                                )
                            )}

                            {/* Card: new */}
                            {mode === 'card' && isNew && (
                                <div className="space-y-2">
                                    <input
                                        type="text"
                                        value={newCardTitle}
                                        onChange={(e) => setNewCardTitle(e.target.value)}
                                        placeholder="Título do novo card..."
                                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500/50 placeholder:text-white/20"
                                    />
                                    <select
                                        value={newCardBoardId}
                                        onChange={(e) => setNewCardBoardId(e.target.value)}
                                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500/50"
                                    >
                                        <option value="">Selecione o board...</option>
                                        {boards.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                                    </select>
                                </div>
                            )}

                            {/* Scheduling: existing */}
                            {mode === 'scheduling' && !isNew && (
                                schedulings.length === 0 ? (
                                    <p className="text-white/30 text-sm italic">Nenhum agendamento encontrado neste projeto.</p>
                                ) : (
                                    <select
                                        value={selectedSchedulingId}
                                        onChange={(e) => setSelectedSchedulingId(e.target.value)}
                                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500/50"
                                    >
                                        <option value="">Selecione um agendamento...</option>
                                        {schedulings.flatMap((s) => expandSchedulingOccurrences(s, new Date())).map((o) => (
                                            <option key={`${o.scheduling.id}::${o.iso}`} value={`${o.scheduling.id}::${o.iso}`}>{o.label}</option>
                                        ))}
                                    </select>
                                )
                            )}

                            {/* Scheduling: new */}
                            {mode === 'scheduling' && isNew && (
                                <div className="space-y-2">
                                    <input
                                        type="text"
                                        value={newSchedTitle}
                                        onChange={(e) => setNewSchedTitle(e.target.value)}
                                        placeholder="Título do novo agendamento..."
                                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500/50 placeholder:text-white/20"
                                    />
                                    <div className="flex gap-2">
                                        <label className="flex-1 flex flex-col gap-1 text-[10px] text-white/40">
                                            Início
                                            <input type="datetime-local" value={newSchedStart} onChange={(e) => setNewSchedStart(e.target.value)}
                                                className="bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-white text-xs focus:outline-none focus:border-purple-500/50 [color-scheme:dark]" />
                                        </label>
                                        <label className="flex-1 flex flex-col gap-1 text-[10px] text-white/40">
                                            Fim
                                            <input type="datetime-local" value={newSchedEnd} onChange={(e) => setNewSchedEnd(e.target.value)}
                                                className="bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-white text-xs focus:outline-none focus:border-purple-500/50 [color-scheme:dark]" />
                                        </label>
                                    </div>
                                </div>
                            )}

                            {error && (
                                <p className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>
                            )}
                        </>
                    )}
                </div>

                <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-white/5">
                    <button onClick={onClose} className="text-white/40 hover:text-white/60 text-sm transition-colors px-3 py-1.5" disabled={isSubmitting}>
                        Cancelar
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={isSubmitting || isLoadingOptions}
                        className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white px-4 py-1.5 rounded-lg text-sm font-medium transition-colors"
                    >
                        {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                        Adicionar
                    </button>
                </div>
            </div>
        </div>
    );
}
