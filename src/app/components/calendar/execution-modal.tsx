import { createDailyExecution, deleteDailyExecution, updateDailyExecution } from '@/services/dailyExecutions';
import { getEpics } from '@/services/epics';
import { getProjects } from '@/services/projects';
import type { DailyExecution, Epic, Project } from '@/services/types';
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Clock, Loader2, Calendar, Type, AlignLeft, Target, Rocket, Check, Ban, Circle, Trash2 } from 'lucide-react';
import { format } from 'date-fns';

interface ExecutionModalProps {
    isOpen: boolean;
    onClose: () => void;
    execution: DailyExecution | null; // If null, we are creating
    currentDate: Date;
    defaultCardId?: string;
    defaultTaskId?: string;
    onSuccess: () => void;
}

const STATUS_OPTIONS = [
    { id: 'planned', label: 'Planned', icon: Circle, color: 'text-zinc-400' },
    { id: 'executed', label: 'Executed', icon: Check, color: 'text-green-400' },
    { id: 'blocked', label: 'Blocked', icon: Ban, color: 'text-red-400' },
];

export function ExecutionModal({ isOpen, onClose, execution, currentDate, defaultCardId, defaultTaskId, onSuccess }: ExecutionModalProps) {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [date, setDate] = useState(format(currentDate, 'yyyy-MM-dd'));
    const [startHour, setStartHour] = useState('09:00');
    const [endHour, setEndHour] = useState('10:00');
    const [status, setStatus] = useState('planned');
    const [projectId, setProjectId] = useState('');
    const [epicId, setEpicId] = useState('');

    const [projects, setProjects] = useState<Project[]>([]);
    const [epics, setEpics] = useState<Epic[]>([]);
    const [loading, setLoading] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [fetchingProjects, setFetchingProjects] = useState(false);

    useEffect(() => {
        if (isOpen) {
            fetchInitialData();
            if (execution) {
                setTitle(execution.title);
                setDescription(execution.description || '');
                setDate(execution.date);
                setStartHour(execution.start_hour);
                setEndHour(execution.end_hour);
                setStatus(execution.status || 'planned');
                setProjectId(execution.project_id);
                setEpicId(execution.epic_id || '');
            } else {
                setTitle('');
                setDescription('');
                setDate(format(currentDate, 'yyyy-MM-dd'));
                setStartHour('09:00');
                setEndHour('10:00');
                setStatus('planned');
                setEpicId('');
            }
        }
    }, [isOpen, execution]);

    useEffect(() => {
        if (projectId) {
            fetchEpics(projectId);
        } else {
            setEpics([]);
            setEpicId('');
        }
    }, [projectId]);

    const fetchInitialData = async () => {
        setFetchingProjects(true);
        try {
            const data = await getProjects();
            setProjects(data);
            if (data.length > 0 && !projectId && !execution) {
                setProjectId(data[0].id);
            }
        } catch (error) {
            console.error("Error fetching projects:", error);
        } finally {
            setFetchingProjects(false);
        }
    };

    const fetchEpics = async (pid: string) => {
        try {
            const data = await getEpics(pid);
            setEpics(data);
        } catch (error) {
            console.error("Error fetching epics:", error);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!projectId || !title) return;

        setLoading(true);
        try {
            const payload: any = {
                title,
                description,
                date,
                start_hour: startHour,
                end_hour: endHour,
                status,
                epic_id: epicId || undefined,
                card_id: defaultCardId,
                task_id: defaultTaskId,
            };

            if (execution) {
                await updateDailyExecution(execution.id, payload);
            } else {
                await createDailyExecution(projectId, payload);
            }
            onSuccess();
            onClose();
        } catch (error) {
            console.error("Failed to save execution:", error);
            alert("Failed to save execution");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!execution) return;
        if (!confirm('Are you sure you want to delete this execution?')) return;
        setDeleting(true);
        try {
            await deleteDailyExecution(execution.id);
            onSuccess();
            onClose();
        } catch (error) {
            console.error('Failed to delete execution:', error);
            alert('Failed to delete execution');
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
                    className="bg-black border border-white/10 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden relative"
                >
                    <div className="absolute inset-0 pointer-events-none bg-gradient-to-br from-rose-500/5 to-[#A855F7]/5" />

                    {/* Header */}
                    <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between relative z-10">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-rose-500/20 flex items-center justify-center">
                                <Rocket className="w-4 h-4 text-rose-400" />
                            </div>
                            <h2 className="text-lg font-semibold text-white">
                                {execution ? 'Edit Execution' : 'New Execution'}
                            </h2>
                        </div>
                        <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-full transition-colors text-zinc-400">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4 relative z-10 overflow-y-auto max-h-[80vh] custom-scrollbar">

                        {/* Project Selection */}
                        <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                                <Target className="w-3 h-3" /> Project
                            </label>
                            <select
                                required
                                value={projectId}
                                onChange={e => setProjectId(e.target.value)}
                                disabled={!!execution}
                                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-zinc-200 focus:outline-none focus:border-rose-500/50 transition-colors appearance-none cursor-pointer disabled:opacity-50"
                            >
                                {fetchingProjects ? <option>Loading projects...</option> : projects.map(p => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                            </select>
                        </div>

                        {/* Title */}
                        <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                                <Type className="w-3 h-3" /> Title
                            </label>
                            <input
                                autoFocus
                                required
                                type="text"
                                placeholder="What will you execute?"
                                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-zinc-200 focus:outline-none focus:border-rose-500/50 transition-colors"
                                value={title}
                                onChange={e => setTitle(e.target.value)}
                            />
                        </div>

                        {/* Status Selection */}
                        <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                                <Rocket className="w-3 h-3" /> Status
                            </label>
                            <div className="grid grid-cols-3 gap-2">
                                {STATUS_OPTIONS.map(opt => {
                                    const Icon = opt.icon;
                                    const isActive = status === opt.id;
                                    return (
                                        <button
                                            key={opt.id}
                                            type="button"
                                            onClick={() => setStatus(opt.id)}
                                            className={`px-3 py-2 rounded-xl border text-[10px] font-bold transition-all flex items-center justify-center gap-2 ${isActive ? 'bg-white/10 border-white/30 text-white' : 'bg-white/5 border-white/10 text-zinc-400 hover:bg-white/10'}`}
                                        >
                                            <Icon className={`w-3.5 h-3.5 ${opt.color}`} />
                                            {opt.label}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Date and Times */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="flex flex-col gap-1.5">
                                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-1">
                                    <Calendar className="w-3 h-3" /> Date
                                </label>
                                <input
                                    required
                                    type="date"
                                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-zinc-200 focus:outline-none focus:border-rose-500/50 transition-colors scheme-dark text-xs"
                                    value={date}
                                    onChange={e => setDate(e.target.value)}
                                />
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-1">
                                    <Clock className="w-3 h-3" /> Time
                                </label>
                                <div className="flex gap-2">
                                    <input
                                        required
                                        type="time"
                                        className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-zinc-200 focus:outline-none focus:border-rose-500/50 transition-colors scheme-dark text-xs"
                                        value={startHour}
                                        onChange={e => setStartHour(e.target.value)}
                                    />
                                    <span className="text-zinc-500 py-2">-</span>
                                    <input
                                        required
                                        type="time"
                                        className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-zinc-200 focus:outline-none focus:border-rose-500/50 transition-colors scheme-dark text-xs"
                                        value={endHour}
                                        onChange={e => setEndHour(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Description */}
                        <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                                <AlignLeft className="w-3 h-3" /> Description
                            </label>
                            <textarea
                                placeholder="Notes or observations..."
                                rows={2}
                                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-zinc-200 focus:outline-none focus:border-rose-500/50 transition-colors resize-none text-sm"
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                            />
                        </div>

                        {/* Epic Selection */}
                        <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                                <Target className="w-3 h-3" /> Epic (Optional)
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    type="button"
                                    onClick={() => setEpicId('')}
                                    className={`px-3 py-2 rounded-xl border text-xs font-medium transition-all ${!epicId ? 'bg-white/10 border-white/30 text-white' : 'bg-white/5 border-white/10 text-zinc-400 hover:bg-white/10'}`}
                                >
                                    No Epic
                                </button>
                                {epics.map(epic => (
                                    <button
                                        key={epic.id}
                                        type="button"
                                        onClick={() => setEpicId(epic.id)}
                                        className={`px-3 py-2 rounded-xl border text-xs font-medium transition-all flex items-center gap-2 truncate ${epicId === epic.id ? 'bg-white/10 border-white/30 text-white' : 'bg-black/20 border-white/5 text-zinc-400 hover:bg-white/5'}`}
                                        style={epicId === epic.id ? { borderColor: `${epic.color}80`, backgroundColor: `${epic.color}20`, color: epic.color } : {}}
                                    >
                                        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: epic.color }} />
                                        <span className="truncate">{epic.name}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="flex items-center gap-3 mt-4 border-t border-white/10 pt-6">
                            {execution && (
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
                                disabled={loading || !projectId || !title}
                                className="px-8 py-2.5 rounded-xl text-sm font-bold bg-gradient-to-r from-rose-500 to-[#A855F7] text-white shadow-lg shadow-rose-500/20 hover:brightness-110 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                                {execution ? 'Update' : 'Create Execution'}
                            </button>
                        </div>
                    </form>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
