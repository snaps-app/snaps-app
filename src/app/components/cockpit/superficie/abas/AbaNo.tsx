/**
 * Aba Nó: a seção Agente (instruções e capacidades, antes modais — 11b), as
 * condições humanas e pedidos pendentes do nó, e a auditoria (TP-1).
 *
 * A fase vem do `workflow_snapshot` do nó, por prop (`fasesDoNo`, TP-1), nunca
 * do catálogo: esta aba não consulta os templates de workflow (P7, F3).
 */
import { useQuery } from '@tanstack/react-query';
import { getAgents } from '@/services/governance';
import { chavesDeConsulta as chaves } from '@/services/chavesDeConsulta';
import { getResumoDoNo } from '@/services/resumoDoNo';
import { InstrucoesDoAgente } from '@/app/components/execution/agent-instructions-modal';
import { CapacidadesDaFase } from '@/app/components/execution/agent-capabilities-modal';
import { EstadoDaConsulta, Secao, useConteudoDaAba, type PropsDaAba } from './comum';

const nomeLimpo = (nome?: string | null) => (nome ?? '').replace(/^@/, '');

export default function AbaNo(props: PropsDaAba) {
    const { execucao, fase, auditoria } = props;
    const consulta = useConteudoDaAba(props, 'no', async () => {
        const [globais, doProjeto] = await Promise.all([getAgents(), getAgents(execucao.project_id)]);
        const alvo = nomeLimpo(execucao.agent_name);
        const agente = [...doProjeto, ...globais].find((a) => nomeLimpo(a.name) === alvo);
        return { instrucoes: agente?.instructions ?? null };
    });
    // A mesma chave da Superfície: vem do cache, sem chamada nova.
    const resumo = useQuery({
        queryKey: chaves.resumo(execucao.id),
        queryFn: () => getResumoDoNo(execucao.id),
        enabled: props.ativa,
        ...(props.somenteLeitura ? { staleTime: Infinity } : {}),
    });
    const doNo = (resumo.data?.pendencias ?? []).filter((p) => p.aba === 'no');

    return (
        <div className="space-y-8">
            {doNo.length > 0 && (
                <Secao titulo="Esperando você">
                    <ul className="space-y-1">
                        {doNo.map((p) => (
                            <li key={`${p.tipo}:${p.recurso_id}:${p.acao}`}
                                className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-[var(--snaps-accent-amber)]">
                                {p.acao}
                            </li>
                        ))}
                    </ul>
                </Secao>
            )}
            <Secao titulo="Agente">
                <p className="text-xs text-[var(--snaps-text-primary)]">
                    {execucao.agent_name}
                    <span className="text-[var(--snaps-text-secondary)]"> · {fase?.label ?? fase?.key ?? execucao.phase}</span>
                </p>
                <EstadoDaConsulta carregando={consulta.isLoading} erro={consulta.error}>
                    <div className="max-h-[40vh] overflow-y-auto rounded-xl border border-white/10 bg-white/5 p-4 select-text">
                        <InstrucoesDoAgente agentInstructions={consulta.data?.instrucoes ?? null} />
                    </div>
                </EstadoDaConsulta>
                {fase ? (
                    <div className="space-y-6">
                        <CapacidadesDaFase fase={fase} />
                    </div>
                ) : (
                    <p className="text-[11px] text-[var(--snaps-text-secondary)]">
                        Tools e skills da fase aparecem com o snapshot do nó.
                    </p>
                )}
                <p className="text-[11px] text-[var(--snaps-text-secondary)]">
                    Skills ativadas: não registrado nesta versão.
                </p>
            </Secao>
            {auditoria && <Secao titulo="Auditoria">{auditoria}</Secao>}
        </div>
    );
}
