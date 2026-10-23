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

    it('os estados e overrides vêm do motor, independentemente dos cards e pendências', () => {
        const gates=avaliarGates({condicoes:['tasks_finished','ci_passed','plan_approved'],sprintIds:[],cards:[],pendencias:[],
            condicoesDoMotor:[{chave:'tasks_finished',estado:'falta',motivo:'falta',override:false},{chave:'ci_passed',estado:'ok',motivo:null,override:true}]});
        expect(gates.map(g=>g.estado)).toEqual(['falta','ok','motor']);
        expect(gates[1].override).toBe(true);
        expect(gatesQueFaltam(gates).map(g=>g.chave)).toEqual(['tasks_finished']);
    });

    it('cards ainda carregando não viram "falta"', () => {
        const [gate] = avaliarGates({ condicoes: ['cards_done'], sprintIds: [], cards: null, pendencias: [] });
        expect(gate.estado).toBe('motor');
    });
});

it('sem condicoes do resumo, nenhuma condição fica ok', () => {
    const gates=avaliarGates({condicoes:['plan_approved','bdd_validated','sprint_linked'],sprintIds:['s'],cards:[card('done',{bdd_validated:true})],pendencias:[]});
    expect(gates.every(g => g.estado === 'motor')).toBe(true);
});
