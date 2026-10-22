/** Gates do cabeçalho: do snapshot do nó, com três estados honestos (TP-4). */
import { describe, expect, it } from 'vitest';
import type { Card, WorkflowSnapshot } from '@/services/types';
import { alvoDoRollback, avaliarGates, condicoesDaFase, gatesQueFaltam } from './gatesDoNo';

const SNAPSHOT: WorkflowSnapshot = {
    phases: [
        { key: 'execution', advance_conditions: { tasks_finished: true, ci_passed: true, desligada: false }, on_failure: 'micro_planning' },
        { key: 'micro_planning', advance_conditions: { tactical_plans_approved: true, bdd_validated: true, proposal_approved: true } },
    ],
};
const card = (status: string, extra: Partial<Card> = {}) => ({ id: status, status, bdd_validated: false, ...extra }) as Card;

describe('gatesDoNo', () => {
    it('as condições ligadas e o alvo do rollback saem do snapshot do nó', () => {
        expect(condicoesDaFase(SNAPSHOT, 'execution')).toEqual(['tasks_finished', 'ci_passed']);
        expect(alvoDoRollback(SNAPSHOT, 'execution')).toBe('micro_planning');
        expect(condicoesDaFase(null, 'execution')).toEqual([]);
        expect(condicoesDaFase(SNAPSHOT, 'fase_que_nao_existe')).toEqual([]);
    });

    it('o que a tela sabe vira ok ou falta; o resto é do motor e não trava', () => {
        const gates = avaliarGates({
            condicoes: condicoesDaFase(SNAPSHOT, 'execution'), sprintIds: ['s'], cards: [card('in_progress')], pendencias: [],
        });
        expect(gates).toEqual([
            { chave: 'tasks_finished', rotulo: 'Tasks concluídas (cards em assurance)', estado: 'falta' },
            { chave: 'ci_passed', rotulo: 'CI verde', estado: 'motor' },
        ]);
        expect(gatesQueFaltam(gates).map((g) => g.chave)).toEqual(['tasks_finished']);
    });

    it('aprovação de plano e BDD seguem as pendências do /resumo (que já descontam override)', () => {
        const base = { condicoes: condicoesDaFase(SNAPSHOT, 'micro_planning'), sprintIds: [], cards: [card('todo')] };
        const comPendencia = avaliarGates({
            ...base,
            pendencias: [
                { tipo: 'aprovacao_invalidada', aba: 'plano', recurso_id: 'p', desde: null, acao: 'Reaprovar plano' },
                { tipo: 'gate_humano', aba: 'no', recurso_id: 'n', desde: null, acao: 'Confirmar proposal_approved' },
            ],
        });
        expect(comPendencia.map((g) => g.estado)).toEqual(['falta', 'ok', 'falta']);
        // Viewer (pendências em que a tela não confia): plano fica com o motor, BDD pelos cards.
        expect(avaliarGates({ ...base, pendencias: null }).map((g) => g.estado)).toEqual(['motor', 'falta', 'motor']);
    });

    it('cards ainda carregando não viram "falta"', () => {
        const [gate] = avaliarGates({ condicoes: ['cards_done'], sprintIds: [], cards: null, pendencias: [] });
        expect(gate.estado).toBe('motor');
    });
});
