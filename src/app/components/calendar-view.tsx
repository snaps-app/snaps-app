import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { format, addMonths, subMonths, addWeeks, subWeeks, addDays, subDays } from 'date-fns';
import { NeuralBackground } from './neural-background';
import { MonthView } from './calendar/month-view';
import { WeekView } from './calendar/week-view';
import { DayView } from './calendar/day-view';
import { ExecuteTodayModal, type ExecuteTodayData } from './calendar/execute-today-modal';
import { CreateSchedulingModal } from './calendar/create-scheduling-modal';
import { ExecutionModal } from './calendar/execution-modal';
import { RoutineModal } from './calendar/routine-modal';
import { getAllSchedulings, getAllDailyExecutions, getAllCards, cloneYesterdayExecutions, getRoutinesForDate, setRoutineCompletion } from '@/services/api';
import type { SchedulingWithProject, DailyExecutionWithProject, CardWithProject, RoutineWithStatus, Routine } from '@/services/api';

type ViewMode = 'month' | 'week' | 'day';

export function CalendarView() {
  const [view, setView] = useState<ViewMode>('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [schedulings, setSchedulings] = useState<SchedulingWithProject[]>([]);
  const [dailyExecutions, setDailyExecutions] = useState<DailyExecutionWithProject[]>([]);
  const [cards, setCards] = useState<CardWithProject[]>([]);
  const [routines, setRoutines] = useState<RoutineWithStatus[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [executeData, setExecuteData] = useState<ExecuteTodayData | null>(null);
  const [isExecuteModalOpen, setIsExecuteModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isExecutionModalOpen, setIsExecutionModalOpen] = useState(false);
  const [selectedExecution, setSelectedExecution] = useState<DailyExecutionWithProject | null>(null);
  const [isRoutineModalOpen, setIsRoutineModalOpen] = useState(false);
  const [selectedRoutine, setSelectedRoutine] = useState<Routine | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [schedData, execData, cardData] = await Promise.all([
        getAllSchedulings(),
        getAllDailyExecutions(),
        getAllCards()
      ]);

      // Deduplicate by ID to prevent overlap glitches and React key collisions
      const uniqueScheds = Array.isArray(schedData) 
        ? Array.from(new Map(schedData.map(s => [s.id, s])).values())
        : [];
        
      const uniqueExecs = Array.isArray(execData)
        ? Array.from(new Map(execData.map(de => [de.id, de])).values())
        : [];
        
      if (!Array.isArray(schedData) || !Array.isArray(execData)) {
          console.warn("Calendar data mismatch:", { schedData, execData });
      }

      setSchedulings(uniqueScheds);
      setDailyExecutions(uniqueExecs);
      setCards(Array.isArray(cardData) ? cardData : []);
    } catch (error) {
      console.error("Error fetching calendar data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleExecute = (data: ExecuteTodayData) => {
    setExecuteData(data);
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
    await fetchData();
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

  // Fetch routines when view or date changes
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
              {view === 'month' && <MonthView currentDate={currentDate} schedulings={schedulings} cards={cards} loading={loading} onExecute={handleExecute} />}
              {view === 'week' && <WeekView currentDate={currentDate} schedulings={schedulings} dailyExecutions={dailyExecutions} cards={cards} loading={loading} onExecute={handleExecute} onEditExecution={handleEditExecution} />}
              {view === 'day' && <DayView currentDate={currentDate} schedulings={schedulings} dailyExecutions={dailyExecutions} cards={cards} routines={routines} loading={loading} onExecute={handleExecute} onAddExecution={handleAddExecution} onEditExecution={handleEditExecution} onCloneYesterday={handleCloneYesterday} onToggleRoutineStatus={handleToggleRoutineStatus} onAddRoutine={handleAddRoutine} onEditRoutine={handleEditRoutine} />}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <ExecuteTodayModal
        isOpen={isExecuteModalOpen}
        onClose={() => setIsExecuteModalOpen(false)}
        data={executeData}
        currentDate={currentDate}
        onSuccess={fetchData}
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
        onSuccess={fetchData}
      />

      <ExecutionModal
        isOpen={isExecutionModalOpen}
        onClose={() => setIsExecutionModalOpen(false)}
        execution={selectedExecution}
        currentDate={currentDate}
        onSuccess={() => { fetchData(); fetchRoutinesForDate(currentDate); }}
      />

      <RoutineModal
        isOpen={isRoutineModalOpen}
        onClose={() => setIsRoutineModalOpen(false)}
        routine={selectedRoutine}
        onSuccess={() => { fetchData(); fetchRoutinesForDate(currentDate); }}
      />
    </div>
  );
}
