/**
 * Coluna Conversa (P15; TP-4 da Sprint 24.0): a linha do tempo do nó
 * selecionado, com a identidade dele no topo, na cor do TP.
 *
 * Só desenha: os eventos e o estado do stream chegam prontos de
 * `useEventosDoNo`, que fica no container para o frescor continuar com a
 * coluna recolhida. Nunca mistura eventos de outro nó.
 *
 * O composer existe e fica desabilitado até a Sprint 25.0. A largura do
 * próprio painel decide o modo compacto (container query), não a janela.
 */
import { useEffect, useRef } from 'react';
import type { EventoDeExecucao } from '@/services/executionStream';
import type { EstadoStream } from '@/app/components/execution/useExecutionStream';
import { useEstadoDaAba } from '../navegacao/EstadoDaAbaContexto';
import { ChipDaIdentidade, type IdentidadeDoNo } from '../identidadeDoNo';
import { descreverEvento, type TomDoEvento } from './descreverEvento';

export const AVISO_DO_COMPOSER = 'A conversa com o agente chega na Sprint 25.0';

const COR_DO_TOM: Record<TomDoEvento, string> = {
    neutro: 'var(--snaps-accent-slate)',
    sucesso: 'var(--snaps-accent-green)',
    atencao: 'var(--snaps-accent-orange)',
    erro: 'var(--snaps-error)',
    info: 'var(--snaps-accent-blue)',
    roxo: 'var(--snaps-accent-purple)',
};

const ROTULO_DO_STREAM: Partial<Record<EstadoStream | 'encerrado', { texto: string; cor: string }>> = {
    conectando: { texto: 'Conectando…', cor: 'var(--snaps-text-secondary)' },
    aberto: { texto: '● Ao vivo', cor: 'var(--snaps-accent-blue)' },
    reconectando: { texto: 'Reconectando…', cor: 'var(--snaps-accent-yellow)' },
    recusado: { texto: 'Stream recusado', cor: 'var(--snaps-error)' },
    encerrado: { texto: 'Replay · nó concluído', cor: 'var(--snaps-text-secondary)' },
};

function hora(iso: string | null | undefined): string {
    if (!iso) return '';
    const data = new Date(iso);
    return Number.isNaN(data.getTime()) ? '' : data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

export interface ConversaDoNoProps {
    identidade: IdentidadeDoNo;
    eventos: readonly EventoDeExecucao[];
    estado: EstadoStream | 'encerrado';
}

export function ConversaDoNo({ identidade, eventos, estado }: ConversaDoNoProps) {
    const { estado: aba, atualizar } = useEstadoDaAba();
    const rolagem = useRef<HTMLOListElement | null>(null);
    const gravar = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    const stream = ROTULO_DO_STREAM[estado];

    // Volta para onde estava (estado de tela da aba de raiz, TP-3).
    useEffect(() => {
        if (rolagem.current && aba?.scrollDaConversa) rolagem.current.scrollTop = aba.scrollDaConversa;
        return () => clearTimeout(gravar.current);
        // Só ao montar a coluna para este nó.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [identidade.id]);

    const aoRolar = () => {
        clearTimeout(gravar.current);
        gravar.current = setTimeout(() => {
            if (rolagem.current) atualizar({ scrollDaConversa: Math.round(rolagem.current.scrollTop) });
        }, 300);
    };

    return (
        <div className="@container flex h-full min-h-0 flex-col" data-testid="conversa">
            <div className="flex flex-col gap-2 border-b border-white/5 px-4 pb-3">
                <div className="flex min-w-0 items-center gap-2">
                    <ChipDaIdentidade identidade={identidade} />
                    {stream && <span className="text-xs whitespace-nowrap" style={{ color: stream.cor }}>{stream.texto}</span>}
                </div>
                <p className="text-xs text-[var(--snaps-text-secondary)] @max-[340px]:hidden">
                    Eventos deste nó · nunca mistura com outros nós
                </p>
            </div>

            <ol
                ref={rolagem}
                onScroll={aoRolar}
                aria-label="Linha do tempo do nó"
                className="flex min-h-0 grow flex-col gap-3 overflow-y-auto px-4 py-3"
            >
                {eventos.length === 0 && (
                    <li className="text-xs italic text-[var(--snaps-text-secondary)]">
                        {estado === 'conectando' ? 'Carregando os eventos do nó…' : 'Nenhum evento registrado neste nó.'}
                    </li>
                )}
                {eventos.map((evento) => {
                    const descricao = descreverEvento({ name: evento.nome, payload: evento.dados?.payload });
                    return (
                        <li key={evento.id} className="flex gap-2.5" data-evento={evento.nome}>
                            <span aria-hidden="true" className="mt-1.5 h-2 w-2 shrink-0 rounded-full" style={{ background: COR_DO_TOM[descricao.tom] }} />
                            <div className="flex min-w-0 flex-col gap-0.5 select-text">
                                <div className="flex flex-wrap items-baseline gap-2">
                                    <span className="text-xs text-[var(--snaps-text-secondary)]">{hora(evento.dados?.created_at)}</span>
                                    {descricao.conhecido && (
                                        <span className="font-mono text-xs text-[var(--snaps-placeholder)] @max-[340px]:hidden">{evento.nome}</span>
                                    )}
                                </div>
                                <span className={`text-sm leading-snug text-[var(--snaps-text-primary)] ${descricao.conhecido ? '' : 'font-mono'}`}>
                                    {descricao.texto}
                                </span>
                            </div>
                        </li>
                    );
                })}
            </ol>

            <div className="flex gap-2 border-t border-white/10 px-4 pt-3 pb-4">
                <input
                    type="text"
                    disabled
                    aria-label="Mensagem para o agente"
                    placeholder={AVISO_DO_COMPOSER}
                    title={AVISO_DO_COMPOSER}
                    className="h-10 min-w-0 grow rounded-lg border border-white/10 bg-white/[0.03] px-3 text-sm text-[var(--snaps-text-secondary)] placeholder:text-[var(--snaps-text-secondary)]"
                />
                <button type="button" disabled aria-label="Enviar"
                    className="h-10 w-10 shrink-0 rounded-lg border border-white/10 bg-white/[0.03] text-[var(--snaps-placeholder)]">
                    ↑
                </button>
            </div>
        </div>
    );
}
