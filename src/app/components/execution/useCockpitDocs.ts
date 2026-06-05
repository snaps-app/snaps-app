import { useState, useEffect } from 'react';
import { getGovernanceDocs } from '@/services/governance';
import { getDecisions } from '@/services/decisions';
import type { AgentTaskExecution, GovernanceDoc, Decision } from '@/services/types';

export const useCockpitDocs = (projectId: string | undefined, execution: AgentTaskExecution | null) => {
    const [isDocsModalOpen, setIsDocsModalOpen] = useState(false);
    const [governanceDocs, setGovernanceDocs] = useState<GovernanceDoc[]>([]);
    const [isLoadingDocs, setIsLoadingDocs] = useState(false);
    const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
    const [docsModalTab, setDocsModalTab] = useState<'governance' | 'adrs'>('governance');
    const [decisions, setDecisions] = useState<Decision[]>([]);
    const [selectedDecisionIds, setSelectedDecisionIds] = useState<string[]>([]);
    const [viewDoc, setViewDoc] = useState<GovernanceDoc | null>(null);
    const [isEditingDoc, setIsEditingDoc] = useState(false);
    const [isSavingDoc, setIsSavingDoc] = useState(false);

    useEffect(() => {
        if (execution?.context_data?.doc_ids) {
            setSelectedDocIds(execution.context_data.doc_ids);
        }
        if (execution?.context_data?.decision_ids) {
            setSelectedDecisionIds(execution.context_data.decision_ids);
        }
    }, [execution]);

    const handleOpenDocs = async () => {
        if (!projectId) return;
        setIsDocsModalOpen(true);
        setDocsModalTab('governance');
        setIsLoadingDocs(true);
        try {
            const [docsList, decisionList] = await Promise.all([
                getGovernanceDocs(projectId),
                getDecisions(projectId)
            ]);
            setGovernanceDocs(docsList);
            setDecisions(decisionList);
            if (execution?.context_data?.doc_ids) {
                setSelectedDocIds(execution.context_data.doc_ids);
            }
            if (execution?.context_data?.decision_ids) {
                setSelectedDecisionIds(execution.context_data.decision_ids);
            }
        } catch (err) {
            console.error('Failed to fetch governance docs:', err);
        } finally {
            setIsLoadingDocs(false);
        }
    };

    const toggleDecisionSelection = (id: string) => {
        setSelectedDecisionIds(prev =>
            prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id]
        );
    };

    const toggleDocSelection = (id: string) => {
        setSelectedDocIds(prev =>
            prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id]
        );
    };

    return {
        isDocsModalOpen,
        setIsDocsModalOpen,
        governanceDocs,
        setGovernanceDocs,
        isLoadingDocs,
        selectedDocIds,
        setSelectedDocIds,
        docsModalTab,
        setDocsModalTab,
        decisions,
        setDecisions,
        selectedDecisionIds,
        setSelectedDecisionIds,
        viewDoc,
        setViewDoc,
        isEditingDoc,
        setIsEditingDoc,
        isSavingDoc,
        setIsSavingDoc,
        handleOpenDocs,
        toggleDecisionSelection,
        toggleDocSelection,
    };
};
