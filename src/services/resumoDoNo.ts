/**
 * `GET /api/agent-executions/{id}/resumo` (E21, TP-2): pendências, total e
 * motivo de vazio das 15 abas e resumo de atividade, numa chamada.
 *
 * É o que ordena, acende e esmaece as abas da Superfície (ADR-0071, item 7):
 * as abas fechadas nunca são consultadas para saber se estão vazias.
 * A pendência vem do banco; viewer recebe `pendencias: []` (P6, ADR-0020).
 */
import { useEffect, useState } from 'react';
import type { QueryClient, QueryKey } from '@tanstack/react-query';
import { api } from './client';
import { chavesDeConsulta } from './chavesDeConsulta';

export type TipoDePendencia =
    | 'plano_aguardando_aprovacao'
    | 'aprovacao_invalidada'
    | 'bdd_aguardando_validacao'
    | 'test_plan_ativo'
    | 'prompt_aguardando_despacho'
    | 'gate_humano'
    | 'tool_falhando'
    | 'pedido_do_neuron'
    | 'pergunta_escalada';

export interface PendenciaDoNo {
    tipo: TipoDePendencia | string;
    aba: string;
    recurso_id: string | null;
    desde: string | null;
    acao: string;
}

export interface AbaDoResumo {
    versao?: string | null;
    total: number | null;
    motivo_vazio: string | null;
}

export interface ResumoDeAtividade {
    chamadas: number;
    falhas: number;
    recusas: number;
    tempo_total_ms: number;
    ultima_atividade_em: string | null;
    diagnostico_expirado: boolean;
}

/**
 * Sessões de tempo da ÁRVORE inteira da raiz (todos os nós, todas as pessoas),
 * calculadas pela API. É a fonte única do timer do cabeçalho e do "Total" da
 * lista "Sessões" (decisão do PO no ci_gate do TP-4, 22/10/2026).
 */
export interface TempoEmSessoes {
    encerradas_segundos: number;
    ativas_desde: string[];
}

/** A única conta: as encerradas mais o tempo corrido das abertas, até `agora`. */
export function segundosEmSessoes(sessoes: TempoEmSessoes, agora: number): number {
    const abertas = sessoes.ativas_desde.reduce((s, inicio) => {
        const t = Date.parse(inicio);
        return Number.isNaN(t) ? s : s + Math.max(0, (agora - t) / 1000);
    }, 0);
    return Math.floor(sessoes.encerradas_segundos + abertas);
}

/** "01:02:03". */
export function formatarTempoDeSessoes(total: number): string {
    const h = String(Math.floor(total / 3600)).padStart(2, '0');
    const m = String(Math.floor((total % 3600) / 60)).padStart(2, '0');
    const s = String(total % 60).padStart(2, '0');
    return `${h}:${m}:${s}`;
}

/**
 * O total em segundos, andando de segundo em segundo no navegador enquanto há
 * sessão aberta. Relógio local: nenhuma consulta (ADR-0071).
 */
export function useSegundosEmSessoes(sessoes: TempoEmSessoes | null | undefined): number | null {
    const [agora, setAgora] = useState(() => Date.now());
    const emAndamento = (sessoes?.ativas_desde.length ?? 0) > 0;
    useEffect(() => {
        if (!emAndamento) return undefined;
        setAgora(Date.now());
        const relogio = setInterval(() => setAgora(Date.now()), 1_000);
        return () => clearInterval(relogio);
    }, [emAndamento]);
    return sessoes ? segundosEmSessoes(sessoes, emAndamento ? agora : Date.now()) : null;
}

/** A sessão deste usuário abriu: entra no total em cache, sem buscar de novo. */
export function comSessaoAberta(resumo: ResumoDoNo | undefined, inicio: string): ResumoDoNo | undefined {
    if (!resumo?.sessoes) return resumo;
    const ja = resumo.sessoes.ativas_desde.some((a) => Date.parse(a) === Date.parse(inicio));
    return ja ? resumo : { ...resumo, sessoes: { ...resumo.sessoes, ativas_desde: [...resumo.sessoes.ativas_desde, inicio] } };
}

/** A sessão deste usuário fechou: sai das abertas e soma nas encerradas. */
export function comSessaoFechada(resumo: ResumoDoNo | undefined, inicio: string, fim: string): ResumoDoNo | undefined {
    if (!resumo?.sessoes) return resumo;
    const t = Date.parse(inicio);
    const abertas = resumo.sessoes.ativas_desde.filter((a) => Date.parse(a) !== t);
    if (abertas.length === resumo.sessoes.ativas_desde.length) return resumo;
    return {
        ...resumo,
        sessoes: {
            ativas_desde: abertas,
            encerradas_segundos: resumo.sessoes.encerradas_segundos + Math.max(0, (Date.parse(fim) - t) / 1000),
        },
    };
}

