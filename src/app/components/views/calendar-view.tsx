import { getAllCards } from '@/services/cards';
import { cloneYesterdayExecutions, getAllDailyExecutions } from '@/services/dailyExecutions';
import { getRoutinesForDate, setRoutineCompletion } from '@/services/routines';
import { getAllSchedulings } from '@/services/schedulings';
import { getProjects } from '@/services/projects';
import { getProjectBoards } from '@/services/boards';
import type { CardWithProject, DailyExecutionWithProject, Routine, RoutineWithStatus, SchedulingWithProject } from '@/services/types';
import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { format, addMonths, subMonths, addWeeks, subWeeks, addDays, subDays } from 'date-fns';
import { formatServerTime } from '@/lib/date-utils';
import { NeuralBackground } from '@/app/components/shared/neural-background';
import { MonthView } from '@/app/components/calendar/month-view';
import { WeekView } from '@/app/components/calendar/week-view';
import { DayView } from '@/app/components/calendar/day-view';
import { ExecuteTodayModal, type ExecuteTodayData } from '@/app/components/calendar/execute-today-modal';
import { CreateSchedulingModal } from '@/app/components/calendar/create-scheduling-modal';
import { ExecutionModal } from '@/app/components/calendar/execution-modal';
import { RoutineModal } from '@/app/components/calendar/routine-modal';

type ViewMode = 'month' | 'week' | 'day';

function dedupeById<T extends { id: string }>(arr: unknown): T[] {
  return Array.isArray(arr) ? Array.from(new Map((arr as T[]).map(x => [x.id, x])).values()) : [];
}

