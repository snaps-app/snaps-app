import { Check } from 'lucide-react';
import type { AgentTaskExecution, Card, WorkflowTemplate } from '@/services/types';

interface ExecutionRequirementsChecklistProps {
    execution: AgentTaskExecution;
    templates: WorkflowTemplate[];
    cards: Card[];
}

export const ExecutionRequirementsChecklist: React.FC<ExecutionRequirementsChecklistProps> = ({
    execution,
    templates,
    cards,
}) => {
    const activeTemplate = templates.find(t => t.id === execution.workflow_template_id) || templates[0];
    const activePhaseConfig = activeTemplate?.phases?.find((p: any) => p.key === execution.phase);

    let activeRules = activePhaseConfig?.advance_conditions;
    if (!activeRules || Object.keys(activeRules).length === 0) {
        if (execution.phase === 'macro_planning') {
            activeRules = { sprint_linked: true, plan_approved: true };
        } else if (execution.phase === 'micro_planning') {
            activeRules = { tactical_plans_approved: true, plan_selected: true, bdd_scenarios_generated: true };
        } else if (execution.phase === 'execution') {
            activeRules = { tasks_finished: true };
        } else if (execution.phase === 'assurance') {
            activeRules = { cards_done: true, bdd_validated: true };
        } else {
            activeRules = {};
        }
    }

    const hasAnyRule = Object.values(activeRules).some(v => !!v);

    return (
        <div className="mb-4 space-y-2">
            <p className="text-[9px] font-bold text-white/40 uppercase tracking-[0.2em] mb-3">Phase Requirements</p>

            {!hasAnyRule && (
                <p className="text-[11px] text-white/30 italic">No transition requirements set for this phase.</p>
            )}

            {activeRules.sprint_linked && (
                <div className="flex items-center gap-3">
                    {execution.sprint_ids && execution.sprint_ids.length > 0 ? (
                        <div className="w-4 h-4 rounded-full bg-green-500/20 flex items-center justify-center border border-green-500/30">
                            <Check className="w-2.5 h-2.5 text-green-400" />
                        </div>
                    ) : (
                        <div className="w-4 h-4 rounded-full bg-white/5 border border-white/10" />
                    )}
                    <span className={`text-[11px] ${execution.sprint_ids && execution.sprint_ids.length > 0 ? 'text-white/60' : 'text-white/30'}`}>
                        Sprint Created & Linked
                    </span>
                </div>
            )}

            {activeRules.plan_approved && (
                <div className="flex items-center gap-3">
                    {(execution.context_data?.plans || []).some((p: any) => ['approved', 'selected', 'in_execution', 'executed'].includes(p.status)) ? (
                        <div className="w-4 h-4 rounded-full bg-green-500/20 flex items-center justify-center border border-green-500/30">
                            <Check className="w-2.5 h-2.5 text-green-400" />
                        </div>
                    ) : (
                        <div className="w-4 h-4 rounded-full bg-white/5 border border-white/10" />
                    )}
                    <span className={`text-[11px] ${(execution.context_data?.plans || []).some((p: any) => ['approved', 'selected', 'in_execution', 'executed'].includes(p.status)) ? 'text-white/60' : 'text-white/30'}`}>
                        Strategic Plan Approved
                    </span>
                </div>
            )}

            {activeRules.tactical_plans_approved && (
                <div className="flex items-center gap-3">
                    {(execution.context_data?.plans || []).every((p: any) => ['approved', 'selected', 'in_execution', 'executed'].includes(p.status)) ? (
                        <div className="w-4 h-4 rounded-full bg-green-500/20 flex items-center justify-center border border-green-500/30">
                            <Check className="w-2.5 h-2.5 text-green-400" />
                        </div>
                    ) : (
                        <div className="w-4 h-4 rounded-full bg-white/5 border border-white/10" />
                    )}
                    <span className={`text-[11px] ${(execution.context_data?.plans || []).every((p: any) => ['approved', 'selected', 'in_execution', 'executed'].includes(p.status)) ? 'text-white/60' : 'text-white/30'}`}>
                        All Tactical Plans Approved
                    </span>
                </div>
            )}

            {activeRules.plan_selected && (
                <div className="flex items-center gap-3">
                    {(execution.context_data?.plans || []).some((p: any) => ['selected', 'in_execution', 'executed'].includes(p.status)) ? (
                        <div className="w-4 h-4 rounded-full bg-green-500/20 flex items-center justify-center border border-green-500/30">
                            <Check className="w-2.5 h-2.5 text-green-400" />
                        </div>
                    ) : (
                        <div className="w-4 h-4 rounded-full bg-white/5 border border-white/10" />
                    )}
                    <span className={`text-[11px] ${(execution.context_data?.plans || []).some((p: any) => ['selected', 'in_execution', 'executed'].includes(p.status)) ? 'text-white/60' : 'text-white/30'}`}>
                        At least one plan selected
                    </span>
                </div>
            )}

            {activeRules.bdd_scenarios_generated && (
                <div className="flex items-center gap-3">
                    {cards.length > 0 && cards.every(c => (c.bdd_scenarios?.length || 0) > 0) ? (
                        <div className="w-4 h-4 rounded-full bg-green-500/20 flex items-center justify-center border border-green-500/30">
                            <Check className="w-2.5 h-2.5 text-green-400" />
                        </div>
                    ) : (
                        <div className="w-4 h-4 rounded-full bg-white/5 border border-white/10" />
                    )}
                    <span className={`text-[11px] ${cards.length > 0 && cards.every(c => (c.bdd_scenarios?.length || 0) > 0) ? 'text-white/60' : 'text-white/30'}`}>
                        BDD Scenarios Generated
                    </span>
                </div>
            )}

            {activeRules.tasks_finished && (
                <div className="flex items-center gap-3">
                    {cards.length > 0 && cards.every(c => c.status === 'assurance' || c.status === 'done') ? (
                        <div className="w-4 h-4 rounded-full bg-green-500/20 flex items-center justify-center border border-green-500/30">
                            <Check className="w-2.5 h-2.5 text-green-400" />
                        </div>
                    ) : (
                        <div className="w-4 h-4 rounded-full bg-white/5 border border-white/10" />
                    )}
                    <span className={`text-[11px] ${cards.length > 0 && cards.every(c => c.status === 'assurance' || c.status === 'done') ? 'text-white/60' : 'text-white/30'}`}>
                        All Tasks Finished (Assurance)
                    </span>
                </div>
            )}

            {activeRules.cards_done && (
                <div className="flex items-center gap-3">
                    {cards.length > 0 && cards.every(c => c.status === 'done') ? (
                        <div className="w-4 h-4 rounded-full bg-green-500/20 flex items-center justify-center border border-green-500/30">
                            <Check className="w-2.5 h-2.5 text-green-400" />
                        </div>
                    ) : (
                        <div className="w-4 h-4 rounded-full bg-white/5 border border-white/10" />
                    )}
                    <span className={`text-[11px] ${cards.length > 0 && cards.every(c => c.status === 'done') ? 'text-white/60' : 'text-white/30'}`}>
                        All Cards Validated & Done
                    </span>
                </div>
            )}

            {activeRules.bdd_validated && (
                <div className="flex items-center gap-3">
                    {cards.length > 0 && cards.every(c => c.bdd_validated) ? (
                        <div className="w-4 h-4 rounded-full bg-green-500/20 flex items-center justify-center border border-green-500/30">
                            <Check className="w-2.5 h-2.5 text-green-400" />
                        </div>
                    ) : (
                        <div className="w-4 h-4 rounded-full bg-white/5 border border-white/10" />
                    )}
                    <span className={`text-[11px] ${cards.length > 0 && cards.every(c => c.bdd_validated) ? 'text-white/60' : 'text-white/30'}`}>
                        BDD Design Approved (Scenario Review)
                    </span>
                </div>
            )}

            {activeRules.ci_passed && (
                <div className="flex items-center gap-3">
                    {execution.context_data?.ci_status === 'success' ? (
                        <div className="w-4 h-4 rounded-full bg-green-500/20 flex items-center justify-center border border-green-500/30">
                            <Check className="w-2.5 h-2.5 text-green-400" />
                        </div>
                    ) : (
                        <div className="w-4 h-4 rounded-full bg-white/5 border border-white/10" />
                    )}
                    <span className={`text-[11px] ${execution.context_data?.ci_status === 'success' ? 'text-white/60' : 'text-white/30'}`}>
                        CI Passed
                        {execution.context_data?.ci_status && execution.context_data.ci_status !== 'success' && (
                            <span className="ml-1.5 px-1 py-0.5 rounded text-[9px] font-bold bg-amber-500/20 border border-amber-500/30 text-amber-300">
                                {execution.context_data.ci_status}
                            </span>
                        )}
                    </span>
                </div>
            )}

            {activeRules.pr_merged && (
                <div className="flex items-center gap-3">
                    {execution.context_data?.pr_merged ? (
                        <div className="w-4 h-4 rounded-full bg-green-500/20 flex items-center justify-center border border-green-500/30">
                            <Check className="w-2.5 h-2.5 text-green-400" />
                        </div>
                    ) : (
                        <div className="w-4 h-4 rounded-full bg-white/5 border border-white/10" />
                    )}
                    <span className={`text-[11px] ${execution.context_data?.pr_merged ? 'text-white/60' : 'text-white/30'}`}>
                        PR Merged
                    </span>
                </div>
            )}
        </div>
    );
};
