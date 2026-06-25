import { getProjectBoards } from '@/services/boards';
import { getAllCards, updateCard, updateCardStatus } from '@/services/cards';
import { getEpics } from '@/services/epics';
import { getProjects } from '@/services/projects';
import type { Board, Card, CardWithProject, Epic, Project } from '@/services/types';
import { useEffect, useState, useMemo } from 'react';
import { Filter, LayoutGrid } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { TouchBackend } from 'react-dnd-touch-backend';
import { BoardCard } from '@/app/components/shared/board-card';
import { NeuralBackground } from '@/app/components/shared/neural-background';
import { Plus } from 'lucide-react';
import { GlobalCardModal } from '@/app/components/modals/global-card-modal';
import { CardModal } from '@/app/components/modals/card-modal';

interface ColumnDef {
    id: string;
    title: string;
    color: string;
}

interface ColumnProps {
    column: ColumnDef;
    tasks: CardWithProject[];
    onMove: (taskId: string, newStatus: string) => void;
    onCardClick: (card: CardWithProject) => void;
}

// Default colors for well-known column IDs
const DEFAULT_COLUMN_COLORS: Record<string, string> = {
    'todo': '#A855F7',
    'inprogress': '#00D4FF',
    'done': '#22C55E',
};

function Column({ column, tasks, onMove, onCardClick }: ColumnProps) {
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
                            <CardWrapper
                                task={task}
                                boardColor={column.color}
                                onCardClick={onCardClick}
                            />
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
        </div>
    );
}

function CardWrapper({ task, boardColor, onCardClick }: { task: CardWithProject, boardColor: string, onCardClick: (card: CardWithProject) => void }) {
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
                onClick={() => onCardClick(task)}
                projectName={task.project_name}
                boardColor={task.board_color || boardColor}
                epic={task.epic_name ? { name: task.epic_name, color: task.epic_color || '#ccc' } : undefined}
            />
        </div>
    );
}