export interface CondicaoDoNo { chave: string; estado: 'ok' | 'falta' | 'motor'; motivo: string | null; override: boolean }
export interface ResumoDoNo {
    condicoes?: CondicaoDoNo[] | null;
    pendencias: PendenciaDoNo[];
    abas: Record<string, AbaDoResumo>;
    atividade: ResumoDeAtividade;
    /** Ausente em API anterior à rodada do PO de 21/10: o timer mostra "—". */
    sessoes?: TempoEmSessoes;
    /**
     * Quem pede pode fazer override neste nó: o dono da árvore ou admin
     * (ADR-0072). A regra é da API; o app só lê. Ausente vale `false`.
     */
    pode_override?: boolean;
}

/** A sessão deste usuário, como a API devolveu ao abrir. */
export interface SessaoPropria {
    id: string;
    inicio: string;
}

/**
 * Sessões abertas e fechadas por este navegador, para o total em cache nunca
 * ficar atrás do que o próprio usuário fez (ci_gate do TP-4):
 *   - toda resposta do `/resumo` passa por `comSessoesProprias`: a sessão
 *     aberta do nó entra, e a fechada sai das abertas. Vale mesmo quando a
 *     resposta saiu do servidor antes do `start` ou do `end` ser gravado;
 *   - por isso o `session_started`/`session_closed` delas, quando chega pelo
 *     stream, não relê o `/resumo` (`eventoDeSessaoJaNoTotal`): ao abrir o nó
 *     seria uma 4ª chamada (meta de 3, ADR-0071).
 */
const sessoesProprias = new Map<string, { executionId: string; inicio: string; fim?: string }>();

export function eventoDeSessaoJaNoTotal(evento: { name: string; payload?: Record<string, unknown> }): boolean {
    const id = evento.payload?.session_id;
    const propria = typeof id === 'string' ? sessoesProprias.get(id) : undefined;
    if (!propria) return false;
    return evento.name === 'session_started' || (evento.name === 'session_closed' && propria.fim !== undefined);
}

/** O resumo de `executionId` com as sessões deste navegador já postas no total. */
export function comSessoesProprias(resumo: ResumoDoNo, executionId: string): ResumoDoNo {
    let corrigido = resumo;
    for (const { executionId: doNo, inicio, fim } of sessoesProprias.values()) {
        if (fim !== undefined) corrigido = comSessaoFechada(corrigido, inicio, fim) ?? corrigido;
        else if (doNo === executionId) corrigido = comSessaoAberta(corrigido, inicio) ?? corrigido;
    }
    return corrigido;
}

const MODELO_DA_CHAVE = chavesDeConsulta.resumo('');
const ehChaveDeResumo = (chave: QueryKey) =>
    chave.length === MODELO_DA_CHAVE.length && chave[0] === MODELO_DA_CHAVE[0] && chave[2] === MODELO_DA_CHAVE[2];

/** A sessão deste usuário abriu no nó: entra no total em cache dele, sem buscar. */
export function aplicarSessaoAberta(cliente: QueryClient, executionId: string, sessao: SessaoPropria): void {
    sessoesProprias.set(sessao.id, { executionId, inicio: sessao.inicio });
    cliente.setQueryData<ResumoDoNo>(chavesDeConsulta.resumo(executionId), (r) => comSessaoAberta(r, sessao.inicio));
}

/**
 * A sessão deste usuário fechou: sai de TODOS os resumos em cache. O total é
 * da árvore, mas o cache é por nó; ao trocar de nó, o seguinte ainda teria a
 * sessão como aberta e o relógio contaria em dobro até a checagem de
 * novidades. `comSessaoFechada` só mexe no resumo que tem aquele início.
 */
export function aplicarSessaoFechada(cliente: QueryClient, sessao: SessaoPropria & { fim: string }): void {
    const propria = sessoesProprias.get(sessao.id);
    sessoesProprias.set(sessao.id, { executionId: propria?.executionId ?? '', inicio: sessao.inicio, fim: sessao.fim });
    for (const [chave, resumo] of cliente.getQueriesData<ResumoDoNo>({ predicate: (q) => ehChaveDeResumo(q.queryKey) })) {
        const depois = comSessaoFechada(resumo, sessao.inicio, sessao.fim);
        if (depois !== resumo) cliente.setQueryData(chave, depois);
    }
}

export const getResumoDoNo = async (executionId: string): Promise<ResumoDoNo> => {
    const response = await api.get(`/api/agent-executions/${executionId}/resumo`);
    return comSessoesProprias(response.data, executionId);
};

/** Abas que o resumo diz estarem vazias, com o motivo. Nunca o conteúdo da aba. */
export function abasVazias(resumo: Pick<ResumoDoNo, 'abas'> | null | undefined): Record<string, string> {
    const vazias: Record<string, string> = {};
    for (const [aba, dados] of Object.entries(resumo?.abas ?? {})) {
        if (dados.motivo_vazio) vazias[aba] = dados.motivo_vazio;
    }
    return vazias;
}
