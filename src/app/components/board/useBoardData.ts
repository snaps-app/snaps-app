import { useState, useEffect, useCallback } from 'react';
import api, { Card, Board, Epic, Sprint } from '@/services/api';
import { BOARD_COLORS } from '../board-constants';

export function useBoardData(projectId: string | undefined, boardId: string | undefined) {
  const [board, setBoard] = useState<Board | null>(null);
  const [tasks, setTasks] = useState<Card[]>([]);
  const [isLoadingBoard, setIsLoadingBoard] = useState(true);
  const [localBoardId, setLocalBoardId] = useState<string | null>(boardId || null);
  const [project, setProject] = useState<any>(null);
  const [epics, setEpics] = useState<Epic[]>([]);
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [initialState, setInitialState] = useState({ name: '', code: '', color: '', columns: [] as any[] });

  const fetchBoard = useCallback(async (id: string) => {
    try {
      const data = await api.getBoard(id);
      const columnsWithDefaults = (data.columns || []).map(col => {
        const s = col.id.toLowerCase();
        if (s === 'todo' || s === 'backlog' || col.title.toLowerCase() === 'to do' || col.title.toLowerCase() === 'backlog') return { ...col, color: BOARD_COLORS[0] };
        if (s === 'inprogress' || s === 'in_progress' || s === 'doing' || col.title.toLowerCase() === 'in progress') return { ...col, color: BOARD_COLORS[1] };
        if (s === 'assurance' || s === 'review' || col.title.toLowerCase() === 'assurance' || col.title.toLowerCase() === 'review') return { ...col, color: BOARD_COLORS[10] };
        if (s === 'done' || s === 'checked' || col.title.toLowerCase() === 'done') return { ...col, color: BOARD_COLORS[2] };
        return col;
      });
      setBoard({ ...data, columns: columnsWithDefaults });
      setInitialState({ 
        name: data.name, 
        code: data.code || '', 
        color: data.color || BOARD_COLORS[0], 
        columns: columnsWithDefaults 
      });
      setTasks(data.cards || []);
    } catch (error) { 
      console.error('Failed to fetch board:', error); 
    }
  }, []);

  useEffect(() => {
    let ignore = false;
    const initBoard = async () => {
      if (!projectId) return;
      setIsLoadingBoard(true);
      try {
        const [proj, boardData] = await Promise.all([
          api.getProject(projectId),
          boardId ? api.getBoard(boardId) : api.getProjectBoard(projectId)
        ]);

        if (ignore) return;

        setProject(proj);
        setLocalBoardId(boardData.id);
        
        const columnsWithDefaults = (boardData.columns || []).map(col => {
          const s = col.id.toLowerCase();
          if (s === 'todo' || s === 'backlog' || col.title.toLowerCase() === 'to do' || col.title.toLowerCase() === 'backlog') return { ...col, color: BOARD_COLORS[0] };
          if (s === 'inprogress' || s === 'in_progress' || s === 'doing' || col.title.toLowerCase() === 'in progress') return { ...col, color: BOARD_COLORS[1] };
          if (s === 'assurance' || s === 'review' || col.title.toLowerCase() === 'assurance' || col.title.toLowerCase() === 'review') return { ...col, color: BOARD_COLORS[10] };
          if (s === 'done' || s === 'checked' || col.title.toLowerCase() === 'done') return { ...col, color: BOARD_COLORS[2] };
          return col;
        });
        
        const finalCode = boardData.code || (proj.name && !boardData.id ? proj.name.substring(0, 3).toUpperCase() : '');
        let finalColor = boardData.color || (boardData.board_type === 'support' ? '#ef4444' : boardData.board_type === 'roadmap' ? '#3b82f6' : BOARD_COLORS[0]);
        
        setBoard({ ...boardData, columns: columnsWithDefaults });
        setInitialState({ name: boardData.name, code: finalCode, color: finalColor, columns: columnsWithDefaults });
        setTasks(boardData.cards || []);
      } catch (error) { 
        if (!ignore) console.error('Failed to initialize board view:', error); 
      } finally { 
        if (!ignore) setIsLoadingBoard(false); 
      }
      if (!ignore) {
        api.getEpics(projectId).then(setEpics);
        api.getSprints(projectId).then(setSprints);
      }
    };
    initBoard();
    return () => { ignore = true; };
  }, [boardId, projectId]);

  return {
    board, setBoard,
    tasks, setTasks,
    isLoadingBoard,
    localBoardId, setLocalBoardId,
    project,
    epics, setEpics,
    sprints, setSprints,
    initialState, setInitialState,
    fetchBoard
  };
}
