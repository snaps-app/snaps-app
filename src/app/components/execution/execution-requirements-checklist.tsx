import { Check } from 'lucide-react';
import type { AgentTaskExecution, Card, WorkflowTemplate } from '@/services/types';

interface ExecutionRequirementsChecklistProps {
    execution: AgentTaskExecution;
    templates: WorkflowTemplate[];
    cards: Card[];
    // Local selection only. Persisted green state still comes from server data;
    // a selected exception is authorized explicitly when the human advances.
    manualOverrides: Record<string, boolean>;
    onRequirementToggle?: (requirementKey: string, value: boolean) => Promise<void>;
}

// Condições que têm bloco próprio abaixo, cada uma com rótulo e fonte de
// verdade específicos (status de CI, `pr_merged` no context_data, etc). O que
// NÃO estiver aqui cai no bloco genérico do fim, em vez de sumir da tela.
const CONDICOES_COM_BLOCO_PROPRIO = new Set([
    'sprint_linked', 'plan_approved', 'tactical_plans_approved', 'plan_selected',
    'bdd_scenarios_generated', 'tasks_finished', 'cards_done', 'bdd_validated',
    'ci_passed', 'pr_merged', 'peer_review_generated', 'sprint_closed',
    'sprint_branch_merged',
]);

const ROTULOS_DE_CONDICAO: Record<string, string> = {
    diff_reviewed: 'Diff Reviewed (peer review registrado)',
    tasks_created: 'Tasks Created',
    entities_created_and_linked: 'Entities Created and Linked',
    pr_opened: 'Pull Request Opened',
};

