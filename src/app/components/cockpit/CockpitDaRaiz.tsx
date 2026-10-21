/**
 * O Cockpit de uma raiz (TP-4 da Sprint 24.0): cabeçalho, e os três painéis
 * sincronizados pelo nó selecionado da aba — History (TP-1) no Workflow,
 * Superfície (TP-2) no centro e Conversa à direita.
 *
 * Quanto custa (ADR-0071), e é o que o teste de desempenho conta:
 *   - a raiz: a árvore leve uma vez (`staleTime: Infinity`, frescor por
 *     evento), `phase-directives` uma vez por sessão e os cards da raiz uma vez;
 *   - o nó: `/resumo`, `/node-snapshot` e o conteúdo da aba aberta. O nó vem
 *     da árvore, sem `GET /agent-executions/{id}`;
 *   - nó concluído já visto: nada (resumo, snapshot e abas com `staleTime:
 *     Infinity`; eventos guardados depois do replay único).
 *
 * O nó e a aba vêm da URL; trocar é navegar com `rotaDoNo`. Sem aba na URL,
 * abre a aba com ação pendente, ou a da fase (regra 7, `abaAoAbrirNo`).
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { chavesDeConsulta as chaves } from '@/services/chavesDeConsulta';
import { rotaDoNo } from '@/services/cockpitRota';
import { cardsDoEscopo } from '@/services/executionScope';
import { useArvore, useNodeSnapshot, useStatusDaApi } from '@/services/nodeSnapshot';
import { getResumoDoNo } from '@/services/resumoDoNo';
import { rotuloDaRaiz, type ResumoDaRaiz } from '@/services/raizesDoCockpit';
import type { AgentTaskExecution, ArvoreLeve, Card, NoDaArvore, WorkflowSnapshot } from '@/services/types';
import { montarHistory } from '@/services/workflowSnapshot';
import type { LayoutDoCockpit } from '@/services/cockpitLayout';
import { HistoryDaRaiz } from './history/HistoryDaRaiz';
import { AuditoriaDoNo } from './history/AuditoriaDoNo';
import { Superficie } from './superficie/Superficie';
import { definicaoDaAba, eChaveDeAba, abaEmFocoDaFase, type ChaveDeAba } from './superficie/catalogo';
import { abaAoAbrirNo, type Novidades } from './superficie/ordenarAbas';
import { abrirAba as lerNovidadesDaAba, registrarNovidade, totalDeNovidades } from './superficie/abaDoEvento';
import { useAcoesDoNo } from './superficie/useAcoesDoNo';
import type { FaseDoNo } from './superficie/abas/comum';
import { CabecalhoDoNo } from './cabecalho/CabecalhoDoNo';
import { ConversaDoNo } from './conversa/ConversaDoNo';
import { ultimoEventoEm, useEventosDoNo } from './conversa/useEventosDoNo';
import { PaineisDoCockpit } from './layout/PaineisDoCockpit';
import { useEstadoDaAba } from './navegacao/EstadoDaAbaContexto';
import { identidadeDoNo } from './identidadeDoNo';
import { atualizarNovidadesDosNos, totalDeNovidadesDosNos, type VistosDosNos } from './novidadesDosNos';
import { rotuloDoCard } from './cabecalho/FaixaDeCards';

/** O nó da URL, se está na árvore; senão o atual da raiz; senão a própria raiz. */
export function escolherNo(nos: readonly NoDaArvore[], pedido: string | null, atualId: string, rootId: string): NoDaArvore | null {
    const por = (id: string | null) => (id ? nos.find((n) => n.id === id) ?? null : null);
    return por(pedido) ?? por(atualId) ?? por(rootId) ?? nos[nos.length - 1] ?? null;
}

/**
 * O nó no formato que a Superfície e as ações esperam, montado da árvore leve e
 * da raiz, sem buscar a execução inteira. `context_data` fica de fora: as abas
 * que precisam dele buscam junto com o próprio conteúdo.
 */
