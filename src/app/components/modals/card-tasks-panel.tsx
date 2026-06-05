import React, { useState } from 'react';
import { Check, Plus, Trash2 } from 'lucide-react';
import type { Task, Card } from '@/services/types';

interface CardTasksPanelProps {
    initialData?: Card | null;
    tasks: Task[];
    onAddTask: (title: string) => Promise<void>;
    onToggleTask: (task: Task) => Promise<void>;
    onDeleteTask: (taskId: string) => Promise<void>;
}

export const CardTasksPanel: React.FC<CardTasksPanelProps> = ({
    initialData,
    tasks,
    onAddTask,
    onToggleTask,
    onDeleteTask,
}) => {
    const [newTaskTitle, setNewTaskTitle] = useState('');

    const handleAdd = async () => {
        if (!newTaskTitle.trim()) return;
        await onAddTask(newTaskTitle);
        setNewTaskTitle('');
    };

    if (!initialData) {
        return (
            <div className="p-4 rounded-xl border border-dashed border-white/10 text-center text-sm text-white/40">
                Save the card to add tasks
            </div>
        );
    }

    return (
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
                            onClick={() => onToggleTask(task)}
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
                            onClick={() => onDeleteTask(task.id)}
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
                    onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                    placeholder="Add a task..."
                    className="flex-1 bg-white/5 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500/50 transition-all"
                    style={{ color: 'var(--snaps-text-primary)' }}
                />
                <button
                    onClick={handleAdd}
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
    );
};