export function GlobalBoard() {
    const [tasks, setTasks] = useState<CardWithProject[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [columns, setColumns] = useState<ColumnDef[]>([]);
    const [selectedProjectId, setSelectedProjectId] = useState<string>('all');
    const [selectedEpicId, setSelectedEpicId] = useState<string>('all');
    const [isLoading, setIsLoading] = useState(true);
    const [isGlobalCardModalOpen, setIsGlobalCardModalOpen] = useState(false);
    const [editingCard, setEditingCard] = useState<CardWithProject | null>(null);
    const [editingEpics, setEditingEpics] = useState<Epic[]>([]);

    const fetchData = async () => {
        try {
            setIsLoading(true);
            const [allCards, allProjects] = await Promise.all([
                getAllCards(),
                getProjects()
            ]);

            // Fetch all boards to get their column definitions
            const boardsPromises = allProjects.map(p =>
                getProjectBoards(p.id).catch(() => [] as Board[])
            );
            const boardsResults = await Promise.all(boardsPromises);

            // Map to store column definitions per project for ID resolution
            const projectColMap: Record<string, Record<string, string>> = {};
            const allBoards: Board[] = [];
            const teamKanbanBoardIds = new Set<string>();

            boardsResults.forEach((boards, idx) => {
                const projectId = allProjects[idx].id;
                projectColMap[projectId] = {};
                boards.forEach(board => {
                    allBoards.push(board);
                    if (board.board_type === 'team_kanban') {
                        teamKanbanBoardIds.add(board.id);
                    }
                    (board.columns || []).forEach(col => {
                        projectColMap[projectId][col.title.toLowerCase()] = col.id;
                    });
                });
            });

            // Standard column mapping for unification
            const STANDARD_MAP: Record<string, string> = {
                'to do': 'todo',
                'in progress': 'inprogress',
                'done': 'done'
            };

            // Merge columns from all boards, deduplicated by canonical ID or title
            const columnMap = new Map<string, ColumnDef>();

            for (const board of allBoards) {
                for (const col of (board.columns || [])) {
                    const titleLower = col.title.toLowerCase();
                    const canonicalId = STANDARD_MAP[titleLower] || col.id;

                    if (!columnMap.has(canonicalId)) {
                        columnMap.set(canonicalId, {
                            id: canonicalId,
                            title: col.title,
                            color: col.color || DEFAULT_COLUMN_COLORS[canonicalId] || '#A855F7',
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

            // Filter to team_kanban boards only
            const teamKanbanCards = allCards.filter(c => teamKanbanBoardIds.has(c.board_id));

            // Normalize card statuses to canonical IDs
            const normalizedTasks = teamKanbanCards.map(task => {
                const projectIndex = allProjects.findIndex(p => p.id === task.project_id);
                const projectBoards = boardsResults[projectIndex] || [];

                // Find column title in task's own board
                let colTitle = '';
                let colId = (task.status as string);

                for (const b of projectBoards) {
                    const found = (b.columns || []).find(c => c.id === colId);
                    if (found) {
                        colTitle = found.title.toLowerCase();
                        break;
                    }
                }

                if (colTitle) {
                    const canonicalId = STANDARD_MAP[colTitle] || colId;
                    return { ...task, status: canonicalId as any };
                }

                // Fallback for stray statuses
                const statusLower = colId.toLowerCase();
                if (statusLower.includes('todo') || statusLower.includes('to do')) return { ...task, status: 'todo' as any };
                if (statusLower.includes('progress') || statusLower.includes('doing')) return { ...task, status: 'inprogress' as any };
                if (statusLower.includes('done')) return { ...task, status: 'done' as any };

                return task;
            });

            setTasks(normalizedTasks);
            setProjects(allProjects);
            const getOrderIndex = (col: ColumnDef) => {
                const t = col.title.toLowerCase();
                const i = col.id.toLowerCase();
                if (t === 'new issues' || i === 'new-issues') return 1;
                if (t === 'to do' || i === 'todo') return 2;
                if (t === 'in progress' || i === 'inprogress') return 3;
                if (t === 'done' || i === 'done') return 4;
                if (t === 'icebox' || i === 'icebox') return 5;
                return 99; // Other columns at the end
            };

            const sortedColumns = Array.from(columnMap.values()).sort((a, b) => {
                const indexA = getOrderIndex(a);
                const indexB = getOrderIndex(b);
                if (indexA !== indexB) return indexA - indexB;
                return a.title.localeCompare(b.title);
            });

            setColumns(sortedColumns);
        } catch (error) {
            console.error('Failed to fetch global data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleEditCard = async (card: CardWithProject) => {
        setEditingCard(card);
        try {
            const epics = await getEpics(card.project_id);
            setEditingEpics(epics);
        } catch (error) {
            console.error('Failed to fetch epics for project:', error);
            setEditingEpics([]);
        }
    };

    const handleSaveEditCard = async (cardData: Partial<Card>) => {
        if (!editingCard) return;
        try {
            await updateCard(editingCard.id, cardData);
            setEditingCard(null);
            fetchData();
        } catch (error) {
            console.error('Failed to update card:', error);
        }
    };

    const handleMove = async (taskId: string, newStatus: string) => {
        const task = tasks.find(t => t.id === taskId);
        if (!task) return;

        // Resolve canonical ID back to project-specific ID
        const targetTitle = columns.find(c => c.id === newStatus)?.title.toLowerCase();

        // Find all boards for this project again (or use a cached map)
        // We'll try to find a column in the project that matches the title of the target column
        let resolvedStatus = newStatus;

        try {
            const projectBoards = await getProjectBoards(task.project_id);
            for (const board of projectBoards) {
                const match = board.columns?.find(c => c.title.toLowerCase() === targetTitle);
                if (match) {
                    resolvedStatus = match.id;
                    break;
                }
            }
        } catch (e) {
            console.warn('Failed to resolve project-specific status, using canonical:', e);
        }

        // Optimistic update
        setTasks(prev => prev.map(t =>
            t.id === taskId ? { ...t, status: resolvedStatus as any } : t
        ));

        try {
            await updateCardStatus(taskId, resolvedStatus);
        } catch (error) {
            console.error('Failed to update task status:', error);
            fetchData(); // Revert/Refresh on error
        }
    };

    const filteredTasks = useMemo(() => {
        let filtered = tasks;
        if (selectedProjectId !== 'all') {
            filtered = filtered.filter(t => t.project_id === selectedProjectId);
        }
        if (selectedEpicId !== 'all') {
            filtered = filtered.filter(t => selectedEpicId === 'no_epic' ? !t.epic_id : t.epic_id === selectedEpicId);
        }

        const priorityOrder: Record<string, number> = { 'High': 3, 'Medium': 2, 'Low': 1 };
        return [...filtered].sort((a, b) => {
            const pA = priorityOrder[a.priority as string] || 0;
            const pB = priorityOrder[b.priority as string] || 0;
            if (pB !== pA) return pB - pA;

            const nameA = a.project_name || '';
            const nameB = b.project_name || '';
            return nameA.localeCompare(nameB);
        });
    }, [tasks, selectedProjectId, selectedEpicId]);

    const uniqueEpics = useMemo(() => {
        const epics = new Map<string, { id: string, name: string }>();
        tasks.forEach(t => {
            if (t.epic_id && t.epic_name) {
                epics.set(t.epic_id, { id: t.epic_id, name: t.epic_name });
            }
        });
        return Array.from(epics.values());
    }, [tasks]);

    return (
        <DndProvider backend={TouchBackend} options={{ enableMouseEvents: true }}>
            <div className="min-h-screen relative overflow-hidden" style={{ backgroundColor: 'var(--snaps-bg)' }}>
                <NeuralBackground />

                <div className="relative z-10 h-screen flex flex-col">
                    {/* Header */}
                    <motion.div
                        className="h-[100px] px-6 border-b border-white/10 backdrop-blur-[30px] flex flex-col justify-center flex-shrink-0"
                        style={{ backgroundColor: 'rgba(10, 10, 10, 0.6)' }}
                        initial={{ y: -20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ duration: 0.5 }}
                    >
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-6">


                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#00D4FF] to-[#A855F7] flex items-center justify-center shadow-lg shadow-blue-500/20">
                                        <LayoutGrid className="w-6 h-6 text-white" />
                                    </div>
                                    <div>
                                        <h1
                                            className="text-2xl font-bold mb-0"
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

                                <div className="relative">
                                    <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                                    <select
                                        value={selectedEpicId}
                                        onChange={(e) => setSelectedEpicId(e.target.value)}
                                        className="pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm focus:outline-none focus:border-[#00D4FF] transition-all appearance-none cursor-pointer min-w-[200px]"
                                        style={{ color: 'var(--snaps-text-primary)' }}
                                    >
                                        <option value="all">All Epics</option>
                                        <option value="no_epic">No Epic</option>
                                        {uniqueEpics.map(e => (
                                            <option key={e.id} value={e.id}>{e.name}</option>
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
                                        onCardClick={handleEditCard}
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

                <CardModal
                    isOpen={!!editingCard}
                    onClose={() => setEditingCard(null)}
                    onDelete={async () => {
                        setEditingCard(null);
                        fetchData();
                    }}
                    onSave={handleSaveEditCard}
                    initialData={editingCard}
                    epics={editingEpics}
                    columns={columns}
                />
            </div>
        </DndProvider>
    );
}
