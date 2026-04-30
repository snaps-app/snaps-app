import { useState, useEffect } from 'react';
import { X, Copy, Check, Bot, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getCardExecutionPrompt, getSprintExecutionPrompt } from '@/services/api';

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
    const [prompt, setPrompt] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (!isOpen || !entityId) return;

        setIsLoading(true);
        setError(null);
        setPrompt('');

        const fetch = entityType === 'card'
            ? getCardExecutionPrompt(entityId)
            : getSprintExecutionPrompt(entityId);

        fetch
            .then(setPrompt)
            .catch((err) => setError(err?.message || 'Failed to load execution prompt.'))
            .finally(() => setIsLoading(false));
    }, [isOpen, entityId, entityType]);

    const handleCopy = () => {
        navigator.clipboard.writeText(prompt).then(() => {
            setCopied(true);
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
                                    {prompt && (
                                        <motion.button
                                            whileTap={{ scale: 0.95 }}
                                            onClick={handleCopy}
                                            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
                                            style={{
                                                background: copied ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.07)',
                                                border: `1px solid ${copied ? 'rgba(34,197,94,0.4)' : 'rgba(255,255,255,0.1)'}`,
                                                color: copied ? '#22C55E' : 'rgba(255,255,255,0.6)',
                                            }}
                                        >
                                            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                            {copied ? 'Copied!' : 'Copy Prompt'}
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
                                                {entityTitle.includes('Selected') ? (
                                                    <div className="px-3 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-[10px] font-bold text-purple-400 uppercase tracking-wider">
                                                        Multi-Sprint Batch
                                                    </div>
                                                ) : (
                                                    <div className="px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-[10px] font-bold text-blue-400 uppercase tracking-wider">
                                                        Focused Execution
                                                    </div>
                                                )}
                                                <div className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-[10px] font-bold text-white/40 uppercase tracking-wider">
                                                    Status: Ready
                                                </div>
                                            </div>
                                        </div>

                                        <div className="p-8">
                                            <div className="prose prose-invert max-w-none">
                                                <div 
                                                    className="text-sm text-white/70 whitespace-pre-wrap leading-relaxed font-mono selection:bg-purple-500/30"
                                                    style={{ 
                                                        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                                                        textShadow: '0 0 20px rgba(168,85,247,0.1)'
                                                    }}
                                                >
                                                    {prompt}
                                                </div>
                                            </div>
                                        </div>
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
                                                    const { createAgentExecution } = await import('@/services/api');
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
