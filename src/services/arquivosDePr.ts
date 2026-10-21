/**
 * Arquivos alterados da PR de um nó (P18), sob demanda.
 *
 * O repositório e a PR vêm do `context_data.prs` do nó, do lado da API: o app
 * só nomeia o repositório, e um repositório fora do nó volta 404 sem chamar o
 * GitHub. Com `fixado: true` o SHA é o do `pr_heads_captured` e a resposta não
 * muda mais (a chave de cache usa `staleTime: Infinity`).
 *
 * A lista de arquivos é guardada pelo COMMIT: `prs(id, repo, sha)`. Um commit
 * novo na PR leva a outra chave e a outra busca; a lista do commit anterior
 * nunca é mostrada como se fosse a atual.
 */
import { useState } from 'react';
import { useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { api } from './client';
import { chavesDeConsulta as chaves } from './chavesDeConsulta';

export interface ArquivoDaPr {
    caminho: string;
    status: 'added' | 'modified' | 'removed' | 'renamed' | string;
    adicoes: number;
    remocoes: number;
}

export interface ArquivosDaPr {
    repo: string;
    pr_number: number;
    pr_url: string | null;
    head_sha: string | null;
    fixado: boolean;
    truncado: boolean;
    arquivos: ArquivoDaPr[];
}

export const getArquivosDaPr = async (executionId: string, repo: string): Promise<ArquivosDaPr> => {
    const response = await api.get(
        `/api/agent-executions/${executionId}/prs/${encodeURIComponent(repo)}/files`,
    );
    return response.data;
};

/** Link "Ver no GitHub": a aba de arquivos da PR. */
export function linkDosArquivos(prUrl: string | null): string | null {
    return prUrl ? `${prUrl.replace(/\/$/, '')}/files` : null;
}

/** Chave do primeiro pedido, antes de a API dizer qual é o SHA. */
const SEM_SHA = '';

/**
 * O SHA mais recente que a API devolveu para cada `(nó, repositório)`, por cliente.
 * Fica fora do cache de consulta de propósito: guardá-lo lá exigiria uma chave
 * sem SHA, que é justamente o que esta lista não pode ter.
 */
const ultimoSha = new WeakMap<QueryClient, Map<string, string>>();
const chaveDoPonteiro = (executionId: string, repo: string) => `${executionId}|${repo}`;

interface PrDoSnapshot { repo?: string; head_sha?: string | null }

/**
 * O SHA que o app já tem, sem chamada nova:
 *  1. o `head_sha` do `pr_heads_captured` no snapshot do nó, se ele já está em cache;
 *  2. o SHA mais recente que a API devolveu para este repositório.
 */
export function shaConhecido(cliente: QueryClient, executionId: string, repo: string): string | null {
    const snapshot = cliente.getQueryData<{ prs?: PrDoSnapshot[] }>(chaves.snapshot(executionId));
    const capturado = snapshot?.prs?.find((p) => p.repo === repo)?.head_sha;
    return capturado || ultimoSha.get(cliente)?.get(chaveDoPonteiro(executionId, repo)) || null;
}

/**
 * Arquivos alterados da PR, na chave do commit.
 *
 * - SHA conhecido: a chave já o tem e, se a resposta é `fixado`, a lista não fica
 *   velha nunca (nó concluído reaberto não chama de novo).
 * - Sem SHA: o primeiro pedido usa a chave sem SHA; a resposta traz o `head_sha`,
 *   é guardada na chave dele e a tela passa para ela. Nenhuma chamada a mais
 *   para descobrir o SHA, e nenhuma consulta periódica.
 * - Commit novo (o evento do nó invalida `prs(id)`): o pedido volta com outro
 *   `head_sha`. A lista nova vai para a chave dele, a tela passa para essa chave,
 *   e a chave antiga continua com a lista do commit antigo (cada chave guarda
 *   sempre a lista do SHA que ela nomeia).
 */
export function useArquivosDaPr(executionId: string, repo: string, habilitada: boolean) {
    const cliente = useQueryClient();
    const [sha, setSha] = useState<string | null>(() => shaConhecido(cliente, executionId, repo));
    const chaveAtual = chaves.prs(executionId, repo, sha ?? SEM_SHA);

    return useQuery({
        queryKey: chaveAtual,
        queryFn: async () => {
            const resposta = await getArquivosDaPr(executionId, repo);
            const novo = resposta.head_sha;
            if (!novo) return resposta;
            const ponteiros = ultimoSha.get(cliente) ?? new Map<string, string>();
            ponteiros.set(chaveDoPonteiro(executionId, repo), novo);
            ultimoSha.set(cliente, ponteiros);
            if (novo === sha) return resposta;

            cliente.setQueryData(chaves.prs(executionId, repo, novo), resposta);
            setSha(novo);
            // A chave antiga não recebe a lista do commit novo: sem SHA anterior
            // (primeiro pedido) a resposta é tudo o que há; com SHA, fica a dela.
            return cliente.getQueryData<ArquivosDaPr>(chaveAtual) ?? resposta;
        },
        enabled: habilitada,
        staleTime: (q) => ((q.state.data as ArquivosDaPr | undefined)?.fixado ? Infinity : 30_000),
    });
}
