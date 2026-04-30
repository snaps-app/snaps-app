import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Bot,
    ChevronRight,
    Clock,
    Zap,
    CheckCircle2,
    AlertCircle,
    History,
    Search,
    X,
    Filter,
    Calendar,
    Layout as LayoutIcon,
    Target
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import {
    getAllAgentExecutions,
    AgentTaskExecution,
    Project,
    createAgentExecution,
    getSprints,
    getProjectBoard,
    Sprint,
    Card
} from '@/services/api';
import api from '@/services/api';
import { Spinner } from './ui/spinner';

export const AIExecutions = () => {
    const navigate = useNavigate();
    const { projectId } = useParams<{ projectId?: string }>();
    const [executions, setExecutions] = useState<AgentTaskExecution[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [availableSprints, setAvailableSprints] = useState<Sprint[]>([]);
    const [availableCards, setAvailableCards] = useState<Card[]>([]);
    const [selectedSprintId, setSelectedSprintId] = useState<string | null>(null);
    const [selectedCardIds, setSelectedCardIds] = useState<string[]>([]);
    const [customContext, setCustomContext] = useState('');
    const [selectedPhase, setSelectedPhase] = useState<'macro_planning' | 'micro_planning'>('macro_planning');

    const fetchData = async () => {
        try {
            const [execsData, projsData] = await Promise.all([
                getAllAgentExecutions(),
                api.getProjects()
            ]);

            const filteredExecs = projectId
                ? execsData.filter(e => e.project_id === projectId)
                : execsData;

            setExecutions(filteredExecs);
            setProjects(projsData);

            if (projectId) {
                const [sprintsData, boardData] = await Promise.all([
                    getSprints(projectId),
                    getProjectBoard(projectId)
                ]);
                setAvailableSprints(sprintsData);

                // Flatten cards from columns
                const allCards = boardData.columns.flatMap(col =>
                    (boardData as any).cards?.filter((c: any) => c.status === col.id) || []
                );
                // If cards are not in boardData directly, they might be in each column or fetched separately
                // Standardizing: extracting from boardData if present, or using a separate list if not.
                // Assuming boardData.cards exists based on typical Snaps structure.
                setAvailableCards((boardData as any).cards || []);
            }
        } catch (err: any) {
            console.error('Failed to fetch AI executions:', err);
            setError(err?.message || 'Failed to load executions');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [projectId]);

    const handleConfirmExecution = async () => {
        if (!projectId) return;
        setIsCreating(true);
        try {
            const execution = await createAgentExecution({
                project_id: projectId,
                phase: selectedPhase,
                sprint_ids: selectedSprintId ? [selectedSprintId] : [],
                card_ids: selectedCardIds,
                context_data: {
                    user_instruction: customContext,
                    strategy_focus: selectedPhase === 'macro_planning' ? 'strategic' : 'technical'
                }
            });
            navigate(`/project/${projectId}/execution/${execution.id}`);
        } catch (err: any) {
            console.error('Failed to start execution:', err);
            setError('Failed to start agent session');
        } finally {
            setIsCreating(false);
            setIsModalOpen(false);
        }
    };

    const toggleCard = (cardId: string) => {
        setSelectedCardIds(prev =>
            prev.includes(cardId)
                ? prev.filter(id => id !== cardId)
                : [...prev, cardId]
        );
    };

    const getProjectName = (projectId: string) =>
        projects.find(p => p.id === projectId)?.name || 'Unknown Project';

    const statusConfig: Record<string, { icon: React.ReactNode; color: string; bg: string }> = {
        pending: { icon: <Clock className="w-5 h-5" />, color: 'text-white/40', bg: 'bg-white/5 border-white/10' },
        in_progress: { icon: <Zap className="w-5 h-5" />, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
        awaiting_advance: { icon: <Zap className="w-5 h-5" />, color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/20' },
        done: { icon: <CheckCircle2 className="w-5 h-5" />, color: 'text-green-400', bg: 'bg-green-500/10 border-green-500/20' },
        failed: { icon: <AlertCircle className="w-5 h-5" />, color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20' },
    };

    const phaseLabels: Record<string, string> = {
        macro_planning: 'Macro-Planning',
        micro_planning: 'Micro-Planning',
        execution: 'Implementation',
        assurance: 'QA & Testing',
        retro: 'Retrospective',
    };

    const phaseColors: Record<string, string> = {
        macro_planning: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
        micro_planning: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
        execution: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
        assurance: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
        retro: 'text-green-400 bg-green-500/10 border-green-500/20',
    };

    const filtered = executions.filter(exec =>
        getProjectName(exec.project_id).toLowerCase().includes(searchTerm.toLowerCase()) ||
        (exec.agent_name || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="min-h-screen" style={{ backgroundColor: 'var(--snaps-bg)' }}>
            <AnimatePresence>
                {(isLoading || isCreating) && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-md"
                    >
                        <Spinner size="lg" label={isCreating ? "Initializing session..." : "Loading sessions..."} color="purple" />
                    </motion.div>
                )}
            </AnimatePresence>
            <div className="max-w-5xl mx-auto px-6 py-12">

                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
                    <div>
                        <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em] mb-2">Orchestration</p>
                        <h1 className="text-3xl font-black text-white flex items-center gap-3 tracking-tight">
                            <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center">
                                <Bot className="w-5 h-5 text-purple-400" />
                            </div>
                            {projectId ? 'Project AI Executions' : 'Global AI Execution History'}
                        </h1>
                        <p className="text-white/30 text-sm mt-2">
                            {projectId
                                ? `Agentic orchestration sessions for ${projects.find(p => p.id === projectId)?.name || 'this project'}.`
                                : 'All agentic orchestration sessions across your projects.'
                            }
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        {projectId && (
                            <button
                                onClick={() => setIsModalOpen(true)}
                                disabled={isCreating}
                                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold text-sm hover:from-purple-500 hover:to-indigo-500 transition-all shadow-lg shadow-purple-500/20 disabled:opacity-50"
                            >
                                <Zap className={`w-4 h-4 ${isCreating ? 'animate-pulse' : ''}`} />
                                {isCreating ? 'Initializing...' : 'New Execution'}
                            </button>
                        )}
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                            <input
                                type="text"
                                placeholder="Search sessions..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-11 pr-5 py-2.5 rounded-xl bg-white/[0.03] border border-white/10 text-white text-sm focus:outline-none focus:border-purple-500/50 w-64 transition-all"
                            />
                        </div>
                    </div>
                </div>

                {/* Modal: Strategy Configurator */}
                <AnimatePresence>
                    {isModalOpen && (
                        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm">
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                                className="w-full max-w-2xl bg-[#0D0D0D] border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]"
                            >
                                {/* Modal Header */}
                                <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center">
                                            <Target className="w-5 h-5 text-purple-400" />
                                        </div>
                                        <div>
                                            <h2 className="text-xl font-black text-white tracking-tight">Strategy Configurator</h2>
                                            <p className="text-[10px] text-white/30 uppercase tracking-[0.2em]">Agentic Scoping & Context</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setIsModalOpen(false)}
                                        className="w-10 h-10 rounded-xl hover:bg-white/5 flex items-center justify-center transition-colors text-white/40 hover:text-white"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>

                                <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">

                                    {/* Phase Toggle */}
                                    <div className="space-y-4">
                                        <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] flex items-center gap-2">
                                            <Zap className="w-3 h-3" /> Execution Phase
                                        </label>
                                        <div className="grid grid-cols-2 gap-3">
                                            <button
                                                onClick={() => setSelectedPhase('macro_planning')}
                                                className={`p-4 rounded-2xl border transition-all text-left group ${selectedPhase === 'macro_planning' ? 'bg-purple-500/10 border-purple-500/40' : 'bg-white/[0.02] border-white/5 hover:border-white/10'}`}
                                            >
                                                <h4 className={`font-bold text-sm mb-1 ${selectedPhase === 'macro_planning' ? 'text-purple-400' : 'text-white/60'}`}>Macro-Planning</h4>
                                                <p className="text-[10px] text-white/30 leading-relaxed">Strategic audit, goal definition and roadmap generation.</p>
                                            </button>
                                            <button
                                                onClick={() => setSelectedPhase('micro_planning')}
                                                className={`p-4 rounded-2xl border transition-all text-left group ${selectedPhase === 'micro_planning' ? 'bg-cyan-500/10 border-cyan-500/40' : 'bg-white/[0.02] border-white/5 hover:border-white/10'}`}
                                            >
                                                <h4 className={`font-bold text-sm mb-1 ${selectedPhase === 'micro_planning' ? 'text-cyan-400' : 'text-white/60'}`}>Micro-Planning</h4>
                                                <p className="text-[10px] text-white/30 leading-relaxed">BDD generation, technical tasking and implementation specs.</p>
                                            </button>
                                        </div>
                                    </div>

                                    {/* Mission Context */}
                                    <div className="space-y-4">
                                        <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] flex items-center gap-2">
                                            <Target className="w-3 h-3" /> Mission Context (Optional)
                                        </label>
                                        <textarea
                                            value={customContext}
                                            onChange={(e) => setCustomContext(e.target.value)}
                                            placeholder="Ex: Focus on the technical debt of the sidebar, or prioritize the GitHub sync logic..."
                                            className="w-full h-24 p-4 rounded-2xl bg-white/[0.03] border border-white/10 text-white text-sm focus:outline-none focus:border-purple-500/50 resize-none placeholder:text-white/10 transition-all"
                                        />
                                    </div>

                                    {/* Sprint Picker */}
                                    <div className="space-y-4">
                                        <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] flex items-center gap-2">
                                            <Calendar className="w-3 h-3" /> Link to Sprint
                                        </label>
                                        <select
                                            value={selectedSprintId || ''}
                                            onChange={(e) => setSelectedSprintId(e.target.value || null)}
                                            className="w-full p-4 rounded-2xl bg-white/[0.03] border border-white/10 text-white text-sm focus:outline-none focus:border-purple-500/50 transition-all appearance-none cursor-pointer"
                                        >
                                            <option value="" className="bg-[#0D0D0D]">Global Context (No Sprint)</option>
                                            {availableSprints.map(s => (
                                                <option key={s.id} value={s.id} className="bg-[#0D0D0D]">{s.tag} - {s.name}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Card Picker */}
                                    <div className="space-y-4">
                                        <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] flex items-center gap-2">
                                            <LayoutIcon className="w-3 h-3" /> Priority Cards ({selectedCardIds.length})
                                        </label>
                                        <div className="max-h-48 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                                            {availableCards.length > 0 ? availableCards.map(card => (
                                                <div
                                                    key={card.id}
                                                    onClick={() => toggleCard(card.id)}
                                                    className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between group ${selectedCardIds.includes(card.id) ? 'bg-white/10 border-white/20' : 'bg-white/[0.02] border-white/5 hover:border-white/10'}`}
                                                >
                                                    <span className={`text-xs font-medium ${selectedCardIds.includes(card.id) ? 'text-white' : 'text-white/40'}`}>
                                                        {card.title}
                                                    </span>
                                                    {selectedCardIds.includes(card.id) && (
                                                        <CheckCircle2 className="w-4 h-4 text-purple-400" />
                                                    )}
                                                </div>
                                            )) : (
                                                <p className="text-[10px] text-white/20 italic p-4 text-center">No cards available for selection.</p>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Modal Footer */}
                                <div className="p-6 border-t border-white/5 bg-white/[0.02] flex items-center justify-end gap-3">
                                    <button
                                        onClick={() => setIsModalOpen(false)}
                                        className="px-6 py-2.5 rounded-xl text-white/60 text-sm font-bold hover:bg-white/5 transition-all"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleConfirmExecution}
                                        disabled={isCreating}
                                        className="flex items-center gap-2 px-8 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold text-sm hover:from-purple-500 hover:to-indigo-500 transition-all shadow-lg shadow-purple-500/20 disabled:opacity-50"
                                    >
                                        {isCreating ? 'Initializing...' : 'Launch Agent Session'}
                                        <ChevronRight className="w-4 h-4" />
                                    </button>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>

                {/* Stats */}
                {!isLoading && executions.length > 0 && (
                    <div className="flex items-center gap-6 mb-8 p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                        {[
                            { label: 'Total', value: executions.length, color: 'text-white' },
                            { label: 'Done', value: executions.filter(e => e.status === 'done').length, color: 'text-green-400' },
                            { label: 'Active', value: executions.filter(e => e.status !== 'done' && e.status !== 'failed').length, color: 'text-purple-400' },
                            { label: 'Failed', value: executions.filter(e => e.status === 'failed').length, color: 'text-red-400' },
                        ].map((stat, i) => (
                            <React.Fragment key={stat.label}>
                                {i > 0 && <div className="w-px h-8 bg-white/10" />}
                                <div className="text-center">
                                    <p className={`text-2xl font-black ${stat.color}`}>{stat.value}</p>
                                    <p className="text-[10px] text-white/30 uppercase tracking-widest">{stat.label}</p>
                                </div>
                            </React.Fragment>
                        ))}
                    </div>
                )}

                {/* Error state */}
                {error && (
                    <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                        {error}
                    </div>
                )}

                {/* List */}
                {filtered.length > 0 ? (
                    <div className="space-y-3">
                        {filtered.map((exec) => {
                            const sc = statusConfig[exec.status] || statusConfig['pending'];
                            return (
                                <div
                                    key={exec.id}
                                    onClick={() => navigate(`/project/${exec.project_id}/execution/${exec.id}`)}
                                    className="group p-5 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-purple-500/20 hover:bg-white/[0.04] transition-all cursor-pointer flex items-center justify-between gap-4"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={`w-11 h-11 rounded-xl flex items-center justify-center border shrink-0 ${sc.bg} ${sc.color}`}>
                                            {sc.icon}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <h3 className="font-bold text-white group-hover:text-purple-300 transition-colors">
                                                    {getProjectName(exec.project_id)}
                                                </h3>
                                                <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-lg border ${phaseColors[exec.phase] || 'text-white/30 bg-white/5 border-white/10'}`}>
                                                    {phaseLabels[exec.phase] || exec.phase}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-4 text-xs text-white/25">
                                                <span className="flex items-center gap-1.5 font-mono">
                                                    <Bot className="w-3 h-3" />
                                                    {exec.agent_name || 'Unknown agent'}
                                                </span>
                                                <span className="flex items-center gap-1.5">
                                                    <History className="w-3 h-3" />
                                                    {new Date(exec.created_at).toLocaleString()}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-6 shrink-0">
                                        <span className={`text-xs font-bold uppercase tracking-wider ${sc.color}`}>
                                            {exec.status.replace(/_/g, ' ')}
                                        </span>
                                        <ChevronRight className="w-4 h-4 text-white/10 group-hover:text-purple-400 group-hover:translate-x-0.5 transition-all" />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="py-32 text-center rounded-3xl border border-dashed border-white/10">
                        <Bot className="w-14 h-14 text-white/5 mx-auto mb-5" />
                        <h3 className="text-lg font-bold text-white/20 mb-2">No executions yet</h3>
                        <p className="text-white/10 text-sm">Select Sprints on the Board and click Execute to start.</p>
                    </div>
                )}

            </div>
        </div>
    );
};
