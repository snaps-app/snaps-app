/**
 * Superfície: o artefato em foco do nó, com as 15 abas do catálogo (P6).
 *
 * - Recebe tudo por props: sem `useParams` e sem `useNavigate`. Renderiza fora
 *   da rota do Cockpit.
 * - A ordem, as luzes e as abas vazias vêm do `/resumo` (uma chamada por nó).
 *   Só a aba aberta busca o seu conteúdo; as pesadas carregam com `lazy()`.
 * - Quantas abas cabem antes de "Mais" sai da largura do PRÓPRIO painel
 *   (container), não da janela. A aba com luz nunca cai em "Mais".
 * - `somenteLeitura` (nó concluído) esconde toda escrita. Scratch e
 *   Walkthroughs continuam editáveis para quem pode escrever.
 * - As ações passam por `useAcoesDoNo`, que filtra pelo papel da aba de raiz.
 */
import { Suspense, lazy, useEffect, useRef, useState, type ComponentType, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronDown } from 'lucide-react';
import { chavesDeConsulta as chaves } from '@/services/chavesDeConsulta';
import { abasVazias, getResumoDoNo, type PendenciaDoNo } from '@/services/resumoDoNo';
import type { AgentTaskExecution } from '@/services/types';
import { definicaoDaAba, type ChaveDeAba } from './catalogo';
import { ordenarAbas, type AbaOrdenada, type Novidades } from './ordenarAbas';
import { useAcoesDoNo } from './useAcoesDoNo';
import type { FaseDoNo, PropsDaAba } from './abas/comum';
import AbaPlano from './abas/AbaPlano';
import { AbaCards, AbaCenarios, AbaTasks } from './abas/AbasDeCards';
import AbaTestPlans from './abas/AbaTestPlans';
import { AbaRetro, AbaRevisoes, AbaWalkthroughs } from './abas/AbasDeArtefatos';
import { AbaContexto, AbaPrompt } from './abas/AbasDeContexto';
import AbaNo from './abas/AbaNo';
import AbaScratch from './abas/AbaScratch';

const AbaPrs = lazy(() => import('./abas/AbaPrs'));
const AbaAmbiente = lazy(() => import('./abas/AbaAmbiente'));
const AbaAtividade = lazy(() => import('./abas/AbaAtividade'));

const CONTEUDO_PADRAO: Record<ChaveDeAba, ComponentType<PropsDaAba>> = {
    plano: AbaPlano,
    cards: AbaCards,
    tasks: AbaTasks,
    cenarios: AbaCenarios,
    testplans: AbaTestPlans,
    revisoes: AbaRevisoes,
    prs: AbaPrs,
    walkthroughs: AbaWalkthroughs,
    contexto: AbaContexto,
    ambiente: AbaAmbiente,
    atividade: AbaAtividade,
    prompt: AbaPrompt,
    retro: AbaRetro,
    no: AbaNo,
    scratch: AbaScratch,
};

/** Largura média de uma aba na barra, incluindo o botão "Mais". */
const LARGURA_DA_ABA = 112;

/** Quantas abas cabem antes de "Mais" numa barra desta largura (mínimo 1). */
export function capacidadePelaLargura(largura: number | null): number {
    if (!largura || largura <= 0) return 15;
    return Math.max(1, Math.floor(largura / LARGURA_DA_ABA) - 1);
}

function useLarguraDoPainel() {
    const ref = useRef<HTMLDivElement | null>(null);
    const [largura, setLargura] = useState<number | null>(null);
    useEffect(() => {
        const alvo = ref.current;
        if (!alvo || typeof ResizeObserver === 'undefined') return;
        const observador = new ResizeObserver(([entrada]) => setLargura(entrada.contentRect.width));
        observador.observe(alvo);
        return () => observador.disconnect();
    }, []);
    return { ref, largura };
}

export interface SuperficieProps {
    faseKey: string | null | undefined;
    execucao: AgentTaskExecution;
    somenteLeitura: boolean;
    abaAtiva: ChaveDeAba;
    onSelecionarAba: (aba: ChaveDeAba) => void;
    novidades?: Novidades;
    /** Sobrepõe as pendências do `/resumo` (o TP-4 pode passar as que já tem). */
    pendencias?: PendenciaDoNo[];
    /** Fase do snapshot do nó (`fasesDoNo`, TP-1), para a aba Nó. */
    fase?: FaseDoNo | null;
    /** `AuditoriaDoNo` (TP-1), mostrado na aba Nó. */
    auditoria?: ReactNode;
    /** Conteúdo próprio para alguma aba; o resto usa o padrão. */
    conteudos?: Partial<Record<ChaveDeAba, ReactNode>>;
}

