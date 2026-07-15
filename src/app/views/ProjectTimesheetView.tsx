import { useEffect, useState, useCallback, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Plus, X, Loader2, Lock } from 'lucide-react';
import { getProjectTimeLogs, createTimeLog, updateTimeLog } from '@/services/timeLogs';
import { getProjectBoards } from '@/services/boards';
import { createCard } from '@/services/cards';
import { getSchedulings } from '@/services/schedulings';
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

const WEEKDAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

interface RowKey {
    type: 'card' | 'scheduling';
    refId: string;
}

interface TimesheetRow extends RowKey {
    key: string;
    title: string;
}

function rowKeyOf(r: RowKey): string {
    return `${r.type}:${r.refId}`;
}

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
            const data = await getProjectTimeLogs(projectId, {
                start_date: toISODate(weekStart),
                end_date: toISODate(weekEnd),
                user_id: currentUserId,
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

    const rows = useMemo(() => {
        const map = new Map<string, TimesheetRow>();
        for (const log of logs) {
            const rk: RowKey = log.card_id
                ? { type: 'card', refId: log.card_id }
                : { type: 'scheduling', refId: log.scheduling_id as string };
            const key = rowKeyOf(rk);
            if (!map.has(key)) {
                map.set(key, { ...rk, key, title: log.card_title ?? log.description ?? 'Apontamento' });
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
            const rk: RowKey = log.card_id
                ? { type: 'card', refId: log.card_id }
                : { type: 'scheduling', refId: log.scheduling_id as string };
            const cellKey = `${rowKeyOf(rk)}|${log.date}`;
            const list = map.get(cellKey) ?? [];
            list.push(log);
            map.set(cellKey, list);
        }
        return map;
    }, [logs]);

    const dayTotals = useMemo(() => {
        const totals = new Map<string, number>();
        for (const log of logs) totals.set(log.date, (totals.get(log.date) ?? 0) + log.hours);
        return totals;
    }, [logs]);

    const weekTotal = logs.reduce((acc, l) => acc + l.hours, 0);
    const todayISO = toISODate(new Date());

    const handleCellCommit = async (row: TimesheetRow, iso: string, newValue: number) => {
        const cellKey = `${row.key}|${iso}`;
        const existing = cellsByRowAndDate.get(cellKey) ?? [];
        if (existing.length > 1) return; // célula agregada de múltiplas entradas — não editável nesta versão

        if (existing.length === 0) {
            if (newValue <= 0) return;
            await createTimeLog(projectId, {
                user_id: currentUserId as string,
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
                    existingKeys={new Set(rows.map((r) => r.key))}
                    onClose={() => setIsAddRowOpen(false)}
                    onAdd={(row) => { setPendingRows((prev) => [...prev, row]); setIsAddRowOpen(false); }}
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
    onAdd: (row: TimesheetRow) => void;
}

type AddRowMode = 'card' | 'scheduling' | 'new_card';

function AddRowModal({ projectId, existingKeys, onClose, onAdd }: AddRowModalProps) {
    const [mode, setMode] = useState<AddRowMode>('card');
    const [cards, setCards] = useState<Card[]>([]);
    const [schedulings, setSchedulings] = useState<Scheduling[]>([]);
    const [boards, setBoards] = useState<Board[]>([]);
    const [selectedCardId, setSelectedCardId] = useState('');
    const [selectedSchedulingId, setSelectedSchedulingId] = useState('');
    const [newCardTitle, setNewCardTitle] = useState('');
    const [newCardBoardId, setNewCardBoardId] = useState('');
    const [isLoadingOptions, setIsLoadingOptions] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const loadOptions = async () => {
            setIsLoadingOptions(true);
            try {
                const [projectBoards, projectSchedulings] = await Promise.all([
                    getProjectBoards(projectId),
                    getSchedulings(projectId).catch(() => []),
                ]);
                setBoards(projectBoards);
                setCards(projectBoards.flatMap((b) => b.cards ?? []));
                setSchedulings(projectSchedulings);
            } catch (err) {
                console.error('[AddRowModal] failed to load options:', err);
            } finally {
                setIsLoadingOptions(false);
            }
        };
        loadOptions();
    }, [projectId]);

    const handleSubmit = async () => {
        if (mode === 'card' && !selectedCardId) { setError('Selecione um card.'); return; }
        if (mode === 'scheduling' && !selectedSchedulingId) { setError('Selecione um agendamento.'); return; }
        if (mode === 'new_card' && (!newCardTitle.trim() || !newCardBoardId)) { setError('Informe o título e o board do novo card.'); return; }

        if (mode === 'card' && existingKeys.has(`card:${selectedCardId}`)) { setError('Esse card já está na lista desta semana.'); return; }
        if (mode === 'scheduling' && existingKeys.has(`scheduling:${selectedSchedulingId}`)) { setError('Esse agendamento já está na lista desta semana.'); return; }

        setIsSubmitting(true);
        setError(null);
        try {
            if (mode === 'new_card') {
                const newCard = await createCard(newCardBoardId, { title: newCardTitle.trim(), status: 'todo' });
                onAdd({ key: `card:${newCard.id}`, type: 'card', refId: newCard.id, title: newCard.title });
            } else if (mode === 'card') {
                const card = cards.find((c) => c.id === selectedCardId)!;
                onAdd({ key: `card:${card.id}`, type: 'card', refId: card.id, title: card.title });
            } else {
                const scheduling = schedulings.find((s) => s.id === selectedSchedulingId)!;
                onAdd({ key: `scheduling:${scheduling.id}`, type: 'scheduling', refId: scheduling.id, title: scheduling.title });
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
                            <div className="flex items-center gap-1 bg-white/5 rounded-lg p-0.5">
                                {(['card', 'scheduling', 'new_card'] as AddRowMode[]).map((m) => (
                                    <button
                                        key={m}
                                        type="button"
                                        onClick={() => setMode(m)}
                                        className={`flex-1 px-2 py-1.5 rounded-md text-xs font-medium transition-colors ${mode === m ? 'bg-purple-500/20 text-purple-300' : 'text-white/40 hover:text-white/60'}`}
                                    >
                                        {m === 'card' ? 'Card' : m === 'scheduling' ? 'Agendamento' : 'Novo card'}
                                    </button>
                                ))}
                            </div>

                            {mode === 'card' && (
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

                            {mode === 'scheduling' && (
                                schedulings.length === 0 ? (
                                    <p className="text-white/30 text-sm italic">Nenhum agendamento encontrado neste projeto.</p>
                                ) : (
                                    <select
                                        value={selectedSchedulingId}
                                        onChange={(e) => setSelectedSchedulingId(e.target.value)}
                                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500/50"
                                    >
                                        <option value="">Selecione um agendamento...</option>
                                        {schedulings.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
                                    </select>
                                )
                            )}

                            {mode === 'new_card' && (
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
