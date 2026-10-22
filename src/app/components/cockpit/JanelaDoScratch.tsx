import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getAgentExecution } from '@/services/agentExecutions';
import { chavesDeConsulta as chaves } from '@/services/chavesDeConsulta';
import { useAcoesDoNo } from './superficie/useAcoesDoNo';
import AbaScratch from './superficie/abas/AbaScratch';
import { EstadoDaConsulta } from './superficie/abas/comum';

export default function JanelaDoScratch() {
    const {executionId = ''} = useParams();
    const consulta = useQuery({queryKey: chaves.detalhe(executionId), queryFn: () => getAgentExecution(executionId), enabled: !!executionId});
    const acoes = useAcoesDoNo(consulta.data ?? null);
    return <main className="flex h-screen flex-col bg-[var(--snaps-bg)] p-4 text-[var(--snaps-text-primary)]">
        <h1>Scratch da árvore</h1>
        <EstadoDaConsulta carregando={consulta.isLoading} erro={consulta.error}>
            {consulta.data && <AbaScratch execucao={consulta.data} somenteLeitura={false} ativa acoes={acoes} onSelecionarAba={() => {}} />}
        </EstadoDaConsulta>
    </main>;
}
