import { Check } from 'lucide-react';
import type { AgentTaskExecution, Card, WorkflowTemplate } from '@/services/types';
import { useState } from 'react';

interface ExecutionRequirementsChecklistProps {
    execution: AgentTaskExecution;
    templates: WorkflowTemplate[];
    cards: Card[];
    onRequirementToggle?: (requirementKey: string, value: boolean) => Promise<void>;
}

export const ExecutionRequirementsChecklist: React.FC<ExecutionRequirementsChecklistProps> = ({
    execution,
    templates,
    cards,
    onRequirementToggle,
}) => {
    const [manualRequirements, setManualRequirements] = useState<Record<string, boolean>>({});
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

    const toggleRequirement = async (key: string) => {
        const newValue = !manualRequirements[key];
        setManualRequirements(prev => ({ ...prev, [key]: newValue }));
        if (onRequirementToggle) {
            try {
                await onRequirementToggle(key, newValue);
            } catch (err) {
                console.error('Failed to toggle requirement:', err);
                setManualRequirements(prev => ({ ...prev, [key]: !newValue }));
            }
        }
    };

    return (
        <div className="mb-4 space-y-2">
            <p className="text-[9px] font-bold text-white/40 uppercase tracking-[0.2em] mb-3">Phase Requirements</p>

            {!hasAnyRule && (
                <p className="text-[11px] text-white/30 italic">No transition requirements set for this phase.</p>
            )}

            {activeRules.sprint_linked && (
                <button
                    onClick={() => toggleRequirement('sprint_linked')}
                    className="flex items-center gap-3 hover:opacity-80 transition-opacity cursor-pointer w-full"
                >
                    {(execution.sprint_ids && execution.sprint_ids.length > 0) || manualRequirements['sprint_linked'] ? (
                        <div className="w-4 h-4 rounded-full bg-green-500/20 flex items-center justify-center border border-green-500/30 flex-shrink-0">
                            <Check className="w-2.5 h-2.5 text-green-400" />
                        </div>
                    ) : (
                        <div className="w-4 h-4 rounded-full bg-white/5 border border-white/10 flex-shrink-0" />
                    )}
                    <span className={`text-[11px] ${(execution.sprint_ids && execution.sprint_ids.length > 0) || manualRequirements['sprint_linked'] ? 'text-white/60' : 'text-white/30'}`}>
                        Sprint Created & Linked
                    </span>
                </button>
            )}

            {activeRules.plan_approved && (
                <button
                    onClick={() => toggleRequirement('plan_approved')}
                    className="flex items-center gap-3 hover:opacity-80 transition-opacity cursor-pointer w-full"
                >
                    {((execution.context_data?.plans || []).some((p: any) => ['approved', 'selected', 'in_execution', 'executed'].includes(p.status))) || manualRequirements['plan_approved'] ? (
                        <div className="w-4 h-4 rounded-full bg-green-500/20 flex items-center justify-center border border-green-500/30 flex-shrink-0">
                            <Check className="w-2.5 h-2.5 text-green-400" />
                        </div>
                    ) : (
                        <div className="w-4 h-4 rounded-full bg-white/5 border border-white/10 flex-shrink-0" />
                    )}
                    <span className={`text-[11px] ${((execution.context_data?.plans || []).some((p: any) => ['approved', 'selected', 'in_execution', 'executed'].includes(p.status))) || manualRequirements['plan_approved'] ? 'text-white/60' : 'text-white/30'}`}>
                        Strategic Plan Approved
                    </span>
                </button>
            )}

            {activeRules.tactical_plans_approved && (
                <button
                    onClick={() => toggleRequirement('tactical_plans_approved')}
                    className="flex items-center gap-3 hover:opacity-80 transition-opacity cursor-pointer w-full"
                >
                    {((execution.context_data?.plans || []).every((p: any) => ['approved', 'selected', 'in_execution', 'executed'].includes(p.status))) || manualRequirements['tactical_plans_approved'] ? (
                        <div className="w-4 h-4 rounded-full bg-green-500/20 flex items-center justify-center border border-green-500/30 flex-shrink-0">
                            <Check className="w-2.5 h-2.5 text-green-400" />
                        </div>
                    ) : (
                        <div className="w-4 h-4 rounded-full bg-white/5 border border-white/10 flex-shrink-0" />
                    )}
                    <span className={`text-[11px] ${((execution.context_data?.plans || []).every((p: any) => ['approved', 'selected', 'in_execution', 'executed'].includes(p.status))) || manualRequirements['tactical_plans_approved'] ? 'text-white/60' : 'text-white/30'}`}>
                        All Tactical Plans Approved
                    </span>
                </button>
            )}

            {activeRules.plan_selected && (
                <button
                    onClick={() => toggleRequirement('plan_selected')}
                    className="flex items-center gap-3 hover:opacity-80 transition-opacity cursor-pointer w-full"
                >
                    {((execution.context_data?.plans || []).some((p: any) => ['selected', 'in_execution', 'executed'].includes(p.status))) || manualRequirements['plan_selected'] ? (
                        <div className="w-4 h-4 rounded-full bg-green-500/20 flex items-center justify-center border border-green-500/30 flex-shrink-0">
                            <Check className="w-2.5 h-2.5 text-green-400" />
                        </div>
                    ) : (
                        <div className="w-4 h-4 rounded-full bg-white/5 border border-white/10 flex-shrink-0" />
                    )}
                    <span className={`text-[11px] ${((execution.context_data?.plans || []).some((p: any) => ['selected', 'in_execution', 'executed'].includes(p.status))) || manualRequirements['plan_selected'] ? 'text-white/60' : 'text-white/30'}`}>
                        At least one plan selected
                    </span>
                </button>
            )}

            {activeRules.bdd_scenarios_generated && (
                <button
                    onClick={() => toggleRequirement('bdd_scenarios_generated')}
                    className="flex items-center gap-3 hover:opacity-80 transition-opacity cursor-pointer w-full"
                >
                    {(cards.length > 0 && cards.every(c => (c.bdd_scenarios?.length || 0) > 0)) || manualRequirements['bdd_scenarios_generated'] ? (
                        <div className="w-4 h-4 rounded-full bg-green-500/20 flex items-center justify-center border border-green-500/30 flex-shrink-0">
                            <Check className="w-2.5 h-2.5 text-green-400" />
                        </div>
                    ) : (
                        <div className="w-4 h-4 rounded-full bg-white/5 border border-white/10 flex-shrink-0" />
                    )}
                    <span className={`text-[11px] ${(cards.length > 0 && cards.every(c => (c.bdd_scenarios?.length || 0) > 0)) || manualRequirements['bdd_scenarios_generated'] ? 'text-white/60' : 'text-white/30'}`}>
                        BDD Scenarios Generated
                    </span>
                </button>
            )}

            {activeRules.tasks_finished && (
                <button
                    onClick={() => toggleRequirement('tasks_finished')}
                    className="flex items-center gap-3 hover:opacity-80 transition-opacity cursor-pointer w-full"
                >
                    {(cards.length > 0 && cards.every(c => c.status === 'assurance' || c.status === 'done')) || manualRequirements['tasks_finished'] ? (
                        <div className="w-4 h-4 rounded-full bg-green-500/20 flex items-center justify-center border border-green-500/30 flex-shrink-0">
                            <Check className="w-2.5 h-2.5 text-green-400" />
                        </div>
                    ) : (
                        <div className="w-4 h-4 rounded-full bg-white/5 border border-white/10 flex-shrink-0" />
                    )}
                    <span className={`text-[11px] ${(cards.length > 0 && cards.every(c => c.status === 'assurance' || c.status === 'done')) || manualRequirements['tasks_finished'] ? 'text-white/60' : 'text-white/30'}`}>
                        All Tasks Finished (Assurance)
                    </span>
                </button>
            )}

            {activeRules.cards_done && (
                <button
                    onClick={() => toggleRequirement('cards_done')}
                    className="flex items-center gap-3 hover:opacity-80 transition-opacity cursor-pointer w-full"
                >
                    {(cards.length > 0 && cards.every(c => c.status === 'done')) || manualRequirements['cards_done'] ? (
                        <div className="w-4 h-4 rounded-full bg-green-500/20 flex items-center justify-center border border-green-500/30 flex-shrink-0">
                            <Check className="w-2.5 h-2.5 text-green-400" />
                        </div>
                    ) : (
                        <div className="w-4 h-4 rounded-full bg-white/5 border border-white/10 flex-shrink-0" />
                    )}
                    <span className={`text-[11px] ${(cards.length > 0 && cards.every(c => c.status === 'done')) || manualRequirements['cards_done'] ? 'text-white/60' : 'text-white/30'}`}>
                        All Cards Validated & Done
                    </span>
                </button>
            )}

            {activeRules.bdd_validated && (
                <button
                    onClick={() => toggleRequirement('bdd_validated')}
                    className="flex items-center gap-3 hover:opacity-80 transition-opacity cursor-pointer w-full"
                >
                    {(cards.length > 0 && cards.every(c => c.bdd_validated)) || manualRequirements['bdd_validated'] ? (
                        <div className="w-4 h-4 rounded-full bg-green-500/20 flex items-center justify-center border border-green-500/30 flex-shrink-0">
                            <Check className="w-2.5 h-2.5 text-green-400" />
                        </div>
                    ) : (
                        <div className="w-4 h-4 rounded-full bg-white/5 border border-white/10 flex-shrink-0" />
                    )}
                    <span className={`text-[11px] ${(cards.length > 0 && cards.every(c => c.bdd_validated)) || manualRequirements['bdd_validated'] ? 'text-white/60' : 'text-white/30'}`}>
                        BDD Design Approved (Scenario Review)
                    </span>
                </button>
            )}

            {activeRules.ci_passed && (
                <button
                    onClick={() => toggleRequirement('ci_passed')}
                    className="flex items-center gap-3 hover:opacity-80 transition-opacity cursor-pointer w-full"
                >
                    {(execution.context_data?.ci_status === 'success') || manualRequirements['ci_passed'] ? (
                        <div className="w-4 h-4 rounded-full bg-green-500/20 flex items-center justify-center border border-green-500/30 flex-shrink-0">
                            <Check className="w-2.5 h-2.5 text-green-400" />
                        </div>
                    ) : (
                        <div className="w-4 h-4 rounded-full bg-white/5 border border-white/10 flex-shrink-0" />
                    )}
                    <span className={`text-[11px] ${(execution.context_data?.ci_status === 'success') || manualRequirements['ci_passed'] ? 'text-white/60' : 'text-white/30'}`}>
                        CI Passed
                        {execution.context_data?.ci_status && execution.context_data.ci_status !== 'success' && !manualRequirements['ci_passed'] && (
                            <span className="ml-1.5 px-1 py-0.5 rounded text-[9px] font-bold bg-amber-500/20 border border-amber-500/30 text-amber-300">
                                {execution.context_data.ci_status}
                            </span>
                        )}
                    </span>
                </button>
            )}

            {activeRules.pr_merged && (
                <button
                    onClick={() => toggleRequirement('pr_merged')}
                    className="flex items-center gap-3 hover:opacity-80 transition-opacity cursor-pointer w-full"
                >
                    {execution.context_data?.pr_merged || manualRequirements['pr_merged'] ? (
                        <div className="w-4 h-4 rounded-full bg-green-500/20 flex items-center justify-center border border-green-500/30 flex-shrink-0">
                            <Check className="w-2.5 h-2.5 text-green-400" />
                        </div>
                    ) : (
                        <div className="w-4 h-4 rounded-full bg-white/5 border border-white/10 flex-shrink-0" />
                    )}
                    <span className={`text-[11px] ${execution.context_data?.pr_merged || manualRequirements['pr_merged'] ? 'text-white/60' : 'text-white/30'}`}>
                        PR Merged
                    </span>
                </button>
            )}
        </div>
    );
};
