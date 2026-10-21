import { describe, expect, it, vi } from 'vitest';
import type { Card } from './types';
import { cardsDoEscopo, escopoDeCards } from './executionScope';

const card = (id: string) => ({ id }) as Card;

describe('cardsDoEscopo', () => {
    it('com card_ids, só os card_ids — nunca a sprint inteira', async () => {
        const getCardsBySprint = vi.fn(async () => Array.from({ length: 11 }, (_, i) => card(`s${i}`)));
        const getCard = vi.fn(async (id: string) => card(id));
        const ids = ['c1', 'c2', 'c3', 'c4', 'c5'];

        const cards = await cardsDoEscopo({ card_ids: ids, sprint_ids: ['sprint'] }, { getCard, getCardsBySprint });

        expect(cards.map((c) => c.id)).toEqual(ids);
        expect(getCardsBySprint).not.toHaveBeenCalled();
    });

    it('só com card_ids vazios, os cards da sprint', async () => {
        const getCardsBySprint = vi.fn(async () => [card('s1'), card('s2')]);
        const getCard = vi.fn();

        const cards = await cardsDoEscopo({ card_ids: [], sprint_ids: ['sprint'] }, { getCard, getCardsBySprint });

        expect(cards.map((c) => c.id)).toEqual(['s1', 's2']);
        expect(getCard).not.toHaveBeenCalled();
    });

    it('sem card_ids nem sprint, nenhum card', () => {
        expect(escopoDeCards({ card_ids: [], sprint_ids: [] })).toEqual({ fonte: 'nenhum' });
    });
});
