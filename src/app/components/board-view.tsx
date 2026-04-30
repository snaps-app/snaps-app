import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Bot } from 'lucide-react';
import { motion } from 'motion/react';
import { DndProvider } from 'react-dnd';
import { TouchBackend } from 'react-dnd-touch-backend';
import { CardModal } from './card-modal';
import { BoardColumnSkeleton } from './ui/index';
import { BoardColumn } from './BoardColumn';
import { BOARD_COLORS } from './board-constants';
import api, { Card, Board, Epic, Sprint, getGithubConfig, createAgentExecution } from '@/services/api';
import { useParams, useNavigate } from 'react-router-dom';

// Extracted Components
import { BoardHeader } from './board/BoardHeader';
import { EpicModal } from './board/EpicModal';
import { SprintModal } from './board/SprintModal';
import { BulkApplyModal } from './board/BulkApplyModal';
import { VaccinationModal } from './board/VaccinationModal';
import { PlannerPanel } from './board/PlannerPanel';
import { useBoardData } from './board/useBoardData';
import { useBoardModals } from './board/useBoardModals';

/**
 * BoardView Component
 * Manages the Kanban board UI, including filtering by epics/sprints,
 * task management, and modal orchestration.
 * Refactored to < 200 lines by decomposing into sub-components.
 */
