/**
 * Frescor por evento, não por relógio (ADR-0071, item 5). Função única: o
 * stream da Conversa (TP-4) chama esta função a cada evento do nó, e ela
 * invalida SÓ as chaves que o evento afeta.
 *
 *  - Todo evento conhecido do nó invalida `resumo(id)` e `aba(id, abaDoEvento)`.
 *  - Os eventos de status e de fase (`execution_created`, `phase_advanced`,
 *    `phase_rolled_back`, `execution_status_changed`) também invalidam o
 *    prefixo `raiz(rootId)` e `snapshot(id)`. O prefixo cobre a árvore e o
 *    rótulo das abas de raiz (`staleTime: Infinity`, só muda por evento).
 *  - Evento desconhecido invalida só `resumo(id)`.
 *  - Nunca invalida tudo: não existe chamada sem chave aqui.
 *
 * A aba Atividade pagina por filtro (`atividade(id, filtros)`) e a aba PRs e CI
 * guarda os arquivos por SHA (`prs(id, repo, sha)`): o evento delas invalida
 * esses prefixos também.
 */
import type { QueryClient, QueryKey } from '@tanstack/react-query';
import { chavesDeConsulta as chaves } from '@/services/chavesDeConsulta';
import { abaDoEvento, type EventoDoNo } from './abaDoEvento';

const MUDAM_A_ARVORE = new Set([
    'execution_created', 'phase_advanced', 'phase_rolled_back', 'execution_status_changed',
]);

export interface ContextoDoEvento {
    /** Nó a que o evento pertence, quando o evento não traz `execution_id`. */
    executionId?: string | null;
    /** Raiz da árvore aberta: a árvore é uma por raiz. */
    rootId: string;
}

/** Prefixo de uma chave gerada pelo módulo de chaves (sem montar chave à mão). */
const prefixo = (chave: QueryKey, tamanho: number): QueryKey => chave.slice(0, tamanho);

/** As chaves que o evento invalida, na ordem. Exposta para o teste. */
export function chavesDoEvento(evento: EventoDoNo, contexto: ContextoDoEvento): QueryKey[] {
    const id = evento.execution_id ?? contexto.executionId;
    if (!id) return [];
    const aba = abaDoEvento(evento);
    const lista: QueryKey[] = [chaves.resumo(id)];
    if (!aba) return lista;

    lista.push(chaves.aba(id, aba));
    if (aba === 'atividade') lista.push(prefixo(chaves.atividade(id, {}), 3));
    if (aba === 'prs') lista.push(prefixo(chaves.prs(id, '', ''), 3));
    if (MUDAM_A_ARVORE.has(evento.name)) {
        lista.push(chaves.raiz(contexto.rootId), chaves.snapshot(id));
    }
    return lista;
}

export function invalidarPorEvento(
    cliente: QueryClient,
    evento: EventoDoNo,
    contexto: ContextoDoEvento,
): Promise<void> {
    return Promise.all(
        chavesDoEvento(evento, contexto).map((queryKey) => cliente.invalidateQueries({ queryKey })),
    ).then(() => undefined);
}
