import { useEffect, useState, useCallback } from 'react';
import { X, Plus, Trash2, Loader2, Clock } from 'lucide-react';
import {
    listExecutionSessions,
    createExecutionSession,
    updateExecutionSession,
    deleteExecutionSession,
} from '@/services/timeLogs';
import type { ExecutionSession } from '@/types/timeLogs';

interface SessionManagerModalProps {
    executionId: string;
    onClose: () => void;
    // Called after any change so the caller can refresh downstream state (e.g. the time draft).
    onChanged?: () => void;
}

function pad(n: number): string {
    return String(n).padStart(2, '0');
}

// ISO string -> value for a <input type="datetime-local"> in the viewer's local time.
function isoToLocalInput(iso: string): string {
    const d = new Date(iso);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// datetime-local value (local time) -> ISO (UTC) string for the API.
function localInputToIso(val: string): string {
    return new Date(val).toISOString();
}

function fmtDuration(hours: number): string {
    if (!hours || hours <= 0) return '—';
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return h > 0 ? `${h}h ${pad(m)}m` : `${m}m`;
}

const inputCls =
    'bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-white text-xs focus:outline-none focus:border-purple-500/50 [color-scheme:dark]';

export function SessionManagerModal({ executionId, onClose, onChanged }: SessionManagerModalProps) {
    const [sessions, setSessions] = useState<ExecutionSession[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [busyId, setBusyId] = useState<string | null>(null);
    const [newStart, setNewStart] = useState('');
    const [newEnd, setNewEnd] = useState('');
    const [isCreating, setIsCreating] = useState(false);

    const load = useCallback(async () => {
        setIsLoading(true);
        try {
            setSessions(await listExecutionSessions(executionId));
        } catch (err) {
            console.error('[SessionManagerModal] load error:', err);
            setError('Erro ao carregar sessões.');
        } finally {
            setIsLoading(false);
        }
    }, [executionId]);

    useEffect(() => { load(); }, [load]);

    const notifyChanged = () => { if (onChanged) onChanged(); };

    const handleEditField = async (session: ExecutionSession, field: 'started_at' | 'ended_at', localValue: string) => {
        if (!localValue) return;
        setError(null);
        setBusyId(session.id);
        try {
            const updated = await updateExecutionSession(executionId, session.id, { [field]: localInputToIso(localValue) });
            setSessions((prev) => prev.map((s) => (s.id === session.id ? updated : s)));
            notifyChanged();
        } catch (err: any) {
            setError(err?.response?.data?.detail || 'Erro ao salvar sessão.');
            load();
        } finally {
            setBusyId(null);
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Excluir esta sessão? O tempo dela deixa de contar no apontamento.')) return;
        setError(null);
        setBusyId(id);
        try {
            await deleteExecutionSession(executionId, id);
            setSessions((prev) => prev.filter((s) => s.id !== id));
            notifyChanged();
        } catch (err: any) {
            setError(err?.response?.data?.detail || 'Erro ao excluir sessão.');
        } finally {
            setBusyId(null);
        }
    };

    const handleCreate = async () => {
        if (!newStart || !newEnd) { setError('Informe início e fim.'); return; }
        if (new Date(newEnd) <= new Date(newStart)) { setError('O fim deve ser depois do início.'); return; }
        setError(null);
        setIsCreating(true);
        try {
            const created = await createExecutionSession(executionId, {
                started_at: localInputToIso(newStart),
                ended_at: localInputToIso(newEnd),
            });
            setSessions((prev) => [created, ...prev]);
            setNewStart('');
            setNewEnd('');
            notifyChanged();
        } catch (err: any) {
            setError(err?.response?.data?.detail || 'Erro ao criar sessão.');
        } finally {
            setIsCreating(false);
        }
    };

    const totalHours = sessions.reduce((acc, s) => acc + (s.duration_hours || 0), 0);

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-[#0f1117] border border-purple-500/20 rounded-2xl w-full max-w-2xl shadow-2xl shadow-purple-900/20 max-h-[85vh] flex flex-col">
                <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
                    <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-purple-400" />
                        <h3 className="text-white font-semibold text-sm">Gerenciar sessões</h3>
                        <span className="text-white/30 text-xs">Total: {fmtDuration(totalHours)}</span>
                    </div>
                    <button onClick={onClose} className="text-white/30 hover:text-white/60 transition-colors">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <div className="px-5 py-4 overflow-y-auto space-y-4">
                    {error && (
                        <p className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>
                    )}

                    {isLoading ? (
                        <div className="flex items-center justify-center py-10">
                            <Loader2 className="w-5 h-5 text-purple-400 animate-spin" />
                        </div>
                    ) : sessions.length === 0 ? (
                        <p className="text-white/30 text-sm italic py-4">Nenhuma sessão registrada ainda. Crie uma abaixo.</p>
                    ) : (
                        <div className="space-y-2">
                            {sessions.map((s) => {
                                const active = !s.ended_at;
                                return (
                                    <div key={s.id} className="flex items-center gap-3 flex-wrap bg-white/[0.02] border border-white/5 rounded-lg px-3 py-2">
                                        <span className="text-white/60 text-xs w-32 truncate" title={s.user_display_name}>{s.user_display_name}</span>
                                        <div className="flex items-center gap-1.5 text-xs text-white/40">
                                            <span>Início</span>
                                            <input
                                                type="datetime-local"
                                                defaultValue={isoToLocalInput(s.started_at)}
                                                onBlur={(e) => { const v = e.target.value; if (v && v !== isoToLocalInput(s.started_at)) handleEditField(s, 'started_at', v); }}
                                                className={inputCls}
                                            />
                                        </div>
                                        <div className="flex items-center gap-1.5 text-xs text-white/40">
                                            <span>Fim</span>
                                            <input
                                                type="datetime-local"
                                                defaultValue={s.ended_at ? isoToLocalInput(s.ended_at) : ''}
                                                onBlur={(e) => { const v = e.target.value; if (v && (!s.ended_at || v !== isoToLocalInput(s.ended_at))) handleEditField(s, 'ended_at', v); }}
                                                className={inputCls}
                                            />
                                        </div>
                                        <span className={`text-xs font-mono ml-auto ${active ? 'text-amber-300' : 'text-purple-300'}`}>
                                            {active ? 'em andamento' : fmtDuration(s.duration_hours)}
                                        </span>
                                        <button
                                            onClick={() => handleDelete(s.id)}
                                            disabled={busyId === s.id}
                                            className="p-1.5 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all disabled:opacity-40"
                                            title="Excluir sessão"
                                        >
                                            {busyId === s.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Create new session */}
                    <div className="border-t border-white/5 pt-4">
                        <p className="text-[10px] uppercase tracking-wider text-white/40 font-bold mb-2">Nova sessão manual</p>
                        <div className="flex items-end gap-3 flex-wrap">
                            <label className="flex flex-col gap-1 text-[10px] text-white/40">
                                Início
                                <input type="datetime-local" value={newStart} onChange={(e) => setNewStart(e.target.value)} className={inputCls} />
                            </label>
                            <label className="flex flex-col gap-1 text-[10px] text-white/40">
                                Fim
                                <input type="datetime-local" value={newEnd} onChange={(e) => setNewEnd(e.target.value)} className={inputCls} />
                            </label>
                            <button
                                onClick={handleCreate}
                                disabled={isCreating}
                                className="flex items-center gap-1.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                            >
                                {isCreating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                                Adicionar
                            </button>
                        </div>
                    </div>
                </div>

                <div className="flex items-center justify-end px-5 py-4 border-t border-white/5">
                    <button onClick={onClose} className="text-white/60 hover:text-white text-sm transition-colors px-4 py-1.5 rounded-lg bg-white/5 hover:bg-white/10">
                        Concluído
                    </button>
                </div>
            </div>
        </div>
    );
}
