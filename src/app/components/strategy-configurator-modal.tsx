import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Target, X, Zap, ChevronDown, Layout as LayoutIcon, Calendar, CheckCircle2, ChevronRight, Bot } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { WorkflowFlowPreview } from './workflow-flow-preview';
import { WorkflowTemplate, Sprint, Card, Board, createAgentExecution } from '@/services/api';
import api from '@/services/api';

interface StrategyConfiguratorModalProps {
    isOpen: boolean;
    onClose: () => void;
    projectId: string;
    initialSprintId?: string | null;
    initialCardIds?: string[];
    /** Pre-loaded cards from the current board context. Avoids redundant fetching. */
    cards?: Card[];
}

const DEFAULT_CARDS: Card[] = [];
const DEFAULT_CARD_IDS: string[] = [];

export function StrategyConfiguratorModal({
    isOpen,
    onClose,
    projectId,
    initialSprintId = null,
    initialCardIds = DEFAULT_CARD_IDS,
    cards = DEFAULT_CARDS
}: StrategyConfiguratorModalProps) {
    const navigate = useNavigate();

    const [isCreating, setIsCreating] = useState(false);
    const [templates, setTemplates] = useState<WorkflowTemplate[]>([]);
    const [availableSprints, setAvailableSprints] = useState<Sprint[]>([]);
    
    const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
    const [selectedSprintId, setSelectedSprintId] = useState<string | null>(initialSprintId);
    const [selectedCardIds, setSelectedCardIds] = useState<string[]>(initialCardIds);
    const [customContext, setCustomContext] = useState('');

    useEffect(() => {
        if (!isOpen) return;

        // Reset state from props when opened
        setSelectedSprintId(initialSprintId);
        setSelectedCardIds(initialCardIds);
        setCustomContext('');

        const fetchData = async () => {
            try {
                const [templatesData, sprintsData] = await Promise.all([
                    api.getWorkflowTemplates(),
                    api.getSprints(projectId),
                ]);

                setTemplates(templatesData);
                if (templatesData.length > 0) {
                    setSelectedTemplateId(templatesData[0].id);
                }
                setAvailableSprints(sprintsData);
            } catch (err) {
                console.error('Failed to load Strategy Configurator data:', err);
            }
        };

        fetchData();
        // Disabling eslint rule to avoid infinite loops from arrays being recreated
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, projectId]);

    const handleConfirmExecution = async () => {
        if (!projectId) return;
        const selectedTemplate = templates.find(t => t.id === selectedTemplateId);
        const firstPhaseKey = selectedTemplate?.phases?.[0]?.key || 'macro_planning';

        setIsCreating(true);
        try {
            const execution = await createAgentExecution({
                project_id: projectId,
                phase: firstPhaseKey,
                workflow_template_id: selectedTemplateId || undefined,
                sprint_ids: selectedSprintId ? [selectedSprintId] : [],
                card_ids: selectedCardIds,
                context_data: {
                    user_instruction: customContext,
                    strategy_focus: firstPhaseKey === 'macro_planning' ? 'strategic' : 'technical'
                }
            });
            onClose();
            navigate(`/project/${projectId}/execution/${execution.id}`);
        } catch (err: any) {
            console.error('Failed to start execution:', err);
            alert('Failed to start agent session');
        } finally {
            setIsCreating(false);
        }
    };

    const toggleCard = (cardId: string) => {
        setSelectedCardIds(prev =>
            prev.includes(cardId)
                ? prev.filter(id => id !== cardId)
                : [...prev, cardId]
        );
    };

    return (
        <AnimatePresence>
            {isOpen && (
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
                                onClick={onClose}
                                className="w-10 h-10 rounded-xl hover:bg-white/5 flex items-center justify-center transition-colors text-white/40 hover:text-white"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
                            {/* Workflow Template Dropdown Selector */}
                            <div className="space-y-4">
                                <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] flex items-center gap-2">
                                    <Zap className="w-3 h-3" /> Execution Workflow Template
                                </label>
                                <div className="relative">
                                    <select
                                        value={selectedTemplateId || ''}
                                        onChange={(e) => setSelectedTemplateId(e.target.value || null)}
                                        className="w-full p-4 rounded-2xl bg-white/[0.03] border border-white/10 text-white text-sm focus:outline-none focus:border-purple-500/50 transition-all appearance-none cursor-pointer"
                                    >
                                        {templates.map(t => (
                                            <option key={t.id} value={t.id} className="bg-[#0D0D0D] text-white">
                                                {t.name}
                                            </option>
                                        ))}
                                    </select>
                                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-white/40">
                                        <ChevronDown className="w-4 h-4" />
                                    </div>
                                </div>
                            </div>

                            {/* Workflow Visual Preview */}
                            {selectedTemplateId && (() => {
                                const selectedTemplate = templates.find(t => t.id === selectedTemplateId);
                                if (!selectedTemplate) return null;
                                const firstPhaseKey = selectedTemplate.phases?.[0]?.key || '';
                                return (
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] flex items-center gap-2">
                                            <LayoutIcon className="w-3 h-3" /> Pipeline Layout Preview
                                        </label>
                                        <div className="h-44 w-full">
                                            <WorkflowFlowPreview 
                                                phases={selectedTemplate.phases} 
                                                activePhaseKey={firstPhaseKey}
                                            />
                                        </div>
                                    </div>
                                );
                            })()}

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
                                <div className="max-h-64 overflow-y-auto space-y-1 pr-2 custom-scrollbar">
                                    {cards.length > 0 ? cards.map(card => (
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
                                onClick={onClose}
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
    );
}