export function execucaoDoNo(no: NoDaArvore, raiz: ResumoDaRaiz, workflow: WorkflowSnapshot | null): AgentTaskExecution {
    return {
        id: no.id,
        project_id: raiz.projectId,
        status: no.status as AgentTaskExecution['status'],
        phase: no.phase,
        sprint_ids: raiz.sprintIds,
        card_ids: no.card_ids ?? [],
        agent_name: no.agent_name ?? '',
        advance_conditions: {},
        plan_id: no.plan_id ?? undefined,
        parent_id: no.parent_id ?? undefined,
        root_id: raiz.rootId,
        branch_type: no.branch_type ?? undefined,
        workflow_snapshot: workflow,
        workflow_snapshot_hash: no.workflow_snapshot_hash,
        lock_version: no.lock_version,
        created_at: no.created_at,
        updated_at: no.updated_at,
    };
}

function workflowDoNo(arvore: ArvoreLeve | undefined, no: NoDaArvore | null): WorkflowSnapshot | null {
    const hash = no?.workflow_snapshot_hash;
    return (hash && arvore?.workflows?.[hash]) || null;
}

function faseDoNo(workflow: WorkflowSnapshot | null, fase: string): FaseDoNo | null {
    const config = workflow?.phases?.find((f) => f?.key === fase);
    return config ? ({ ...config, key: fase, label: config.label || fase } as FaseDoNo) : null;
}

export interface CockpitDaRaizProps {
    raiz: ResumoDaRaiz;
    no: string | null;
    aba: string | null;
    layout: LayoutDoCockpit;
    onMudarLayout: (layout: LayoutDoCockpit) => void;
}