export const ExecutionRequirementsChecklist: React.FC<ExecutionRequirementsChecklistProps> = ({
    execution,
    templates,
    cards,
    manualOverrides,
    onRequirementToggle,
}) => {
    const manualRequirements = manualOverrides;
    const plans = execution.context_data?.plans || [];
    // Approval is a signed projection of a concrete content hash. A status is
    // workflow metadata and can be changed by agents, so it must never turn an
    // approval gate green on its own.
    const hasCurrentApproval = (plan: any) => Boolean(plan.approved_content_hash);
    const strategicPlans = plans.filter((plan: any) => plan.author === 'macro-planner');
    const tacticalPlans = plans.filter((plan: any) =>
        plan.author !== 'macro-planner'
        && ['selected', 'in_execution', 'executed'].includes(plan.status)
    );
    const strategicPlanApproved = (
        strategicPlans.length > 0 ? strategicPlans : plans.length === 1 ? plans : []
    ).some(hasCurrentApproval);
    const tacticalPlansApproved = tacticalPlans.length > 0 && tacticalPlans.every(hasCurrentApproval);
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
        // Selecting a condition is not itself an approval or a persisted override.
        if (onRequirementToggle) {
            try {
                await onRequirementToggle(key, newValue);
            } catch (err) {
                console.error('Failed to toggle requirement:', err);
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
                <div className="flex items-center gap-3 w-full">
                    {strategicPlanApproved || manualRequirements['plan_approved'] ? (
                        <div className="w-4 h-4 rounded-full bg-green-500/20 flex items-center justify-center border border-green-500/30 flex-shrink-0">
                            <Check className="w-2.5 h-2.5 text-green-400" />
                        </div>
                    ) : (
                        <div className="w-4 h-4 rounded-full bg-white/5 border border-white/10 flex-shrink-0" />
                    )}
                    <span className={`text-[11px] ${strategicPlanApproved || manualRequirements['plan_approved'] ? 'text-white/60' : 'text-white/30'}`}>
                        Strategic Plan Approved
                        {!strategicPlanApproved && !manualRequirements['plan_approved'] && (
                            <span className="ml-1.5 text-[9px] text-amber-300/70">(missing or stale)</span>
                        )}
                    </span>
                </div>
            )}

            {activeRules.tactical_plans_approved && (
                <div className="flex items-center gap-3 w-full">
                    {tacticalPlansApproved || manualRequirements['tactical_plans_approved'] ? (
                        <div className="w-4 h-4 rounded-full bg-green-500/20 flex items-center justify-center border border-green-500/30 flex-shrink-0">
                            <Check className="w-2.5 h-2.5 text-green-400" />
                        </div>
                    ) : (
                        <div className="w-4 h-4 rounded-full bg-white/5 border border-white/10 flex-shrink-0" />
                    )}
                    <span className={`text-[11px] ${tacticalPlansApproved || manualRequirements['tactical_plans_approved'] ? 'text-white/60' : 'text-white/30'}`}>
                        All Tactical Plans Approved
                        {!tacticalPlansApproved && !manualRequirements['tactical_plans_approved'] && (
                            <span className="ml-1.5 text-[9px] text-amber-300/70">(missing or stale)</span>
                        )}
                    </span>
                </div>
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

            {activeRules.peer_review_generated && (
                <button
                    onClick={() => toggleRequirement('peer_review_generated')}
                    className="flex items-center gap-3 hover:opacity-80 transition-opacity cursor-pointer w-full"
                >
                    {manualRequirements['peer_review_generated'] ? (
                        <div className="w-4 h-4 rounded-full bg-green-500/20 flex items-center justify-center border border-green-500/30 flex-shrink-0">
                            <Check className="w-2.5 h-2.5 text-green-400" />
                        </div>
                    ) : (
                        <div className="w-4 h-4 rounded-full bg-white/5 border border-white/10 flex-shrink-0" />
                    )}
                    <span className={`text-[11px] ${manualRequirements['peer_review_generated'] ? 'text-white/60' : 'text-white/30'}`}>
                        Peer Review Report Generated
                    </span>
                </button>
            )}

            {activeRules.sprint_closed && (
                <button
                    onClick={() => toggleRequirement('sprint_closed')}
                    className="flex items-center gap-3 hover:opacity-80 transition-opacity cursor-pointer w-full"
                >
                    {manualRequirements['sprint_closed'] ? (
                        <div className="w-4 h-4 rounded-full bg-green-500/20 flex items-center justify-center border border-green-500/30 flex-shrink-0">
                            <Check className="w-2.5 h-2.5 text-green-400" />
                        </div>
                    ) : (
                        <div className="w-4 h-4 rounded-full bg-white/5 border border-white/10 flex-shrink-0" />
                    )}
                    <span className={`text-[11px] ${manualRequirements['sprint_closed'] ? 'text-white/60' : 'text-white/30'}`}>
                        Sprint Closed (status = done)
                    </span>
                </button>
            )}

            {activeRules.sprint_branch_merged && (
                <button
                    onClick={() => toggleRequirement('sprint_branch_merged')}
                    className="flex items-center gap-3 hover:opacity-80 transition-opacity cursor-pointer w-full"
                >
                    {execution.context_data?.sprint_branch_merged || manualRequirements['sprint_branch_merged'] ? (
                        <div className="w-4 h-4 rounded-full bg-green-500/20 flex items-center justify-center border border-green-500/30 flex-shrink-0">
                            <Check className="w-2.5 h-2.5 text-green-400" />
                        </div>
                    ) : (
                        <div className="w-4 h-4 rounded-full bg-white/5 border border-white/10 flex-shrink-0" />
                    )}
                    <span className={`text-[11px] ${execution.context_data?.sprint_branch_merged || manualRequirements['sprint_branch_merged'] ? 'text-white/60' : 'text-white/30'}`}>
                        Sprint Branch Merged to Main
                    </span>
                </button>
            )}

            {/* Qualquer condição do gate SEM bloco próprio acima.

                Cada condição tinha um bloco hardcoded, e a lista derivou do
                motor: ele implementa 17 e esta tela renderizava 13. As quatro
                ausentes — diff_reviewed, tasks_created,
                entities_created_and_linked e pr_opened — ficavam INVISÍVEIS: a
                fase não avançava, o requisito que bloqueava não aparecia, e não
                dava para selecioná-lo para override. Um requisito invisível é
                pior que um reprovado, porque não há o que fazer a respeito.

                Este bloco garante que nenhuma condição nova nasça invisível.
                Ele não tenta adivinhar se foi satisfeita: quem sabe isso é o
                motor, e a recusa dele já vem escrita em
                `advance_conditions.error`. Aqui a condição aparece e pode ser
                selecionada; o estado exibido é o da seleção manual. */}
            {Object.entries(activeRules || {})
                .filter(([key, enabled]) => enabled && !CONDICOES_COM_BLOCO_PROPRIO.has(key))
                .map(([key]) => (
                    <button
                        key={key}
                        onClick={() => toggleRequirement(key)}
                        className="flex items-center gap-3 hover:opacity-80 transition-opacity cursor-pointer w-full"
                    >
                        {manualRequirements[key] ? (
                            <div className="w-4 h-4 rounded-full bg-green-500/20 flex items-center justify-center border border-green-500/30 flex-shrink-0">
                                <Check className="w-2.5 h-2.5 text-green-400" />
                            </div>
                        ) : (
                            <div className="w-4 h-4 rounded-full bg-white/5 border border-white/10 flex-shrink-0" />
                        )}
                        <span className={`text-[11px] ${manualRequirements[key] ? 'text-white/60' : 'text-white/30'}`}>
                            {ROTULOS_DE_CONDICAO[key] ?? key}
                        </span>
                    </button>
                ))}
        </div>
    );
};
