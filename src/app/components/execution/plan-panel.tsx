import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
    FileText,
    Pencil,
    Trash2,
    Check,
    Zap,
    RefreshCcw,
    Loader2,
    Copy
} from 'lucide-react';
import { Tag } from '@/app/components/shared/tag';
import type { AgentTaskExecution, Sprint } from '@/services/types';

interface PlanPanelProps {
    execution: AgentTaskExecution;
    sprints: Sprint[];
    isSequential: boolean;
    currentPlan: any;
    isPlanWaiting: (plan: any) => boolean;
    isEditingPlan: boolean;
    setIsEditingPlan: React.Dispatch<React.SetStateAction<boolean>>;
    editingPlanId: string | null;
    setEditingPlanId: React.Dispatch<React.SetStateAction<string | null>>;
    planContent: string;
    setPlanContent: React.Dispatch<React.SetStateAction<string>>;
    planTitle: string;
    setPlanTitle: React.Dispatch<React.SetStateAction<string>>;
    isSavingPlan: boolean;
    handleSavePlan: () => Promise<void>;
    handleEditPlan: (plan: any) => void;
    handleCopy: (id: string, text: string) => void;
    copiedId: string | null;
    handleOpenPeerReview: () => Promise<void>;
    updatePlanStatus: (planId: string, status: string) => Promise<void>;
    deletePlanFn: (planId: string) => Promise<void>;
}

