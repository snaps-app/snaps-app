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
 * TP-2), pelas chaves de `chavesDeConsulta`: nenhuma chave é montada aqui.
 */
import { useQuery, type Query } from '@tanstack/react-query';
import { api } from './client';
import { chavesDeConsulta } from './chavesDeConsulta';
import type { ArvoreLeve, NodeSnapshot } from './types';
import { getPhaseDirectives } from './workflowTemplates';
import type { StatusDaApi } from './workflowSnapshot';

/** `GET /api/agent-executions/{id}/arvore`. O `id` pode ser qualquer nó da árvore. */
export const getArvore = async (executionId: string): Promise<ArvoreLeve> => {
    const response = await api.get(`/api/agent-executions/${executionId}/arvore`);
    return response.data;
};

/** `GET /api/agent-executions/{id}/node-snapshot` (plano f518941f §3.5). */
export const getNodeSnapshot = async (executionId: string): Promise<NodeSnapshot> => {
    const response = await api.get(`/api/agent-executions/${executionId}/node-snapshot`);
    return response.data;
};

/**
 * A árvore leve da raiz. Invalidada por `execution_created`, `phase_advanced` e
 * `execution_status_changed` (`invalidarPorEvento`, prefixo `raiz(rootId)`) e
 * pelas ações do nó (`useAcoesDoNo`).
 *
 * `staleTime: Infinity`: o frescor é por evento, não por relógio. Com o padrão
 * de 30 s, trocar de aba de raiz e voltar buscaria a árvore de novo a cada vez;
 * a meta da ADR-0071 é nenhuma chamada dentro do `gcTime` (10 min).
 */
export function useArvore(rootId: string | null | undefined) {
    return useQuery({
        queryKey: chavesDeConsulta.arvore(rootId ?? ''),
        queryFn: () => getArvore(rootId as string),
        enabled: Boolean(rootId),
        staleTime: Infinity,
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
