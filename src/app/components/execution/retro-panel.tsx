import React from 'react';
import { Network } from 'lucide-react';
import type { AgentTaskExecution, Sprint } from '@/services/types';

interface RetroPanelProps {
    sprints: Sprint[];
    execution: AgentTaskExecution;
}

export const RetroPanel: React.FC<RetroPanelProps> = ({
    sprints,
    execution
}) => {
    // Find the retrospective for the linked sprint
    const linkedSprint = sprints.find(s => execution.sprint_ids && execution.sprint_ids.includes(s.id));
    const retro = linkedSprint?.retrospective;

    const sections = [
        { key: 'positives', label: 'Pontos Positivos / O que correu bem', color: 'text-emerald-400 bg-emerald-500/5 border-emerald-500/10' },
        { key: 'negatives', label: 'Pontos a Melhorar / Desafios', color: 'text-rose-400 bg-rose-500/5 border-rose-500/10' },
        { key: 'action_items', label: 'Ações de Melhoria / Plano de Ação', color: 'text-amber-400 bg-amber-500/5 border-amber-500/10' },
        { key: 'learnings', label: 'Principais Aprendizados', color: 'text-blue-400 bg-blue-500/5 border-blue-500/10' }
    ];

    return (
        <div className="space-y-6">
            {retro && Object.keys(retro).length > 0 ? (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="w-12 h-12 rounded-2xl bg-purple-500/20 flex items-center justify-center border border-purple-500/30">
                            <Network className="w-6 h-6 text-purple-400" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-white">Retrospective Log</h2>
                            <p className="text-xs text-white/40 uppercase tracking-widest font-bold mt-1">
                                {linkedSprint?.name} • Retrospective Insights
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {sections.map(section => {
                            const val = (retro as any)[section.key];
                            if (!val || (Array.isArray(val) && val.length === 0)) return null;

                            return (
                                <div key={section.key} className={`p-6 rounded-2xl border ${section.color}`}>
                                    <h3 className="text-xs font-bold uppercase tracking-wider mb-4">
                                        {section.label}
                                    </h3>
                                    {Array.isArray(val) ? (
                                        <ul className="space-y-3 list-disc pl-4 text-xs text-white/70">
                                            {val.map((item: string, idx: number) => (
                                                <li key={idx} className="leading-relaxed">{item}</li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <p className="text-xs text-white/70 leading-relaxed whitespace-pre-wrap">{val}</p>
                                    )}
                                </div>
                            );
                        })}
                        {/* Render any extra keys not in sections */}
                        {Object.entries(retro)
                            .filter(([k]) => !sections.map(s => s.key).includes(k))
                            .map(([k, v]) => (
                                <div key={k} className="p-5 rounded-2xl bg-white/5 border border-white/10">
                                    <p className="text-[10px] font-black uppercase tracking-[0.15em] mb-2 text-white/40">{k}</p>
                                    <p className="text-sm text-white/70 leading-relaxed whitespace-pre-wrap">
                                        {typeof v === 'string' ? v : JSON.stringify(v, null, 2)}
                                    </p>
                                </div>
                            ))}
                    </div>
                </div>
            ) : (
                <div className="py-20 text-center bg-white/[0.02] rounded-3xl border border-white/5 border-dashed">
                    <Network className="w-10 h-10 text-violet-500/20 mx-auto mb-4" />
                    <p className="text-white/30 font-medium mb-1">Retrospectiva ainda não registrada</p>
                    <p className="text-white/20 text-xs italic">O @antigravity-retro-analyst preencherá o campo <code className="text-violet-400/60">sprint.retrospective</code> ao finalizar a fase Retro.</p>
                </div>
            )}
        </div>
    );
};
