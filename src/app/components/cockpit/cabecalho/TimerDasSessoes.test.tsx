/**
 * Timer do cabeçalho (decisão do PO no ci_gate do TP-4, 22/10/2026): o tempo da
 * árvore inteira, numa conta só, contado no navegador, sem consultar nada.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { comSessaoAberta, comSessaoFechada, segundosEmSessoes, type ResumoDoNo } from '@/services/resumoDoNo';
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
