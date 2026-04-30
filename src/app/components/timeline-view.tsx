import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { NeuralBackground } from './neural-background';
import { ArrowLeft, GitBranch, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion } from 'motion/react';
import api, { Sprint, Epic } from '@/services/api';
import { Spinner } from './ui/spinner';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths, isSameMonth, isWithinInterval, parseISO, startOfDay, differenceInDays, addDays } from 'date-fns';

const STATUS_COLORS: Record<string, string> = {
  planning: '#6366F1',
  active: '#22C55E',
  review: '#F59E0B',
  done: '#64748B',
};

const EPIC_COLORS = ['#00D4FF', '#A855F7', '#FF6B35', '#22C55E', '#EF4444', '#EC4899', '#F59E0B'];

interface GanttRow {
  id: string;
  label: string;
  color: string;
  start: Date | null;
  end: Date | null;
  status?: string;
  isEpic?: boolean;
}

function useWindowWidth() {
  const [w, setW] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);
  useEffect(() => {
    const h = () => setW(window.innerWidth);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);
  return w;
}

export function TimelineView() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();

  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [epics, setEpics] = useState<Epic[]>([]);
  const [viewMonth, setViewMonth] = useState(new Date());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      if (!projectId) return;
      setIsLoading(true);
      try {
        const [s, e] = await Promise.all([api.getSprints(projectId), api.getEpics(projectId)]);
        setSprints(s);
        setEpics(e);
        // Auto-navigate to the month that has the most recent active sprint
        const active = s.find(x => x.status === 'active');
        if (active?.start_date) setViewMonth(parseISO(active.start_date));
      } catch (error) {
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [projectId]);

  // Build month range: 3 months centred on viewMonth
  const monthStart = startOfMonth(viewMonth);
  const monthEnd = endOfMonth(addMonths(viewMonth, 2));
  const totalDays = differenceInDays(monthEnd, monthStart) + 1;

  const rows: GanttRow[] = useMemo(() => {
    const epicRows: GanttRow[] = epics.map((e, i) => ({
      id: `epic-${e.id}`,
      label: e.name,
      color: e.color || EPIC_COLORS[i % EPIC_COLORS.length],
      start: null,
      end: null,
      isEpic: true,
    }));

    const sprintRows: GanttRow[] = sprints.map((s, i) => ({
      id: `sprint-${s.id}`,
      label: s.name,
      color: STATUS_COLORS[s.status] ?? '#64748B',
      start: s.start_date ? parseISO(s.start_date) : null,
      end: s.end_date ? parseISO(s.end_date) : null,
      status: s.status,
    }));

    return [...epicRows, ...sprintRows];
  }, [sprints, epics]);

  const dayWidth = 28; // px per day
  const totalWidth = totalDays * dayWidth;

  const dayOffset = (date: Date) => Math.max(0, differenceInDays(startOfDay(date), monthStart));

  const months = [viewMonth, addMonths(viewMonth, 1), addMonths(viewMonth, 2)];

  return (
    <div className="min-h-screen relative overflow-hidden" style={{ backgroundColor: 'var(--snaps-bg)' }}>
      <NeuralBackground />

      <AnimatePresence>
        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-md"
          >
            <Spinner size="lg" label="Loading timeline..." color="blue" />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative z-10 h-screen flex flex-col max-w-7xl mx-auto p-6">
        {/* Header */}
        <motion.div
          className="p-6 border-b border-white/10 backdrop-blur-3xl rounded-3xl mb-6 flex items-center justify-between"
          style={{ backgroundColor: 'rgba(10, 10, 10, 0.6)' }}
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
        >
          <div className="flex items-center gap-4">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate(`/project/${projectId}`)}
              className="w-10 h-10 rounded-xl flex items-center justify-center bg-white/5 border border-white/10 text-white"
            >
              <ArrowLeft className="w-5 h-5" />
            </motion.button>
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                <GitBranch className="w-6 h-6 text-blue-400" />
                Roadmap Timeline
              </h1>
              <p className="text-gray-500 text-sm mt-0.5">Gantt view of sprints and epics</p>
            </div>
          </div>

          {/* Month navigation */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setViewMonth(m => subMonths(m, 1))}
              className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-all"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-white font-medium min-w-[120px] text-center">
              {format(viewMonth, 'MMM yyyy')}
            </span>
            <button
              onClick={() => setViewMonth(m => addMonths(m, 1))}
              className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-all"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </motion.div>

        {/* Legend */}
        <div className="flex items-center gap-4 mb-4 flex-wrap">
          {Object.entries(STATUS_COLORS).map(([status, color]) => (
            <div key={status} className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: color }} />
              <span className="text-xs text-gray-400 capitalize">{status}</span>
            </div>
          ))}
        </div>

        {/* Gantt */}
        <motion.div
          className="flex-1 overflow-hidden rounded-2xl border border-white/10"
          style={{ backgroundColor: 'rgba(10, 10, 10, 0.6)' }}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="flex h-full">
            {/* Row Labels */}
            <div className="w-48 flex-shrink-0 border-r border-white/10">
              {/* Month header spacer */}
              <div className="h-10 border-b border-white/10" />
              {/* Day header spacer */}
              <div className="h-8 border-b border-white/10" />
              {/* Rows */}
              {rows.map(row => (
                <div
                  key={row.id}
                  className="h-10 flex items-center px-4 border-b border-white/5"
                >
                  <div
                    className="w-2 h-2 rounded-full flex-shrink-0 mr-2"
                    style={{ backgroundColor: row.color }}
                  />
                  <span className={`text-xs truncate ${row.isEpic ? 'text-white font-semibold' : 'text-gray-300'}`}>
                    {row.label}
                  </span>
                </div>
              ))}
            </div>

            {/* Chart Area */}
            <div className="flex-1 overflow-x-auto">
              <div style={{ width: `${totalWidth}px`, minWidth: '100%' }}>
                {/* Month headers */}
                <div className="h-10 border-b border-white/10 flex">
                  {months.map(m => {
                    const mStart = startOfMonth(m);
                    const mEnd = endOfMonth(m);
                    const daysInMonth = differenceInDays(mEnd, mStart) + 1;
                    return (
                      <div
                        key={m.toISOString()}
                        className="flex items-center justify-center border-r border-white/10 text-xs font-semibold text-white flex-shrink-0"
                        style={{ width: `${daysInMonth * dayWidth}px` }}
                      >
                        {format(m, 'MMMM yyyy')}
                      </div>
                    );
                  })}
                </div>

                {/* Day headers */}
                <div className="h-8 border-b border-white/10 flex">
                  {Array.from({ length: totalDays }, (_, i) => {
                    const day = addDays(monthStart, i);
                    const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                    return (
                      <div
                        key={i}
                        className={`flex items-center justify-center text-[10px] border-r border-white/5 flex-shrink-0 ${isWeekend ? 'text-gray-600' : 'text-gray-500'}`}
                        style={{ width: `${dayWidth}px` }}
                      >
                        {day.getDate() === 1 || i === 0 ? day.getDate() : day.getDate() % 5 === 0 ? day.getDate() : ''}
                      </div>
                    );
                  })}
                </div>

                {/* Rows */}
                {rows.map(row => {
                  const hasBar = row.start && row.end;
                  const startOffset = row.start ? Math.max(0, dayOffset(row.start)) * dayWidth : 0;
                  const endOffset = row.end ? Math.min(totalDays, dayOffset(row.end) + 1) * dayWidth : 0;
                  const barWidth = hasBar ? Math.max(endOffset - startOffset, dayWidth) : 0;

                  return (
                    <div
                      key={row.id}
                      className="h-10 relative border-b border-white/5 flex items-center"
                      style={{ width: `${totalWidth}px` }}
                    >
                      {/* Weekend shading */}
                      {Array.from({ length: totalDays }, (_, i) => {
                        const day = addDays(monthStart, i);
                        const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                        return isWeekend ? (
                          <div
                            key={i}
                            className="absolute top-0 bottom-0 bg-white/[0.02]"
                            style={{ left: `${i * dayWidth}px`, width: `${dayWidth}px` }}
                          />
                        ) : null;
                      })}

                      {hasBar && (
                        <motion.div
                          initial={{ scaleX: 0, originX: 0 }}
                          animate={{ scaleX: 1 }}
                          transition={{ duration: 0.4, delay: 0.1 }}
                          className="absolute h-6 rounded-md flex items-center px-2 overflow-hidden"
                          style={{
                            left: `${startOffset}px`,
                            width: `${barWidth}px`,
                            backgroundColor: `${row.color}33`,
                            border: `1px solid ${row.color}66`,
                          }}
                        >
                          <span
                            className="text-[10px] font-medium truncate"
                            style={{ color: row.color }}
                          >
                            {row.label}
                          </span>
                        </motion.div>
                      )}

                      {!hasBar && (
                        <div className="absolute inset-0 flex items-center px-4">
                          <div className="w-full border-t border-dashed border-white/5" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {rows.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center text-gray-600">
              No sprints or epics found for this project.
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
