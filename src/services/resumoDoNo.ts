/**
 * `GET /api/agent-executions/{id}/resumo` (E21, TP-2): pendências, total e
 * motivo de vazio das 15 abas e resumo de atividade, numa chamada.
 *
 * É o que ordena, acende e esmaece as abas da Superfície (ADR-0071, item 7):
 * as abas fechadas nunca são consultadas para saber se estão vazias.
 * A pendência vem do banco; viewer recebe `pendencias: []` (P6, ADR-0020).
 */
import { api } from './client';

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

/** Sessões de tempo do nó: o timer só de leitura do viewer conta a partir daqui. */
export interface TempoEmSessoes {
    encerradas_segundos: number;
    ativas_desde: string[];
}

export interface ResumoDoNo {
    pendencias: PendenciaDoNo[];
    abas: Record<string, AbaDoResumo>;
    atividade: ResumoDeAtividade;
    /** Ausente em API anterior à rodada do PO de 21/10: o timer do viewer mostra "—". */
    sessoes?: TempoEmSessoes;
    /**
     * Quem pede pode fazer override neste nó: o dono da árvore ou admin
     * (ADR-0072). A regra é da API; o app só lê. Ausente vale `false`.
     */
    pode_override?: boolean;
}

export const getResumoDoNo = async (executionId: string): Promise<ResumoDoNo> => {
    const response = await api.get(`/api/agent-executions/${executionId}/resumo`);
    return response.data;
};

/** Abas que o resumo diz estarem vazias, com o motivo. Nunca o conteúdo da aba. */
export function abasVazias(resumo: Pick<ResumoDoNo, 'abas'> | null | undefined): Record<string, string> {
    const vazias: Record<string, string> = {};
    for (const [aba, dados] of Object.entries(resumo?.abas ?? {})) {
        if (dados.motivo_vazio) vazias[aba] = dados.motivo_vazio;
    }
    return vazias;
}