export const PlanPanel: React.FC<PlanPanelProps> = ({
    execution,
    sprints,
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
    handleSavePlan,
    handleEditPlan,
    handleCopy,
    copiedId,
    handleOpenPeerReview,
    updatePlanStatus,
    deletePlanFn
}) => {
    return (
        <div className="space-y-8">
            {execution.phase === 'plan_review' && (
                <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-2">
                        <span className="inline-flex items-center px-2 py-0.5 text-[9px] uppercase tracking-wider font-bold rounded-md bg-violet-500/20 text-violet-300 border border-violet-500/30">
                            Plan Review Phase
                        </span>
                        <span className="text-[10px] text-white/30">Review plans and check the peer review report below.</span>
                    </div>
                    <button
                        onClick={handleOpenPeerReview}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-500/10 border border-violet-500/20 text-[10px] font-bold text-violet-400 hover:bg-violet-500/20 hover:text-violet-300 transition-all"
                    >
                        <FileText className="w-3.5 h-3.5" />
                        View Review Report
                    </button>
                </div>
            )}
            {(execution.context_data?.plans || []).length > 0 ? (
                (execution.context_data?.plans || []).map((plan: any) => {
                    const isWaiting = isPlanWaiting(plan);
                    return (
                        <div
                            key={plan.id}
                            className={`p-8 rounded-3xl border relative overflow-hidden group/plan transition-all ${plan.id === execution.plan_id
                                ? 'bg-blue-500/[0.05] border-blue-500/30 shadow-[0_0_20px_rgba(59,130,246,0.05)]'
                                : isWaiting
                                    ? 'bg-white/[0.01] border-white/5 opacity-60'
                                    : 'bg-white/[0.03] border-white/10'
                                } hover:border-blue-500/40`}
                        >
                            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 blur-3xl -mr-16 -mt-16 group-hover/plan:bg-blue-500/10 transition-colors" />

                            <div className="flex items-center gap-3 mb-6 relative z-10">
                                <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center border border-blue-500/30 shrink-0">
                                    <FileText className="w-5 h-5 text-blue-400" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    {isEditingPlan && editingPlanId === plan.id ? (
                                        <input
                                            type="text"
                                            value={planTitle}
                                            onChange={(e) => setPlanTitle(e.target.value)}
                                            className="bg-black/40 border border-white/10 rounded-lg px-3 py-1 text-xl font-bold text-white focus:outline-none focus:border-blue-500/50 w-full mb-1"
                                            placeholder="Plan Title..."
                                        />
                                    ) : (
                                        <h2 className="text-xl font-bold text-white leading-tight truncate flex items-center gap-2">
                                            {plan.title}
                                            {plan.execution_order !== undefined && plan.execution_order !== null && (
                                                <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-bold rounded-md bg-blue-500/20 text-blue-300 border border-blue-500/30">
                                                    #{plan.execution_order}
                                                </span>
                                            )}
                                        </h2>
                                    )}
                                    {plan.sprint_id && (
                                        <p className="text-[10px] text-white/30 uppercase font-bold tracking-widest mt-1">
                                            Sprint: {sprints.find(s => s.id === plan.sprint_id)?.tag || 'Linked Sprint'}
                                        </p>
                                    )}
                                </div>

                                {/* Action Bar */}
                                <div className="flex items-center gap-4 shrink-0">
                                    {isEditingPlan && editingPlanId === plan.id ? (
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => setIsEditingPlan(false)}
                                                className="px-3 py-1 bg-white/5 hover:bg-white/10 text-white/60 text-[10px] font-bold rounded-lg transition-colors border border-white/10"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                onClick={handleSavePlan}
                                                disabled={isSavingPlan}
                                                className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-bold rounded-lg transition-colors flex items-center gap-1 shadow-lg shadow-blue-900/20 disabled:opacity-50"
                                            >
                                                {isSavingPlan ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                                                Save Changes
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-4">
                                            {/* Status & Transitions */}
                                            <div className="flex items-center gap-2">
                                                {isWaiting && (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-yellow-300 text-[10px] font-bold uppercase tracking-wider mr-2">
                                                        ⏳ Aguardando plano anterior
                                                    </span>
                                                )}
                                                {plan.status === 'draft' && (
                                                    <>
                                                        <Tag variant="orange" className="px-2 py-0.5 text-[9px] uppercase font-bold tracking-wider">Draft</Tag>
                                                        <button
                                                            onClick={() => updatePlanStatus(plan.id, 'approved')}
                                                            className="px-3 py-1.5 bg-green-600 hover:bg-green-500 text-white text-[10px] font-bold rounded-lg transition-all flex items-center gap-1.5 shadow-lg shadow-green-900/20 group/btn"
                                                        >
                                                            <Check className="w-3.5 h-3.5 group-hover/btn:scale-110 transition-transform" />
                                                            Approve Plan
                                                        </button>
                                                    </>
                                                )}
                                                {plan.status === 'approved' && (
                                                    <>
                                                        <Tag variant="green" className="px-2 py-0.5 text-[9px] uppercase font-bold tracking-wider">Approved</Tag>
                                                        <button
                                                            onClick={() => updatePlanStatus(plan.id, 'selected')}
                                                            className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white text-[10px] font-bold rounded-lg transition-all flex items-center gap-1.5 shadow-lg shadow-purple-900/20 group/btn"
                                                        >
                                                            <Zap className="w-3.5 h-3.5 group-hover/btn:scale-110 transition-transform" />
                                                            Select for Execution
                                                        </button>
                                                    </>
                                                )}
                                                {plan.status === 'selected' && (
                                                    <>
                                                        <Tag variant="purple" className="px-2 py-0.5 text-[9px] uppercase font-bold tracking-wider">Selected</Tag>
                                                        <button
                                                            onClick={() => updatePlanStatus(plan.id, 'approved')}
                                                            className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white/60 text-[10px] font-bold rounded-lg transition-all flex items-center gap-1.5 border border-white/10 group/btn"
                                                        >
                                                            <RefreshCcw className="w-3.5 h-3.5 group-hover/btn:rotate-180 transition-transform duration-500" />
                                                            Deselect
                                                        </button>
                                                    </>
                                                )}
                                                {plan.status === 'in_execution' && (
                                                    <>
                                                        <Tag variant="blue" className="px-2 py-0.5 text-[9px] uppercase font-bold tracking-wider">In Execution</Tag>
                                                        {(execution.phase === 'macro_planning' || execution.phase === 'micro_planning') && (
                                                            <button
                                                                onClick={() => updatePlanStatus(plan.id, 'selected')}
                                                                className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white/60 text-[10px] font-bold rounded-lg transition-all flex items-center gap-1.5 border border-white/10"
                                                            >
                                                                <RefreshCcw className="w-3.5 h-3.5" />
                                                                Return to Selected
                                                            </button>
                                                        )}
                                                    </>
                                                )}
                                            </div>

                                            {/* Management Icons */}
                                            <div className="flex items-center gap-1 pl-4 border-l border-white/10">
                                                <button
                                                    onClick={() => handleEditPlan(plan)}
                                                    className="p-2 bg-white/5 hover:bg-white/10 text-white/40 hover:text-white rounded-lg transition-all border border-white/5 hover:border-white/20"
                                                    title="Edit Plan"
                                                >
                                                    <Pencil className="w-3.5 h-3.5" />
                                                </button>
                                                {plan.status !== 'in_execution' && plan.status !== 'executed' && (
                                                    <button
                                                        onClick={() => deletePlanFn(plan.id)}
                                                        className="p-2 bg-red-500/5 hover:bg-red-500/10 text-red-400/60 hover:text-red-400 rounded-lg transition-all border border-red-500/10 hover:border-red-500/20"
                                                        title="Delete Plan"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="relative group/content z-10">
                                {!isEditingPlan && (
                                    <button
                                        onClick={() => handleCopy(plan.id, plan.content || '')}
                                        className="absolute top-4 right-4 p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-all border border-white/5 opacity-0 group-hover/content:opacity-100"
                                        title="Copy Plan Content"
                                    >
                                        {copiedId === plan.id ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                                    </button>
                                )}
                                {isEditingPlan && editingPlanId === plan.id ? (
                                    <textarea
                                        value={planContent}
                                        onChange={(e) => setPlanContent(e.target.value)}
                                        className="w-full h-[400px] bg-black/40 border border-white/10 rounded-2xl p-6 text-sm text-white/80 font-mono focus:outline-none focus:border-blue-500/50 transition-all resize-none"
                                        placeholder="Enter plan content (Markdown supported)..."
                                    />
                                ) : (
                                    <div className="p-6 rounded-2xl bg-black/20 border border-white/5 overflow-hidden">
                                        {plan.content ? (
                                            <div className="prose prose-invert max-w-none select-text cursor-text text-sm text-white/80 marker:text-white/40">
                                                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                                    {plan.content}
                                                </ReactMarkdown>
                                            </div>
                                        ) : (
                                            <div className="text-white/60 text-sm font-mono">
                                                No content available for this plan.
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })
            ) : (
                <div className="p-8 rounded-3xl bg-white/[0.03] border border-white/10">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center border border-blue-500/30">
                            <FileText className="w-5 h-5 text-blue-400" />
                        </div>
                        <h2 className="text-xl font-bold text-white">Strategic Plan</h2>
                    </div>
                    <div className="relative group/content">
                        <button
                            onClick={() => handleCopy('strategic', execution.context_data?.strategic_plan || '')}
                            className="absolute top-4 right-4 p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-all border border-white/5 opacity-0 group-hover/content:opacity-100"
                            title="Copy Strategic Plan"
                        >
                            {copiedId === 'strategic' ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                        </button>
                        <div className="p-6 rounded-2xl bg-black/20 border border-white/5 overflow-hidden">
                            {execution.context_data?.strategic_plan ? (
                                <div className="prose prose-invert max-w-none select-text cursor-text text-sm text-white/80 marker:text-white/40">
                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                        {execution.context_data.strategic_plan}
                                    </ReactMarkdown>
                                </div>
                            ) : (
                                <div className="text-white/60 text-sm font-mono">
                                    No strategic plan attached to this execution.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
