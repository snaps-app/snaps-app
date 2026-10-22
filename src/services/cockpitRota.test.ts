/** A rota única para um nó do Cockpit (TP-3 da Sprint 24.0). */
import { describe, expect, it } from 'vitest';
import { eIdDeExecucao, lerRotaDoCockpit, raizDoNo, rotaDoNo } from '@/services/cockpitRota';

const RAIZ = 'acc98642-1918-40ae-95a9-a5134caa575c';
const NO = '9c52578d-d298-4b2b-bdfc-aa342e1c26ce';

describe('rotaDoNo', () => {
    it('sem aba: raiz no caminho, nó na query', () => {
        expect(rotaDoNo({ id: NO, root_id: RAIZ })).toBe(`/cockpit/${RAIZ}?no=${NO}`);
    });

    it('com aba: acrescenta &aba=', () => {
        expect(rotaDoNo({ id: NO, root_id: RAIZ }, 'scratch')).toBe(`/cockpit/${RAIZ}?no=${NO}&aba=scratch`);
    });

    it('a raiz sem root_id (linha antiga) é ela mesma', () => {
        expect(rotaDoNo({ id: RAIZ, root_id: null })).toBe(`/cockpit/${RAIZ}?no=${RAIZ}`);
        expect(raizDoNo({ id: RAIZ })).toBe(RAIZ);
    });

    it('aba vazia não vira parâmetro', () => {
        expect(rotaDoNo({ id: NO, root_id: RAIZ }, '')).toBe(`/cockpit/${RAIZ}?no=${NO}`);
    });

    it('lerRotaDoCockpit devolve o que rotaDoNo escreveu', () => {
        const busca = new URLSearchParams(rotaDoNo({ id: NO, root_id: RAIZ }, 'plano').split('?')[1]);
        expect(lerRotaDoCockpit(busca)).toEqual({ no: NO, aba: 'plano' });
        expect(lerRotaDoCockpit(new URLSearchParams())).toEqual({ no: null, aba: null });
    });
});

describe('eIdDeExecucao', () => {
    it('só UUID inteiro: prefixo não é raiz (a busca casaria qualquer uma)', () => {
        expect(eIdDeExecucao(RAIZ)).toBe(true);
        expect(eIdDeExecucao(RAIZ.slice(0, 8))).toBe(false);
        expect(eIdDeExecucao('')).toBe(false);
        expect(eIdDeExecucao(undefined)).toBe(false);
    });
});
