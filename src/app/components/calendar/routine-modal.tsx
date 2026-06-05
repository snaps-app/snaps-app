import { createRoutine, deleteRoutine, updateRoutine } from '@/services/routines';
import type { Routine, RoutineCreate } from '@/services/types';
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Loader2, Type, AlignLeft, Clock, Repeat, Trash2 } from 'lucide-react';

interface RoutineModalProps {
    isOpen: boolean;
    onClose: () => void;
    routine: Routine | null;  // null = creating
    onSuccess: () => void;
}

const DAY_OPTIONS = [
    { value: 0, label: 'Sun' },
    { value: 1, label: 'Mon' },
    { value: 2, label: 'Tue' },
    { value: 3, label: 'Wed' },
    { value: 4, label: 'Thu' },
    { value: 5, label: 'Fri' },
    { value: 6, label: 'Sat' },
];

export function RoutineModal({ isOpen, onClose, routine, onSuccess }: RoutineModalProps) {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [recurrenceType, setRecurrenceType] = useState<'daily' | 'weekdays'>('daily');
    const [recurrenceDays, setRecurrenceDays] = useState<number[]>([]);
    const [startHour, setStartHour] = useState('');
    const [endHour, setEndHour] = useState('');
    const [loading, setLoading] = useState(false);
    const [deleting, setDeleting] = useState(false);

    useEffect(() => {
        if (isOpen) {
            if (routine) {
                setTitle(routine.title);
                setDescription(routine.description || '');
                setRecurrenceType(routine.recurrence_type as 'daily' | 'weekdays');
                setRecurrenceDays(routine.recurrence_days || []);
                setStartHour(routine.default_start_hour || '');
                setEndHour(routine.default_end_hour || '');
            } else {
                setTitle('');
                setDescription('');
                setRecurrenceType('daily');
                setRecurrenceDays([]);
                setStartHour('');
                setEndHour('');
            }
        }
    }, [isOpen, routine]);

    const toggleDay = (day: number) => {
        setRecurrenceDays(prev =>
            prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day].sort()
        );
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title) return;

        setLoading(true);
        try {
            const payload: RoutineCreate = {
                title,
                description: description || undefined,
                recurrence_type: recurrenceType,
                recurrence_days: recurrenceType === 'weekdays' ? recurrenceDays : [],
                default_start_hour: startHour || undefined,
                default_end_hour: endHour || undefined,
            };

            if (routine) {
                await updateRoutine(routine.id, payload);
            } else {
                await createRoutine(payload);
            }
            onSuccess();
            onClose();
        } catch (error) {
            console.error('Failed to save routine:', error);
            alert('Failed to save routine');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!routine) return;
        if (!confirm('Are you sure you want to delete this routine?')) return;
        setDeleting(true);
        try {
            await deleteRoutine(routine.id);
            onSuccess();
            onClose();
        } catch (error) {
            console.error('Failed to delete routine:', error);
            alert('Failed to delete routine');
        } finally {
            setDeleting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.95, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.95, opacity: 0, y: 20 }}
                    onClick={e => e.stopPropagation()}
                    className="bg-black border border-white/10 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden relative"
                >
                    <div className="absolute inset-0 pointer-events-none bg-gradient-to-br from-amber-500/5 to-orange-500/5" />

                    {/* Header */}
                    <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between relative z-10">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
                                <Repeat className="w-4 h-4 text-amber-400" />
                            </div>
                            <h2 className="text-lg font-semibold text-white">
                                {routine ? 'Edit Routine' : 'New Routine'}
                            </h2>
                        </div>
                        <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-full transition-colors text-zinc-400">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4 relative z-10">

                        {/* Title */}
                        <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                                <Type className="w-3 h-3" /> Title
                            </label>
                            <input
                                autoFocus
                                required
                                type="text"
                                placeholder="e.g. Feed the cats"
                                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-zinc-200 focus:outline-none focus:border-amber-500/50 transition-colors"
                                value={title}
                                onChange={e => setTitle(e.target.value)}
                            />
                        </div>

                        {/* Description */}
                        <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                                <AlignLeft className="w-3 h-3" /> Description
                            </label>
                            <textarea
                                placeholder="Optional notes..."
                                rows={2}
                                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-zinc-200 focus:outline-none focus:border-amber-500/50 transition-colors resize-none text-sm"
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                            />
                        </div>

                        {/* Recurrence Type */}
                        <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                                <Repeat className="w-3 h-3" /> Recurrence
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    type="button"
                                    onClick={() => setRecurrenceType('daily')}
                                    className={`px-3 py-2 rounded-xl border text-xs font-medium transition-all ${recurrenceType === 'daily' ? 'bg-amber-500/20 border-amber-500/40 text-amber-300' : 'bg-white/5 border-white/10 text-zinc-400 hover:bg-white/10'}`}
                                >
                                    Every Day
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setRecurrenceType('weekdays')}
                                    className={`px-3 py-2 rounded-xl border text-xs font-medium transition-all ${recurrenceType === 'weekdays' ? 'bg-amber-500/20 border-amber-500/40 text-amber-300' : 'bg-white/5 border-white/10 text-zinc-400 hover:bg-white/10'}`}
                                >
                                    Specific Days
                                </button>
                            </div>
                        </div>

                        {/* Day Picker (only for weekdays) */}
                        {recurrenceType === 'weekdays' && (
                            <div className="flex gap-1.5">
                                {DAY_OPTIONS.map(day => (
                                    <button
                                        key={day.value}
                                        type="button"
                                        onClick={() => toggleDay(day.value)}
                                        className={`flex-1 py-2 rounded-lg text-[11px] font-bold transition-all ${recurrenceDays.includes(day.value)
                                            ? 'bg-amber-500/20 border border-amber-500/40 text-amber-300'
                                            : 'bg-white/5 border border-white/10 text-zinc-500 hover:bg-white/10'
                                            }`}
                                    >
                                        {day.label}
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Time Range (optional) */}
                        <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-1">
                                <Clock className="w-3 h-3" /> Time (Optional)
                            </label>
                            <div className="flex gap-2">
                                <input
                                    type="time"
                                    className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-zinc-200 focus:outline-none focus:border-amber-500/50 transition-colors scheme-dark text-xs"
                                    value={startHour}
                                    onChange={e => setStartHour(e.target.value)}
                                />
                                <span className="text-zinc-500 py-2">-</span>
                                <input
                                    type="time"
                                    className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-zinc-200 focus:outline-none focus:border-amber-500/50 transition-colors scheme-dark text-xs"
                                    value={endHour}
                                    onChange={e => setEndHour(e.target.value)}
                                />
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="flex items-center gap-3 mt-2 border-t border-white/10 pt-4">
                            {routine && (
                                <button
                                    type="button"
                                    onClick={handleDelete}
                                    disabled={deleting}
                                    className="px-4 py-2.5 rounded-xl text-sm font-medium text-red-400 hover:bg-red-500/10 border border-red-500/20 transition-colors flex items-center gap-2 disabled:opacity-50"
                                >
                                    <Trash2 className="w-4 h-4" />
                                    {deleting ? 'Deleting...' : 'Delete'}
                                </button>
                            )}
                            <div className="flex-1" />
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-6 py-2.5 rounded-xl text-sm font-medium text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={loading || !title}
                                className="px-8 py-2.5 rounded-xl text-sm font-bold bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/20 hover:brightness-110 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                                {routine ? 'Update' : 'Create'}
                            </button>
                        </div>
                    </form>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
