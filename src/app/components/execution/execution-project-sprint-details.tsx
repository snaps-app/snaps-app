import { FolderGit2, Target, FileText } from 'lucide-react';
import { WorkflowFlowPreview } from '@/app/components/workflow/workflow-flow-preview';
import type { AgentTaskExecution, ProjectDetail, Sprint, WorkflowTemplate } from '@/services/types';

interface ExecutionProjectSprintDetailsProps {
    project: ProjectDetail | null;
    sprints: Sprint[];
    execution: AgentTaskExecution;
    templates: WorkflowTemplate[];
    executionTree: AgentTaskExecution[];
}

export const ExecutionProjectSprintDetails: React.FC<ExecutionProjectSprintDetailsProps> = ({
    project,
    sprints,
    execution,
    templates,
    executionTree,
}) => {
    return (
        <div className="p-6 border-b border-white/5 bg-white/[0.015]">
            <div className="flex flex-col gap-3">
                {/* Project */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20 text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.1)]">
                            <FolderGit2 className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-[10px] uppercase font-black text-white/30 tracking-[0.2em] mb-0.5">Project Scope</p>
                            <h3 className="text-sm font-extrabold text-white tracking-tight">{project ? project.name : 'Loading Project...'}</h3>
                        </div>
                    </div>
                    {project?.template && (
                        <span className="text-[10px] px-2.5 py-1 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-300 font-mono uppercase tracking-wider font-bold">
                            {project.template}
                        </span>
                    )}
                </div>

                {/* Sprints */}
                <div className="flex flex-col gap-2 pt-3 mt-1 border-t border-white/5">
                    <p className="text-[10px] uppercase font-black text-white/30 tracking-[0.2em] flex items-center gap-1.5">
                        <Target className="w-3.5 h-3.5 text-purple-400" />
                        Target Sprint{sprints.filter(s => execution.sprint_ids?.includes(s.id)).length !== 1 ? 's' : ''} ({sprints.filter(s => execution.sprint_ids?.includes(s.id)).length})
                    </p>
                    {sprints.filter(s => execution.sprint_ids?.includes(s.id)).length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                            {sprints.filter(s => execution.sprint_ids?.includes(s.id)).map(sprint => (
                                <div key={sprint.id} className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-xs text-purple-200 font-bold shadow-[0_0_15px_rgba(168,85,247,0.05)]">
                                    <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
                                    <span>{sprint.name}</span>
                                    {sprint.tag && (
                                        <span className="text-[9px] px-1.5 py-0.5 bg-purple-500/20 border border-purple-500/30 rounded-md text-purple-300 uppercase tracking-wider font-mono">{sprint.tag}</span>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-xs text-white/30 italic">No specific sprints assigned to this execution branch.</p>
                    )}
                </div>

                {/* Current Plan */}
                <div className="flex flex-col gap-2 pt-3 mt-1 border-t border-white/5">
                    <p className="text-[10px] uppercase font-black text-white/30 tracking-[0.2em] flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-blue-400" />
                        Current Plan
                    </p>
                    {execution.plan_id ? (
                        <div className="flex flex-wrap gap-2">
                            {(() => {
                                const plan = (execution.context_data?.plans || []).find((p: any) => p.id === execution.plan_id);
                                return plan ? (
                                    <div
                                        key={plan.id}
                                        className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-200 font-bold shadow-[0_0_15px_rgba(59,130,246,0.05)] hover:bg-blue-500/20 hover:border-blue-500/40 transition-colors cursor-pointer"
                                        title={`Plan ID: ${plan.id}`}
                                    >
                                        <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                                        <span>{plan.title}</span>
                                    </div>
                                ) : (
                                    <p className="text-xs text-white/30 italic">Plan not found ({execution.plan_id})</p>
                                );
                            })()}
                        </div>
                    ) : (
                        <p className="text-xs text-white/30 italic">No plan linked to this execution.</p>
                    )}
                </div>

                {/* Workflow Progress Pipeline */}
                {(() => {
                    const activeTemplate = templates.find(t => t.id === execution.workflow_template_id) || templates[0];
                    if (!activeTemplate) return null;

                    // Determine completed phases
                    const completedPhaseKeys = executionTree
                        .filter(e => ['done', 'completed'].includes(e.status))
                        .map(e => e.phase);

                    return (
                        <div className="flex flex-col gap-2 pt-3 mt-1 border-t border-white/5">
                            <p className="text-[10px] uppercase font-black text-white/30 tracking-[0.2em] flex items-center gap-1.5">
                                <Target className="w-3.5 h-3.5 text-purple-400" />
                                Workflow Progress Pipeline
                            </p>
                            <div className="h-40 w-full mt-1">
                                <WorkflowFlowPreview
                                    phases={activeTemplate.phases}
                                    activePhaseKey={execution.phase}
                                    completedPhaseKeys={completedPhaseKeys}
                                />
                            </div>
                        </div>
                    );
                })()}
            </div>
        </div>
    );
};
