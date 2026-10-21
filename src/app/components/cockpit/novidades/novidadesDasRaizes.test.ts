/** Marca de novidade por nó e por aba de raiz (P15; ADR-0071, 5b): as regras puras. */
import { describe, expect, it } from 'vitest';
import type { NoDaArvore } from '@/services/types';
import { abrirAbaDeRaiz, assinaturaDoNo, atualizarVistos, totalDeNovidades, verNo } from './novidadesDasRaizes';

function no(id: string, extra: Partial<NoDaArvore> = {}): NoDaArvore {
    return {
        id, parent_id: null, phase: 'execution', status: 'in_progress', branch_type: null, plan_id: null,
        plano_titulo: null, agent_name: '@x', card_ids: [], created_at: '2026-10-21T10:00:00Z',
        updated_at: '2026-10-21T10:00:00Z', lock_version: 1, workflow_snapshot_hash: 'h', ...extra,
    };
}

const A = no('a');
const B = no('b', { parent_id: 'a' });
const C = no('c', { parent_id: 'a' });
const visivel = (selecionado: string | null = 'a') => ({ selecionado, ativa: true });
const inativa = { selecionado: null, ativa: false };

describe('atualizarVistos', () => {
    it('a primeira árvore é a base: abrir não acende nada', () => {
        const base = atualizarVistos(null, [A, B, C], visivel());
        expect(base.contagem).toEqual({});
        expect(base.aba).toBe(false);
        expect(Object.keys(base.base)).toEqual(['a', 'b', 'c']);
    });

    it('árvore igual devolve o mesmo estado (nada redesenha)', () => {
        const base = atualizarVistos(null, [A, B, C], visivel());
        expect(atualizarVistos(base, [A, { ...B }, C], visivel())).toBe(base);
    });

    it.each([
        ['status', { status: 'awaiting_advance' }],
        ['fase', { phase: 'ci_gate' }],
        ['revisão', { lock_version: 2 }],
        ['plano', { plan_id: 'pl-9' }],
        ['cards', { card_ids: ['c-1'] }],
        ['updated_at', { updated_at: '2026-10-21T11:00:00Z' }],
    ])('mudou %s: o nó ganha marca', (_campo, mudanca) => {
        const base = atualizarVistos(null, [A, B, C], visivel());
        const depois = atualizarVistos(base, [A, { ...B, ...mudanca }, C], visivel());
        expect(depois.contagem).toEqual({ b: 1 });
    });

    it('filho novo marca o pai e o próprio filho (uma tentativa nova aparece no nó de onde saiu)', () => {
        const base = atualizarVistos(null, [A, B, C], visivel('c'));
        const tentativa = no('b2', { parent_id: 'b' });
        expect(atualizarVistos(base, [A, B, C, tentativa], visivel('c')).contagem).toEqual({ b: 1, b2: 1 });
    });

    it('o nó selecionado da aba visível nunca ganha marca: está no stream', () => {
        const base = atualizarVistos(null, [A, B], visivel('b'));
        expect(atualizarVistos(base, [A, { ...B, status: 'completed' }], visivel('b')).contagem).toEqual({});
    });

    it('novidade com a aba inativa acende a aba; na aba visível, não', () => {
        const base = atualizarVistos(null, [A, B], inativa);
        const naInativa = atualizarVistos(base, [A, { ...B, status: 'completed' }], inativa);
        expect(naInativa.aba).toBe(true);
        expect(naInativa.contagem).toEqual({ b: 1 });

        const naVisivel = atualizarVistos(atualizarVistos(null, [A, B], visivel()), [A, { ...B, status: 'completed' }], visivel());
        expect(naVisivel.aba).toBe(false);
    });

    it('as marcas somam até o nó ser visto', () => {
        let estado = atualizarVistos(null, [A, B], visivel());
        estado = atualizarVistos(estado, [A, { ...B, lock_version: 2 }], visivel());
        estado = atualizarVistos(estado, [A, { ...B, lock_version: 3 }], visivel());
        expect(totalDeNovidades(estado)).toBe(2);
        expect(totalDeNovidades(verNo(estado, 'b'))).toBe(0);
    });
});

describe('verNo e abrirAbaDeRaiz', () => {
    it('selecionar o nó apaga só a marca dele; abrir a aba apaga só a da aba', () => {
        let estado = atualizarVistos(null, [A, B, C], inativa);
        estado = atualizarVistos(estado, [A, { ...B, status: 'x' }, { ...C, status: 'y' }], inativa);
        expect(estado).toMatchObject({ contagem: { b: 1, c: 1 }, aba: true });

        const aberta = abrirAbaDeRaiz(estado);
        expect(aberta).toMatchObject({ contagem: { b: 1, c: 1 }, aba: false });
        expect(verNo(aberta, 'b').contagem).toEqual({ c: 1 });
        expect(verNo(aberta, 'a')).toBe(aberta);
        expect(abrirAbaDeRaiz(aberta)).toBe(aberta);
    });
});

describe('assinaturaDoNo', () => {
    it('não depende da ordem dos campos', () => {
        const invertido = Object.fromEntries(Object.entries(B).reverse()) as unknown as NoDaArvore;
        expect(assinaturaDoNo(invertido)).toBe(assinaturaDoNo(B));
    });
});
