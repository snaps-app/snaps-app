import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, KanbanSquare, Briefcase, ChevronRight } from 'lucide-react';
import api, { Project, Board, Card } from '@/services/api';
import { CardModal } from './card-modal';

interface GlobalCardModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCardCreated: () => void;
}

export function GlobalCardModal({ isOpen, onClose, onCardCreated }: GlobalCardModalProps) {
    const [step, setStep] = useState<'project' | 'board' | 'details'>('project');
    const [projects, setProjects] = useState<Project[]>([]);
    const [boards, setBoards] = useState<Board[]>([]);
    const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
    const [selectedBoardId, setSelectedBoardId] = useState<string | null>(null);
    const [epics, setEpics] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setStep('project');
            setSelectedBoardId(null);
            setSelectedProjectId(null);
            setEpics([]);
            setLoading(true);
            api.getProjects()
                .then(setProjects)
                .finally(() => setLoading(false));
        }
    }, [isOpen]);

    const handleSelectProject = async (projectId: string) => {
        setLoading(true);
        setSelectedProjectId(projectId);
        try {
            const [projectBoards, projectEpics] = await Promise.all([
                api.getProjectBoards(projectId),
                api.getEpics(projectId)
            ]);
            setBoards(projectBoards);
            setEpics(projectEpics);
            setStep('board');
        } catch (error) {
            console.error('Failed to fetch project data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSelectBoard = (boardId: string) => {
        setSelectedBoardId(boardId);
        setStep('details');
    };

    const handleSaveCard = async (cardData: Partial<Card>) => {
        if (!selectedBoardId) return;
        try {
            await api.createCard(selectedBoardId, cardData);
            onCardCreated();
            onClose();
        } catch (error) {
            console.error('Failed to create card:', error);
        }
    };

    if (!isOpen) return null;

    if (step === 'details' && selectedBoardId) {
        const selectedBoard = boards.find(b => b.id === selectedBoardId);
        return (
            <CardModal
                isOpen={true}
                onClose={() => setStep('board')}
                onSave={handleSaveCard}
                boardId={selectedBoardId}
                columns={selectedBoard?.columns}
                epics={epics}
                repoNames={[]} // Pass empty array or fetch if needed
            />
        );
    }

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                {/* Backdrop */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                />

                {/* Modal Content */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    className="relative w-full max-w-lg bg-[#0A0A0A] border border-white/10 rounded-2xl overflow-hidden shadow-2xl"
                    style={{ boxShadow: '0 0 50px rgba(0,0,0,0.5)' }}
                >
                    {/* Header */}
                    <div className="p-6 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-purple-500/10 to-blue-500/10">
                        <div>
                            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                {step === 'project' ? (
                                    <><Briefcase className="w-5 h-5 text-[#00D4FF]" /> Selecione o Projeto</>
                                ) : (
                                    <><KanbanSquare className="w-5 h-5 text-purple-400" /> Selecione o Board</>
                                )}
                            </h2>
                            <p className="text-sm text-gray-400">
                                {step === 'project' ? 'Escolha um projeto para o novo card' : 'Em qual board este card deve entrar?'}
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-white/5 rounded-lg transition-colors text-gray-400"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Body */}
                    <div className="p-6 max-h-[60vh] overflow-y-auto min-h-[300px]">
                        {loading ? (
                            <div className="flex flex-col items-center justify-center py-12 gap-4 h-full">
                                <div className="w-8 h-8 border-2 border-[#00D4FF]/30 border-t-[#00D4FF] rounded-full animate-spin" />
                                <p className="text-sm text-gray-500">Carregando...</p>
                            </div>
                        ) : (
                            <div className="grid gap-3">
                                {step === 'project' ? (
                                    projects.map((project) => (
                                        <motion.button
                                            key={project.id}
                                            whileHover={{ scale: 1.01, x: 4 }}
                                            whileTap={{ scale: 0.99 }}
                                            onClick={() => handleSelectProject(project.id)}
                                            className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5 hover:border-[#00D4FF]/50 hover:bg-white/10 transition-all group text-left"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-lg bg-[#00D4FF]/10 flex items-center justify-center border border-[#00D4FF]/20">
                                                    <Briefcase className="w-5 h-5 text-[#00D4FF]" />
                                                </div>
                                                <div>
                                                    <span className="font-bold text-white group-hover:text-[#00D4FF] transition-colors block leading-tight">
                                                        {project.name}
                                                    </span>
                                                    <span className="text-xs text-gray-500 line-clamp-1">{project.description}</span>
                                                </div>
                                            </div>
                                            <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-[#00D4FF] transition-all" />
                                        </motion.button>
                                    ))
                                ) : (
                                    boards.map((board) => (
                                        <motion.button
                                            key={board.id}
                                            whileHover={{ scale: 1.01, x: 4 }}
                                            whileTap={{ scale: 0.99 }}
                                            onClick={() => handleSelectBoard(board.id)}
                                            className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5 hover:border-purple-500/50 hover:bg-white/10 transition-all group text-left"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div
                                                    className="w-3 h-3 rounded-full flex-shrink-0"
                                                    style={{
                                                        backgroundColor: board.color || '#A855F7',
                                                        boxShadow: `0 0 10px ${board.color || '#A855F7'}`
                                                    }}
                                                />
                                                <span className="font-medium text-white group-hover:text-purple-300 transition-colors">
                                                    {board.name}
                                                </span>
                                            </div>
                                            <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-purple-400 transition-all" />
                                        </motion.button>
                                    ))
                                )}
                                {step === 'board' && boards.length === 0 && (
                                    <div className="text-center py-12">
                                        <p className="text-gray-400 mb-4">Nenhum board encontrado para este projeto.</p>
                                        <button
                                            onClick={() => setStep('project')}
                                            className="text-[#00D4FF] text-sm hover:underline"
                                        >
                                            Voltar para projetos
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Footer for navigation */}
                    {step === 'board' && (
                        <div className="p-4 border-t border-white/10 bg-white/5 flex justify-start">
                            <button
                                onClick={() => setStep('project')}
                                className="text-sm text-gray-400 hover:text-white transition-colors flex items-center gap-2"
                            >
                                <ChevronRight className="w-4 h-4 rotate-180" />
                                Voltar para Projetos
                            </button>
                        </div>
                    )}
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
