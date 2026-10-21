/**
 * Coluna Workflow do Cockpit: o History da raiz — Sprint 24.0, E21 (TP-1).
 *
 * Desenho: canvas "Cockpit v2 por fase", página 2, quadros 1 a 7. Cada nó é uma
 * linha com ✓ (concluído), ● (atual), ○ (fase futura, desabilitada) ou ↻
 * (desfeito). A cadeia fica num recuo só; o fan-out abre ramos, com o título
 * do plano no topo do ramo. Abaixo de 250 px de largura (container query) as
 * linhas perdem o subtítulo e a legenda some.
 *
 * Classifica com a lista de terminais da API (`phase-directives`); sem ela, não
 * desenha, porque classificar com lista vazia mostraria todo nó como atual.
 */
import { useMemo } from 'react';
import type { ArvoreLeve } from '@/services/types';
import { useStatusDaApi } from '@/services/nodeSnapshot';
import { montarHistory, type ClasseDoNo, type ItemDoHistory } from '@/services/workflowSnapshot';

export interface HistoryDaRaizProps {
    /** A árvore leve da raiz (`useArvore`). */
    tree: ArvoreLeve;
    selecionadoId: string | null;
    /** Contador de novidade por nó (eventos ainda não vistos). */
    novidades?: Record<string, number>;
    onSelecionarNo: (id: string) => void;
}

type Marca = ClasseDoNo | 'futura';

const GLIFO: Record<Marca, string> = { concluido: '✓', atual: '●', futura: '○', descartado: '↻' };

const COR: Record<Marca, string> = {
    concluido: 'text-[var(--snaps-accent-green)]',
    atual: 'text-[var(--snaps-accent-blue)]',
    futura: 'text-[var(--snaps-accent-slate)]',
    descartado: 'text-[var(--snaps-accent-orange)]',
};

const ESTADO: Record<Marca, string> = {
    concluido: 'concluído',
    atual: 'atual',
    futura: 'projeção',
    descartado: 'desfeito',
};

function subtitulo(item: Extract<ItemDoHistory, { tipo: 'no' }>): string {
    const partes: string[] = [];
    if (item.tentativa > 1) partes.push(`tentativa ${item.tentativa}`);
    if (item.classe === 'descartado') partes.push('desfeito');
    else if (item.classe === 'atual') partes.push(item.status);
    return partes.join(' · ');
}

export function HistoryDaRaiz({ tree, selecionadoId, novidades = {}, onSelecionarNo }: HistoryDaRaizProps) {
    const status = useStatusDaApi();
    const itens = useMemo(
        () => (status.data ? montarHistory(tree, status.data) : []),
        [tree, status.data],
    );

    if (status.isError) {
        return <p className="p-4 text-sm text-[var(--snaps-error)]">Não foi possível carregar os status do workflow.</p>;
    }
    if (!status.data) {
        return <p className="p-4 text-sm text-[var(--snaps-text-secondary)]">Carregando o History…</p>;
    }

    return (
        <div className="@container flex min-h-0 flex-col">
            <ul aria-label="History da árvore" className="flex flex-col gap-0.5 px-2 py-1">
                {itens.map((item) => {
                    const marca: Marca = item.tipo === 'futura' ? 'futura' : item.classe;
                    const recuo = { paddingLeft: `${12 + item.nivel * 16}px` };

                    if (item.tipo === 'futura') {
                        return (
                            <li key={`futura-${item.aposId}-${item.key}`}>
                                <button
                                    type="button"
                                    disabled
                                    aria-label={`${item.label}, ${ESTADO.futura}`}
                                    style={recuo}
                                    className="flex w-full items-center gap-2.5 rounded-lg border border-transparent py-1.5 pr-3 text-left text-sm text-[var(--snaps-placeholder)]"
                                >
                                    <span aria-hidden className={`w-4 shrink-0 text-center ${COR.futura}`}>{GLIFO.futura}</span>
                                    <span className="truncate">{item.label}</span>
                                </button>
                            </li>
                        );
                    }

                    const selecionado = item.id === selecionadoId;
                    const novos = selecionado ? 0 : novidades[item.id] ?? 0;
                    const sub = subtitulo(item);
                    return (
                        <li key={item.id}>
                            {item.abreRamo && item.planoTitulo && (
                                <div
                                    style={recuo}
                                    className="truncate pt-3 pb-1 text-xs uppercase tracking-wider text-[var(--snaps-text-secondary)]"
                                >
                                    {item.planoTitulo}
                                </div>
                            )}
                            <button
                                type="button"
                                onClick={() => onSelecionarNo(item.id)}
                                aria-current={selecionado ? 'true' : undefined}
                                aria-label={`${item.label}, ${ESTADO[marca]}${sub ? `, ${sub}` : ''}`}
                                style={recuo}
                                className={`flex w-full items-center gap-2.5 rounded-lg border py-1.5 pr-3 text-left text-sm text-[var(--snaps-text-primary)] ${
                                    selecionado
                                        ? 'border-[var(--snaps-text-secondary)]/30 bg-[var(--snaps-surface)]'
                                        : 'border-transparent hover:bg-[var(--snaps-surface)]'
                                }`}
                            >
                                <span aria-hidden className={`w-4 shrink-0 text-center ${COR[marca]}`}>{GLIFO[marca]}</span>
                                <span className="flex min-w-0 grow flex-col gap-0.5">
                                    <span className="truncate">{item.label}</span>
                                    {sub && (
                                        <span
                                            data-testid="subtitulo-do-no"
                                            className="truncate text-xs text-[var(--snaps-text-secondary)] @max-[250px]:hidden"
                                        >
                                            {sub}
                                        </span>
                                    )}
                                </span>
                                {novos > 0 && (
                                    <span className="shrink-0 text-xs whitespace-nowrap text-[var(--snaps-accent-blue)]">
                                        {novos === 1 ? '1 novo' : `${novos} novos`}
                                    </span>
                                )}
                            </button>
                        </li>
                    );
                })}
            </ul>
            <div
                data-testid="legenda-do-history"
                className="flex flex-wrap gap-x-3.5 gap-y-1.5 border-t border-[var(--snaps-surface)] px-4 py-2.5 text-xs text-[var(--snaps-text-secondary)] @max-[250px]:hidden"
            >
                {(['concluido', 'atual', 'futura', 'descartado'] as const).map((marca) => (
                    <span key={marca}>
                        <span className={COR[marca]}>{GLIFO[marca]}</span> {ESTADO[marca]}
                    </span>
                ))}
            </div>
        </div>
    );
}
