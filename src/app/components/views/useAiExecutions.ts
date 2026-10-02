import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { closeDeliveredExecution, deleteAgentExecution, getExecutionBranchesPage } from '@/services/agentExecutions';
import { getProjects } from '@/services/projects';
import { getSprints } from '@/services/sprints';
import { getWorkflowTemplates } from '@/services/workflowTemplates';
import { estaEncerrada } from '@/services/executionStatus';
import type { ExecutionListItem, ExecutionTotals, Project, Sprint, WorkflowTemplate } from '@/services/types';
import type { CloseRefusal } from '@/app/components/modals/execution-close-modals';

/** A recusa da API como veio: `detail` estruturado (sprint_status, open_cards) ou texto. */
export function lerRecusa(err: any): CloseRefusal {
    const detail = err?.response?.data?.detail;
    if (detail && typeof detail === 'object' && !Array.isArray(detail)) {
        return {
            message: String(detail.message ?? ''),
            sprintStatus: detail.sprint_status ?? null,
            openCards: Array.isArray(detail.open_cards) ? detail.open_cards : [],
        };
    }
    return {
        message: typeof detail === 'string' ? detail : (err?.message ?? 'Falha ao concluir execucao'),
        sprintStatus: null,
        openCards: [],
    };
}

function mensagemDeErro(err: any, padrao: string): string {
    const detail = err?.response?.data?.detail;
    if (typeof detail === 'string') return detail;
    if (detail && typeof detail === 'object' && detail.message) return String(detail.message);
    return err?.message ?? padrao;
}

/** Branches por pagina. Paginacao e busca acontecem no servidor. */
export const EXECUCOES_POR_PAGINA = 20;

/** Espera de digitacao antes de a busca ir ao servidor. */
const ESPERA_DA_BUSCA_MS = 300;

