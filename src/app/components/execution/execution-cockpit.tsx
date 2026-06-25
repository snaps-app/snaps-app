import { useNavigate } from 'react-router-dom';
import { FileText, Layout, ShieldCheck, Bug, Network, Bot, CheckSquare, StickyNote, RefreshCcw } from 'lucide-react';
import { updateGovernanceDoc } from '@/services/governance';

import { useExecutionCockpit } from '@/app/components/execution/useExecutionCockpit';

import { ExecutionSidebar } from '@/app/components/execution/execution-sidebar';
import { PlanPanel } from '@/app/components/execution/plan-panel';
import { CardsPanel } from '@/app/components/execution/cards-panel';
import { BDDPanel } from '@/app/components/execution/bdd-panel';
import { TroublePanel } from '@/app/components/execution/trouble-panel';
import { RetroPanel } from '@/app/components/execution/retro-panel';
import { AgentInstructionsModal } from '@/app/components/execution/agent-instructions-modal';
import { WalkthroughModal } from '@/app/components/execution/walkthrough-modal';
import { DocsModal } from '@/app/components/execution/docs-modal';
import { PeerReviewModal } from '@/app/components/execution/peer-review-modal';
import { TasksModal } from '@/app/components/execution/tasks-modal';
import { AgentCapabilitiesModal } from '@/app/components/execution/agent-capabilities-modal';
import { CardModal } from '@/app/components/modals/card-modal';
import { DocumentViewModal } from '@/app/components/modals/document-view-modal';
import { updateCard } from '@/services/cards';
import { ExecutionTimer } from '@/app/components/execution/execution-timer';
import { TimeTrackingModal } from '@/app/components/execution/time-tracking-modal';

