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
    /** Rótulo, projeto e status da raiz na barra de abas — e se ela existe para mim. */
    rotuloDaRaiz: (rootId: string) => ['raiz', rootId, 'rotulo'] as const,
    /**
     * Os cards da raiz (a união dos `card_ids` da árvore, ou os da sprint), uma
     * vez por raiz: a faixa do cabeçalho e os gates filtram daqui o escopo de
     * cada nó, sem uma chamada por nó (TP-4).
     */
    cardsDaRaiz: (rootId: string, ids: readonly string[]) => ['raiz', rootId, 'cards', [...ids].sort()] as const,

    /** Prefixo de tudo que pertence a um nó. */
    execucao: (id: string) => ['execucao', id] as const,
    snapshot: (id: string) => ['execucao', id, 'snapshot'] as const,
    /** `GET /api/agent-executions/{id}`: o redirecionamento da rota antiga lê o `root_id` daqui. */
    detalhe: (id: string) => ['execucao', id, 'detalhe'] as const,
    resumo: (id: string) => ['execucao', id, 'resumo'] as const,
    aba: (id: string, aba: string) => ['execucao', id, 'aba', aba] as const,
    atividade: (id: string, filtros: FiltrosDeAtividade) => ['execucao', id, 'atividade', filtros] as const,
    prs: (id: string, repo: string, sha: string, prNumber?: number) => prNumber === undefined ? ['execucao', id, 'prs', repo, sha] as const : ['execucao', id, 'prs', repo, prNumber, sha] as const,
    /**
     * Os eventos de um nó TERMINAL, depois do replay único do stream (P13).
     * Voltar ao nó concluído mostra daqui, sem reabrir o stream. Fica no cache
     * em memória, que o logout limpa (item 9), e nunca em disco.
     */
    eventos: (id: string) => ['execucao', id, 'eventos'] as const,

    diretivas: () => ['diretivas'] as const,

    /** Épicos, sprints, colunas e repos do projeto, para editar um card pela aba Cards. Só ao abrir o card. */
    apoioDoCard: (projectId: string) => ['projeto', projectId, 'apoio-do-card'] as const,
    /** Docs e ADRs do projeto, para acrescentar ao contexto pela aba Contexto. Só ao abrir o seletor. */
    catalogoDeContexto: (projectId: string) => ['projeto', projectId, 'catalogo-de-contexto'] as const,

    /**
     * Busca do seletor `+`, paginada no servidor. O termo é aparado: " SNA-12" e
     * "SNA-12" são a mesma busca e não devem ocupar duas entradas nem disparar
     * duas chamadas.
     */
    buscaDeRaizes: (termo: string, pagina = 1) => ['raizes', 'busca', termo.trim(), pagina] as const,
};
