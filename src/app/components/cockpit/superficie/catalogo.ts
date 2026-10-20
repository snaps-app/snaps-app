/**
 * Catálogo das 15 abas da Superfície (P6) e a relevância base por fase (§3.2).
 *
 * As abas estão SEMPRE disponíveis, em qualquer nó: o que muda por fase é a
 * ordem, não a existência. A chave de cada aba é a mesma que `GET /resumo`
 * conta em `abas`; a API é quem diz se a aba está vazia e por quê.
 */

export type ChaveDeAba =
    | 'plano' | 'cards' | 'tasks' | 'cenarios' | 'testplans' | 'revisoes' | 'prs'
    | 'walkthroughs' | 'contexto' | 'ambiente' | 'atividade' | 'prompt' | 'retro' | 'no'
    | 'scratch';

export interface DefinicaoDeAba {
    chave: ChaveDeAba;
    rotulo: string;
    /** Abas que carregam com `lazy()`: o conteúdo é pesado e raramente é o primeiro. */
    pesada?: boolean;
    /** Conteúdo que continua editável em nó concluído (revalidado ao abrir). */
    editavelEmNoConcluido?: boolean;
}

export const CATALOGO_DE_ABAS: readonly DefinicaoDeAba[] = [
    { chave: 'plano', rotulo: 'Plano' },
    { chave: 'cards', rotulo: 'Cards' },
    { chave: 'tasks', rotulo: 'Tasks' },
    { chave: 'cenarios', rotulo: 'Cenários' },
    { chave: 'testplans', rotulo: 'Test plans' },
    { chave: 'revisoes', rotulo: 'Revisões' },
    { chave: 'prs', rotulo: 'PRs e CI', pesada: true },
    { chave: 'walkthroughs', rotulo: 'Walkthroughs', editavelEmNoConcluido: true },
    { chave: 'contexto', rotulo: 'Contexto' },
    { chave: 'ambiente', rotulo: 'Ambiente', pesada: true },
    { chave: 'atividade', rotulo: 'Atividade', pesada: true },
    { chave: 'prompt', rotulo: 'Prompt' },
    { chave: 'retro', rotulo: 'Retro' },
    { chave: 'no', rotulo: 'Nó' },
    { chave: 'scratch', rotulo: 'Scratch', editavelEmNoConcluido: true },
] as const;

export const CHAVES_DE_ABA: readonly ChaveDeAba[] = CATALOGO_DE_ABAS.map((a) => a.chave);

export function definicaoDaAba(chave: ChaveDeAba): DefinicaoDeAba {
    const achada = CATALOGO_DE_ABAS.find((a) => a.chave === chave);
    if (!achada) throw new Error(`aba fora do catálogo: ${chave}`);
    return achada;
}

export function eChaveDeAba(valor: unknown): valor is ChaveDeAba {
    return typeof valor === 'string' && (CHAVES_DE_ABA as readonly string[]).includes(valor);
}

/** Ordem base por fase (regra 4 do P6), tabela da §3.2 do plano estratégico. */
export const RELEVANCIA_POR_FASE: Readonly<Record<string, readonly ChaveDeAba[]>> = {
    macro_planning: ['plano', 'contexto', 'prompt', 'walkthroughs', 'cards', 'no'],
    micro_planning: ['plano', 'cenarios', 'tasks', 'cards', 'walkthroughs', 'prompt', 'no'],
    plan_review: ['revisoes', 'plano', 'cenarios', 'walkthroughs', 'prompt', 'no'],
    execution: ['tasks', 'prs', 'ambiente', 'cards', 'cenarios', 'prompt', 'walkthroughs', 'no'],
    ci_gate: ['prs', 'revisoes', 'ambiente', 'tasks', 'walkthroughs', 'prompt', 'no'],
    assurance: ['testplans', 'cenarios', 'prs', 'cards', 'ambiente', 'walkthroughs', 'no'],
    retro: ['retro', 'walkthroughs', 'cards', 'testplans', 'no'],
};

/** Fase fora da tabela. */
export const RELEVANCIA_PADRAO: readonly ChaveDeAba[] = ['walkthroughs', 'prompt', 'no'];

export function relevanciaDaFase(faseKey: string | null | undefined): readonly ChaveDeAba[] {
    return (faseKey && RELEVANCIA_POR_FASE[faseKey]) || RELEVANCIA_PADRAO;
}

/** Aba em foco ao abrir o nó quando não há pendência: a primeira da relevância. */
export function abaEmFocoDaFase(faseKey: string | null | undefined): ChaveDeAba {
    return relevanciaDaFase(faseKey)[0];
}
