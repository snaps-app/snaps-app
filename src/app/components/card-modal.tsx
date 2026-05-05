import { useState, useEffect } from 'react';
import { X, Hash, Check, Plus, Trash2, Bot } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Tag } from './tag';
import { Card, Task, createTask, updateTask, deleteTask, Epic, Sprint, getCard } from '@/services/api';
import { formatToISODateOnly, parseDateForStorage } from '@/lib/date-utils';
import { ExecutionWizardModal } from './execution-wizard-modal';
import { Spinner } from './ui/spinner';

interface CardModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (cardData: Partial<Card>) => void;
    initialData?: Card | null;
    boardId?: string; // Needed if creating mostly? Or handled by parent
    epics?: Epic[];
    sprints?: Sprint[];
    columns?: { id: string; title: string }[];
    repoNames?: string[];
}

export function CardModal({ 
    isOpen, 
    onClose, 
    onSave, 
    initialData, 
    epics = [], 
    sprints = [], 
    columns, 
    repoNames = [] 
}: CardModalProps) {
    const safeColumns = columns || [];

    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [status, setStatus] = useState<string>('todo');
    const [priority, setPriority] = useState<'Low' | 'Medium' | 'High'>('Medium');
    const [cardType, setCardType] = useState<'feature' | 'bug' | 'support' | 'tech-debt'>('feature');
    const [dueDate, setDueDate] = useState('');
    const [tags, setTags] = useState<string[]>([]);
    const [tagInput, setTagInput] = useState('');
    const [epicId, setEpicId] = useState<string>('');
    const [sprintId, setSprintId] = useState<string>('');
    const [repoName, setRepoName] = useState<string>('');
    const [bddScenarios, setBddScenarios] = useState<any[]>([]);
    const [bddValidated, setBddValidated] = useState<boolean>(false);
    const [isWizardOpen, setIsWizardOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const tagVariants: Array<'blue' | 'orange' | 'purple' | 'green' | 'pink' | 'red' | 'yellow' | 'slate' | 'teal' | 'indigo' | 'lime' | 'rose' | 'sky' | 'fuchsia' | 'emerald' | 'amber'> =
        ['blue', 'orange', 'purple', 'green', 'pink', 'red', 'yellow', 'slate', 'teal', 'indigo', 'lime', 'rose', 'sky', 'fuchsia', 'emerald', 'amber'];

    // Tasks state
    const [tasks, setTasks] = useState<Task[]>([]);
    const [newTaskTitle, setNewTaskTitle] = useState('');

    const STATUS_ALIASES: Record<string, string[]> = {
        'backlog': ['backlog'],
        'planning': ['planning'],
        'todo': ['todo'],
        'in_progress': ['doing', 'in_progress', 'inprogress'],
        'assurance': ['assurance', 'review'],
        'done': ['done', 'checked']
    };

    const getEffectiveStatus = (s: string) => {
        const lower = s.toLowerCase();
        for (const [key, aliases] of Object.entries(STATUS_ALIASES)) {
            if (aliases.includes(lower)) return key;
        }
        return lower;
    };

    // Reset or load data when opening
    useEffect(() => {
        const loadData = async () => {
            if (isOpen) {
                if (initialData?.id) {
                    setIsLoading(true);
                    try {
                        const fullCard = await getCard(initialData.id);
                        setTitle(fullCard.title);
                        setDescription(fullCard.description || '');
                        setStatus(getEffectiveStatus(fullCard.status));
                        setPriority(fullCard.priority || 'Medium');
                        setCardType(fullCard.card_type || 'feature');
                        setDueDate(formatToISODateOnly(fullCard.due_date));
                        setTags(fullCard.labels || []);
                        setTasks(fullCard.tasks || []);
                        setEpicId(fullCard.epic_id || '');
                        setSprintId(fullCard.sprint_id || '');
                        setRepoName(fullCard.repo_name || '');
                        setBddScenarios(fullCard.bdd_scenarios || []);
                        setBddValidated(fullCard.bdd_validated || false);
                    } catch (error) {
                        console.error('Failed to fetch card details:', error);
                    } finally {
                        setIsLoading(false);
                    }
                } else if (initialData) {
                    setTitle(initialData.title);
                    setDescription(initialData.description || '');
                    setStatus(getEffectiveStatus(initialData.status));
                    setPriority(initialData.priority || 'Medium');
                    setCardType(initialData.card_type || 'feature');
                    setDueDate(formatToISODateOnly(initialData.due_date));
                    setTags(initialData.labels || []);
                    setTasks(initialData.tasks || []);
                    setEpicId(initialData.epic_id || '');
                    setSprintId(initialData.sprint_id || '');
                    setRepoName(initialData.repo_name || '');
                    setBddScenarios(initialData.bdd_scenarios || []);
                    setBddValidated(initialData.bdd_validated || false);
                } else {
                    // Reset for new card
                    setTitle('');
                    setDescription('');
                    setStatus(columns.length > 0 ? columns[0].id : 'todo');
                    setPriority('Medium');
                    setCardType('feature');
                    setDueDate('');
                    setTags([]);
                    setTasks([]);
                    setEpicId('');
                    setSprintId('');
                    setRepoName('');
                    setBddScenarios([]);
                    setBddValidated(false);
                }
            }
        };
        loadData();
    }, [isOpen, initialData, safeColumns, repoNames]);

    const handleSave = () => {
        if (title.trim()) {
            onSave({
                ...initialData,
                title,
                description,
                status,
                priority,
                card_type: cardType,
                due_date: parseDateForStorage(dueDate),
                epic_id: epicId || undefined,
                sprint_id: sprintId || undefined,
                repo_name: repoName || undefined,
                labels: tags,
                bdd_scenarios: bddScenarios,
                bdd_validated: bddValidated,
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

    const handleAddScenario = () => {
        setBddScenarios([...bddScenarios, { 
            id: crypto.randomUUID(), 
            title: 'New Scenario', 
            steps: [{ type: 'Given', content: '' }] 
        }]);
    };

    const updateScenario = (id: string, updates: any) => {
        setBddScenarios(bddScenarios.map(s => s.id === id ? { ...s, ...updates } : s));
    };

    const removeScenario = (id: string) => {
        setBddScenarios(bddScenarios.filter(s => s.id !== id));
    };

    const addStep = (scenarioId: string) => {
        setBddScenarios(bddScenarios.map(s => {
            if (s.id === scenarioId) {
                return { ...s, steps: [...s.steps, { type: 'And', content: '' }] };
            }
            return s;
        }));
    };

    const updateStep = (scenarioId: string, stepIndex: number, updates: any) => {
        setBddScenarios(bddScenarios.map(s => {
            if (s.id === scenarioId) {
                const newSteps = [...s.steps];
                newSteps[stepIndex] = { ...newSteps[stepIndex], ...updates };
                return { ...s, steps: newSteps };
            }
            return s;
        }));
    };

    const removeStep = (scenarioId: string, stepIndex: number) => {
        setBddScenarios(bddScenarios.map(s => {
            if (s.id === scenarioId) {
                const newSteps = s.steps.filter((_: any, i: number) => i !== stepIndex);
                return { ...s, steps: newSteps };
            }
            return s;
        }));
    };


    return (
    <>
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

                                {/* Content */}
                                <div className="flex-1 overflow-y-auto p-6 flex gap-8 relative min-h-[400px]">
                                    {isLoading ? (
                                        <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-sm z-10">
                                            <Spinner size="lg" />
                                        </div>
                                    ) : (
                                        <>
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
                                                            <span className="text-[10px] opacity-70 font-mono w-6 text-center border border-white/20 bg-white/10 rounded px-1 flex-shrink-0 text-white/90">
                                                                {task.code ? task.code.replace(initialData?.code || '', '') : '-'}
                                                            </span>
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

                                        {/* BDD Criteria Section */}
                                        {cardType === 'feature' && (
                                            <div className="pt-6 border-t border-white/5 space-y-4">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <Bot className="w-5 h-5 text-purple-400" />
                                                        <label className="text-sm font-semibold text-white/70 uppercase tracking-wider">BDD Specifications</label>
                                                        {bddValidated && (
                                                            <motion.span
                                                                initial={{ scale: 0 }}
                                                                animate={{ scale: 1 }}
                                                                className="px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 text-[10px] font-black uppercase border border-green-500/30 shadow-[0_0_10px_rgba(34,197,94,0.3)]"
                                                            >
                                                                Validated
                                                            </motion.span>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        {bddScenarios.length > 0 && (
                                                            <button
                                                                onClick={() => setBddValidated(!bddValidated)}
                                                                className={`flex items-center gap-1 text-xs font-bold transition-all px-3 py-1 rounded-lg border ${
                                                                    bddValidated 
                                                                    ? 'bg-green-500/20 border-green-500/50 text-green-400 shadow-[0_0_15px_rgba(34,197,94,0.2)]' 
                                                                    : 'bg-white/5 border-white/10 text-white/40 hover:text-white/70'
                                                                }`}
                                                            >
                                                                <Check className={`w-3.5 h-3.5 ${bddValidated ? 'text-green-400' : 'text-white/20'}`} />
                                                                {bddValidated ? 'Validated' : 'Validate BDDs'}
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={handleAddScenario}
                                                            className="flex items-center gap-1 text-xs font-medium text-blue-400 hover:text-blue-300 transition-colors px-2 py-1 rounded bg-blue-400/10"
                                                        >
                                                            <Plus className="w-3 h-3" />
                                                            Add Scenario
                                                        </button>
                                                    </div>
                                                </div>

                                                <div className="space-y-4">
                                                    <AnimatePresence>
                                                        {bddScenarios.map((scenario) => (
                                                            <motion.div
                                                                key={scenario.id}
                                                                initial={{ opacity: 0, x: -20 }}
                                                                animate={{ opacity: 1, x: 0 }}
                                                                exit={{ opacity: 0, x: 20 }}
                                                                className="p-4 rounded-xl bg-white/5 border border-white/10 relative group/scenario"
                                                            >
                                                                <button
                                                                    onClick={() => removeScenario(scenario.id)}
                                                                    className="absolute top-2 right-2 opacity-0 group-hover/scenario:opacity-100 p-1 hover:bg-red-500/10 hover:text-red-500 rounded transition-all"
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                </button>

                                                                <input
                                                                    type="text"
                                                                    value={scenario.title}
                                                                    onChange={(e) => updateScenario(scenario.id, { title: e.target.value })}
                                                                    placeholder="Scenario Title"
                                                                    className="bg-transparent border-none text-md font-bold focus:outline-none mb-4 w-full text-white/90"
                                                                />

                                                                <div className="space-y-3">
                                                                    {scenario.steps?.map((step: any, sIdx: number) => (
                                                                        <div key={sIdx} className="flex gap-2 group/step">
                                                                            <select
                                                                                value={step.type}
                                                                                onChange={(e) => updateStep(scenario.id, sIdx, { type: e.target.value })}
                                                                                className="bg-transparent border border-white/10 rounded px-1.5 py-1 text-xs font-bold focus:outline-none shrink-0 text-purple-400 appearance-none text-center min-w-[70px]"
                                                                            >
                                                                                <option value="Given">GIVEN</option>
                                                                                <option value="When">WHEN</option>
                                                                                <option value="Then">THEN</option>
                                                                                <option value="And">AND</option>
                                                                                <option value="But">BUT</option>
                                                                            </select>
                                                                            <input
                                                                                type="text"
                                                                                value={step.content}
                                                                                onChange={(e) => updateStep(scenario.id, sIdx, { content: e.target.value })}
                                                                                placeholder="..."
                                                                                className="flex-1 bg-white/5 border border-white/5 rounded px-3 py-1 text-sm text-white/80 focus:outline-none focus:border-white/20 transition-all"
                                                                            />
                                                                            <button
                                                                                onClick={() => removeStep(scenario.id, sIdx)}
                                                                                className="opacity-0 group-hover/step:opacity-100 p-1 hover:bg-red-500/10 hover:text-red-500 rounded transition-all"
                                                                            >
                                                                                <Trash2 className="w-3 h-3" />
                                                                            </button>
                                                                        </div>
                                                                    ))}
                                                                    <button
                                                                        onClick={() => addStep(scenario.id)}
                                                                        className="w-full py-1 border border-dashed border-white/10 rounded-lg text-[10px] text-white/30 hover:border-white/20 hover:text-white/50 transition-all uppercase font-bold tracking-widest"
                                                                    >
                                                                        + Add Step
                                                                    </button>
                                                                </div>
                                                            </motion.div>
                                                        ))}
                                                    </AnimatePresence>
                                                    {bddScenarios.length === 0 && (
                                                        <div className="text-center py-6 px-4 border border-dashed border-white/10 rounded-xl text-white/20 text-xs">
                                                            No BDD scenarios defined yet. Use BDD to guide the agent's work.
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Sidebar Right Column */}
                                    <div className="w-64 space-y-6">
                                        {/* AI Actions */}
                                        <div>
                                            <label className="block text-sm font-medium mb-2 text-white/50">AI Actions</label>
                                            <button
                                                onClick={() => initialData?.id && setIsWizardOpen(true)}
                                                disabled={!initialData?.id}
                                                className="w-full py-2 px-4 rounded-xl flex items-center justify-center gap-2 font-medium transition-all group overflow-hidden relative disabled:opacity-40 disabled:cursor-not-allowed"
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

                                        {/* Properties */}
                                        <div className="space-y-4 pt-4 border-t border-white/10">
                                            <div>
                                                <label className="block text-xs font-medium mb-1 text-white/40 uppercase tracking-wider">Epic</label>
                                                <select
                                                    value={epicId}
                                                    onChange={(e) => setEpicId(e.target.value)}
                                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500/50"
                                                    style={{ color: 'var(--snaps-text-primary)' }}
                                                >
                                                    <option value="">No Epic</option>
                                                    {epics.map(epic => (
                                                        <option key={epic.id} value={epic.id}>{epic.name}</option>
                                                    ))}
                                                </select>
                                            </div>

                                            <div>
                                                <label className="block text-xs font-medium mb-1 text-white/40 uppercase tracking-wider">Sprint</label>
                                                <select
                                                    value={sprintId}
                                                    onChange={(e) => setSprintId(e.target.value)}
                                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500/50"
                                                    style={{ color: 'var(--snaps-text-primary)' }}
                                                >
                                                    <option value="">No Sprint</option>
                                                    {sprints.map(sprint => (
                                                        <option key={sprint.id} value={sprint.id}>{sprint.name}</option>
                                                    ))}
                                                </select>
                                            </div>

                                            <div>
                                                <label className="block text-xs font-medium mb-1 text-white/40 uppercase tracking-wider">Repository</label>
                                                <select
                                                    value={repoName}
                                                    onChange={(e) => setRepoName(e.target.value)}
                                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500/50"
                                                    style={{ color: 'var(--snaps-text-primary)' }}
                                                >
                                                    <option value="">Default (First Repo)</option>
                                                    {repoNames?.map(repo => (
                                                        <option key={repo} value={repo}>{repo}</option>
                                                    ))}
                                                </select>
                                                {repoNames?.length === 0 && (
                                                    <div className="text-[10px] text-yellow-500/70 mt-1">Configure GitHub integration in project settings.</div>
                                                )}
                                            </div>

                                            <div>
                                                <label className="block text-xs font-medium mb-1 text-white/40 uppercase tracking-wider">Due Date</label>
                                                <input
                                                    type="date"
                                                    value={dueDate}
                                                    onChange={(e) => setDueDate(e.target.value)}
                                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500/50"
                                                    style={{ color: 'var(--snaps-text-secondary)', colorScheme: 'dark' }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </>
                                )}
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

        {initialData?.id && (
            <ExecutionWizardModal
                isOpen={isWizardOpen}
                onClose={() => setIsWizardOpen(false)}
                entityId={initialData.id}
                entityType="card"
                entityTitle={initialData.title}
            />
        )}
    </>
    );
}
