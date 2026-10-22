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
 *  - `session_started` e `session_closed` (sessão de tempo aberta ou fechada no
 *    nó) invalidam só `resumo(id)`: é ele que traz o tempo da árvore inteira, a
 *    fonte única do timer do cabeçalho e do "Total" da lista "Sessões". O da
 *    sessão deste navegador, já posta no total em cache, não invalida nada
 *    (`eventoDeSessaoJaNoTotal`): ao abrir o nó seria uma 4ª chamada.
 *  - Evento desconhecido invalida só `resumo(id)`.
 *  - Nunca invalida tudo: não existe chamada sem chave aqui.
 *
 * A aba Atividade pagina por filtro (`atividade(id, filtros)`) e a aba PRs e CI
 * guarda os arquivos por SHA (`prs(id, repo, sha)`): o evento delas invalida
 * esses prefixos também.
 */
import type { QueryClient, QueryKey } from '@tanstack/react-query';
import { chavesDeConsulta as chaves } from '@/services/chavesDeConsulta';
import { eventoDeSessaoJaNoTotal } from '@/services/resumoDoNo';
import { abaDoEvento, type EventoDoNo } from './abaDoEvento';

const MUDAM_A_ARVORE = new Set([
    'execution_created', 'phase_advanced', 'phase_rolled_back', 'execution_status_changed',
]);

/** Sessões de tempo: mudam só o total da árvore, que vem no `/resumo`. */
export const EVENTOS_DE_SESSAO: ReadonlySet<string> = new Set(['session_started', 'session_closed']);

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
    if (EVENTOS_DE_SESSAO.has(evento.name)) return lista;
    // `execution_updated` não tem aba, mas muda a revisão do nó (`lock_version`),
    // que a árvore leve carrega e as ações enviam: sem isso, avançar depois de
    // um sync do agente daria 409 por revisão velha (TP-4).
    if (evento.name === 'execution_updated') lista.push(chaves.arvore(contexto.rootId), chaves.snapshot(id));
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
    if (eventoDeSessaoJaNoTotal(evento)) return Promise.resolve();
    return Promise.all(
        chavesDoEvento(evento, contexto).map((queryKey) => cliente.invalidateQueries({ queryKey })),
    ).then(() => undefined);
}
