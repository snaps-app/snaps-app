import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { deleteAgentExecution, getAllAgentExecutions, getProjectAgentExecutions } from '@/services/agentExecutions';
import { getProjectBoard } from '@/services/boards';
import { getProjects } from '@/services/projects';
import { getSprints } from '@/services/sprints';
import { getWorkflowTemplates } from '@/services/workflowTemplates';
import type { AgentTaskExecution, Project, Sprint, WorkflowTemplate } from '@/services/types';

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

    const handleDeleteExecution = async (executionId: string) => {
        if (window.confirm("Tem certeza que deseja excluir esta execução agêntica? Esta ação apagará permanentemente todos os itens filhos e sub-execuções relacionados.")) {
            setIsLoading(true);
            try {
                await deleteAgentExecution(executionId);
                await fetchData();
            } catch (err: any) {
                console.error('Failed to delete execution:', err);
                setError(err?.message || 'Falha ao excluir execução');
            } finally {
                setIsLoading(false);
            }
        }
    };

    const getProjectName = (projectId: string) =>
        projects.find(p => p.id === projectId)?.name || 'Unknown Project';

    const isExecutionStuck = (exec: AgentTaskExecution) => {
        if (exec.status === 'done' || exec.status === 'failed') {
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
        const branchStatus = getBranchStatus(allInBranch);
        if (branchStatus === 'done' || branchStatus === 'completed' || branchStatus === 'failed') {
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