export const ExecutionCockpit: React.FC = () => {
    const navigate = useNavigate();
    const {
        projectId,
        execution,
        project,
        cards,
        setCards,
        epics,
        sprints,
        repoNames,
        columns,
        agentInstructions,
        isAgentModalOpen,
        setIsAgentModalOpen,
        viewMode,
        setViewMode,
        selectedCard,
        setSelectedCard,
        isLoading,
        activeTab,
        setActiveTab,
        troubleReport,
        copiedId,
        entryReviewed,
        setEntryReviewed,
        isRefreshing,
        isAdvancing,
        isRollingBack,
        missionInstructions,
        setMissionInstructions,
        isWalkthroughModalOpen,
        setIsWalkthroughModalOpen,
        walkthroughs,
        isLoadingWalkthroughs,
        selectedWalkthrough,
        setSelectedWalkthrough,
        isEditingWalkthrough,
        setIsEditingWalkthrough,
        walkthroughContent,
        setWalkthroughContent,
        isSavingWalkthrough,
        isDocsModalOpen,
        setIsDocsModalOpen,
        governanceDocs,
        setGovernanceDocs,
        isLoadingDocs,
        selectedDocIds,
        docsModalTab,
        setDocsModalTab,
        decisions,
        selectedDecisionIds,
        viewDoc,
        setViewDoc,
        isEditingDoc,
        setIsEditingDoc,
        isSavingDoc,
        setIsSavingDoc,
        isPeerReviewModalOpen,
        setIsPeerReviewModalOpen,
        peerReviewSnap,
        isLoadingPeerReview,
        isToolsModalOpen,
        setIsToolsModalOpen,
        isTasksModalOpen,
        setIsTasksModalOpen,
        sisterExecutions,
        executionTree,
        templates,
        isSequential,
        currentPlan,
        isPlanWaiting,
        isEditingPlan,
        setIsEditingPlan,
        editingPlanId,
        setEditingPlanId,
        planContent,
        setPlanContent,
        planTitle,
        setPlanTitle,
        isSavingPlan,
        handleCopy,
        handleOpenDocs,
        toggleDecisionSelection,
        handleOpenPeerReview,
        toggleDocSelection,
        handleOpenWalkthroughs,
        handleSaveWalkthrough,
        handleEditPlan,
        handleSavePlan,
        handleRefresh,
        handleAdvance,
        manualOverrides,
        setManualOverride,
        handleRollback,
        updatePlanStatus,
        deletePlanFn,
        handleApproveBDD,
        handleToggleScenario,
        selectedTestPlanIds,
        isSavingTestPlanContext,
        handleSaveTestPlanContext,
        isTimeTrackingModalOpen,
        setIsTimeTrackingModalOpen,
    } = useExecutionCockpit();

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center h-screen bg-[#0a0a0c] gap-4">
                <div className="relative">
                    <div className="w-16 h-16 rounded-full border-2 border-purple-500/20 border-t-purple-500 animate-spin" />
                    <Bot className="w-8 h-8 text-purple-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                </div>
                <p className="text-white/40 text-sm font-medium animate-pulse">Initializing Execution Cockpit...</p>
            </div>
        );
    }

    if (!execution) {
        return (
            <div className="flex flex-col items-center justify-center h-screen bg-[#0a0a0c] gap-4">
                <Bot className="w-12 h-12 text-white/10" />
                <p className="text-white/30 text-sm">Execution not found.</p>
                <button
                    onClick={() => navigate(`/project/${projectId}/board`)}
                    className="text-purple-400 text-sm underline"
                >
                    Back to Board
                </button>
            </div>
        );
    }

    return (
        <div className="flex h-screen bg-[#0a0a0c] overflow-hidden">
            {/* Left Panel: Orchestrator */}
            <ExecutionSidebar
                projectId={projectId!}
                execution={execution}
                project={project}
                sprints={sprints}
                templates={templates}
                executionTree={executionTree}
                sisterExecutions={sisterExecutions}
                troubleReport={troubleReport}
                cards={cards}
                agentInstructions={agentInstructions}
                viewMode={viewMode}
                setViewMode={setViewMode}
                entryReviewed={entryReviewed}
                setEntryReviewed={setEntryReviewed}
                missionInstructions={missionInstructions}
                setMissionInstructions={setMissionInstructions}
                selectedDocIds={selectedDocIds}
                selectedDecisionIds={selectedDecisionIds}
                isRefreshing={isRefreshing}
                isAdvancing={isAdvancing}
                isRollingBack={isRollingBack}
                handleRefresh={handleRefresh}
                handleAdvance={handleAdvance}
                manualOverrides={manualOverrides}
                setManualOverride={setManualOverride}
                setIsTimeTrackingModalOpen={setIsTimeTrackingModalOpen}
                handleRollback={handleRollback}
                setIsAgentModalOpen={setIsAgentModalOpen}
                setIsToolsModalOpen={setIsToolsModalOpen}
            />

            {/* Right Panel: Context Dashboard */}
            <div className="flex-1 flex flex-col relative">
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-purple-500/5 blur-[120px] rounded-full -mr-64 -mt-64" />

                {/* Tabs */}
                <div className="flex items-center justify-between px-8 pt-8 relative z-10 border-b border-white/5">
                    <div className="flex items-center gap-6 overflow-x-auto pb-2 -mb-px">
                        {[
                            { id: 'plan', label: 'Plans', icon: FileText },
                            { id: 'cards', label: 'Cards', icon: Layout },
                            { id: 'bdd', label: 'Scenarios', icon: ShieldCheck },
                            { id: 'trouble', label: 'Reports', icon: Bug },
                            { id: 'retro', label: 'Retrospective', icon: Network },
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`flex items-center gap-2 pb-4 text-xs font-medium transition-all relative shrink-0 ${
                                    activeTab === tab.id
                                        ? 'text-purple-400'
                                        : 'text-white/40 hover:text-white/70'
                                }`}
                            >
                                <tab.icon className="w-4 h-4" />
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    <div className="flex items-center gap-2 mb-4">
                        <button
                            onClick={handleOpenDocs}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[10px] font-bold transition-all group ${
                                selectedDocIds.length > 0
                                    ? 'bg-blue-500/20 border-blue-500/30 text-blue-400 hover:bg-blue-500/30'
                                    : 'bg-white/5 border-white/10 text-white/60 hover:text-white hover:bg-white/10'
                            }`}
                        >
                            <Layout className="w-3.5 h-3.5" />
                            Docs {selectedDocIds.length > 0 && `(${selectedDocIds.length})`}
                        </button>

                        {/* Tasks Button */}
                        {(() => {
                            const allTasks = cards.flatMap(c => c.tasks || []);
                            const doneTasks = allTasks.filter(t => t.completed).length;
                            const hasTasks = allTasks.length > 0;
                            return hasTasks ? (
                                <button
                                    onClick={() => setIsTasksModalOpen(true)}
                                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[10px] font-bold transition-all group ${
                                        doneTasks === allTasks.length
                                            ? 'bg-green-500/20 border-green-500/30 text-green-400 hover:bg-green-500/30'
                                            : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20'
                                    }`}
                                >
                                    <CheckSquare className="w-3.5 h-3.5" />
                                    Tasks ({doneTasks}/{allTasks.length})
                                </button>
                            ) : null;
                        })()}

                        <button
                            onClick={handleOpenWalkthroughs}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-purple-500/10 border border-purple-500/20 text-[10px] font-bold text-purple-400 hover:text-white hover:bg-purple-500/20 transition-all group"
                        >
                            <Bot className="w-3.5 h-3.5" />
                            Walkthroughs
                        </button>

                        <button
                            onClick={() => {
                                const width = 1200;
                                const height = 800;
                                const left = window.screenX + (window.outerWidth - width) / 2;
                                const top = window.screenY + (window.outerHeight - height) / 2;
                                window.open(
                                    `/project/${projectId}/execution/${execution.id}/scratch`,
                                    '_blank',
                                    `width=${width},height=${height},left=${left},top=${top},noopener,noreferrer`
                                );
                            }}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-orange-500/10 border border-orange-500/20 text-[10px] font-bold text-orange-400 hover:text-white hover:bg-orange-500/20 transition-all group"
                        >
                            <StickyNote className="w-3.5 h-3.5" />
                            Scratch
                        </button>

                        <button
                            onClick={handleRefresh}
                            disabled={isRefreshing}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-[10px] font-bold text-white/60 hover:text-white hover:bg-white/10 transition-all group"
                        >
                            <RefreshCcw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}`} />
                            {isRefreshing ? 'Refreshing...' : 'Refresh Context'}
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 p-8 overflow-y-auto relative z-10">
                    {activeTab === 'plan' && (
                        <PlanPanel
                            execution={execution}
                            sprints={sprints}
                            isSequential={isSequential}
                            currentPlan={currentPlan}
                            isPlanWaiting={isPlanWaiting}
                            isEditingPlan={isEditingPlan}
                            setIsEditingPlan={setIsEditingPlan}
                            editingPlanId={editingPlanId}
                            setEditingPlanId={setEditingPlanId}
                            planContent={planContent}
                            setPlanContent={setPlanContent}
                            planTitle={planTitle}
                            setPlanTitle={setPlanTitle}
                            isSavingPlan={isSavingPlan}
                            handleSavePlan={handleSavePlan}
                            handleEditPlan={handleEditPlan}
                            handleCopy={handleCopy}
                            copiedId={copiedId}
                            handleOpenPeerReview={handleOpenPeerReview}
                            updatePlanStatus={updatePlanStatus}
                            deletePlanFn={deletePlanFn}
                        />
                    )}

                    {activeTab === 'cards' && (
                        <CardsPanel
                            cards={cards}
                            epics={epics}
                            sprints={sprints}
                            setSelectedCard={setSelectedCard}
                        />
                    )}

                    {activeTab === 'bdd' && (
                        <BDDPanel
                            cards={cards}
                            onApproveBDD={handleApproveBDD}
                            onToggleScenario={handleToggleScenario}
                        />
                    )}

                    {activeTab === 'trouble' && (
                        <TroublePanel
                            troubleReport={troubleReport}
                            copiedId={copiedId}
                            handleCopy={handleCopy}
                            selectedTestPlanIds={selectedTestPlanIds}
                            isSavingTestPlanContext={isSavingTestPlanContext}
                            onSaveTestPlanContext={handleSaveTestPlanContext}
                        />
                    )}

                    {activeTab === 'retro' && (
                        <RetroPanel
                            sprints={sprints}
                            execution={execution}
                        />
                    )}
                </div>
            </div>

            {/* Agent Instructions Modal */}
            <AgentInstructionsModal
                isOpen={isAgentModalOpen}
                onClose={() => setIsAgentModalOpen(false)}
                agentName={execution?.agent_name}
                agentInstructions={agentInstructions}
            />

            {/* Card Modal */}
            <CardModal
                isOpen={!!selectedCard}
                onClose={() => setSelectedCard(null)}
                onDelete={async (deletedCardId) => {
                    setCards(prev => prev.filter(c => c.id !== deletedCardId));
                    setSelectedCard(null);
                }}
                onSave={async (cardData) => {
                    if (selectedCard) {
                        const cardId = selectedCard.id;
                        try {
                            const updatedCard = await updateCard(cardId, cardData);
                            setCards(prev => prev.map(c => c.id === cardId ? updatedCard : c));
                        } catch (err) {
                            console.error('Failed to update card:', err);
                        }
                    }
                }}
                initialData={selectedCard}
                epics={epics}
                sprints={sprints}
                columns={columns}
                repoNames={repoNames}
            />

            {/* Walkthroughs Modal */}
            <WalkthroughModal
                isOpen={isWalkthroughModalOpen}
                onClose={() => setIsWalkthroughModalOpen(false)}
                walkthroughs={walkthroughs}
                isLoadingWalkthroughs={isLoadingWalkthroughs}
                selectedWalkthrough={selectedWalkthrough}
                setSelectedWalkthrough={setSelectedWalkthrough}
                isEditingWalkthrough={isEditingWalkthrough}
                setIsEditingWalkthrough={setIsEditingWalkthrough}
                walkthroughContent={walkthroughContent}
                setWalkthroughContent={setWalkthroughContent}
                isSavingWalkthrough={isSavingWalkthrough}
                handleSaveWalkthrough={handleSaveWalkthrough}
            />

            {/* Docs Modal */}
            <DocsModal
                isOpen={isDocsModalOpen}
                onClose={() => setIsDocsModalOpen(false)}
                docsModalTab={docsModalTab}
                setDocsModalTab={setDocsModalTab}
                isLoadingDocs={isLoadingDocs}
                governanceDocs={governanceDocs}
                selectedDocIds={selectedDocIds}
                toggleDocSelection={toggleDocSelection}
                setViewDoc={setViewDoc}
                decisions={decisions}
                selectedDecisionIds={selectedDecisionIds}
                toggleDecisionSelection={toggleDecisionSelection}
                handleRefresh={handleRefresh}
            />

            {/* Peer Review Report Modal */}
            <PeerReviewModal
                isOpen={isPeerReviewModalOpen}
                onClose={() => setIsPeerReviewModalOpen(false)}
                isLoadingPeerReview={isLoadingPeerReview}
                peerReviewSnap={peerReviewSnap}
            />

            {/* Tasks Modal */}
            <TasksModal
                isOpen={isTasksModalOpen}
                onClose={() => setIsTasksModalOpen(false)}
                cards={cards}
            />

            {/* Agent Tools & Skills Modal */}
            <AgentCapabilitiesModal
                isOpen={isToolsModalOpen}
                onClose={() => setIsToolsModalOpen(false)}
                execution={execution}
                templates={templates}
            />

            {/* Live Session Timer — fixed bottom-right, hidden when execution is done */}
            {execution.status !== 'done' && (
                <ExecutionTimer executionId={execution.id} projectId={projectId!} />
            )}

            {/* Time Tracking Modal — opens when execution reaches status=done */}
            {isTimeTrackingModalOpen && (
                <TimeTrackingModal
                    execution={execution}
                    projectId={projectId!}
                    availableCards={cards}
                    onClose={() => {
                        // Time logged (or saved successfully): close modal and leave the cockpit.
                        setIsTimeTrackingModalOpen(false);
                        navigate(`/project/${projectId}/executions`);
                    }}
                    onSkip={() => {
                        // Dismiss without logging: stay on the cockpit so the user can
                        // reopen via "Execution Complete — Exit" and still log their time.
                        setIsTimeTrackingModalOpen(false);
                    }}
                />
            )}

            {/* Document View Modal */}
            <DocumentViewModal
                isOpen={!!viewDoc}
                doc={viewDoc}
                onClose={() => { setViewDoc(null); setIsEditingDoc(false); }}
                onSave={async (newContent) => {
                    if (!viewDoc) return;
                    setIsSavingDoc(true);
                    try {
                        const updated = await updateGovernanceDoc(viewDoc.id, { content: newContent });
                        setGovernanceDocs(prev => prev.map(d => d.id === viewDoc.id ? updated : d));
                        setViewDoc(updated);
                        setIsEditingDoc(false);
                    } catch (err) {
                        console.error('Failed to save document:', err);
                        throw err;
                    } finally {
                        setIsSavingDoc(false);
                    }
                }}
            />
        </div>
    );
};
