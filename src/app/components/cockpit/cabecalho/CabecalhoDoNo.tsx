import { ModalDoEscopoDeDespacho } from './ModalDoEscopoDeDespacho';
import { getAgentExecution } from '@/services/agentExecutions';
/**
 * Cabeçalho do nó selecionado (P15; TP-4 da Sprint 24.0). Cheio ou recolhido
 * numa linha de 44 px.
 *
 * - Identidade (`fase · TP · tentativa · id curto`, na cor do TP), status,
 *   projeto e sprint da raiz.
 * - Gates: as condições do `workflow_snapshot` do NÓ (`gatesDoNo.ts`), nunca
 *   do catálogo. A recusa do motor aparece escrita, e as condições que ela
 *   nomeia vão para o override.
 * - Ações só por `useAcoesDoNo` (TP-2): viewer não vê nenhuma; Rollback só
 *   admin. Override é do dono da execução ou de admin, como a API disser
 *   (`resumo.pode_override`, ADR-0072), e abre em qualquer nó atual, com ou
 *   sem gate pendente: o override humano sempre prevalece. Com gate pendente,
 *   "Avançar com override" abre com o que falta já marcado; quem não pode
 *   fazer override lê de quem é.
 * - Recusa do motor ao avançar: aparece escrita e, para quem pode, o override
 *   abre com as condições recusadas marcadas, inclusive as estruturais. Recusa
 *   que não é gate (revisão em conflito, origem já avançou) não vira override:
 *   a tela mostra a mensagem e oferece recarregar.
 * - Tempo e sessões, só no nó atual: o timer mostra o tempo da árvore inteira
 *   (`TimerDasSessoes`, fonte única `resumo.sessoes`), com Play/Pausa da
 *   sessão de quem trabalha, "Registrar horas" e "Sessões". O viewer não tem
 *   timer; vê só a lista "Sessões", para leitura, com o total.
 * - "Última chamada ao Snaps" (P25), do `/resumo`, sem chamada própria.
 */
import { useEffect, useState, type ReactNode } from 'react';
import { BotaoVoltar } from './BotaoVoltar';
import { ConfirmacaoDeComando } from './ConfirmacaoDeComando';
import { useQueryClient } from '@tanstack/react-query';
import { chavesDeConsulta as chaves } from '@/services/chavesDeConsulta';
import type { NodeSnapshot, AgentTaskExecution, Card, WorkflowSnapshot } from '@/services/types';
import { type ResumoDoNo } from '@/services/resumoDoNo';
import { idCurto, rotuloDaRaiz, type ResumoDaRaiz } from '@/services/raizesDoCockpit';
import { parseOverridableConditions } from '@/app/components/execution/dispatch-scope';
import { ExecutionTimer } from '@/app/components/execution/execution-timer';
import { TimeTrackingModal } from '@/app/components/execution/time-tracking-modal';
import { SessionManagerModal } from '@/app/components/execution/session-manager-modal';
import { useAcoesDoNo } from '../superficie/useAcoesDoNo';
import { ChipDaIdentidade, type IdentidadeDoNo } from '../identidadeDoNo';
import { alvoDoRollback, avaliarGates, condicoesDaFase, gatesQueFaltam, rotuloDoGate, type GateDoNo } from './gatesDoNo';
import { DialogoDeOverride } from './DialogoDeOverride';
import { FaixaDeCards, cardsQuePedemAcao, textoDosCards } from './FaixaDeCards';
import { UltimaChamadaAoSnaps } from './UltimaChamadaAoSnaps';
import { TimerDasSessoes } from './TimerDasSessoes';

/** O que o member que não é o dono lê quando um gate trava o Avançar (ADR-0072). */
export const AVISO_DO_OVERRIDE = 'o override é do dono da execução ou de admin';

const STATUS: Record<string, { texto: string; cor: string }> = {
    pending: { texto: 'Aguardando despacho', cor: 'var(--snaps-accent-yellow)' },
    in_progress: { texto: 'Em andamento', cor: 'var(--snaps-accent-blue)' },
    awaiting_advance: { texto: 'Aguardando avanço', cor: 'var(--snaps-accent-yellow)' },
    failed: { texto: 'Falhou', cor: 'var(--snaps-error)' },
    completed: { texto: 'Concluída', cor: 'var(--snaps-accent-green)' },
    done: { texto: 'Concluída', cor: 'var(--snaps-accent-green)' },
    rolled_back: { texto: 'Desfeita', cor: 'var(--snaps-accent-orange)' },
    cancelled: { texto: 'Cancelada', cor: 'var(--snaps-accent-slate)' },
    superseded: { texto: 'Substituída', cor: 'var(--snaps-accent-slate)' },
};

