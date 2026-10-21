/**
 * Cards do escopo de um nó (P8), numa função só: a aba Cards e a faixa do
 * cabeçalho (TP-4) leem daqui.
 *
 * Os `card_ids` do nó quando não vazios. Só quando estão vazios valem os
 * cards da sprint. O Cockpit atual UNE os dois (`useCockpitState.ts`, F4) e
 * mostrava 11 cards numa raiz de 5.
 */
import { getCard } from './cards';
import { getCardsBySprint } from './sprints';
import type { AgentTaskExecution, Card } from './types';

export type EscopoDeCards =
    | { fonte: 'card_ids'; cardIds: string[] }
    | { fonte: 'sprint'; sprintIds: string[] }
    | { fonte: 'nenhum' };

type NoComEscopo = Pick<AgentTaskExecution, 'card_ids' | 'sprint_ids'>;

export function escopoDeCards(execution: NoComEscopo): EscopoDeCards {
    const ids = (execution.card_ids ?? []).filter(Boolean);
    if (ids.length > 0) return { fonte: 'card_ids', cardIds: [...new Set(ids)] };
    const sprints = (execution.sprint_ids ?? []).filter(Boolean);
    if (sprints.length > 0) return { fonte: 'sprint', sprintIds: sprints };
    return { fonte: 'nenhum' };
}

interface Dependencias {
    getCard: (id: string) => Promise<Card>;
    getCardsBySprint: (sprintId: string) => Promise<Card[]>;
}

export async function cardsDoEscopo(
    execution: NoComEscopo,
    deps: Dependencias = { getCard, getCardsBySprint },
): Promise<Card[]> {
    const escopo = escopoDeCards(execution);
    if (escopo.fonte === 'card_ids') {
        return Promise.all(escopo.cardIds.map((id) => deps.getCard(id)));
    }
    if (escopo.fonte === 'sprint') {
        const listas = await Promise.all(escopo.sprintIds.map((id) => deps.getCardsBySprint(id)));
        return listas.flatMap((lista) => lista ?? []);
    }
    return [];
}
