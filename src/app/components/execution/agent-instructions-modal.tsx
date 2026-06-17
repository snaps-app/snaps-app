import { Bot, X } from 'lucide-react';

interface AgentInstructionsModalProps {
    isOpen: boolean;
    onClose: () => void;
    agentName?: string;
    agentInstructions: string | null;
}

export const AgentInstructionsModal: React.FC<AgentInstructionsModalProps> = ({
    isOpen,
    onClose,
    agentName,
    agentInstructions
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <div
                className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                onClick={onClose}
            />
            <div className="relative w-full max-w-2xl bg-[#0d0d0f] border border-white/10 rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center border border-purple-500/30">
                            <Bot className="w-5 h-5 text-purple-400" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-white leading-tight">Agent Instructions</h2>
                            <p className="text-xs text-white/40">{agentName}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/5 rounded-xl text-white/20 hover:text-white transition-all"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <div className="p-8 max-h-[70vh] overflow-y-auto">
                    <div className="prose prose-invert max-w-none">
                        <pre className="text-sm text-white/70 whitespace-pre-wrap leading-relaxed font-sans">
                            {agentInstructions || "No specific instructions found for this agent in the database."}
                        </pre>
                    </div>
                </div>
                <div className="p-6 border-t border-white/5 bg-white/[0.01] flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-6 py-2.5 bg-white/5 hover:bg-white/10 text-white text-sm font-bold rounded-xl transition-all"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};
