/**
 * Consultas do History e da aba Nó — Sprint 24.0, E21 (TP-1; ADR-0071).
 *
 * A árvore vem da rota leve `/arvore` (sem prompt nem contexto, cada workflow
 * uma vez por hash): a `/tree` levava 1,3 MB numa raiz de 20 nós.
 *
 * O snapshot de um nó TERMINAL não muda mais — a migration 080 trava no banco
 * o prompt, o workflow, a fase, os cards e o plano. Por isso ele fica em cache
 * com `staleTime: Infinity` até a página recarregar: voltar a um nó concluído
 * já visto não faz chamada. O servidor ainda manda `ETag` com
 * `Cache-Control: private, no-cache`, e o navegador revalida com
 * `If-None-Match` quando uma invalidação pede o snapshot de novo (304).
 *
 * O frescor do nó atual e da árvore vem por evento (`invalidarPorEvento`, do
 * TP-2), pelas chaves de `chavesDeConsulta`: nenhuma chave é montada aqui. A
 * árvore tem também a checagem de novidades (ADR-0071, 5b), que revalida com
 * `If-None-Match` e recebe 304 quando nada mudou.
 */
import { useQuery, useQueryClient, type Query, type QueryClient } from '@tanstack/react-query';
import { api } from './client';
import { chavesDeConsulta } from './chavesDeConsulta';
import type { ArvoreLeve, NodeSnapshot } from './types';
import { getPhaseDirectives } from './workflowTemplates';
import type { StatusDaApi } from './workflowSnapshot';

/**
 * `GET /api/agent-executions/{id}/arvore`. O `id` pode ser qualquer nó da árvore.
 *
 * Com a árvore `anterior` (a do cache), manda `If-None-Match` com o ETag dela.
 * O `304` devolve a MESMA árvore, a mesma referência: o TanStack não avisa
 * ninguém e a tela não redesenha. O ETag vai junto da árvore (`etag`), e não
 * num mapa à parte, porque o compartilhamento estrutural do TanStack troca o
 * objeto quando algo muda, e o ETag precisa acompanhar o que ficou no cache.
 */
export const getArvore = async (executionId: string, anterior?: ArvoreLeve): Promise<ArvoreLeve> => {
    const url = `/api/agent-executions/${executionId}/arvore`;
    const etag = anterior?.etag;
    const response = etag
        ? await api.get(url, {
            headers: { 'If-None-Match': etag },
            validateStatus: (status: number) => (status >= 200 && status < 300) || status === 304,
        })
        : await api.get(url);
    if (response.status === 304 && anterior) return anterior;
    const novo = response.headers?.etag;
    return typeof novo === 'string' ? { ...response.data, etag: novo } : response.data;
};

/**
 * A consulta da árvore de uma raiz, igual para quem a lê: o Cockpit da raiz
 * (`useArvore`) e a checagem de novidades. Duas formas de buscar a mesma chave
 * divergiriam no que vai para o cache.
 *
 * `staleTime: Infinity`: o frescor é por evento e pela checagem, não pela
 * idade. Com o padrão de 30 s, trocar de aba de raiz e voltar buscaria a
 * árvore de novo a cada vez.
 */
export function consultaDaArvore(cliente: QueryClient, rootId: string) {
    const queryKey = chavesDeConsulta.arvore(rootId);
    return {
        queryKey,
        queryFn: () => getArvore(rootId, cliente.getQueryData<ArvoreLeve>(queryKey)),
        staleTime: Infinity,
    };
}

/** `GET /api/agent-executions/{id}/node-snapshot` (plano f518941f §3.5). */
export const getNodeSnapshot = async (executionId: string): Promise<NodeSnapshot> => {
    const response = await api.get(`/api/agent-executions/${executionId}/node-snapshot`);
    return response.data;
};

/**
 * A árvore leve da raiz. Invalidada por `execution_created`, `phase_advanced`,
 * `execution_status_changed` e `execution_updated` (`invalidarPorEvento`) e
 * pelas ações do nó (`useAcoesDoNo`); revalidada pela checagem de novidades
 * (`useNovidadesDasRaizes`). Trocar de aba de raiz e voltar não a busca: a meta
 * da ADR-0071 é nenhuma chamada dentro do `gcTime` (10 min) fora da checagem.
 */
export function useArvore(rootId: string | null | undefined) {
    const cliente = useQueryClient();
    return useQuery({
        ...consultaDaArvore(cliente, rootId ?? ''),
        enabled: Boolean(rootId),
    });
}

/**
 * O snapshot do nó. Terminal: `staleTime: Infinity`; atual: o padrão, com frescor por evento.
 *
 * O `Infinity` vale só quando o snapshot em cache já diz `imutavel`. O que foi
 * buscado enquanto o nó era atual não congela quando ele termina: é buscado de
 * novo uma vez (com o head capturado na conclusão) e só então fica.
 */
export function useNodeSnapshot(executionId: string | null | undefined, terminal: boolean) {
    return useQuery({
        queryKey: chavesDeConsulta.snapshot(executionId ?? ''),
        queryFn: () => getNodeSnapshot(executionId as string),
        enabled: Boolean(executionId),
        ...(terminal
            ? { staleTime: (consulta: Query<NodeSnapshot>) => (consulta.state.data?.imutavel ? Infinity : 0) }
            : {}),
    });
}

/**
 * As listas de status de `phase-directives`, buscadas uma vez por sessão.
 * O app não guarda cópia: `classificarNo` e `montarHistory` recebem isto.
 */
export function useStatusDaApi() {
    return useQuery({
        queryKey: chavesDeConsulta.diretivas(),
        queryFn: getPhaseDirectives,
        staleTime: Infinity,
        select: (diretivas): StatusDaApi => ({
            terminais: diretivas.terminal_statuses ?? [],
            descartados: diretivas.discarded_statuses ?? [],
        }),
    });
}
