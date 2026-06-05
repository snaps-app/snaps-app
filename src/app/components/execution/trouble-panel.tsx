import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { AlertTriangle, Check, Copy, Bug } from 'lucide-react';

interface TroublePanelProps {
    troubleReport: any;
    copiedId: string | null;
    handleCopy: (id: string, text: string) => void;
}

export const TroublePanel: React.FC<TroublePanelProps> = ({
    troubleReport,
    copiedId,
    handleCopy
}) => {
    return (
        <div className="space-y-6">
            {troubleReport ? (
                <div className="p-8 rounded-3xl bg-white/[0.03] border border-white/10 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 blur-3xl -mr-16 -mt-16" />

                    <div className="flex items-center justify-between mb-8">
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
                        {troubleReport.markdown_report && (
                            <button
                                onClick={() => handleCopy('troubleReport', troubleReport.markdown_report)}
                                className="flex items-center gap-2 text-[10px] font-bold text-red-400 hover:text-red-300 transition-colors uppercase tracking-widest"
                            >
                                {copiedId === 'troubleReport' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                                {copiedId === 'troubleReport' ? 'Copied!' : 'Copy Report'}
                            </button>
                        )}
                    </div>

                    <div className="prose prose-invert prose-sm max-w-none prose-headings:text-red-400/90 prose-a:text-red-400 prose-strong:text-white/90 prose-code:text-red-300 prose-pre:bg-black/40 prose-pre:border prose-pre:border-white/5 select-text cursor-text" style={{ userSelect: 'text', cursor: 'text' }}>
                        <div className="text-white/75 leading-relaxed bg-black/20 p-6 rounded-2xl border border-white/5">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {troubleReport.markdown_report || "No critical issues reported yet."}
                            </ReactMarkdown>
                        </div>
                    </div>

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
