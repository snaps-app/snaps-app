/**
 * Item 17, regra (a): sai do ramo o nó que RETOMA a partir de uma fase
 * convergente (rollback ou nova tentativa). O avanço normal depois dela não é
 * retomada e não ganha rótulo nem origem (snapshot v4, `assurance: sprint`).
 */
import { describe, expect, it } from 'vitest';
import type { ArvoreLeve, NoDaArvore, WorkflowSnapshot } from './types';
import { montarHistory, type NoDoHistory } from './workflowSnapshot';

const STATUS = {
    terminais: ['cancelled', 'completed', 'done', 'rolled_back', 'superseded'],
    descartados: ['cancelled', 'rolled_back', 'superseded'],
};

const V4: WorkflowSnapshot = {
    phases: [
        { key: 'micro_planning', label: 'Micro' },
        { key: 'execution', label: 'Execução', branching_strategy: 'per_selected_plan' },
        { key: 'ci_gate', label: 'CI' },
        { key: 'assurance', label: 'Assurance', convergence: 'sprint' },
        { key: 'retro', label: 'Retro', convergence: 'sprint' },
    ],
};

let relogio = 0;
const no = (id: string, phase: string, status: string, extra: Partial<NoDaArvore> = {}): NoDaArvore => ({
    id, phase, status,
    parent_id: null, branch_type: 'main', plan_id: null, plano_titulo: null,
    agent_name: null, card_ids: [], lock_version: 1, workflow_snapshot_hash: 'h1',
    created_at: `2026-10-20T10:${String(relogio++).padStart(2, '0')}:00Z`,
    updated_at: '2026-10-20T10:00:00Z',
    ...extra,
});

const arvore = (nos: NoDaArvore[]): ArvoreLeve => ({ root_id: nos[0].id, nos, workflows: { h1: V4 } });
const nos = (tree: ArvoreLeve) => montarHistory(tree, STATUS).filter((i): i is NoDoHistory => i.tipo === 'no');

const ramos = () => [
    no('m', 'micro_planning', 'completed'),
    no('e1', 'execution', 'completed', { parent_id: 'm', plan_id: 'p1' }),
    no('e2', 'execution', 'completed', { parent_id: 'm', plan_id: 'p2' }),
    no('c1', 'ci_gate', 'completed', { parent_id: 'e1', plan_id: 'p1' }),
    no('c2', 'ci_gate', 'completed', { parent_id: 'e2', plan_id: 'p2' }),
];

describe('regra (a) do item 17 em snapshot v4', () => {
    it('retro depois da assurance convergente não vira "Retomada"', () => {
        const tree = arvore([...ramos(),
            no('a', 'assurance', 'completed', { parent_id: 'c2', plan_id: 'p2' }),
            no('r', 'retro', 'in_progress', { parent_id: 'a', plan_id: 'p2' })]);
        expect(nos(tree).find((n) => n.id === 'r')?.origemId).toBeUndefined();
    });

    it('nova tentativa da assurance convergente continua saindo do ramo, com a origem', () => {
        const tree = arvore([...ramos(),
            no('a', 'assurance', 'rolled_back', { parent_id: 'c2', plan_id: 'p2' }),
            no('a2', 'assurance', 'pending', { parent_id: 'a', plan_id: 'p2', branch_type: 'hotfix' })]);
        expect(nos(tree).find((n) => n.id === 'a2')).toMatchObject({ nivel: 0, origemId: 'a' });
    });
});
