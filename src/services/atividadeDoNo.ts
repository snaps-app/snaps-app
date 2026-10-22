/**
 * Aba Atividade (P24 a P27): o que o nó fez ATRAVÉS do Snaps.
 *
 * `GET /api/agent-executions/{id}/atividade` traz só metadados: hora, tool,
 * operação, desfecho, códigos e duração. Argumento, resultado e hash nunca
 * chegam aqui — o contrato da API nem tem os campos.
 *
 * `formatarUso` é a função única de apresentação de custo (P26): NULL é
 * "desconhecido", nunca zero; a estimativa vem separada, com a cobertura.
 */
import { api } from './client';
import type { ResumoDeAtividade } from './resumoDoNo';

export const ROTULO_LIMITE_DA_ATIVIDADE =
    'Só o que passa pelo Snaps. Edição de arquivo, terminal e git locais do CLI não aparecem.';
export const ROTULO_USO_NAO_MEDIDO = 'Uso não medido: o CLI não reporta consumo ao Snaps.';

export interface ChamadaDoNo {
    id: string;
    em: string;
    tool: string;
    operacao: string | null;
    recurso: { tipo: string | null; id: string | null } | null;
    desfecho: 'ok' | 'error' | 'refused' | 'cancelled_by_transport' | null;
    desfecho_cliente: string | null;
    codigo_recusa: string | null;
    codigo_erro: string | null;
    codigo_erro_cliente: string | null;
    duracao_ms: number | null;
    turn_id: string | null;
    detalhe_expirado: boolean;
}

export interface RecusaDoMotor {
    em: string;
    operacao: string | null;
    motivo: string | null;
    condicoes: string[];
}

export type Cobertura = 'none' | 'partial' | 'full';

export interface UsoNaAtividade {
    chamadas: number;
    chamadas_com_custo_desconhecido: number;
    custo_conhecido_usd: string | number;
    custo_usd: string | number | null;
    estimativa_usd: string | number | null;
    cobertura: Cobertura;
}

export interface TurnoDoNo {
    turn_id: string;
    perfil: string;
    modelo: string | null;
    desfecho: string | null;
    iteracoes: number;
    uso: UsoNaAtividade;
}

export interface AtividadeDoNo {
    resumo: ResumoDeAtividade;
    chamadas: ChamadaDoNo[];
    recusas_do_motor: RecusaDoMotor[];
    turnos_do_neuron: TurnoDoNo[];
    turnos_motivo_vazio: string | null;
    uso_do_cli: { medido: boolean; motivo: string | null };
    proximo: string | null;
}

export interface FiltrosDeAtividade {
    soFalhas?: boolean;
    limite?: number;
}

export const getAtividadeDoNo = async (
    executionId: string,
    { soFalhas = false, limite = 50 }: FiltrosDeAtividade = {},
    antes?: string | null,
): Promise<AtividadeDoNo> => {
    const params: Record<string, string | number | boolean> = { limit: limite, so_falhas: soFalhas };
    if (antes) params.before = antes;
    const response = await api.get(`/api/agent-executions/${executionId}/atividade`, { params });
    return response.data;
};

/** Chamada que não terminou bem: o servidor manda quando respondeu (mesma regra da API). */
export function chamadaFalhou(c: Pick<ChamadaDoNo, 'desfecho' | 'desfecho_cliente'>): boolean {
    if (c.desfecho !== null) return c.desfecho !== 'ok';
    return c.desfecho_cliente !== 'ok';
}

export interface GrupoDeTool {
    tool: string;
    chamadas: number;
    falhas: number;
    tempoTotalMs: number;
}

/** Agrupamento por tool, com contagem, falhas e tempo total, na ordem de mais chamadas. */
export function agruparPorTool(chamadas: readonly ChamadaDoNo[]): GrupoDeTool[] {
    const grupos = new Map<string, GrupoDeTool>();
    for (const c of chamadas) {
        const g = grupos.get(c.tool) ?? { tool: c.tool, chamadas: 0, falhas: 0, tempoTotalMs: 0 };
        g.chamadas += 1;
        if (chamadaFalhou(c)) g.falhas += 1;
        g.tempoTotalMs += c.duracao_ms ?? 0;
        grupos.set(c.tool, g);
    }
    return [...grupos.values()].sort((a, b) => b.chamadas - a.chamadas || a.tool.localeCompare(b.tool));
}

const ROTULO_COBERTURA: Record<Cobertura, string> = {
    none: 'sem cobertura',
    partial: 'cobertura parcial',
    full: 'cobertura completa',
};

function dinheiro(valor: string | number): string {
    const numero = typeof valor === 'number' ? valor : Number(valor);
    if (!Number.isFinite(numero)) return String(valor);
    // Custo de turno é fração de centavo: abaixo de US$ 1, até 4 casas.
    const maximo = Math.abs(numero) < 1 ? 4 : 2;
    return `US$ ${numero.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: maximo })}`;
}

export interface UsoFormatado {
    custo: string;
    estimativa: string | null;
}

/**
 * Custo e estimativa para a tela. Recebe o uso de um turno do Neuron, ou
 * `null` para o CLI externo, que não reporta consumo.
 */
export function formatarUso(
    uso: Pick<UsoNaAtividade, 'custo_usd' | 'estimativa_usd' | 'cobertura'> | null,
): UsoFormatado {
    if (uso === null) return { custo: ROTULO_USO_NAO_MEDIDO, estimativa: null };
    const custo = uso.custo_usd === null || uso.custo_usd === undefined ? 'desconhecido' : dinheiro(uso.custo_usd);
    const estimativa = uso.estimativa_usd === null || uso.estimativa_usd === undefined
        ? null
        : `≈ ${dinheiro(uso.estimativa_usd)} · ${ROTULO_COBERTURA[uso.cobertura]}`;
    return { custo, estimativa };
}
