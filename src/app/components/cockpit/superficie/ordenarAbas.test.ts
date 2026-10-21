import { describe, expect, it } from 'vitest';
import type { PendenciaDoNo } from '@/services/resumoDoNo';
import { abasVazias } from '@/services/resumoDoNo';
import { CATALOGO_DE_ABAS, CHAVES_DE_ABA, RELEVANCIA_POR_FASE } from './catalogo';
import { abaAoAbrirNo, ordenarAbas } from './ordenarAbas';

const pendencia = (aba: string, desde: string, tipo = 'x'): PendenciaDoNo => ({
    tipo, aba, recurso_id: null, desde, acao: 'agir',
});

const chaves = (lista: { chave: string }[]) => lista.map((a) => a.chave);
const todas = (o: ReturnType<typeof ordenarAbas>) => [...chaves(o.visiveis), ...chaves(o.mais)];

describe('catálogo', () => {
    it('tem as 15 abas, sem repetição', () => {
        expect(CATALOGO_DE_ABAS).toHaveLength(15);
        expect(new Set(CHAVES_DE_ABA).size).toBe(15);
    });

    it('a relevância de toda fase só usa abas do catálogo', () => {
        for (const ordem of Object.values(RELEVANCIA_POR_FASE)) {
            for (const aba of ordem) expect(CHAVES_DE_ABA).toContain(aba);
        }
    });
});

describe('ordenarAbas — as 7 regras do P6', () => {
    it('regra 1: a aba aberta fica em primeiro e não se move com uma pendência nova', () => {
        const antes = ordenarAbas('tasks', [], {}, 'micro_planning', {});
        const depois = ordenarAbas('tasks', [pendencia('plano', '2026-10-20T10:00:00Z')], {}, 'micro_planning', {});
        expect(antes.visiveis[0]).toMatchObject({ chave: 'tasks', aberta: true });
        expect(depois.visiveis[0]).toMatchObject({ chave: 'tasks', aberta: true });
    });

    it('regra 2: a aba com luz vem logo depois da aberta, a mais recente mais perto', () => {
        const ordem = ordenarAbas('tasks', [
            pendencia('cenarios', '2026-10-20T09:00:00Z'),
            pendencia('plano', '2026-10-20T10:00:00Z'),
        ], {}, 'micro_planning', {});
        expect(chaves(ordem.visiveis).slice(0, 3)).toEqual(['tasks', 'plano', 'cenarios']);
        expect(ordem.visiveis[1].luz).toBe(true);
    });

    it('regra 3: novidade sem ação vem depois das luzes, com contador', () => {
        const ordem = ordenarAbas('plano', [pendencia('cenarios', '2026-10-20T09:00:00Z')],
            { walkthroughs: 2 }, 'micro_planning', {});
        expect(chaves(ordem.visiveis).slice(0, 3)).toEqual(['plano', 'cenarios', 'walkthroughs']);
        expect(ordem.visiveis[2]).toMatchObject({ novidade: 2, luz: false });
    });

    it('regra 3: a aba aberta não mostra novidade', () => {
        const ordem = ordenarAbas('walkthroughs', [], { walkthroughs: 3 }, 'retro', {});
        expect(ordem.visiveis[0].novidade).toBe(0);
    });

    it('regra 4: sem luz nem novidade, vale a relevância da fase e depois o catálogo; scratch por último', () => {
        const ordem = ordenarAbas('tasks', [], {}, 'execution', {});
        expect(todas(ordem).slice(0, 8)).toEqual(RELEVANCIA_POR_FASE.execution);
        expect(todas(ordem)[14]).toBe('scratch');
        expect(new Set(todas(ordem)).size).toBe(15);
    });

    it('regra 4: fase fora da tabela usa Walkthroughs, Prompt e Nó', () => {
        const ordem = ordenarAbas('walkthroughs', [], {}, 'triage', {});
        expect(todas(ordem).slice(0, 3)).toEqual(['walkthroughs', 'prompt', 'no']);
    });

    it('regra 5: abas vazias vêm do resumo e vão para "Mais", esmaecidas, com o motivo', () => {
        const vazias = abasVazias({ abas: {
            testplans: { total: 0, motivo_vazio: 'O roteiro do PO nasce na assurance' },
            plano: { total: 2, motivo_vazio: null },
        } });
        const ordem = ordenarAbas('plano', [], {}, 'macro_planning', vazias);
        const tp = ordem.mais.find((a) => a.chave === 'testplans');
        expect(tp).toMatchObject({ vazia: true, motivoVazio: 'O roteiro do PO nasce na assurance' });
        expect(chaves(ordem.visiveis)).not.toContain('testplans');
    });

    it('regra 5: sem resposta do resumo, nenhuma aba é dada como vazia', () => {
        const ordem = ordenarAbas('plano', [], {}, 'macro_planning', abasVazias(null));
        expect(ordem.mais).toEqual([]);
    });

    it('regra 6: com só 2 lugares, a aberta e a com luz ficam visíveis, o resto em "Mais"', () => {
        const ordem = ordenarAbas('tasks', [pendencia('plano', '2026-10-20T10:00:00Z')], {}, 'micro_planning', {}, 2);
        expect(chaves(ordem.visiveis)).toEqual(['tasks', 'plano']);
        expect(ordem.mais).toHaveLength(13);
    });

    it('regra 6: luz nunca cai em "Mais", nem com mais luzes que lugares, nem vazia', () => {
        const ordem = ordenarAbas('tasks', [
            pendencia('plano', '2026-10-20T10:00:00Z'),
            pendencia('atividade', '2026-10-20T11:00:00Z'),
        ], {}, 'micro_planning', { atividade: 'nenhuma chamada' }, 1);
        expect(chaves(ordem.visiveis)).toEqual(['tasks', 'atividade', 'plano']);
        expect(ordem.mais.some((a) => a.luz)).toBe(false);
    });

    it('a luz vem da resposta: sem pendência, nenhuma aba acende', () => {
        const ordem = ordenarAbas('tasks', [], {}, 'micro_planning', {});
        expect([...ordem.visiveis, ...ordem.mais].some((a) => a.luz)).toBe(false);
    });

    it('pendência de aba desconhecida é ignorada', () => {
        const ordem = ordenarAbas('tasks', [pendencia('inexistente', '2026-10-20T10:00:00Z')], {}, 'execution', {});
        expect(new Set(todas(ordem)).size).toBe(15);
        expect([...ordem.visiveis, ...ordem.mais].some((a) => a.luz)).toBe(false);
    });
});

describe('abaAoAbrirNo — regra 7', () => {
    it('a aba com ação pendente mais recente vira a aberta', () => {
        expect(abaAoAbrirNo([
            pendencia('plano', '2026-10-20T09:00:00Z'),
            pendencia('cenarios', '2026-10-20T10:00:00Z', 'bdd_aguardando_validacao'),
        ], 'assurance')).toBe('cenarios');
    });

    it('sem pendência (inclusive viewer, que recebe lista vazia), vale a aba em foco da fase', () => {
        expect(abaAoAbrirNo([], 'assurance')).toBe('testplans');
        expect(abaAoAbrirNo([], 'plan_review')).toBe('revisoes');
        expect(abaAoAbrirNo([], 'fase_nova')).toBe('walkthroughs');
    });
});
