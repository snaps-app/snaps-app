/**
 * Aba Plano: os planos do nó (PlanPanel do Cockpit atual), aprovar e pedir
 * ajuste pelas ações do nó, e o escopo de despacho para admin (11b).
 */
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getAgentExecution } from '@/services/agentExecutions';
import { chavesDeConsulta as chaves } from '@/services/chavesDeConsulta';
import type { AgentTaskExecution } from '@/services/types';
import { PlanPanel } from '@/app/components/execution/plan-panel';
import { DispatchScopePanel } from '@/app/components/execution/dispatch-scope-panel';
import { useCockpitPlans } from '@/app/components/execution/useCockpitPlans';
import { EstadoDaConsulta, Secao, podeEscrever, useConteudoDaAba, type PropsDaAba } from './comum';

export default function AbaPlano(props: PropsDaAba) {
    const { execucao, acoes, onSelecionarAba } = props;
    const cliente = useQueryClient();
    const chave = chaves.aba(execucao.id, 'plano');
    const consulta = useConteudoDaAba(props, 'plano', () => getAgentExecution(execucao.id));
    const no = consulta.data ?? null;
    const [copiado, setCopiado] = useState<string | null>(null);
    const [erro, setErro] = useState<string | null>(null);

    const definirNo: React.Dispatch<React.SetStateAction<AgentTaskExecution | null>> = (valor) => {
        cliente.setQueryData<AgentTaskExecution | null>(chave, (atual) =>
            typeof valor === 'function' ? valor(atual ?? null) : valor);
    };
    const planos: any[] = no?.context_data?.plans ?? [];
    const planoAtual = planos.find((p) => p.id === no?.plan_id) ?? null;
    const edicao = useCockpitPlans(no, definirNo, false, planoAtual);
    const escreve = podeEscrever(props);

    const comErro = (acao: () => Promise<unknown>) => async () => {
        setErro(null);
        try {
            await acao();
        } catch (e: any) {
            setErro(e?.response?.data?.detail ?? e?.message ?? String(e));
        }
    };
    const plano = (id: string) => planos.find((p) => p.id === id) ?? { id };

    return (
        <EstadoDaConsulta carregando={consulta.isLoading} erro={consulta.error}>
            {no && (
                <div className="space-y-6">
                    {erro && <p role="alert" className="text-xs text-[var(--snaps-error)]">{erro}</p>}
                    <PlanPanel
                        execution={no}
                        sprints={[]}
                        isSequential={false}
                        currentPlan={planoAtual}
                        isPlanWaiting={edicao.isPlanWaiting}
                        isEditingPlan={edicao.isEditingPlan}
                        setIsEditingPlan={edicao.setIsEditingPlan}
                        editingPlanId={edicao.editingPlanId}
                        setEditingPlanId={edicao.setEditingPlanId}
                        planContent={edicao.planContent}
                        setPlanContent={edicao.setPlanContent}
                        planTitle={edicao.planTitle}
                        setPlanTitle={edicao.setPlanTitle}
                        isSavingPlan={edicao.isSavingPlan}
                        handleSavePlan={edicao.handleSavePlan}
                        handleEditPlan={edicao.handleEditPlan}
                        handleCopy={(id, texto) => {
                            navigator.clipboard?.writeText(texto);
                            setCopiado(id);
                        }}
                        copiedId={copiado}
                        handleOpenPeerReview={async () => onSelecionarAba('revisoes')}
                        updatePlanStatus={(id, status) => comErro(() => acoes.acoes.mudarStatusDoPlano(plano(id), status))()}
                        reapprovePlan={(id) => comErro(() => acoes.acoes.aprovarPlano(plano(id)))()}
                        deletePlanFn={(id) => edicao.deletePlanFn(id, getAgentExecution)}
                        somenteLeitura={!escreve}
                    />
                    {escreve && acoes.ehAdmin && (
                        <Secao titulo="Escopo de despacho">
                            <DispatchScopePanel
                                execution={no}
                                onExecutionUpdated={(atualizada) => {
                                    definirNo(atualizada);
                                    cliente.invalidateQueries({ queryKey: chaves.resumo(execucao.id) });
                                }}
                            />
                        </Secao>
                    )}
                </div>
            )}
        </EstadoDaConsulta>
    );
}
