/**
 * Todas as chaves de consulta do Cockpit, num lugar só (ADR-0071, item 4).
 *
 * Nenhum componente monta chave à mão. Chave escrita duas vezes diverge na
 * segunda, e a invalidação feita com uma não alcança o cache gravado com a
 * outra: a tela fica com dado velho e nada acusa.
 *
 * A hierarquia é por recurso — `['execucao', id, ...]`, `['raiz', rootId, ...]`
 * — para que um evento invalide tudo de um nó pelo prefixo (`execucao(id)`),
 * sem listar aba por aba.
 */

/** Filtros da aba Atividade. A forma é do TP-2; aqui só precisa ser serializável. */
export type FiltrosDeAtividade = Readonly<Record<string, string | number | boolean | null | undefined>>;

export const chavesDeConsulta = {
    /** Prefixo de tudo que pertence a uma raiz. */
    raiz: (rootId: string) => ['raiz', rootId] as const,
    arvore: (rootId: string) => ['raiz', rootId, 'arvore'] as const,

    /** Prefixo de tudo que pertence a um nó. */
    execucao: (id: string) => ['execucao', id] as const,
    snapshot: (id: string) => ['execucao', id, 'snapshot'] as const,
    resumo: (id: string) => ['execucao', id, 'resumo'] as const,
    aba: (id: string, aba: string) => ['execucao', id, 'aba', aba] as const,
    atividade: (id: string, filtros: FiltrosDeAtividade) => ['execucao', id, 'atividade', filtros] as const,
    prs: (id: string, repo: string, sha: string) => ['execucao', id, 'prs', repo, sha] as const,

    diretivas: () => ['diretivas'] as const,

    /**
     * Busca do seletor `+`. O termo é aparado: " SNA-12" e "SNA-12" são a mesma
     * busca e não devem ocupar duas entradas nem disparar duas chamadas.
     */
    buscaDeRaizes: (termo: string) => ['raizes', 'busca', termo.trim()] as const,
};
