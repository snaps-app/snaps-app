import { useState, useEffect } from 'react';
import { X, Hash, Check, Plus, Trash2, Bot } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Tag } from './tag';
import { Card, Task, createTask, updateTask, deleteTask, Epic } from '@/services/api';
import { formatToISODateOnly, parseDateForStorage } from '@/lib/date-utils';

interface CardModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (cardData: Partial<Card>) => void;
    initialData?: Card | null;
    boardId?: string; // Needed if creating mostly? Or handled by parent
    epics?: Epic[];
    columns?: { id: string; title: string }[];
}

export function CardModal({ isOpen, onClose, onSave, initialData, epics = [], columns = [] }: CardModalProps) {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [status, setStatus] = useState<string>('todo');
    const [priority, setPriority] = useState<'Low' | 'Medium' | 'High'>('Medium');
    const [dueDate, setDueDate] = useState('');
    const [tags, setTags] = useState<string[]>([]);
    const [tagInput, setTagInput] = useState('');
    const [epicId, setEpicId] = useState<string>('');

    const tagVariants: Array<'blue' | 'orange' | 'purple' | 'green' | 'pink' | 'red' | 'yellow' | 'slate' | 'teal' | 'indigo' | 'lime' | 'rose' | 'sky' | 'fuchsia' | 'emerald' | 'amber'> =
        ['blue', 'orange', 'purple', 'green', 'pink', 'red', 'yellow', 'slate', 'teal', 'indigo', 'lime', 'rose', 'sky', 'fuchsia', 'emerald', 'amber'];

    // Tasks state
    const [tasks, setTasks] = useState<Task[]>([]);
    const [newTaskTitle, setNewTaskTitle] = useState('');

    // Reset or load data when opening
    useEffect(() => {
        if (isOpen) {
            if (initialData) {
                setTitle(initialData.title);
                setDescription(initialData.description || '');
                setStatus(initialData.status);
                setPriority(initialData.priority || 'Medium');
                setDueDate(formatToISODateOnly(initialData.due_date));
                setTags(initialData.labels || []); // Assuming labels are strings for now
                setTasks(initialData.tasks || []);
                setEpicId(initialData.epic_id || '');
            } else {
                // Reset for new card
                setTitle('');
                setDescription('');
                setStatus(columns.length > 0 ? columns[0].id : 'todo');
                setPriority('Medium');
                setDueDate('');
                setTags([]);
                setTasks([]);
                setEpicId('');
            }
        }
    }, [isOpen, initialData, columns]);

    const handleSave = () => {
        if (title.trim()) {
            onSave({
                ...initialData,
                title,
                description,
                status,
                priority,
                due_date: parseDateForStorage(dueDate),
                epic_id: epicId || undefined,
                labels: tags,
                // Tasks are handled separately via API usually, but if creating new card, we might need to handle them after save?
                // For MVP, tasks might only be editable on existing cards or we pass them to create endpoint if supported.
                // Let's assume onSave handles the main card update/create.
            });
            onClose();
        }
    };

    const handleAddTask = async () => {
        if (!newTaskTitle.trim() || !initialData?.id) return;
        try {
            const task = await createTask(initialData.id, newTaskTitle);
            setTasks([...tasks, task]);
            setNewTaskTitle('');
        } catch (error) {
            console.error('Failed to add task:', error);
        }
    };

    const handleToggleTask = async (task: Task) => {
        try {
            const updated = await updateTask(task.id, { completed: !task.completed });
            setTasks(tasks.map(t => t.id === task.id ? updated : t));
        } catch (error) {
            console.error('Failed to update task:', error);
        }
    };

    const handleDeleteTask = async (taskId: string) => {
        try {
            await deleteTask(taskId);
            setTasks(tasks.filter(t => t.id !== taskId));
        } catch (error) {
            console.error('Failed to delete task:', error);
        }
    };

    const handleAddTag = () => {
        if (tagInput.trim() && !tags.includes(tagInput.trim())) {
            setTags([...tags, tagInput.trim()]);
            setTagInput('');
        }
    };

    const removeTag = (tag: string) => {
        setTags(tags.filter(t => t !== tag));
    };


    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 z-50"
                        style={{
                            backgroundColor: 'rgba(0, 0, 0, 0.7)',
                            backdropFilter: 'blur(20px)'
                        }}
                    />

                    {/* Modal */}
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                            className="w-full max-w-4xl pointer-events-auto relative flex flex-col max-h-[90vh]"
                        >
                            <div
                                className="rounded-2xl backdrop-blur-[40px] flex flex-col h-full overflow-hidden"
                                style={{
                                    background: 'rgba(10, 10, 10, 0.95)',
                                    border: '1px solid rgba(255, 255, 255, 0.1)',
                                    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.8)'
                                }}
                            >
                                {/* Header */}
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
                                                {columns.length > 0 ? (
                                                    columns.map(col => (
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
                                            <input
                                                type="date"
                                                value={dueDate}
                                                onChange={(e) => setDueDate(e.target.value)}
                                                className="bg-transparent border border-white/10 rounded px-2 py-1 focus:outline-none"
                                                style={{ color: 'var(--snaps-text-secondary)', colorScheme: 'dark' }}
                                            />
                                            <select
                                                value={epicId}
                                                onChange={(e) => setEpicId(e.target.value)}
                                                className="bg-transparent border border-white/10 rounded px-2 py-1 focus:outline-none max-w-[150px]"
                                                style={{ color: 'var(--snaps-text-secondary)' }}
                                            >
                                                <option value="">No Epic</option>
                                                {epics.map(epic => (
                                                    <option key={epic.id} value={epic.id}>{epic.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                    <motion.button
                                        whileHover={{ rotate: 90 }}
                                        onClick={onClose}
                                        className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                                    >
                                        <X className="w-6 h-6 text-white/50" />
                                    </motion.button>
                                </div>

                                {/* Content */}
                                <div className="flex-1 overflow-y-auto p-6 flex gap-8">
                                    {/* Main Left Column */}
                                    <div className="flex-1 space-y-6">
                                        {/* Description */}
                                        <div>
                                            <label className="block text-sm font-medium mb-2 text-white/50">Description</label>
                                            <textarea
                                                value={description}
                                                onChange={(e) => setDescription(e.target.value)}
                                                placeholder="Add a more detailed description..."
                                                className="w-full h-32 bg-white/5 rounded-xl p-4 resize-none focus:outline-none focus:ring-1 focus:ring-blue-500/50"
                                                style={{ color: 'var(--snaps-text-primary)' }}
                                            />
                                        </div>

                                        {/* Tasks */}
                                        {initialData && (
                                            <div>
                                                <div className="flex items-center justify-between mb-2">
                                                    <label className="block text-sm font-medium text-white/50">Tasks</label>
                                                    <span className="text-xs text-white/30">
                                                        {tasks.filter(t => t.completed).length}/{tasks.length} Completed
                                                    </span>
                                                </div>

                                                {/* Progress Bar */}
                                                {tasks.length > 0 && (
                                                    <div className="h-1 bg-white/10 rounded-full mb-4 overflow-hidden">
                                                        <div
                                                            className="h-full bg-green-500 transition-all duration-300"
                                                            style={{ width: `${(tasks.filter(t => t.completed).length / tasks.length) * 100}%` }}
                                                        />
                                                    </div>
                                                )}

                                                <div className="space-y-2 mb-3">
                                                    {tasks.map(task => (
                                                        <div key={task.id} className="flex items-center gap-3 group">
                                                            <button
                                                                onClick={() => handleToggleTask(task)}
                                                                className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${task.completed
                                                                    ? 'bg-green-500/20 border-green-500 text-green-500'
                                                                    : 'border-white/20 hover:border-white/40'
                                                                    }`}
                                                            >
                                                                {task.completed && <Check className="w-3 h-3" />}
                                                            </button>
                                                            <span
                                                                className={`flex-1 text-sm ${task.completed ? 'text-white/30 line-through' : 'text-white/80'}`}
                                                            >
                                                                {task.title}
                                                            </span>
                                                            <button
                                                                onClick={() => handleDeleteTask(task.id)}
                                                                className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500/10 hover:text-red-500 rounded transition-all"
                                                            >
                                                                <Trash2 className="w-3 h-3" />
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>

                                                <div className="flex gap-2">
                                                    <input
                                                        type="text"
                                                        value={newTaskTitle}
                                                        onChange={(e) => setNewTaskTitle(e.target.value)}
                                                        onKeyDown={(e) => e.key === 'Enter' && handleAddTask()}
                                                        placeholder="Add a task..."
                                                        className="flex-1 bg-white/5 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500/50 transition-all"
                                                        style={{ color: 'var(--snaps-text-primary)' }}
                                                    />
                                                    <button
                                                        onClick={handleAddTask}
                                                        disabled={!newTaskTitle.trim()}
                                                        className={`p-2 rounded-lg transition-all ${newTaskTitle.trim()
                                                            ? 'bg-blue-500 hover:bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                                                            : 'bg-white/5 text-white/20 cursor-not-allowed'
                                                            }`}
                                                    >
                                                        <Plus className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        )}

                                        {!initialData && (
                                            <div className="p-4 rounded-xl border border-dashed border-white/10 text-center text-sm text-white/40">
                                                Save the card to add tasks
                                            </div>
                                        )}
                                    </div>

                                    {/* Sidebar Right Column */}
                                    <div className="w-64 space-y-6">
                                        {/* AI Actions */}
                                        <div>
                                            <label className="block text-sm font-medium mb-2 text-white/50">AI Actions</label>
                                            <button
                                                className="w-full py-2 px-4 rounded-xl flex items-center justify-center gap-2 font-medium transition-all group overflow-hidden relative"
                                                style={{
                                                    background: 'linear-gradient(135deg, #00D4FF 0%, #A855F7 100%)',
                                                    boxShadow: '0 4px 20px rgba(168, 85, 247, 0.4)'
                                                }}
                                            >
                                                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                                                <Bot className="w-4 h-4" />
                                                <span>AI Execute Task</span>
                                            </button>
                                        </div>

                                        {/* Tags */}
                                        <div>
                                            <label className="block text-sm font-medium mb-2 text-white/50">Tags</label>
                                            <div className="flex flex-wrap gap-2 mb-2">
                                                {tags.map((tag, index) => (
                                                    <Tag key={tag} variant={tagVariants[index % tagVariants.length]}>
                                                        <Hash className="w-3 h-3" />
                                                        {tag}
                                                        <button onClick={() => removeTag(tag)} className="ml-1 hover:text-white"><X className="w-3 h-3" /></button>
                                                    </Tag>
                                                ))}
                                            </div>
                                            <div className="flex gap-2">
                                                <input
                                                    value={tagInput}
                                                    onChange={(e) => setTagInput(e.target.value)}
                                                    onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
                                                    placeholder="Add tag"
                                                    className="flex-1 bg-white/5 rounded-lg px-2 py-1 text-sm focus:outline-none"
                                                    style={{ color: 'var(--snaps-text-primary)' }}
                                                />
                                                <button onClick={handleAddTag} className="p-1 bg-white/10 rounded hover:bg-white/20"><Plus className="w-4 h-4" /></button>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Footer */}
                                <div className="p-6 border-t border-white/10 flex justify-end gap-3 shrink-0">
                                    <button
                                        onClick={onClose}
                                        className="px-6 py-2 rounded-xl text-white/60 hover:text-white hover:bg-white/5 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleSave}
                                        className="px-6 py-2 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-medium shadow-lg shadow-blue-500/25 transition-all"
                                    >
                                        {initialData ? 'Save Changes' : 'Create Card'}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </>
            )}
        </AnimatePresence>
    );
}