export function CockpitDaRaiz({ raiz, no, aba, layout, onMudarLayout }: CockpitDaRaizProps) {
    const rootId = raiz.rootId;
    const navigate = useNavigate();
    const { estado: estadoDaAba, atualizar } = useEstadoDaAba();
    const arvore = useArvore(rootId);
    const status = useStatusDaApi();

    const nos = arvore.data?.nos ?? [];
    const noDaArvore = escolherNo(nos, no, raiz.atualId, rootId);
    const noId = noDaArvore?.id ?? null;
    const workflow = workflowDoNo(arvore.data, noDaArvore);
    const terminal = !!noDaArvore && !!status.data?.terminais.includes(noDaArvore.status);
    const descartado = !!noDaArvore && !!status.data?.descartados?.includes(noDaArvore.status);
    const execucao = useMemo(
        () => (noDaArvore ? execucaoDoNo(noDaArvore, raiz, workflow) : null),
        [noDaArvore, raiz, workflow],
    );
    const itens = useMemo(
        () => (arvore.data && status.data ? montarHistory(arvore.data, status.data) : []),
        [arvore.data, status.data],
    );
    const identidade = noDaArvore ? identidadeDoNo(noDaArvore, itens) : null;

    // O nó: resumo e snapshot. Nó concluído não muda mais (trava do TP-1).
    const resumo = useQuery({
        queryKey: chaves.resumo(noId ?? ''),
        queryFn: () => getResumoDoNo(noId as string),
        enabled: !!noId && !!status.data,
        ...(terminal ? { staleTime: Infinity } : {}),
    });
    const snapshot = useNodeSnapshot(status.data ? noId : null, terminal);

    // A raiz: os cards de todos os nós, uma vez. Cada nó filtra o seu escopo daqui.
    const idsDaRaiz = useMemo(() => [...new Set(nos.flatMap((n) => n.card_ids ?? []))].sort(), [nos]);
    const cardsDaRaiz = useQuery({
        queryKey: chaves.cardsDaRaiz(rootId, idsDaRaiz),
        queryFn: () => cardsDoEscopo({ card_ids: idsDaRaiz, sprint_ids: raiz.sprintIds }),
        enabled: arvore.isSuccess,
    });
    const cardsDoNo: Card[] | null = useMemo(() => {
        if (!cardsDaRaiz.data) return null;
        const ids = noDaArvore?.card_ids ?? [];
        return ids.length > 0 ? cardsDaRaiz.data.filter((c) => ids.includes(c.id)) : cardsDaRaiz.data;
    }, [cardsDaRaiz.data, noDaArvore]);

    // Aba da Superfície: a da URL; sem ela, a regra 7, que espera o resumo.
    const abaDaUrl: ChaveDeAba | null = eChaveDeAba(aba) ? aba : null;
    const abaAtiva: ChaveDeAba | null = !noDaArvore
        ? null
        : abaDaUrl ?? (resumo.data ? abaAoAbrirNo(resumo.data.pendencias, noDaArvore.phase)
            : resumo.isError ? abaEmFocoDaFase(noDaArvore.phase) : null);

    // Novidades: por aba do nó selecionado (eventos ao vivo) e por nó (árvore).
    const [novidadesDasAbas, setNovidadesDasAbas] = useState<Record<string, Novidades>>({});
    const [novasNaConversa, setNovasNaConversa] = useState(0);
    const [vistos, setVistos] = useState<VistosDosNos | null>(null);
    useEffect(() => {
        if (arvore.data) setVistos((v) => atualizarNovidadesDosNos(v, arvore.data.nos, noId));
    }, [arvore.data, noId]);
    useEffect(() => {
        if (!layout.recolhidos.conversa) setNovasNaConversa(0);
    }, [layout.recolhidos.conversa]);

    const { eventos, estado: estadoDoStream } = useEventosDoNo({
        noId,
        rootId,
        terminal: terminal || descartado,
        ativo: !!status.data,
        onEventoAoVivo: (evento) => {
            if (!noId) return;
            setNovidadesDasAbas((atual) => ({ ...atual, [noId]: registrarNovidade(atual[noId] ?? {}, evento, abaAtiva) }));
            if (layout.recolhidos.conversa) setNovasNaConversa((n) => n + 1);
        },
    });

    const acoes = useAcoesDoNo(null);
    const irPara = useCallback((destino: Pick<AgentTaskExecution, 'id' | 'root_id'>, novaAba?: string | null, trocar = false) => {
        navigate(rotaDoNo({ id: destino.id, root_id: destino.root_id || rootId }, novaAba), { replace: trocar });
    }, [navigate, rootId]);

    const selecionarAba = (nova: ChaveDeAba) => {
        if (!noId) return;
        setNovidadesDasAbas((atual) => ({ ...atual, [noId]: lerNovidadesDaAba(atual[noId] ?? {}, nova) }));
        irPara({ id: noId, root_id: rootId }, nova, true);
    };

    // Filtro por card da faixa do cabeçalho: o History destaca os nós do card.
    const filtro = cardsDaRaiz.data?.some((c) => c.id === estadoDaAba?.filtroDeCard) ? estadoDaAba!.filtroDeCard : null;
    const destacados = useMemo(
        () => (filtro ? new Set(nos.filter((n) => !n.card_ids?.length || n.card_ids.includes(filtro)).map((n) => n.id)) : null),
        [filtro, nos],
    );
    const cardDoFiltro = filtro ? cardsDaRaiz.data?.find((c) => c.id === filtro) ?? null : null;

    if (arvore.isError || !arvore.data || !noDaArvore || !execucao || !identidade) {
        // A raiz continua identificada enquanto a árvore não chega (ou falha).
        return (
            <div className="flex flex-col gap-2 p-6">
                <h1 className="text-lg font-bold text-[var(--snaps-text-primary)]">{rotuloDaRaiz(raiz)}</h1>
                {arvore.isError ? (
                    <p role="alert" className="text-sm text-[var(--snaps-error)]">Não foi possível carregar a árvore desta raiz.</p>
                ) : (
                    <p role="status" className="text-sm text-[var(--snaps-text-secondary)]">
                        {arvore.data ? 'Esta raiz não tem nós.' : 'Carregando a árvore…'}
                    </p>
                )}
            </div>
        );
    }

    const novidadesDoNo = novidadesDasAbas[noDaArvore.id] ?? {};
    const pendencias = acoes.podeAgir ? resumo.data?.pendencias ?? [] : [];
    const somenteLeitura = terminal || descartado;
    const fase = faseDoNo(workflow, noDaArvore.phase);

    const superficie = (
        <div className="flex h-full min-h-0 flex-col">
            {cardDoFiltro && (
                <div className="mx-4 mb-2 flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-3.5 py-2 text-xs text-[var(--snaps-text-secondary)]">
                    <span className="grow">Filtrando por {rotuloDoCard(cardDoFiltro)}: o Workflow destaca os nós deste card.</span>
                    <button type="button" onClick={() => atualizar({ filtroDeCard: null })}
                        className="rounded-lg border border-white/15 px-2.5 py-1 text-[var(--snaps-text-primary)] hover:bg-white/10">
                        Limpar filtro
                    </button>
                </div>
            )}
            {abaAtiva ? (
                <Superficie
                    key={noDaArvore.id}
                    faseKey={noDaArvore.phase}
                    execucao={execucao}
                    somenteLeitura={somenteLeitura}
                    abaAtiva={abaAtiva}
                    onSelecionarAba={selecionarAba}
                    novidades={novidadesDoNo}
                    fase={fase}
                    auditoria={snapshot.data ? <AuditoriaDoNo snapshot={snapshot.data} /> : null}
                />
            ) : (
                <p role="status" className="px-4 text-xs text-[var(--snaps-text-secondary)]">Abrindo o nó…</p>
            )}
        </div>
    );

    return (
        <div className="flex min-h-0 flex-1 flex-col">
            <CabecalhoDoNo
                raiz={raiz}
                execucao={execucao}
                identidade={identidade}
                terminal={terminal}
                descartado={descartado}
                workflow={workflow}
                snapshot={snapshot.data}
                resumo={resumo.data}
                cards={cardsDoNo}
                filtroDeCard={filtro}
                onFiltrarCard={(id) => atualizar({ filtroDeCard: id })}
                recolhido={layout.cabecalhoRecolhido}
                onAlternarRecolhido={() => onMudarLayout({ ...layout, cabecalhoRecolhido: !layout.cabecalhoRecolhido })}
                ultimoEventoEm={ultimoEventoEm(eventos)}
                onNovoNo={(novo) => irPara(novo)}
            />
            <PaineisDoCockpit
                layout={layout}
                onMudarLayout={onMudarLayout}
                workflow={(
                    <div className="min-h-0 grow overflow-y-auto">
                        <HistoryDaRaiz
                            tree={arvore.data}
                            selecionadoId={noDaArvore.id}
                            novidades={vistos?.contagem ?? {}}
                            onSelecionarNo={(id) => irPara({ id, root_id: rootId })}
                            destacados={destacados}
                        />
                    </div>
                )}
                superficie={superficie}
                conversa={<ConversaDoNo identidade={identidade} eventos={eventos} estado={estadoDoStream} />}
                trilhos={{
                    workflow: { novidade: totalDeNovidadesDosNos(vistos) },
                    superficie: {
                        luz: pendencias.length > 0,
                        novidade: totalDeNovidades(novidadesDoNo),
                        detalhe: abaAtiva ? definicaoDaAba(abaAtiva).rotulo : null,
                    },
                    conversa: { novidade: novasNaConversa },
                }}
                extras={{
                    superficie: (
                        <span className="text-xs whitespace-nowrap"
                            style={{ color: somenteLeitura ? 'var(--snaps-text-secondary)' : 'var(--snaps-accent-blue)' }}>
                            {descartado ? 'Snapshot · tentativa desfeita' : terminal ? 'Snapshot · somente leitura' : '● Ao vivo'}
                        </span>
                    ),
                }}
            />
        </div>
    );
}
