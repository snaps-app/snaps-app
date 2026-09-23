import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { closeDeliveredExecution, deleteAgentExecution, getAllAgentExecutions, getProjectAgentExecutions } from '@/services/agentExecutions';
import { getProjectBoard } from '@/services/boards';
import { getProjects } from '@/services/projects';
import { getSprints } from '@/services/sprints';
import { getWorkflowTemplates } from '@/services/workflowTemplates';
import { estaEncerrada } from '@/services/executionStatus';
import type { AgentTaskExecution, Project, Sprint, WorkflowTemplate } from '@/services/types';
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

export function useAiExecutions() {
    const navigate = useNavigate();
    const { projectId } = useParams<{ projectId?: string }>();
    const [executions, setExecutions] = useState<AgentTaskExecution[]>([]);
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
    const [closeTarget, setCloseTarget] = useState<{ exec: AgentTaskExecution; refusal: CloseRefusal } | null>(null);
    const [closeError, setCloseError] = useState<string | null>(null);
    const [closeSubmitting, setCloseSubmitting] = useState(false);
    const [notice, setNotice] = useState<string | null>(null);
    const [discardTarget, setDiscardTarget] = useState<string | null>(null);
    const [discardSubmitting, setDiscardSubmitting] = useState(false);

    const fetchData = async () => {
        try {
            const [execsData, projsData, templatesData] = await Promise.all([
                projectId ? getProjectAgentExecutions(projectId) : getAllAgentExecutions(),
                getProjects(),
                getWorkflowTemplates()
            ]);

            setExecutions(execsData);
            setProjects(projsData);
            setTemplates(templatesData);
            if (templatesData.length > 0) {
                setSelectedTemplateId(templatesData[0].id);
            }

            if (projectId) {
                const [sprintsData] = await Promise.all([
                    getSprints(projectId),
                    getProjectBoard(projectId)
                ]);
                setAvailableSprints(sprintsData);
            } else {
                const sprintsPromises = projsData.map(p => getSprints(p.id).catch(() => []));
                const sprintsArrays = await Promise.all(sprintsPromises);
                setAvailableSprints(sprintsArrays.flat());
            }
        } catch (err: any) {
            console.error('Failed to fetch AI executions:', err);
            setError(err?.message || 'Failed to load executions');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [projectId]);

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
            await deleteAgentExecution(discardTarget);
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
    const handleCloseDelivered = async (exec: AgentTaskExecution) => {
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

    const isExecutionStuck = (exec: AgentTaskExecution) => {
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

    const getBranchStatus = (execs: AgentTaskExecution[]) => {
        if (!execs || execs.length === 0) return 'pending';
        const sorted = [...execs].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        const lastExec = sorted[sorted.length - 1];
        return lastExec.status;
    };

    const isBranchStuck = (allInBranch: AgentTaskExecution[]) => {
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

    const filtered = executions.filter(exec =>
        getProjectName(exec.project_id).toLowerCase().includes(searchTerm.toLowerCase()) ||
        (exec.agent_name || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    const rootExecs = filtered.filter(e => !e.parent_id);
    const getBranchChildren = (rootId: string) =>
        filtered.filter(e => e.root_id === rootId || (e.parent_id === rootId && !e.root_id));

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
