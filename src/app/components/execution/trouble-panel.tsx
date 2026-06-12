import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { AlertTriangle, Bug, ChevronDown, ChevronUp, FileText, Save } from 'lucide-react';
import { TestPlanSummary } from '@/services/types';

interface TroublePanelProps {
    troubleReport: any;
    copiedId: string | null;
    handleCopy: (id: string, text: string) => void;
    selectedTestPlanIds: string[];
    isSavingTestPlanContext: boolean;
    onSaveTestPlanContext: (ids: string[]) => Promise<void>;
}

const statusConfig: Record<string, { label: string; className: string }> = {
    passed: { label: 'Passed', className: 'bg-green-500/20 text-green-400 border-green-500/30' },
    failed: { label: 'Failed', className: 'bg-red-500/20 text-red-400 border-red-500/30' },
    draft: { label: 'Draft', className: 'bg-white/10 text-white/40 border-white/10' },
    in_progress: { label: 'In Progress', className: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
};

function StatusBadge({ status }: { status?: string }) {
    const cfg = status ? (statusConfig[status] ?? statusConfig.draft) : statusConfig.draft;
    return (
        <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border ${cfg.className}`}>
            {cfg.label}
        </span>
    );
}

function TestPlanCard({ plan, selected, onToggle }: { plan: TestPlanSummary; selected: boolean; onToggle: () => void }) {
    const [expanded, setExpanded] = useState(false);

    return (
        <div className={`rounded-2xl border overflow-hidden transition-colors ${selected ? 'bg-red-500/5 border-red-500/20' : 'bg-white/[0.03] border-white/10'}`}>
            <div className="flex items-center gap-3 px-5 py-4">
                <button
                    onClick={onToggle}
                    className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                        selected ? 'bg-red-500/30 border-red-500/50' : 'bg-white/5 border-white/20 hover:border-white/40'
                    }`}
                >
                    {selected && <div className="w-2 h-2 rounded-sm bg-red-400" />}
                </button>
                <button
                    className="flex-1 flex items-center gap-3 text-left min-w-0"
                    onClick={() => setExpanded(v => !v)}
                >
                    <FileText className="w-4 h-4 text-white/30 shrink-0" />
                    <span className="flex-1 text-sm font-semibold text-white/80 truncate">{plan.title}</span>
                    <StatusBadge status={plan.status} />
                    {expanded
                        ? <ChevronUp className="w-3.5 h-3.5 text-white/30 shrink-0 ml-1" />
                        : <ChevronDown className="w-3.5 h-3.5 text-white/30 shrink-0 ml-1" />
                    }
                </button>
            </div>
            {expanded && (
                <div className="px-5 pb-5 border-t border-white/5 pt-4">
                    {plan.content
                        ? <div className="prose prose-invert prose-sm max-w-none prose-headings:text-white/80 prose-a:text-red-400 prose-strong:text-white/90 prose-code:text-red-300 prose-pre:bg-black/40 prose-pre:border prose-pre:border-white/5 select-text cursor-text">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>{plan.content}</ReactMarkdown>
                          </div>
                        : <p className="text-xs text-white/20 italic">No content.</p>
                    }
                </div>
            )}
        </div>
    );
}

export const TroublePanel: React.FC<TroublePanelProps> = ({
    troubleReport,
    selectedTestPlanIds,
    isSavingTestPlanContext,
    onSaveTestPlanContext,
}) => {
    const testPlans: TestPlanSummary[] = troubleReport?.test_plans ?? [];
    const [localSelected, setLocalSelected] = useState<string[]>(selectedTestPlanIds);

    useEffect(() => {
        setLocalSelected(selectedTestPlanIds);
    }, [selectedTestPlanIds]);

    const toggle = (id: string) => {
        setLocalSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };

    const isDirty = JSON.stringify([...localSelected].sort()) !== JSON.stringify([...selectedTestPlanIds].sort());

    return (
        <div className="space-y-6">
            {troubleReport ? (
                <div className="p-8 rounded-3xl bg-white/[0.03] border border-white/10 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 blur-3xl -mr-16 -mt-16" />

                    <div className="flex items-start justify-between mb-8">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-red-500/20 flex items-center justify-center border border-red-500/30">
                                <AlertTriangle className="w-6 h-6 text-red-400" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-white">Trouble Report</h2>
                                <p className="text-xs text-white/40 uppercase tracking-widest font-bold mt-1">
                                    {troubleReport.sprint_name} • {troubleReport.total_cards} Cards
                                </p>
                            </div>
                        </div>

                        {testPlans.length > 0 && (
                            <div className="flex items-center gap-3">
                                <p className="text-[10px] text-white/30">
                                    {localSelected.length === 0
                                        ? 'Selecione test plans para injetar no próximo planning'
                                        : `${localSelected.length} selecionado${localSelected.length > 1 ? 's' : ''} para contexto`}
                                </p>
                                {isDirty && (
                                    <button
                                        onClick={() => onSaveTestPlanContext(localSelected)}
                                        disabled={isSavingTestPlanContext}
                                        className="flex items-center gap-1.5 text-[10px] font-bold text-red-400 hover:text-red-300 disabled:opacity-50 transition-colors uppercase tracking-widest border border-red-500/30 px-3 py-1.5 rounded-lg"
                                    >
                                        <Save className="w-3 h-3" />
                                        {isSavingTestPlanContext ? 'Salvando...' : 'Salvar Contexto'}
                                    </button>
                                )}
                            </div>
                        )}
                    </div>

                    {testPlans.length > 0 ? (
                        <div className="space-y-3">
                            <h3 className="text-[10px] font-bold text-red-400 uppercase tracking-[0.2em] px-1 mb-3">
                                Test Plans ({testPlans.length})
                            </h3>
                            {testPlans.map(plan => (
                                <TestPlanCard
                                    key={plan.id}
                                    plan={plan}
                                    selected={localSelected.includes(plan.id)}
                                    onToggle={() => toggle(plan.id)}
                                />
                            ))}
                        </div>
                    ) : (
                        <p className="text-sm text-white/20 italic">No test plans yet.</p>
                    )}

                    {troubleReport.failed_bdd_cards && troubleReport.failed_bdd_cards.length > 0 && (
                        <div className="mt-8 space-y-4">
                            <h3 className="text-[10px] font-bold text-red-400 uppercase tracking-[0.2em] px-2">Failed BDD Cards</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {troubleReport.failed_bdd_cards.map((card: any) => (
                                    <div key={card.id} className="p-4 rounded-xl bg-red-500/5 border border-red-500/10 flex items-center gap-3">
                                        <Bug className="w-4 h-4 text-red-400" />
                                        <div className="min-w-0 flex-1">
                                            <p className="text-xs font-bold text-white truncate">{card.title}</p>
                                            <p className="text-[10px] text-white/30 mt-0.5">Status: {card.status}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                <div className="py-20 text-center bg-white/[0.02] rounded-3xl border border-white/5 border-dashed">
                    <AlertTriangle className="w-10 h-10 text-white/10 mx-auto mb-4" />
                    <p className="text-white/20 italic">No trouble report generated. QA has passed successfully.</p>
                </div>
            )}
        </div>
    );
};