export function BoardView() {
  const { projectId, boardId } = useParams<{ projectId: string, boardId: string }>();
  const navigate = useNavigate();

  const {
    board, setBoard,
    tasks, setTasks,
    isLoadingBoard,
    localBoardId, setLocalBoardId,
    project,
    epics, setEpics,
    sprints, setSprints,
    initialState, setInitialState,
    fetchBoard
  } = useBoardData(projectId, boardId);

  const {
    handleCreateEpic, handleUpdateEpic, handleDeleteEpic,
    handleCreateSprint, handleUpdateSprint, handleDeleteSprint
  } = useBoardModals(projectId, epics, setEpics, sprints, setSprints);

  const [boardName, setBoardName] = useState('');
  const [boardCode, setBoardCode] = useState('');
  const [boardColor, setBoardColor] = useState(BOARD_COLORS[0]);
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (board) {
      setBoardName(board.name);
      setBoardCode(board.code || '');
      setBoardColor(board.color || BOARD_COLORS[0]);
    }
  }, [board]);

  const isDirty = boardName !== initialState.name ||
    boardCode !== initialState.code ||
    boardColor !== initialState.color ||
    JSON.stringify(board?.columns) !== JSON.stringify(initialState.columns);

  // Modal States
  const [isCardModalOpen, setIsCardModalOpen] = useState(false);
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [isPlannerOpen, setIsPlannerOpen] = useState(false);
  const [plannerInput, setPlannerInput] = useState('');
  const [isBulkApplyOpen, setIsBulkApplyOpen] = useState(false);
  const [isBulkSaving, setIsBulkSaving] = useState(false);
  const [isLoadingBoards, setIsLoadingBoards] = useState(false);
  const [allBoards, setAllBoards] = useState<any[]>([]);
  const [selectedBoardIds, setSelectedBoardIds] = useState<Set<string>>(new Set());
  const [repoNames, setRepoNames] = useState<string[]>([]);
  
  useEffect(() => {
    if (projectId) {
      getGithubConfig(projectId).then(config => {
        if (config && config.repo_names) {
          const names = config.repo_names.split(',').map((n: string) => n.strip ? n.strip() : n.trim());
          setRepoNames(names);
        }
      }).catch(() => setRepoNames([]));
    }
  }, [projectId]);

  const [selectedEpicIds, setSelectedEpicIds] = useState<string[]>([]);
  const [isEpicModalOpen, setIsEpicModalOpen] = useState(false);
  const [editingEpicId, setEditingEpicId] = useState<string | null>(null);
  const [isCreatingEpic, setIsCreatingEpic] = useState(false);
  const [isCreatingEpicUtils, setIsCreatingEpicUtils] = useState(false);
  const [epicNameInput, setEpicNameInput] = useState('');
  const [epicColorInput, setEpicColorInput] = useState(BOARD_COLORS[0]);

  const [selectedSprintIds, setSelectedSprintIds] = useState<string[]>([]);
  const [isSprintModalOpen, setIsSprintModalOpen] = useState(false);
  const [isSprintFormOpen, setIsSprintFormOpen] = useState(false);
  const [isSprintSaving, setIsSprintSaving] = useState(false);
  const [sprintNameInput, setSprintNameInput] = useState('');
  const [sprintTagInput, setSprintTagInput] = useState('');
  const [sprintObjectiveInput, setSprintObjectiveInput] = useState('');
  const [editingSprintId, setEditingSprintId] = useState<string | null>(null);
  
  const [isVaccinationModalOpen, setIsVaccinationModalOpen] = useState(false);
  const [vaccinationCard, setVaccinationCard] = useState<Card | null>(null);
  const [vaccinationContent, setVaccinationContent] = useState('');
  const [isVaccinating, setIsVaccinating] = useState(false);

  const STATUS_ALIASES: Record<string, string[]> = {
    'todo': ['todo'],
    'backlog': ['backlog'],
    'doing': ['doing', 'in_progress', 'inprogress'],
    'assurance': ['assurance', 'review'],
    'done': ['done', 'checked']
  };

  const getEffectiveStatus = (status: string) => {
    const s = status.toLowerCase();
    for (const [key, aliases] of Object.entries(STATUS_ALIASES)) {
      if (aliases.includes(s)) return key;
    }
    return s;
  };

  const handleSaveBoard = async () => {
    if (!projectId) return;
    setIsSaving(true);
    try {
      if (localBoardId) {
        const updated = await api.updateBoard(localBoardId, { name: boardName, code: boardCode, color: boardColor, columns: board?.columns || [] });
        setBoard(updated);
        setInitialState({ name: boardName, code: boardCode, color: boardColor, columns: updated.columns || [] });
      } else {
        const newBoard = await api.createBoard(projectId, { 
          name: boardName, 
          code: boardCode, 
          color: boardColor, 
          columns: [
            { id: "backlog", title: "Backlog", color: BOARD_COLORS[8] }, 
            { id: "todo", title: "To Do", color: BOARD_COLORS[0] }, 
            { id: "doing", title: "In Progress", color: BOARD_COLORS[1] }, 
            { id: "assurance", title: "Assurance", color: BOARD_COLORS[10] }, 
            { id: "done", title: "Done", color: BOARD_COLORS[2] }
          ] 
        });
        setLocalBoardId(newBoard.id);
        navigate(`/project/${projectId}/board/${newBoard.id}`, { replace: true });
      }
    } catch (error) { console.error('Failed to save board:', error); }
    finally { setIsSaving(false); }
  };

  const handleOpenBulkApply = async () => {
    setIsBulkApplyOpen(true);
    setIsLoadingBoards(true);
    try {
      const projects = await api.getProjects();
      const results = await Promise.all(projects.map(async p => (await api.getProjectBoards(p.id)).map(b => ({ ...b, projectName: p.name }))));
      setAllBoards(results.flat().filter(b => b.id !== localBoardId));
    } finally { setIsLoadingBoards(false); }
  };

  const handleMove = async (taskId: string, newStatus: string) => {
    setTasks(prev => prev.map(task => task.id === taskId ? { ...task, status: newStatus as any } : task));
    try {
      await api.updateCardStatus(taskId, newStatus);
      if (newStatus.toLowerCase() === 'done' && board?.board_type === 'support') {
        const card = tasks.find(t => t.id === taskId);
        if (card) { setVaccinationCard(card); setIsVaccinationModalOpen(true); setVaccinationContent(''); }
      }
    } catch (error) { console.error('Failed to update task status:', error); }
  };

  const filteredAndSortedTasks = useMemo(() => {
    let result = tasks;
    if (selectedEpicIds.length > 0) result = result.filter(t => selectedEpicIds.includes('no_epic') && !t.epic_id ? true : t.epic_id && selectedEpicIds.includes(t.epic_id));
    if (selectedSprintIds.length > 0) result = result.filter(t => selectedSprintIds.includes('no_sprint') && !t.sprint_id ? true : t.sprint_id && selectedSprintIds.includes(t.sprint_id));
    const priorityOrder: any = { 'High': 3, 'Medium': 2, 'Low': 1 };
    return [...result].sort((a, b) => (priorityOrder[b.priority as string] || 0) - (priorityOrder[a.priority as string] || 0));
  }, [tasks, selectedEpicIds, selectedSprintIds]);

  return (
    <DndProvider backend={TouchBackend} options={{ enableMouseEvents: true }}>
      <div className="flex-1 flex flex-col min-h-0 relative">
        <BoardHeader {...{ projectId, boardId, navigate, boardName, setBoardName, boardCode, setBoardCode, boardColor, setBoardColor, isColorPickerOpen, setIsColorPickerOpen, project, board, selectedEpicIds, setSelectedEpicIds, epics, setIsEpicModalOpen, selectedSprintIds, setSelectedSprintIds, sprints, setIsSprintModalOpen, handleQuickExecute: async () => { if (selectedSprintIds.length > 0) { const exec = await createAgentExecution({ project_id: projectId!, phase: 'macro_planning', sprint_ids: selectedSprintIds, card_ids: [] }); navigate(`/project/${projectId}/execution/${exec.id}`); } }, isDirty, isSaving, handleSaveBoard, handleOpenBulkApply }} />
        <div className="flex-1 overflow-x-auto p-6 scrollbar-hide">
          <div className="flex gap-6 min-w-max h-full items-start">
            {isLoadingBoard ? <><BoardColumnSkeleton /><BoardColumnSkeleton /><BoardColumnSkeleton /></> : board?.columns.map((col: any, index: number) => (
              <BoardColumn key={col.id} index={index} title={col.title} status={col.id} tasks={filteredAndSortedTasks.filter(t => getEffectiveStatus(t.status) === getEffectiveStatus(col.id))} onMove={handleMove} onCardClick={(card) => { setSelectedCard(card); setIsCardModalOpen(true); }} color={col.color || boardColor} epics={epics} sprints={sprints} boardColor={boardColor} />
            ))}
          </div>
        </div>
        {boardId && (
          <div className="fixed right-6 top-1/2 -translate-y-1/2 flex flex-col gap-4 z-20">
            <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => { setSelectedCard(null); setIsCardModalOpen(true); }} className="w-16 h-16 rounded-full bg-green-500/15 border-2 border-green-500/50 flex items-center justify-center shadow-lg shadow-green-500/20"><Plus className="w-8 h-8 text-green-500" /></motion.button>
            <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => setIsPlannerOpen(true)} className="w-16 h-16 rounded-full bg-orange-500/15 border-2 border-orange-500/50 flex items-center justify-center shadow-lg shadow-orange-500/20"><Bot className="w-7 h-7 text-orange-500" /></motion.button>
          </div>
        )}
        <EpicModal isOpen={isEpicModalOpen} onClose={() => setIsEpicModalOpen(false)} {...{ epics, editingEpicId, epicNameInput, epicColorInput, isCreatingEpic, isCreatingEpicUtils, setEpicNameInput, setEpicColorInput, handleCreateEpic, handleUpdateEpic, handleDeleteEpic, startEditingEpic: (e: any) => { setEditingEpicId(e.id); setEpicNameInput(e.name); setEpicColorInput(e.color); }, startCreatingEpic: () => { setIsCreatingEpic(true); setEditingEpicId(null); setEpicNameInput(''); }, setIsCreatingEpic, setEditingEpicId }} />
        <SprintModal isOpen={isSprintModalOpen} onClose={() => setIsSprintModalOpen(false)} {...{ sprints, editingSprintId, sprintNameInput, sprintTagInput, sprintObjectiveInput, isSprintFormOpen, isSprintSaving, setSprintNameInput, setSprintTagInput, setSprintObjectiveInput, setIsSprintFormOpen, setEditingSprintId, handleCreateSprint, handleUpdateSprint, handleDeleteSprint, startEditingSprint: (s: any) => { setEditingSprintId(s.id); setSprintNameInput(s.name); setSprintTagInput(s.tag); setSprintObjectiveInput(s.objective || ''); } }} />
        <BulkApplyModal isOpen={isBulkApplyOpen} onClose={() => setIsBulkApplyOpen(false)} {...{ isLoadingBoards, allBoards, selectedBoardIds, toggleBoardSelection: (id) => { const n = new Set(selectedBoardIds); n.has(id) ? n.delete(id) : n.add(id); setSelectedBoardIds(n); }, handleBulkApplyConfirm: async () => { if (!board?.columns) return; setIsBulkSaving(true); try { if (isDirty) await handleSaveBoard(); await Promise.all(Array.from(selectedBoardIds).map(id => api.updateBoard(id, { columns: board.columns }))); setIsBulkApplyOpen(false); setSelectedBoardIds(new Set()); } finally { setIsBulkSaving(false); } }, isBulkSaving }} />
        <VaccinationModal isOpen={isVaccinationModalOpen} onClose={() => setIsVaccinationModalOpen(false)} {...{ vaccinationCard, vaccinationContent, setVaccinationContent, handleVaccinate: async () => { if (!vaccinationCard || !projectId) return; setIsVaccinating(true); try { await api.createSnap({ project_id: projectId, name: `[VACINA] ${vaccinationCard.title}`, description: `Resolução do bug ${vaccinationCard.code || ''}`, content: vaccinationContent, snadds: { labels: ['bug-vaccination'], status: 'vacinado' } }); setIsVaccinationModalOpen(false); } finally { setIsVaccinating(false); } }, isVaccinating }} />
        <PlannerPanel isOpen={isPlannerOpen} onClose={() => setIsPlannerOpen(false)} {...{ plannerInput, setPlannerInput }} />
        {isCardModalOpen && (
          <CardModal 
            isOpen={isCardModalOpen} 
            onClose={() => setIsCardModalOpen(false)} 
            initialData={selectedCard} 
            columns={board?.columns}
            epics={epics}
            sprints={sprints}
            repoNames={repoNames}
            onSave={async (data) => { 
              if (!localBoardId) return; 
              if (selectedCard) await api.updateCard(selectedCard.id, data); 
              else await api.createCard(localBoardId, { 
                title: data.title!, 
                description: data.description || '', 
                status: data.status!, 
                priority: data.priority, 
                due_date: data.due_date, 
                labels: data.labels, 
                epic_id: data.epic_id, 
                sprint_id: data.sprint_id, 
                bdd_scenarios: data.bdd_scenarios 
              }); 
              setIsCardModalOpen(false); 
              fetchBoard(localBoardId); 
            }} 
          />
        )}
      </div>
    </DndProvider>
  );
}
