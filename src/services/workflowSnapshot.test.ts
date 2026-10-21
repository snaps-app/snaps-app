/**
 * History do Cockpit — Sprint 24.0, E21 (TP-1).
 *
 * O Cockpit atual lia as fases do catálogo de templates e tinha a própria
 * lista de "terminal" (com `failed`). Estes testes fixam que as fases vêm do
 * snapshot do nó, que a lista de terminais vem da API e que a árvore segue
 * `parent_id`, com rollback e retry como nós próprios.
 */
import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

import type { ArvoreLeve, NoDaArvore, WorkflowSnapshot } from './types';
import { classificarNo, fasesDoNo, montarHistory, type FaseFutura, type NoDoHistory } from './workflowSnapshot';

// A resposta de `phase-directives` em 20/10/2026 (estados.TERMINAIS e DESCARTADOS).
const STATUS = {
    terminais: ['cancelled', 'completed', 'done', 'rolled_back', 'superseded'],
    descartados: ['cancelled', 'rolled_back', 'superseded'],
};

const SDLC: WorkflowSnapshot = {
    phases: [
        { key: 'macro_planning', label: 'Macro' },
        { key: 'micro_planning', label: 'Micro' },
        { key: 'execution', label: 'Execução' },
        { key: 'assurance', label: 'Assurance' },
        { key: 'retro', label: 'Retro' },
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

const arvore = (nos: NoDaArvore[], workflows: Record<string, WorkflowSnapshot> = { h1: SDLC }): ArvoreLeve =>
    ({ root_id: nos[0].id, nos, workflows });

const nos = (itens: ReturnType<typeof montarHistory>) => itens.filter((i): i is NoDoHistory => i.tipo === 'no');
const futuras = (itens: ReturnType<typeof montarHistory>) => itens.filter((i): i is FaseFutura => i.tipo === 'futura');

describe('fasesDoNo', () => {
    it('lê o snapshot do nó, na ordem dele', () => {
        expect(fasesDoNo({ workflow_snapshot: SDLC }).map((f) => f.key)).toEqual(
            ['macro_planning', 'micro_planning', 'execution', 'assurance', 'retro']);
    });

    it('o snapshot vence o catálogo: o template mudou, o nó não', () => {
        // O catálogo de hoje ganhou `plan_review`; o nó nasceu sem ela.
        const catalogoAtual = [...SDLC.phases.slice(0, 2), { key: 'plan_review', label: 'Review' }, ...SDLC.phases.slice(2)];
        const doNo = fasesDoNo({ workflow_snapshot: SDLC }).map((f) => f.key);
        expect(doNo).not.toContain('plan_review');
        expect(catalogoAtual).toHaveLength(6);
    });

    it('sem snapshot não inventa fase', () => {
        expect(fasesDoNo({ workflow_snapshot: null })).toEqual([]);
        expect(fasesDoNo({})).toEqual([]);
    });

    it('rótulo ausente cai na chave', () => {
        expect(fasesDoNo({ workflow_snapshot: { phases: [{ key: 'ci_gate' }] } })).toEqual(
            [{ key: 'ci_gate', label: 'ci_gate' }]);
    });
});

describe('classificarNo com a lista da API', () => {
    it('terminal concluído, terminal descartado', () => {
        expect(classificarNo({ status: 'completed' }, STATUS)).toBe('concluido');
        expect(classificarNo({ status: 'done' }, STATUS)).toBe('concluido');
        expect(classificarNo({ status: 'rolled_back' }, STATUS)).toBe('descartado');
        expect(classificarNo({ status: 'superseded' }, STATUS)).toBe('descartado');
    });

    it('`failed` é retomável: atual, ao contrário de STATUS_ENCERRADOS', () => {
        expect(classificarNo({ status: 'failed' }, STATUS)).toBe('atual');
    });

    it('status desconhecido (`paused`, do E7) é atual', () => {
        expect(classificarNo({ status: 'paused' }, STATUS)).toBe('atual');
    });

    it('a lista é a recebida, não uma cópia guardada no app', () => {
        expect(classificarNo({ status: 'completed' }, { terminais: [] })).toBe('atual');
        expect(classificarNo({ status: 'arquivado' }, { terminais: ['arquivado'] })).toBe('concluido');
    });
});

describe('montarHistory a partir da árvore leve', () => {
    it('cadeia simples: ✓ concluídos, ● atual e ○ futuras do snapshot', () => {
        const macro = no('a', 'macro_planning', 'completed');
        const micro = no('b', 'micro_planning', 'in_progress', { parent_id: 'a' });

        const itens = montarHistory(arvore([macro, micro]), STATUS);

        // Cadeia sem ramificação fica no mesmo recuo, como no canvas.
        expect(nos(itens).map((n) => [n.id, n.classe, n.nivel])).toEqual([['a', 'concluido', 0], ['b', 'atual', 0]]);
        expect(futuras(itens).every((f) => f.nivel === 0)).toBe(true);
        expect(futuras(itens).map((f) => f.key)).toEqual(['execution', 'assurance', 'retro']);
        expect(futuras(itens).every((f) => f.aposId === 'b')).toBe(true);
        expect(nos(itens)[1].label).toBe('Micro');
    });

    it('fan-out: cada plano é um ramo, com as próprias futuras', () => {
        const micro = no('m', 'micro_planning', 'completed');
        const p1 = no('e1', 'execution', 'in_progress', { parent_id: 'm', plan_id: 'P1', plano_titulo: 'TP-1' });
        const p2 = no('e2', 'execution', 'completed', { parent_id: 'm', plan_id: 'P2', branch_type: 'parallel' });
        const a2 = no('a2', 'assurance', 'pending', { parent_id: 'e2', plan_id: 'P2', branch_type: 'parallel' });

        const itens = montarHistory(arvore([micro, p1, p2, a2]), STATUS);

        expect(itens.map((i) => (i.tipo === 'no' ? i.id : `○${i.key}@${i.aposId}`))).toEqual([
            'm',
            'e1', '○assurance@e1', '○retro@e1',
            'e2', 'a2', '○retro@a2',
        ]);
        const [m, e1, e2, assurance] = nos(itens);
        expect([m.nivel, e1.nivel, e2.nivel, assurance.nivel]).toEqual([0, 1, 1, 1]);
        expect([e1.abreRamo, e2.abreRamo, assurance.abreRamo]).toEqual([true, true, false]);
        expect(e1.planoTitulo).toBe('TP-1');
    });

    it('rollback: o nó desfeito é ↻ e a nova tentativa é a 2, sem futuras no desfeito', () => {
        const micro = no('m', 'micro_planning', 'completed');
        const exec1 = no('x1', 'execution', 'rolled_back', { parent_id: 'm', plan_id: 'P1' });
        const exec2 = no('x2', 'execution', 'in_progress', { parent_id: 'x1', plan_id: 'P1', branch_type: 'hotfix' });

        const itens = montarHistory(arvore([micro, exec1, exec2]), STATUS);
        const [, desfeito, nova] = nos(itens);

        expect(desfeito.classe).toBe('descartado');
        expect([desfeito.tentativa, nova.tentativa]).toEqual([1, 2]);
        // A nova tentativa fica na mesma coluna da desfeita.
        expect(nova.nivel).toBe(desfeito.nivel);
        expect(nova.branchType).toBe('hotfix');
        expect(futuras(itens).every((f) => f.aposId === 'x2')).toBe(true);
    });

    it('hotfix que volta a uma fase anterior conta a tentativa dessa fase', () => {
        const exec1 = no('x1', 'execution', 'completed', { plan_id: 'P1' });
        const assur = no('as', 'assurance', 'rolled_back', { parent_id: 'x1', plan_id: 'P1' });
        const exec2 = no('x2', 'execution', 'pending', { parent_id: 'as', plan_id: 'P1', branch_type: 'hotfix' });

        const [, , nova] = nos(montarHistory(arvore([exec1, assur, exec2]), STATUS));
        expect([nova.phase, nova.tentativa]).toEqual(['execution', 2]);
    });

    it('o mesmo phase em outro plano não é tentativa (execução sequencial)', () => {
        const e1 = no('e1', 'execution', 'completed', { plan_id: 'P1' });
        const a1 = no('a1', 'assurance', 'completed', { parent_id: 'e1', plan_id: 'P1' });
        const e2 = no('e2', 'execution', 'pending', { parent_id: 'a1', plan_id: 'P2' });
        expect(nos(montarHistory(arvore([e1, a1, e2]), STATUS))[2].tentativa).toBe(1);
    });

    it('as futuras seguem o workflow do hash do nó, não outro', () => {
        const curto: WorkflowSnapshot = { phases: [{ key: 'triage' }, { key: 'creation' }] };
        const raiz = no('t', 'triage', 'in_progress', { workflow_snapshot_hash: 'h2' });
        expect(futuras(montarHistory(arvore([raiz], { h1: SDLC, h2: curto }), STATUS)).map((f) => f.key))
            .toEqual(['creation']);
    });

    it('raiz com mais de 20 nós: cadeia e tentativas num recuo só, sem ramo', () => {
        // Macro, micro e dez ciclos execução → assurance desfeita, como numa raiz
        // real de 20+ nós. Pelo nível antigo (profundidade), o último recuaria 20 vezes.
        const cadeia = [no('n0', 'macro_planning', 'completed'), no('n1', 'micro_planning', 'completed', { parent_id: 'n0' })];
        for (let i = 2; i <= 21; i++) {
            const execucao = i % 2 === 0;
            const status = i === 21 ? 'in_progress' : execucao ? 'completed' : 'rolled_back';
            cadeia.push(no(`n${i}`, execucao ? 'execution' : 'assurance', status, {
                parent_id: `n${i - 1}`, plan_id: 'P1',
                created_at: `2026-10-21T09:${String(i).padStart(2, '0')}:00Z`,
            }));
        }

        const itens = montarHistory(arvore(cadeia), STATUS);
        const doHistory = nos(itens);

        expect(doHistory.map((n) => n.id)).toEqual(cadeia.map((n) => n.id));
        expect(doHistory.every((n) => n.nivel === 0 && !n.abreRamo)).toBe(true);
        expect(doHistory[doHistory.length - 1]).toMatchObject({ phase: 'assurance', tentativa: 10, classe: 'atual' });
        expect(futuras(itens).map((f) => [f.key, f.nivel])).toEqual([['retro', 0]]);
    });

    it('última fase concluída não projeta nada; pai fora da árvore vira raiz', () => {
        const retro = no('r', 'retro', 'done', { parent_id: 'fora-da-arvore' });
        const itens = montarHistory(arvore([retro]), STATUS);
        expect(futuras(itens)).toEqual([]);
        expect(nos(itens)[0].nivel).toBe(0);
    });
});

describe('trava: o Cockpit novo não lê o catálogo de workflows', () => {
    const COCKPIT = join(__dirname, '..', 'app', 'components', 'cockpit');

    const arquivos = (dir: string): string[] =>
        !existsSync(dir) ? [] : readdirSync(dir).flatMap((nome) => {
            const caminho = join(dir, nome);
            return statSync(caminho).isDirectory() ? arquivos(caminho) : [caminho];
        });

    it('nenhum arquivo em cockpit/ chama getWorkflowTemplates nem templates.find(', () => {
        const achados = arquivos(COCKPIT)
            .filter((f) => /\.(ts|tsx)$/.test(f) && !/\.test\.(ts|tsx)$/.test(f))
            .filter((f) => /getWorkflowTemplates|templates\.find\(/.test(readFileSync(f, 'utf-8')));
        expect(achados).toEqual([]);
    });

    it('workflowSnapshot.ts também não', () => {
        const fonte = readFileSync(join(__dirname, 'workflowSnapshot.ts'), 'utf-8');
        expect(fonte).not.toMatch(/getWorkflowTemplates|templates\.find\(/);
    });
});
