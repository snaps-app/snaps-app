/**
 * O timer do cabeçalho do nó atual, para member e admin (decisão do PO no
 * ci_gate do TP-4, 22/10/2026): o tempo da ÁRVORE inteira da raiz, de todos os
 * nós e de todas as pessoas, somando as sessões fechadas e o tempo corrido das
 * abertas.
 *
 * Fonte única: `resumo.sessoes`, a mesma do "Total" da lista "Sessões", com a
 * mesma conta (`segundosEmSessoes`). O tempo corrido anda no navegador, sem
 * consulta (ADR-0071). Chega fresco por evento: `session_started` e
 * `session_closed` do nó selecionado invalidam o resumo, e a sessão de outro
 * nó muda o carimbo `sessoes` da árvore, que a checagem de novidades traz.
 *
 * Os controles (Play e Pausa da sessão de quem olha) vêm como `children`. O
 * viewer não tem timer: não está trabalhando na execução.
 */
import type { ReactNode } from 'react';
import { Timer } from 'lucide-react';
import { formatarTempoDeSessoes, useSegundosEmSessoes, type TempoEmSessoes } from '@/services/resumoDoNo';

export function TimerDasSessoes({ sessoes, children }: { sessoes: TempoEmSessoes | null | undefined; children?: ReactNode }) {
    const total = useSegundosEmSessoes(sessoes);
    const emAndamento = (sessoes?.ativas_desde.length ?? 0) > 0;
    return (
        <div
            data-testid="timer-da-execucao"
            aria-label="Tempo da árvore em sessões"
            title={emAndamento ? 'Há sessão aberta na árvore' : 'Nenhuma sessão aberta na árvore agora'}
            className="flex h-7 items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2 text-xs text-[var(--snaps-text-primary)]"
        >
            <Timer className={`h-3.5 w-3.5 text-[var(--snaps-accent-purple)] ${emAndamento ? 'animate-pulse' : ''}`} aria-hidden="true" />
            <span className="font-mono">{total === null ? '—' : formatarTempoDeSessoes(total)}</span>
            {children}
        </div>
    );
}
