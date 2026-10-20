/**
 * Arquivos alterados da PR de um nó (P18), sob demanda.
 *
 * O repositório e a PR vêm do `context_data.prs` do nó, do lado da API: o app
 * só nomeia o repositório, e um repositório fora do nó volta 404 sem chamar o
 * GitHub. Com `fixado: true` o SHA é o do `pr_heads_captured` e a resposta não
 * muda mais (a chave de cache usa `staleTime: Infinity`).
 */
import { api } from './client';

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
