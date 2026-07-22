import { X } from 'lucide-react';
import { motion } from 'motion/react';
import type { Card } from '@/services/types';

interface CardModalHeaderProps {
    title: string;
    setTitle: (title: string) => void;
    status: string;
    setStatus: (status: string) => void;
    priority: 'Low' | 'Medium' | 'High';
    setPriority: (priority: 'Low' | 'Medium' | 'High') => void;
    cardType: string;
    setCardType: (type: any) => void;
    safeColumns: { id: string; title: string }[];
    initialData?: Card | null;
    onClose: () => void;
}

export function CardModalHeader({
    title,
    setTitle,
    status,
    setStatus,
    priority,
    setPriority,
    cardType,
    setCardType,
    safeColumns,
    initialData,
    onClose,
}: CardModalHeaderProps) {
    return (
        <div className="p-6 border-b border-white/10 flex justify-between items-start shrink-0">
            <div className="flex-1 mr-8">
                <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Card Title"
                    className="w-full bg-transparent text-2xl font-bold focus:outline-none mb-2"
                    style={{ color: 'var(--snaps-text-primary)' }}
                />
                <div className="flex gap-4 text-sm items-center">
                    <select
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                        className="bg-transparent border border-white/10 rounded px-2 py-1 focus:outline-none"
                        style={{ color: 'var(--snaps-text-secondary)' }}
                    >
                        {safeColumns.length > 0 ? (
                            safeColumns.map(col => (
                                <option key={col.id} value={col.id}>{col.title}</option>
                            ))
                        ) : (
                            <>
                                <option value="todo">To Do</option>
                                <option value="inprogress">In Progress</option>
                                <option value="done">Done</option>
                            </>
                        )}
                    </select>
                    <select
                        value={priority}
                        onChange={(e) => setPriority(e.target.value as any)}
                        className="bg-transparent border border-white/10 rounded px-2 py-1 focus:outline-none"
                        style={{ color: 'var(--snaps-text-secondary)' }}
                    >
                        <option value="Low">Low</option>
                        <option value="Medium">Medium</option>
                        <option value="High">High</option>
                    </select>
                    <select
                        value={cardType}
                        onChange={(e) => setCardType(e.target.value as any)}
                        className="bg-transparent border border-white/10 rounded px-2 py-1 focus:outline-none"
                        style={{ color: 'var(--snaps-text-secondary)' }}
                    >
                        <option value="feature">Feature</option>
                        <option value="bug">Bug</option>
                        <option value="support">Support</option>
                        <option value="tech-debt">Tech Debt</option>
                    </select>
                </div>
            </div>
            <div className="flex items-center gap-3">
                {initialData?.code && (
                    <div className="text-white/50 text-sm font-mono border border-white/10 px-2 py-1 rounded bg-white/5">
                        {initialData.code}
                    </div>
                )}
                <motion.button
                    whileHover={{ rotate: 90 }}
                    onClick={onClose}
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                >
                    <X className="w-6 h-6 text-white/50" />
                </motion.button>
            </div>
        </div>
    );
}
