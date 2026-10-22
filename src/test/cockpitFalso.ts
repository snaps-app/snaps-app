/**
 * Um Cockpit de mentira para os testes de integração e de desempenho do TP-4.
 *
 * - `apiFalsa`: o `api` do axios (`services/client`), respondendo por rota. Toda
 *   `queryFn` do Cockpit passa por ele, então contar as chamadas aqui é contar
 *   as chamadas que a tela faz (ADR-0071: "o vitest conta as chamadas").
 * - `streamFalso`: o `conectarStreamDeExecucao`, que entrega o replay do nó e
 *   deixa o teste emitir evento ao vivo. Nó terminal fecha depois do replay,
 *   como o servidor (`routers/execution_stream.py`).
 *
 * Os testes ligam os dois com `vi.mock`, importando este módulo na fábrica.
 */
import { vi } from 'vitest';
import type { ResumoDoNo } from '@/services/resumoDoNo';
import type { EventoDeExecucao, OpcoesConexao } from '@/services/executionStream';
import type { AgentTaskExecution, ArvoreLeve, Card, NoDaArvore, NodeSnapshot, WorkflowSnapshot } from '@/services/types';

export const PROJETO = 'p-snaps';
export const SPRINT = 'sprint-24';
export const RAIZ = 'a0000001-0000-4000-8000-000000000001';
export const MICRO = 'a0000002-0000-4000-8000-000000000002';
export const REVISAO = 'a0000003-0000-4000-8000-000000000003';
export const EXEC_TP1 = 'a0000004-0000-4000-8000-000000000004';
export const EXEC_TP2 = 'a0000005-0000-4000-8000-000000000005';
export const OUTRA_RAIZ = 'b0000001-0000-4000-8000-000000000001';
export const CARD_1 = 'cccccccc-0000-4000-8000-000000000001';
export const CARD_2 = 'cccccccc-0000-4000-8000-000000000002';

const TERMINAIS = ['completed', 'done', 'cancelled', 'rolled_back', 'superseded'];
const DESCARTADOS = ['cancelled', 'rolled_back', 'superseded'];

export const WORKFLOW: WorkflowSnapshot = {
    phases: [
        { key: 'macro_planning', label: 'Macro', advance_conditions: { plan_approved: true } },
        { key: 'micro_planning', label: 'Micro', advance_conditions: { tactical_plans_approved: true, bdd_scenarios_generated: true } },
        { key: 'plan_review', label: 'Plan review', advance_conditions: { peer_review_generated: true } },
        { key: 'execution', label: 'Execution', advance_conditions: { tasks_finished: true, ci_passed: true }, on_failure: 'micro_planning' },
        { key: 'ci_gate', label: 'CI gate', advance_conditions: { ci_passed: true } },
        { key: 'assurance', label: 'Assurance', advance_conditions: { cards_done: true } },
        { key: 'retro', label: 'Retro', advance_conditions: {} },
    ],
    prompts_das_fases_omitidos: true,
};

function no(id: string, parent: string | null, phase: string, status: string, extra: Partial<NoDaArvore> = {}): NoDaArvore {
    return {
        id, parent_id: parent, phase, status, branch_type: null, plan_id: null, plano_titulo: null,
        agent_name: `@${phase}`, card_ids: [CARD_1, CARD_2], created_at: `2026-10-20T10:0${id.slice(-1)}:00Z`,
        updated_at: `2026-10-20T11:0${id.slice(-1)}:00Z`, lock_version: 3, workflow_snapshot_hash: 'h1', ...extra,
    };
}

export function arvorePadrao(rootId = RAIZ): ArvoreLeve {
    if (rootId === OUTRA_RAIZ) {
        return { root_id: OUTRA_RAIZ, nos: [no(OUTRA_RAIZ, null, 'macro_planning', 'in_progress', { card_ids: [] })], workflows: { h1: WORKFLOW } };
    }
    return {
        root_id: RAIZ,
        nos: [
            no(RAIZ, null, 'macro_planning', 'completed'),
            no(MICRO, RAIZ, 'micro_planning', 'completed'),
            no(REVISAO, MICRO, 'plan_review', 'completed'),
            no(EXEC_TP1, REVISAO, 'execution', 'in_progress', { plan_id: 'pl-1', plano_titulo: 'TP-1 · E21 · History', card_ids: [CARD_1] }),
            no(EXEC_TP2, REVISAO, 'execution', 'completed', { plan_id: 'pl-2', plano_titulo: 'TP-2 · E21 · Superfície', card_ids: [CARD_2] }),
        ],
        workflows: { h1: WORKFLOW },
    };
}

