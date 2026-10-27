/**
 * Faixa "Cards do escopo" do cabeçalho (P8): o status de cada card, quantos
 * pedem ação sua e o filtro por card. Os cards vêm de `cardsDoEscopo` (TP-2),
 * carregados uma vez por raiz; o que pede ação vem das pendências do `/resumo`,
 * nunca de inferência da tela.
 */
import type { PendenciaDoNo } from '@/services/resumoDoNo';
import type { Card } from '@/services/types';

const COR_DO_STATUS: Record<string, string> = {
    done: 'var(--snaps-accent-green)',
    assurance: 'var(--snaps-accent-purple)',
    in_progress: 'var(--snaps-accent-blue)',
    inprogress: 'var(--snaps-accent-blue)',
    review: 'var(--snaps-accent-purple)',
};

export function rotuloDoCard(card: Pick<Card, 'code' | 'title'>): string {
    return card.code || card.title;
}

/** Cards com ação sua pendente: a pendência aponta o card como recurso. */
export function cardsQuePedemAcao(cards: readonly Card[], pendencias: readonly PendenciaDoNo[]): Set<string> {
    const ids = new Set(cards.map((c) => c.id));
    return new Set(pendencias.map((p) => p.recurso_id).filter((id): id is string => !!id && ids.has(id)));
}

export function textoDosCards(total: number, pedemAcao: number): string {
    const base = `${total} ${total === 1 ? 'card' : 'cards'}`;
    return pedemAcao > 0 ? `${base} · ${pedemAcao} requer ação` : base;
}

export function FaixaDeCards({
    cards,
    pendencias,
    filtro,
    onFiltrar,
    recolhida = false, onAlternar,
}: {
    recolhida?: boolean;
    onAlternar?: () => void;
    cards: Card[] | null;
    pendencias: readonly PendenciaDoNo[];
    filtro: string | null;
    onFiltrar: (cardId: string | null) => void;
}) {
    if (cards === null) {
        return <p className="text-xs text-[var(--snaps-text-secondary)]">Carregando os cards do escopo…</p>;
    }
    if (recolhida) return <div role="group" aria-label="Cards do escopo" className="flex items-center gap-2 text-xs text-[var(--snaps-text-secondary)]">
        <button type="button" aria-expanded={false} onClick={onAlternar}>Cards do escopo · {cards.length}</button>
        {filtro && <><span>{rotuloDoCard(cards.find(c => c.id === filtro) ?? {title:filtro})}</span><button type="button" onClick={() => onFiltrar(null)}>Limpar</button></>}
    </div>;
    const pedem = cardsQuePedemAcao(cards, pendencias);
    const chip = (ativo: boolean) =>
        `flex h-6 items-center gap-1.5 rounded-full border px-2.5 text-xs whitespace-nowrap ${ativo
            ? 'border-white/25 bg-white/10 text-[var(--snaps-text-primary)]'
            : 'border-white/10 bg-white/[0.03] text-[var(--snaps-text-secondary)] hover:bg-white/5'}`;

    return (
        <div role="group" aria-label="Cards do escopo" className="flex flex-wrap items-center gap-1.5">
            <button type="button" aria-expanded={true} onClick={onAlternar} className="mr-1 text-xs text-[var(--snaps-text-secondary)]">Cards do escopo</button>
            <button type="button" aria-pressed={filtro === null} onClick={() => onFiltrar(null)} className={chip(filtro === null)}>
                Todos · {cards.length}
            </button>
            {cards.map((card) => {
                const acao = pedem.has(card.id);
                return (
                    <button
                        key={card.id}
                        type="button"
                        aria-pressed={filtro === card.id}
                        title={`${card.title} · ${card.status}`}
                        onClick={() => onFiltrar(filtro === card.id ? null : card.id)}
                        className={chip(filtro === card.id)}
                    >
                        <span
                            aria-hidden="true"
                            data-acao={acao || undefined}
                            className={`h-1.5 w-1.5 rounded-full ${acao ? 'shadow-[0_0_6px_1px_var(--snaps-accent-yellow)]' : ''}`}
                            style={{ background: acao ? 'var(--snaps-accent-yellow)' : COR_DO_STATUS[card.status] ?? 'var(--snaps-accent-slate)' }}
                        />
                        {rotuloDoCard(card)}
                    </button>
                );
            })}
            {pedem.size > 0 && (
                <span className="ml-1.5 text-xs text-[var(--snaps-accent-yellow)]">
                    ● {pedem.size} requer ação sua
                </span>
            )}
        </div>
    );
}
