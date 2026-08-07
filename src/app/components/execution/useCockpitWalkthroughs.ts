import { useState } from 'react';
import { getSnaps, updateSnap } from '@/services/snaps';
import type { AgentTaskExecution, Snap } from '@/services/types';

const isWalkthroughLike = (s: Snap) =>
    s.name.toLowerCase().includes('walkthrough') ||
    s.content?.toLowerCase().includes('walkthrough') ||
    (s.snadds as any)?.artifact_type === 'walkthrough' ||
    (s.snadds as any)?.type === 'walkthrough' ||
    (s.snadds as any)?.type === 'execution_order' ||
    (s.snadds as any)?.type === 'task' ||
    (s.snadds as any)?.artifact_type === 'execution_order' ||
    (s.snadds as any)?.artifact_type === 'task';

/**
 * Junta os artefatos da(s) sprint(s) COM os da árvore de execuções.
 *
 * Antes só havia o caminho por sprint, dentro de um laço sobre `sprint_ids`.
 * Execução sem sprint não mostrava walkthrough nenhum — não por filtro errado,
 * mas porque o laço nunca rodava. Somar o escopo de árvore cobre o card avulso
 * sem perder o agrupamento por sprint, que continua funcionando.
 */
const collectWalkthroughs = async (
    projectId: string,
    execution: AgentTaskExecution,
    bypassCache: boolean,
): Promise<Snap[]> => {
    const collected: Snap[] = [];

    for (const sprintId of execution.sprint_ids ?? []) {
        try {
            collected.push(...(await getSnaps(projectId, 0, 100, sprintId, undefined, { bypassCache }) || []));
        } catch (err) {
            console.error(`Failed to fetch snaps for sprint ${sprintId}:`, err);
        }
    }

    try {
        collected.push(...(await getSnaps(projectId, 0, 100, undefined, execution.id, {
            executionScope: 'tree',
            bypassCache,
        }) || []));
    } catch (err) {
        console.error(`Failed to fetch snaps for execution tree ${execution.id}:`, err);
    }

    // Os dois escopos se sobrepõem quando a execução tem sprint; dedup por id.
    const unique = Array.from(new Map(collected.map(s => [s.id, s])).values());
    return unique.filter(isWalkthroughLike);
};

export const useCockpitWalkthroughs = (projectId: string | undefined, execution: AgentTaskExecution | null) => {
    const [isWalkthroughModalOpen, setIsWalkthroughModalOpen] = useState(false);
    const [walkthroughs, setWalkthroughs] = useState<Snap[]>([]);
    const [isLoadingWalkthroughs, setIsLoadingWalkthroughs] = useState(false);
    const [selectedWalkthrough, setSelectedWalkthrough] = useState<Snap | null>(null);
    const [isEditingWalkthrough, setIsEditingWalkthrough] = useState(false);
    const [walkthroughContent, setWalkthroughContent] = useState('');
    const [isSavingWalkthrough, setIsSavingWalkthrough] = useState(false);

    const handleOpenWalkthroughs = async () => {
        if (!projectId || !execution) return;
        setIsWalkthroughModalOpen(true);
        setIsLoadingWalkthroughs(true);
        try {
            setWalkthroughs(await collectWalkthroughs(projectId, execution, false));
        } catch (err) {
            console.error('Failed to fetch walkthroughs:', err);
        } finally {
            setIsLoadingWalkthroughs(false);
        }
    };

    const handleSaveWalkthrough = async () => {
        if (!selectedWalkthrough || !projectId) return;
        setIsSavingWalkthrough(true);
        try {
            await updateSnap(selectedWalkthrough.id, { content: walkthroughContent });
            setIsEditingWalkthrough(false);

            // bypassCache: acabamos de escrever; o cache de 30 s devolveria a
            // versao anterior e o proprio autor veria a nota desatualizada.
            if (execution) {
                setWalkthroughs(await collectWalkthroughs(projectId, execution, true));
            }
            setSelectedWalkthrough(prev => prev ? { ...prev, content: walkthroughContent } : null);
        } catch (err) {
            console.error('Failed to save walkthrough:', err);
        } finally {
            setIsSavingWalkthrough(false);
        }
    };

    return {
        isWalkthroughModalOpen,
        setIsWalkthroughModalOpen,
        walkthroughs,
        setWalkthroughs,
        isLoadingWalkthroughs,
        selectedWalkthrough,
        setSelectedWalkthrough,
        isEditingWalkthrough,
        setIsEditingWalkthrough,
        walkthroughContent,
        setWalkthroughContent,
        isSavingWalkthrough,
        handleOpenWalkthroughs,
        handleSaveWalkthrough,
    };
};