/** Sem `on_failure` no snapshot, o Cockpit antigo voltava ao planejamento nestas fases. */
const ROLLBACK_LEGADO: Record<string, string> = { assurance: 'micro_planning', retro: 'micro_planning' };

function Chip({ cor, children, testid }: { cor: string; children: ReactNode; testid?: string }) {
    return (
        <span
            data-testid={testid}
            className="inline-flex h-6 shrink-0 items-center rounded-full border px-2.5 text-xs whitespace-nowrap"
            style={{ color: cor, borderColor: `color-mix(in srgb, ${cor} 40%, transparent)`, background: `color-mix(in srgb, ${cor} 10%, transparent)` }}
        >
            {children}
        </span>
    );
}

const BOTAO = 'h-8 rounded-lg border px-3.5 text-sm whitespace-nowrap disabled:cursor-not-allowed';
const BOTAO_FANTASMA = `${BOTAO} border-white/15 bg-white/5 text-[var(--snaps-text-primary)] hover:bg-white/10`;
const BOTAO_PRIMARIO = `${BOTAO} font-bold border-[var(--snaps-accent-purple)] bg-[var(--snaps-accent-purple)]/30 text-[var(--snaps-text-primary)] disabled:border-white/10 disabled:bg-white/[0.03] disabled:text-[var(--snaps-placeholder)]`;