export function useAiExecutions() {
    const navigate = useNavigate();
    const { projectId } = useParams<{ projectId?: string }>();
    // So as execucoes das branches da pagina atual. Os contadores do topo NAO
    // saem daqui: vem prontos em `totals`, contados pelo servidor sobre o
    // escopo inteiro -- contar sobre a pagina daria 20 branches de total.
    const [executions, setExecutions] = useState<ExecutionListItem[]>([]);
    const [totals, setTotals] = useState<ExecutionTotals | null>(null);
    const [totalBranches, setTotalBranches] = useState(0);
    const [page, setPage] = useState(1);
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [isFetchingPage, setIsFetchingPage] = useState(false);
    const ultimaRequisicao = useRef(0);
    const sprintsCarregados = useRef(new Set<string>());
    const [projects, setProjects] = useState<Project[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [expandedBranch, setExpandedBranch] = useState<string | null>(null);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [availableSprints, setAvailableSprints] = useState<Sprint[]>([]);

    const [templates, setTemplates] = useState<WorkflowTemplate[]>([]);
    const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);

    // Encerramento no ponto do clique (hotfix 22.0): recusa e descarte em modal.
    const [closeTarget, setCloseTarget] = useState<{ exec: ExecutionListItem; refusal: CloseRefusal } | null>(null);
    const [closeError, setCloseError] = useState<string | null>(null);
    const [closeSubmitting, setCloseSubmitting] = useState(false);
    const [notice, setNotice] = useState<string | null>(null);
    const [discardTarget, setDiscardTarget] = useState<string | null>(null);
    const [discardSubmitting, setDiscardSubmitting] = useState(false);

    /**
     * Sprints so dos projetos que aparecem na pagina. Antes a visao global
     * pedia as sprints de TODOS os projetos, uma requisicao por projeto, a
     * cada carga -- e a tela do projeto baixava o board inteiro sem usa-lo.
     */
    const carregarSprints = async (items: ExecutionListItem[]) => {
        const precisa = projectId ? [projectId] : [...new Set(items.map(e => e.project_id))];
        const faltando = precisa.filter(id => !sprintsCarregados.current.has(id));
        if (faltando.length === 0) return;
        faltando.forEach(id => sprintsCarregados.current.add(id));
        const lotes = await Promise.all(faltando.map(id => getSprints(id).catch(() => [] as Sprint[])));
        setAvailableSprints(prev => [...prev, ...lotes.flat()]);
    };

    const fetchData = async () => {
        const requisicao = ++ultimaRequisicao.current;
        setIsFetchingPage(true);
        try {
            const resposta = await getExecutionBranchesPage({
                projectId,
                page,
                pageSize: EXECUCOES_POR_PAGINA,
                search: debouncedSearch,
            });
            // Resposta de uma pagina que o usuario ja deixou para tras.
            if (requisicao !== ultimaRequisicao.current) return;

            const totalPaginas = Math.max(1, Math.ceil(resposta.total_branches / EXECUCOES_POR_PAGINA));
            if (page > totalPaginas) {
                setPage(totalPaginas);
                return;
            }
            setExecutions(resposta.items);
            setTotals(resposta.totals);
            setTotalBranches(resposta.total_branches);
            setError(null);
            await carregarSprints(resposta.items);
        } catch (err: any) {
            if (requisicao !== ultimaRequisicao.current) return;
            console.error('Failed to fetch AI executions:', err);
            setError(err?.message || 'Failed to load executions');
        } finally {
            if (requisicao === ultimaRequisicao.current) {
                setIsFetchingPage(false);
                setIsLoading(false);
            }
        }
    };

    // Projetos e templates nao dependem da pagina: uma vez por escopo.
    useEffect(() => {
        setPage(1);
        Promise.all([getProjects(), getWorkflowTemplates()])
            .then(([projsData, templatesData]) => {
                setProjects(projsData);
                setTemplates(templatesData);
                if (templatesData.length > 0) {
                    setSelectedTemplateId(templatesData[0].id);
                }
            })
            .catch((err: any) => {
                console.error('Failed to fetch projects/templates:', err);
                setError(err?.message || 'Failed to load executions');
            });
    }, [projectId]);

    useEffect(() => {
        const t = setTimeout(() => {
            setDebouncedSearch(searchTerm.trim());
            setPage(1);
        }, ESPERA_DA_BUSCA_MS);
        return () => clearTimeout(t);
    }, [searchTerm]);

    useEffect(() => {
        fetchData();
    }, [projectId, page, debouncedSearch]);

    /**
     * Descartar = tombstone (DELETE /api/agent-executions/{id}). Nada e apagado;
     * a confirmacao diz isso, num modal do design system (nao window.confirm).
     */
    const handleDeleteExecution = (executionId: string) => {
        setDiscardTarget(executionId);
    };

    const confirmDiscard = async () => {
        if (!discardTarget) return;
        setDiscardSubmitting(true);
        try {
            // A API exige expected_revision quando a chamada leva Idempotency-Key.
            const alvo = executions.find(e => e.id === discardTarget);
            await deleteAgentExecution(discardTarget, alvo?.lock_version);
            setDiscardTarget(null);
            await fetchData();
        } catch (err: any) {
            console.error('Failed to discard execution:', err);
            setDiscardTarget(null);
            setError(mensagemDeErro(err, 'Falha ao descartar execução'));
        } finally {
            setDiscardSubmitting(false);
        }
    };

    /**
     * "Concluir (entregue)" — distinto de descartar (SNA-RD-166).
     *
     * Mexe numa execucao so, e a API so aceita com evidencia no banco (sprint
     * encerrada ou cards `done`). A recusa vem da API e e mostrada como veio:
     * reescreve-la aqui apagaria o que ela nomeia (qual sprint, quais cards).
     *
     * Ela abre num modal no ponto do clique — no banner do topo, fora de vista,
     * o PO nao via nada. O modal oferece o fechamento forcado com motivo.
     */
    const handleCloseDelivered = async (exec: ExecutionListItem) => {
        setNotice(null);
        try {
            await closeDeliveredExecution(exec.id, exec.lock_version);
            setNotice('Execução concluída como entregue.');
            await fetchData();
        } catch (err: any) {
            setCloseError(null);
            setCloseTarget({ exec, refusal: lerRecusa(err) });
        }
    };

    const confirmForceClose = async (motivo: string) => {
        if (!closeTarget) return;
        setCloseSubmitting(true);
        setCloseError(null);
        try {
            await closeDeliveredExecution(closeTarget.exec.id, closeTarget.exec.lock_version, { motivo });
            setCloseTarget(null);
            setNotice('Execução concluída como entregue (forçado).');
            await fetchData();
        } catch (err: any) {
            setCloseError(mensagemDeErro(err, 'Falha ao concluir execucao'));
        } finally {
            setCloseSubmitting(false);
        }
    };

    const cancelClose = () => { setCloseTarget(null); setCloseError(null); };

    const getProjectName = (projectId: string) =>
        projects.find(p => p.id === projectId)?.name || 'Unknown Project';

    const isExecutionStuck = (exec: ExecutionListItem) => {
        // Encerrada nao trava. A lista de status terminal mora em
        // `services/executionStatus.ts` — escrita a mao aqui, ela nao conhecia
        // `cancelled`, e toda lapide virava ⚠️ TRAVADA para sempre.
        if (estaEncerrada(exec)) {
            return false;
        }
        const updatedAtTime = new Date(exec.updated_at).getTime();
        const now = Date.now();
        const diffMs = now - updatedAtTime;
        const diffHours = diffMs / (1000 * 60 * 60);

        const isExecutionOrCiGate = exec.phase === 'execution' || exec.phase === 'ci_gate';
        const thresholdHours = isExecutionOrCiGate ? 2 : 24;

        return diffHours > thresholdHours;
    };

    const getBranchStatus = (execs: ExecutionListItem[]) => {
        if (!execs || execs.length === 0) return 'pending';
        const sorted = [...execs].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        const lastExec = sorted[sorted.length - 1];
        return lastExec.status;
    };

    const isBranchStuck = (allInBranch: ExecutionListItem[]) => {
        // Esta era a SEGUNDA copia da mesma lista, e divergia da primeira:
        // conhecia `completed`, que a outra nao conhecia. Duas implementacoes
        // da mesma regra divergem — foi assim que a lapide passou.
        const ultima = [...allInBranch].sort(
            (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        )[allInBranch.length - 1];
        if (ultima && estaEncerrada(ultima)) {
            return false;
        }
        return allInBranch.some(exec => isExecutionStuck(exec));
    };

    const getStalenessDuration = (updatedAt: string) => {
        const diffMs = Date.now() - new Date(updatedAt).getTime();
        const diffMinutes = Math.floor(diffMs / (1000 * 60));
        const hours = Math.floor(diffMinutes / 60);
        const minutes = diffMinutes % 60;
        if (hours > 0) {
            return `${hours}h ${minutes}m`;
        }
        return `${minutes}m`;
    };

    // A busca ja veio aplicada pelo servidor: `executions` e a pagina filtrada.
    const rootExecs = executions.filter(e => !e.parent_id);
    // A raiz grava `root_id = id`: sem excluir ela mesma, entrava duas vezes
    // na branch e o "N executions" contava uma a mais.
    const getBranchChildren = (rootId: string) =>
        executions.filter(e => e.id !== rootId && (e.root_id === rootId || (e.parent_id === rootId && !e.root_id)));

    const totalPages = Math.max(1, Math.ceil(totalBranches / EXECUCOES_POR_PAGINA));

    // Mesma ordem do servidor (travadas primeiro, raiz mais recente), refeita
    // aqui porque `items` vem por data de criacao, nao agrupado por branch.
    const sortedRootExecs = [...rootExecs].sort((a, b) => {
        const aChildren = getBranchChildren(a.id);
        const bChildren = getBranchChildren(b.id);
        const aStuck = isBranchStuck([a, ...aChildren]);
        const bStuck = isBranchStuck([b, ...bChildren]);
        
        if (aStuck && !bStuck) return -1;
        if (!aStuck && bStuck) return 1;
        
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    const getSprintDisplay = (sprintIds?: string[]) => {
        if (!sprintIds || sprintIds.length === 0) return null;
        const foundSprints = sprintIds
            .map(id => availableSprints.find(s => s.id === id))
            .filter(Boolean) as Sprint[];
        if (foundSprints.length === 0) return null;
        return foundSprints.map(s => s.tag || s.name).join(', ');
    };

    return {
        navigate,
        projectId,
        executions,
        totals,
        totalBranches,
        page,
        totalPages,
        setPage,
        isFetchingPage,
        projects,
        isLoading,
        isCreating,
        error,
        searchTerm,
        setSearchTerm,
        expandedBranch,
        setExpandedBranch,
        isModalOpen,
        setIsModalOpen,
        availableSprints,
        templates,
        handleDeleteExecution,
        handleCloseDelivered,
        closeTarget,
        closeError,
        closeSubmitting,
        confirmForceClose,
        cancelClose,
        notice,
        discardTarget,
        discardSubmitting,
        confirmDiscard,
        cancelDiscard: () => setDiscardTarget(null),
        getProjectName,
        isExecutionStuck,
        getBranchStatus,
        isBranchStuck,
        getStalenessDuration,
        sortedRootExecs,
        getBranchChildren,
        getSprintDisplay,
    };
}
