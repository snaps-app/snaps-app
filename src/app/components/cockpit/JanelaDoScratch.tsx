import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getAgentExecution } from '@/services/agentExecutions';
import { chavesDeConsulta as chaves } from '@/services/chavesDeConsulta';
import type { AgentTaskExecution } from '@/services/types';
import { AbaDeRaiz } from './navegacao/AbaDeRaiz';
import { useAcoesDoNo } from './superficie/useAcoesDoNo';
import AbaScratch from './superficie/abas/AbaScratch';
import { EstadoDaConsulta } from './superficie/abas/comum';

/**
 * A rota fica fora do `MainLayout` e, portanto, do `ProjectRoleProvider` dele:
 * sem o papel do projeto DESTA execução, `can()` responde `false` e nem member
 * edita. O papel vem do projeto da execução carregada, não do parâmetro da URL.
 */
export default function JanelaDoScratch() {
    const {executionId = ''} = useParams();
    const consulta = useQuery({queryKey: chaves.detalhe(executionId), queryFn: () => getAgentExecution(executionId), enabled: !!executionId});
    return <main className="flex h-screen flex-col bg-[var(--snaps-bg)] p-4 text-[var(--snaps-text-primary)]">
        <h1>Scratch da árvore</h1>
        <EstadoDaConsulta carregando={consulta.isLoading} erro={consulta.error}>
            {consulta.data && (
                <AbaDeRaiz projectId={consulta.data.project_id}>
                    <ScratchComPapel execucao={consulta.data} />
                </AbaDeRaiz>
            )}
        </EstadoDaConsulta>
    </main>;
}

function ScratchComPapel({ execucao }: { execucao: AgentTaskExecution }) {
    const acoes = useAcoesDoNo(execucao);
    return <AbaScratch execucao={execucao} somenteLeitura={false} ativa acoes={acoes} onSelecionarAba={() => {}} />;
}
