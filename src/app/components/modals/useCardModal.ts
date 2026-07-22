import { useState, useEffect, useRef } from 'react';
import { getCard, deleteCard } from '@/services/cards';
import { createTask, deleteTask, updateTask } from '@/services/tasks';
import { uploadAttachment } from '@/services/storage';
import { formatToISODateOnly, parseDateForStorage } from '@/lib/date-utils';
import type { Card, Task } from '@/services/types';

interface UseCardModalProps {
    isOpen: boolean;
    initialData?: Card | null;
    safeColumns: { id: string; title: string }[];
    repoNames: string[];
    onSave: (cardData: Partial<Card>) => void;
    onClose: () => void;
    onDelete?: (cardId: string) => void;
}

export function useCardModal({
    isOpen,
    initialData,
    safeColumns,
    repoNames,
    onSave,
    onClose,
    onDelete,
}: UseCardModalProps) {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [status, setStatus] = useState<string>('todo');
    const [priority, setPriority] = useState<'Low' | 'Medium' | 'High'>('Medium');
    const [cardType, setCardType] = useState<any>('feature');
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
    const [descMode, setDescMode] = useState<'edit' | 'preview'>('edit');
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [tasks, setTasks] = useState<Task[]>([]);

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

    useEffect(() => {
        const loadData = async () => {
            if (isOpen) {
                if (initialData?.id) {
                    setIsLoading(true);
                    try {
                        const fullCard = await getCard(initialData.id);
                        setTitle(fullCard.title);
                        setDescription(fullCard.description || '');
                        setDescMode(fullCard.description ? 'preview' : 'edit');
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
                    setDescMode(initialData.description ? 'preview' : 'edit');
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
                    setTitle('');
                    setDescription('');
                    setDescMode('edit');
                    setStatus(safeColumns.length > 0 ? safeColumns[0].id : 'todo');
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

    const handleDelete = async () => {
        if (!initialData?.id) return;
        if (!window.confirm('Tem certeza que deseja excluir este card?')) return;

        setIsDeleting(true);
        try {
            await deleteCard(initialData.id);
            if (onDelete) {
                onDelete(initialData.id);
            }
            onClose();
        } catch (error) {
            console.error('Failed to delete card:', error);
            alert('Falha ao excluir card.');
        } finally {
            setIsDeleting(false);
        }
    };

    const handleSave = () => {
        if (title.trim()) {
            onSave({
                ...initialData,
                title,
                description,
                status,
                priority,
                card_type: cardType as any,
                due_date: parseDateForStorage(dueDate),
                epic_id: epicId || undefined,
                sprint_id: sprintId || undefined,
                repo_name: repoName || undefined,
                labels: tags,
                bdd_scenarios: bddScenarios,
                bdd_validated: bddValidated,
            });
            onClose();
        }
    };

    const handleUploadFiles = async (files: FileList | null) => {
        if (!files || files.length === 0) return;
        setIsUploading(true);
        try {
            const snippets: string[] = [];
            for (const file of Array.from(files)) {
                const { url } = await uploadAttachment(file);
                const isImg = file.type.startsWith('image/');
                snippets.push(isImg ? `![${file.name}](${url})` : `[${file.name}](${url})`);
            }
            const block = snippets.join('\n');
            setDescription(prev => (prev?.trim() ? `${prev}\n\n${block}` : block));
            setDescMode('preview');
        } catch (error) {
            console.error('Upload failed:', error);
            alert('Falha ao enviar anexo.');
        } finally {
            setIsUploading(false);
        }
    };

    const handleAddTask = async (taskTitle: string) => {
        if (!initialData?.id) return;
        try {
            const task = await createTask(initialData.id, taskTitle);
            setTasks([...tasks, task]);
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

    return {
        title,
        setTitle,
        description,
        setDescription,
        status,
        setStatus,
        priority,
        setPriority,
        cardType,
        setCardType,
        dueDate,
        setDueDate,
        tags,
        tagInput,
        setTagInput,
        epicId,
        setEpicId,
        sprintId,
        setSprintId,
        repoName,
        setRepoName,
        bddScenarios,
        setBddScenarios,
        bddValidated,
        setBddValidated,
        isWizardOpen,
        setIsWizardOpen,
        isLoading,
        descMode,
        setDescMode,
        isUploading,
        fileInputRef,
        isDeleting,
        tasks,
        handleDelete,
        handleSave,
        handleUploadFiles,
        handleAddTask,
        handleToggleTask,
        handleDeleteTask,
        handleAddTag,
        removeTag,
    };
}
