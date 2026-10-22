/** Indicador "última chamada ao Snaps" (P25; ADR-0071, item 5). */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, screen } from '@testing-library/react';
import { focusManager } from '@tanstack/react-query';
import { renderComConsulta } from '@/test/comConsulta';
import type { ResumoDoNo } from '@/services/resumoDoNo';

vi.mock('@/services/resumoDoNo', async (original) => ({
    ...(await original<typeof import('@/services/resumoDoNo')>()),
    getResumoDoNo: vi.fn(),
}));

import { getResumoDoNo } from '@/services/resumoDoNo';
import { UltimaChamadaAoSnaps } from './UltimaChamadaAoSnaps';
import { formatarTempoEmTools, intervaloDeRevalidacao, resumoDeTools, textoDaUltimaChamada } from './ultimaChamada';

const T0 = Date.parse('2026-10-21T12:00:00Z');
const MIN = 60_000;

function resumo(ultima: string | null, extra: Partial<ResumoDoNo['atividade']> = {}): ResumoDoNo {
    return {
        pendencias: [],
        abas: {},
        atividade: {
            chamadas: 81, falhas: 0, recusas: 0, tempo_total_ms: 876_000,
            ultima_atividade_em: ultima, diagnostico_expirado: false, ...extra,
        },
    };
}

const passar = (ms: number) => act(() => vi.advanceTimersByTimeAsync(ms));
const chamadas = () => vi.mocked(getResumoDoNo).mock.calls.length;
const indicador = () => screen.getByTestId('ultima-chamada');

beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(T0);
    vi.mocked(getResumoDoNo).mockReset();
    vi.mocked(getResumoDoNo).mockResolvedValue(resumo(new Date(T0 - 3 * MIN).toISOString()));
});
afterEach(() => {
    focusManager.setFocused(undefined);
    vi.useRealTimers();
});

describe('UltimaChamadaAoSnaps', () => {
    it('conta o "há X min" no navegador: 3 min ao abrir, sem nova chamada enquanto o relógio anda', async () => {
        renderComConsulta(<UltimaChamadaAoSnaps execucaoId="no-1" emAndamento terminal={false} />);
        await passar(0);
        expect(indicador()).toHaveTextContent('última chamada ao Snaps há 3 min');
        await passar(8 * MIN);
        expect(indicador()).toHaveTextContent('última chamada ao Snaps há 11 min');
        expect(chamadas()).toBe(1);
    });

    it('âmbar aos 15 min, sem luz; uma revalidação ao cruzar e no máximo uma a cada 5 min depois', async () => {
        renderComConsulta(<UltimaChamadaAoSnaps execucaoId="no-1" emAndamento terminal={false} />);
        await passar(0);
        expect(chamadas()).toBe(1);

        await passar(12 * MIN + 2_000); // cruza os 15 min desde a última chamada
        expect(chamadas()).toBe(2);
        expect(indicador()).toHaveTextContent('sem atividade no Snaps há 15 min');
        expect(indicador()).toHaveAttribute('data-ambar', 'true');
        expect(indicador()).not.toHaveTextContent('parado');
        expect(screen.queryByLabelText('ação sua pendente')).not.toBeInTheDocument();

        await passar(4 * MIN);
        expect(chamadas()).toBe(2);
        await passar(MIN);
        expect(chamadas()).toBe(3);
        await passar(5 * MIN);
        expect(chamadas()).toBe(4);
    });

    it('uma chamada nova (vista na revalidação) volta o indicador ao normal e reprograma o limiar', async () => {
        renderComConsulta(<UltimaChamadaAoSnaps execucaoId="no-1" emAndamento terminal={false} />);
        await passar(0);
        vi.mocked(getResumoDoNo).mockResolvedValue(resumo(new Date(T0 + 11 * MIN).toISOString()));
        await passar(12 * MIN + 2_000);
        expect(chamadas()).toBe(2);
        expect(indicador()).toHaveTextContent('última chamada ao Snaps há 1 min');
        expect(indicador()).not.toHaveAttribute('data-ambar');
        await passar(10 * MIN);
        expect(chamadas()).toBe(2);
    });

    it('o evento SSE do nó atualiza o horário sem chamada', async () => {
        const { rerender } = renderComConsulta(<UltimaChamadaAoSnaps execucaoId="no-1" emAndamento terminal={false} />);
        await passar(0);
        await passar(10 * MIN);
        rerender(
            <UltimaChamadaAoSnaps execucaoId="no-1" emAndamento terminal={false} ultimoEventoEm={new Date(T0 + 9 * MIN).toISOString()} />,
        );
        await passar(MIN);
        expect(indicador()).toHaveTextContent('última chamada ao Snaps há 2 min');
        expect(chamadas()).toBe(1);
    });

    it('nenhuma revalidação com a aba do navegador oculta', async () => {
        focusManager.setFocused(false);
        renderComConsulta(<UltimaChamadaAoSnaps execucaoId="no-1" emAndamento terminal={false} />);
        await passar(0);
        await passar(30 * MIN);
        expect(chamadas()).toBe(1);
    });

    it('nó concluído: o resumo de tools, sem relógio e sem revalidação', async () => {
        renderComConsulta(<UltimaChamadaAoSnaps execucaoId="no-1" emAndamento={false} terminal />);
        await passar(0);
        expect(indicador()).toHaveTextContent('81 chamadas · 0 falhas · 14 min 36 s em tools');
        await passar(60 * MIN);
        expect(chamadas()).toBe(1);
    });

    it('nó atual fora de in_progress: sem âmbar e sem revalidação', async () => {
        renderComConsulta(<UltimaChamadaAoSnaps execucaoId="no-1" emAndamento={false} terminal={false} />);
        await passar(0);
        await passar(30 * MIN);
        expect(indicador()).toHaveTextContent('última chamada ao Snaps há 33 min');
        expect(indicador()).not.toHaveAttribute('data-ambar');
        expect(chamadas()).toBe(1);
    });
});

