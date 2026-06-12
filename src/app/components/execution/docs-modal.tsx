import { Layout, X, Loader2, FileText, Eye, Check } from 'lucide-react';
import type { GovernanceDoc, Decision } from '@/services/types';

interface DocsModalProps {
    isOpen: boolean;
    onClose: () => void;
    docsModalTab: 'governance' | 'adrs';
    setDocsModalTab: (tab: 'governance' | 'adrs') => void;
    isLoadingDocs: boolean;
    governanceDocs: GovernanceDoc[];
    selectedDocIds: string[];
    toggleDocSelection: (id: string) => void;
    setViewDoc: (doc: GovernanceDoc | null) => void;
    decisions: Decision[];
    selectedDecisionIds: string[];
    toggleDecisionSelection: (id: string) => void;
    handleRefresh: () => Promise<void>;
}

export const DocsModal: React.FC<DocsModalProps> = ({
    isOpen,
    onClose,
    docsModalTab,
    setDocsModalTab,
    isLoadingDocs,
    governanceDocs,
    selectedDocIds,
    toggleDocSelection,
    setViewDoc,
    decisions,
    selectedDecisionIds,
    toggleDecisionSelection,
    handleRefresh
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-8">
            <div className="bg-[#0a0a0c] border border-white/10 rounded-3xl w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden shadow-2xl">
                {/* Header */}
                <div className="p-6 border-b border-white/5 flex items-center justify-between shrink-0 bg-white/[0.02]">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center border border-blue-500/30">
                            <Layout className="w-5 h-5 text-blue-400" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white tracking-tight">Context Docs</h2>
                            <p className="text-[10px] text-white/40 uppercase tracking-widest mt-1">Select context for execution</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors border border-white/10"
                    >
                        <X className="w-5 h-5 text-white/60" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex items-center gap-1 px-6 pt-4 pb-0 border-b border-white/5 shrink-0">
                    <button
                        onClick={() => setDocsModalTab('governance')}
                        className={`px-4 py-2 text-xs font-bold rounded-t-lg transition-all border-b-2 -mb-px ${docsModalTab === 'governance' ? 'text-blue-400 border-blue-500 bg-blue-500/5' : 'text-white/40 border-transparent hover:text-white/70'}`}
                    >
                        Governance
                        {selectedDocIds.length > 0 && <span className="ml-2 px-1.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-[9px]">{selectedDocIds.length}</span>}
                    </button>
                    <button
                        onClick={() => setDocsModalTab('adrs')}
                        className={`px-4 py-2 text-xs font-bold rounded-t-lg transition-all border-b-2 -mb-px ${docsModalTab === 'adrs' ? 'text-violet-400 border-violet-500 bg-violet-500/5' : 'text-white/40 border-transparent hover:text-white/70'}`}
                    >
                        ADRs (Decisions)
                        {selectedDecisionIds.length > 0 && <span className="ml-2 px-1.5 py-0.5 rounded-full bg-violet-500/20 text-violet-300 text-[9px]">{selectedDecisionIds.length}</span>}
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                    {isLoadingDocs ? (
                        <div className="h-full flex items-center justify-center">
                            <Loader2 className="w-8 h-8 text-blue-500 animate-spin opacity-50" />
                        </div>
                    ) : docsModalTab === 'governance' ? (
                        governanceDocs.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-white/30">
                                <FileText className="w-12 h-12 mb-4 opacity-50" />
                                <p>No governance documents found for this project.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {governanceDocs.map(doc => {
                                    const isSelected = selectedDocIds.includes(doc.id);
                                    return (
                                        <div
                                            key={doc.id}
                                            onClick={() => toggleDocSelection(doc.id)}
                                            className={`p-4 rounded-2xl border cursor-pointer transition-all ${isSelected
                                                ? 'bg-blue-500/10 border-blue-500/50 shadow-lg shadow-blue-500/10'
                                                : 'bg-white/5 border-white/10 hover:bg-white/[0.07]'
                                                }`}
                                        >
                                            <div className="flex items-start justify-between">
                                                <div>
                                                    <h3 className={`font-bold text-sm ${isSelected ? 'text-blue-400' : 'text-white/80'}`}>{doc.name}</h3>
                                                    <p className="text-[10px] text-white/40 uppercase tracking-wider mt-1">{doc.type}</p>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setViewDoc(doc);
                                                        }}
                                                        className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-all border border-white/10"
                                                        title="View Document"
                                                    >
                                                        <Eye className="w-3.5 h-3.5" />
                                                    </button>
                                                    <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${isSelected ? 'bg-blue-500 border-blue-400' : 'border-white/20'}`}>
                                                        {isSelected && <Check className="w-3 h-3 text-white" />}
                                                    </div>
                                                </div>
                                            </div>
                                            <p className="text-xs text-white/50 mt-3 line-clamp-2 leading-relaxed">
                                                {doc.content.substring(0, 150)}...
                                            </p>
                                        </div>
                                    );
                                })}
                            </div>
                        )
                    ) : (
                        decisions.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-white/30">
                                <FileText className="w-12 h-12 mb-4 opacity-50" />
                                <p>No ADRs found for this project.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {decisions.map(dec => {
                                    const isSelected = selectedDecisionIds.includes(dec.id);
                                    return (
                                        <div
                                            key={dec.id}
                                            onClick={() => toggleDecisionSelection(dec.id)}
                                            className={`p-4 rounded-2xl border cursor-pointer transition-all ${isSelected
                                                ? 'bg-violet-500/10 border-violet-500/50 shadow-lg shadow-violet-500/10'
                                                : 'bg-white/5 border-white/10 hover:bg-white/[0.07]'
                                                }`}
                                        >
                                            <div className="flex items-start justify-between">
                                                <div>
                                                    <p className="text-[10px] font-bold text-white/30 uppercase tracking-wider mb-0.5">{dec.code}</p>
                                                    <h3 className={`font-bold text-sm ${isSelected ? 'text-violet-400' : 'text-white/80'}`}>{dec.title}</h3>
                                                    <p className="text-[10px] text-white/40 uppercase tracking-wider mt-1">{dec.status}</p>
                                                </div>
                                                <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors shrink-0 ml-2 ${isSelected ? 'bg-violet-500 border-violet-400' : 'border-white/20'}`}>
                                                    {isSelected && <Check className="w-3 h-3 text-white" />}
                                                </div>
                                            </div>
                                            {dec.context && (
                                                <p className="text-xs text-white/50 mt-3 line-clamp-2 leading-relaxed">
                                                    {dec.context.substring(0, 150)}...
                                                </p>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )
                    )}
                </div>

                <div className="p-6 border-t border-white/5 bg-white/[0.02] flex justify-between items-center">
                    <p className="text-xs text-white/40">
                        Selected docs & ADRs will be injected into the prompt when syncing or advancing.
                    </p>
                    <button
                        onClick={() => {
                            onClose();
                            handleRefresh();
                        }}
                        className="px-6 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold transition-all shadow-lg shadow-blue-900/20"
                    >
                        Done
                    </button>
                </div>
            </div>
        </div>
    );
};
