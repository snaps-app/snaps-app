/**
 * Contador de novidade dos nós NÃO selecionados, no Workflow (P15).
 *
 * Só o nó selecionado tem stream (P13), então a tela não ouve os eventos dos
 * outros. O que ela vê é a árvore leve, que volta a ser buscada quando um
 * evento invalida a raiz: um nó que apareceu, ou cujo `updated_at` mudou desde
 * a última vez que a tela o viu, ganha +1. Selecionar o nó zera.
 *
 * A primeira árvore da sessão é a base: abrir uma raiz não acende nada.
 */
import type { NoDaArvore } from '@/services/types';

export interface VistosDosNos {
    /** `updated_at` de cada nó na última vez que a tela o viu. */
    base: Readonly<Record<string, string>>;
    contagem: Readonly<Record<string, number>>;
}

export function atualizarNovidadesDosNos(
    estado: VistosDosNos | null,
    nos: readonly Pick<NoDaArvore, 'id' | 'updated_at'>[],
    selecionado: string | null,
): VistosDosNos {
    if (!estado) {
        return { base: Object.fromEntries(nos.map((n) => [n.id, n.updated_at])), contagem: {} };
    }
    const base: Record<string, string> = { ...estado.base };
    const contagem: Record<string, number> = { ...estado.contagem };
    let mudou = false;
    for (const no of nos) {
        if (base[no.id] === no.updated_at) continue;
        base[no.id] = no.updated_at;
        mudou = true;
        if (no.id !== selecionado) contagem[no.id] = (contagem[no.id] ?? 0) + 1;
    }
    if (selecionado && contagem[selecionado]) {
        delete contagem[selecionado];
        mudou = true;
    }
    return mudou ? { base, contagem } : estado;
}

export function totalDeNovidadesDosNos(estado: VistosDosNos | null): number {
    return Object.values(estado?.contagem ?? {}).reduce((s, n) => s + n, 0);
}
