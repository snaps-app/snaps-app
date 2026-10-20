/**
 * Fases, classe e árvore dos nós do History — Sprint 24.0, E21 (TP-1).
 *
 * Três regras que o Cockpit atual espalhava:
 *
 * - as fases de um nó saíam do CATÁLOGO de templates (sete leituras no
 *   Cockpit atual). O catálogo muda; o nó não. Aqui elas saem do
 *   `workflow_snapshot` do próprio nó, gravado quando ele nasceu;
 * - "terminal" era uma lista escrita no app (`STATUS_ENCERRADOS`, que inclui
 *   `failed`). Aqui a lista vem da API (`phase-directives.terminal_statuses`)
 *   e o app não guarda cópia: `failed` e status desconhecido (como `paused`,
 *   do E7) são "atual";
 * - a árvore era montada por fase, não por pai. Aqui ela segue `parent_id`.
 *
 * Funções puras: não buscam nada. Quem chama passa a árvore leve
 * (`GET /arvore`) e as listas de `phase-directives`.
 */
import type { ArvoreLeve, NoDaArvore, WorkflowSnapshot } from './types';

export interface FaseDoNo {
    key: string;
    label: string;
}

export type ClasseDoNo = 'concluido' | 'atual' | 'descartado';

/** As listas de status que a API serve em `phase-directives`. */
export interface StatusDaApi {
    terminais: readonly string[];
    /** Terminais que não são trabalho concluído (desfeito, substituído, descartado). */
    descartados?: readonly string[];
}

/** Fases do nó, na ordem do `workflow_snapshot`. Nunca do catálogo. */
export function fasesDoNo(execucao: { workflow_snapshot?: WorkflowSnapshot | null }): FaseDoNo[] {
    const fases = execucao.workflow_snapshot?.phases ?? [];
    return fases
        .filter((fase): fase is typeof fase & { key: string } => typeof fase?.key === 'string' && fase.key !== '')
        .map((fase) => ({ key: fase.key, label: fase.label || fase.key }));
}

/**
 * Concluído, descartado ou atual. Só um status que a API declara terminal
 * encerra o nó; o resto — `failed`, que é retomável, e qualquer status que o
 * app ainda não conheça — é atual.
 */
export function classificarNo(execucao: { status: string }, status: StatusDaApi): ClasseDoNo {
    if (!status.terminais.includes(execucao.status)) return 'atual';
    return status.descartados?.includes(execucao.status) ? 'descartado' : 'concluido';
}

export interface NoDoHistory {
    tipo: 'no';
    id: string;
    parentId: string | null;
    phase: string;
    label: string;
    status: string;
    classe: ClasseDoNo;
    branchType: string | null;
    planId: string | null;
    planoTitulo: string | null;
    /** 1 na primeira vez que a fase roda no ramo; 2 em diante após rollback ou retry. */
    tentativa: number;
    /** Recuo: quantos ancestrais o nó tem na árvore. */
    nivel: number;
}

/** Fase que ainda não existe: projeção do workflow do nó, desabilitada. */
export interface FaseFutura {
    tipo: 'futura';
    /** Nó a partir do qual a fase foi projetada. */
    aposId: string;
    key: string;
    label: string;
    nivel: number;
}

export type ItemDoHistory = NoDoHistory | FaseFutura;

const porCriacao = (a: NoDaArvore, b: NoDaArvore) =>
    a.created_at < b.created_at ? -1 : a.created_at > b.created_at ? 1 : a.id.localeCompare(b.id);

/**
 * A árvore da raiz, na ordem em que o History a desenha.
 *
 * - Cada nó vem logo abaixo do nó que o criou (`parent_id`), um nível mais
 *   recuado; os planos do fan-out são ramos irmãos.
 * - `tentativa` conta quantas vezes a mesma fase do mesmo plano já rodou entre
 *   os ancestrais do nó: a nova tentativa de um rollback é a "tentativa 2".
 * - Depois de cada ponta não descartada vêm as fases seguintes do workflow
 *   daquele nó, como projeção (`futura`).
 */
export function montarHistory(arvore: ArvoreLeve, status: StatusDaApi): ItemDoHistory[] {
    const porId = new Map(arvore.nos.map((no) => [no.id, no]));
    const filhos = new Map<string | null, NoDaArvore[]>();
    for (const no of arvore.nos) {
        // Pai fora da árvore (ou ausente) vira raiz, para nenhum nó sumir.
        const pai = no.parent_id && porId.has(no.parent_id) ? no.parent_id : null;
        filhos.set(pai, [...(filhos.get(pai) ?? []), no]);
    }
    for (const lista of filhos.values()) lista.sort(porCriacao);

    const fasesDoHash = (hash: string | null) =>
        fasesDoNo({ workflow_snapshot: hash ? arvore.workflows[hash] : null });

    const itens: ItemDoHistory[] = [];
    const visitar = (no: NoDaArvore, nivel: number, ancestrais: NoDaArvore[]) => {
        const fases = fasesDoHash(no.workflow_snapshot_hash);
        const classe = classificarNo(no, status);
        const tentativa = 1 + ancestrais.filter(
            (a) => a.phase === no.phase && (a.plan_id ?? null) === (no.plan_id ?? null),
        ).length;
        itens.push({
            tipo: 'no',
            id: no.id,
            parentId: no.parent_id,
            phase: no.phase,
            label: fases.find((f) => f.key === no.phase)?.label ?? no.phase,
            status: no.status,
            classe,
            branchType: no.branch_type,
            planId: no.plan_id,
            planoTitulo: no.plano_titulo,
            tentativa,
            nivel,
        });

        const proximos = filhos.get(no.id) ?? [];
        for (const filho of proximos) visitar(filho, nivel + 1, [...ancestrais, no]);

        if (proximos.length === 0 && classe !== 'descartado') {
            const indice = fases.findIndex((f) => f.key === no.phase);
            if (indice >= 0) {
                fases.slice(indice + 1).forEach((fase, i) => {
                    itens.push({ tipo: 'futura', aposId: no.id, key: fase.key, label: fase.label, nivel: nivel + 1 + i });
                });
            }
        }
    };
    for (const raiz of filhos.get(null) ?? []) visitar(raiz, 0, []);
    return itens;
}
