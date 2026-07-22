import type { Card, Epic, Sprint } from '@/services/types';
import { Loader2, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ExecutionWizardModal } from '@/app/components/modals/execution-wizard-modal';
import { Spinner } from '@/app/components/ui/spinner';
import { CardTasksPanel } from '@/app/components/modals/card-tasks-panel';
import { CardBddPanel } from '@/app/components/modals/card-bdd-panel';
import { useCardModal } from '@/app/components/modals/useCardModal';
import { CardModalHeader } from '@/app/components/modals/CardModalHeader';
import { CardModalDescription } from '@/app/components/modals/CardModalDescription';
import { CardModalSidebar } from '@/app/components/modals/CardModalSidebar';

interface CardModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (cardData: Partial<Card>) => void;
    onDelete?: (cardId: string) => void;
    initialData?: Card | null;
    boardId?: string;
    epics?: Epic[];
    sprints?: Sprint[];
    columns?: { id: string; title: string }[];
    repoNames?: string[];
    onAiExecute?: () => void;
}

export function CardModal({
    isOpen,
    onClose,
    onSave,
    onDelete,
    initialData,
    epics = [],
    sprints = [],
    columns,
    repoNames = [],
    onAiExecute
}: CardModalProps) {
    const safeColumns = columns || [];

    const {
        title,
        setTitle,
        description,
        setDescription,
        status,
        setStatus,
        priority,
        setPriority,
        cardType,
        setCardType,
        dueDate,
        setDueDate,
        tags,
        tagInput,
        setTagInput,
        epicId,
        setEpicId,
        sprintId,
        setSprintId,
        repoName,
        setRepoName,
        bddScenarios,
        setBddScenarios,
        bddValidated,
        setBddValidated,
        isWizardOpen,
        setIsWizardOpen,
        isLoading,
        descMode,
        setDescMode,
        isUploading,
        fileInputRef,
        isDeleting,
        tasks,
        handleDelete,
        handleSave,
        handleUploadFiles,
        handleAddTask,
        handleToggleTask,
        handleDeleteTask,
        handleAddTag,
        removeTag,
    } = useCardModal({
        isOpen,
        initialData,
        safeColumns,
        repoNames,
        onSave,
        onClose,
        onDelete,
    });

    return (
        <>
            <AnimatePresence>
                {isOpen && (
                    <>
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={onClose}
                            className="fixed inset-0 z-50"
                            style={{
                                backgroundColor: 'rgba(0, 0, 0, 0.7)',
                                backdropFilter: 'blur(20px)'
                            }}
                        />

                        {/* Modal */}
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                                className="w-full max-w-4xl pointer-events-auto relative flex flex-col max-h-[90vh]"
                            >
                                <div
                                    className="rounded-2xl backdrop-blur-[40px] flex flex-col h-full overflow-hidden"
                                    style={{
                                        background: 'rgba(10, 10, 10, 0.95)',
                                        border: '1px solid rgba(255, 255, 255, 0.1)',
                                        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.8)'
                                    }}
                                >
                                    {/* Header */}
                                    <CardModalHeader
                                        title={title}
                                        setTitle={setTitle}
                                        status={status}
                                        setStatus={setStatus}
                                        priority={priority}
                                        setPriority={setPriority}
                                        cardType={cardType}
                                        setCardType={setCardType}
                                        safeColumns={safeColumns}
                                        initialData={initialData}
                                        onClose={onClose}
                                    />

                                    {/* Content */}
                                    <div className="flex-1 overflow-y-auto p-6 flex gap-8 relative min-h-[400px]">
                                        <AnimatePresence mode="wait">
                                            {isLoading && (
                                                <motion.div
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: 1 }}
                                                    exit={{ opacity: 0 }}
                                                    className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-md z-[60]"
                                                >
                                                    <Spinner size="lg" color="#00D4FF" />
                                                    <motion.p
                                                        initial={{ opacity: 0, y: 5 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        className="mt-4 text-[10px] font-black tracking-[0.2em] uppercase text-blue-400/60"
                                                    >
                                                        Carregando Dados
                                                    </motion.p>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>

                                        {!isLoading && (
                                            <>
                                                {/* Main Left Column */}
                                                <div className="flex-1 space-y-6">
                                                    {/* Description */}
                                                    <CardModalDescription
                                                        description={description}
                                                        setDescription={setDescription}
                                                        descMode={descMode}
                                                        setDescMode={setDescMode}
                                                        isUploading={isUploading}
                                                        fileInputRef={fileInputRef}
                                                        handleUploadFiles={handleUploadFiles}
                                                    />

                                                    {/* Tasks Section */}
                                                    <CardTasksPanel
                                                        initialData={initialData}
                                                        tasks={tasks}
                                                        onAddTask={handleAddTask}
                                                        onToggleTask={handleToggleTask}
                                                        onDeleteTask={handleDeleteTask}
                                                    />

                                                    {/* BDD Specifications Panel */}
                                                    <CardBddPanel
                                                        cardType={cardType as any}
                                                        bddValidated={bddValidated}
                                                        setBddValidated={setBddValidated}
                                                        bddScenarios={bddScenarios}
                                                        setBddScenarios={setBddScenarios}
                                                    />
                                                </div>

                                                {/* Sidebar Right Column */}
                                                <CardModalSidebar
                                                    initialData={initialData}
                                                    onAiExecute={onAiExecute}
                                                    setIsWizardOpen={setIsWizardOpen}
                                                    tags={tags}
                                                    tagInput={tagInput}
                                                    setTagInput={setTagInput}
                                                    handleAddTag={handleAddTag}
                                                    removeTag={removeTag}
                                                    epicId={epicId}
                                                    setEpicId={setEpicId}
                                                    sprintId={sprintId}
                                                    setSprintId={setSprintId}
                                                    repoName={repoName}
                                                    setRepoName={setRepoName}
                                                    dueDate={dueDate}
                                                    setDueDate={setDueDate}
                                                    epics={epics}
                                                    sprints={sprints}
                                                    repoNames={repoNames}
                                                />
                                            </>
                                        )}
                                    </div>

                                    {/* Footer */}
                                    <div className="p-6 border-t border-white/10 flex justify-between items-center shrink-0">
                                        <div>
                                            {initialData?.id && (
                                                <button
                                                    type="button"
                                                    onClick={handleDelete}
                                                    disabled={isDeleting}
                                                    className="px-4 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 font-medium border border-red-500/30 transition-all flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                                                >
                                                    {isDeleting ? (
                                                        <>
                                                            <Loader2 className="w-4 h-4 animate-spin" />
                                                            <span>Deletando...</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Trash2 className="w-4 h-4" />
                                                            <span>Delete</span>
                                                        </>
                                                    )}
                                                </button>
                                            )}
                                        </div>
                                        <div className="flex gap-3">
                                            <button
                                                type="button"
                                                onClick={onClose}
                                                className="px-6 py-2 rounded-xl text-white/60 hover:text-white hover:bg-white/5 transition-colors"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                type="button"
                                                onClick={handleSave}
                                                className="px-6 py-2 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-medium shadow-lg shadow-blue-500/25 transition-all"
                                            >
                                                {initialData ? 'Save Changes' : 'Create Card'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    </>
                )}
            </AnimatePresence>

            {initialData?.id && (
                <ExecutionWizardModal
                    isOpen={isWizardOpen}
                    onClose={() => setIsWizardOpen(false)}
                    entityId={initialData.id}
                    entityType="card"
                    entityTitle={initialData.title}
                />
            )}
        </>
    );
}
