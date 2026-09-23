import { useCallback, useEffect, useState } from 'react';
import { Loader2, X } from 'lucide-react';
import type { AgentTaskExecution } from '@/services/types';
import { syncAgentExecution } from '@/services/agentExecutions';
import {
    getExecutionContextSelection,
    listasSemItem,
    type ItemDeContexto,
    type OrigemDeContexto,
    type SelecaoDeContexto,
} from '@/services/contextSelection';

const ROTULO_ORIGEM: Record<OrigemDeContexto, string> = {
    workflow: 'workflow',
    herdado: 'herdado',
    neuron: 'neuron',
    humano: 'humano',
    agente: 'agente',
    nao_verificada: 'sem autoria',
};

const COR_ORIGEM: Record<OrigemDeContexto, string> = {
    workflow: 'bg-white/5 text-white/40',
    herdado: 'bg-sky-500/10 text-sky-300',
    neuron: 'bg-violet-500/10 text-violet-300',
    humano: 'bg-emerald-500/10 text-emerald-300',
    agente: 'bg-amber-500/10 text-amber-300',
    nao_verificada: 'bg-red-500/10 text-red-300',
};

const ROTULO_TIPO: Record<ItemDeContexto['tipo'], string> = {
    card: 'Card',
    sprint: 'Sprint',
    plan: 'Plano',
    governance_doc: 'Doc',
    decision: 'ADR',
    test_plan: 'Test plan',
    snap: 'Snap',
};

const Origem: React.FC<{ origem: OrigemDeContexto }> = ({ origem }) => (
    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${COR_ORIGEM[origem] ?? COR_ORIGEM.nao_verificada}`}>
        {ROTULO_ORIGEM[origem] ?? origem}
    </span>
);

interface Props {
    execution: AgentTaskExecution;
    onExecutionUpdated: (execution: AgentTaskExecution) => void;
}

/**
 * Revisao da selecao proposta antes do dispatch (E5-e, D49, Interface U42).
 *
 * Mostra a camada de descoberta com a origem de cada item e deixa remover um
 * item. Acrescentar continua pelo modal de Docs. O mission_context NAO mora
 * aqui: tem campo proprio, vazio por default ("ausencia e o estado normal").
 */
export const ContextSelectionReview: React.FC<Props> = ({ execution, onExecutionUpdated }) => {
    const [selecao, setSelecao] = useState<SelecaoDeContexto | null>(null);
    const [removendo, setRemovendo] = useState<string | null>(null);
    const [erro, setErro] = useState<string | null>(null);

    const carregar = useCallback(async () => {
        try {
            setSelecao(await getExecutionContextSelection(execution.id));
            setErro(null);
        } catch {
            setErro('Nao foi possivel ler a selecao de contexto.');
        }
    }, [execution.id]);

    useEffect(() => {
        carregar();
    }, [carregar, execution.lock_version]);

    const remover = async (item: ItemDeContexto) => {
        if (!selecao) return;
        const { docIds, decisionIds, testPlanIds, rejectedSnapIds } = listasSemItem(
            selecao.camadas.descoberta, item, selecao.snaps_recusados,
        );
        setRemovendo(item.id);
        try {
            const atualizada = await syncAgentExecution(
                execution.id, undefined, docIds, decisionIds, testPlanIds,
                execution.lock_version, rejectedSnapIds,
            );
            onExecutionUpdated(atualizada);
        } catch {
            setErro('A remocao foi recusada. Atualize a execucao e tente de novo.');
        } finally {
            setRemovendo(null);
        }
    };

    if (!selecao) {
        return erro ? <p className="text-[10px] text-red-300/70">{erro}</p> : null;
    }

    const { descoberta } = selecao.camadas;

    return (
        <div className="pt-4 space-y-3" data-testid="context-selection-review">
            <div className="flex items-center justify-between">
                <p className="text-[10px] font-bold text-white/40 uppercase tracking-[0.2em]">Contexto descoberto</p>
                {!selecao.revisavel && (
                    <span className="text-[9px] text-white/30">ja despachada: so leitura</span>
                )}
            </div>

            {descoberta.length === 0 ? (
                <p className="text-[11px] text-white/30">Nenhum doc, ADR ou test plan selecionado.</p>
            ) : (
                <ul className="space-y-1.5">
                    {descoberta.map(item => (
                        <li key={`${item.tipo}:${item.id}`}
                            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.02] border border-white/5">
                            <span className="text-[9px] text-white/30 w-14 shrink-0">{ROTULO_TIPO[item.tipo]}</span>
                            <span className="flex-1 min-w-0 truncate text-[11px] text-white/70" title={item.id}>
                                {item.titulo || item.id}
                            </span>
                            <Origem origem={item.origem} />
                            {selecao.revisavel && (
                                <button
                                    type="button"
                                    onClick={() => remover(item)}
                                    disabled={removendo !== null}
                                    aria-label={`Remover ${item.titulo || item.id}`}
                                    className="p-1 rounded text-white/30 hover:text-red-300 hover:bg-red-500/10 disabled:opacity-40"
                                >
                                    {removendo === item.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <X className="w-3 h-3" />}
                                </button>
                            )}
                        </li>
                    ))}
                </ul>
            )}

            {selecao.handoff.length > 0 && (
                <div className="space-y-1.5">
                    <p className="text-[10px] font-bold text-white/40 uppercase tracking-[0.2em]">Handoff (nao e Mission Context)</p>
                    {selecao.handoff.map((h, i) => (
                        <div key={i} className="px-3 py-2 rounded-lg bg-amber-500/[0.03] border border-amber-500/10 space-y-1">
                            <Origem origem={h.origem} />
                            <p className="text-[11px] text-white/60 whitespace-pre-wrap">{h.texto}</p>
                        </div>
                    ))}
                </div>
            )}

            {selecao.omitted.length > 0 && (
                <p className="text-[10px] text-white/30">
                    Fora do prompt por orcamento: {selecao.omitted.map(o => o.secao).join(', ')}
                </p>
            )}
            {erro && <p className="text-[10px] text-red-300/70">{erro}</p>}
        </div>
    );
};
