import { useEffect, useState, useMemo } from 'react';
import { getProjectBoards } from '@/services/boards';
import { getAllCards, updateCard, updateCardStatus } from '@/services/cards';
import { getEpics } from '@/services/epics';
import { getProjects } from '@/services/projects';
import type { Board, Card, CardWithProject, Epic, Project } from '@/services/types';

export interface ColumnDef {
    id: string;
    title: string;
    color: string;
}

const DEFAULT_COLUMN_COLORS: Record<string, string> = {
    'todo': '#A855F7',
    'inprogress': '#00D4FF',
    'done': '#22C55E',
};

export function useGlobalBoard() {
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

            const boardsPromises = allProjects.map(p =>
                getProjectBoards(p.id).catch(() => [] as Board[])
            );
            const boardsResults = await Promise.all(boardsPromises);

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

            const STANDARD_MAP: Record<string, string> = {
                'to do': 'todo',
                'in progress': 'inprogress',
                'done': 'done'
            };

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

            if (columnMap.size === 0) {
                columnMap.set('todo', { id: 'todo', title: 'To Do', color: '#A855F7' });
                columnMap.set('inprogress', { id: 'inprogress', title: 'In Progress', color: '#00D4FF' });
                columnMap.set('done', { id: 'done', title: 'Done', color: '#22C55E' });
            }

            const teamKanbanCards = allCards.filter(c => teamKanbanBoardIds.has(c.board_id));

            const normalizedTasks = teamKanbanCards.map(task => {
                const projectIndex = allProjects.findIndex(p => p.id === task.project_id);
                const projectBoards = boardsResults[projectIndex] || [];

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
                return 99;
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

        const targetTitle = columns.find(c => c.id === newStatus)?.title.toLowerCase();
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

        setTasks(prev => prev.map(t =>
            t.id === taskId ? { ...t, status: resolvedStatus as any } : t
        ));

        try {
            await updateCardStatus(taskId, resolvedStatus);
        } catch (error) {
            console.error('Failed to update task status:', error);
            fetchData();
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

    return {
        tasks,
        projects,
        columns,
        selectedProjectId,
        setSelectedProjectId,
        selectedEpicId,
        setSelectedEpicId,
        isLoading,
        isGlobalCardModalOpen,
        setIsGlobalCardModalOpen,
        editingCard,
        setEditingCard,
        editingEpics,
        fetchData,
        handleEditCard,
        handleSaveEditCard,
        handleMove,
        filteredTasks,
        uniqueEpics
    };
}
