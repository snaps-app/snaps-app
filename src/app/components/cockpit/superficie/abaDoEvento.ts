/**
 * Evento do stream → aba que ganha novidade (ponto azul). Função única (P6):
 * o ponto da Superfície, o contador do trilho e `invalidarPorEvento` leem daqui.
 *
 * Evento desconhecido devolve `null` e não gera ponto. A novidade some quando
 * a aba abre.
 *
 * `side_effect_receipt` só vai para PRs e CI quando o efeito é do GitHub e mexe
 * na PR (commit, abrir ou fundir a PR): é o evento de commit novo, e a lista de
 * arquivos da aba depende dele. Recibo de outro provedor não gera ponto.
 *
 * `artifact_submitted` não diz o tipo do artefato no payload (só os hashes);
 * o que o agente submete no nó é o walkthrough, então ele vai para
 * Walkthroughs.
 */
import type { ChaveDeAba } from './catalogo';
import type { Novidades } from './ordenarAbas';

/** O mínimo de um evento de `execution_events`, como o SSE entrega em `dados`. */
export interface EventoDoNo {
    name: string;
    execution_id?: string | null;
    payload?: Record<string, unknown>;
}

const POR_NOME: Readonly<Record<string, ChaveDeAba>> = {
    artifact_submitted: 'walkthroughs',
    gate_evaluated: 'no',
    command_failed: 'atividade',
    pr_heads_captured: 'prs',
    execution_created: 'no',
    phase_advanced: 'no',
    phase_rolled_back: 'no',
    execution_status_changed: 'no',
    // E7: pergunta e resposta entre agentes, e o pedido do Neuron.
    agent_question: 'no',
    agent_answer: 'no',
};

const POR_PREFIXO: ReadonlyArray<readonly [string, ChaveDeAba]> = [
    ['plan_', 'plano'],
    ['test_plan_', 'testplans'],
    ['override_', 'no'],
    ['request_', 'no'],
];

const OPERACOES_DA_PR = new Set(['commit', 'create_pr', 'merge_pr']);

export function abaDoEvento(evento: EventoDoNo | null | undefined): ChaveDeAba | null {
    const nome = evento?.name;
    if (!nome) return null;
    if (nome === 'side_effect_receipt') {
        const { provider, operation } = evento?.payload ?? {};
        return provider === 'github' && typeof operation === 'string' && OPERACOES_DA_PR.has(operation) ? 'prs' : null;
    }
    if (nome in POR_NOME) return POR_NOME[nome];
    for (const [prefixo, aba] of POR_PREFIXO) {
        if (nome.startsWith(prefixo)) return aba;
    }
    return null;
}

/** Soma uma novidade à aba do evento, exceto se ela é a aberta. Não muta. */
export function registrarNovidade(
    novidades: Novidades,
    evento: EventoDoNo,
    abaAberta: ChaveDeAba | null,
): Novidades {
    const aba = abaDoEvento(evento);
    if (!aba || aba === abaAberta) return novidades;
    return { ...novidades, [aba]: (novidades[aba] ?? 0) + 1 };
}

/** Abrir a aba apaga o ponto dela. Não muta. */
export function abrirAba(novidades: Novidades, aba: ChaveDeAba): Novidades {
    if (!novidades[aba]) return novidades;
    const { [aba]: _lida, ...resto } = novidades;
    return resto;
}

/** Total de novidades, para o contador do trilho recolhido (TP-4). */
export function totalDeNovidades(novidades: Novidades): number {
    return Object.values(novidades).reduce<number>((soma, n) => soma + (n ?? 0), 0);
}
