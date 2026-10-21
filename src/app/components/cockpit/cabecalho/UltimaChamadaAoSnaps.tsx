/**
 * "Última chamada ao Snaps há X min", no cabeçalho do nó (P25).
 *
 * Este é o ÚNICO lugar do Cockpit com `refetchInterval` (ADR-0071, item 5; a
 * trava de `cockpit.travas.test.ts` aceita só arquivos `UltimaChamada*`). As
 * chamadas MCP gravam em `tool_invocations` e não geram evento SSE, então sem
 * isto o indicador ficaria parado no horário de quando o nó abriu.
 *
 * A revalidação segue `intervaloDeRevalidacao`: só nó `in_progress`, uma vez ao
 * cruzar 15 min e, enquanto âmbar, no máximo a cada 5 min. Com a aba do
 * navegador oculta o TanStack não busca (`refetchIntervalInBackground` fica
 * `false`); aba de raiz inativa nem monta o cabeçalho.
 */
import { useEffect, useState } from 'react';
import { focusManager, useQuery } from '@tanstack/react-query';
import { chavesDeConsulta as chaves } from '@/services/chavesDeConsulta';
import { getResumoDoNo } from '@/services/resumoDoNo';
import { intervaloDeRevalidacao, resumoDeTools, textoDaUltimaChamada, ultimaAtividade } from './ultimaChamada';

/** De quanto em quanto o relógio LOCAL anda. Não consulta nada. */
const PASSO_DO_RELOGIO_MS = 30_000;

export interface UltimaChamadaAoSnapsProps {
    execucaoId: string;
    /** O nó está `in_progress`: âmbar e revalidação só valem aí. */
    emAndamento: boolean;
    /** Nó concluído: mostra o resumo de tools, sem relógio. */
    terminal: boolean;
    /** Horário do último evento SSE do nó, que também conta como atividade. */
    ultimoEventoEm?: string | null;
}

export function UltimaChamadaAoSnaps({ execucaoId, emAndamento, terminal, ultimoEventoEm }: UltimaChamadaAoSnapsProps) {
    const [agora, setAgora] = useState(() => Date.now());
    useEffect(() => {
        if (terminal) return;
        setAgora(Date.now());
        const relogio = setInterval(() => setAgora(Date.now()), PASSO_DO_RELOGIO_MS);
        return () => clearInterval(relogio);
    }, [terminal, execucaoId]);

    const resumo = useQuery({
        queryKey: chaves.resumo(execucaoId),
        queryFn: () => getResumoDoNo(execucaoId),
        ...(terminal ? { staleTime: Infinity } : {}),
        refetchInterval: (consulta) => intervaloDeRevalidacao({
            emAndamento: emAndamento && !terminal,
            visivel: focusManager.isFocused(),
            ultima: ultimaAtividade(consulta.state.data?.atividade?.ultima_atividade_em, ultimoEventoEm),
            agora: Date.now(),
        }),
    });
    const atividade = resumo.data?.atividade;

    if (terminal) {
        return (
            <span data-testid="ultima-chamada" className="text-xs text-[var(--snaps-text-secondary)]">
                {atividade ? resumoDeTools(atividade) : 'carregando o resumo de tools…'}
            </span>
        );
    }
    if (!resumo.data) {
        return <span data-testid="ultima-chamada" className="text-xs text-[var(--snaps-text-secondary)]">…</span>;
    }
    const { texto, ambar } = textoDaUltimaChamada(
        ultimaAtividade(atividade?.ultima_atividade_em, ultimoEventoEm), agora, emAndamento,
    );
    return (
        <span
            data-testid="ultima-chamada"
            data-ambar={ambar || undefined}
            className={`text-xs ${ambar ? 'text-[var(--snaps-accent-yellow)]' : 'text-[var(--snaps-text-secondary)]'}`}
        >
            {texto}
        </span>
    );
}
