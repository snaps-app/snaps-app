import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Bot, X, Loader2, Check } from 'lucide-react';
import type { Snap } from '@/services/types';

interface WalkthroughModalProps {
    isOpen: boolean;
    onClose: () => void;
    walkthroughs: Snap[];
    isLoadingWalkthroughs: boolean;
    selectedWalkthrough: Snap | null;
    setSelectedWalkthrough: (snap: Snap | null) => void;
    isEditingWalkthrough: boolean;
    setIsEditingWalkthrough: (editing: boolean) => void;
    walkthroughContent: string;
    setWalkthroughContent: (content: string) => void;
    isSavingWalkthrough: boolean;
    handleSaveWalkthrough: () => Promise<void>;
}

export const WalkthroughModal: React.FC<WalkthroughModalProps> = ({
    isOpen,
    onClose,
    walkthroughs,
    isLoadingWalkthroughs,
    selectedWalkthrough,
    setSelectedWalkthrough,
    isEditingWalkthrough,
    setIsEditingWalkthrough,
    walkthroughContent,
    setWalkthroughContent,
    isSavingWalkthrough,
    handleSaveWalkthrough
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <div
                className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                onClick={() => {
                    onClose();
                    setSelectedWalkthrough(null);
                }}
            />
            <div className="relative w-full max-w-4xl bg-[#0d0d0f] border border-white/10 rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col h-[80vh]">
                <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center border border-purple-500/30">
                            <Bot className="w-5 h-5 text-purple-400" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-white leading-tight">Agent Walkthroughs</h2>
                            <p className="text-xs text-white/40">Contextual Memory & Decision Logs</p>
                        </div>
                    </div>
                    <button
                        onClick={() => {
                            onClose();
                            setSelectedWalkthrough(null);
                        }}
                        className="p-2 hover:bg-white/5 rounded-xl text-white/20 hover:text-white transition-all"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex-1 flex overflow-hidden">
                    {/* List of Walkthroughs */}
                    <div className="w-72 border-r border-white/5 overflow-y-auto bg-white/[0.01]">
                        {isLoadingWalkthroughs ? (
                            <div className="p-8 flex justify-center">
                                <Loader2 className="w-6 h-6 text-purple-500 animate-spin" />
                            </div>
                        ) : walkthroughs.length > 0 ? (
                            <div className="p-2 space-y-1">
                                {walkthroughs.map(w => (
                                    <button
                                        key={w.id}
                                        onClick={() => {
                                            setSelectedWalkthrough(w);
                                            setWalkthroughContent(w.content || '');
                                            setIsEditingWalkthrough(false);
                                        }}
                                        className={`w-full text-left px-4 py-3 rounded-xl transition-all border ${selectedWalkthrough?.id === w.id
                                            ? 'bg-purple-500/20 border-purple-500/30 text-purple-300'
                                            : 'hover:bg-white/5 text-white/50 hover:text-white/80 border-transparent'
                                            }`}
                                    >
                                        <p className="text-xs font-bold truncate">{w.name}</p>
                                        <p className="text-[10px] opacity-50 mt-1">{new Date(w.created_at).toLocaleDateString()} · {w.status}</p>
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <div className="p-8 text-center">
                                <p className="text-[10px] text-white/20 italic">No walkthroughs found.</p>
                            </div>
                        )}
                    </div>

                    {/* Walkthrough Content */}
                    <div className="flex-1 overflow-y-auto p-8 bg-black/20">
                        {selectedWalkthrough ? (
                            <div className="space-y-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="text-xl font-bold text-white">{selectedWalkthrough.name}</h3>
                                        <p className="text-xs text-white/40 mt-1">ID: {selectedWalkthrough.id}</p>
                                    </div>
                                    <button
                                        onClick={() => setIsEditingWalkthrough(!isEditingWalkthrough)}
                                        className={`px-4 py-1.5 rounded-lg border text-[10px] font-bold transition-all ${isEditingWalkthrough
                                            ? 'bg-white/10 border-white/20 text-white'
                                            : 'bg-white/5 border-white/10 text-white/60 hover:text-white'
                                            }`}
                                    >
                                        {isEditingWalkthrough ? 'Cancel' : 'Edit content'}
                                    </button>
                                </div>

                                {isEditingWalkthrough ? (
                                    <div className="space-y-4">
                                        <textarea
                                            value={walkthroughContent}
                                            onChange={(e) => setWalkthroughContent(e.target.value)}
                                            className="w-full h-[450px] bg-black/40 border border-white/10 rounded-2xl p-6 text-sm text-white/80 font-mono focus:outline-none focus:border-purple-500/50 transition-all resize-none"
                                            placeholder="Enter walkthrough content (Markdown supported)..."
                                        />
                                        <div className="flex justify-end">
                                            <button
                                                onClick={handleSaveWalkthrough}
                                                disabled={isSavingWalkthrough}
                                                className="flex items-center gap-2 px-6 py-2.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-purple-500/20"
                                            >
                                                {isSavingWalkthrough ? (
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                ) : (
                                                    <Check className="w-4 h-4" />
                                                )}
                                                Save Changes
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-8 overflow-y-auto max-h-[60vh] scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                                        <div className="prose prose-invert prose-sm max-w-none prose-headings:text-purple-400 prose-a:text-purple-400 prose-strong:text-white/90 prose-code:text-purple-300 prose-pre:bg-black/40 prose-pre:border prose-pre:border-white/5">
                                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                                {selectedWalkthrough.content || "_This walkthrough has no content._"}
                                            </ReactMarkdown>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center opacity-20">
                                <Bot className="w-16 h-16 mb-4" />
                                <p className="text-sm font-medium">Select a walkthrough to view its details</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
