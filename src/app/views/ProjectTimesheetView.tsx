import { useEffect, useState, useCallback, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Plus, X, Loader2 } from 'lucide-react';
import { getProjectTimeLogs, createTimeLog } from '@/services/timeLogs';
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

export function ProjectTimesheetView({ projectId }: ProjectTimesheetViewProps) {
    const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
    const [logs, setLogs] = useState<TimeLog[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [activeDay, setActiveDay] = useState<string | null>(null);

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

    const logsByDay = useMemo(() => {
        const map = new Map<string, TimeLog[]>();
        for (const log of logs) {
            const list = map.get(log.date) ?? [];
            list.push(log);
            map.set(log.date, list);
        }
        return map;
    }, [logs]);

    const weekTotal = logs.reduce((acc, l) => acc + l.hours, 0);
    const todayISO = toISODate(new Date());

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
                <div className="grid grid-cols-7 gap-3">
                    {weekDays.map((d) => {
                        const iso = toISODate(d);
                        const dayLogs = logsByDay.get(iso) ?? [];
                        const dayTotal = dayLogs.reduce((acc, l) => acc + l.hours, 0);
                        const isToday = iso === todayISO;
                        return (
                            <div
                                key={iso}
                                className={`bg-[#0f1117] border rounded-xl p-3 min-h-[160px] flex flex-col ${isToday ? 'border-purple-500/40' : 'border-white/5'}`}
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <div>
                                        <div className="text-white/40 text-[10px] uppercase tracking-wider">{WEEKDAY_LABELS[d.getDay()]}</div>
                                        <div className="text-white text-sm font-medium">{d.getDate()}</div>
                                    </div>
                                    <button
                                        onClick={() => setActiveDay(iso)}
                                        className="text-white/30 hover:text-purple-400 transition-colors p-1 rounded"
                                        title="Apontar horas"
                                    >
                                        <Plus className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                                <div className="flex-1 space-y-1.5">
                                    {dayLogs.map((log) => (
                                        <div key={log.id} className="bg-white/3 rounded-lg px-2 py-1.5">
                                            <div className="text-white/70 text-xs truncate">{log.card_title ?? log.description ?? 'Apontamento'}</div>
                                            <div className="text-purple-300 text-xs font-mono font-semibold">{log.hours.toFixed(1)}h</div>
                                        </div>
                                    ))}
                                </div>
                                {dayTotal > 0 && (
                                    <div className="mt-2 pt-2 border-t border-white/5 text-right">
                                        <span className="text-white/30 text-[10px]">Total: </span>
                                        <span className="text-white/70 text-xs font-mono font-semibold">{dayTotal.toFixed(1)}h</span>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {activeDay && currentUserId && (
                <ManualEntryModal
                    projectId={projectId}
                    date={activeDay}
                    userId={currentUserId}
                    onClose={() => setActiveDay(null)}
                    onSaved={() => { setActiveDay(null); load(); }}
                />
            )}
        </div>
    );
}

type ContextMode = 'card' | 'scheduling' | 'new_card';

interface ManualEntryModalProps {
    projectId: string;
    date: string;
    userId: string;
    onClose: () => void;
    onSaved: () => void;
}

function ManualEntryModal({ projectId, date, userId, onClose, onSaved }: ManualEntryModalProps) {
    const [mode, setMode] = useState<ContextMode>('card');
    const [cards, setCards] = useState<Card[]>([]);
    const [schedulings, setSchedulings] = useState<Scheduling[]>([]);
    const [boards, setBoards] = useState<Board[]>([]);
    const [selectedCardId, setSelectedCardId] = useState('');
    const [selectedSchedulingId, setSelectedSchedulingId] = useState('');
    const [newCardTitle, setNewCardTitle] = useState('');
    const [newCardBoardId, setNewCardBoardId] = useState('');
    const [hours, setHours] = useState(1);
    const [description, setDescription] = useState('');
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
                console.error('[ManualEntryModal] failed to load options:', err);
            } finally {
                setIsLoadingOptions(false);
            }
        };
        loadOptions();
    }, [projectId]);

    const handleSubmit = async () => {
        // Espelha a constraint dual-reference do ADR-0019 no client antes de chamar o backend.
        if (mode === 'card' && !selectedCardId) { setError('Selecione um card.'); return; }
        if (mode === 'scheduling' && !selectedSchedulingId) { setError('Selecione um agendamento.'); return; }
        if (mode === 'new_card' && (!newCardTitle.trim() || !newCardBoardId)) { setError('Informe o título e o board do novo card.'); return; }
        if (hours <= 0) { setError('Informe uma quantidade de horas válida.'); return; }

        setIsSubmitting(true);
        setError(null);
        try {
            let cardId: string | undefined = mode === 'card' ? selectedCardId : undefined;
            const schedulingId: string | undefined = mode === 'scheduling' ? selectedSchedulingId : undefined;

            if (mode === 'new_card') {
                const newCard = await createCard(newCardBoardId, { title: newCardTitle.trim(), status: 'todo' });
                cardId = newCard.id;
            }

            await createTimeLog(projectId, {
                user_id: userId,
                card_id: cardId,
                scheduling_id: schedulingId,
                date,
                hours,
                description: description || undefined,
                status: 'confirmed',
            });
            onSaved();
        } catch (err: any) {
            console.error('[ManualEntryModal] submit error:', err);
            setError(err?.response?.data?.detail || 'Erro ao salvar o apontamento.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-[#0f1117] border border-purple-500/20 rounded-2xl w-full max-w-md shadow-2xl shadow-purple-900/20">
                <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
                    <h3 className="text-white font-semibold text-sm">
                        Apontar horas — {new Date(`${date}T00:00:00`).toLocaleDateString('pt-BR')}
                    </h3>
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
                                {(['card', 'scheduling', 'new_card'] as ContextMode[]).map((m) => (
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

                            <div>
                                <label className="block text-white/40 text-xs mb-1">Horas</label>
                                <input
                                    type="number" min="0.25" step="0.25" value={hours}
                                    onChange={(e) => setHours(parseFloat(e.target.value) || 0)}
                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500/50"
                                />
                            </div>
                            <div>
                                <label className="block text-white/40 text-xs mb-1">Descrição (opcional)</label>
                                <input
                                    type="text" value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="O que foi feito..."
                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500/50 placeholder:text-white/20"
                                />
                            </div>

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
                        Salvar
                    </button>
                </div>
            </div>
        </div>
    );
}
