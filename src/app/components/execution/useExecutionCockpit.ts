import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getAgentExecution } from '@/services/agentExecutions';

import { useCockpitWalkthroughs } from '@/app/components/execution/useCockpitWalkthroughs';
import { useCockpitDocs } from '@/app/components/execution/useCockpitDocs';
import { useCockpitPlans } from '@/app/components/execution/useCockpitPlans';
import { useCockpitSisterExecutions } from '@/app/components/execution/useCockpitSisterExecutions';
import { useCockpitState } from '@/app/components/execution/useCockpitState';
import { useCockpitActions } from '@/app/components/execution/useCockpitActions';

export const useExecutionCockpit = () => {
    const { projectId, executionId } = useParams<{ projectId: string; executionId: string }>();
    const navigate = useNavigate();

    const { sisterExecutions, executionTree, fetchSisters } = useCockpitSisterExecutions(projectId, executionId);

    const state = useCockpitState(projectId, executionId, fetchSisters);

    // Sub-hooks delegation
    const walkthroughsHook = useCockpitWalkthroughs(projectId, state.execution);
    const docsHook = useCockpitDocs(projectId, state.execution);

    const plansHook = useCockpitPlans(
        state.execution,
        state.setExecution,
        state.isSequential,
        state.currentPlan
    );

    const updatePlanStatus = (planId: string, status: string) => plansHook.updatePlanStatus(planId, status, getAgentExecution);
    const deletePlanFn = (planId: string) => plansHook.deletePlanFn(planId, getAgentExecution);

    const handleCopy = (id: string, text: string) => {
        navigator.clipboard.writeText(text);
        state.setCopiedId(id);
        setTimeout(() => state.setCopiedId(null), 2000);
    };

    const actions = useCockpitActions({
        projectId,
        executionId,
        missionInstructions: state.missionInstructions,
        selectedDocIds: docsHook.selectedDocIds,
        selectedDecisionIds: docsHook.selectedDecisionIds,
        manualOverrides: state.manualOverrides,
        setExecution: state.setExecution,
        setSelectedTestPlanIds: state.setSelectedTestPlanIds,
        setIsSavingTestPlanContext: state.setIsSavingTestPlanContext,
        setIsRefreshing: state.setIsRefreshing,
        setIsAdvancing: state.setIsAdvancing,
        setIsRollingBack: state.setIsRollingBack,
        setMissionInstructions: state.setMissionInstructions,
        setManualOverrides: state.setManualOverrides,
        setIsTimeTrackingModalOpen: state.setIsTimeTrackingModalOpen,
        setSprints: state.setSprints,
        setCards: state.setCards,
        fetchSisters,
        fetchTroubleReport: state.fetchTroubleReport,
        loadExecutionTroubleReport: state.loadExecutionTroubleReport,
        navigate
    });

    return {
        projectId: projectId!,
        executionId,
        execution: state.execution,
        setExecution: state.setExecution,
        project: state.project,
        cards: state.cards,
        setCards: state.setCards,
        epics: state.epics,
        sprints: state.sprints,
        setSprints: state.setSprints,
        repoNames: state.repoNames,
        columns: state.columns,
        agentInstructions: state.agentInstructions,
        isAgentModalOpen: state.isAgentModalOpen,
        setIsAgentModalOpen: state.setIsAgentModalOpen,
        viewMode: state.viewMode,
        setViewMode: state.setViewMode,
        selectedCard: state.selectedCard,
        setSelectedCard: state.setSelectedCard,
        isLoading: state.isLoading,
        activeTab: state.activeTab,
        setActiveTab: state.setActiveTab,
        troubleReport: state.troubleReport,
        copiedId: state.copiedId,
        entryReviewed: state.entryReviewed,
        setEntryReviewed: state.setEntryReviewed,
        isRefreshing: state.isRefreshing,
        isAdvancing: state.isAdvancing,
        isRollingBack: state.isRollingBack,
        missionInstructions: state.missionInstructions,
        setMissionInstructions: state.setMissionInstructions,
        isWalkthroughModalOpen: walkthroughsHook.isWalkthroughModalOpen,
        setIsWalkthroughModalOpen: walkthroughsHook.setIsWalkthroughModalOpen,
        walkthroughs: walkthroughsHook.walkthroughs,
        isLoadingWalkthroughs: walkthroughsHook.isLoadingWalkthroughs,
        selectedWalkthrough: walkthroughsHook.selectedWalkthrough,
        setSelectedWalkthrough: walkthroughsHook.setSelectedWalkthrough,
        isEditingWalkthrough: walkthroughsHook.isEditingWalkthrough,
        setIsEditingWalkthrough: walkthroughsHook.setIsEditingWalkthrough,
        walkthroughContent: walkthroughsHook.walkthroughContent,
        setWalkthroughContent: walkthroughsHook.setWalkthroughContent,
        isSavingWalkthrough: walkthroughsHook.isSavingWalkthrough,
        isDocsModalOpen: docsHook.isDocsModalOpen,
        setIsDocsModalOpen: docsHook.setIsDocsModalOpen,
        governanceDocs: docsHook.governanceDocs,
        setGovernanceDocs: docsHook.setGovernanceDocs,
        isLoadingDocs: docsHook.isLoadingDocs,
        selectedDocIds: docsHook.selectedDocIds,
        setSelectedDocIds: docsHook.setSelectedDocIds,
        docsModalTab: docsHook.docsModalTab,
        setDocsModalTab: docsHook.setDocsModalTab,
        decisions: docsHook.decisions,
        setDecisions: docsHook.setDecisions,
        selectedDecisionIds: docsHook.selectedDecisionIds,
        setSelectedDecisionIds: docsHook.setSelectedDecisionIds,
        viewDoc: docsHook.viewDoc,
        setViewDoc: docsHook.setViewDoc,
        isEditingDoc: docsHook.isEditingDoc,
        setIsEditingDoc: docsHook.setIsEditingDoc,
        isSavingDoc: docsHook.isSavingDoc,
        setIsSavingDoc: docsHook.setIsSavingDoc,
        isPeerReviewModalOpen: state.isPeerReviewModalOpen,
        setIsPeerReviewModalOpen: state.setIsPeerReviewModalOpen,
        peerReviewSnap: state.peerReviewSnap,
        isLoadingPeerReview: state.isLoadingPeerReview,
        isToolsModalOpen: state.isToolsModalOpen,
        setIsToolsModalOpen: state.setIsToolsModalOpen,
        isTasksModalOpen: state.isTasksModalOpen,
        setIsTasksModalOpen: state.setIsTasksModalOpen,
        sisterExecutions,
        executionTree,
        templates: state.templates,
        isSequential: state.isSequential,
        currentPlan: state.currentPlan,
        isPlanWaiting: plansHook.isPlanWaiting,
        isEditingPlan: plansHook.isEditingPlan,
        setIsEditingPlan: plansHook.setIsEditingPlan,
        editingPlanId: plansHook.editingPlanId,
        setEditingPlanId: plansHook.setEditingPlanId,
        planContent: plansHook.planContent,
        setPlanContent: plansHook.setPlanContent,
        planTitle: plansHook.planTitle,
        setPlanTitle: plansHook.setPlanTitle,
        isSavingPlan: plansHook.isSavingPlan,
        handleCopy,
        handleOpenDocs: docsHook.handleOpenDocs,
        toggleDecisionSelection: docsHook.toggleDecisionSelection,
        handleOpenPeerReview: state.handleOpenPeerReview,
        toggleDocSelection: docsHook.toggleDocSelection,
        handleOpenWalkthroughs: walkthroughsHook.handleOpenWalkthroughs,
        handleSaveWalkthrough: walkthroughsHook.handleSaveWalkthrough,
        handleEditPlan: plansHook.handleEditPlan,
        handleSavePlan: plansHook.handleSavePlan,
        selectedTestPlanIds: state.selectedTestPlanIds,
        setSelectedTestPlanIds: state.setSelectedTestPlanIds,
        isSavingTestPlanContext: state.isSavingTestPlanContext,
        handleSaveTestPlanContext: actions.handleSaveTestPlanContext,
        handleRefresh: actions.handleRefresh,
        handleAdvance: actions.handleAdvance,
        manualOverrides: state.manualOverrides,
        setManualOverride: state.setManualOverride,
        handleRollback: actions.handleRollback,
        updatePlanStatus,
        deletePlanFn,
        handleApproveBDD: actions.handleApproveBDD,
        handleToggleScenario: actions.handleToggleScenario,
        isTimeTrackingModalOpen: state.isTimeTrackingModalOpen,
        setIsTimeTrackingModalOpen: state.setIsTimeTrackingModalOpen,
        isSessionManagerOpen: state.isSessionManagerOpen,
        setIsSessionManagerOpen: state.setIsSessionManagerOpen,
    };
};
