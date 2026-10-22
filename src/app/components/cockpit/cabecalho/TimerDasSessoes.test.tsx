/**
 * Timer do cabeçalho (decisão do PO no ci_gate do TP-4, 22/10/2026): o tempo da
 * árvore inteira, numa conta só, contado no navegador, sem consultar nada.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { QueryClient } from '@tanstack/react-query';
import { chavesDeConsulta } from '@/services/chavesDeConsulta';
import {
    aplicarSessaoAberta, aplicarSessaoFechada, comSessaoAberta, comSessaoFechada, comSessoesProprias, eventoDeSessaoJaNoTotal,
    segundosEmSessoes, type ResumoDoNo,
} from '@/services/resumoDoNo';
import { TimerDasSessoes } from './TimerDasSessoes';

const T0 = Date.parse('2026-10-21T12:00:00Z');

beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(T0);
});
afterEach(() => vi.useRealTimers());

describe('segundosEmSessoes: a única conta', () => {
    it('soma as encerradas e conta as abertas a partir do início delas', () => {
        expect(segundosEmSessoes({ encerradas_segundos: 90, ativas_desde: ['2026-10-21T11:59:00Z'] }, T0)).toBe(150);
        expect(segundosEmSessoes({ encerradas_segundos: 0, ativas_desde: ['não é data'] }, T0)).toBe(0);
    });

    it('a sessão de quem olha entra e sai do total em cache, sem contar duas vezes', () => {
        const resumo = { sessoes: { encerradas_segundos: 60, ativas_desde: [] } } as unknown as ResumoDoNo;
        const aberta = comSessaoAberta(resumo, '2026-10-21T11:59:00Z')!;
        expect(aberta.sessoes!.ativas_desde).toEqual(['2026-10-21T11:59:00Z']);
        expect(comSessaoAberta(aberta, '2026-10-21T11:59:00.000000+00:00')).toBe(aberta);
        const fechada = comSessaoFechada(aberta, '2026-10-21T11:59:00+00:00', '2026-10-21T12:00:00Z')!;
        expect(fechada.sessoes).toEqual({ encerradas_segundos: 120, ativas_desde: [] });
        expect(comSessaoFechada(fechada, '2026-10-21T11:59:00Z', '2026-10-21T12:00:00Z')).toBe(fechada);
    });
});

describe('a sessão deste usuário no total em cache', () => {
    const resumo = (encerradas: number, abertas: string[]) =>
        ({ sessoes: { encerradas_segundos: encerradas, ativas_desde: abertas } }) as unknown as ResumoDoNo;
    const INICIO = '2026-10-21T11:59:00Z';
    const FIM = '2026-10-21T12:00:00Z';

    it('ao fechar, sai do resumo de todo nó em cache, e só onde estava aberta (trocar de nó não conta em dobro)', () => {
        const cliente = new QueryClient();
        const deOutraArvore = resumo(5, ['2026-10-21T10:00:00Z']);
        const naoEhResumo = resumo(60, [INICIO]);
        cliente.setQueryData(chavesDeConsulta.resumo('a'), resumo(60, [INICIO]));
        cliente.setQueryData(chavesDeConsulta.resumo('b'), resumo(60, [INICIO]));
        cliente.setQueryData(chavesDeConsulta.resumo('c'), deOutraArvore);
        cliente.setQueryData(chavesDeConsulta.snapshot('a'), naoEhResumo);

        aplicarSessaoFechada(cliente, { id: 's-fecha', inicio: INICIO, fim: FIM });

        for (const id of ['a', 'b']) {
            expect(cliente.getQueryData<ResumoDoNo>(chavesDeConsulta.resumo(id))!.sessoes).toEqual({ encerradas_segundos: 120, ativas_desde: [] });
        }
        expect(cliente.getQueryData(chavesDeConsulta.resumo('c'))).toBe(deOutraArvore);
        expect(cliente.getQueryData(chavesDeConsulta.snapshot('a'))).toBe(naoEhResumo);
    });

    it('a resposta do /resumo que saiu do servidor antes do start ou do end já chega corrigida', () => {
        // O registro é do módulo: cada teste usa inícios próprios, como sessões reais.
        const cliente = new QueryClient();
        const abre = '2026-10-21T11:57:00Z';
        const fechou = '2026-10-21T11:56:00Z';
        aplicarSessaoAberta(cliente, 'no-aberto', { id: 's-abre', inicio: abre });
        aplicarSessaoFechada(cliente, { id: 's-fechou', inicio: fechou, fim: FIM });

        // Sem a aberta (start ainda não gravado) e com a fechada ainda aberta (end ainda não gravado).
        const doServidor = resumo(0, [fechou]);
        expect(comSessoesProprias(doServidor, 'no-aberto').sessoes).toEqual({ encerradas_segundos: 240, ativas_desde: [abre] });
        // A sessão aberta é do nó onde abriu; a fechada sai de qualquer nó.
        expect(comSessoesProprias(doServidor, 'outro-no').sessoes).toEqual({ encerradas_segundos: 240, ativas_desde: [] });
        // O servidor já tem as duas: nada muda.
        const emDia = resumo(240, [abre]);
        expect(comSessoesProprias(emDia, 'no-aberto')).toBe(emDia);
    });

    it('o evento da sessão deste navegador é dispensado; o de outra pessoa, não', () => {
        const cliente = new QueryClient();
        const ev = (name: string, id: string) => ({ name, payload: { session_id: id } });
        aplicarSessaoAberta(cliente, 'n', { id: 's-minha', inicio: INICIO });

        expect(eventoDeSessaoJaNoTotal(ev('session_started', 's-minha'))).toBe(true);
        expect(eventoDeSessaoJaNoTotal(ev('session_closed', 's-minha'))).toBe(false);
        expect(eventoDeSessaoJaNoTotal(ev('session_started', 's-de-outra-pessoa'))).toBe(false);
        expect(eventoDeSessaoJaNoTotal({ name: 'session_started' })).toBe(false);

        aplicarSessaoFechada(cliente, { id: 's-minha', inicio: INICIO, fim: FIM });
        expect(eventoDeSessaoJaNoTotal(ev('session_closed', 's-minha'))).toBe(true);
    });
});

describe('TimerDasSessoes', () => {
    it('com sessão aberta o relógio anda sozinho; sem dado, mostra "—"; os controles vêm de fora', () => {
        const { rerender } = render(<TimerDasSessoes sessoes={undefined} />);
        expect(screen.getByTestId('timer-da-execucao')).toHaveTextContent('—');
        expect(screen.queryByRole('button')).not.toBeInTheDocument();

        rerender(
            <TimerDasSessoes sessoes={{ encerradas_segundos: 3_600, ativas_desde: ['2026-10-21T11:59:00Z'] }}>
                <button type="button">Pausar sessão</button>
            </TimerDasSessoes>,
        );
        expect(screen.getByTestId('timer-da-execucao')).toHaveTextContent('01:01:00');
        act(() => { vi.advanceTimersByTime(5_000); });
        expect(screen.getByTestId('timer-da-execucao')).toHaveTextContent('01:01:05');
        expect(screen.getByRole('button', { name: 'Pausar sessão' })).toBeInTheDocument();
    });
});
