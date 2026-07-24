import { getAgentExecution } from '@/services/agentExecutions';
import { createSnap, deleteSnap, getSnaps, updateSnap } from '@/services/snaps';
import type { AgentTaskExecution, Snap } from '@/services/types';
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { 
    StickyNote, 
    Plus, 
    
    Trash2, 
    Clock, 
    Loader2, 
    Check, 
    ArrowLeft,
    Bot
} from 'lucide-react';

export const ScratchView: React.FC = () => {
    const { projectId, executionId } = useParams<{ projectId: string; executionId: string }>();
    const navigate = useNavigate();
    
    const [execution, setExecution] = useState<AgentTaskExecution | null>(null);
    const [scratches, setScratches] = useState<Snap[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingScratches, setIsLoadingScratches] = useState(false);
    const [selectedScratch, setSelectedScratch] = useState<Snap | null>(null);
    const [isEditingScratch, setIsEditingScratch] = useState(false);
    const [scratchContent, setScratchContent] = useState('');
    const [scratchName, setScratchName] = useState('');
    const [isSavingScratch, setIsSavingScratch] = useState(false);

    useEffect(() => {
        const initData = async () => {
            if (!projectId || !executionId) return;
            setIsLoading(true);
            try {
                // Fetch execution context
                const execData = await getAgentExecution(executionId);
                setExecution(execData);

                // Fetch scratches
                setIsLoadingScratches(true);
                const snapsData = await getSnaps(projectId, 0, 100, undefined, executionId);
                const scratchSnaps = snapsData.filter(s => (s.snadds as any)?.type === 'scratch');
                setScratches(scratchSnaps);
                
                if (scratchSnaps.length > 0) {
                    setSelectedScratch(scratchSnaps[0]);
                    setScratchName(scratchSnaps[0].name);
                    setScratchContent(scratchSnaps[0].content || '');
                }
            } catch (err) {
                console.error('Failed to initialize Scratchpad:', err);
            } finally {
                setIsLoadingScratches(false);
                setIsLoading(false);
            }
        };

        initData();
    }, [projectId, executionId]);

    const handleCreateScratch = async () => {
        if (!projectId || !executionId) return;
        setIsSavingScratch(true);
        try {
            const newScratch = await createSnap({
                project_id: projectId,
                agent_execution_id: executionId,
                name: 'New Scratch',
                content: '',
                description: 'Scratch note',
                snadds: {
                    type: 'scratch',
                    agent_execution_id: executionId,
                    status: 'active'
                } as any
            });
            setScratches(prev => [newScratch, ...prev]);
            setSelectedScratch(newScratch);
            setScratchName(newScratch.name);
            setScratchContent(newScratch.content || '');
            setIsEditingScratch(true);
        } catch (err) {
            console.error('Failed to create scratch:', err);
        } finally {
            setIsSavingScratch(false);
        }
    };

    const handleSaveScratch = async () => {
        if (!selectedScratch) return;
        setIsSavingScratch(true);
        try {
            const updated = await updateSnap(selectedScratch.id, { 
                name: scratchName,
                content: scratchContent 
            });
            setScratches(prev => prev.map(s => s.id === updated.id ? updated : s));
            setSelectedScratch(updated);
            setIsEditingScratch(false);
        } catch (err) {
            console.error('Failed to save scratch:', err);
        } finally {
            setIsSavingScratch(false);
        }
    };

    const handleDeleteScratch = async (id: string) => {
        if (!confirm('Are you sure you want to delete this scratch?')) return;
        try {
            await deleteSnap(id);
            setScratches(prev => prev.filter(s => s.id !== id));
            if (selectedScratch?.id === id) {
                setSelectedScratch(null);
                setScratchContent('');
                setScratchName('');
            }
        } catch (err) {
            console.error('Failed to delete scratch:', err);
        }
    };

    const handleBack = () => {
        if (window.opener) {
            window.close();
        } else {
            navigate(`/project/${projectId}/execution/${executionId}`);
        }
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center h-screen bg-[#0a0a0c] gap-4">
                <div className="relative">
                    <div className="w-16 h-16 rounded-full border-2 border-orange-500/20 border-t-orange-500 animate-spin" />
                    <StickyNote className="w-8 h-8 text-orange-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                </div>
                <p className="text-white/40 text-sm font-medium animate-pulse">Loading Scratchpad...</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-screen bg-[#0a0a0c] text-white overflow-hidden">
            {/* Header */}
            <header className="px-6 py-4 border-b border-white/5 bg-[#0d0d0f] flex items-center justify-between shrink-0">
                <div className="flex items-center gap-4">
                    <button 
                        onClick={handleBack}
                        className="flex items-center gap-2 text-white/40 hover:text-white text-xs font-semibold transition-colors group px-3 py-1.5 rounded-lg hover:bg-white/5 border border-transparent hover:border-white/5"
                    >
                        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                        {window.opener ? 'Close Window' : 'Back to Cockpit'}
                    </button>
                    <div className="w-px h-5 bg-white/10" />
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-orange-500/10 flex items-center justify-center border border-orange-500/20 text-orange-400">
                            <StickyNote className="w-4 h-4" />
                        </div>
                        <div>
                            <h1 className="text-base font-extrabold tracking-tight">Scratchpad</h1>
                            {execution && (
                                <p className="text-[10px] text-white/40 font-mono">
                                    Agent: {execution.agent_name} | Phase: {execution.phase}
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                <button 
                    onClick={handleCreateScratch}
                    className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold rounded-xl transition-all shadow-lg shadow-orange-500/10"
                >
                    <Plus className="w-4 h-4" />
                    New Note
                </button>
            </header>

            {/* Workspace split */}
            <div className="flex-1 flex overflow-hidden">
                {/* List Sidebar */}
                <aside className="w-80 border-r border-white/5 flex flex-col bg-[#0d0d0f]/50">
                    <div className="p-4 bg-[#0d0d0f]/80 border-b border-white/5 flex items-center justify-between">
                        <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Notes</span>
                        <span className="px-2 py-0.5 rounded-full bg-white/5 text-[10px] text-white/40">{scratches.length}</span>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                        {isLoadingScratches ? (
                            <div className="flex flex-col items-center justify-center py-12 gap-3">
                                <Loader2 className="w-6 h-6 text-orange-500 animate-spin" />
                                <p className="text-[10px] text-white/20 font-bold uppercase tracking-widest">Loading notes...</p>
                            </div>
                        ) : scratches.length === 0 ? (
                            <div className="text-center py-12">
                                <p className="text-xs text-white/20">No scratch notes yet</p>
                            </div>
                        ) : (
                            scratches.map(scratch => (
                                <div 
                                    key={scratch.id}
                                    onClick={() => {
                                        setSelectedScratch(scratch);
                                        setScratchName(scratch.name);
                                        setScratchContent(scratch.content || '');
                                        setIsEditingScratch(false);
                                    }}
                                    className={`group p-4 rounded-2xl border transition-all cursor-pointer ${
                                        selectedScratch?.id === scratch.id 
                                            ? 'bg-orange-500/10 border-orange-500/30' 
                                            : 'bg-white/5 border-white/5 hover:border-white/10'
                                    }`}
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <h4 className={`text-sm font-bold truncate ${selectedScratch?.id === scratch.id ? 'text-orange-400' : 'text-white/60 group-hover:text-white/80'}`}>
                                            {scratch.name}
                                        </h4>
                                        <button 
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDeleteScratch(scratch.id);
                                            }}
                                            className="opacity-0 group-hover:opacity-100 p-1 text-white/20 hover:text-red-400 transition-all"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                    <p className="text-[10px] text-white/30 mt-2 line-clamp-2">
                                        {scratch.content || 'Empty note...'}
                                    </p>
                                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white/5">
                                        <Clock className="w-3 h-3 text-white/20" />
                                        <span className="text-[9px] text-white/20 font-medium">
                                            {new Date(scratch.updated_at || scratch.created_at).toLocaleDateString()}
                                        </span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </aside>

                {/* Content Area */}
                <main className="flex-1 overflow-y-auto p-8 bg-[#070709] flex flex-col">
                    {selectedScratch ? (
                        <div className="max-w-4xl w-full mx-auto space-y-6 flex-1 flex flex-col">
                            {/* Editor Header */}
                            <div className="flex items-center justify-between shrink-0">
                                <div className="flex-1 mr-4">
                                    {isEditingScratch ? (
                                        <input 
                                            type="text"
                                            value={scratchName}
                                            onChange={(e) => setScratchName(e.target.value)}
                                            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-xl font-bold text-white focus:outline-none focus:border-orange-500/50 transition-all"
                                            placeholder="Note title..."
                                        />
                                    ) : (
                                        <div>
                                            <h3 className="text-xl font-bold text-white tracking-tight">{selectedScratch.name}</h3>
                                            <p className="text-xs text-white/40 mt-1">ID: {selectedScratch.id}</p>
                                        </div>
                                    )}
                                </div>
                                <button 
                                    onClick={() => setIsEditingScratch(!isEditingScratch)}
                                    className={`px-4 py-1.5 rounded-lg border text-xs font-bold transition-all shrink-0 ${
                                        isEditingScratch 
                                            ? 'bg-white/10 border-white/20 text-white' 
                                            : 'bg-white/5 border-white/10 text-white/60 hover:text-white hover:bg-white/10'
                                    }`}
                                >
                                    {isEditingScratch ? 'Cancel' : 'Edit note'}
                                </button>
                            </div>

                            {/* Editor / Markdown Body */}
                            <div className="flex-1 flex flex-col min-h-0">
                                {isEditingScratch ? (
                                    <div className="flex-1 flex flex-col space-y-4 min-h-0">
                                        <textarea
                                            value={scratchContent}
                                            onChange={(e) => setScratchContent(e.target.value)}
                                            className="flex-1 w-full bg-black/40 border border-white/10 rounded-2xl p-6 text-sm text-white/80 font-mono focus:outline-none focus:border-orange-500/50 transition-all resize-none custom-scrollbar min-h-[400px]"
                                            placeholder="Enter your scratch note here (Markdown supported)..."
                                        />
                                        <div className="flex justify-end shrink-0">
                                            <button 
                                                onClick={handleSaveScratch}
                                                disabled={isSavingScratch}
                                                className="flex items-center gap-2 px-6 py-2.5 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-orange-500/20"
                                            >
                                                {isSavingScratch ? (
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                ) : (
                                                    <Check className="w-4 h-4" />
                                                )}
                                                Save Changes
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex-1 bg-white/[0.02] border border-white/5 rounded-2xl p-8 overflow-y-auto custom-scrollbar">
                                        <div className="prose prose-invert prose-sm max-w-none prose-headings:text-orange-400 prose-a:text-orange-400 prose-strong:text-white/90 prose-code:text-orange-300 prose-pre:bg-black/40 prose-pre:border prose-pre:border-white/5">
                                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                                {selectedScratch.content || "_This note has no content. Click 'Edit note' to add content._"}
                                            </ReactMarkdown>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center opacity-25">
                            <StickyNote className="w-16 h-16 mb-4 text-orange-400 animate-pulse" />
                            <p className="text-sm font-semibold text-center max-w-[200px]">Select a note or create a new one to start scratching</p>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
};
