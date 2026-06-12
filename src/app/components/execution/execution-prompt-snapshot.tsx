import { useState } from 'react';
import { Bot, Check, Copy, Loader2 } from 'lucide-react';
import type { AgentTaskExecution } from '@/services/types';

interface ExecutionPromptSnapshotProps {
    execution: AgentTaskExecution;
    entryReviewed: boolean;
    setEntryReviewed: React.Dispatch<React.SetStateAction<boolean>>;
    handleRefresh: () => Promise<void>;
    isRefreshing: boolean;
}

export const ExecutionPromptSnapshot: React.FC<ExecutionPromptSnapshotProps> = ({
    execution,
    entryReviewed,
    setEntryReviewed,
    handleRefresh,
    isRefreshing,
}) => {
    const [copied, setCopied] = useState(false);
    const [copiedId, setCopiedId] = useState<string | null>(null);

    const handleCopyPrompt = () => {
        if (!execution?.prompt_snapshot) return;
        const promptToCopy = typeof execution.prompt_snapshot === 'object' && execution.prompt_snapshot !== null
            ? `${(execution.prompt_snapshot as any).entry}\n\n---\n\n${(execution.prompt_snapshot as any).exit || ''}`
            : execution.prompt_snapshot as string;
        navigator.clipboard.writeText(promptToCopy);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    if (!execution.prompt_snapshot) {
        return (
            <div className="p-6 rounded-2xl border border-dashed border-white/10 bg-white/[0.01] flex flex-col items-center justify-center text-center gap-3">
                <Bot className="w-10 h-10 text-white/20 mb-2" />
                <div>
                    <p className="text-sm font-bold text-white/70">No Prompt Generated Yet</p>
                    <p className="text-xs text-white/40 mt-1 max-w-xs leading-relaxed">Review the selected cards on the right, provide your mission inputs below, and generate the prompt.</p>
                </div>
                <button
                    onClick={handleRefresh}
                    disabled={isRefreshing}
                    className="mt-4 px-6 py-2.5 rounded-xl bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 font-bold text-xs uppercase tracking-widest transition-all flex items-center gap-2"
                >
                    {isRefreshing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bot className="w-4 h-4" />}
                    Generate Prompt
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {typeof execution.prompt_snapshot === 'object' && execution.prompt_snapshot !== null ? (
                <>
                    <div className="flex items-center justify-between">
                        <p className="text-xs font-bold text-blue-400/80 uppercase tracking-widest">Entry Prompt</p>
                        <button
                            onClick={() => {
                                navigator.clipboard.writeText((execution.prompt_snapshot as any).entry);
                                setCopiedId('entry');
                                setTimeout(() => setCopiedId(null), 2000);
                            }}
                            className="flex items-center gap-2 text-[10px] font-bold text-blue-400 hover:text-blue-300 transition-colors uppercase tracking-widest"
                        >
                            {copiedId === 'entry' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                            {copiedId === 'entry' ? 'Copied!' : 'Copy Entry'}
                        </button>
                    </div>
                    <div className="relative group">
                        <div className="absolute inset-0 bg-blue-500/5 blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className="relative p-5 rounded-2xl bg-[#050505] border border-blue-500/20 overflow-hidden">
                            <pre className="text-xs text-white/70 whitespace-pre-wrap leading-relaxed font-mono max-h-[300px] overflow-y-auto custom-scrollbar">
                                {(execution.prompt_snapshot as any).entry}
                            </pre>
                        </div>
                    </div>

                    {/* Mark as Reviewed Divider */}
                    <div className="px-6 py-4 flex items-center justify-center border-b border-white/5">
                        {entryReviewed ? (
                            <div className="flex items-center gap-2 text-green-400">
                                <Check className="w-4 h-4" />
                                <span className="text-xs font-bold uppercase tracking-wider">Entry Reviewed — Exit Unlocked</span>
                            </div>
                        ) : (
                            <button
                                onClick={() => setEntryReviewed(true)}
                                className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold transition-all hover:scale-[1.02] active:scale-[0.98]"
                                style={{
                                    background: 'linear-gradient(135deg, rgba(234,179,8,0.15) 0%, rgba(251,146,60,0.15) 100%)',
                                    border: '1px solid rgba(234,179,8,0.4)',
                                    color: '#FACC15',
                                }}
                            >
                                <Check className="w-4 h-4" />
                                Mark Entry as Executed
                            </button>
                        )}
                    </div>

                    {(execution.prompt_snapshot as any).exit && (
                        <div style={{ opacity: entryReviewed ? 1 : 0.35, pointerEvents: entryReviewed ? 'auto' : 'none', transition: 'opacity 0.3s ease' }}>
                            <div className="flex items-center justify-between pt-4">
                                <p className="text-xs font-bold text-amber-400/80 uppercase tracking-widest">Exit Prompt</p>
                                <button
                                    onClick={() => {
                                        navigator.clipboard.writeText((execution.prompt_snapshot as any).exit);
                                        setCopiedId('exit');
                                        setTimeout(() => setCopiedId(null), 2000);
                                    }}
                                    className="flex items-center gap-2 text-[10px] font-bold text-amber-400 hover:text-amber-300 transition-colors uppercase tracking-widest"
                                >
                                    {copiedId === 'exit' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                                    {copiedId === 'exit' ? 'Copied!' : 'Copy Exit'}
                                </button>
                            </div>
                            <div className="relative group mt-4">
                                <div className="absolute inset-0 bg-amber-500/5 blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                                <div className="relative p-5 rounded-2xl bg-[#050505] border border-amber-500/20 overflow-hidden">
                                    <pre className="text-xs text-white/70 whitespace-pre-wrap leading-relaxed font-mono max-h-[300px] overflow-y-auto custom-scrollbar">
                                        {(execution.prompt_snapshot as any).exit}
                                    </pre>
                                </div>
                            </div>
                        </div>
                    )}
                </>
            ) : (
                <>
                    <div className="flex items-center justify-between">
                        <p className="text-xs font-bold text-white/60 uppercase tracking-widest">Next Prompt</p>
                        <button
                            onClick={handleCopyPrompt}
                            className="flex items-center gap-2 text-[10px] font-bold text-purple-400 hover:text-purple-300 transition-colors uppercase tracking-widest"
                        >
                            {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                            {copied ? 'Copied!' : 'Copy Prompt'}
                        </button>
                    </div>

                    <div className="relative group">
                        <div className="absolute inset-0 bg-purple-500/5 blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className="relative p-5 rounded-2xl bg-[#050505] border border-white/10 overflow-hidden">
                            <pre className="text-xs text-white/70 whitespace-pre-wrap leading-relaxed font-mono max-h-[450px] overflow-y-auto custom-scrollbar">
                                {execution.prompt_snapshot as string}
                            </pre>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};
