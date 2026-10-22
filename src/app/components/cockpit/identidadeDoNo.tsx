/**
 * Identidade de um nó: `fase · TP · tentativa · id curto`, na cor do TP (P15).
 * O cabeçalho e o topo da Conversa mostram a MESMA identidade, para quem olha
 * os dois saber que falam do mesmo nó.
 *
 * O TP sai do título do plano do nó (`TP-4 · E21 · …`), que a árvore leve já
 * traz. Nó sem TP (a cadeia da raiz: macro, micro, plan_review) usa o índigo
 * da raiz. As cores são tokens `--snaps-*`; nada de hex.
 */
import type { NoDaArvore } from '@/services/types';
import type { ItemDoHistory } from '@/services/workflowSnapshot';

export const COR_DA_RAIZ = 'var(--snaps-accent-indigo)';

/** Cores dos TPs, na ordem do número: TP-1, TP-2… e de novo depois da última. */
const CORES_DE_TP = [
    'var(--snaps-accent-blue)',
    'var(--snaps-accent-green)',
    'var(--snaps-accent-pink)',
    'var(--snaps-accent-teal)',
    'var(--snaps-accent-orange)',
    'var(--snaps-accent-lime)',
    'var(--snaps-accent-fuchsia)',
    'var(--snaps-accent-sky)',
] as const;

export function tpDoPlano(titulo: string | null | undefined): string | null {
    const achado = titulo?.match(/\bTP-(\d+)\b/i);
    return achado ? `TP-${achado[1]}` : null;
}

export function corDoTp(tp: string | null): string {
    if (!tp) return COR_DA_RAIZ;
    const numero = Number(tp.replace(/\D/g, ''));
    if (!Number.isFinite(numero) || numero < 1) return COR_DA_RAIZ;
    return CORES_DE_TP[(numero - 1) % CORES_DE_TP.length];
}

export interface IdentidadeDoNo {
    id: string;
    fase: string;
    rotuloDaFase: string;
    tp: string | null;
    tentativa: number;
    cor: string;
}

export function identidadeDoNo(no: Pick<NoDaArvore, 'id' | 'phase' | 'plano_titulo'>, itens: readonly ItemDoHistory[]): IdentidadeDoNo {
    const item = itens.find((i): i is Extract<ItemDoHistory, { tipo: 'no' }> => i.tipo === 'no' && i.id === no.id);
    const tp = tpDoPlano(no.plano_titulo);
    return {
        id: no.id,
        fase: no.phase,
        rotuloDaFase: item?.label ?? no.phase,
        tp,
        tentativa: item?.tentativa ?? 1,
        cor: corDoTp(tp),
    };
}

/** "execution · TP-1 · tentativa 2 · 1bc76715". A primeira tentativa não aparece. */
export function textoDaIdentidade(id: IdentidadeDoNo): string {
    return [id.fase, id.tp, id.tentativa > 1 ? `tentativa ${id.tentativa}` : null, id.id.slice(0, 8)]
        .filter(Boolean)
        .join(' · ');
}

export function ChipDaIdentidade({ identidade }: { identidade: IdentidadeDoNo }) {
    return (
        <span
            data-testid="identidade-do-no"
            data-cor={identidade.cor}
            title={identidade.id}
            className="inline-flex h-6 shrink-0 items-center gap-1.5 rounded-full border px-2.5 font-mono text-xs whitespace-nowrap"
            style={{
                color: identidade.cor,
                borderColor: `color-mix(in srgb, ${identidade.cor} 45%, transparent)`,
                background: `color-mix(in srgb, ${identidade.cor} 12%, transparent)`,
            }}
        >
            <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full" style={{ background: identidade.cor }} />
            {textoDaIdentidade(identidade)}
        </span>
    );
}
