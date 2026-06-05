import { getProjectBoards } from '@/services/boards';
import type { Board } from '@/services/types';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Plus, KanbanSquare, Check } from 'lucide-react';
import { Button } from '@/app/components/shared/button';

interface BoardListModalProps {
    isOpen: boolean;
    onClose: () => void;
    projectId: string;
    onSelectBoard: (boardId: string) => void;
    onAddBoard: () => void;
}

export function BoardListModal({ isOpen, onClose, projectId, onSelectBoard, onAddBoard }: BoardListModalProps) {
    const [boards, setBoards] = useState<Board[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (isOpen && projectId) {
            setLoading(true);
            getProjectBoards(projectId)
                .then(setBoards)
                .finally(() => setLoading(false));
        }
    }, [isOpen, projectId]);

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
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
                                <KanbanSquare className="w-5 h-5 text-purple-400" />
                                Project Boards
                            </h2>
                            <p className="text-sm text-gray-400">Select a board or create a new one</p>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-white/5 rounded-lg transition-colors text-gray-400"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Body */}
                    <div className="p-6 max-h-[60vh] overflow-y-auto">
                        {loading ? (
                            <div className="flex flex-col items-center justify-center py-12 gap-4">
                                <div className="w-8 h-8 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
                                <p className="text-sm text-gray-500">Loading boards...</p>
                            </div>
                        ) : boards.length === 0 ? (
                            <div className="text-center py-12">
                                <p className="text-gray-400 mb-4">No boards found for this project.</p>
                            </div>
                        ) : (
                            <div className="grid gap-3">
                                {boards.map((board) => (
                                    <motion.button
                                        key={board.id}
                                        whileHover={{ scale: 1.01, x: 4 }}
                                        whileTap={{ scale: 0.99 }}
                                        onClick={() => onSelectBoard(board.id)}
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
                                            {board.board_type && board.board_type !== 'general' && (
                                                <span 
                                                    className="text-[10px] px-1.5 py-0.5 rounded border font-bold uppercase tracking-wider"
                                                    style={{
                                                        backgroundColor: board.board_type === 'roadmap' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                                                        borderColor: board.board_type === 'roadmap' ? 'rgba(59, 130, 246, 0.5)' : 'rgba(239, 68, 68, 0.5)',
                                                        color: board.board_type === 'roadmap' ? '#60a5fa' : '#f87171'
                                                    }}
                                                >
                                                    {board.board_type}
                                                </span>
                                            )}
                                        </div>
                                        <Check className="w-4 h-4 text-purple-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </motion.button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="p-6 border-t border-white/10 bg-white/5">
                        <Button
                            onClick={onAddBoard}
                            className="w-full py-4 flex items-center justify-center gap-2 font-bold"
                            style={{
                                background: 'linear-gradient(135deg, #A855F7 0%, #00D4FF 100%)',
                                boxShadow: '0 4px 15px rgba(168, 85, 247, 0.4)'
                            }}
                        >
                            <Plus className="w-5 h-5" />
                            Add New Board
                        </Button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
