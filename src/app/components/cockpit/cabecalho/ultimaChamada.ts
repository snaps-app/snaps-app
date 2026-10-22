/**
 * Regras do indicador "última chamada ao Snaps" (P25; ADR-0071, item 5), em
 * funções puras: o componente só lê o relógio e o `/resumo`.
 *
 * - O "há X min" é contado no navegador, a partir de
 *   `resumo.atividade.ultima_atividade_em` (TP-2), ou do último evento SSE do
 *   nó, o que for mais recente. Nenhuma chamada própria.
 * - Âmbar depois de 15 min sem chamada num nó `in_progress`. Sem luz de
 *   pendência, e nunca "agente parado": o agente pode estar pensando, rodando
 *   teste ou esperando gente — a tela só sabe que não houve chamada.
 * - As chamadas MCP não geram evento SSE (gravam em `tool_invocations`). Por
 *   isso, e só para o nó `in_progress` da aba visível, o `/resumo` é revalidado
 *   UMA vez ao cruzar 15 min e, enquanto âmbar, no máximo a cada 5 min.
 */
import type { ResumoDeAtividade } from '@/services/resumoDoNo';

export const LIMIAR_AMBAR_MS = 15 * 60_000;
export const INTERVALO_EM_AMBAR_MS = 5 * 60_000;
/** Folga para o relógio local já ter cruzado o limiar quando a revalidação dispara. */
const FOLGA_MS = 1_000;

function instante(iso: string | null | undefined): number | null {
    if (!iso) return null;
    const t = Date.parse(iso);
    return Number.isNaN(t) ? null : t;
}

/** O mais recente entre a última chamada do resumo e o último evento do nó. */
export function ultimaAtividade(
    ultimaChamadaEm: string | null | undefined,
    ultimoEventoEm: string | null | undefined,
): number | null {
    const a = instante(ultimaChamadaEm);
    const b = instante(ultimoEventoEm);
    if (a === null) return b;
    if (b === null) return a;
    return Math.max(a, b);
}

/** "3 min", "1 h 05 min". */
export function formatarMinutos(minutos: number): string {
    if (minutos < 60) return `${minutos} min`;
    const h = Math.floor(minutos / 60);
    return `${h} h ${String(minutos % 60).padStart(2, '0')} min`;
}

export interface TextoDaUltimaChamada {
    texto: string;
    ambar: boolean;
}

export function textoDaUltimaChamada(ultima: number | null, agora: number, emAndamento: boolean): TextoDaUltimaChamada {
    if (ultima === null) return { texto: 'nenhuma chamada ao Snaps neste nó', ambar: false };
    const desde = Math.max(0, agora - ultima);
    const minutos = Math.floor(desde / 60_000);
    if (emAndamento && desde >= LIMIAR_AMBAR_MS) {
        return { texto: `sem atividade no Snaps há ${formatarMinutos(minutos)}`, ambar: true };
    }
    if (minutos < 1) return { texto: 'última chamada ao Snaps há menos de 1 min', ambar: false };
    return { texto: `última chamada ao Snaps há ${formatarMinutos(minutos)}`, ambar: false };
}

/**
 * Quando revalidar o `/resumo`, em ms, ou `false`. Antes do limiar, o tempo que
 * falta para cruzá-lo (uma revalidação); depois, de 5 em 5 min. Nó que não está
 * `in_progress`, aba oculta ou nó sem nenhuma chamada: nunca.
 */
export function intervaloDeRevalidacao(
    { emAndamento, visivel, ultima, agora }: { emAndamento: boolean; visivel: boolean; ultima: number | null; agora: number },
): number | false {
    if (!emAndamento || !visivel || ultima === null) return false;
    const desde = Math.max(0, agora - ultima);
    if (desde < LIMIAR_AMBAR_MS) return LIMIAR_AMBAR_MS - desde + FOLGA_MS;
    return INTERVALO_EM_AMBAR_MS;
}

/** "14 min 36 s", "36 s", "1 h 02 min". */
export function formatarTempoEmTools(ms: number): string {
    const segundos = Math.max(0, Math.round(ms / 1000));
    if (segundos < 60) return `${segundos} s`;
    const minutos = Math.floor(segundos / 60);
    if (minutos < 60) return `${minutos} min ${segundos % 60} s`;
    return `${Math.floor(minutos / 60)} h ${String(minutos % 60).padStart(2, '0')} min`;
}

/** Nó concluído: "81 chamadas · 0 falhas · 14 min 36 s em tools". */
export function resumoDeTools(atividade: Pick<ResumoDeAtividade, 'chamadas' | 'falhas' | 'tempo_total_ms'>): string {
    const chamadas = `${atividade.chamadas} ${atividade.chamadas === 1 ? 'chamada' : 'chamadas'}`;
    const falhas = `${atividade.falhas} ${atividade.falhas === 1 ? 'falha' : 'falhas'}`;
    return `${chamadas} · ${falhas} · ${formatarTempoEmTools(atividade.tempo_total_ms)} em tools`;
}
