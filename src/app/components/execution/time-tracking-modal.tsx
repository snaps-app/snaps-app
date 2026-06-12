import React, { useEffect, useState, useCallback } from 'react';
import { X, Clock, Plus, Trash2, ChevronDown, Loader2, CheckCircle } from 'lucide-react';
import { getTimeDraft, createTimeLog } from '@/services/timeLogs';
import { getCard } from '@/services/cards';
import { getProjectBoards } from '@/services/boards';
import type { AgentTaskExecution, Card } from '@/services/types';
import type { DraftEntry, Participant } from '@/types/timeLogs';

interface TimeTrackingModalProps {
    execution: AgentTaskExecution;
    projectId: string;
    onClose: () => void;
    onSkip: () => void;
}

interface EditableDraft extends DraftEntry {
    _key: string;
}

interface ParticipantState extends Participant {
    selected: boolean;
    hours: number;
}

export const TimeTrackingModal: React.FC<TimeTrackingModalProps> = ({
    execution,
    projectId,
    onClose,
    onSkip,
}) => {
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [drafts, setDrafts] = useState<EditableDraft[]>([]);
    const [participants, setParticipants] = useState<ParticipantState[]>([]);
    const [cards, setCards] = useState<Card[]>([]);
    const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const load = async () => {
            setIsLoading(true);
            try {
                const draft = await getTimeDraft(execution.id);

                setDrafts(draft.drafts.map((d, i) => ({
                    ...d,
                    _key: `${d.date}-${d.user_id}-${i}`,
                })));

                setParticipants(draft.participants.map((p) => {
                    const pDrafts = draft.drafts.filter((d) => d.user_id === p.user_id);
                    const totalH = pDrafts.reduce((acc, d) => acc + d.hours, 0);
                    return { ...p, selected: true, hours: Math.round(totalH * 10) / 10 };
                }));

                const cardIds = execution.card_ids ?? [];
                if (cardIds.length > 0) {
                    const resolved = await Promise.all(cardIds.map((id) => getCard(id).catch(() => null)));
                    const valid = resolved.filter(Boolean) as Card[];
                    setCards(valid);
                    if (valid.length === 1) setSelectedCardId(valid[0].id);
                } else {
                    try {
                        const boards = await getProjectBoards(projectId);
                        const tkBoard = boards.find((b: any) => b.type === 'team_kanban');
                        if (tkBoard) setCards(tkBoard.cards ?? []);
                    } catch { }
                }
            } catch (err) {
                console.error('[TimeTrackingModal] load error:', err);
                setError('Não foi possível carregar os dados da sessão.');
            } finally {
                setIsLoading(false);
            }
        };
        load();
    }, [execution.id, projectId]);

    const updateDraftField = (key: string, field: 'hours' | 'description', value: string | number) => {
        setDrafts((prev) => prev.map((d) => (d._key === key ? { ...d, [field]: value } : d)));
    };

    const removeDraft = (key: string) => {
        setDrafts((prev) => prev.filter((d) => d._key !== key));
    };

    const addManualEntry = () => {
        const today = new Date().toISOString().split('T')[0];
        const firstParticipant = participants.find((p) => p.selected);
        setDrafts((prev) => [
            ...prev,
            { _key: `manual-${Date.now()}`, date: today, hours: 1, description: '', user_id: firstParticipant?.user_id ?? '' },
        ]);
    };

    const handleSubmit = async () => {
        if (!selectedCardId) { setError('Selecione um card antes de confirmar.'); return; }
        const selectedParticipants = participants.filter((p) => p.selected);
        if (selectedParticipants.length === 0) { setError('Selecione ao menos um participante.'); return; }
        const activeDrafts = drafts.filter((d) => d.hours > 0);
        if (activeDrafts.length === 0) { setError('Adicione ao menos um apontamento de horas.'); return; }

        setIsSubmitting(true);
        setError(null);
        try {
            const posts: Promise<any>[] = [];
            for (const participant of selectedParticipants) {
                const pDrafts = activeDrafts.filter((d) => d.user_id === participant.user_id || d.user_id === '');
                for (const draft of pDrafts) {
                    posts.push(createTimeLog(projectId, {
                        user_id: participant.user_id,
                        card_id: selectedCardId,
                        agent_execution_id: execution.id,
                        date: draft.date,
                        hours: draft.hours,
                        description: draft.description || undefined,
                        status: 'confirmed',
                    }));
                }
            }
            await Promise.all(posts);
            onClose();
        } catch (err: any) {
            console.error('[TimeTrackingModal] submit error:', err);
            setError(err?.response?.data?.detail || 'Erro ao salvar apontamentos.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const totalHours = drafts.reduce((acc, d) => acc + Number(d.hours || 0), 0);

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-[#0f1117] border border-purple-500/20 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl shadow-purple-900/20">
                <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-500/10 rounded-lg">
                            <Clock className="w-5 h-5 text-purple-400" />
                        </div>
                        <div>
                            <h2 className="text-white font-semibold">Apontamento de Horas</h2>
                            <p className="text-white/40 text-xs">Confirme as horas trabalhadas nesta execução</p>
                        </div>
                    </div>
                    <button onClick={onSkip} className="text-white/30 hover:text-white/60 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
                        </div>
                    ) : (
                        <>
                            <div>
                                <label className="block text-white/60 text-xs font-medium uppercase tracking-wider mb-2">Card relacionado</label>
                                {cards.length === 0 ? (
                                    <p className="text-white/30 text-sm italic">Nenhum card encontrado</p>
                                ) : cards.length === 1 ? (
                                    <div className="flex items-center gap-2 bg-white/5 border border-purple-500/20 rounded-lg px-4 py-2.5">
                                        <CheckCircle className="w-4 h-4 text-purple-400 flex-shrink-0" />
                                        <span className="text-white text-sm">{cards[0].title}</span>
                                    </div>
                                ) : (
                                    <div className="relative">
                                        <select
                                            value={selectedCardId ?? ''}
                                            onChange={(e) => setSelectedCardId(e.target.value || null)}
                                            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm appearance-none focus:outline-none focus:border-purple-500/50 pr-10"
                                        >
                                            <option value="">Selecione um card...</option>
                                            {cards.map((c) => (
                                                <option key={c.id} value={c.id}>{c.title}</option>
                                            ))}
                                        </select>
                                        <ChevronDown className="w-4 h-4 text-white/30 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                                    </div>
                                )}
                            </div>

                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <label className="text-white/60 text-xs font-medium uppercase tracking-wider">Entradas diárias</label>
                                    <button onClick={addManualEntry} className="flex items-center gap-1 text-purple-400 hover:text-purple-300 text-xs transition-colors">
                                        <Plus className="w-3.5 h-3.5" /> Adicionar
                                    </button>
                                </div>
                                {drafts.length === 0 ? (
                                    <p className="text-white/30 text-sm italic">Nenhuma sessão registrada. Adicione manualmente.</p>
                                ) : (
                                    <div className="space-y-2">
                                        {drafts.map((draft) => (
                                            <div key={draft._key} className="flex items-center gap-3 bg-white/3 border border-white/5 rounded-lg px-3 py-2">
                                                <span className="text-white/40 text-xs w-24 flex-shrink-0 font-mono">{draft.date}</span>
                                                <input
                                                    type="number" min="0" step="0.5" value={draft.hours}
                                                    onChange={(e) => updateDraftField(draft._key, 'hours', parseFloat(e.target.value) || 0)}
                                                    className="w-20 bg-transparent border border-white/10 rounded px-2 py-1 text-white text-sm text-center focus:outline-none focus:border-purple-500/50"
                                                />
                                                <span className="text-white/30 text-xs">h</span>
                                                <input
                                                    type="text" value={draft.description}
                                                    onChange={(e) => updateDraftField(draft._key, 'description', e.target.value)}
                                                    placeholder="Descrição..."
                                                    className="flex-1 bg-transparent border border-white/10 rounded px-2 py-1 text-white text-sm focus:outline-none focus:border-purple-500/50 placeholder:text-white/20"
                                                />
                                                <button onClick={() => removeDraft(draft._key)} className="text-white/20 hover:text-red-400/70 transition-colors">
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                <div className="mt-3 text-right">
                                    <span className="text-white/40 text-xs">Total: </span>
                                    <span className="text-purple-300 text-sm font-semibold font-mono">{totalHours.toFixed(1)}h</span>
                                </div>
                            </div>

                            {participants.length > 0 && (
                                <div>
                                    <label className="block text-white/60 text-xs font-medium uppercase tracking-wider mb-2">Participantes</label>
                                    <div className="space-y-2">
                                        {participants.map((p) => (
                                            <div key={p.user_id} className="flex items-center gap-3 bg-white/3 border border-white/5 rounded-lg px-3 py-2">
                                                <input type="checkbox" checked={p.selected}
                                                    onChange={(e) => setParticipants((prev) => prev.map((pp) => pp.user_id === p.user_id ? { ...pp, selected: e.target.checked } : pp))}
                                                    className="w-4 h-4 accent-purple-500"
                                                />
                                                <div className="w-7 h-7 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                                                    <span className="text-purple-300 text-xs font-bold">{p.display_name.charAt(0).toUpperCase()}</span>
                                                </div>
                                                <span className="text-white text-sm flex-1">{p.display_name}</span>
                                                <span className="text-white/30 text-xs">{p.sessions_count} sessão{p.sessions_count !== 1 ? 'ões' : ''}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {error && (
                                <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2">{error}</p>
                            )}
                        </>
                    )}
                </div>

                <div className="flex items-center justify-between px-6 py-4 border-t border-white/5">
                    <button onClick={onSkip} className="text-white/40 hover:text-white/60 text-sm transition-colors" disabled={isSubmitting}>Pular</button>
                    <button onClick={handleSubmit} disabled={isSubmitting || isLoading}
                        className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors">
                        {isSubmitting ? (<><Loader2 className="w-4 h-4 animate-spin" />Salvando...</>) : (<><CheckCircle className="w-4 h-4" />Confirmar apontamentos</>)}
                    </button>
                </div>
            </div>
        </div>
    );
};