export function card(id: string, status: string, extra: Partial<Card> = {}): Card {
    return {
        id, board_id: 'b', title: `Card ${id.slice(-1)}`, code: `SNA-${id.slice(-1)}`, description: '', status,
        priority: 'Medium', bdd_scenarios: [{ title: 'x' }], bdd_validated: false, created_at: '', updated_at: '', ...extra,
    };
}

export function resumoPadrao(extra: Partial<ResumoDoNo> = {}): ResumoDoNo {
    const abas = Object.fromEntries(
        ['plano', 'cards', 'tasks', 'cenarios', 'testplans', 'revisoes', 'prs', 'walkthroughs', 'contexto', 'ambiente',
            'atividade', 'prompt', 'retro', 'no', 'scratch'].map((a) => [a, { total: 1, motivo_vazio: null }]),
    );
    return {
        pendencias: [],
        abas,
        atividade: {
            chamadas: 81, falhas: 0, recusas: 0, tempo_total_ms: 876_000,
            ultima_atividade_em: new Date(Date.now() - 3 * 60_000).toISOString(), diagnostico_expirado: false,
        },
        sessoes: { encerradas_segundos: 3_600, ativas_desde: [] },
        ...extra,
    };
}

function snapshotDe(n: NoDaArvore): NodeSnapshot {
    return {
        execution_id: n.id, root_id: RAIZ, parent_id: n.parent_id, phase: n.phase, status: n.status,
        classe: TERMINAIS.includes(n.status) ? 'concluido' : 'atual', imutavel: TERMINAIS.includes(n.status),
        agent_name: n.agent_name, created_at: n.created_at, updated_at: n.updated_at,
        prompt: { entry: 'entrada', exit: null }, prompt_regravado_apos_conclusao: false,
        workflow: { template_id: 't', template_version: 3, snapshot_hash: 'h1', fase: { key: n.phase, label: n.phase, advance_conditions: {} } },
        gates: { advance_conditions: {}, avaliacoes: [], overrides: [] },
        artefatos: [], planos: [], prs: [], skills_ativadas: null,
    };
}

export interface EstadoDaApiFalsa {
    arvores: Record<string, ArvoreLeve>;
    resumos: Record<string, ResumoDoNo>;
    cards: Record<string, Card>;
    /** O que o `PATCH /advance` devolve (o nó criado). */
    aoAvancar?: (id: string) => Partial<AgentTaskExecution>;
    /** A recusa do `PATCH /advance`, como a API manda em `response.data.detail`. */
    recusaDoAvanco?: { status: number; detail: string };
    /** O `pode_override` do `/resumo` (ADR-0072): a API decide; o resumo explícito vence. */
    podeOverride: boolean;
    /** `GET /agent-executions/{id}/sessions`: as sessões de tempo da árvore. */
    sessoes: Record<string, unknown>[];
}

export const estadoDaApi: EstadoDaApiFalsa = { arvores: {}, resumos: {}, cards: {}, podeOverride: true, sessoes: [] };

/** ETag da árvore como a API calcula: muda com qualquer campo. */
export const etagDe = (arvore: unknown) => `"${JSON.stringify(arvore).length}-${hash(JSON.stringify(arvore))}"`;
function hash(texto: string): number {
    let h = 0;
    for (let i = 0; i < texto.length; i += 1) h = (h * 31 + texto.charCodeAt(i)) | 0;
    return h >>> 0;
}

function noPorId(id: string): NoDaArvore | undefined {
    for (const arvore of Object.values(estadoDaApi.arvores)) {
        const achado = arvore.nos.find((n) => n.id === id);
        if (achado) return achado;
    }
    return undefined;
}

