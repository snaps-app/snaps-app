import { createAgentExecution } from '@/services/agentExecutions';
import { getCardExecutionPrompt } from '@/services/cards';
import { getSprintExecutionPrompt } from '@/services/sprints';
import { useState, useEffect } from 'react';
import { X, Copy, Check, Bot, Loader2, Lock, Unlock, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

type DualPrompt = { entry: string; exit?: string };

function isDualPrompt(prompt: string | DualPrompt): prompt is DualPrompt {
    return typeof prompt === 'object' && prompt !== null && 'entry' in prompt;
}

interface ExecutionWizardModalProps {
    isOpen: boolean;
    onClose: () => void;
    entityId: string;
    entityType: 'card' | 'sprint';
    entityTitle: string;
}

export function ExecutionWizardModal({
    isOpen,
    onClose,
    entityId,
    entityType,
    entityTitle,
}: ExecutionWizardModalProps) {
    const [prompt, setPrompt] = useState<string | DualPrompt>('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [copied, setCopied] = useState<'entry' | 'exit' | 'single' | false>(false);
    const [entryReviewed, setEntryReviewed] = useState(false);

    useEffect(() => {
        if (!isOpen || !entityId) return;

        setIsLoading(true);
        setError(null);
        setPrompt('');
        setEntryReviewed(false);

        const fetchPrompt = entityType === 'card'
            ? getCardExecutionPrompt(entityId)
            : getSprintExecutionPrompt(entityId);

        fetchPrompt
            .then((data) => {
                // Support both string and dual-prompt object from API
                if (typeof data === 'object' && data !== null && 'entry' in data) {
                    setPrompt(data as DualPrompt);
                } else {
                    setPrompt(data);
                }
            })
            .catch((err) => setError(err?.message || 'Failed to load execution prompt.'))
            .finally(() => setIsLoading(false));
    }, [isOpen, entityId, entityType]);

    const handleCopy = (type: 'entry' | 'exit' | 'single') => {
        let text = '';
        if (isDualPrompt(prompt)) {
            text = type === 'exit' ? (prompt.exit || '') : prompt.entry;
        } else {
            text = prompt;
        }
        navigator.clipboard.writeText(text).then(() => {
            setCopied(type);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 z-50"
                        style={{ backgroundColor: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(16px)' }}
                    />
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.92, y: 16 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.92, y: 16 }}
                            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                            className="w-full max-w-3xl pointer-events-auto flex flex-col max-h-[85vh] rounded-2xl overflow-hidden"
                            style={{
                                background: 'rgba(10,10,10,0.97)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                boxShadow: '0 24px 64px rgba(0,0,0,0.9)',
                            }}
                        >
                            {/* Header */}
                            <div className="p-5 border-b border-white/10 flex items-center justify-between shrink-0">
                                <div className="flex items-center gap-3">
                                    <div
                                        className="w-9 h-9 rounded-xl flex items-center justify-center"
                                        style={{ background: 'linear-gradient(135deg, #00D4FF 0%, #A855F7 100%)' }}
                                    >
                                        <Bot className="w-5 h-5 text-white" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-white/40 uppercase tracking-widest font-bold">
                                            AI Execution Prompt
                                        </p>
                                        <p className="text-sm font-semibold text-white/90 truncate max-w-xs">
                                            {entityTitle}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {prompt && !isDualPrompt(prompt) && (
                                        <motion.button
                                            whileTap={{ scale: 0.95 }}
                                            onClick={() => handleCopy('single')}
                                            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
                                            style={{
                                                background: copied === 'single' ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.07)',
                                                border: `1px solid ${copied === 'single' ? 'rgba(34,197,94,0.4)' : 'rgba(255,255,255,0.1)'}`,
                                                color: copied === 'single' ? '#22C55E' : 'rgba(255,255,255,0.6)',
                                            }}
                                        >
                                            {copied === 'single' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                            {copied === 'single' ? 'Copied!' : 'Copy Prompt'}
                                        </motion.button>
                                    )}
                                    <button
                                        onClick={onClose}
                                        className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                                    >
                                        <X className="w-5 h-5 text-white/50" />
                                    </button>
                                </div>
                            </div>

                            {/* Body */}
                            <div className="flex-1 overflow-y-auto p-0">
                                {isLoading && (
                                    <div className="flex flex-col items-center justify-center py-24 gap-4">
                                        <div className="relative">
                                            <div className="w-12 h-12 rounded-full border-2 border-purple-500/20 border-t-purple-500 animate-spin" />
                                            <Bot className="w-6 h-6 text-purple-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                                        </div>
                                        <p className="text-white/40 text-sm font-medium animate-pulse">Orchestrating agent context...</p>
                                    </div>
                                )}
                                
                                {error && (
                                    <div className="m-6 p-6 rounded-2xl border border-red-500/20 bg-red-500/5 flex items-start gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center shrink-0">
                                            <X className="w-5 h-5 text-red-400" />
                                        </div>
                                        <div>
                                            <p className="text-red-400 font-bold text-sm mb-1">Execution Error</p>
                                            <p className="text-red-400/60 text-xs leading-relaxed">{error}</p>
                                        </div>
                                    </div>
                                )}

                                {!isLoading && !error && prompt && (
                                    <div className="flex flex-col">
                                        {/* Dashboard Header Summary */}
                                        <div className="p-6 bg-white/[0.02] border-b border-white/5">
                                            <div className="flex flex-wrap gap-2">
                                                {isDualPrompt(prompt) ? (
                                                    <div className="px-3 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-[10px] font-bold text-cyan-400 uppercase tracking-wider">
                                                        Dual-Prompt Protocol
                                                    </div>
                                                ) : entityTitle.includes('Selected') ? (
                                                    <div className="px-3 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-[10px] font-bold text-purple-400 uppercase tracking-wider">
                                                        Multi-Sprint Batch
                                                    </div>
                                                ) : (
                                                    <div className="px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-[10px] font-bold text-blue-400 uppercase tracking-wider">
                                                        Focused Execution
                                                    </div>
                                                )}
                                                <div className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-[10px] font-bold text-white/40 uppercase tracking-wider">
                                                    Status: {isDualPrompt(prompt) ? (entryReviewed ? 'Exit Ready' : 'Entry Ready') : 'Ready'}
                                                </div>
                                            </div>
                                        </div>

                                        {isDualPrompt(prompt) ? (
                                            <div className="flex flex-col">
                                                {/* Entry Prompt Slot */}
                                                <div className="p-6 border-b border-white/5">
                                                    <div className="flex items-center justify-between mb-4">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-2.5 h-2.5 rounded-full bg-blue-400" />
                                                            <span className="text-xs font-bold text-blue-400 uppercase tracking-wider">Entry Prompt</span>
                                                            <Unlock className="w-3.5 h-3.5 text-blue-400/60" />
                                                        </div>
                                                        <motion.button
                                                            whileTap={{ scale: 0.95 }}
                                                            onClick={() => handleCopy('entry')}
                                                            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                                                            style={{
                                                                background: copied === 'entry' ? 'rgba(34,197,94,0.15)' : 'rgba(59,130,246,0.1)',
                                                                border: `1px solid ${copied === 'entry' ? 'rgba(34,197,94,0.4)' : 'rgba(59,130,246,0.3)'}`,
                                                                color: copied === 'entry' ? '#22C55E' : '#60A5FA',
                                                            }}
                                                        >
                                                            {copied === 'entry' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                                                            {copied === 'entry' ? 'Copied!' : 'Copy Entry Prompt'}
                                                        </motion.button>
                                                    </div>
                                                    <div
                                                        className="text-sm text-white/70 whitespace-pre-wrap leading-relaxed font-mono selection:bg-blue-500/30 p-4 rounded-xl"
                                                        style={{
                                                            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                                                            background: 'rgba(59,130,246,0.05)',
                                                            border: '1px solid rgba(59,130,246,0.15)',
                                                        }}
                                                    >
                                                        {prompt.entry}
                                                    </div>
                                                </div>

                                                {/* Mark as Reviewed Divider */}
                                                <div className="px-6 py-4 flex items-center justify-center border-b border-white/5">
                                                    {entryReviewed ? (
                                                        <div className="flex items-center gap-2 text-green-400">
                                                            <CheckCircle2 className="w-4 h-4" />
                                                            <span className="text-xs font-bold uppercase tracking-wider">Entry Reviewed — Exit Unlocked</span>
                                                        </div>
                                                    ) : (
                                                        <motion.button
                                                            whileTap={{ scale: 0.95 }}
                                                            whileHover={{ scale: 1.02 }}
                                                            onClick={() => setEntryReviewed(true)}
                                                            className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold transition-all"
                                                            style={{
                                                                background: 'linear-gradient(135deg, rgba(234,179,8,0.15) 0%, rgba(251,146,60,0.15) 100%)',
                                                                border: '1px solid rgba(234,179,8,0.4)',
                                                                color: '#FACC15',
                                                            }}
                                                        >
                                                            <CheckCircle2 className="w-4 h-4" />
                                                            Mark Entry as Executed
                                                        </motion.button>
                                                    )}
                                                </div>

                                                {/* Exit Prompt Slot */}
                                                {prompt.exit && (
                                                    <div className="p-6" style={{ opacity: entryReviewed ? 1 : 0.35, pointerEvents: entryReviewed ? 'auto' : 'none', transition: 'opacity 0.3s ease' }}>
                                                        <div className="flex items-center justify-between mb-4">
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-2.5 h-2.5 rounded-full" style={{ background: entryReviewed ? '#FACC15' : '#6B7280' }} />
                                                                <span className="text-xs font-bold uppercase tracking-wider" style={{ color: entryReviewed ? '#FACC15' : '#6B7280' }}>Exit Prompt</span>
                                                                {entryReviewed ? <Unlock className="w-3.5 h-3.5 text-yellow-400/60" /> : <Lock className="w-3.5 h-3.5 text-white/20" />}
                                                            </div>
                                                            <motion.button
                                                                whileTap={{ scale: 0.95 }}
                                                                onClick={() => handleCopy('exit')}
                                                                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                                                                style={{
                                                                    background: copied === 'exit' ? 'rgba(34,197,94,0.15)' : 'rgba(234,179,8,0.1)',
                                                                    border: `1px solid ${copied === 'exit' ? 'rgba(34,197,94,0.4)' : 'rgba(234,179,8,0.3)'}`,
                                                                    color: copied === 'exit' ? '#22C55E' : '#FACC15',
                                                                }}
                                                            >
                                                                {copied === 'exit' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                                                                {copied === 'exit' ? 'Copied!' : 'Copy Exit Prompt'}
                                                            </motion.button>
                                                        </div>
                                                        <div
                                                            className="text-sm text-white/70 whitespace-pre-wrap leading-relaxed font-mono selection:bg-yellow-500/30 p-4 rounded-xl"
                                                            style={{
                                                                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                                                                background: entryReviewed ? 'rgba(234,179,8,0.05)' : 'rgba(255,255,255,0.02)',
                                                                border: `1px solid ${entryReviewed ? 'rgba(234,179,8,0.15)' : 'rgba(255,255,255,0.05)'}`,
                                                            }}
                                                        >
                                                            {prompt.exit}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="p-8">
                                                <div className="prose prose-invert max-w-none">
                                                    <div
                                                        className="text-sm text-white/70 whitespace-pre-wrap leading-relaxed font-mono selection:bg-purple-500/30"
                                                        style={{
                                                            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                                                            textShadow: '0 0 20px rgba(168,85,247,0.1)'
                                                        }}
                                                    >
                                                        {prompt as string}
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>


                            {/* Footer */}
                            <div className="p-4 border-t border-white/5 flex items-center justify-between shrink-0 px-6">
                                <p className="text-[10px] text-white/30 italic">
                                    Click 'Start' to initialize a persistent multi-phase execution session.
                                </p>
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={onClose}
                                        className="px-5 py-2 rounded-xl text-white/50 hover:text-white hover:bg-white/5 transition-colors text-sm"
                                    >
                                        Close
                                    </button>
                                    {!isLoading && !error && (
                                        <button
                                            onClick={async () => {
                                                setIsLoading(true);
                                                try {
                                                    const { createAgentExecution } = await import('@/services/agentExecutions');
                                                    const { projectId } = JSON.parse(localStorage.getItem('currentProject') || '{}');
                                                    
                                                    // In a real scenario, we'd get the projectId from context or props
                                                    // Here we'll try to find it or use a fallback
                                                    const pId = projectId || window.location.pathname.split('/')[2];
                                                    
                                                    const exec = await createAgentExecution({
                                                        project_id: pId,
                                                        phase: 'macro_planning',
                                                        sprint_ids: entityType === 'sprint' ? [entityId] : [],
                                                        card_ids: entityType === 'card' ? [entityId] : []
                                                    });
                                                    
                                                    onClose();
                                                    window.location.href = `/project/${pId}/execution/${exec.id}`;
                                                } catch (err) {
                                                    setError('Failed to start execution.');
                                                } finally {
                                                    setIsLoading(false);
                                                }
                                            }}
                                            className="px-6 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-sm font-bold shadow-lg shadow-purple-900/20 transition-all flex items-center gap-2"
                                        >
                                            Start AI Execution
                                            <Bot className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </>
            )}
        </AnimatePresence>
    );
}
