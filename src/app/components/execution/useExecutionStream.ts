import { useEffect, useRef, useState } from 'react';
import {
    conectarStreamDeExecucao,
    StreamRecusado,
    type EventoDeExecucao,
    type OpcoesConexao,
} from '@/services/executionStream';

/**
 * Eventos que mudam o que a tela mostra da execução: status, fase, campos.
 * Chegou um deles, a tela refaz UMA leitura da execução — revalidação por
 * evento, sem polling e sem biblioteca de cache.
 */
export const EVENTOS_QUE_REVALIDAM = new Set([
    'execution_status_changed',
    'phase_advanced',
    'phase_rolled_back',
    'execution_updated',
    'execution_tombstoned',
]);

export type EstadoStream = 'conectando' | 'aberto' | 'reconectando' | 'recusado' | 'parado';

interface Opcoes {
    /** Desligue quando a execução já estiver encerrada (`estaEncerrada`, SNA-SUP-73). */
    ativo?: boolean;
    onEvento?: (evento: EventoDeExecucao) => void;
    onRevalidar?: () => void;
    /** Injeção para testes. */
    conectar?: typeof conectarStreamDeExecucao;
    esperaInicialMs?: number;
    fetchImpl?: OpcoesConexao['fetchImpl'];
}

/**
 * Stream de eventos de uma execução, com reconexão por `Last-Event-ID`.
 *
 * O servidor encerra a conexão antes do timeout do Cloud Run; cair é o
 * caminho normal, e a reconexão retoma do último `id` recebido. Um `id` já
 * visto é descartado — nenhuma duplicata chega a quem consome.
 */
export function useExecutionStream(executionId: string | undefined, opcoes: Opcoes = {}) {
    const { ativo = true, esperaInicialMs = 2000 } = opcoes;
    const [estado, setEstado] = useState<EstadoStream>('parado');
    const [ultimoId, setUltimoId] = useState<number | null>(null);

    // Callbacks em ref: trocar a função a cada render não pode derrubar a conexão.
    const callbacks = useRef(opcoes);
    callbacks.current = opcoes;
    const ultimoIdRef = useRef<number | null>(null);

    useEffect(() => {
        ultimoIdRef.current = null;
        setUltimoId(null);
    }, [executionId]);

    useEffect(() => {
        if (!executionId || !ativo) {
            setEstado('parado');
            return;
        }
        const controle = new AbortController();
        let espera = esperaInicialMs;
        const conectar = callbacks.current.conectar ?? conectarStreamDeExecucao;

        const receber = (evento: EventoDeExecucao) => {
            if (ultimoIdRef.current != null && evento.id <= ultimoIdRef.current) return;
            ultimoIdRef.current = evento.id;
            setUltimoId(evento.id);
            callbacks.current.onEvento?.(evento);
            if (EVENTOS_QUE_REVALIDAM.has(evento.nome)) callbacks.current.onRevalidar?.();
        };

        const dormir = (ms: number) => new Promise<void>((resolve) => {
            const t = setTimeout(resolve, ms);
            controle.signal.addEventListener('abort', () => { clearTimeout(t); resolve(); }, { once: true });
        });

        (async () => {
            let primeira = true;
            while (!controle.signal.aborted) {
                setEstado(primeira ? 'conectando' : 'reconectando');
                primeira = false;
                try {
                    await conectar(executionId, {
                        lastEventId: ultimoIdRef.current,
                        signal: controle.signal,
                        onEvento: (e) => { setEstado('aberto'); receber(e); },
                        onRetry: (ms) => { espera = ms; setEstado('aberto'); },
                        fetchImpl: callbacks.current.fetchImpl,
                    });
                } catch (erro) {
                    if (controle.signal.aborted) return;
                    if (erro instanceof StreamRecusado && erro.status >= 400 && erro.status < 500) {
                        setEstado('recusado');
                        return;
                    }
                }
                if (controle.signal.aborted) return;
                // Revalida ao voltar: o que mudou fora do catálogo de eventos também aparece.
                callbacks.current.onRevalidar?.();
                await dormir(espera);
            }
        })();

        return () => controle.abort();
    }, [executionId, ativo, esperaInicialMs]);

    return { estado, ultimoId };
}
