import { createDailyExecution } from '@/services/dailyExecutions';
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Clock, Loader2, Calendar } from 'lucide-react';
import { format } from 'date-fns';

export interface ExecuteTodayData {
    type: 'scheduling' | 'card';
    id: string;
    title: string;
    description?: string;
    project_id: string;
    epic_id?: string;
    startTime?: string;
    endTime?: string;
}

interface ExecuteTodayModalProps {
    isOpen: boolean;
    onClose: () => void;
    data: ExecuteTodayData | null;
    currentDate: Date;
    onSuccess: () => void;
}

export function ExecuteTodayModal({ isOpen, onClose, data, currentDate, onSuccess }: ExecuteTodayModalProps) {
    const [startHour, setStartHour] = useState('09:00');
    const [endHour, setEndHour] = useState('10:00');
    const [loading, setLoading] = useState(false);

    React.useEffect(() => {
        if (data) {
            if (data.startTime) setStartHour(data.startTime);
            else setStartHour('09:00');

            if (data.endTime) setEndHour(data.endTime);
            else setEndHour('10:00');
        }
    }, [data, isOpen]);

    if (!isOpen || !data) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await createDailyExecution(data.project_id, {
                title: data.title,
                description: data.description || '',
                date: format(currentDate, 'yyyy-MM-dd'),
                start_hour: startHour,
                end_hour: endHour,
                epic_id: data.epic_id,
                ...(data.type === 'card' ? { card_id: data.id } : {})
            });
            onSuccess();
            onClose();
        } catch (error) {
            console.error("Failed to create execution:", error);
            alert("Failed to create daily execution");
        } finally {
            setLoading(false);
        }
    };

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    onClick={e => e.stopPropagation()}
                    className="bg-black border border-white/10 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden relative"
                >
                    <div className="absolute inset-0 pointer-events-none bg-gradient-to-br from-[#00D4FF]/5 to-[#A855F7]/5" />

                    {/* Header */}
                    <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between relative z-10">
                        <div className="flex items-center gap-2">
                            <Clock className="w-5 h-5 text-purple-400" />
                            <h2 className="text-lg font-semibold text-white">Execute Today</h2>
                        </div>
                        <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-full transition-colors text-zinc-400">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-6 relative z-10">
                        <div className="flex flex-col gap-1">
                            <label className="text-xs font-medium text-zinc-400 uppercase tracking-widest">Selected Item</label>
                            <div className="text-zinc-200 font-medium px-3 py-2 bg-white/5 border border-white/10 rounded-lg">
                                {data.title}
                            </div>
                        </div>

                        <div className="flex flex-col gap-1">
                            <label className="text-xs font-medium text-zinc-400 uppercase tracking-widest">Date</label>
                            <div className="flex items-center gap-2 text-zinc-200 font-medium px-3 py-2 bg-white/5 border border-white/10 rounded-lg opacity-70 cursor-not-allowed">
                                <Calendar className="w-4 h-4 text-zinc-400" />
                                {format(currentDate, 'PP')}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="flex flex-col gap-1">
                                <label className="text-xs font-medium text-zinc-400 uppercase tracking-widest">Start Time</label>
                                <input
                                    type="time"
                                    required
                                    className="px-3 py-2 bg-black border border-white/10 rounded-lg text-white focus:outline-none focus:border-purple-500 transition-colors"
                                    value={startHour}
                                    onChange={e => setStartHour(e.target.value)}
                                />
                            </div>
                            <div className="flex flex-col gap-1">
                                <label className="text-xs font-medium text-zinc-400 uppercase tracking-widest">End Time</label>
                                <input
                                    type="time"
                                    required
                                    className="px-3 py-2 bg-black border border-white/10 rounded-lg text-white focus:outline-none focus:border-purple-500 transition-colors"
                                    value={endHour}
                                    onChange={e => setEndHour(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 mt-2">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 rounded-lg text-sm font-medium text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className="px-5 py-2 rounded-lg text-sm font-medium bg-gradient-to-r from-[#00D4FF] to-[#A855F7] text-white shadow-lg shadow-purple-500/20 hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                                Schedule Execution
                            </button>
                        </div>
                    </form>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
