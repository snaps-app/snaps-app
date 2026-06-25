import { getEpics } from '@/services/epics';
import { getProjects } from '@/services/projects';
import { createScheduling, updateScheduling, deleteScheduling } from '@/services/schedulings';
import type { Epic, Project, SchedulingCreate, SchedulingWithProject } from '@/services/types';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Calendar, Type, AlignLeft, Loader2, Target, Repeat, Clock, Trash2, Play } from 'lucide-react';
import { format } from 'date-fns';
import { parseServerDate, formatServerTime } from '@/lib/date-utils';

interface CreateSchedulingModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentDate: Date;
    onSuccess: () => void;
    /** When provided, the modal works in edit mode (pre-filled + PUT). */
    scheduling?: SchedulingWithProject | null;
    /** Triggers the "Execute Today" flow for the scheduling being edited. */
    onExecuteToday?: (scheduling: SchedulingWithProject) => void;
}

const RECURRENCE_OPTIONS = [
    { id: 'none', label: 'Nenhuma', icon: X },
    { id: 'daily', label: 'Todo dia', icon: Repeat },
    { id: 'weekly', label: 'Semanal', icon: Repeat },
    { id: 'monthly', label: 'Mensal', icon: Repeat },
];

export function CreateSchedulingModal({ isOpen, onClose, currentDate, onSuccess, scheduling, onExecuteToday }: CreateSchedulingModalProps) {
    const isEdit = !!scheduling;
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [startDate, setStartDate] = useState(format(currentDate, 'yyyy-MM-dd'));
    const [startTime, setStartTime] = useState('09:00');
    const [endDate, setEndDate] = useState(format(currentDate, 'yyyy-MM-dd'));
    const [endTime, setEndTime] = useState('10:00');
    const [recurrence, setRecurrence] = useState('none');
    const [projectId, setProjectId] = useState('');
    const [epicId, setEpicId] = useState('');

    const [projects, setProjects] = useState<Project[]>([]);
    const [epics, setEpics] = useState<Epic[]>([]);
    const [loading, setLoading] = useState(false);
    const [fetchingProjects, setFetchingProjects] = useState(false);

    useEffect(() => {
        if (!isOpen) return;
        fetchInitialData();
        if (scheduling) {
            // Edit mode: pre-fill from the scheduling (UTC -> local for date/time inputs)
            setTitle(scheduling.title || '');
            setDescription(scheduling.description || '');
            setStartDate(format(parseServerDate(scheduling.start_date), 'yyyy-MM-dd'));
            setStartTime(formatServerTime(scheduling.start_date));
            setEndDate(format(parseServerDate(scheduling.end_date), 'yyyy-MM-dd'));
            setEndTime(formatServerTime(scheduling.end_date));
            setRecurrence(scheduling.recurrence || 'none');
            setProjectId(scheduling.project_id);
            setEpicId(scheduling.epic_id || '');
        } else {
            // Create mode: defaults
            setTitle('');
            setDescription('');
            setStartDate(format(currentDate, 'yyyy-MM-dd'));
            setEndDate(format(currentDate, 'yyyy-MM-dd'));
            setStartTime('09:00');
            setEndTime('10:00');
            setRecurrence('none');
            setEpicId('');
        }
    }, [isOpen, scheduling]);

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
            // Only auto-select the first project when creating (edit mode keeps the scheduling's project)
            if (data.length > 0 && !scheduling) {
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
            // Create proper Date objects from local inputs to send correct ISO strings
            const startStr = `${startDate}T${startTime}:00`;
            const endStr = `${endDate}T${endTime}:00`;

            const payload: SchedulingCreate = {
                title,
                description,
                start_date: new Date(startStr).toISOString(),
                end_date: new Date(endStr).toISOString(),
                epic_id: epicId || undefined,
                recurrence: recurrence === 'none' ? undefined : recurrence,
                status: 'scheduled'
            };
            if (isEdit && scheduling) {
                await updateScheduling(scheduling.id, payload);
            } else {
                await createScheduling(projectId, payload);
            }
            onSuccess();
            onClose();
            // Reset form
            setTitle('');
            setDescription('');
            setRecurrence('none');
        } catch (error) {
            console.error("Failed to save scheduling:", error);
            alert(isEdit ? "Failed to update scheduling" : "Failed to create scheduling");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!scheduling) return;
        if (!window.confirm('Tem certeza que deseja excluir este agendamento?')) return;
        setLoading(true);
        try {
            await deleteScheduling(scheduling.id);
            onSuccess();
            onClose();
        } catch (error) {
            console.error("Failed to delete scheduling:", error);
            alert("Failed to delete scheduling");
        } finally {
            setLoading(false);
        }
    };

    const handleExecuteToday = () => {
        if (scheduling && onExecuteToday) {
            onExecuteToday(scheduling);
        }
    };

    // When the start changes, keep the same duration (defaults to 1h) and never let the end fall before it.
    const handleStartChange = (newStartDate: string, newStartTime: string) => {
        setStartDate(newStartDate);
        setStartTime(newStartTime);

        const newStart = new Date(`${newStartDate}T${newStartTime}:00`);
        if (isNaN(newStart.getTime())) return;

        const oldStart = new Date(`${startDate}T${startTime}:00`);
        const oldEnd = new Date(`${endDate}T${endTime}:00`);
        let durationMs = oldEnd.getTime() - oldStart.getTime();
        if (!(durationMs > 0)) durationMs = 60 * 60 * 1000; // fallback: 1h

        const newEnd = new Date(newStart.getTime() + durationMs);
        setEndDate(format(newEnd, 'yyyy-MM-dd'));
        setEndTime(format(newEnd, 'HH:mm'));
    };

    // Prevent an end before/equal to the start: snap it to start + 1h.
    const handleEndChange = (newEndDate: string, newEndTime: string) => {
        const start = new Date(`${startDate}T${startTime}:00`);
        const end = new Date(`${newEndDate}T${newEndTime}:00`);
        if (!isNaN(start.getTime()) && !isNaN(end.getTime()) && end <= start) {
            const fixed = new Date(start.getTime() + 60 * 60 * 1000);
            setEndDate(format(fixed, 'yyyy-MM-dd'));
            setEndTime(format(fixed, 'HH:mm'));
            return;
        }
        setEndDate(newEndDate);
        setEndTime(newEndTime);
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
                    <div className="absolute inset-0 pointer-events-none bg-gradient-to-br from-[#00D4FF]/5 to-[#A855F7]/5" />

                    {/* Header */}
                    <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between relative z-10">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-orange-500/20 flex items-center justify-center">
                                <Calendar className="w-4 h-4 text-orange-400" />
                            </div>
                            <h2 className="text-lg font-semibold text-white">{isEdit ? 'Editar Agendamento' : 'Novo Agendamento'}</h2>
                        </div>
                        <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-full transition-colors text-zinc-400">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-5 relative z-10 overflow-y-auto max-h-[80vh] custom-scrollbar">

                        {/* Project Selection */}
                        <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                                <Target className="w-3 h-3" /> Projeto
                            </label>
                            <select
                                required
                                value={projectId}
                                onChange={e => setProjectId(e.target.value)}
                                disabled={isEdit}
                                title={isEdit ? 'O projeto não pode ser alterado na edição' : undefined}
                                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-zinc-200 focus:outline-none focus:border-orange-500/50 transition-colors appearance-none cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                                {fetchingProjects ? <option>Carregando projetos...</option> : projects.map(p => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                            </select>
                        </div>

                        {/* Title */}
                        <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                                <Type className="w-3 h-3" /> Título
                            </label>
                            <input
                                autoFocus
                                required
                                type="text"
                                placeholder="Ex: Campanha de Lançamento"
                                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-zinc-200 focus:outline-none focus:border-orange-500/50 transition-colors"
                                value={title}
                                onChange={e => setTitle(e.target.value)}
                            />
                        </div>

                        {/* Description */}
                        <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                                <AlignLeft className="w-3 h-3" /> Descrição
                            </label>
                            <textarea
                                placeholder="Detalhes do agendamento..."
                                rows={3}
                                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-zinc-200 focus:outline-none focus:border-orange-500/50 transition-colors resize-none text-sm"
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                            />
                        </div>

                        {/* Dates and Times */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="flex flex-col gap-1.5">
                                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-1">
                                    <Calendar className="w-3 h-3" /> Início
                                </label>
                                <div className="flex gap-2">
                                    <input
                                        required
                                        type="date"
                                        className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-zinc-200 focus:outline-none focus:border-orange-500/50 transition-colors scheme-dark text-xs"
                                        value={startDate}
                                        onChange={e => handleStartChange(e.target.value, startTime)}
                                    />
                                    <input
                                        required
                                        type="time"
                                        className="w-24 px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-zinc-200 focus:outline-none focus:border-orange-500/50 transition-colors scheme-dark text-xs"
                                        value={startTime}
                                        onChange={e => handleStartChange(startDate, e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-1">
                                    <Clock className="w-3 h-3" /> Término
                                </label>
                                <div className="flex gap-2">
                                    <input
                                        required
                                        type="date"
                                        min={startDate}
                                        className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-zinc-200 focus:outline-none focus:border-orange-500/50 transition-colors scheme-dark text-xs"
                                        value={endDate}
                                        onChange={e => handleEndChange(e.target.value, endTime)}
                                    />
                                    <input
                                        required
                                        type="time"
                                        min={endDate === startDate ? startTime : undefined}
                                        className="w-24 px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-zinc-200 focus:outline-none focus:border-orange-500/50 transition-colors scheme-dark text-xs"
                                        value={endTime}
                                        onChange={e => handleEndChange(endDate, e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Recurrence Selection */}
                        <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                                <Repeat className="w-3 h-3" /> Repetir
                            </label>
                            <div className="grid grid-cols-4 gap-2">
                                {RECURRENCE_OPTIONS.map(opt => {
                                    const Icon = opt.icon;
                                    const isActive = recurrence === opt.id;
                                    return (
                                        <button
                                            key={opt.id}
                                            type="button"
                                            onClick={() => setRecurrence(opt.id)}
                                            className={`px-3 py-2 rounded-xl border text-[10px] font-bold transition-all flex flex-col items-center gap-1 ${isActive ? 'bg-orange-500/20 border-orange-500/50 text-orange-400' : 'bg-white/5 border-white/10 text-zinc-400 hover:bg-white/10'}`}
                                        >
                                            <Icon className="w-3 h-3" />
                                            {opt.label}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Epic Selection */}
                        <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                                <Target className="w-3 h-3" /> Epic (Opcional)
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    type="button"
                                    onClick={() => setEpicId('')}
                                    className={`px-3 py-2 rounded-xl border text-xs font-medium transition-all ${!epicId ? 'bg-orange-500/20 border-orange-500/50 text-orange-300' : 'bg-white/5 border-white/10 text-zinc-400 hover:bg-white/10'}`}
                                >
                                    Sem Epic
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

                        {/* Execute Today — ação secundária destacada (modo edição) */}
                        {isEdit && onExecuteToday && (
                            <button
                                type="button"
                                onClick={handleExecuteToday}
                                disabled={loading}
                                className="w-full px-4 py-2.5 rounded-xl text-sm font-semibold text-[#00D4FF] border border-[#00D4FF]/30 bg-[#00D4FF]/5 hover:bg-[#00D4FF]/10 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <Play className="w-4 h-4" />
                                Executar hoje
                            </button>
                        )}

                        {/* Footer */}
                        <div className="flex items-center gap-3 border-t border-white/10 pt-5">
                            {isEdit && (
                                <button
                                    type="button"
                                    onClick={handleDelete}
                                    disabled={loading}
                                    title="Excluir agendamento"
                                    aria-label="Excluir agendamento"
                                    className="p-2.5 rounded-xl text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <Trash2 className="w-5 h-5" />
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={onClose}
                                className="ml-auto px-5 py-2.5 rounded-xl text-sm font-medium text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                disabled={loading || !projectId}
                                className="px-6 py-2.5 rounded-xl text-sm font-bold bg-gradient-to-r from-[#FF6B35] to-[#A855F7] text-white shadow-lg shadow-orange-500/20 hover:brightness-110 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                                {isEdit ? 'Salvar Alterações' : 'Criar Agendamento'}
                            </button>
                        </div>
                    </form>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