describe('regras puras', () => {
    it('textos', () => {
        expect(textoDaUltimaChamada(null, T0, true)).toEqual({ texto: 'nenhuma chamada ao Snaps neste nó', ambar: false });
        expect(textoDaUltimaChamada(T0 - 20_000, T0, true).texto).toBe('última chamada ao Snaps há menos de 1 min');
        expect(textoDaUltimaChamada(T0 - 75 * MIN, T0, true).texto).toBe('sem atividade no Snaps há 1 h 15 min');
    });

    it('intervalo: até o limiar, depois 5 min; nunca fora de in_progress, oculto ou sem chamada', () => {
        expect(intervaloDeRevalidacao({ emAndamento: true, visivel: true, ultima: T0 - 3 * MIN, agora: T0 })).toBe(12 * MIN + 1_000);
        expect(intervaloDeRevalidacao({ emAndamento: true, visivel: true, ultima: T0 - 30 * MIN, agora: T0 })).toBe(5 * MIN);
        expect(intervaloDeRevalidacao({ emAndamento: false, visivel: true, ultima: T0, agora: T0 })).toBe(false);
        expect(intervaloDeRevalidacao({ emAndamento: true, visivel: false, ultima: T0, agora: T0 })).toBe(false);
        expect(intervaloDeRevalidacao({ emAndamento: true, visivel: true, ultima: null, agora: T0 })).toBe(false);
    });

    it('tempo em tools e singular', () => {
        expect(formatarTempoEmTools(876_000)).toBe('14 min 36 s');
        expect(formatarTempoEmTools(36_000)).toBe('36 s');
        expect(formatarTempoEmTools(3_720_000)).toBe('1 h 02 min');
        expect(resumoDeTools({ chamadas: 1, falhas: 1, tempo_total_ms: 0 })).toBe('1 chamada · 1 falha · 0 s em tools');
    });
});
