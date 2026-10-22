/**
 * Marca de novidade nos nós do Workflow e nas abas de raiz (P15; ADR-0071, 5b).
 *
 * Só o nó selecionado tem stream (P13). Os outros nós, e as raízes das abas
 * inativas, chegam à tela pela árvore leve: ela volta a ser buscada por evento
 * do nó selecionado, por ação do usuário e pela checagem de novidades
 * (`useNovidadesDasRaizes`). Aqui se compara a árvore que chegou com a última
 * vista, e se diz onde acender a marca. Funções puras: o hook só guarda o estado.
 *
 * - Nó que mudou em qualquer campo da árvore (status, fase, revisão, plano,
 *   cards, `updated_at`) ganha +1. Nó novo também, e o pai dele, que ganhou um
 *   filho (é assim que uma tentativa nova aparece no nó de onde ela saiu).
 * - O nó selecionado da aba visível nunca ganha marca: ele está no stream. E
 *   selecionar um nó apaga a marca dele.
 * - A aba de raiz ganha marca quando a novidade chega com ela inativa. Abrir a
 *   aba apaga a marca da aba; as dos nós ficam até cada um ser selecionado.
 * - A primeira árvore vista de uma raiz é a base: abrir não acende nada.
 */
import type { NoDaArvore } from '@/services/types';

export interface VistosDaRaiz {
    /** Assinatura de cada nó na última árvore vista. */
    base: Readonly<Record<string, string>>;
    /** Novidades ainda não vistas, por nó. */
    contagem: Readonly<Record<string, number>>;
    /** A aba de raiz recebeu novidade enquanto estava inativa. */
    aba: boolean;
}

/**
 * Campos da árvore que NÃO são novidade do nó. `sessoes` é o carimbo das
 * sessões de tempo: serve para o timer ficar em dia, e abrir o Cockpit já
 * abre uma sessão; marcar o nó por isso acenderia novidade a cada visita.
 */
const FORA_DA_NOVIDADE: ReadonlySet<string> = new Set(['sessoes', 'cards']);

/** O que a árvore leve diz de um nó, em ordem fixa: qualquer campo que mude é novidade. */
export function assinaturaDoNo(no: NoDaArvore): string {
    const campos = no as unknown as Record<string, unknown>;
    return JSON.stringify(
        Object.keys(campos).filter((chave) => !FORA_DA_NOVIDADE.has(chave)).sort().map((chave) => [chave, campos[chave]]),
    );
}

export interface ContextoDaComparacao {
    /** O nó selecionado, só na aba visível. Na inativa, `null`: ninguém está olhando. */
    selecionado: string | null;
    /** A raiz é a aba visível. */
    ativa: boolean;
}

export function atualizarVistos(
    estado: VistosDaRaiz | null,
    nos: readonly NoDaArvore[],
    { selecionado, ativa }: ContextoDaComparacao,
): VistosDaRaiz {
    if (!estado) {
        return { base: Object.fromEntries(nos.map((n) => [n.id, assinaturaDoNo(n)])), contagem: {}, aba: false };
    }
    const base: Record<string, string> = { ...estado.base };
    const contagem: Record<string, number> = { ...estado.contagem };
    let mudou = false;
    let acendeu = false;
    const marcar = (id: string) => {
        if (id === selecionado) return;
        contagem[id] = (contagem[id] ?? 0) + 1;
        acendeu = true;
    };
    for (const no of nos) {
        const assinatura = assinaturaDoNo(no);
        const anterior = base[no.id];
        if (anterior === assinatura) continue;
        base[no.id] = assinatura;
        mudou = true;
        marcar(no.id);
        if (anterior === undefined && no.parent_id && no.parent_id in estado.base) marcar(no.parent_id);
    }
    if (selecionado && contagem[selecionado]) {
        delete contagem[selecionado];
        mudou = true;
    }
    const aba = estado.aba || (acendeu && !ativa);
    if (!mudou && aba === estado.aba) return estado;
    return { base, contagem, aba };
}

/** Selecionar o nó apaga a marca dele. */
export function verNo(estado: VistosDaRaiz, id: string): VistosDaRaiz {
    if (!estado.contagem[id]) return estado;
    const contagem = { ...estado.contagem };
    delete contagem[id];
    return { ...estado, contagem };
}

/** Abrir a aba de raiz apaga a marca da aba. */
export function abrirAbaDeRaiz(estado: VistosDaRaiz): VistosDaRaiz {
    return estado.aba ? { ...estado, aba: false } : estado;
}

export function totalDeNovidades(estado: VistosDaRaiz | null | undefined): number {
    return Object.values(estado?.contagem ?? {}).reduce((s, n) => s + n, 0);
}
