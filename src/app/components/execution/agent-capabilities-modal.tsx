import { Wrench, Cpu, X } from 'lucide-react';
import type { AgentTaskExecution, WorkflowTemplate } from '@/services/types';

interface AgentCapabilitiesModalProps {
    isOpen: boolean;
    onClose: () => void;
    execution: AgentTaskExecution;
    templates: WorkflowTemplate[];
}

export const AgentCapabilitiesModal: React.FC<AgentCapabilitiesModalProps> = ({
    isOpen,
    onClose,
    execution,
    templates
}) => {
    if (!isOpen) return null;

    const activeTemplate = templates.find(t => t.id === execution.workflow_template_id);
    const activePhase = activeTemplate?.phases.find(p => p.key === execution.phase);

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-8">
            <div className="bg-[#0a0a0c] border border-white/10 rounded-3xl w-full max-w-2xl h-[70vh] flex flex-col overflow-hidden shadow-2xl">
                <div className="p-6 border-b border-white/5 flex items-center justify-between shrink-0 bg-white/[0.02]">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center border border-blue-500/30">
                            <Wrench className="w-5 h-5 text-blue-400" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white tracking-tight">Agent Capabilities</h2>
                            <p className="text-xs text-white/40 mt-1">Tools and Skills available for this execution phase</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-white/40 hover:text-white hover:bg-white/10 transition-all"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent space-y-8">
                    <div>
                        <div className="flex items-center gap-2 mb-4">
                            <Wrench className="w-4 h-4 text-blue-400" />
                            <h3 className="text-sm font-bold text-white">Tools ({activePhase?.tools?.length || 0})</h3>
                        </div>
                        <div className="grid gap-2">
                            {activePhase?.tools && activePhase.tools.length > 0 ? activePhase.tools.map(tool => (
                                <div key={tool} className="p-3 rounded-xl bg-white/5 border border-white/5 flex items-center gap-3">
                                    <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                                    <span className="text-xs text-white/80 font-mono">{tool}</span>
                                </div>
                            )) : (
                                <p className="text-xs text-white/40 italic">No tools configured for this phase.</p>
                            )}
                        </div>
                    </div>

                    <div>
                        <div className="flex items-center gap-2 mb-4">
                            <Cpu className="w-4 h-4 text-green-400" />
                            <h3 className="text-sm font-bold text-white">Skills ({activePhase?.skills?.length || 0})</h3>
                        </div>
                        <div className="grid gap-2">
                            {activePhase?.skills && activePhase.skills.length > 0 ? activePhase.skills.map(skill => (
                                <div key={skill} className="p-3 rounded-xl bg-white/5 border border-white/5 flex items-center gap-3">
                                    <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
                                    <span className="text-xs text-white/80 font-mono">{skill}</span>
                                </div>
                            )) : (
                                <p className="text-xs text-white/40 italic">No skills configured for this phase.</p>
                            )}
                        </div>
                    </div>
                </div>
                <div className="p-6 border-t border-white/5 bg-white/[0.02] flex justify-end shrink-0">
                    <button
                        onClick={onClose}
                        className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-blue-900/20"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};
