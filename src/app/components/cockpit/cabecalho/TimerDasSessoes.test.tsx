/** Timer só de leitura do viewer (TP-4, rodada do PO): conta no navegador, sem consultar nada. */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { TimerDasSessoes, segundosEmSessoes } from './TimerDasSessoes';

const T0 = Date.parse('2026-10-21T12:00:00Z');

beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(T0);
});
afterEach(() => vi.useRealTimers());

describe('TimerDasSessoes', () => {
    it('soma as encerradas e conta as abertas a partir do início delas', () => {
        expect(segundosEmSessoes({ encerradas_segundos: 90, ativas_desde: ['2026-10-21T11:59:00Z'] }, T0)).toBe(150);
        expect(segundosEmSessoes({ encerradas_segundos: 0, ativas_desde: ['não é data'] }, T0)).toBe(0);
    });

    it('com sessão aberta o relógio anda sozinho; sem dado, mostra "—"; nunca tem controle', () => {
        const { rerender } = render(<TimerDasSessoes sessoes={undefined} />);
        expect(screen.getByTestId('timer-da-execucao')).toHaveTextContent('—');

        rerender(<TimerDasSessoes sessoes={{ encerradas_segundos: 3_600, ativas_desde: ['2026-10-21T11:59:00Z'] }} />);
        expect(screen.getByTestId('timer-da-execucao')).toHaveTextContent('01:01:00');
        act(() => { vi.advanceTimersByTime(5_000); });
        expect(screen.getByTestId('timer-da-execucao')).toHaveTextContent('01:01:05');
        expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });
});
