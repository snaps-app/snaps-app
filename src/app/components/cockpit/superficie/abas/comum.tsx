/**
 * O que toda aba da Superfície recebe e como ela busca o seu conteúdo.
 *
 * Carregamento sob demanda (ADR-0071, item 7): cada aba consulta com
 * `useQuery(chaves.aba(id, aba), { enabled: ativa })`, e as fechadas não fazem
 * chamada. Em nó concluído o conteúdo não muda mais (trava do TP-1, ADR-0038):
 * `staleTime: Infinity`. A exceção são as abas que continuam editáveis
 * (Scratch e Walkthroughs), revalidadas ao abrir.
 */
import type { ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { chavesDeConsulta as chaves } from '@/services/chavesDeConsulta';
import type { AgentTaskExecution } from '@/services/types';
import type { AcoesDoNo } from '../useAcoesDoNo';
import { definicaoDaAba, type ChaveDeAba } from '../catalogo';

/** A fase do nó lida do `workflow_snapshot` (`fasesDoNo`, TP-1), nunca do catálogo (P7). */
export interface FaseDoNo {
    key: string;
    label?: string;
    agent?: string;
    tools?: string[];
    skills?: string[];
    advance_conditions?: Record<string, unknown>;
    [campo: string]: unknown;
}

export interface PropsDaAba {
    execucao: AgentTaskExecution;
    somenteLeitura: boolean;
    ativa: boolean;
    acoes: AcoesDoNo;
    onSelecionarAba: (aba: ChaveDeAba) => void;
    fase?: FaseDoNo | null;
    /** Auditoria do nó (`AuditoriaDoNo`, TP-1), montada por quem integra. */
    auditoria?: ReactNode;
}

/** A aba só escreve se o nó é atual e o papel permite (as duas coisas). */
export function podeEscrever({ somenteLeitura, acoes }: Pick<PropsDaAba, 'somenteLeitura' | 'acoes'>): boolean {
    return !somenteLeitura && acoes.podeAgir;
}

export function useConteudoDaAba<T>(
    { execucao, ativa, somenteLeitura }: Pick<PropsDaAba, 'execucao' | 'ativa' | 'somenteLeitura'>,
    aba: ChaveDeAba,
    buscar: () => Promise<T>,
) {
    const editavel = definicaoDaAba(aba).editavelEmNoConcluido === true;
    return useQuery({
        queryKey: chaves.aba(execucao.id, aba),
        queryFn: buscar,
        enabled: ativa,
        ...(somenteLeitura && !editavel ? { staleTime: Infinity } : {}),
        ...(editavel ? { refetchOnMount: 'always' as const } : {}),
    });
}

export function EstadoDaConsulta({ carregando, erro, children }: {
    carregando: boolean;
    erro: unknown;
    children: ReactNode;
}) {
    if (carregando) {
        return (
            <div className="flex items-center justify-center py-16 text-[var(--snaps-text-secondary)]" role="status">
                <Loader2 className="w-5 h-5 animate-spin" aria-label="Carregando" />
            </div>
        );
    }
    if (erro) {
        const texto = (erro as any)?.response?.data?.detail ?? (erro as Error)?.message ?? String(erro);
        return (
            <p role="alert" className="rounded-xl border border-white/10 bg-white/5 p-4 text-xs text-[var(--snaps-error)]">
                Não foi possível carregar: {typeof texto === 'string' ? texto : 'erro desconhecido'}
            </p>
        );
    }
    return <>{children}</>;
}

export function Secao({ titulo, children, acao }: { titulo: string; children: ReactNode; acao?: ReactNode }) {
    return (
        <section className="space-y-3">
            <div className="flex items-center justify-between gap-2">
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-[var(--snaps-text-secondary)]">{titulo}</h3>
                {acao}
            </div>
            {children}
        </section>
    );
}

export function Vazio({ children }: { children: ReactNode }) {
    return <p className="py-10 text-center text-xs italic text-[var(--snaps-text-secondary)]">{children}</p>;
}

/** Botão de escrita que ainda não existe nesta versão: visível, desabilitado e datado. */
export function BotaoFuturo({ rotulo, versao }: { rotulo: string; versao: string }) {
    return (
        <button
            type="button"
            disabled
            title={`Disponível na Sprint ${versao}`}
            className="cursor-not-allowed rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-[10px] font-bold text-[var(--snaps-text-secondary)] opacity-60"
        >
            {rotulo} · {versao}
        </button>
    );
}
