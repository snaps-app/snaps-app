import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { FileText, X, Loader2 } from 'lucide-react';
import type { Snap } from '@/services/types';

interface PeerReviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    isLoadingPeerReview: boolean;
    peerReviewSnap: Snap | null;
}

export const PeerReviewModal: React.FC<PeerReviewModalProps> = ({
    isOpen,
    onClose,
    isLoadingPeerReview,
    peerReviewSnap
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <div
                className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                onClick={onClose}
            />
            <div className="relative w-full max-w-3xl bg-[#0d0d0f] border border-violet-500/20 rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col h-[80vh]">
                <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/[0.02] shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-violet-500/20 flex items-center justify-center border border-violet-500/30">
                            <FileText className="w-5 h-5 text-violet-400" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-white leading-tight">Peer Review Report</h2>
                            <p className="text-xs text-white/40">Plan Review Audit</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/5 rounded-xl text-white/20 hover:text-white transition-all"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto p-8 bg-black/20">
                    {isLoadingPeerReview ? (
                        <div className="h-full flex items-center justify-center">
                            <Loader2 className="w-8 h-8 text-violet-500 animate-spin opacity-50" />
                        </div>
                    ) : peerReviewSnap ? (
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 mb-2">
                                <h3 className="text-lg font-bold text-white">{peerReviewSnap.name}</h3>
                                <span className="text-[10px] text-white/30 font-mono">ID: {peerReviewSnap.id}</span>
                            </div>
                            <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-8 overflow-y-auto max-h-[55vh]">
                                <div className="prose prose-invert prose-sm max-w-none prose-headings:text-violet-400 prose-a:text-violet-400 prose-strong:text-white/90 prose-code:text-violet-300 prose-pre:bg-black/40 prose-pre:border prose-pre:border-white/5">
                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                        {peerReviewSnap.content || '_No content available._'}
                                    </ReactMarkdown>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center opacity-30">
                            <FileText className="w-16 h-16 mb-4" />
                            <p className="text-sm font-medium">No Peer Review Report found</p>
                            <p className="text-xs mt-1 text-white/50">The agent will create a "Peer Review Report" artifact during plan review.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