function BotaoDaAba({ aba, onSelecionar }: { aba: AbaOrdenada; onSelecionar: (a: ChaveDeAba) => void }) {
    const def = definicaoDaAba(aba.chave);
    return (
        <button
            type="button"
            role="tab"
            aria-selected={aba.aberta}
            data-aba={aba.chave}
            data-luz={aba.luz || undefined}
            title={aba.motivoVazio ?? undefined}
            onClick={() => onSelecionar(aba.chave)}
            className={`relative flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-bold transition-colors ${aba.aberta
                ? 'bg-white/10 text-[var(--snaps-text-primary)]'
                : 'text-[var(--snaps-text-secondary)] hover:bg-white/5'} ${aba.vazia ? 'opacity-50' : ''}`}
        >
            {def.rotulo}
            {aba.luz && (
                <span aria-label="ação sua pendente" className="h-2 w-2 rounded-full bg-[var(--snaps-accent-amber)]" />
            )}
            {!aba.luz && aba.novidade > 0 && (
                <span aria-label={`${aba.novidade} novidade(s)`} className="h-2 w-2 rounded-full bg-[var(--snaps-accent-blue)]" />
            )}
        </button>
    );
}

export function Superficie({
    faseKey, execucao, somenteLeitura, abaAtiva, onSelecionarAba,
    novidades = {}, pendencias, fase, auditoria, conteudos,
}: SuperficieProps) {
    const resumo = useQuery({
        queryKey: chaves.resumo(execucao.id),
        queryFn: () => getResumoDoNo(execucao.id),
        ...(somenteLeitura ? { staleTime: Infinity } : {}),
    });
    const acoes = useAcoesDoNo(execucao);
    const { ref, largura } = useLarguraDoPainel();
    const [maisAberto, setMaisAberto] = useState(false);

    const ordem = ordenarAbas(
        abaAtiva,
        pendencias ?? resumo.data?.pendencias ?? [],
        novidades,
        faseKey,
        abasVazias(resumo.data),
        capacidadePelaLargura(largura),
    );
    const selecionar = (aba: ChaveDeAba) => {
        setMaisAberto(false);
        onSelecionarAba(aba);
    };

    const Conteudo = CONTEUDO_PADRAO[abaAtiva];
    const proprio = conteudos?.[abaAtiva];

    return (
        <div ref={ref} className="@container flex h-full min-w-0 flex-col" data-testid="superficie">
            <div role="tablist" aria-label="Abas do nó" className="flex items-center gap-1 border-b border-white/10 px-2 py-2">
                {ordem.visiveis.map((aba) => <BotaoDaAba key={aba.chave} aba={aba} onSelecionar={selecionar} />)}
                {ordem.mais.length > 0 && (
                    <div className="relative ml-auto shrink-0">
                        <button type="button" aria-expanded={maisAberto} onClick={() => setMaisAberto((v) => !v)}
                            className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-[11px] font-bold text-[var(--snaps-text-secondary)] hover:bg-white/5">
                            Mais <ChevronDown className="h-3 w-3" />
                        </button>
                        {maisAberto && (
                            <div role="menu" className="absolute right-0 z-20 mt-1 w-64 space-y-0.5 rounded-xl border border-white/10 bg-[var(--snaps-surface)] p-1 shadow-xl">
                                {ordem.mais.map((aba) => (
                                    <button key={aba.chave} type="button" role="menuitem" data-aba={aba.chave}
                                        onClick={() => selecionar(aba.chave)}
                                        className={`flex w-full flex-col rounded-lg px-3 py-2 text-left hover:bg-white/5 ${aba.vazia ? 'opacity-60' : ''}`}>
                                        <span className="text-[11px] font-bold text-[var(--snaps-text-primary)]">
                                            {definicaoDaAba(aba.chave).rotulo}
                                            {aba.novidade > 0 && ` · ${aba.novidade} nova(s)`}
                                        </span>
                                        {aba.motivoVazio && (
                                            <span className="text-[10px] text-[var(--snaps-text-secondary)]">{aba.motivoVazio}</span>
                                        )}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
            <div role="tabpanel" className="min-h-0 flex-1 overflow-y-auto p-4">
                {proprio ?? (
                    <Suspense fallback={<p className="text-xs text-[var(--snaps-text-secondary)]">Carregando…</p>}>
                        <Conteudo
                            key={`${execucao.id}:${abaAtiva}`}
                            execucao={execucao}
                            somenteLeitura={somenteLeitura}
                            ativa
                            acoes={acoes}
                            onSelecionarAba={selecionar}
                            fase={fase}
                            auditoria={auditoria}
                        />
                    </Suspense>
                )}
            </div>
        </div>
    );
}
