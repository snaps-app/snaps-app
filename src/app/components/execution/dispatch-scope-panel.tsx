import { useMemo, useState } from 'react';
import { Loader2, ListChecks } from 'lucide-react';
import { setDispatchScope } from '@/services/agentExecutions';
import type { AgentTaskExecution } from '@/services/types';
import { escopoDaExecucao } from './dispatch-scope';

interface DispatchScopePanelProps {
    execution: AgentTaskExecution;
    onExecutionUpdated: (execution: AgentTaskExecution) => void;
}

const ATIVOS = new Set(['pending', 'in_progress', 'awaiting_advance']);

const erroDaApi = (err: any): string =>
    err?.response?.data?.detail
        ? String(err.response.data.detail)
        : 'Nao foi possivel gravar o escopo de despacho.';

/**
 * Escopo de despacho (SNA-SUP-81): o humano escolhe quais planos ESTA rodada
 * executa, sem mexer no status global dos planos da sprint. O escopo e herdado
 * pela arvore, entao o plan_review e o fan-out da execution leem a mesma
 * escolha. Quem pode definir e a API que decide (humano admin); aqui so se
 * envia a intencao e se mostra a recusa como veio.
 */
export const DispatchScopePanel: React.FC<DispatchScopePanelProps> = ({ execution, onExecutionUpdated }) => {
    const escopo = escopoDaExecucao(execution.context_data);
    // O micro_planning que nasce do macro herda o plano ESTRATEGICO como
    // plan_id e ainda nao executa plano nenhum: e ali que se escolhe a rodada.
    const planoAtual = (execution.context_data?.plans || []).find((p: any) => p.id === execution.plan_id);
    const rodaPlanoTatico = Boolean(execution.plan_id) && planoAtual?.author !== 'macro-planner';
    const editavel = !rodaPlanoTatico && ATIVOS.has(execution.status);
    const [marcados, setMarcados] = useState<string[]>([]);
    const [motivo, setMotivo] = useState('');
    const [motivoLimpar, setMotivoLimpar] = useState('');
    const [salvando, setSalvando] = useState(false);
    const [erro, setErro] = useState<string | null>(null);

    const candidatos = useMemo(() => (execution.context_data?.plans || []).filter((p: any) =>
        p.author !== 'macro-planner' && ['selected', 'approved'].includes(p.status),
    ), [execution.context_data]);

    if (!escopo && !editavel) return null;

    const enviar = async (planIds: string[], texto: string) => {
        setSalvando(true);
        setErro(null);
        try {
            const atualizada = await setDispatchScope(execution.id, planIds, texto.trim(), execution.lock_version);
            setMarcados([]);
            setMotivo('');
            setMotivoLimpar('');
            onExecutionUpdated(atualizada);
        } catch (err) {
            setErro(erroDaApi(err));
        } finally {
            setSalvando(false);
        }
    };

    const alternar = (id: string) =>
        setMarcados(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

    return (
        <div className="mb-4 p-3 rounded-xl bg-sky-500/[0.06] border border-sky-500/20 space-y-3">
            <div className="flex items-center gap-2">
                <ListChecks className="w-3.5 h-3.5 text-sky-300" />
                <p className="text-[9px] font-bold text-sky-200/80 uppercase tracking-[0.2em]">Escopo de despacho</p>
            </div>

            {escopo ? (
                <div data-testid="dispatch-scope-banner" className="space-y-1.5 text-[10px] text-white/60">
                    <p className="text-white/80">
                        Esta rodada executa so: {escopo.plans.map(p => p.title || p.id).join(', ')}
                        {' '}({escopo.card_ids.length} cards)
                    </p>
                    {escopo.deferred_plans.length > 0 && (
                        <p>
                            <span className="text-amber-300/80">Adiados (nao despachados):</span>{' '}
                            {escopo.deferred_plans.map(p => p.title || p.id).join(', ')}
                        </p>
                    )}
                    <p>Motivo: <span className="text-white/80">{escopo.reason}</span></p>
                    <p className="text-white/40">
                        Definido por {escopo.set_by?.actor_id ?? '?'}
                        {escopo.set_at ? ` em ${new Date(escopo.set_at).toLocaleString()}` : ''}
                        {escopo.phase ? ` (fase ${escopo.phase})` : ''}
                    </p>
                    {escopo.plans.some(p => p.approval && p.approval !== 'current') && (
                        <p className="text-amber-300/80">
                            Aprovacao desatualizada na escolha:{' '}
                            {escopo.plans.filter(p => p.approval !== 'current').map(p => p.title).join(', ')}.
                            O gate de aprovacao cobra no avanco.
                        </p>
                    )}
                    {editavel && (
                        <div className="flex gap-2 pt-1">
                            <input
                                aria-label="Motivo para limpar"
                                value={motivoLimpar}
                                onChange={e => setMotivoLimpar(e.target.value)}
                                placeholder="Motivo para voltar a selecao da sprint"
                                className="flex-1 h-7 px-2 rounded-lg bg-white/[0.03] border border-white/10 text-[10px] text-white/70"
                            />
                            <button
                                onClick={() => enviar([], motivoLimpar)}
                                disabled={salvando || !motivoLimpar.trim()}
                                className="h-7 px-2 rounded-lg bg-white/5 border border-white/10 text-[9px] font-bold uppercase text-white/50 hover:text-white disabled:opacity-40"
                            >
                                Limpar escopo
                            </button>
                        </div>
                    )}
                </div>
            ) : (
                <div className="space-y-2">
                    <p className="text-[10px] text-white/40">
                        Sem escopo, a arvore despacha todos os planos selected da sprint. Escolha os desta rodada;
                        os demais ficam adiados, com status e aprovacao intactos.
                    </p>
                    {candidatos.length === 0 && (
                        <p className="text-[10px] text-white/30 italic">Nenhum plano tatico selected ou approved.</p>
                    )}
                    {candidatos.map((p: any) => {
                        const desatualizada = p.approved_content_hash
                            && p.approved_revision != null && p.approved_revision !== p.content_revision;
                        return (
                            <label key={p.id} className="flex items-center gap-2 text-[10px] text-white/70 cursor-pointer">
                                <input
                                    type="checkbox"
                                    aria-label={p.title}
                                    checked={marcados.includes(p.id)}
                                    onChange={() => alternar(p.id)}
                                />
                                <span>{p.title}</span>
                                <span className="text-white/30">({p.status})</span>
                                {!p.approved_content_hash ? (
                                    <span className="text-amber-300/80">sem aprovacao</span>
                                ) : desatualizada ? (
                                    <span className="text-amber-300/80">aprovacao desatualizada (rev {p.approved_revision} de {p.content_revision})</span>
                                ) : (
                                    <span className="text-emerald-300/70">aprovado rev {p.approved_revision}</span>
                                )}
                            </label>
                        );
                    })}
                    <textarea
                        aria-label="Motivo do escopo"
                        value={motivo}
                        onChange={e => setMotivo(e.target.value)}
                        placeholder="Motivo (obrigatorio): ex. executar somente TP-1 e TP-2 nesta rodada"
                        className="w-full h-14 p-2 rounded-lg bg-white/[0.03] border border-white/10 text-[10px] text-white/70 resize-none"
                    />
                    <button
                        onClick={() => enviar(marcados, motivo)}
                        disabled={salvando || marcados.length === 0 || !motivo.trim()}
                        className="w-full h-8 rounded-lg bg-sky-600/80 hover:bg-sky-500 text-white text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-2 disabled:opacity-40"
                    >
                        {salvando && <Loader2 className="w-3 h-3 animate-spin" />}
                        Definir escopo
                    </button>
                </div>
            )}

            {erro && (
                <p role="alert" className="text-[10px] text-red-400 whitespace-pre-wrap">{erro}</p>
            )}
        </div>
    );
};
