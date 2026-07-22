import { useEffect, useState } from 'react';
import { X, Clock, Plus, Trash2, ChevronDown, Loader2, CheckCircle } from 'lucide-react';
import { getTimeDraft, createTimeLog } from '@/services/timeLogs';
import { getCard, updateCard, createCard } from '@/services/cards';
import { getProjectBoards } from '@/services/boards';
import type { AgentTaskExecution, Card, Board } from '@/services/types';
import type { Participant } from '@/types/timeLogs';
import { supabase } from '@/lib/supabaseClient';

interface TimeTrackingModalProps {
    execution: AgentTaskExecution;
    projectId: string;
    /** Cards already loaded by the cockpit (includes the sprint macrocard). */
    availableCards?: Card[];
    onClose: () => void;
    onSkip: () => void;
}

// Each daily entry carries its own participants and date. On confirm, one time_log
// is created per (entry × participant), each with the entry's full hours.
interface EditableDraft {
    _key: string;
    date: string;
    hours: number;
    description: string;
    participantIds: string[];
}

export const TimeTrackingModal: React.FC<TimeTrackingModalProps> = ({
    execution,
    projectId,
    availableCards,
    onClose,
    onSkip,
}) => {
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [drafts, setDrafts] = useState<EditableDraft[]>([]);
    const [participants, setParticipants] = useState<Participant[]>([]);
    const [currentUserId, setCurrentUserId] = useState<string>('');
    const [cards, setCards] = useState<Card[]>([]);
    const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    // On-the-fly card creation (peer review Fase 3.5): usuário escolhe o board, não fixo em "Roadmap".
    const [cardMode, setCardMode] = useState<'existing' | 'new'>('existing');
    const [projectBoards, setProjectBoards] = useState<Board[]>([]);
    const [newCardTitle, setNewCardTitle] = useState('');
    const [newCardBoardId, setNewCardBoardId] = useState<string | null>(null);
    const [isCreatingCard, setIsCreatingCard] = useState(false);

    useEffect(() => {
        const load = async () => {
            setIsLoading(true);
            try {
                const { data: { user: currentUser } } = await supabase.auth.getUser();
                const uid = currentUser?.id ?? '';
                setCurrentUserId(uid);

                const draft = await getTimeDraft(execution.id);

                // Each draft starts assigned to its own session owner (or the current user).
                setDrafts(draft.drafts.map((d, i) => ({
                    _key: `${d.date}-${d.user_id}-${i}`,
                    date: d.date,
                    hours: Math.round(d.hours * 100) / 100,
                    description: d.description,
                    participantIds: [String(d.user_id) || uid].filter(Boolean),
                })));

                setParticipants(draft.participants);

                // Prefer the cockpit's already-loaded card list (includes the sprint macrocard,
                // loaded via getCardsBySprint). Fall back to fetching by card_ids / board.
                let collected: Card[] = availableCards ?? [];
                if (collected.length === 0) {
                    const cardIds = execution.card_ids ?? [];
                    if (cardIds.length > 0) {
                        const resolved = await Promise.all(cardIds.map((id) => getCard(id).catch(() => null)));
                        collected = resolved.filter(Boolean) as Card[];
                    } else {
                        try {
                            const boards = await getProjectBoards(projectId);
                            const tkBoard = boards.find((b: any) => b.type === 'team_kanban');
                            if (tkBoard) collected = tkBoard.cards ?? [];
                        } catch { }
                    }
                }

                setCards(collected);
                if (collected.length === 1) setSelectedCardId(collected[0].id);

                try {
                    const fetchedBoards = await getProjectBoards(projectId);
                    setProjectBoards(fetchedBoards);
                } catch (boardsErr) {
                    console.warn('[TimeTrackingModal] failed to load boards:', boardsErr);
                }
            } catch (err: any) {
                console.error('[TimeTrackingModal] load error:', err);
                const msg = err?.message || String(err);
                setError(`Não foi possível carregar os dados: ${msg}`);
            } finally {
                setIsLoading(false);
            }
        };
        load();
    }, [execution.id, projectId]);

    const updateDraftField = (key: string, field: 'hours' | 'description' | 'date', value: string | number) => {
        setDrafts((prev) => prev.map((d) => (d._key === key ? { ...d, [field]: value } : d)));
    };

    const toggleParticipant = (key: string, userId: string) => {
        setDrafts((prev) => prev.map((d) => {
            if (d._key !== key) return d;
            const on = d.participantIds.includes(userId);
            return { ...d, participantIds: on ? d.participantIds.filter((id) => id !== userId) : [...d.participantIds, userId] };
        }));
    };

    const removeDraft = (key: string) => {
        setDrafts((prev) => prev.filter((d) => d._key !== key));
    };

    const addManualEntry = () => {
        const today = new Date().toISOString().split('T')[0];
        const defaultParticipant = participants.find((p) => String(p.user_id) === currentUserId)?.user_id
            ?? participants[0]?.user_id;
        setDrafts((prev) => [
            ...prev,
            { _key: `manual-${Date.now()}`, date: today, hours: 1, description: '', participantIds: defaultParticipant ? [String(defaultParticipant)] : [] },
        ]);
    };

    const handleSubmit = async () => {
        if (cardMode === 'new') {
            if (!newCardTitle.trim()) { setError('Informe o título do novo card.'); return; }
            if (!newCardBoardId) { setError('Selecione em qual board o card será criado.'); return; }
        } else if (!selectedCardId) {
            setError('Selecione um card antes de confirmar.');
            return;
        }
        const activeDrafts = drafts.filter((d) => d.hours > 0);
        if (activeDrafts.length === 0) { setError('Adicione ao menos um apontamento de horas.'); return; }
        if (activeDrafts.some((d) => d.participantIds.length === 0)) {
            setError('Cada entrada precisa de ao menos um participante.');
            return;
        }

        setIsSubmitting(true);
        setError(null);
        try {
            let targetCardId = selectedCardId;
            if (cardMode === 'new') {
                setIsCreatingCard(true);
                try {
                    const newCard = await createCard(newCardBoardId as string, {
                        title: newCardTitle.trim(),
                        status: 'todo',
                    });
                    targetCardId = newCard.id;
                    setCards((prev) => [...prev, newCard]);
                    setSelectedCardId(newCard.id);
                } finally {
                    setIsCreatingCard(false);
                }
            }

            // One time_log per (entry × participant), each getting the entry's full hours.
            const posts: Promise<any>[] = [];
            const allParticipantIds = new Set<string>();
            for (const draft of activeDrafts) {
                for (const userId of draft.participantIds) {
                    allParticipantIds.add(userId);
                    posts.push(createTimeLog(projectId, {
                        user_id: userId,
                        card_id: targetCardId as string,
                        agent_execution_id: execution.id,
                        date: draft.date,
                        hours: draft.hours,
                        description: draft.description || undefined,
                        status: 'confirmed',
                    }));
                }
            }
            await Promise.all(posts);

            try {
                const targetCard = cards.find(c => c.id === targetCardId);
                if (targetCard) {
                    const existingUserIds = targetCard.user_ids || [];
                    const mergedUserIds = Array.from(new Set([...existingUserIds, ...allParticipantIds]));
                    if (mergedUserIds.length > existingUserIds.length) {
                        await updateCard(targetCardId as string, { user_ids: mergedUserIds });
                    }
                }
            } catch (cardErr) {
                console.error('[TimeTrackingModal] failed to append user_ids to card:', cardErr);
            }

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
                                <div className="flex items-center justify-between mb-2">
                                    <label className="text-white/60 text-xs font-medium uppercase tracking-wider">Card relacionado</label>
                                    <div className="flex items-center gap-1 bg-white/5 rounded-lg p-0.5">
                                        <button
                                            type="button"
                                            onClick={() => setCardMode('existing')}
                                            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${cardMode === 'existing' ? 'bg-purple-500/20 text-purple-300' : 'text-white/40 hover:text-white/60'}`}
                                        >
                                            Selecionar existente
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setCardMode('new')}
                                            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${cardMode === 'new' ? 'bg-purple-500/20 text-purple-300' : 'text-white/40 hover:text-white/60'}`}
                                        >
                                            Criar novo card
                                        </button>
                                    </div>
                                </div>

                                {cardMode === 'existing' ? (
                                    cards.length === 0 ? (
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
                                    )
                                ) : (
                                    <div className="space-y-2">
                                        <input
                                            type="text"
                                            value={newCardTitle}
                                            onChange={(e) => setNewCardTitle(e.target.value)}
                                            placeholder="Título do novo card..."
                                            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500/50 placeholder:text-white/20"
                                        />
                                        <div className="relative">
                                            <select
                                                value={newCardBoardId ?? ''}
                                                onChange={(e) => setNewCardBoardId(e.target.value || null)}
                                                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm appearance-none focus:outline-none focus:border-purple-500/50 pr-10"
                                            >
                                                <option value="">Selecione o board...</option>
                                                {projectBoards.map((b) => (
                                                    <option key={b.id} value={b.id}>{b.name}</option>
                                                ))}
                                            </select>
                                            <ChevronDown className="w-4 h-4 text-white/30 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                                        </div>
                                        {projectBoards.length === 0 && (
                                            <p className="text-white/30 text-xs italic">Nenhum board encontrado neste projeto.</p>
                                        )}
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
                                            <div key={draft._key} className="bg-white/3 border border-white/5 rounded-lg px-3 py-2 space-y-2">
                                                <div className="flex items-center gap-3">
                                                    <input
                                                        type="date" value={draft.date}
                                                        onChange={(e) => updateDraftField(draft._key, 'date', e.target.value)}
                                                        className="w-36 bg-transparent border border-white/10 rounded px-2 py-1 text-white text-xs focus:outline-none focus:border-purple-500/50 [color-scheme:dark]"
                                                    />
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
                                                {participants.length > 0 && (
                                                    <div className="flex items-center gap-1.5 flex-wrap pl-1">
                                                        {participants.map((p) => {
                                                            const on = draft.participantIds.includes(String(p.user_id));
                                                            return (
                                                                <button
                                                                    key={p.user_id}
                                                                    type="button"
                                                                    onClick={() => toggleParticipant(draft._key, String(p.user_id))}
                                                                    className={`flex items-center gap-1 pl-1 pr-2 py-0.5 rounded-full text-[11px] border transition-colors ${on ? 'bg-purple-500/20 border-purple-500/40 text-purple-200' : 'bg-white/5 border-white/10 text-white/40 hover:text-white/60'}`}
                                                                    title={p.display_name}
                                                                >
                                                                    <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold ${on ? 'bg-purple-500/30 text-purple-100' : 'bg-white/10 text-white/50'}`}>
                                                                        {p.display_name.charAt(0).toUpperCase()}
                                                                    </span>
                                                                    {p.display_name}
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                                <div className="mt-3 flex items-center justify-between">
                                    <span className="text-white/30 text-[11px]">Cada participante recebe as horas cheias da entrada.</span>
                                    <div>
                                        <span className="text-white/40 text-xs">Total: </span>
                                        <span className="text-purple-300 text-sm font-semibold font-mono">{totalHours.toFixed(1)}h</span>
                                    </div>
                                </div>
                            </div>

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
                        {isSubmitting ? (
                            <><Loader2 className="w-4 h-4 animate-spin" />{isCreatingCard ? 'Criando card...' : 'Salvando...'}</>
                        ) : (
                            <><CheckCircle className="w-4 h-4" />Confirmar apontamentos</>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};
