/**
 * Raízes como a barra de abas e o seletor `+` as desenham (TP-3 da Sprint 24.0).
 *
 * As duas leem da mesma rota, a página de branches de AI Executions
 * (`getExecutionBranchesPage`), que já filtra pelos projetos que o usuário
 * enxerga (ADR-0033) e já traz projeto, sprint, workflow e cards rotulados.
 * Não há rota nova: a barra pergunta pela raiz com o UUID inteiro como termo.
 */
import { getExecutionBranchesPage } from './agentExecutions';
import { estaEncerrada } from './executionStatus';
import type { ExecutionListItem } from './types';

export interface ResumoDaRaiz {
    rootId: string;
    projectId: string;
    projectName: string | null;
    sprintName: string | null;
    /** Sprints da raiz: o escopo de cards quando o nó não tem `card_ids` (P8) e o gate `sprint_linked`. */
    sprintIds: string[];
    workflowName: string | null;
    /** Códigos dos cards da raiz: o alvo. */
    alvo: string[];
    /** O nó mais recente da branch: a fase e o status que valem agora. */
    atualId: string;
    fase: string;
    status: string;
    encerrada: boolean;
}

/** Tom do ponto de status na aba; a cor sai do token, não daqui. */
export type TomDaRaiz = 'ativa' | 'atencao' | 'falha' | 'encerrada';

export function tomDaRaiz(r: Pick<ResumoDaRaiz, 'status' | 'encerrada'>): TomDaRaiz {
    if (r.status === 'failed') return 'falha';
    if (r.encerrada) return 'encerrada';
    if (r.status === 'in_progress') return 'ativa';
    return 'atencao'; // pending, awaiting_advance: alguém precisa agir
}

const raizDe = (e: Pick<ExecutionListItem, 'id' | 'root_id'>) => e.root_id || e.id;

/**
 * Agrupa as linhas da página por raiz, na ordem em que a primeira linha de cada
 * uma aparece. A API ordena por `created_at` desc, então a primeira linha de
 * cada grupo é o nó atual.
 */
export function resumirBranches(items: ExecutionListItem[]): ResumoDaRaiz[] {
    const grupos = new Map<string, ExecutionListItem[]>();
    for (const item of items) {
        const raiz = raizDe(item);
        const grupo = grupos.get(raiz);
        if (grupo) grupo.push(item);
        else grupos.set(raiz, [item]);
    }
    return [...grupos.entries()].map(([rootId, linhas]) => {
        const atual = linhas[0];
        const raiz = linhas.find((l) => l.id === rootId) ?? atual;
        return {
            rootId,
            projectId: raiz.project_id,
            projectName: raiz.project_name ?? null,
            sprintName: raiz.sprint_name ?? null,
            sprintIds: raiz.sprint_ids ?? [],
            workflowName: raiz.workflow_name ?? null,
            alvo: raiz.card_codes ?? [],
            atualId: atual.id,
            fase: atual.phase,
            status: atual.status,
            encerrada: estaEncerrada(atual),
        };
    });
}

/**
 * A raiz que contém `id`, ou `null` quando ela não existe PARA ESTE USUÁRIO.
 * Inexistente e sem acesso respondem igual de propósito (ADR-0033): a tela não
 * pode distinguir "não existe" de "existe e não é sua".
 *
 * `id` pode ser de um filho: aí devolve a raiz dele, e quem chamou decide se
 * redireciona.
 */
export async function buscarRaiz(id: string): Promise<ResumoDaRaiz | null> {
    const pagina = await getExecutionBranchesPage({ page: 1, pageSize: 1, search: id });
    const dono = pagina.items.find((e) => e.id === id);
    if (!dono) return null;
    return resumirBranches(pagina.items).find((r) => r.rootId === raizDe(dono)) ?? null;
}

export function idCurto(id: string): string {
    return id.slice(0, 8);
}

/** "projeto · sprint"; sem sprint, o ID curto da raiz no lugar. */
export function rotuloDaRaiz(r: Pick<ResumoDaRaiz, 'rootId' | 'projectName' | 'sprintName'>): string {
    return `${r.projectName ?? 'Projeto'} · ${r.sprintName ?? idCurto(r.rootId)}`;
}
