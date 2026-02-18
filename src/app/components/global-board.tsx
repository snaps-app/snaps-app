import { useEffect, useState, useMemo } from 'react';
import { ArrowLeft, Filter, LayoutGrid } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { BoardCard } from './board-card';
import { NeuralBackground } from './neural-background';
import api, { CardWithProject, Project, Board } from '@/services/api';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { GlobalCardModal } from './global-card-modal';

interface ColumnDef {
    id: string;
    title: string;
    color: string;
}

interface ColumnProps {
    column: ColumnDef;
    tasks: CardWithProject[];
    onMove: (taskId: string, newStatus: string) => void;
}

// Default colors for well-known column IDs
const DEFAULT_COLUMN_COLORS: Record<string, string> = {
    'todo': '#A855F7',
    'inprogress': '#00D4FF',
    'done': '#22C55E',
};

function Column({ column, tasks, onMove }: ColumnProps) {
    const [{ isOver }, drop] = useDrop(() => ({
        accept: 'TASK',
        drop: (item: { id: string; status: string }) => {
            if (item.status !== column.id) {
                onMove(item.id, column.id);
            }
        },
        collect: (monitor) => ({
            isOver: !!monitor.isOver()
        })
    }));

    // Convert hex to rgb for styling
    const hexToRgb = (hex: string) => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : '168, 85, 247';
    };

    const rgbColor = hexToRgb(column.color);

    return (
        <div
            ref={drop as any}
            className="flex-1 min-w-[300px]"
        >
            <div
                className="p-4 rounded-t-xl backdrop-blur-xl border-b-2 relative overflow-hidden"
                style={{
                    background: `rgba(${rgbColor}, 0.1)`,
                    borderColor: `rgba(${rgbColor}, 0.5)`,
                    boxShadow: `0 0 20px rgba(${rgbColor}, 0.3)`
                }}
            >
                <div className="relative z-10 flex items-center justify-between">
                    <h2
                        className="text-lg font-bold"
                        style={{
                            color: `rgb(${rgbColor})`,
                            textShadow: `0 0 10px rgba(${rgbColor}, 0.6)`
                        }}
                    >
                        {column.title}
                    </h2>
                    <span
                        className="text-sm px-2 py-1 rounded-full"
                        style={{
                            background: `rgba(${rgbColor}, 0.2)`,
                            color: `rgb(${rgbColor})`,
                            border: `1px solid rgba(${rgbColor}, 0.4)`
                        }}
                    >
                        {tasks.length}
                    </span>
                </div>
            </div>

            <div
                className="p-4 rounded-b-xl min-h-[500px] transition-all"
                style={{
                    background: isOver
                        ? `rgba(${rgbColor}, 0.08)`
                        : 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                    borderTop: 'none'
                }}
            >
                <AnimatePresence>
                    {tasks.map((task, index) => (
                        <motion.div
                            key={task.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            transition={{ duration: 0.3, delay: index * 0.05 }}
                        >
                            <CardWrapper task={task} boardColor={column.color} />
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
        </div>
    );
}

function CardWrapper({ task, boardColor }: { task: CardWithProject, boardColor: string }) {
    const [{ isDragging }, drag] = useDrag(() => ({
        type: 'TASK',
        item: { id: task.id, status: task.status },
        collect: (monitor) => ({
            isDragging: !!monitor.isDragging()
        })
    }));

    return (
        <div ref={drag as any} style={{ opacity: isDragging ? 0.5 : 1 }}>
            <BoardCard
                card={task}
                projectName={task.project_name}
                boardColor={task.board_color || boardColor}
            />
        </div>
    );
}

export function GlobalBoard() {
    const navigate = useNavigate();
    const [tasks, setTasks] = useState<CardWithProject[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [columns, setColumns] = useState<ColumnDef[]>([]);
    const [selectedProjectId, setSelectedProjectId] = useState<string>('all');
    const [isLoading, setIsLoading] = useState(true);
    const [isGlobalCardModalOpen, setIsGlobalCardModalOpen] = useState(false);

    const fetchData = async () => {
        try {
            setIsLoading(true);
            const [allCards, allProjects] = await Promise.all([
                api.getAllCards(),
                api.getProjects()
            ]);
            setTasks(allCards);
            setProjects(allProjects);

            // Fetch all boards to get their column definitions
            const boardsPromises = allProjects.map(p =>
                api.getProjectBoards(p.id).catch(() => [] as Board[])
            );
            const boardsResults = await Promise.all(boardsPromises);
            const allBoards = boardsResults.flat();

            // Merge columns from all boards, deduplicated by column id
            // Preserve order: first occurrence wins for title/color
            const columnMap = new Map<string, ColumnDef>();
            for (const board of allBoards) {
                for (const col of (board.columns || [])) {
                    if (!columnMap.has(col.id)) {
                        columnMap.set(col.id, {
                            id: col.id,
                            title: col.title,
                            color: col.color || DEFAULT_COLUMN_COLORS[col.id] || '#A855F7',
                        });
                    }
                }
            }

            // If no columns found from boards, fall back to defaults
            if (columnMap.size === 0) {
                columnMap.set('todo', { id: 'todo', title: 'To Do', color: '#A855F7' });
                columnMap.set('inprogress', { id: 'inprogress', title: 'In Progress', color: '#00D4FF' });
                columnMap.set('done', { id: 'done', title: 'Done', color: '#22C55E' });
            }

            setColumns(Array.from(columnMap.values()));
        } catch (error) {
            console.error('Failed to fetch global data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleMove = async (taskId: string, newStatus: string) => {
        // Optimistic update
        setTasks(prev => prev.map(task =>
            task.id === taskId ? { ...task, status: newStatus as any } : task
        ));

        try {
            await api.updateCardStatus(taskId, newStatus);
        } catch (error) {
            console.error('Failed to update task status:', error);
            fetchData(); // Revert/Refresh on error
        }
    };

    const filteredTasks = useMemo(() => {
        if (selectedProjectId === 'all') return tasks;
        return tasks.filter(t => t.project_id === selectedProjectId);
    }, [tasks, selectedProjectId]);

    return (
        <DndProvider backend={HTML5Backend}>
            <div className="min-h-screen relative overflow-hidden" style={{ backgroundColor: 'var(--snaps-bg)' }}>
                <NeuralBackground />

                <div className="relative z-10 h-screen flex flex-col">
                    {/* Header */}
                    <motion.div
                        className="p-6 border-b border-white/10 backdrop-blur-[30px]"
                        style={{ backgroundColor: 'rgba(10, 10, 10, 0.6)' }}
                        initial={{ y: -20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ duration: 0.5 }}
                    >
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-6">
                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => navigate('/')}
                                    className="w-10 h-10 rounded-xl backdrop-blur-xl flex items-center justify-center transition-all"
                                    style={{
                                        background: 'rgba(255, 255, 255, 0.05)',
                                        border: '1px solid rgba(255, 255, 255, 0.1)',
                                    }}
                                >
                                    <ArrowLeft className="w-5 h-5" style={{ color: 'var(--snaps-text-primary)' }} />
                                </motion.button>

                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#00D4FF] to-[#A855F7] flex items-center justify-center shadow-lg shadow-blue-500/20">
                                        <LayoutGrid className="w-6 h-6 text-white" />
                                    </div>
                                    <div>
                                        <h1
                                            className="text-2xl font-bold"
                                            style={{
                                                background: 'linear-gradient(135deg, #00D4FF 0%, #A855F7 100%)',
                                                WebkitBackgroundClip: 'text',
                                                WebkitTextFillColor: 'transparent',
                                                backgroundClip: 'text'
                                            }}
                                        >
                                            Global Board
                                        </h1>
                                        <p className="text-sm" style={{ color: 'var(--snaps-text-secondary)' }}>
                                            All project cards in one view
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Actions & Filter */}
                            <div className="flex items-center gap-4">
                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => setIsGlobalCardModalOpen(true)}
                                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold transition-all"
                                    style={{
                                        background: 'linear-gradient(135deg, #00D4FF 0%, #A855F7 100%)',
                                        boxShadow: '0 4px 15px rgba(0, 212, 255, 0.3)',
                                        color: 'white'
                                    }}
                                >
                                    <Plus className="w-5 h-5" />
                                    Novo Card
                                </motion.button>

                                <div className="relative">
                                    <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                                    <select
                                        value={selectedProjectId}
                                        onChange={(e) => setSelectedProjectId(e.target.value)}
                                        className="pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm focus:outline-none focus:border-[#00D4FF] transition-all appearance-none cursor-pointer min-w-[200px]"
                                        style={{ color: 'var(--snaps-text-primary)' }}
                                    >
                                        <option value="all">All Projects</option>
                                        {projects.map(p => (
                                            <option key={p.id} value={p.id}>{p.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>
                    </motion.div>

                    {/* Board Columns */}
                    <div className="flex-1 overflow-x-auto p-6">
                        {isLoading ? (
                            <div className="h-full flex items-center justify-center">
                                <motion.div
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                                    className="w-12 h-12 border-4 border-[#00D4FF] border-t-transparent rounded-full"
                                />
                            </div>
                        ) : (
                            <div className="flex gap-6 min-w-max">
                                {columns.map(col => (
                                    <Column
                                        key={col.id}
                                        column={col}
                                        tasks={filteredTasks.filter(t => (t.status as string) === col.id)}
                                        onMove={handleMove}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <GlobalCardModal
                    isOpen={isGlobalCardModalOpen}
                    onClose={() => setIsGlobalCardModalOpen(false)}
                    onCardCreated={fetchData}
                />
            </div>
        </DndProvider>
    );
}