export function CalendarView() {
  const [view, setView] = useState<ViewMode>('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [schedulings, setSchedulings] = useState<SchedulingWithProject[]>([]);
  const [dailyExecutions, setDailyExecutions] = useState<DailyExecutionWithProject[]>([]);
  const [cards, setCards] = useState<CardWithProject[]>([]);
  const [routines, setRoutines] = useState<RoutineWithStatus[]>([]);
  // Only the very first load shows the full-screen spinner. Subsequent refreshes happen in the
  // background so the calendar never blanks/remounts on every change.
  const [initialLoading, setInitialLoading] = useState(true);

  // Modal State
  const [executeData, setExecuteData] = useState<ExecuteTodayData | null>(null);
  const [isExecuteModalOpen, setIsExecuteModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editScheduling, setEditScheduling] = useState<SchedulingWithProject | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isExecutionModalOpen, setIsExecutionModalOpen] = useState(false);
  const [selectedExecution, setSelectedExecution] = useState<DailyExecutionWithProject | null>(null);
  const [isRoutineModalOpen, setIsRoutineModalOpen] = useState(false);
  const [selectedRoutine, setSelectedRoutine] = useState<Routine | null>(null);

  // Set of team_kanban board ids, used to scope which cards belong on the calendar.
  // Fetched once (boards rarely change) to avoid the per-project N+1 on every refresh.
  const boardContextRef = useRef<{ loaded: boolean; teamKanbanBoardIds: Set<string> }>({
    loaded: false,
    teamKanbanBoardIds: new Set<string>(),
  });
  const executionsLoadedRef = useRef(false);
  const didInitialLoad = useRef(false);

  // --- Granular loaders: each updates only its own slice (no full reload) ---
  const refreshSchedulings = useCallback(async () => {
    try {
      const data = await getAllSchedulings();
      setSchedulings(dedupeById<SchedulingWithProject>(data));
    } catch (error) {
      console.error("Error loading schedulings:", error);
    }
  }, []);

  const refreshExecutions = useCallback(async () => {
    try {
      const data = await getAllDailyExecutions();
      setDailyExecutions(dedupeById<DailyExecutionWithProject>(data));
      executionsLoadedRef.current = true;
    } catch (error) {
      console.error("Error loading daily executions:", error);
    }
  }, []);

  const ensureBoardContext = useCallback(async () => {
    if (boardContextRef.current.loaded) return;
    try {
      const projects = await getProjects();
      const boardsPerProject = await Promise.all(
        projects.map(p => getProjectBoards(p.id).catch(() => []))
      );
      boardContextRef.current = {
        loaded: true,
        teamKanbanBoardIds: new Set<string>(
          boardsPerProject.flat().filter(b => b.board_type === 'team_kanban').map(b => b.id)
        ),
      };
    } catch (error) {
      console.error("Error loading board context:", error);
    }
  }, []);

  // All cards on team_kanban boards. Month/Week use the ones with a due_date (chips);
  // Day shows the ones that are not Done. High limit so large boards aren't truncated.
  const refreshCards = useCallback(async () => {
    try {
      await ensureBoardContext();
      const { teamKanbanBoardIds } = boardContextRef.current;
      const cardData = await getAllCards(0, 1000);
      const arr = Array.isArray(cardData) ? cardData : [];
      setCards(arr.filter(c => teamKanbanBoardIds.has(c.board_id)));
    } catch (error) {
      console.error("Error loading cards:", error);
    }
  }, [ensureBoardContext]);

  // --- View-aware loading ---
  // All views need schedulings + cards (Month/Week show due_date chips). Only Week/Day need
  // daily executions, so those are loaded lazily. Data is filtered client-side by date, so
  // changing the date does NOT require a refetch.
  const loadForView = useCallback(async (v: ViewMode, initial = false) => {
    if (initial) setInitialLoading(true);
    try {
      const tasks: Promise<void>[] = [refreshSchedulings(), refreshCards()];
      if (v === 'week' || v === 'day') tasks.push(refreshExecutions());
      await Promise.all(tasks);
    } finally {
      if (initial) setInitialLoading(false);
    }
  }, [refreshSchedulings, refreshCards, refreshExecutions]);

  useEffect(() => {
    if (!didInitialLoad.current) {
      didInitialLoad.current = true;
      loadForView(view, true);
      return;
    }
    // On view switch, lazily load executions the first time a heavier view is opened.
    if ((view === 'week' || view === 'day') && !executionsLoadedRef.current) refreshExecutions();
  }, [view, loadForView, refreshExecutions]);

  const handleExecute = (data: ExecuteTodayData) => {
    setExecuteData(data);
    setIsExecuteModalOpen(true);
  };

  const handleEditScheduling = (s: SchedulingWithProject) => {
    setEditScheduling(s);
    setIsEditModalOpen(true);
  };

  // From inside the edit modal: switch to the Execute Today flow for this scheduling
  const handleExecuteFromEdit = (s: SchedulingWithProject) => {
    setIsEditModalOpen(false);
    setExecuteData({
      type: 'scheduling',
      id: s.id,
      title: s.title,
      description: s.description,
      project_id: s.project_id,
      epic_id: s.epic_id,
      startTime: formatServerTime(s.start_date),
      endTime: formatServerTime(s.end_date),
    });
    setIsExecuteModalOpen(true);
  };

  const handleEditExecution = (execution: DailyExecutionWithProject) => {
    setSelectedExecution(execution);
    setIsExecutionModalOpen(true);
  };

  const handleAddExecution = () => {
    setSelectedExecution(null);
    setIsExecutionModalOpen(true);
  };

  const handleCloneYesterday = async () => {
    await cloneYesterdayExecutions(format(currentDate, 'yyyy-MM-dd'));
    await refreshExecutions();
  };

  const fetchRoutinesForDate = async (date: Date) => {
    try {
      const dateStr = format(date, 'yyyy-MM-dd');
      const data = await getRoutinesForDate(dateStr);
      setRoutines(data);
    } catch (error) {
      console.error('Error fetching routines:', error);
    }
  };

  // Fetch routines when view or date changes (routines only exist in the Day view)
  useEffect(() => {
    if (view === 'day') {
      fetchRoutinesForDate(currentDate);
    }
  }, [view, currentDate]);

  const handleToggleRoutineStatus = async (routineId: string, date: string, newStatus: string) => {
    await setRoutineCompletion(routineId, date, newStatus);
    await fetchRoutinesForDate(currentDate);
  };

  const handleAddRoutine = () => {
    setSelectedRoutine(null);
    setIsRoutineModalOpen(true);
  };

  const handleEditRoutine = (routine: RoutineWithStatus) => {
    setSelectedRoutine(routine);
    setIsRoutineModalOpen(true);
  };

  const handlePrevious = () => {
    if (view === 'month') setCurrentDate(subMonths(currentDate, 1));
    if (view === 'week') setCurrentDate(subWeeks(currentDate, 1));
    if (view === 'day') setCurrentDate(subDays(currentDate, 1));
  };

  const handleNext = () => {
    if (view === 'month') setCurrentDate(addMonths(currentDate, 1));
    if (view === 'week') setCurrentDate(addWeeks(currentDate, 1));
    if (view === 'day') setCurrentDate(addDays(currentDate, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  return (
    <div className="min-h-screen relative overflow-hidden flex flex-col" style={{ backgroundColor: 'var(--snaps-bg)' }}>
      <NeuralBackground />

      <div className="relative z-10 flex flex-col h-screen p-3 md:p-6 overflow-y-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 md:mb-8 gap-3 backdrop-blur-xl bg-white/5 border border-white/10 p-3 md:p-4 rounded-2xl w-full max-w-[1400px] mx-auto">
          <div className="flex items-center gap-3 md:gap-4">
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-gradient-to-br from-[#00D4FF] to-[#A855F7] flex items-center justify-center shadow-lg shadow-purple-500/20 flex-shrink-0">
              <CalendarIcon className="w-5 h-5 md:w-6 md:h-6 text-white" />
            </div>
            <h1 className="text-lg md:text-2xl font-bold" style={{ color: 'var(--snaps-text-primary)' }}>
              {view === 'month' && format(currentDate, 'MMMM yyyy')}
              {view === 'week' && `Week of ${format(currentDate, 'MMM d, yyyy')}`}
              {view === 'day' && format(currentDate, 'EEEE, MMMM d, yyyy')}
            </h1>
          </div>

          <div className="flex items-center gap-2 md:gap-4 w-full sm:w-auto">
            <div className="flex items-center bg-black/20 rounded-lg p-1 border border-white/5">
              <button onClick={handlePrevious} className="p-2 hover:bg-white/10 rounded-md text-zinc-300 transition-colors">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button onClick={handleToday} className="px-4 py-1.5 text-sm font-medium hover:bg-white/10 rounded-md text-zinc-300 transition-colors">
                Today
              </button>
              <button onClick={handleNext} className="p-2 hover:bg-white/10 rounded-md text-zinc-300 transition-colors">
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center bg-black/20 rounded-lg p-1 border border-white/5">
              {(['month', 'week', 'day'] as ViewMode[]).map((v) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${view === v ? 'bg-white/10 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'}`}
                >
                  {v.charAt(0).toUpperCase() + v.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 w-full max-w-[1400px] mx-auto relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={view + currentDate.toISOString()}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="h-full"
            >
              {view === 'month' && <MonthView currentDate={currentDate} schedulings={schedulings} cards={cards} loading={initialLoading} onExecute={handleExecute} onEditScheduling={handleEditScheduling} />}
              {view === 'week' && <WeekView currentDate={currentDate} schedulings={schedulings} dailyExecutions={dailyExecutions} cards={cards} loading={initialLoading} onExecute={handleExecute} onEditExecution={handleEditExecution} onEditScheduling={handleEditScheduling} />}
              {view === 'day' && <DayView currentDate={currentDate} schedulings={schedulings} dailyExecutions={dailyExecutions} cards={cards} routines={routines} loading={initialLoading} onExecute={handleExecute} onAddExecution={handleAddExecution} onEditExecution={handleEditExecution} onCloneYesterday={handleCloneYesterday} onToggleRoutineStatus={handleToggleRoutineStatus} onAddRoutine={handleAddRoutine} onEditRoutine={handleEditRoutine} onEditScheduling={handleEditScheduling} />}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <ExecuteTodayModal
        isOpen={isExecuteModalOpen}
        onClose={() => setIsExecuteModalOpen(false)}
        data={executeData}
        currentDate={currentDate}
        onSuccess={refreshExecutions}
      />

      {/* Floating Action Button */}
      {(view === 'month' || view === 'week') && (
        <motion.div
          className="fixed right-6 top-1/2 -translate-y-1/2 flex flex-col gap-4 z-50"
          initial={{ x: 100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setIsCreateModalOpen(true)}
            className="w-16 h-16 rounded-full backdrop-blur-xl flex items-center justify-center transition-all relative group"
            style={{
              background: 'rgba(34, 197, 94, 0.15)',
              border: '2px solid rgba(34, 197, 94, 0.5)',
              boxShadow: '0 4px 20px rgba(34, 197, 94, 0.5)'
            }}
          >
            <Plus className="w-8 h-8 relative z-10" style={{ color: '#22c55e' }} />
            <div className="absolute right-full mr-4 bg-black/80 px-3 py-1 rounded text-sm text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none border border-white/10">
              Novo Agendamento
            </div>
          </motion.button>
        </motion.div>
      )}

      <CreateSchedulingModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        currentDate={currentDate}
        onSuccess={refreshSchedulings}
      />

      {/* Edit Scheduling (same modal in edit mode) */}
      <CreateSchedulingModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        currentDate={currentDate}
        onSuccess={refreshSchedulings}
        scheduling={editScheduling}
        onExecuteToday={handleExecuteFromEdit}
      />

      <ExecutionModal
        isOpen={isExecutionModalOpen}
        onClose={() => setIsExecutionModalOpen(false)}
        execution={selectedExecution}
        currentDate={currentDate}
        onSuccess={() => { refreshExecutions(); fetchRoutinesForDate(currentDate); }}
      />

      <RoutineModal
        isOpen={isRoutineModalOpen}
        onClose={() => setIsRoutineModalOpen(false)}
        routine={selectedRoutine}
        onSuccess={() => { fetchRoutinesForDate(currentDate); }}
      />
    </div>
  );
}
