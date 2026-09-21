/**
 * O que conta como execução ENCERRADA — uma definição, não quatro.
 *
 * Esta regra estava escrita à mão em quatro lugares, e as quatro cópias eram
 * diferentes:
 *
 *   `isExecutionStuck`   terminal = done, failed
 *   `isBranchStuck`      terminal = done, completed, failed
 *   o contador "Active"  terminal = done, failed
 *   o tipo TS            o union nem listava `cancelled`
 *
 * Nenhuma conhecia `cancelled`, `rolled_back` ou `superseded`, e duas não
 * conheciam `completed`. O efeito apareceu em 21/09/2026, quando 43 execuções
 * antigas foram descartadas: a tela passou a mostrar ⚠️ TRAVADA em linha
 * CANCELLED — porque `cancelled` não estava em lista nenhuma, caía no ramo de
 * "sem atividade há muito tempo" e uma lápide nunca mais é atualizada, então
 * ficava travada para sempre. O contador dizia 236 ACTIVE de 267 pelo mesmo
 * motivo.
 *
 * `tombstoned_at` entra aqui junto com o status porque descarte é as DUAS
 * coisas: a linha vira `cancelled` E ganha a lápide. Perguntar só pelo status
 * funciona hoje e deixa de funcionar quando alguém descartar sem mudar status.
 */
import type { AgentTaskExecution } from './types';

/** Status a partir dos quais a execução não volta a se mexer. */
export const STATUS_ENCERRADOS = [
    'done',
    'completed',
    'failed',
    'cancelled',
    'rolled_back',
    'superseded',
] as const;

export type StatusEncerrado = (typeof STATUS_ENCERRADOS)[number];

/** Encerrada: não espera nada, não vai mudar, não pode estar "travada". */
export function estaEncerrada(exec: Pick<AgentTaskExecution, 'status'> & { tombstoned_at?: string | null }): boolean {
    if (exec.tombstoned_at) return true;
    return (STATUS_ENCERRADOS as readonly string[]).includes(exec.status);
}

/** Em voo: o complemento exato de `estaEncerrada`, para os contadores. */
export function estaEmVoo(exec: Pick<AgentTaskExecution, 'status'> & { tombstoned_at?: string | null }): boolean {
    return !estaEncerrada(exec);
}

/** Descartada explicitamente — distinta de concluída, e a tela deve diferenciar. */
export function foiDescartada(exec: Pick<AgentTaskExecution, 'status'> & { tombstoned_at?: string | null }): boolean {
    return Boolean(exec.tombstoned_at) || exec.status === 'cancelled';
}
