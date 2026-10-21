/**
 * Aba Test plans: os roteiros do nó com "registrar resultado" e o relatório de
 * problemas do Cockpit atual (TroublePanel), com a seleção de test plans para o
 * contexto do próximo planejamento.
 */
import { useState } from 'react';
import { getExecutionTroubleReport, getTestPlans } from '@/services/testPlans';
import { TroublePanel } from '@/app/components/execution/trouble-panel';
import { EstadoDaConsulta, Secao, Vazio, podeEscrever, useConteudoDaAba, type PropsDaAba } from './comum';

const ROTULO: Record<string, string> = { draft: 'Rascunho', active: 'Ativo', passed: 'Passou', failed: 'Falhou' };

export default function AbaTestPlans(props: PropsDaAba) {
    const { execucao, acoes } = props;
    const consulta = useConteudoDaAba(props, 'testplans', async () => {
        const [testPlans, relatorio] = await Promise.all([
            getTestPlans(execucao.project_id, execucao.sprint_ids?.[0], execucao.id),
            getExecutionTroubleReport(execucao.id),
        ]);
        return { testPlans, relatorio };
    });
    const [copiado, setCopiado] = useState<string | null>(null);
    const escreve = podeEscrever(props);
    const salvando = acoes.emAndamento === 'salvarSelecaoDeTestPlans';

    return (
        <EstadoDaConsulta carregando={consulta.isLoading} erro={consulta.error}>
            <div className="space-y-8">
                <Secao titulo="Roteiros">
                    {(consulta.data?.testPlans ?? []).length === 0 ? (
                        <Vazio>O roteiro do PO nasce na assurance.</Vazio>
                    ) : (
                        <ul className="space-y-2">
                            {consulta.data!.testPlans.map((tp) => (
                                <li key={tp.id} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                                    <span className="flex-1 truncate text-xs text-[var(--snaps-text-primary)]">{tp.title}</span>
                                    <span className="text-[10px] font-bold uppercase text-[var(--snaps-text-secondary)]">
                                        {ROTULO[tp.status] ?? tp.status}
                                    </span>
                                    {escreve && tp.status === 'active' && (
                                        <>
                                            <button type="button"
                                                onClick={() => acoes.acoes.registrarResultadoDeTestPlan(tp.id, 'passed')}
                                                className="rounded-lg border border-white/10 px-3 py-1 text-[10px] font-bold text-[var(--snaps-success)]">
                                                Passou
                                            </button>
                                            <button type="button"
                                                onClick={() => acoes.acoes.registrarResultadoDeTestPlan(tp.id, 'failed')}
                                                className="rounded-lg border border-white/10 px-3 py-1 text-[10px] font-bold text-[var(--snaps-error)]">
                                                Falhou
                                            </button>
                                        </>
                                    )}
                                </li>
                            ))}
                        </ul>
                    )}
                </Secao>
                <TroublePanel
                    troubleReport={consulta.data?.relatorio}
                    copiedId={copiado}
                    handleCopy={(id, texto) => {
                        navigator.clipboard?.writeText(texto);
                        setCopiado(id);
                    }}
                    selectedTestPlanIds={execucao.context_data?.selected_test_plan_ids ?? []}
                    isSavingTestPlanContext={salvando}
                    onSaveTestPlanContext={escreve
                        ? (ids) => acoes.acoes.salvarSelecaoDeTestPlans(ids).then(() => undefined)
                        : undefined}
                />
            </div>
        </EstadoDaConsulta>
    );
}