const detalheDoErro = (erro: unknown): string => {
    const detail = (erro as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail;
    if (typeof detail === 'string') return detail;
    return (erro as Error)?.message ?? 'Não foi possível concluir a ação.';
};

export interface CabecalhoDoNoProps {
    raiz: ResumoDaRaiz;
    /** O nó, montado da árvore leve (sem `context_data`). */
    execucao: AgentTaskExecution;
    identidade: IdentidadeDoNo;
    terminal: boolean;
    descartado: boolean;
    workflow: WorkflowSnapshot | null | undefined;
    snapshot: NodeSnapshot | null | undefined;
    resumo: ResumoDoNo | null | undefined;
    /** Cards do escopo do nó; `null` enquanto carregam. */
    cards: Card[] | null;
    filtroDeCard: string | null;
    onFiltrarCard: (cardId: string | null) => void;
    faixaDeCardsRecolhida?: boolean;
    onAlternarFaixaDeCards?: () => void;
    recolhido: boolean;
    onAlternarRecolhido: () => void;
    ultimoEventoEm?: string | null;
    /** Uma ação criou ou trocou o nó (avanço, rollback, override): ir para ele. */
    onNovoNo: (no: AgentTaskExecution) => void;
}

export function CabecalhoDoNo(props: CabecalhoDoNoProps) {
    const {
        raiz, execucao, identidade, terminal, descartado, workflow, snapshot, resumo, cards,
        filtroDeCard, onFiltrarCard, recolhido, onAlternarRecolhido, ultimoEventoEm, onNovoNo,
    } = props;
    const cliente = useQueryClient();
    const acoes = useAcoesDoNo(terminal ? null : execucao, { podeOverride: resumo?.pode_override });
    const podeOverride = acoes.pode('override');
    const [dispensada,setDispensada] = useState<Record<string,string>>({});
    const [recusa, setRecusa] = useState<{ no: string; texto: string; condicoes: string[] } | null>(null);
    const [overrideAberto, setOverrideAberto] = useState(false);
    const [erroDoOverride, setErroDoOverride] = useState<string | null>(null);
    const [confirmarRollback, setConfirmarRollback] = useState(false);
    useEffect(() => {setConfirmarRollback(false);setEscopoAberto(null);},[execucao.id]);
    const [escopoAberto,setEscopoAberto] = useState<{no:AgentTaskExecution;avancar:boolean}|null>(null);
    const [erroDoEscopo,setErroDoEscopo] = useState<string|null>(null);
    const [modal, setModal] = useState<'horas' | 'sessoes' | 'horas-finais' | null>(null);
    const [versaoDasSessoes, setVersaoDasSessoes] = useState(0);

    const recusaDoNo = recusa?.no === execucao.id ? recusa : null;
    // Viewer recebe `pendencias: []` da API: para ele a lista não decide nada.
    const pendencias = acoes.podeAgir ? resumo?.pendencias ?? null : null;
    const gates: GateDoNo[] = avaliarGates({
        condicoes: condicoesDaFase(workflow, execucao.phase),
        sprintIds: execucao.sprint_ids ?? [],
        cards,
        pendencias,
        condicoesDoMotor: resumo?.condicoes,
    });
    const faltam = gatesQueFaltam(gates);
    const ok = gates.filter((g) => g.estado === 'ok').length;
    const alvo = alvoDoRollback(workflow, execucao.phase) ?? ROLLBACK_LEGADO[execucao.phase] ?? null;
    const atual = !terminal && !descartado;
    const status = STATUS[execucao.status] ?? { texto: execucao.status, cor: 'var(--snaps-accent-slate)' };
    const pedemAcao = cardsQuePedemAcao(cards ?? [], resumo?.pendencias ?? []).size;
    const registroDoMotor = (snapshot?.gates?.advance_conditions ?? {}) as { error?: unknown; info?: unknown };
    // A recusa desta tela, ou a última que o motor gravou no nó (de quem quer que tenha pedido).
    const textoDaRecusa = recusaDoNo?.texto ?? (typeof registroDoMotor.error === 'string' ? registroDoMotor.error : null);
    const recusadas = recusaDoNo?.condicoes ?? parseOverridableConditions(textoDaRecusa);
    // Recusa sem condição que o override dispense: não é gate (revisão em conflito, origem já avançou).
    const recusaSemGate = !!recusaDoNo && recusaDoNo.condicoes.length === 0;

    const executar = async (acao: () => Promise<AgentTaskExecution>, aoFalhar: (texto: string) => void) => {
        try {
            const resultado = await acao();
            setRecusa(null);
            // Mesmo nó em `done`: fim do workflow, hora de apontar as horas.
            if (resultado.id === execucao.id && resultado.status === 'done') setModal('horas-finais');
            else onNovoNo(resultado);
            return true;
        } catch (erro) {
            aoFalhar(detalheDoErro(erro));
            return false;
        }
    };

    const rearmarRecusa = () => setDispensada(a => {const {[execucao.id]: _ignorada,...resto}=a;return resto;});
    const abrirOverride = () => {
        rearmarRecusa();
        setErroDoOverride(null);
        setOverrideAberto(true);
    };

    const avancarDireto = (revisao?:number) => {rearmarRecusa(); return executar(() => acoes.acoes.avancar(revisao), (texto) => {
        const condicoes = parseOverridableConditions(texto);
        setRecusa({ no: execucao.id, texto, condicoes });
        // A execução nunca fica travada: quem pode cai direto no override, com as recusadas marcadas.
        if (condicoes.length > 0 && podeOverride) abrirOverride();
    });};

    const revisarEscopo = async (avancar:boolean) => {
        setErroDoEscopo(null);
        try {
            const no=await cliente.fetchQuery({queryKey:chaves.aba(execucao.id,'plano'),queryFn:()=>getAgentExecution(execucao.id),staleTime:0});
            const retrato=no.despacho;
            if (!retrato) throw new Error('Revisão do escopo indisponível. Recarregue o nó.');
            if (avancar && retrato.candidatos.length===1 && retrato.efetivo_ids.length===1 && retrato.efetivo_ids[0]===retrato.candidatos[0].id && !retrato.erro) {
                await avancarDireto(no.lock_version);
            } else setEscopoAberto({no,avancar});
        } catch(e) {setErroDoEscopo(detalheDoErro(e));}
    };
    const avancar = () => ['micro_planning','plan_review'].includes(execucao.phase) ? revisarEscopo(true) : avancarDireto();

    /** Recusa que não é gate: relê o nó e a árvore (a revisão que as ações enviam vem da árvore). */
    const recarregar = async () => {
        setRecusa(null);
        await Promise.all([
            cliente.invalidateQueries({ queryKey: chaves.arvore(raiz.rootId) }),
            cliente.invalidateQueries({ queryKey: chaves.execucao(execucao.id) }),
        ]);
    };

    const rollback = async () => {
        setConfirmarRollback(false);
        if (alvo) await executar(() => acoes.acoes.rollback(alvo), (texto) => setRecusa({ no: execucao.id, texto, condicoes: [] }));
    };

    const aplicarOverride = async (condicoes: string[], motivo: string) => {
        rearmarRecusa();
        setErroDoOverride(null);
        const certo = await executar(() => acoes.acoes.override(condicoes, motivo), setErroDoOverride);
        if (certo) setOverrideAberto(false);
    };

    const rotuloDoAvanco = execucao.phase === 'retro' ? 'Concluir sprint' : 'Avançar';
    const textoDeFaltam = faltam.length > 0 ? `Faltam: ${faltam.map((g) => g.rotulo).join(', ')}` : null;

    const listaDeGates = (<>
            {gates.length > 0 && (
                <ul aria-label="Gates da fase" className="flex flex-wrap items-center gap-1.5">
                    {gates.map((g) => (
                        <li key={g.chave} data-estado={g.estado}
                            title={g.estado === 'motor' ? 'Quem confere esta condição é o motor, no avanço' : undefined}
                            className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-0.5 text-xs text-[var(--snaps-text-secondary)]">
                            <span aria-hidden="true" className={
                                g.estado === 'ok' ? 'text-[var(--snaps-accent-green)]'
                                    : g.estado === 'falta' ? 'text-[var(--snaps-accent-yellow)]' : 'text-[var(--snaps-accent-slate)]'}>
                                {g.estado === 'ok' ? '✓' : g.estado === 'falta' ? '○' : '◌'}
                            </span>
                            {g.rotulo}{g.override ? ' (override)' : ''}
                            {g.estado === 'motor' && <span className="text-[var(--snaps-placeholder)]">(o motor confere)</span>}
                        </li>
                    ))}
                </ul>
            )}
    </>);

    const botoesDeAcao = (compacto: boolean) => {
        if (!atual) {
            return (
                <Chip cor={descartado ? 'var(--snaps-accent-orange)' : 'var(--snaps-accent-slate)'} testid="snapshot-somente-leitura">
                    {descartado ? 'Snapshot · tentativa desfeita' : 'Snapshot · somente leitura'}
                </Chip>
            );
        }
        if (!acoes.podeAgir) return compacto ? null : listaDeGates;
        return (
            <div data-testid="linha-de-acoes" className="flex flex-wrap items-center gap-2">
                {!compacto && listaDeGates}
                <div className="ml-auto flex flex-wrap items-center gap-2">
                {!compacto && faltam.length > 0 && resumo && !podeOverride && (
                    <span data-testid="aviso-do-override" className="text-xs text-[var(--snaps-text-secondary)]">{AVISO_DO_OVERRIDE}</span>
                )}
                {acoes.ehAdmin && ['micro_planning','plan_review'].includes(execucao.phase) && <button type="button" className={BOTAO_FANTASMA} onClick={() => revisarEscopo(false)}>Revisar escopo</button>}
                {acoes.pode('rollback') && alvo && (
                    <button type="button" className={BOTAO_FANTASMA} onClick={() => setConfirmarRollback(true)}
                        disabled={acoes.emAndamento !== null}>
                        {compacto ? 'Rollback' : `Rollback → ${alvo}`}
                    </button>
                )}
                {podeOverride && (
                    <button type="button" className={BOTAO_FANTASMA} onClick={abrirOverride}
                        disabled={acoes.emAndamento !== null}>
                        Override
                    </button>
                )}
                {!compacto && textoDeFaltam && (
                    <span className="text-xs text-[var(--snaps-accent-yellow)]">{textoDeFaltam}</span>
                )}
                {acoes.pode('avancar') && (
                    <button
                        type="button"
                        className={BOTAO_PRIMARIO}
                        onClick={avancar}
                        disabled={faltam.length > 0 || acoes.emAndamento !== null}
                        title={faltam.length > 0 && !podeOverride ? `${textoDeFaltam} · ${AVISO_DO_OVERRIDE}` : textoDeFaltam ?? undefined}
                    >
                        {acoes.emAndamento === 'avancar' ? 'Avançando…' : rotuloDoAvanco}
                    </button>
                )}
                {podeOverride && faltam.length > 0 && (
                    <button type="button" className={BOTAO_PRIMARIO} onClick={abrirOverride}
                        disabled={acoes.emAndamento !== null}>
                        {compacto ? 'Com override' : 'Avançar com override'}
                    </button>
                )}
                </div>
            </div>
        );
    };

    // A sessão de quem olha entra e sai do total em cache na hora, sem buscar.
    // Ao fechar, sai do resumo de todo nó em cache (o total é da árvore), e o
    // evento dela, que já está no total, não relê o `/resumo`.
    const chaveDoResumo = chaves.resumo(execucao.id);


    // Nó concluído: nada disto, para ninguém. Member e admin: o tempo da árvore
    // inteira, com Play/Pausa da própria sessão. Viewer: sem timer (não está
    // trabalhando na execução), só a lista "Sessões", para leitura, com o total.
    const tempoESessoes = atual && (acoes.podeAgir ? (
        <div className="flex items-center gap-1.5">
            <TimerDasSessoes sessoes={resumo?.sessoes}>
                <ExecutionTimer key={execucao.id} executionId={execucao.id} projectId={execucao.project_id}
                    embutido apenasControles />
            </TimerDasSessoes>
            <button type="button" className={BOTAO_FANTASMA} onClick={() => setModal('horas')}>Registrar horas</button>
            <button type="button" className={BOTAO_FANTASMA} onClick={() => setModal('sessoes')}>Sessões</button>
        </div>
    ) : (
        <button type="button" className={BOTAO_FANTASMA} onClick={() => setModal('sessoes')}>Sessões</button>
    ));

    const modais = (
        <>
            {escopoAberto && <ModalDoEscopoDeDespacho execution={escopoAberto.no} admin={acoes.ehAdmin} avancar={escopoAberto.avancar}
                onCancelar={() => setEscopoAberto(null)} onConfirmar={async no => {const deveAvancar=escopoAberto.avancar;setEscopoAberto(null);if(deveAvancar)await avancarDireto(no.lock_version);}} />}
            {confirmarRollback && alvo && <ConfirmacaoDeComando titulo="Confirmar rollback"
                texto={`Desfazer este nó e criar uma nova tentativa em ${alvo}? Este nó fica marcado com ↻ no History.`}
                comando="Confirmar rollback" onConfirmar={rollback} onCancelar={() => setConfirmarRollback(false)} />}
            {overrideAberto && (
                <DialogoDeOverride
                    fase={execucao.phase}
                    gates={gates}
                    recusadas={recusadas}
                    recusa={textoDaRecusa}
                    aplicando={acoes.emAndamento === 'override'}
                    erro={erroDoOverride}
                    onAplicar={aplicarOverride}
                    onCancelar={() => setOverrideAberto(false)}
                />
            )}
            {modal === 'sessoes' && (
                <SessionManagerModal
                    key={versaoDasSessoes}
                    executionId={execucao.id}
                    projectId={execucao.project_id}
                    onClose={() => setModal(null)}
                    onLogHours={acoes.podeAgir ? () => setModal('horas') : undefined}
                    somenteLeitura={!acoes.podeAgir}
                    tempo={resumo?.sessoes}
                    onChanged={() => cliente.invalidateQueries({ queryKey: chaveDoResumo })}
                />
            )}
            {acoes.podeAgir && (modal === 'horas' || modal === 'horas-finais') && (
                <TimeTrackingModal
                    partial={modal === 'horas'}
                    execution={execucao}
                    projectId={execucao.project_id}
                    availableCards={cards ?? []}
                    onClose={() => { setModal(null); setVersaoDasSessoes((v) => v + 1); }}
                    onSkip={() => setModal(null)}
                />
            )}
        </>
    );

    if (recolhido) {
        return (
            <header aria-label="Cabeçalho do nó" className="flex h-11 shrink-0 items-center gap-2.5 border-b border-white/10 pr-4 pl-6">
                <BotaoVoltar projectId={raiz.projectId} />
                <span className="text-sm font-bold whitespace-nowrap text-[var(--snaps-text-primary)]">{rotuloDaRaiz(raiz)}</span>
                <ChipDaIdentidade identidade={identidade} />
                <Chip cor={status.cor}>{status.texto}</Chip>
                <Chip cor={pedemAcao > 0 ? 'var(--snaps-accent-yellow)' : 'var(--snaps-accent-slate)'} testid="cards-no-cabecalho-recolhido">
                    {cards === null ? '… cards' : textoDosCards(cards.length, pedemAcao)}
                </Chip>
                <div className="grow" />
                {erroDoEscopo && <p role="alert" title={erroDoEscopo} className="max-w-xs truncate text-xs text-[var(--snaps-error)]">{erroDoEscopo}</p>}
                {botoesDeAcao(true)}
                <button type="button" aria-label="Expandir cabeçalho" title="Expandir cabeçalho" onClick={onAlternarRecolhido}
                    className="flex h-7 w-7 items-center justify-center rounded-md border border-white/10 bg-white/5 text-sm text-[var(--snaps-text-primary)]">
                    ▾
                </button>
                {modais}
            </header>
        );
    }

    return (
        <header aria-label="Cabeçalho do nó" className="flex shrink-0 flex-col gap-2.5 border-b border-white/10 px-6 pt-3.5 pb-3">
            <div className="flex items-center gap-4">
                <BotaoVoltar projectId={raiz.projectId} />
                <div className="flex min-w-0 grow items-baseline gap-2.5">
                    <h1 className="text-lg font-bold whitespace-nowrap text-[var(--snaps-text-primary)]">{rotuloDaRaiz(raiz)}</h1>
                    {raiz.alvo.length > 0 && (
                        <span className="truncate text-sm text-[var(--snaps-text-secondary)]">{raiz.alvo.join(', ')}</span>
                    )}
                    <span className="font-mono text-xs whitespace-nowrap text-[var(--snaps-text-secondary)]">raiz {idCurto(raiz.rootId)}</span>
                </div>
                {botoesDeAcao(false)}
                <button type="button" aria-label="Recolher cabeçalho" title="Recolher cabeçalho" onClick={onAlternarRecolhido}
                    className="flex h-7 w-7 items-center justify-center rounded-md border border-white/10 bg-white/5 text-sm text-[var(--snaps-text-primary)]">
                    ▴
                </button>
            </div>


            <div className="flex flex-wrap items-center gap-2">
                <ChipDaIdentidade identidade={identidade} />
                <Chip cor={status.cor} testid="status-do-no">{status.texto}</Chip>
                {execucao.agent_name && (
                    <span className="font-mono text-xs text-[var(--snaps-text-secondary)]">{execucao.agent_name}</span>
                )}
                {gates.length > 0 && (
                    <span className="text-xs text-[var(--snaps-text-secondary)]">· Gates {ok} de {gates.length}</span>
                )}
                <span className="text-[var(--snaps-placeholder)]">·</span>
                <UltimaChamadaAoSnaps
                    execucaoId={execucao.id}
                    emAndamento={execucao.status === 'in_progress'}
                    terminal={terminal || descartado}
                    ultimoEventoEm={ultimoEventoEm}
                />
                <div className="grow" />
                {tempoESessoes}
            </div>


            {atual && textoDaRecusa && dispensada[execucao.id] !== textoDaRecusa && (
                <div role="alert" className="flex flex-col gap-2 rounded-xl border border-[var(--snaps-error)]/30 bg-[var(--snaps-error)]/10 px-3 py-2 text-xs text-[var(--snaps-error)]">
                    <p className="whitespace-pre-wrap">{textoDaRecusa}</p>
                    <button type="button" aria-label="Dispensar" onClick={() => setDispensada(a => ({...a,[execucao.id]:textoDaRecusa!}))}>×</button>

                    {recusadas.length > 0 && (
                        <p data-testid="condicoes-recusadas" className="text-[var(--snaps-text-primary)]">
                            Condições recusadas: {recusadas.map(rotuloDoGate).join(', ')}
                        </p>
                    )}
                    <div className="flex flex-wrap items-center gap-2">
                        {recusaSemGate && (
                            <>
                                <span className="text-[var(--snaps-text-secondary)]">
                                    Isto não é um gate: o nó mudou ou já avançou. Recarregue para ver o estado atual.
                                </span>
                                <button type="button" className={BOTAO_FANTASMA} onClick={recarregar}>Recarregar</button>
                            </>
                        )}
                        {recusadas.length > 0 && acoes.podeAgir && (podeOverride ? (
                            <button type="button" className={BOTAO_FANTASMA} onClick={abrirOverride}
                                disabled={acoes.emAndamento !== null}>
                                Override das recusadas
                            </button>
                        ) : (
                            <span className="text-[var(--snaps-text-secondary)]">{AVISO_DO_OVERRIDE}</span>
                        ))}
                    </div>
                </div>
            )}
            {atual && !recusaDoNo && typeof registroDoMotor.info === 'string' && (
                <p className="rounded-xl border border-[var(--snaps-accent-blue)]/30 bg-[var(--snaps-accent-blue)]/10 px-3 py-2 text-xs whitespace-pre-wrap text-[var(--snaps-accent-blue)]">
                    {registroDoMotor.info}
                </p>
            )}

            <FaixaDeCards recolhida={props.faixaDeCardsRecolhida} onAlternar={props.onAlternarFaixaDeCards} cards={cards} pendencias={resumo?.pendencias ?? []} filtro={filtroDeCard} onFiltrar={onFiltrarCard} />
            {erroDoEscopo && <p role="alert" className="text-xs text-[var(--snaps-error)]">{erroDoEscopo}</p>}
            {modais}
        </header>
    );
}