function linhaDaLista(n: NoDaArvore, rootId: string) {
    return {
        id: n.id, root_id: rootId, project_id: PROJETO, status: n.status, phase: n.phase, sprint_ids: [SPRINT],
        agent_name: n.agent_name, created_at: n.created_at, updated_at: n.updated_at, lock_version: n.lock_version,
        project_name: 'Snaps', sprint_name: rootId === RAIZ ? 'Sprint 24.0' : 'Sprint 23.0', workflow_name: 'SDLC v4.0',
        card_codes: ['SNA-1', 'SNA-2'],
    };
}

function responderGet(url: string, config?: { params?: Record<string, unknown> }): unknown {
    let m: RegExpMatchArray | null;
    if ((m = url.match(/^\/api\/agent-executions\/([^/]+)\/arvore$/))) return estadoDaApi.arvores[m[1]];
    if (url === '/workflow-templates/phase-directives') {
        return { directives: [], retired: [], terminal_statuses: TERMINAIS, discarded_statuses: DESCARTADOS };
    }
    if ((m = url.match(/^\/api\/agent-executions\/([^/]+)\/resumo$/))) {
        return { pode_override: estadoDaApi.podeOverride, ...(estadoDaApi.resumos[m[1]] ?? resumoPadrao()) };
    }
    if ((m = url.match(/^\/api\/agent-executions\/([^/]+)\/node-snapshot$/))) {
        const n = noPorId(m[1]);
        return n ? snapshotDe(n) : undefined;
    }
    if (url === '/api/agent-executions/branches') {
        const termo = String(config?.params?.search ?? '');
        for (const [rootId, arvore] of Object.entries(estadoDaApi.arvores)) {
            const dono = arvore.nos.find((n) => n.id === termo);
            if (dono) {
                const items = [dono, ...arvore.nos.filter((n) => n.id !== dono.id)].map((n) => linhaDaLista(n, rootId));
                return { items, page: 1, page_size: 1, total_branches: 1, totals: { total: 0, done: 0, active: 0, failed: 0, discarded: 0 } };
            }
        }
        return { items: [], page: 1, page_size: 1, total_branches: 0, totals: { total: 0, done: 0, active: 0, failed: 0, discarded: 0 } };
    }
    if ((m = url.match(/^\/api\/agent-executions\/([^/]+)$/))) {
        const n = noPorId(m[1]);
        return n && { ...n, project_id: PROJETO, root_id: RAIZ, sprint_ids: [SPRINT], advance_conditions: {}, context_data: { plans: [], prs: [] } };
    }
    if ((m = url.match(/^\/cards\/(.+)$/))) return estadoDaApi.cards[m[1]];
    if (/^\/agent-executions\/[^/]+\/sessions$/.test(url)) return estadoDaApi.sessoes;
    return [];
}

type ConfigFalsa = { params?: Record<string, unknown>; headers?: Record<string, string> };

/** Cada resposta do `/arvore`, na ordem: a raiz, o status e se veio com `If-None-Match`. */
export const respostasDaArvore: { rootId: string; status: 200 | 304; condicional: boolean }[] = [];

/** O `/arvore` responde com ETag, e 304 sem corpo quando `If-None-Match` casa (ADR-0071, 5b). */
function responderArvore(rootId: string, config?: ConfigFalsa) {
    const arvore = estadoDaApi.arvores[rootId];
    const etag = etagDe(arvore);
    const condicional = Boolean(config?.headers?.['If-None-Match']);
    if (config?.headers?.['If-None-Match'] === etag) {
        respostasDaArvore.push({ rootId, status: 304, condicional });
        return { data: '', status: 304, headers: { etag } };
    }
    respostasDaArvore.push({ rootId, status: 200, condicional });
    return { data: arvore, status: 200, headers: { etag } };
}

