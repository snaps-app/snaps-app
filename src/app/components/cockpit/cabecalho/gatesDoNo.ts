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
import type { PendenciaDoNo, CondicaoDoNo } from '@/services/resumoDoNo';
import type { Card, WorkflowSnapshot } from '@/services/types';
import { ROTULOS_ESTRUTURAIS } from '@/app/components/execution/dispatch-scope';

export type EstadoDoGate = 'ok' | 'falta' | 'motor';

export interface GateDoNo {
    chave: string;
    rotulo: string;
    estado: EstadoDoGate;
    override?: boolean;
    motivo?: string | null;
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
    condicoesDoMotor?: CondicaoDoNo[] | null;
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

export function avaliarGates(dados: DadosDosGates): GateDoNo[] {
    return dados.condicoes.map(chave => {
        const condicao = dados.condicoesDoMotor?.find(c => c.chave === chave);
        return {chave,rotulo:rotuloDoGate(chave),estado:condicao?.estado ?? 'motor',
            ...(condicao ? {override:condicao.override,motivo:condicao.motivo} : {})};
    });
}

/** Os gates que a tela SABE que faltam. É o que trava o Avançar. */
export function gatesQueFaltam(gates: readonly GateDoNo[]): GateDoNo[] {
    return gates.filter((g) => g.estado === 'falta');
}
