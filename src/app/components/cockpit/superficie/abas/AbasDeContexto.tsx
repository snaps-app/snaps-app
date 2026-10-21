/**
 * Contexto e Prompt, que no Cockpit atual moram na sidebar (11b).
 *
 * - Contexto: a seleção revisável (`context-selection-review.tsx`) e o mission
 *   context. O mission context só é gravado por humano (D84): o agente não
 *   escreve aqui.
 * - Prompt: `execution-prompt-snapshot.tsx`. "Marcar a entrada como executada"
 *   deixa de ser estado local e vira a transição `pending → in_progress` (F24).
 */
import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getAgentExecution } from '@/services/agentExecutions';
import { chavesDeConsulta as chaves } from '@/services/chavesDeConsulta';
import { ContextSelectionReview } from '@/app/components/execution/context-selection-review';
import { ExecutionPromptSnapshot } from '@/app/components/execution/execution-prompt-snapshot';
import { EstadoDaConsulta, Secao, podeEscrever, useConteudoDaAba, type PropsDaAba } from './comum';

export function AbaContexto(props: PropsDaAba) {
    const { execucao, acoes } = props;
    const cliente = useQueryClient();
    const consulta = useConteudoDaAba(props, 'contexto', () => getAgentExecution(execucao.id));
    const escreve = podeEscrever(props);
    // `mission_context` é `{texto, origem, autor_id, …}`; texto legado vem como string.
    const mc = consulta.data?.context_data?.mission_context;
    const gravado: string = (typeof mc === 'string' ? mc : mc?.texto) ?? '';
    const [rascunho, setRascunho] = useState(gravado);
    const [erro, setErro] = useState<string | null>(null);
    useEffect(() => setRascunho(gravado), [gravado]);

    const salvar = async () => {
        setErro(null);
        try {
            await acoes.acoes.salvarContexto({ missionContext: rascunho });
        } catch (e: any) {
            setErro(e?.response?.data?.detail ?? e?.message ?? String(e));
        }
    };

    return (
        <EstadoDaConsulta carregando={consulta.isLoading} erro={consulta.error}>
            {consulta.data && (
                <div className="space-y-8">
                    <Secao titulo="Mission context">
                        {escreve ? (
                            <div className="space-y-2">
                                <textarea
                                    aria-label="Mission context"
                                    value={rascunho}
                                    onChange={(e) => setRascunho(e.target.value)}
                                    rows={5}
                                    className="w-full resize-y rounded-xl border border-white/10 bg-white/5 p-3 text-xs text-[var(--snaps-text-primary)] focus:outline-none"
                                />
                                <div className="flex items-center justify-end gap-3">
                                    {erro && <span role="alert" className="text-[10px] text-[var(--snaps-error)]">{erro}</span>}
                                    <button type="button" onClick={salvar}
                                        disabled={rascunho === gravado || acoes.emAndamento === 'salvarContexto'}
                                        className="rounded-lg border border-white/10 bg-white/10 px-3 py-1.5 text-[10px] font-bold text-[var(--snaps-text-primary)] disabled:opacity-40">
                                        Salvar mission context
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <p className="select-text whitespace-pre-wrap text-xs text-[var(--snaps-text-secondary)]">
                                {gravado || 'Sem mission context.'}
                            </p>
                        )}
                    </Secao>
                    <ContextSelectionReview
                        execution={consulta.data}
                        somenteLeitura={!escreve}
                        onExecutionUpdated={(atualizada) => {
                            cliente.setQueryData(chaves.aba(execucao.id, 'contexto'), atualizada);
                            cliente.invalidateQueries({ queryKey: chaves.resumo(execucao.id) });
                            cliente.invalidateQueries({ queryKey: chaves.aba(execucao.id, 'prompt') });
                        }}
                    />
                </div>
            )}
        </EstadoDaConsulta>
    );
}

export function AbaPrompt(props: PropsDaAba) {
    const { execucao, acoes } = props;
    const consulta = useConteudoDaAba(props, 'prompt', () => getAgentExecution(execucao.id));
    const escreve = podeEscrever(props);
    const no = consulta.data;

    return (
        <EstadoDaConsulta carregando={consulta.isLoading} erro={consulta.error}>
            {no && (
                <ExecutionPromptSnapshot
                    execution={no}
                    entryReviewed={!escreve || no.status !== 'pending'}
                    setEntryReviewed={(valor) => {
                        if (valor && acoes.pode('marcarEntradaExecutada')) void acoes.acoes.marcarEntradaExecutada();
                    }}
                    handleRefresh={escreve ? () => acoes.acoes.salvarContexto({}).then(() => undefined) : undefined}
                    isRefreshing={acoes.emAndamento === 'salvarContexto'}
                />
            )}
        </EstadoDaConsulta>
    );
}
