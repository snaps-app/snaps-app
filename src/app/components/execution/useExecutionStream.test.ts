import { describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';

vi.mock('@/lib/supabaseClient', () => ({
    supabase: { auth: { getSession: vi.fn(async () => ({ data: { session: null } })) } },
}));

import { useExecutionStream } from './useExecutionStream';
import { StreamRecusado, type EventoDeExecucao, type OpcoesConexao } from '@/services/executionStream';

const ev = (id: number, nome = 'execution_status_changed'): EventoDeExecucao => ({
    id, nome, dados: { name: nome, seq: id, created_at: null, execution_id: 'e', payload: {}, actor_kind: null },
});

/** Conexão simulada: cada chamada é uma conexão; o teste decide o que ela entrega e quando cai. */
function transporteSimulado() {
    const conexoes: Array<{ opcoes: OpcoesConexao; emitir: (e: EventoDeExecucao) => void; cair: () => void; recusar: (s: number) => void }> = [];
    const conectar = vi.fn((_id: string, opcoes: OpcoesConexao) => new Promise<void>((resolve, reject) => {
        conexoes.push({
            opcoes,
            emitir: (e) => opcoes.onEvento(e),
            cair: () => resolve(),
            recusar: (s) => reject(new StreamRecusado(s)),
        });
        opcoes.signal?.addEventListener('abort', () => resolve());
    }));
    return { conectar, conexoes };
}

describe('useExecutionStream', () => {
    it('queda, reconexão com Last-Event-ID e nenhuma duplicata no estado', async () => {
        const { conectar, conexoes } = transporteSimulado();
        const recebidos: number[] = [];
        const onRevalidar = vi.fn();
        const { result, unmount } = renderHook(() => useExecutionStream('e', {
            conectar, esperaInicialMs: 0,
            onEvento: (e) => recebidos.push(e.id), onRevalidar,
        }));

        await waitFor(() => expect(conexoes).toHaveLength(1));
        expect(conexoes[0].opcoes.lastEventId).toBeNull();
        act(() => { conexoes[0].emitir(ev(3)); conexoes[0].emitir(ev(8)); });
        await act(async () => conexoes[0].cair()); // timeout do Cloud Run

        await waitFor(() => expect(conexoes).toHaveLength(2));
        expect(conexoes[1].opcoes.lastEventId).toBe(8);
        // Um servidor que reenvia o último id não duplica nada na tela.
        act(() => { conexoes[1].emitir(ev(8)); conexoes[1].emitir(ev(12)); });

        expect(recebidos).toEqual([3, 8, 12]);
        expect(result.current.ultimoId).toBe(12);
        expect(onRevalidar).toHaveBeenCalled();
        unmount();
    });

    it('revalida só em evento de status/fase', async () => {
        const { conectar, conexoes } = transporteSimulado();
        const onRevalidar = vi.fn();
        renderHook(() => useExecutionStream('e', { conectar, onRevalidar }));
        await waitFor(() => expect(conexoes).toHaveLength(1));
        act(() => conexoes[0].emitir(ev(1, 'side_effect_intent')));
        expect(onRevalidar).not.toHaveBeenCalled();
        act(() => conexoes[0].emitir(ev(2, 'phase_advanced')));
        expect(onRevalidar).toHaveBeenCalledTimes(1);
    });

    it('recusa 4xx para de tentar', async () => {
        const { conectar, conexoes } = transporteSimulado();
        const { result } = renderHook(() => useExecutionStream('e', { conectar, esperaInicialMs: 0 }));
        await waitFor(() => expect(conexoes).toHaveLength(1));
        await act(async () => conexoes[0].recusar(403));
        await waitFor(() => expect(result.current.estado).toBe('recusado'));
        expect(conectar).toHaveBeenCalledTimes(1);
    });

    it('inativo (execução encerrada) não conecta', () => {
        const { conectar } = transporteSimulado();
        const { result } = renderHook(() => useExecutionStream('e', { conectar, ativo: false }));
        expect(conectar).not.toHaveBeenCalled();
        expect(result.current.estado).toBe('parado');
    });
});