export const apiFalsa = {
    get: vi.fn(async (url: string, config?: ConfigFalsa) => {
        const arvore = url.match(/^\/api\/agent-executions\/([^/]+)\/arvore$/);
        if (arvore) return responderArvore(arvore[1], config);
        return { data: responderGet(url, config) };
    }),
    post: vi.fn(async (url: string, corpo?: { conditions?: string[] }) => ({
        data: url.endsWith('/sessions/start') ? { session_id: 's-1', started_at: new Date().toISOString() }
            : url.endsWith('/override-decisions') ? { decision_id: 'd-1', execution_revision: 3, conditions: corpo?.conditions ?? [] }
                : {},
    })),
    patch: vi.fn(async (url: string, corpo?: { force?: boolean }) => {
        const m = url.match(/^\/api\/agent-executions\/([^/]+)\/advance$/);
        if (m && estadoDaApi.recusaDoAvanco && !corpo?.force) {
            const { status, detail } = estadoDaApi.recusaDoAvanco;
            throw Object.assign(new Error(`Request failed with status code ${status}`), { response: { status, data: { detail } } });
        }
        if (m) return { data: { ...noPorId(m[1]), root_id: RAIZ, ...estadoDaApi.aoAvancar?.(m[1]) } };
        return { data: {} };
    }),
    put: vi.fn(async () => ({ data: {} })),
    delete: vi.fn(async () => ({ data: {} })),
};

/** As URLs pedidas com GET até agora, na ordem. */
export const getsFeitos = (): string[] => apiFalsa.get.mock.calls.map(([url]) => String(url));

/** Quantos GETs casaram com o padrão. */
export const contarGets = (padrao: RegExp): number => getsFeitos().filter((u) => padrao.test(u)).length;

// ── stream ─────────────────────────────────────────────────────────────────

export interface ConexaoFalsa {
    executionId: string;
    lastEventId: number | null | undefined;
    aberta: boolean;
    emitir: (evento: EventoDeExecucao) => void;
    fechar: () => void;
}

export const streamFalso = {
    conexoes: [] as ConexaoFalsa[],
    /** Eventos já gravados de cada nó, entregues no replay. */
    replay: {} as Record<string, EventoDeExecucao[]>,
    conectar: vi.fn((executionId: string, opcoes: OpcoesConexao) => new Promise<void>((resolve) => {
        const conexao: ConexaoFalsa = {
            executionId, lastEventId: opcoes.lastEventId, aberta: true,
            emitir: (evento) => { if (conexao.aberta) opcoes.onEvento(evento); },
            fechar: () => { conexao.aberta = false; resolve(); },
        };
        streamFalso.conexoes.push(conexao);
        opcoes.signal?.addEventListener('abort', () => conexao.fechar(), { once: true });
        queueMicrotask(() => {
            opcoes.onRetry?.(2000);
            for (const evento of streamFalso.replay[executionId] ?? []) conexao.emitir(evento);
            const n = noPorId(executionId);
            if (n && TERMINAIS.includes(n.status)) conexao.fechar(); // o servidor fecha depois do replay
        });
    })),
    abertas(): ConexaoFalsa[] {
        return streamFalso.conexoes.filter((c) => c.aberta);
    },
};

let seq = 100;
export function evento(nome: string, executionId: string, payload: Record<string, unknown> = {}, quando = new Date().toISOString()): EventoDeExecucao {
    seq += 1;
    return { id: seq, nome, dados: { name: nome, seq, created_at: quando, execution_id: executionId, payload, actor_kind: 'agent' } };
}

/** Volta ao cenário padrão: duas raízes, cards do escopo, nenhuma chamada contada. */
export function reiniciarCockpitFalso() {
    estadoDaApi.arvores = { [RAIZ]: arvorePadrao(RAIZ), [OUTRA_RAIZ]: arvorePadrao(OUTRA_RAIZ) };
    estadoDaApi.resumos = {};
    estadoDaApi.cards = { [CARD_1]: card(CARD_1, 'in_progress'), [CARD_2]: card(CARD_2, 'assurance') };
    estadoDaApi.aoAvancar = undefined;
    estadoDaApi.recusaDoAvanco = undefined;
    estadoDaApi.podeOverride = true;
    estadoDaApi.sessoes = [];
    respostasDaArvore.length = 0;
    for (const fn of Object.values(apiFalsa)) fn.mockClear();
    streamFalso.conexoes = [];
    streamFalso.replay = {};
    streamFalso.conectar.mockClear();
}
