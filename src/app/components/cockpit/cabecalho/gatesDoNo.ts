/**
 * Gates do nó no cabeçalho: o que era `execution-requirements-checklist.tsx`
 * no Cockpit antigo, agora lido do `workflow_snapshot` do NÓ, nunca do
 * catálogo (F3: o antigo fazia `|| templates[0]`).
 *
 * Três estados, e o terceiro é honesto de propósito:
 *   - `ok` e `falta` só quando a tela tem o dado que decide: os cards do
 *     escopo, a sprint da raiz e as pendências do `/resumo`, que a API calcula
 *     com as MESMAS funções do motor de avanço (e já descontando override);
 *   - `motor` quando quem sabe é só o motor (CI, merge, peer review…). A
 *     condição aparece, pode ir para o override, e não trava o Avançar: quem
 *     recusa, se for o caso, é o motor, e a recusa vira texto e item clicável.
 *
 * Sem `advance_conditions` no snapshot, não há gate: ausência não vira
 * condição inventada (a mesma regra de `services/pendencias.py`).
 */
import type { PendenciaDoNo } from '@/services/resumoDoNo';
import type { Card, WorkflowSnapshot } from '@/services/types';
import { ROTULOS_ESTRUTURAIS } from '@/app/components/execution/dispatch-scope';

export type EstadoDoGate = 'ok' | 'falta' | 'motor';

export interface GateDoNo {
    chave: string;
    rotulo: string;
    estado: EstadoDoGate;
}

export const ROTULOS_DE_GATE: Readonly<Record<string, string>> = {
    sprint_linked: 'Sprint ligada',
    plan_approved: 'Plano estratégico aprovado',
    tactical_plans_approved: 'Planos táticos aprovados',
    plan_selected: 'Ao menos um plano selecionado',
    bdd_scenarios_generated: 'Cenários BDD gerados',
    tasks_created: 'Tasks criadas',
    tasks_finished: 'Tasks concluídas (cards em assurance)',
    cards_done: 'Cards validados e concluídos',
    bdd_validated: 'BDD validado',
    ci_passed: 'CI verde',
    diff_reviewed: 'Diff revisado',
    entities_created_and_linked: 'Entidades criadas e ligadas',
    pr_opened: 'PR aberta',
    pr_merged: 'PR mergeada',
    peer_review_generated: 'Peer review gerado',
    sprint_closed: 'Sprint fechada',
    sprint_branch_merged: 'Sprint branch mergeada',
    questions_answered: 'Perguntas respondidas',
    proposal_approved: 'Proposta aprovada',
};

export function rotuloDoGate(chave: string): string {
    return ROTULOS_DE_GATE[chave] ?? ROTULOS_ESTRUTURAIS[chave] ?? chave;
}

/** As condições ligadas da fase, lidas do snapshot do nó, na ordem em que estão. */
export function condicoesDaFase(workflow: WorkflowSnapshot | null | undefined, fase: string): string[] {
    const config = workflow?.phases?.find((f) => f?.key === fase);
    return Object.entries(config?.advance_conditions ?? {}).filter(([, ligada]) => !!ligada).map(([chave]) => chave);
}

/** O alvo do `on_failure` da fase, do snapshot do nó. */
export function alvoDoRollback(workflow: WorkflowSnapshot | null | undefined, fase: string): string | null {
    return workflow?.phases?.find((f) => f?.key === fase)?.on_failure ?? null;
}

export interface DadosDosGates {
    condicoes: string[];
    /** Sprints da raiz (`sprint_linked`). */
    sprintIds: string[];
    /** Cards do escopo do nó; `null` enquanto não carregaram. */
    cards: Card[] | null;
    /**
     * Pendências do `/resumo`; `null` quando a tela não pode confiar nelas:
     * resumo ainda não chegou, ou o usuário é viewer (a API devolve `[]`).
     */
    pendencias: PendenciaDoNo[] | null;
}

const PENDENCIAS_DE_PLANO = new Set(['plano_aguardando_aprovacao', 'aprovacao_invalidada']);
const STATUS_DE_ASSURANCE = new Set(['assurance', 'done']);

function pelosCards(cards: Card[] | null, regra: (c: Card) => boolean): EstadoDoGate {
    if (!cards) return 'motor';
    return cards.length > 0 && cards.every(regra) ? 'ok' : 'falta';
}

function estadoDe(chave: string, d: DadosDosGates): EstadoDoGate {
    const { pendencias, cards } = d;
    const temPendencia = (tipo: (p: PendenciaDoNo) => boolean) => (pendencias ?? []).some(tipo);
    switch (chave) {
        case 'sprint_linked':
            return d.sprintIds.length > 0 ? 'ok' : 'falta';
        case 'plan_approved':
        case 'tactical_plans_approved':
            if (!pendencias) return 'motor';
            return temPendencia((p) => PENDENCIAS_DE_PLANO.has(p.tipo)) ? 'falta' : 'ok';
        case 'bdd_validated':
            if (pendencias) return temPendencia((p) => p.tipo === 'bdd_aguardando_validacao') ? 'falta' : 'ok';
            return pelosCards(cards, (c) => !!c.bdd_validated);
        case 'bdd_scenarios_generated':
            return pelosCards(cards, (c) => (c.bdd_scenarios?.length ?? 0) > 0);
        case 'tasks_finished':
            return pelosCards(cards, (c) => STATUS_DE_ASSURANCE.has(c.status));
        case 'cards_done':
            return pelosCards(cards, (c) => c.status === 'done');
        default:
            // Julgamento humano: a API acende `gate_humano` ("Confirmar X")
            // enquanto não houver override para ela.
            if (temPendencia((p) => p.tipo === 'gate_humano' && p.acao === `Confirmar ${chave}`)) return 'falta';
            return 'motor';
    }
}

export function avaliarGates(dados: DadosDosGates): GateDoNo[] {
    return dados.condicoes.map((chave) => ({ chave, rotulo: rotuloDoGate(chave), estado: estadoDe(chave, dados) }));
}

/** Os gates que a tela SABE que faltam. É o que trava o Avançar. */
export function gatesQueFaltam(gates: readonly GateDoNo[]): GateDoNo[] {
    return gates.filter((g) => g.estado === 'falta');
}
