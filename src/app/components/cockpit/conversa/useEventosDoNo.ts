/**
 * Os eventos do nó selecionado, pelo stream SSE (ADR-0047), e o frescor da
 * tela que eles trazem (ADR-0071, item 5). A Conversa é por onde o frescor
 * chega: cada evento AO VIVO passa por `invalidarPorEvento` (TP-2), com o
 * `rootId` da aba, porque o evento não diz a qual raiz pertence.
 *
 * - Um stream por vez (P13): só o nó selecionado da aba de raiz visível. O
 *   container que chama isto só existe para a aba ativa.
 * - Nó terminal: replay único, sem reconexão. Os eventos ficam no cache
 *   (`chaves.eventos`), e voltar ao nó concluído não reabre o stream.
 * - O replay do nó atual não invalida nada: ele conta o que já aconteceu, e o
 *   que a tela buscou ao abrir o nó já inclui. Sem isso, abrir um nó com 200
 *   eventos dispararia 200 invalidações (e as buscas delas). O replay é a
 *   rajada inicial: termina quando o stream fica 750 ms sem evento novo. Um
 *   evento ao vivo nessa janela é raro, e o próximo evento corrige.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { chavesDeConsulta as chaves } from '@/services/chavesDeConsulta';
import type { EventoDeExecucao } from '@/services/executionStream';
import { useExecutionStream } from '@/app/components/execution/useExecutionStream';
import { invalidarPorEvento } from '../superficie/invalidarPorEvento';
import type { EventoDoNo } from '../superficie/abaDoEvento';

export const JANELA_DO_REPLAY_MS = 750;

/** O evento do stream no formato de `abaDoEvento`/`invalidarPorEvento`. */
export function comoEventoDoNo(evento: EventoDeExecucao, noId: string): EventoDoNo {
    return { seq: evento.id, name: evento.nome, execution_id: evento.dados?.execution_id ?? noId, payload: evento.dados?.payload ?? {} };
}

export interface OpcoesDosEventos {
    noId: string | null;
    rootId: string;
    terminal: boolean;
    /** Desliga o stream sem desmontar (o container decide). */
    ativo?: boolean;
    /** Um evento novo, depois do replay: luz, novidade e contadores. */
    onEventoAoVivo?: (evento: EventoDoNo, bruto: EventoDeExecucao) => void;
}

export function useEventosDoNo({ noId, rootId, terminal, ativo = true, onEventoAoVivo }: OpcoesDosEventos) {
    const cliente = useQueryClient();
    const chave = chaves.eventos(noId ?? '');
    // Só observa o cache: quem grava é o fim do replay (`setQueryData`). Nunca busca.
    const doCache = useQuery<EventoDeExecucao[]>({
        queryKey: chave,
        queryFn: () => Promise.resolve([]),
        enabled: false,
        staleTime: Infinity,
        gcTime: Infinity,
    });
    const replayGuardado = terminal ? doCache.data : undefined;

    const [eventos, setEventos] = useState<EventoDeExecucao[]>(() => replayGuardado ?? []);
    const lista = useRef<EventoDeExecucao[]>(eventos);
    const replay = useRef<{ ativo: boolean; timer?: ReturnType<typeof setTimeout> }>({ ativo: true });
    const aoVivo = useRef(onEventoAoVivo);
    aoVivo.current = onEventoAoVivo;

    useEffect(() => {
        const inicial = (terminal && cliente.getQueryData<EventoDeExecucao[]>(chaves.eventos(noId ?? ''))) || [];
        lista.current = inicial;
        setEventos(inicial);
        replay.current.ativo = true;
        return () => clearTimeout(replay.current.timer);
        // O nó trocou: a lista é outra. `terminal` só decide de onde ela começa.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [noId]);

    const fimDoReplayEm = useCallback((ms: number) => {
        clearTimeout(replay.current.timer);
        replay.current.timer = setTimeout(() => { replay.current.ativo = false; }, ms);
    }, []);

    const receber = useCallback((bruto: EventoDeExecucao) => {
        if (!noId || lista.current.some((e) => e.id === bruto.id)) return;
        lista.current = [...lista.current, bruto];
        setEventos(lista.current);
        if (terminal) return; // nó concluído não muda: nada a invalidar
        if (replay.current.ativo) {
            fimDoReplayEm(JANELA_DO_REPLAY_MS);
            return;
        }
        const evento = comoEventoDoNo(bruto, noId);
        void invalidarPorEvento(cliente, evento, { executionId: noId, rootId });
        aoVivo.current?.(evento, bruto);
    }, [noId, terminal, rootId, cliente, fimDoReplayEm]);

    const { estado } = useExecutionStream(noId ?? undefined, {
        ativo: ativo && !!noId && !replayGuardado,
        reconectar: !terminal,
        onEvento: receber,
        onEncerrado: () => {
            if (terminal && noId) cliente.setQueryData(chaves.eventos(noId), lista.current);
        },
    });

    // Stream aberto sem nenhum evento: o replay (vazio) também termina.
    useEffect(() => {
        if (estado === 'aberto' && replay.current.ativo) fimDoReplayEm(JANELA_DO_REPLAY_MS);
    }, [estado, fimDoReplayEm]);

    return { eventos, estado: replayGuardado ? ('encerrado' as const) : estado };
}

/** O horário do evento mais recente, para o indicador de última chamada. */
export function ultimoEventoEm(eventos: readonly EventoDeExecucao[]): string | null {
    let maior: string | null = null;
    for (const e of eventos) {
        const quando = e.dados?.created_at;
        if (quando && (!maior || Date.parse(quando) > Date.parse(maior))) maior = quando;
    }
    return maior;
}
