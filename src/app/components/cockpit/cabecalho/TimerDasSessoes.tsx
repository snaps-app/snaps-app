/**
 * O timer do nó atual para quem só lê (viewer; TP-4, rodada do PO de 21/10).
 *
 * Mostra o tempo registrado em sessões no nó: as encerradas mais as abertas,
 * contadas no navegador a partir do início delas. Os dados vêm do `/resumo`
 * (`sessoes`), que o cabeçalho já tem: nenhuma chamada a mais ao abrir o nó, e
 * nenhuma sessão aberta em nome de quem só olha. Sem Play, Pausa nem fechar.
 */
import { useEffect, useState } from 'react';
import { Timer } from 'lucide-react';
import type { TempoEmSessoes } from '@/services/resumoDoNo';

/** De quanto em quanto o relógio LOCAL anda enquanto há sessão aberta. Não consulta nada. */
const PASSO_DO_RELOGIO_MS = 1_000;

export function segundosEmSessoes(sessoes: TempoEmSessoes, agora: number): number {
    const abertas = sessoes.ativas_desde.reduce((s, inicio) => {
        const t = Date.parse(inicio);
        return Number.isNaN(t) ? s : s + Math.max(0, (agora - t) / 1000);
    }, 0);
    return Math.floor(sessoes.encerradas_segundos + abertas);
}

function hhmmss(total: number): string {
    const h = String(Math.floor(total / 3600)).padStart(2, '0');
    const m = String(Math.floor((total % 3600) / 60)).padStart(2, '0');
    const s = String(total % 60).padStart(2, '0');
    return `${h}:${m}:${s}`;
}

export function TimerDasSessoes({ sessoes }: { sessoes: TempoEmSessoes | null | undefined }) {
    const [agora, setAgora] = useState(() => Date.now());
    const emAndamento = (sessoes?.ativas_desde.length ?? 0) > 0;
    useEffect(() => {
        if (!emAndamento) return undefined;
        const relogio = setInterval(() => setAgora(Date.now()), PASSO_DO_RELOGIO_MS);
        return () => clearInterval(relogio);
    }, [emAndamento]);

    return (
        <div
            data-testid="timer-da-execucao"
            data-somente-leitura="true"
            aria-label="Tempo em sessões neste nó, só leitura"
            title={emAndamento ? 'Sessão aberta por quem trabalha neste nó' : 'Nenhuma sessão aberta agora'}
            className="flex h-7 items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2 text-xs text-[var(--snaps-text-primary)]"
        >
            <Timer className={`h-3.5 w-3.5 text-[var(--snaps-accent-purple)] ${emAndamento ? 'animate-pulse' : ''}`} aria-hidden="true" />
            <span className="font-mono">{sessoes ? hhmmss(segundosEmSessoes(sessoes, agora)) : '—'}</span>
        </div>
    );
}
