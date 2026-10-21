/**
 * Aba Atividade (P24 a P26): o que o nó fez através do Snaps.
 *
 * Paginada com `useInfiniteQuery` sobre `antes` (o `proximo` da página), na
 * chave `atividade(id, filtros)`. Só metadados; o rótulo diz o limite.
 */
import { useState } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import {
    ROTULO_LIMITE_DA_ATIVIDADE, agruparPorTool, chamadaFalhou, formatarUso, getAtividadeDoNo,
    type AtividadeDoNo,
} from '@/services/atividadeDoNo';
import { chavesDeConsulta as chaves } from '@/services/chavesDeConsulta';
import { EstadoDaConsulta, Secao, Vazio, type PropsDaAba } from './comum';

const hora = (iso: string) => new Date(iso).toLocaleString('pt-BR');
const ms = (valor: number | null) => (valor === null ? '—' : `${Math.round(valor)} ms`);

export default function AbaAtividade(props: PropsDaAba) {
    const { execucao, ativa, somenteLeitura } = props;
    const [soFalhas, setSoFalhas] = useState(false);
    const consulta = useInfiniteQuery({
        queryKey: chaves.atividade(execucao.id, { soFalhas }),
        queryFn: ({ pageParam }) => getAtividadeDoNo(execucao.id, { soFalhas }, pageParam),
        initialPageParam: null as string | null,
        getNextPageParam: (ultima: AtividadeDoNo) => ultima.proximo,
        enabled: ativa,
        ...(somenteLeitura ? { staleTime: Infinity } : {}),
    });
    const paginas = consulta.data?.pages ?? [];
    const primeira = paginas[0];
    const chamadas = paginas.flatMap((p) => p.chamadas);
    const resumo = primeira?.resumo;
    const cli = formatarUso(null);

    return (
        <div className="space-y-8">
            <p className="text-[11px] text-[var(--snaps-text-secondary)]">{ROTULO_LIMITE_DA_ATIVIDADE}</p>
            <EstadoDaConsulta carregando={consulta.isLoading} erro={consulta.error}>
                {primeira && resumo && (
                    <div className="space-y-8">
                        <p className="text-xs text-[var(--snaps-text-primary)]">
                            {resumo.chamadas} chamada(s) · {resumo.falhas} falha(s) · {resumo.recusas} recusa(s) ·{' '}
                            {(resumo.tempo_total_ms / 1000).toFixed(1)} s em tools
                            {resumo.ultima_atividade_em && ` · última em ${hora(resumo.ultima_atividade_em)}`}
                        </p>
                        <p className="text-[11px] text-[var(--snaps-text-secondary)]">{cli.custo}</p>

                        <Secao titulo="Por tool" acao={
                            <label className="flex items-center gap-2 text-[10px] text-[var(--snaps-text-secondary)]">
                                <input type="checkbox" checked={soFalhas} onChange={(e) => setSoFalhas(e.target.checked)} />
                                só falhas
                            </label>
                        }>
                            {agruparPorTool(chamadas).length === 0 ? (
                                <Vazio>{resumo.diagnostico_expirado ? 'Detalhe expirado.' : 'Nenhuma chamada.'}</Vazio>
                            ) : (
                                <ul className="space-y-1">
                                    {agruparPorTool(chamadas).map((g) => (
                                        <li key={g.tool} className="flex items-center gap-3 text-[11px]">
                                            <span className="min-w-0 flex-1 truncate font-mono text-[var(--snaps-text-primary)]">{g.tool}</span>
                                            <span className="tabular-nums text-[var(--snaps-text-secondary)]">{g.chamadas}×</span>
                                            <span className={`tabular-nums ${g.falhas ? 'text-[var(--snaps-error)]' : 'text-[var(--snaps-text-secondary)]'}`}>
                                                {g.falhas} falha(s)
                                            </span>
                                            <span className="tabular-nums text-[var(--snaps-text-secondary)]">{ms(g.tempoTotalMs)}</span>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </Secao>

                        <Secao titulo="Chamadas">
                            <ul className="divide-y divide-white/5 rounded-xl border border-white/10">
                                {chamadas.map((c) => (
                                    <li key={c.id} className="grid grid-cols-[auto_1fr_auto] gap-x-3 px-3 py-1.5 text-[11px]">
                                        <span className="text-[var(--snaps-text-secondary)]">{hora(c.em)}</span>
                                        <span className="min-w-0 truncate font-mono text-[var(--snaps-text-primary)]">
                                            {c.tool}{c.operacao && ` · ${c.operacao}`}
                                            {c.recurso?.tipo && ` · ${c.recurso.tipo} ${c.recurso.id ?? ''}`}
                                        </span>
                                        <span className={chamadaFalhou(c) ? 'text-[var(--snaps-error)]' : 'text-[var(--snaps-text-secondary)]'}>
                                            {c.desfecho ?? '—'}{c.desfecho_cliente && ` / ${c.desfecho_cliente}`}
                                            {(c.codigo_recusa || c.codigo_erro || c.codigo_erro_cliente)
                                                && ` · ${c.codigo_recusa ?? c.codigo_erro ?? c.codigo_erro_cliente}`}
                                            {' · '}{ms(c.duracao_ms)}{c.detalhe_expirado && ' · detalhe expirado'}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                            {consulta.hasNextPage && (
                                <button type="button" onClick={() => consulta.fetchNextPage()}
                                    disabled={consulta.isFetchingNextPage}
                                    className="text-[10px] font-bold text-[var(--snaps-text-secondary)] hover:text-[var(--snaps-text-primary)]">
                                    Carregar mais antigas
                                </button>
                            )}
                        </Secao>

                        <Secao titulo="Recusas do motor">
                            {primeira.recusas_do_motor.length === 0 ? <Vazio>Nenhuma recusa do motor.</Vazio> : (
                                <ul className="space-y-2">
                                    {primeira.recusas_do_motor.map((r) => (
                                        <li key={r.em + r.operacao} className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-[11px]">
                                            <p className="text-[var(--snaps-text-primary)]">{hora(r.em)} · {r.operacao ?? 'comando'}</p>
                                            {r.motivo && <p className="whitespace-pre-wrap text-[var(--snaps-text-secondary)] select-text">{r.motivo}</p>}
                                            {r.condicoes.length > 0 && (
                                                <p className="text-[var(--snaps-accent-amber)]">dispensáveis: {r.condicoes.join(', ')}</p>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </Secao>

                        <Secao titulo="Turnos do Neuron">
                            {primeira.turnos_do_neuron.length === 0 ? (
                                <Vazio>{primeira.turnos_motivo_vazio ?? 'Nenhum turno do Neuron neste nó.'}</Vazio>
                            ) : (
                                <ul className="space-y-1">
                                    {primeira.turnos_do_neuron.map((t) => {
                                        const uso = formatarUso(t.uso);
                                        return (
                                            <li key={t.turn_id} className="flex flex-wrap items-center gap-x-3 text-[11px]">
                                                <span className="text-[var(--snaps-text-primary)]">{t.perfil}</span>
                                                <span className="text-[var(--snaps-text-secondary)]">{t.modelo ?? '?'}</span>
                                                <span className="text-[var(--snaps-text-secondary)]">{t.desfecho ?? '?'} · {t.iteracoes} iteração(ões)</span>
                                                <span className="text-[var(--snaps-text-secondary)]">custo {uso.custo}</span>
                                                {uso.estimativa && <span className="text-[var(--snaps-text-secondary)]">{uso.estimativa}</span>}
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}
                        </Secao>
                    </div>
                )}
            </EstadoDaConsulta>
        </div>
    );
}
