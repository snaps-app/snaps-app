import { Navigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getAgentExecution } from '@/services/agentExecutions';
import { chavesDeConsulta } from '@/services/chavesDeConsulta';
import { rotaDoNo } from '@/services/cockpitRota';

const status = (erro: unknown) => (erro as { response?: { status?: number } } | null)?.response?.status;

/**
 * Rota antiga do Cockpit -> rota nova, com o nó certo aberto (decisão do PO de
 * 20/10: sem flag, e nenhum link salvo pode quebrar).
 *
 * A rota antiga não sabe a raiz, então busca a execução para ler o `root_id`.
 * `/scratch` vira `aba=scratch`. Quem liga isto às rotas antigas é a integração
 * do TP-4, numa task só, para a `sprint-24.0` nunca ficar sem Cockpit.
 *
 * Fica fora de `components/cockpit/`: é importado estaticamente pelo router, e
 * importar `cockpit/` estático puxaria o Cockpit para o chunk principal.
 */
export function RedirecionaParaCockpit({ aba }: { aba?: string }) {
    const { executionId = '' } = useParams<{ executionId: string }>();
    const { data, error, isPending } = useQuery({
        queryKey: chavesDeConsulta.detalhe(executionId),
        queryFn: () => getAgentExecution(executionId),
        enabled: !!executionId,
    });

    if (data) return <Navigate to={rotaDoNo(data, aba)} replace />;
    if (isPending && executionId) {
        return <div role="status" aria-label="Abrindo o Cockpit" className="min-h-screen" style={{ backgroundColor: 'var(--snaps-bg)' }} />;
    }
    // 404 é "sem acesso ou inexistente" (ADR-0033): a tela não distingue os dois.
    const semAcesso = !executionId || status(error) === 404 || status(error) === 403;
    return (
        <p role="alert" className="p-6 text-sm" style={{ color: semAcesso ? 'var(--snaps-text-secondary)' : 'var(--snaps-error)' }}>
            {semAcesso ? 'Execução sem acesso ou inexistente.' : 'Não foi possível abrir esta execução agora.'}
        </p>
    );
}
