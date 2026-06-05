import { useState } from 'react';
import { getSnaps, updateSnap } from '@/services/snaps';
import type { AgentTaskExecution, Snap } from '@/services/types';

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
            let allSprintSnaps: Snap[] = [];
            if (execution.sprint_ids && execution.sprint_ids.length > 0) {
                for (const sId of execution.sprint_ids) {
                    try {
                        const sprintSnaps = await getSnaps(projectId, 0, 100, sId);
                        allSprintSnaps.push(...(sprintSnaps || []));
                    } catch (err) {
                        console.error(`Failed to fetch snaps for sprint ${sId}:`, err);
                    }
                }
            }

            const uniqueSnaps = Array.from(new Map(allSprintSnaps.map(s => [s.id, s])).values());
            const walkthroughSnaps = uniqueSnaps.filter(s =>
                s.name.toLowerCase().includes('walkthrough') ||
                s.content?.toLowerCase().includes('walkthrough') ||
                (s.snadds as any)?.artifact_type === 'walkthrough' ||
                (s.snadds as any)?.type === 'walkthrough' ||
                (s.snadds as any)?.type === 'execution_order' ||
                (s.snadds as any)?.type === 'task' ||
                (s.snadds as any)?.artifact_type === 'execution_order' ||
                (s.snadds as any)?.artifact_type === 'task'
            );

            setWalkthroughs(walkthroughSnaps);
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

            let allSprintSnaps: Snap[] = [];
            if (execution?.sprint_ids && execution.sprint_ids.length > 0) {
                for (const sId of execution.sprint_ids) {
                    try {
                        const sprintSnaps = await getSnaps(projectId, 0, 100, sId);
                        allSprintSnaps.push(...(sprintSnaps || []));
                    } catch (err) {
                        console.error(`Failed to refresh snaps for sprint ${sId}:`, err);
                    }
                }
            }

            const unique = Array.from(new Map(allSprintSnaps.map(s => [s.id, s])).values());
            const walkthroughSnaps = unique.filter(s =>
                s.name.toLowerCase().includes('walkthrough') ||
                s.content?.toLowerCase().includes('walkthrough') ||
                (s.snadds as any)?.artifact_type === 'walkthrough' ||
                (s.snadds as any)?.type === 'walkthrough' ||
                (s.snadds as any)?.type === 'execution_order' ||
                (s.snadds as any)?.type === 'task' ||
                (s.snadds as any)?.artifact_type === 'execution_order' ||
                (s.snadds as any)?.artifact_type === 'task'
            );
            setWalkthroughs(walkthroughSnaps);
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
