import React, { useState, useEffect, useMemo } from 'react';
import { Settings, ArrowLeft, Plus, Check, Palette, FolderOpen, Upload, Bot, X, Send, Layers, Globe, Edit2, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { TouchBackend } from 'react-dnd-touch-backend';
import { NeuralBackground } from './neural-background';
import { CardModal } from './card-modal';
import { BoardCard } from './board-card';
import api, { Card, Board, Epic } from '@/services/api';
import { useParams, useNavigate } from 'react-router-dom';

const BOARD_COLORS = [
  '#A855F7', // Purple
  '#00D4FF', // Blue
  '#22C55E', // Green
  '#FF6B35', // Orange
  '#EF4444', // Red
  '#EC4899', // Pink
  '#F59E0B', // Yellow
  '#64748B', // Slate
  '#14B8A6', // Teal
  '#6366F1', // Indigo
  '#84CC16', // Lime
  '#F43F5E', // Rose
  '#0EA5E9', // Sky
  '#D946EF', // Fuchsia
  '#10B981', // Emerald
  '#D97706'  // Amber
];

interface ColumnProps {
  title: string;
  status: string;
  tasks: Card[];
  onMove: (taskId: string, newStatus: string) => void;
  onCardClick: (card: Card) => void;
  onTitleChange: (newTitle: string) => void;
  onColorChange: (newColor: string) => void;
  onMoveColumn: (dragIndex: number, hoverIndex: number) => void;
  index: number;
  color: string;
  epics: Epic[];
  boardColor: string;
}

function Column({
  title,
  status,
  tasks,
  onMove,
  onCardClick,
  onTitleChange,
  onColorChange,
  onMoveColumn,
  index,
  color,
  epics,
  boardColor
}: ColumnProps) {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState(title);
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);

  const [{ isOver }, dropCard] = useDrop(() => ({
    accept: 'TASK',
    drop: (item: { id: string; status: string }) => {
      if (item.status !== status) {
        onMove(item.id, status);
      }
    },
    collect: (monitor) => ({
      isOver: !!monitor.isOver()
    })
  }));

  const [, dragColumn] = useDrag({
    type: 'COLUMN',
    item: { index },
  });

  const [, dropColumn] = useDrop({
    accept: 'COLUMN',
    hover(item: { index: number }) {
      if (item.index !== index) {
        onMoveColumn(item.index, index);
        item.index = index;
      }
    },
  });

  // Convert hex to rgb for styling
  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : '168, 85, 247';
  };

  const rgbColor = hexToRgb(color);

  return (
    <div
      ref={(node) => {
        dropCard(dropColumn(node));
      }}
      className="flex-1 min-w-[300px]"
    >
      <div
        ref={dragColumn as any}
        className="p-4 rounded-t-xl backdrop-blur-xl border-b-2 relative cursor-move group"
        style={{
          background: `rgba(${rgbColor}, 0.1)`,
          borderColor: `rgba(${rgbColor}, 0.5)`,
          boxShadow: `0 0 20px rgba(${rgbColor}, 0.3)`
        }}
      >
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-2 flex-1 mr-2">
            {isEditingTitle ? (
              <input
                autoFocus
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
                onBlur={() => {
                  setIsEditingTitle(false);
                  if (editedTitle.trim() && editedTitle !== title) {
                    onTitleChange(editedTitle);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    setIsEditingTitle(false);
                    if (editedTitle.trim() && editedTitle !== title) {
                      onTitleChange(editedTitle);
                    }
                  }
                }}
                className="bg-transparent border-none text-lg font-bold focus:outline-none w-full"
                style={{ color: `rgb(${rgbColor})` }}
              />
            ) : (
              <h2
                onClick={() => setIsEditingTitle(true)}
                className="text-lg font-bold cursor-pointer hover:opacity-80 transition-opacity truncate"
                style={{
                  color: `rgb(${rgbColor})`,
                  textShadow: `0 0 10px rgba(${rgbColor}, 0.6)`
                }}
              >
                {title}
              </h2>
            )}
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <button
                onClick={() => setIsColorPickerOpen(!isColorPickerOpen)}
                className="p-1.5 rounded-lg hover:bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ color: `rgb(${rgbColor})` }}
              >
                <Palette className="w-4 h-4" />
              </button>

              <AnimatePresence>
                {isColorPickerOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsColorPickerOpen(false)} />
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: 10 }}
                      className="absolute top-full right-0 mt-2 p-2 bg-[#0A0A0A] border border-white/10 rounded-xl shadow-2xl z-50 grid grid-cols-4 gap-2 min-w-[120px]"
                    >
                      {BOARD_COLORS.map(c => (
                        <button
                          key={c}
                          onClick={() => {
                            onColorChange(c);
                            setIsColorPickerOpen(false);
                          }}
                          className="w-6 h-6 rounded-full border border-white/20 transition-transform hover:scale-110"
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

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
                onCardClick={onCardClick}
                boardColor={boardColor}
                epic={epics.find(e => e.id === task.epic_id)}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

function CardWrapper({ task, onCardClick, boardColor, epic }: { task: Card, onCardClick: (card: Card) => void, boardColor: string, epic?: Epic }) {
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
        onClick={onCardClick}
        boardColor={boardColor}
        epic={epic}
      />
    </div>
  );
}

export function BoardView() {
  const { projectId, boardId } = useParams<{ projectId: string, boardId: string }>();
  const navigate = useNavigate();

  const [board, setBoard] = useState<Board | null>(null);
  const [tasks, setTasks] = useState<Card[]>([]);
  // Use local state for current board ID if created
  const [localBoardId, setLocalBoardId] = useState<string | null>(boardId || null);

  const [boardName, setBoardName] = useState('');
  const [boardCode, setBoardCode] = useState('');
  const [boardColor, setBoardColor] = useState(BOARD_COLORS[0]);
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
  const [project, setProject] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [initialState, setInitialState] = useState({ name: '', code: '', color: '', columns: [] as any[] });

  const isDirty = boardName !== initialState.name ||
    boardCode !== initialState.code ||
    boardColor !== initialState.color ||
    JSON.stringify(board?.columns) !== JSON.stringify(initialState.columns);

  // Card Modal State
  const [isCardModalOpen, setIsCardModalOpen] = useState(false);
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);

  // Planner State
  const [isPlannerOpen, setIsPlannerOpen] = useState(false);
  const [plannerInput, setPlannerInput] = useState('');

  // Bulk Apply State
  const [isBulkApplyOpen, setIsBulkApplyOpen] = useState(false);
  const [allBoards, setAllBoards] = useState<any[]>([]);
  const [selectedBoardIds, setSelectedBoardIds] = useState<Set<string>>(new Set());
  const [isBulkSaving, setIsBulkSaving] = useState(false);
  const [isLoadingBoards, setIsLoadingBoards] = useState(false);

  const [epics, setEpics] = useState<Epic[]>([]);
  const [selectedEpicId, setSelectedEpicId] = useState<string | null>(null);
  const [isEpicModalOpen, setIsEpicModalOpen] = useState(false);
  const [editingEpicId, setEditingEpicId] = useState<string | null>(null);
  const [isCreatingEpic, setIsCreatingEpic] = useState(false);
  const [isCreatingEpicUtils, setIsCreatingEpicUtils] = useState(false);
  const [epicNameInput, setEpicNameInput] = useState('');
  const [epicColorInput, setEpicColorInput] = useState(BOARD_COLORS[0]);

  const handleCreateCard = () => {
    setSelectedCard(null);
    setIsCardModalOpen(true);
  };

  const fetchBoard = async (id: string) => {
    try {
      const data = await api.getBoard(id);

      // Inject default colors for standard columns if they don't have them
      const columnsWithDefaults = (data.columns || []).map(col => {
        if (!col.color) {
          if (col.id === 'todo' || col.title.toLowerCase() === 'to do') return { ...col, color: BOARD_COLORS[0] };
          if (col.id === 'inprogress' || col.title.toLowerCase() === 'in progress') return { ...col, color: BOARD_COLORS[1] };
          if (col.id === 'done' || col.title.toLowerCase() === 'done') return { ...col, color: BOARD_COLORS[2] };
        }
        return col;
      });

      setBoard({ ...data, columns: columnsWithDefaults });
      setBoardName(data.name);
      setBoardCode(data.code || '');
      setBoardColor(data.color || BOARD_COLORS[0]);
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
  };

  const fetchEpics = async (pid: string) => {
    try {
      const data = await api.getEpics(pid);
      setEpics(data);
    } catch (error) {
      console.error('Failed to fetch epics:', error);
    }
  };

  useEffect(() => {
    const initBoard = async () => {
      if (!projectId) return;

      try {
        // 1. Fetch Project Data first
        const proj = await api.getProject(projectId);
        setProject(proj);

        // 2. Fetch Board Data
        let boardData: Board;
        if (boardId) {
          boardData = await api.getBoard(boardId);
          setLocalBoardId(boardId);
        } else {
          boardData = await api.getProjectBoard(projectId);
          setLocalBoardId(boardData.id);
        }

        // 3. Process Board Data
        const columnsWithDefaults = (boardData.columns || []).map(col => {
          if (!col.color) {
            if (col.id === 'todo' || col.title.toLowerCase() === 'to do') return { ...col, color: BOARD_COLORS[0] };
            if (col.id === 'inprogress' || col.title.toLowerCase() === 'in progress') return { ...col, color: BOARD_COLORS[1] };
            if (col.id === 'done' || col.title.toLowerCase() === 'done') return { ...col, color: BOARD_COLORS[2] };
          }
          return col;
        });

        // Use existing code from database, or suggestion ONLY if it's missing and it's a new board
        const finalCode = boardData.code || (proj.name && !boardData.id ? proj.name.substring(0, 3).toUpperCase() : '');

        setBoard({ ...boardData, columns: columnsWithDefaults });
        setBoardName(boardData.name);
        setBoardCode(finalCode);
        setBoardColor(boardData.color || BOARD_COLORS[0]);
        setInitialState({
          name: boardData.name,
          code: finalCode,
          color: boardData.color || BOARD_COLORS[0],
          columns: columnsWithDefaults
        });
        setTasks(boardData.cards || []);

      } catch (error) {
        console.error('Failed to initialize board view:', error);
        // Fallback for missing/error
        setBoardName('Main Board');
        setBoardColor(BOARD_COLORS[0]);
        setInitialState({ name: 'Main Board', code: '', color: BOARD_COLORS[0], columns: [] });
        setTasks([]);
      }

      fetchEpics(projectId);
    };

    initBoard();
  }, [boardId, projectId]);



  const handleCreateEpic = async () => {
    if (!projectId || !epicNameInput.trim() || isCreatingEpicUtils) return;
    setIsCreatingEpicUtils(true);
    try {
      await api.createEpic(projectId, {
        name: epicNameInput,
        color: epicColorInput,
        project_id: projectId
      });
      setIsCreatingEpic(false);
      setEpicNameInput('');
      setEpicColorInput(BOARD_COLORS[0]);
      fetchEpics(projectId);
    } catch (error) {
      console.error('Failed to create epic:', error);
    } finally {
      setIsCreatingEpicUtils(false);
    }
  };

  const handleDeleteEpic = async (epicId: string) => {
    if (!confirm('Are you sure you want to delete this epic? This will remove the epic from all associated cards.')) return;
    try {
      await api.deleteEpic(epicId);
      if (editingEpicId === epicId) {
        setEditingEpicId(null);
        setEpicNameInput('');
      }
      fetchEpics(projectId!);
      // Refresh board to reflect removed epic associations on cards
      if (boardId) {
        fetchBoard(boardId);
      }
    } catch (error) {
      console.error('Failed to delete epic:', error);
    }
  };

  const handleUpdateEpic = async (epicId: string) => {
    if (!epicNameInput.trim()) return;
    try {
      await api.updateEpic(epicId, {
        name: epicNameInput,
        color: epicColorInput
      });
      setEditingEpicId(null);
      setEpicNameInput('');
      fetchEpics(projectId!);
    } catch (error) {
      console.error('Failed to update epic:', error);
    }
  };

  const startEditingEpic = (epic: Epic) => {
    setEditingEpicId(epic.id);
    setEpicNameInput(epic.name);
    setEpicColorInput(epic.color);
    setIsCreatingEpic(false);
  };

  const startCreatingEpic = () => {
    setIsCreatingEpic(true);
    setEditingEpicId(null);
    setEpicNameInput('');
    setEpicColorInput(BOARD_COLORS[0]);
  };

  const handleSaveBoard = async () => {
    if (!projectId) return;
    setIsSaving(true);
    try {
      const columnsToSave = board?.columns || [];
      if (localBoardId) {
        // Update existing board
        const updated = await api.updateBoard(localBoardId, {
          name: boardName,
          code: boardCode,
          color: boardColor,
          columns: columnsToSave
        });
        setBoard(updated);
        setInitialState({
          name: boardName,
          code: boardCode,
          color: boardColor,
          columns: updated.columns || []
        });
      } else {
        // Create new board
        const newBoard = await api.createBoard(projectId, {
          name: boardName,
          code: boardCode,
          color: boardColor,
          columns: [
            { id: "todo", title: "To Do", color: BOARD_COLORS[0] },
            { id: "inprogress", title: "In Progress", color: BOARD_COLORS[1] },
            { id: "done", title: "Done", color: BOARD_COLORS[2] }
          ]
        });
        setLocalBoardId(newBoard.id);
        const updatedWithDefaults = {
          ...newBoard,
          columns: newBoard.columns?.map(col => {
            if (col.id === 'todo') return { ...col, color: BOARD_COLORS[0] };
            if (col.id === 'inprogress') return { ...col, color: BOARD_COLORS[1] };
            if (col.id === 'done') return { ...col, color: BOARD_COLORS[2] };
            return col;
          })
        };
        setBoard(updatedWithDefaults);
        setInitialState({
          name: newBoard.name,
          code: boardCode,
          color: newBoard.color || BOARD_COLORS[0],
          columns: updatedWithDefaults.columns || []
        });
        navigate(`/project/${projectId}/board/${newBoard.id}`, { replace: true });
      }
    } catch (error) {
      console.error('Failed to save board:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenBulkApply = async () => {
    setIsBulkApplyOpen(true);
    setIsLoadingBoards(true);
    try {
      const projects = await api.getProjects();
      const boardsPromises = projects.map(async p => {
        try {
          const boards = await api.getProjectBoards(p.id);
          return boards.map(b => ({ ...b, projectName: p.name }));
        } catch {
          return [];
        }
      });
      const results = await Promise.all(boardsPromises);
      const flatBoards = results.flat().filter(b => b.id !== localBoardId); // Exclude current board
      setAllBoards(flatBoards);
    } catch (error) {
      console.error('Failed to load boards for bulk apply:', error);
    } finally {
      setIsLoadingBoards(false);
    }
  };

  const handleBulkApplyConfirm = async () => {
    if (!board?.columns) return;
    setIsBulkSaving(true);
    try {
      // First save current board if dirty
      if (isDirty) {
        await handleSaveBoard();
      }

      // Then apply to others
      const updates = Array.from(selectedBoardIds).map(id =>
        api.updateBoard(id, { columns: board.columns })
      );
      await Promise.all(updates);

      setIsBulkApplyOpen(false);
      setSelectedBoardIds(new Set());
      // Optional: Show success toast
    } catch (error) {
      console.error('Failed to bulk apply:', error);
    } finally {
      setIsBulkSaving(false);
    }
  };

  const toggleBoardSelection = (id: string) => {
    const newSelected = new Set(selectedBoardIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedBoardIds(newSelected);
  };

  const [isAddingColumn, setIsAddingColumn] = useState(false);
  const [newColumnTitle, setNewColumnTitle] = useState('');
  const [newColumnColor, setNewColumnColor] = useState(BOARD_COLORS[0]);

  const handleAddField = () => {
    setIsAddingColumn(true);
    setNewColumnTitle('');
    setNewColumnColor(boardColor);
  };

  const handleConfirmAddColumn = () => {
    if (!board || !newColumnTitle.trim()) {
      setIsAddingColumn(false);
      return;
    }

    const newColumns = [
      ...(board.columns || []),
      {
        id: newColumnTitle.toLowerCase().replace(/\s+/g, '-'),
        title: newColumnTitle,
        color: newColumnColor
      }
    ];

    const updatedBoard = { ...board, columns: newColumns };
    setBoard(updatedBoard);
    setIsAddingColumn(false);
  };

  const handleUpdateColumnTitle = (colId: string, newTitle: string) => {
    if (!board) return;
    const newColumns = (board.columns || []).map(col =>
      col.id === colId ? { ...col, title: newTitle } : col
    );
    setBoard({ ...board, columns: newColumns });
  };

  const handleUpdateColumnColor = (colId: string, newColor: string) => {
    if (!board) return;
    const newColumns = (board.columns || []).map(col =>
      col.id === colId ? { ...col, color: newColor } : col
    );
    setBoard({ ...board, columns: newColumns });
  };

  const handleMoveColumn = (dragIndex: number, hoverIndex: number) => {
    if (!board || !board.columns) return;
    const newColumns = [...board.columns];
    const draggedColumn = newColumns[dragIndex];
    newColumns.splice(dragIndex, 1);
    newColumns.splice(hoverIndex, 0, draggedColumn);
    setBoard({ ...board, columns: newColumns });
  };

  const handleMove = async (taskId: string, newStatus: string) => {
    setTasks(prev => prev.map(task =>
      task.id === taskId ? { ...task, status: newStatus as any } : task
    ));

    try {
      await api.updateCardStatus(taskId, newStatus);
    } catch (error) {
      console.error('Failed to update task status:', error);
      if (localBoardId) fetchBoard(localBoardId);
    }
  };


  const handleEditCard = (card: Card) => {
    setSelectedCard(card);
    setIsCardModalOpen(true);
  };

  const handleSaveCard = async (cardData: Partial<Card>) => {
    if (!localBoardId) return;
    try {
      if (selectedCard) {
        await api.updateCard(selectedCard.id, cardData);
      } else {
        if (cardData.title && cardData.status) {
          await api.createCard(localBoardId, {
            title: cardData.title,
            description: cardData.description || '',
            status: cardData.status,
            priority: cardData.priority,
            due_date: cardData.due_date,
            labels: cardData.labels,
            epic_id: cardData.epic_id
          });
        }
      }
      setIsCardModalOpen(false);
      fetchBoard(localBoardId);
    } catch (error) {
      console.error("Failed to save card:", error);
    }
  };

  const columns = board?.columns || [];

  const priorityOrder: Record<string, number> = { 'High': 3, 'Medium': 2, 'Low': 1 };

  const filteredAndSortedTasks = useMemo(() => {
    let result = selectedEpicId
      ? tasks.filter(t => selectedEpicId === 'no_epic' ? !t.epic_id : t.epic_id === selectedEpicId)
      : tasks;

    return [...result].sort((a, b) => {
      const pA = priorityOrder[a.priority as string] || 0;
      const pB = priorityOrder[b.priority as string] || 0;
      return pB - pA;
    });
  }, [tasks, selectedEpicId]);

  return (
    <DndProvider backend={TouchBackend} options={{ enableMouseEvents: true }}>
      <div className="min-h-screen relative overflow-hidden" style={{ backgroundColor: 'var(--snaps-bg)' }}>
        <NeuralBackground />

        <div className="relative z-10 h-screen flex flex-col">
          {/* Header */}
          <motion.div
            className="p-6 border-b border-white/10 backdrop-blur-[30px] z-20"
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
                  onClick={() => navigate(`/project/${projectId}`)}
                  className="w-10 h-10 rounded-xl backdrop-blur-xl flex items-center justify-center transition-all"
                  style={{
                    background: 'rgba(255, 107, 53, 0.1)',
                    border: '1px solid rgba(255, 107, 53, 0.3)',
                  }}
                >
                  <ArrowLeft className="w-5 h-5 text-orange-500" />
                </motion.button>

                <div className="flex flex-col gap-0.5">
                  <input
                    type="text"
                    value={boardName}
                    onChange={(e) => setBoardName(e.target.value)}
                    className="bg-transparent border-none text-2xl font-bold text-white focus:outline-none focus:ring-1 focus:ring-white/20 rounded px-2"
                    placeholder="Board Name"
                  />
                  {project?.name && (
                    <p className="text-xs text-gray-500 px-3 leading-none">{project.name}</p>
                  )}
                </div>

                <div className="flex items-center gap-4 ml-4 border-l border-white/10 pl-4 h-10">
                  <div className="flex items-center gap-2 relative h-full">
                    <input
                      type="text"
                      value={boardCode}
                      onChange={(e) => setBoardCode(e.target.value.toUpperCase().substring(0, 3))}
                      className="bg-transparent border border-white/10 text-sm font-bold text-white focus:outline-none focus:ring-1 focus:ring-white/20 rounded-lg px-3 py-2 w-[80px] text-center uppercase h-full"
                      placeholder="XXX"
                      maxLength={3}
                    />
                    <button
                      onClick={() => setIsColorPickerOpen(!isColorPickerOpen)}
                      className="p-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors flex items-center justify-center gap-2 h-full w-[54px] flex-shrink-0"
                    >
                      <div
                        className="w-8 h-4 rounded-md border border-white/20"
                        style={{ backgroundColor: boardColor, boxShadow: `0 0 10px ${boardColor}` }}
                      />
                      <Palette className="w-4 h-4 text-gray-400" />
                    </button>

                    <AnimatePresence>
                      {isColorPickerOpen && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95, y: 10 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95, y: 10 }}
                          className="absolute top-full left-1/2 -translate-x-1/2 mt-2 p-3 bg-[#0A0A0A] border border-white/10 rounded-xl shadow-2xl z-50 grid grid-cols-4 gap-3 min-w-[160px] w-max"
                        >
                          {BOARD_COLORS.map(color => (
                            <button
                              key={color}
                              onClick={() => {
                                setBoardColor(color);
                                setIsColorPickerOpen(false);
                              }}
                              className="w-8 h-8 rounded-full border-2 transition-transform hover:scale-110"
                              style={{
                                backgroundColor: color,
                                borderColor: boardColor === color ? 'white' : 'transparent'
                              }}
                            />
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>


                {/* Epic Filter */}
                <div className="flex items-center gap-4 ml-4 border-l border-white/10 pl-4">
                  <div className="relative">
                    <button
                      onClick={() => setIsEpicModalOpen(true)}
                      className="px-3 py-2 rounded-lg bg-transparent border border-white/10 hover:bg-white/5 transition-colors flex items-center gap-2 text-sm"
                      style={{ color: 'var(--snaps-text-primary)' }}
                    >
                      <Settings className="w-4 h-4" />
                      Manage Epics
                    </button>
                  </div>

                  <select
                    value={selectedEpicId || ''}
                    onChange={(e) => setSelectedEpicId(e.target.value || null)}
                    className="bg-transparent border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-white/30"
                    style={{ color: 'var(--snaps-text-primary)' }}
                  >
                    <option value="">All Epics</option>
                    <option value="no_epic">No Epic</option>
                    {epics.map(epic => (
                      <option key={epic.id} value={epic.id}>{epic.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-4">
                {(isDirty || !boardId) && (
                  <div className="flex items-center gap-2">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={handleSaveBoard}
                      disabled={isSaving}
                      className="px-4 py-2.5 rounded-xl flex items-center gap-2 font-bold transition-all"
                      style={{
                        background: 'rgba(34, 197, 94, 0.2)',
                        border: '1px solid rgba(34, 197, 94, 0.4)',
                        color: '#22C55E'
                      }}
                    >
                      {isSaving ? <div className="w-4 h-4 border-2 border-green-500/30 border-t-green-500 rounded-full animate-spin" /> : <Check className="w-4 h-4" />}
                      Apply
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={handleOpenBulkApply}
                      disabled={isSaving}
                      className="px-4 py-2.5 rounded-xl flex items-center gap-2 font-bold transition-all"
                      style={{
                        background: 'rgba(0, 212, 255, 0.2)',
                        border: '1px solid rgba(0, 212, 255, 0.4)',
                        color: '#00D4FF'
                      }}
                    >
                      <Layers className="w-4 h-4" />
                      Bulk Apply
                    </motion.button>
                  </div>
                )}
              </div>
            </div>
          </motion.div>

          {/* Epic Modal */}
          <AnimatePresence>
            {isEpicModalOpen && (
              <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-6">
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  className="bg-[#0A0A0A] border border-white/10 rounded-2xl w-full max-w-lg p-6 shadow-2xl max-h-[80vh] flex flex-col"
                >
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold">Manage Epics</h2>
                    <button
                      onClick={() => setIsEpicModalOpen(false)}
                      className="p-1 rounded-lg hover:bg-white/10"
                    >
                      <X className="w-5 h-5 text-gray-400" />
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto space-y-3 mb-6 pr-2">
                    {epics.map(epic => (
                      <div key={epic.id} className="bg-white/5 border border-white/10 rounded-xl p-3">
                        {editingEpicId === epic.id ? (
                          <div className="flex flex-col gap-3">
                            <input
                              type="text"
                              value={epicNameInput}
                              onChange={(e) => setEpicNameInput(e.target.value)}
                              className="bg-black/20 border border-white/10 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500 text-white"
                              placeholder="Epic Name"
                              autoFocus
                            />
                            <div className="flex items-center gap-2">
                              <div className="flex gap-1 flex-wrap">
                                {BOARD_COLORS.slice(0, 8).map(c => (
                                  <button
                                    key={c}
                                    onClick={() => setEpicColorInput(c)}
                                    className={`w-5 h-5 rounded-full border-2 ${epicColorInput === c ? 'border-white' : 'border-transparent'}`}
                                    style={{ backgroundColor: c }}
                                  />
                                ))}
                              </div>
                              <div className="flex-1" />
                              <button
                                onClick={() => handleDeleteEpic(epic.id)}
                                className="p-2 rounded hover:bg-red-500/10 text-red-500 hover:text-red-400 transition-colors"
                                title="Delete Epic"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setEditingEpicId(null)}
                                className="p-2 rounded hover:bg-white/10 text-xs text-white"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={() => handleUpdateEpic(epic.id)}
                                className="p-2 rounded bg-green-500/20 text-green-400 text-xs font-bold"
                              >
                                Save
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: epic.color }} />
                              <span className="font-medium text-white">{epic.name}</span>
                            </div>
                            <button
                              onClick={() => startEditingEpic(epic)}
                              className="p-2 rounded-lg hover:bg-white/10 opacity-50 hover:opacity-100 text-white"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    ))}

                    {isCreatingEpic ? (
                      <div className="bg-white/5 border border-white/10 rounded-xl p-3 animate-in fade-in slide-in-from-top-2">
                        <div className="flex flex-col gap-3">
                          <input
                            type="text"
                            value={epicNameInput}
                            onChange={(e) => setEpicNameInput(e.target.value)}
                            className="bg-black/20 border border-white/10 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500 text-white"
                            placeholder="New Epic Name"
                            autoFocus
                          />
                          <div className="flex items-center gap-2">
                            <div className="flex gap-1 flex-wrap">
                              {BOARD_COLORS.slice(0, 8).map(c => (
                                <button
                                  key={c}
                                  onClick={() => setEpicColorInput(c)}
                                  className={`w-5 h-5 rounded-full border-2 ${epicColorInput === c ? 'border-white' : 'border-transparent'}`}
                                  style={{ backgroundColor: c }}
                                />
                              ))}
                            </div>
                            <div className="flex-1" />
                            <button
                              onClick={() => setIsCreatingEpic(false)}
                              className="p-2 rounded hover:bg-white/10 text-xs text-white"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={handleCreateEpic}
                              disabled={!epicNameInput.trim() || isCreatingEpicUtils}
                              className="p-2 rounded bg-blue-500/20 text-blue-400 text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                              {isCreatingEpicUtils ? (
                                <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                              ) : 'Create'}
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={startCreatingEpic}
                        className="w-full py-3 rounded-xl border border-dashed border-white/10 hover:border-white/30 hover:bg-white/5 text-gray-400 hover:text-white transition-all flex items-center justify-center gap-2 text-sm font-medium"
                      >
                        <Plus className="w-4 h-4" />
                        Add New Epic
                      </button>
                    )}
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>
          {/* Bulk Apply Modal */}
          <AnimatePresence>
            {isBulkApplyOpen && (
              <>
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-6">
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    className="bg-[#0A0A0A] border border-white/10 rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl"
                  >
                    <div className="p-6 border-b border-white/10 flex items-center justify-between sticky top-0 bg-[#0A0A0A] z-10 rounded-t-2xl">
                      <div>
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                          <Layers className="w-5 h-5 text-blue-400" />
                          Bulk Apply Columns
                        </h2>
                        <p className="text-gray-400 text-sm mt-1">
                          Select boards to apply the current column configuration to
                        </p>
                      </div>
                      <button
                        onClick={() => setIsBulkApplyOpen(false)}
                        className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                      >
                        <X className="w-5 h-5 text-gray-400" />
                      </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6">
                      {isLoadingBoards ? (
                        <div className="flex items-center justify-center py-12">
                          <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
                        </div>
                      ) : allBoards.length === 0 ? (
                        <div className="text-center py-12 text-gray-500">
                          No other boards found.
                        </div>
                      ) : (
                        <div className="space-y-6">
                          {/* Group by Project */}
                          {Array.from(new Set(allBoards.map(b => b.projectName))).map(projectName => {
                            const projectBoards = allBoards.filter(b => b.projectName === projectName);
                            if (projectBoards.length === 0) return null;

                            return (
                              <div key={projectName}>
                                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                                  <Globe className="w-3 h-3" />
                                  {projectName}
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                  {projectBoards.map(board => (
                                    <div
                                      key={board.id}
                                      onClick={() => toggleBoardSelection(board.id)}
                                      className={`p-4 rounded-xl border cursor-pointer transition-all flex items-center gap-3 ${selectedBoardIds.has(board.id)
                                        ? 'bg-blue-500/10 border-blue-500/50'
                                        : 'bg-white/5 border-white/10 hover:border-white/20'
                                        }`}
                                    >
                                      <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${selectedBoardIds.has(board.id)
                                        ? 'bg-blue-500 border-blue-500'
                                        : 'border-gray-500'
                                        }`}>
                                        {selectedBoardIds.has(board.id) && <Check className="w-3 h-3 text-white" />}
                                      </div>
                                      <div>
                                        <div className="font-medium text-white">{board.name}</div>
                                        <div className="text-xs text-gray-500">{board.columns?.length || 0} columns</div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    <div className="p-6 border-t border-white/10 bg-[#0A0A0A] rounded-b-2xl flex justify-end gap-3">
                      <button
                        onClick={() => setIsBulkApplyOpen(false)}
                        className="px-4 py-2 rounded-lg text-gray-400 hover:text-white transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleBulkApplyConfirm}
                        disabled={selectedBoardIds.size === 0 || isBulkSaving}
                        className="px-6 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white font-bold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        {isBulkSaving ? (
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                          <Layers className="w-4 h-4" />
                        )}
                        Apply to {selectedBoardIds.size} Boards
                      </button>
                    </div>
                  </motion.div>
                </div>
              </>
            )}
          </AnimatePresence>

          {/* Floating Action Buttons - Right Edge */}
          {boardId && (
            <motion.div
              className="fixed right-6 top-1/2 -translate-y-1/2 flex flex-col gap-4 z-20"
              initial={{ x: 100, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              {/* Create Card Button - Green */}
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={handleCreateCard}
                className="w-16 h-16 rounded-full backdrop-blur-xl flex items-center justify-center transition-all relative group"
                style={{
                  background: 'rgba(34, 197, 94, 0.15)',
                  border: '2px solid rgba(34, 197, 94, 0.5)',
                  boxShadow: '0 4px 20px rgba(34, 197, 94, 0.5)'
                }}
              >
                <Plus className="w-8 h-8 relative z-10" style={{ color: 'var(--snaps-accent-green, #22c55e)' }} />
                <div className="absolute right-full mr-4 bg-black/80 px-3 py-1 rounded text-sm text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                  Create Card
                </div>
              </motion.button>

              {/* Planner Agent Button - Orange with Pulsing Ring */}
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setIsPlannerOpen(true)}
                className="w-16 h-16 rounded-full backdrop-blur-xl flex items-center justify-center transition-all relative"
                style={{
                  background: 'rgba(255, 107, 53, 0.15)',
                  border: '2px solid rgba(255, 107, 53, 0.5)',
                  boxShadow: '0 4px 20px rgba(255, 107, 53, 0.5)'
                }}
              >
                <motion.div
                  className="absolute inset-0 rounded-full"
                  style={{
                    border: '3px solid rgba(255, 107, 53, 0.6)',
                    boxShadow: '0 0 30px rgba(255, 107, 53, 0.8)'
                  }}
                  animate={{
                    scale: [1, 1.3, 1],
                    opacity: [0.8, 0.3, 0.8]
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: 'easeInOut'
                  }}
                />
                <Bot className="w-7 h-7 relative z-10" style={{ color: 'var(--snaps-accent-orange)' }} />
              </motion.button>

              {/* Settings Button - Purple */}
              <motion.button
                whileHover={{ scale: 1.1, rotate: 90 }}
                whileTap={{ scale: 0.9 }}
                className="w-14 h-14 rounded-full backdrop-blur-xl flex items-center justify-center transition-all"
                style={{
                  background: 'rgba(168, 85, 247, 0.1)',
                  border: '2px solid rgba(168, 85, 247, 0.5)',
                  boxShadow: '0 4px 20px rgba(168, 85, 247, 0.4)'
                }}
              >
                <Settings className="w-6 h-6" style={{ color: 'var(--snaps-accent-purple)' }} />
              </motion.button>
            </motion.div>
          )}

          {/* Planner Agent Slide-over Panel */}
          <AnimatePresence>
            {isPlannerOpen && (
              <>
                {/* Backdrop */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setIsPlannerOpen(false)}
                  className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
                />

                {/* Slide-over Panel */}
                <motion.div
                  initial={{ x: '100%' }}
                  animate={{ x: 0 }}
                  exit={{ x: '100%' }}
                  transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                  className="fixed right-0 top-0 bottom-0 w-[500px] z-50 flex flex-col"
                  style={{
                    background: 'rgba(10, 10, 10, 0.95)',
                    backdropFilter: 'blur(40px)',
                    borderLeft: '1px solid rgba(255, 107, 53, 0.3)',
                    boxShadow: '-10px 0 50px rgba(255, 107, 53, 0.2)'
                  }}
                >
                  {/* Panel Header */}
                  <div className="p-6 border-b border-white/10">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-12 h-12 rounded-full flex items-center justify-center"
                          style={{
                            background: 'rgba(255, 107, 53, 0.2)',
                            border: '2px solid rgba(255, 107, 53, 0.5)',
                            boxShadow: '0 0 20px rgba(255, 107, 53, 0.4)'
                          }}
                        >
                          <Bot className="w-6 h-6" style={{ color: 'var(--snaps-accent-orange)' }} />
                        </div>
                        <div>
                          <h2
                            className="text-xl font-bold"
                            style={{ color: 'var(--snaps-text-primary)' }}
                          >
                            Planner Agent
                          </h2>
                          <p className="text-sm" style={{ color: 'var(--snaps-text-secondary)' }}>
                            Talk to your board
                          </p>
                        </div>
                      </div>
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => setIsPlannerOpen(false)}
                        className="w-9 h-9 rounded-lg flex items-center justify-center transition-all"
                        style={{
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid rgba(255, 255, 255, 0.1)'
                        }}
                      >
                        <X className="w-5 h-5" style={{ color: 'var(--snaps-text-secondary)' }} />
                      </motion.button>
                    </div>
                  </div>

                  {/* Chat Area */}
                  <div className="flex-1 p-6 overflow-y-auto">
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                    >
                      <div
                        className="p-4 rounded-2xl backdrop-blur-xl"
                        style={{
                          background: 'rgba(255, 107, 53, 0.1)',
                          border: '1px solid rgba(255, 107, 53, 0.3)'
                        }}
                      >
                        <p
                          className="text-sm leading-relaxed"
                          style={{ color: 'var(--snaps-text-primary)' }}
                        >
                          Hi! I'm your Planner Agent. I can help you organize tasks, suggest priorities, and optimize your workflow. What would you like to plan?
                        </p>
                      </div>
                    </motion.div>
                  </div>

                  {/* Input Area */}
                  <div className="p-6 border-t border-white/10">
                    <div
                      className="relative rounded-2xl backdrop-blur-xl"
                      style={{
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
                      }}
                    >
                      <input
                        type="text"
                        value={plannerInput}
                        onChange={(e) => setPlannerInput(e.target.value)}
                        placeholder="Ask the planner..."
                        className="w-full px-6 py-4 bg-transparent text-sm focus:outline-none"
                        style={{ color: 'var(--snaps-text-primary)' }}
                      />
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        disabled={!plannerInput.trim()}
                        className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-xl flex items-center justify-center transition-all"
                        style={{
                          background: plannerInput.trim()
                            ? 'linear-gradient(135deg, #FF6B35 0%, #FF8C42 100%)'
                            : 'rgba(255, 255, 255, 0.05)',
                          boxShadow: plannerInput.trim()
                            ? '0 0 20px rgba(255, 107, 53, 0.4)'
                            : 'none',
                          opacity: plannerInput.trim() ? 1 : 0.5
                        }}
                      >
                        <Send className="w-5 h-5" style={{ color: 'white' }} />
                      </motion.button>
                    </div>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>

          <input
            id="doc-import-input"
            type="file"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file && projectId) {
                const reader = new FileReader();
                reader.onload = async (event) => {
                  const content = event.target?.result as string;
                  // Handle import logic if needed or just show toast
                  console.log('Importing:', file.name);
                };
                reader.readAsText(file);
              }
            }}
          />

          {/* Board Columns */}
          <div className="flex-1 overflow-x-auto p-6 scrollbar-hide">
            <div className="flex gap-6 min-w-max h-full items-start">
              {columns.map((col: any, index: number) => (
                <Column
                  key={col.id}
                  index={index}
                  title={col.title}
                  status={col.id}
                  tasks={filteredAndSortedTasks.filter(t => {
                    if (t.status === col.id) return true;
                    // Fuzzy match for common interchangeable statuses
                    const s = t.status.toLowerCase();
                    const cid = col.id.toLowerCase();
                    if ((s === 'doing' || s === 'inprogress' || s === 'in-progress') &&
                      (cid === 'doing' || cid === 'inprogress' || cid === 'in-progress')) return true;
                    if ((s === 'todo' || s === 'to-do') && (cid === 'todo' || cid === 'to-do')) return true;
                    return false;
                  })}
                  onMove={handleMove}
                  onCardClick={handleEditCard}
                  onTitleChange={(newTitle) => handleUpdateColumnTitle(col.id, newTitle)}
                  onColorChange={(newColor) => handleUpdateColumnColor(col.id, newColor)}
                  onMoveColumn={handleMoveColumn}
                  color={col.color || boardColor}
                  epics={epics}
                  boardColor={boardColor}
                />
              ))}

              {isAddingColumn ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="w-[300px] rounded-xl border border-white/10 bg-white/5 flex flex-col shrink-0"
                  style={{ backdropFilter: 'blur(20px)' }}
                >
                  <div
                    className="p-4 rounded-t-xl border-b-2"
                    style={{
                      backgroundColor: `${newColumnColor}1a`,
                      borderColor: newColumnColor,
                    }}
                  >
                    <input
                      autoFocus
                      type="text"
                      value={newColumnTitle}
                      onChange={(e) => setNewColumnTitle(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleConfirmAddColumn()}
                      placeholder="Nome da Coluna..."
                      className="bg-transparent border-none text-white font-bold w-full focus:outline-none"
                    />
                  </div>
                  <div className="p-4 space-y-4">
                    <div className="flex flex-wrap gap-2">
                      {BOARD_COLORS.map(c => (
                        <button
                          key={c}
                          onClick={() => setNewColumnColor(c)}
                          className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 ${newColumnColor === c ? 'border-white' : 'border-transparent'}`}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={handleConfirmAddColumn}
                        className="flex-1 py-2 rounded-lg bg-green-500/20 text-green-400 border border-green-500/30 text-sm font-bold"
                      >
                        Confirmar
                      </button>
                      <button
                        onClick={() => setIsAddingColumn(false)}
                        className="flex-1 py-2 rounded-lg bg-white/5 text-gray-400 border border-white/10 text-sm"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleAddField}
                  className="w-[300px] h-[100px] rounded-xl border-2 border-dashed border-white/10 hover:border-purple-500/30 hover:bg-white/5 transition-all flex flex-col items-center justify-center gap-2 group shrink-0"
                >
                  <Plus className="w-6 h-6 text-gray-500 group-hover:text-purple-400" />
                  <span className="text-sm text-gray-500 group-hover:text-purple-400">Adicionar Coluna</span>
                </motion.button>
              )}
            </div>
          </div>
        </div>

        {/* Card Modal */}
        <CardModal
          isOpen={isCardModalOpen}
          onClose={() => setIsCardModalOpen(false)}
          onSave={handleSaveCard}
          initialData={selectedCard}
          epics={epics}
          columns={board?.columns}
        />
      </div>
    </DndProvider>
  );
}
