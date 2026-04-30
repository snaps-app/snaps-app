import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
    FolderArchive,
    CheckSquare,
    Activity,
    CalendarPlus,
    FolderPlus,
    LayoutDashboard,
    Database,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { NeuralBackground } from './neural-background';
import api from '@/services/api';
import type { DashboardStats, DailyExecutionWithProject, RoutineWithStatus, Routine } from '@/services/api';
import { format } from 'date-fns';
import { CreateSchedulingModal } from './calendar/create-scheduling-modal';
import { ExecutionModal } from './calendar/execution-modal';
import { DailyExecutionTimeline } from './daily-execution-timeline';
import { RoutineModal } from './calendar/routine-modal';

export function DashboardView() {
    const navigate = useNavigate();
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [dailyExecutions, setDailyExecutions] = useState<DailyExecutionWithProject[]>([]);
    const [routines, setRoutines] = useState<RoutineWithStatus[]>([]);
    const [loading, setLoading] = useState(true);

    // Modals exactly like the ones in Calendar view
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isExecutionModalOpen, setIsExecutionModalOpen] = useState(false);
    const [selectedExecution, setSelectedExecution] = useState<DailyExecutionWithProject | null>(null);
    const [isRoutineModalOpen, setIsRoutineModalOpen] = useState(false);
    const [selectedRoutine, setSelectedRoutine] = useState<Routine | null>(null);

    const fetchDashboardData = async () => {
        try {
            setLoading(true);
            const todayStr = format(new Date(), 'yyyy-MM-dd');
            const [statsData, executionsData, routinesData] = await Promise.all([
                api.getDashboardStats(),
                api.getAllDailyExecutions(),
                api.getRoutinesForDate(todayStr)
            ]);

            setStats(statsData);

            const todayExecs = executionsData
                .filter(e => e.date === todayStr)
                .sort((a, b) => a.start_hour.localeCompare(b.start_hour));

            setDailyExecutions(todayExecs);
            setRoutines(routinesData);
        } catch (error) {
            console.error("Error fetching dashboard data:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const handleEditExecution = (execution: DailyExecutionWithProject) => {
        setSelectedExecution(execution);
        setIsExecutionModalOpen(true);
    };

    const handleAddExecution = () => {
        setSelectedExecution(null);
        setIsExecutionModalOpen(true);
    };

    const handleCloneYesterday = async () => {
        await api.cloneYesterdayExecutions();
        await fetchDashboardData();
    };

    const handleToggleRoutineStatus = async (routineId: string, date: string, newStatus: string) => {
        await api.setRoutineCompletion(routineId, date, newStatus);
        const todayStr = format(new Date(), 'yyyy-MM-dd');
        const updated = await api.getRoutinesForDate(todayStr);
        setRoutines(updated);
    };

    const handleAddRoutine = () => {
        setSelectedRoutine(null);
        setIsRoutineModalOpen(true);
    };

    const handleEditRoutine = (routine: RoutineWithStatus) => {
        setSelectedRoutine(routine);
        setIsRoutineModalOpen(true);
    };

    const handleRunMigrations = async () => {
        if (!confirm('Are you sure you want to run database migrations?')) return;
        try {
            await api.applyMigrations();
            alert('Migrations applied successfully!');
        } catch (error) {
            console.error('Migration failed:', error);
            alert('Failed to apply migrations. Check console for details.');
        }
    };

    const statCards = [
        { title: 'Total Projects', value: stats?.total_projects || 0, icon: FolderArchive, color: '#00D4FF' },
        { title: 'Total Cards', value: stats?.total_cards || 0, icon: LayoutDashboard, color: '#A855F7' },
        { title: 'Total Tasks', value: stats?.total_tasks || 0, icon: CheckSquare, color: '#22C55E' },
        { title: 'Total Snaps', value: stats?.total_snaps || 0, icon: Activity, color: '#F43F5E' },
    ];

    return (
        <div className="min-h-screen relative overflow-hidden flex flex-col" style={{ backgroundColor: 'var(--snaps-bg)' }}>
            <NeuralBackground />

            <div className="relative z-10 flex flex-col h-screen p-6 overflow-y-auto">
                <div className="flex items-center justify-between mb-8 backdrop-blur-xl bg-white/5 border border-white/10 p-4 rounded-2xl w-full max-w-[1400px] mx-auto">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#00D4FF] to-[#A855F7] flex items-center justify-center shadow-lg shadow-purple-500/20">
                            <LayoutDashboard className="w-6 h-6 text-white" />
                        </div>
                        <h1 className="text-3xl font-bold" style={{ color: 'var(--snaps-text-primary)' }}>
                            Dashboard
                        </h1>
                    </div>
                </div>

                <div className="flex-1 w-full max-w-[1400px] mx-auto space-y-8 pb-12">

                    {/* Row 1: Totals Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {statCards.map((stat, idx) => (
                            <motion.div
                                key={stat.title}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.4, delay: idx * 0.1 }}
                            >
                                <div className="bg-black/40 backdrop-blur-md border border-white/10 rounded-2xl p-6 flex flex-col gap-4 shadow-xl relative overflow-hidden group">
                                    <div className="absolute right-0 top-0 w-32 h-32 bg-gradient-to-br opacity-5 rounded-full -mr-10 -mt-10 transition-transform group-hover:scale-150" style={{ backgroundImage: `linear-gradient(to bottom right, ${stat.color}, transparent)` }} />
                                    <div className="flex items-center justify-between relative z-10">
                                        <span className="text-zinc-400 font-medium">{stat.title}</span>
                                        <stat.icon className="w-5 h-5" style={{ color: stat.color }} />
                                    </div>
                                    <div className="text-4xl font-bold text-white relative z-10">
                                        {loading ? (
                                            <div className="h-10 w-24 bg-white/5 animate-pulse rounded-lg border border-white/5" />
                                        ) : stat.value}
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>

                    {/* Row 2: Quick Action Buttons */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: 0.4 }}
                        className="flex flex-wrap gap-4"
                    >
                        <button
                            onClick={() => navigate('/new-project')}
                            className="px-5 py-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-white font-medium flex items-center gap-2 transition-all shadow-lg text-sm"
                        >
                            <FolderPlus className="w-4 h-4 text-[#00D4FF]" /> Add Project
                        </button>
                        <button
                            onClick={() => navigate('/global-board')}
                            className="px-5 py-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-white font-medium flex items-center gap-2 transition-all shadow-lg text-sm"
                        >
                            <LayoutDashboard className="w-4 h-4 text-[#A855F7]" /> Add Card
                        </button>
                        <button
                            onClick={() => navigate('/')} /* Ideally a central snap area */
                            className="px-5 py-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-white font-medium flex items-center gap-2 transition-all shadow-lg text-sm"
                        >
                            <Activity className="w-4 h-4 text-[#F43F5E]" /> Add Snap
                        </button>
                        <button
                            onClick={() => setIsCreateModalOpen(true)}
                            className="px-5 py-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-white font-medium flex items-center gap-2 transition-all shadow-lg text-sm"
                        >
                            <CalendarPlus className="w-4 h-4 text-[#22C55E]" /> Add Scheduling
                        </button>
                        <button
                            onClick={handleRunMigrations}
                            className="px-5 py-3 rounded-xl bg-orange-500/10 border border-orange-500/30 hover:bg-orange-500/20 text-orange-400 font-medium flex items-center gap-2 transition-all shadow-lg text-sm"
                        >
                            <Database className="w-4 h-4 text-orange-400" /> Run Migrations
                        </button>
                    </motion.div>

                    {/* Row 3: Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-[600px]">

                        {/* Left Column: Boards List */}
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.4, delay: 0.5 }}
                            className="flex flex-col bg-black/40 backdrop-blur-md rounded-2xl border border-white/10 shadow-2xl p-6 h-full"
                        >
                            <div className="flex items-center gap-3 mb-6">
                                <LayoutDashboard className="w-5 h-5 text-purple-400" />
                                <h2 className="text-xl font-bold text-white">Recent Boards</h2>
                                {!loading && stats?.recent_boards && (
                                    <span className="text-xs bg-white/10 text-zinc-300 px-2 py-0.5 rounded-full">{stats.recent_boards.length}</span>
                                )}
                            </div>

                            <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-3 pr-2">
                                {loading ? (
                                    <>
                                        {[1, 2, 3, 4].map(i => (
                                            <div key={i} className="bg-white/5 border border-white/10 p-4 rounded-xl flex items-center justify-between animate-pulse">
                                                <div className="flex flex-col gap-2 flex-1">
                                                    <div className="h-4 w-32 bg-white/10 rounded" />
                                                    <div className="h-3 w-16 bg-white/5 rounded" />
                                                </div>
                                                <div className="w-8 h-8 rounded-full bg-white/5" />
                                            </div>
                                        ))}
                                    </>
                                ) : stats?.recent_boards && stats.recent_boards.length > 0 ? (
                                    stats.recent_boards.map(board => (
                                        <div
                                            key={board.id}
                                            onClick={() => navigate(`/project/${board.project_id}/board/${board.id}`)}
                                            className="bg-white/5 border border-white/10 p-4 rounded-xl flex items-center justify-between hover:bg-white/10 transition-colors cursor-pointer group"
                                        >
                                            <div className="flex flex-col gap-1 min-w-0">
                                                <h3 className="font-semibold text-zinc-200 group-hover:text-purple-300 transition-colors truncate">{board.name}</h3>
                                                <div className="flex items-center gap-2 text-[10px] uppercase font-bold text-zinc-500">
                                                    <span
                                                        className="px-2 py-0.5 rounded-full border border-white/5"
                                                        style={board.color ? { backgroundColor: `${board.color}20`, color: board.color, borderColor: `${board.color}30` } : { backgroundColor: 'rgba(255,255,255,0.05)' }}
                                                    >
                                                        {board.project_name}
                                                    </span>
                                                    {board.code && <span className="text-purple-400/80">{board.code}</span>}
                                                </div>
                                            </div>
                                            <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-purple-500/20 transition-colors">
                                                <LayoutDashboard className="w-4 h-4 text-zinc-400 group-hover:text-purple-400" />
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-zinc-500 text-sm flex-1 flex items-center justify-center italic">No boards found</div>
                                )}
                            </div>
                        </motion.div>

                        {/* Right Column: Daily Executions Component */}
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.4, delay: 0.6 }}
                            className="h-full"
                        >
                            <DailyExecutionTimeline
                                executions={dailyExecutions}
                                routines={routines}
                                loading={loading}
                                onAddExecution={handleAddExecution}
                                onEditExecution={handleEditExecution}
                                onCloneYesterday={handleCloneYesterday}
                                onToggleRoutineStatus={handleToggleRoutineStatus}
                                onEditRoutine={handleEditRoutine}
                                onAddRoutine={handleAddRoutine}
                                date={format(new Date(), 'yyyy-MM-dd')}
                                className="h-full"
                            />
                        </motion.div>
                    </div>
                </div>
            </div>

            <CreateSchedulingModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                currentDate={new Date()}
                onSuccess={fetchDashboardData}
            />

            <ExecutionModal
                isOpen={isExecutionModalOpen}
                onClose={() => setIsExecutionModalOpen(false)}
                execution={selectedExecution}
                currentDate={new Date()}
                onSuccess={fetchDashboardData}
            />

            <RoutineModal
                isOpen={isRoutineModalOpen}
                onClose={() => setIsRoutineModalOpen(false)}
                routine={selectedRoutine}
                onSuccess={fetchDashboardData}
            />
        </div>
    );
}
