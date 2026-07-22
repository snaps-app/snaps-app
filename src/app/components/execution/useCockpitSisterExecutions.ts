import { useState } from 'react';
import { getAgentExecutionTree } from '@/services/agentExecutions';
import type { AgentTaskExecution } from '@/services/types';

export const useCockpitSisterExecutions = (projectId?: string, executionId?: string) => {
    const [sisterExecutions, setSisterExecutions] = useState<AgentTaskExecution[]>([]);
    const [executionTree, setExecutionTree] = useState<AgentTaskExecution[]>([]);

    const fetchSisters = async (): Promise<AgentTaskExecution[]> => {
        if (!projectId || !executionId) return [];
        try {
            const tree = await getAgentExecutionTree(executionId);
            setExecutionTree(tree);

            const currentEx = tree.find(e => e.id === executionId);
            if (currentEx) {
                setSisterExecutions(tree.filter(ex =>
                    ex.id !== executionId &&
                    ex.parent_id === currentEx.parent_id
                ));
            } else {
                setSisterExecutions([]);
            }
            return tree;
        } catch (err) {
            console.error('Failed to fetch sister executions:', err);
            return [];
        }
    };

    return {
        sisterExecutions,
        executionTree,
        fetchSisters,
    };
};
