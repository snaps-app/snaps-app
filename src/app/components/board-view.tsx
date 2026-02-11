import { useEffect, useState } from 'react';
import { Settings, FolderOpen, Zap, Bot, ArrowLeft, X, Send, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { Card as CardComponent } from './card';
import { NeuralBackground } from './neural-background';
import { CardModal } from './card-modal';
import api, { Card, Board } from '@/services/api';

interface BoardViewProps {
  projectId: string | null;
  onBack?: () => void;
}

interface TaskCardProps {
  task: Card;
  onMove: (taskId: string, newStatus: 'todo' | 'inprogress' | 'done') => void;
  onClick: (task: Card) => void;
}

function TaskCard({ task, onMove, onClick }: TaskCardProps) {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: 'TASK',
    item: { id: task.id, status: task.status },
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging()
    })
  }));

  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.div
      ref={drag as any}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: isDragging ? 0.5 : 1, scale: 1 }}
      whileHover={{ scale: 1.02, y: -2 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      onClick={() => onClick(task)}
      className="cursor-move mb-3"
    >
      <CardComponent
        size="compact"
        style={{
          background: 'rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          position: 'relative'
        }}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <h3
              className="font-semibold mb-2"
              style={{ color: 'var(--snaps-text-primary)', fontSize: '14px' }}
            >
              {task.title}
            </h3>
            <p
              className="text-xs mb-2"
              style={{ color: 'var(--snaps-text-secondary)', lineHeight: '1.5' }}
            >
              {task.description}
            </p>

            {/* Meta Info */}
            <div className="flex items-center gap-2 mt-2">
              {task.priority && (
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded border ${task.priority === 'High' ? 'border-red-500/50 text-red-400 bg-red-500/10' :
                      task.priority === 'Medium' ? 'border-yellow-500/50 text-yellow-400 bg-yellow-500/10' :
                        'border-green-500/50 text-green-400 bg-green-500/10'
                    }`}
                >
                  {task.priority}
                </span>
              )}
              {task.labels && task.labels.length > 0 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded border border-blue-500/50 text-blue-400 bg-blue-500/10">
                  {task.labels.length} tags
                </span>
              )}
            </div>
          </div>

          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-all relative"
            style={{
              background: isHovered
                ? 'rgba(255, 215, 0, 0.15)'
                : 'rgba(255, 215, 0, 0.05)',
              border: '1px solid rgba(255, 215, 0, 0.3)'
            }}
          >
            {isHovered && (
              <motion.div
                className="absolute inset-0 rounded-lg"
                style={{
                  background: 'rgba(255, 215, 0, 0.2)',
                  boxShadow: '0 0 20px rgba(255, 215, 0, 0.6)'
                }}
                animate={{
                  opacity: [0.5, 1, 0.5],
                  scale: [1, 1.1, 1]
                }}
                transition={{
                  duration: 0.6,
                  repeat: Infinity,
                  ease: 'easeInOut'
                }}
              />
            )}
            <Zap
              className="w-4 h-4 relative z-10"
              style={{
                color: isHovered ? '#FFD700' : 'rgba(255, 215, 0, 0.7)',
                filter: isHovered ? 'drop-shadow(0 0 8px rgba(255, 215, 0, 0.8))' : 'none'
              }}
            />
          </motion.button>
        </div>
      </CardComponent>
    </motion.div>
  );
}

interface ColumnProps {
  title: string;
  status: 'todo' | 'inprogress' | 'done';
  tasks: Card[];
  onMove: (taskId: string, newStatus: 'todo' | 'inprogress' | 'done') => void;
  onCardClick: (card: Card) => void;
  color: string;
}

function Column({ title, status, tasks, onMove, onCardClick, color }: ColumnProps) {
  const [{ isOver }, drop] = useDrop(() => ({
    accept: 'TASK',
    drop: (item: { id: string; status: string }) => {
      if (item.status !== status) {
        onMove(item.id, status as 'todo' | 'inprogress' | 'done');
      }
    },
    collect: (monitor) => ({
      isOver: !!monitor.isOver()
    })
  }));

  return (
    <div
      ref={drop as any}
      className="flex-1 min-w-[300px]"
    >
      <div
        className="p-4 rounded-t-xl backdrop-blur-xl border-b-2 relative overflow-hidden"
        style={{
          background: `rgba(${color}, 0.1)`,
          borderColor: `rgba(${color}, 0.5)`,
          boxShadow: `0 0 20px rgba(${color}, 0.3)`
        }}
      >
        <div
          className="absolute inset-0 opacity-20"
          style={{
            background: `linear-gradient(135deg, rgba(${color}, 0.3), rgba(${color}, 0))`,
            filter: 'blur(20px)'
          }}
        />

        <div className="relative z-10 flex items-center justify-between">
          <h2
            className="text-lg font-bold"
            style={{
              color: `rgb(${color})`,
              textShadow: `0 0 10px rgba(${color}, 0.6)`
            }}
          >
            {title}
          </h2>
          <span
            className="text-sm px-2 py-1 rounded-full"
            style={{
              background: `rgba(${color}, 0.2)`,
              color: `rgb(${color})`,
              border: `1px solid rgba(${color}, 0.4)`
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
            ? `rgba(${color}, 0.08)`
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
              <TaskCard task={task} onMove={onMove} onClick={onCardClick} />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

export function BoardView({ projectId, onBack }: BoardViewProps) {
  const [tasks, setTasks] = useState<Card[]>([]);
  const [boardId, setBoardId] = useState<string | null>(null);
  const [project, setProject] = useState<any>(null);
  const [isPlannerOpen, setIsPlannerOpen] = useState(false);
  const [plannerInput, setPlannerInput] = useState('');

  // Card Modal State
  const [isCardModalOpen, setIsCardModalOpen] = useState(false);
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);

  const fetchBoard = async () => {
    if (!projectId) return;
    try {
      const board = await api.getProjectBoard(projectId);
      setBoardId(board.id);
      // Ensure cards are mapped correctly to Card type, if backend structure differs slightly adapt here
      // Assuming api.ts Card interface matches backend response
      setTasks(board.cards || []);
    } catch (error) {
      console.error('Failed to fetch board:', error);
    }
  };

  useEffect(() => {
    fetchBoard();
    if (projectId) {
      api.getProject(projectId).then(setProject);
    }
  }, [projectId]);

  const handleMove = async (taskId: string, newStatus: 'todo' | 'inprogress' | 'done') => {
    // Optimistic update
    setTasks(prev => prev.map(task =>
      task.id === taskId ? { ...task, status: newStatus } : task
    ));

    try {
      await api.updateCardStatus(taskId, newStatus);
    } catch (error) {
      console.error('Failed to update task status:', error);
      fetchBoard(); // Revert/Refresh on error
    }
  };

  const handleCreateCard = () => {
    setSelectedCard(null);
    setIsCardModalOpen(true);
  };

  const handleEditCard = (card: Card) => {
    setSelectedCard(card);
    setIsCardModalOpen(true);
  };

  const handleSaveCard = async (cardData: Partial<Card>) => {
    if (!boardId) return;

    try {
      if (selectedCard) {
        // Update
        await api.updateCard(selectedCard.id, cardData);
      } else {
        // Create
        if (cardData.title && cardData.status) {
          // description is optional but createCard expects Partial<Card> which is fine
          await api.createCard(boardId, {
            title: cardData.title,
            description: cardData.description || '',
            status: cardData.status,
            priority: cardData.priority,
            due_date: cardData.due_date,
            labels: cardData.labels
          });
        }
      }
      setIsCardModalOpen(false);
      fetchBoard();
    } catch (error) {
      console.error("Failed to save card:", error);
    }
  };

  const todoTasks = tasks.filter(t => t.status === 'todo');
  const inProgressTasks = tasks.filter(t => t.status === 'inprogress');
  const doneTasks = tasks.filter(t => t.status === 'done');

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="min-h-screen relative overflow-hidden" style={{ backgroundColor: 'var(--snaps-bg)' }}>
        {/* Neural Network Background */}
        <NeuralBackground />

        {/* Main Container */}
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
              <div className="flex items-center gap-3">
                {onBack && (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={onBack}
                    className="w-9 h-9 rounded-lg backdrop-blur-xl flex items-center justify-center transition-all"
                    style={{
                      background: 'rgba(255, 107, 53, 0.1)',
                      border: '1px solid rgba(255, 107, 53, 0.3)',
                      boxShadow: '0 2px 10px rgba(255, 107, 53, 0.2)'
                    }}
                  >
                    <ArrowLeft className="w-5 h-5" style={{ color: 'var(--snaps-accent-orange)' }} />
                  </motion.button>
                )}
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
                    Project Board
                  </h1>
                  <p className="text-sm" style={{ color: 'var(--snaps-text-secondary)' }}>
                    {project?.name || 'Second Brain Framework'}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Board Columns */}
          <div className="flex-1 overflow-x-auto p-6">
            <div className="flex gap-6 min-w-max">
              <Column
                title="To Do"
                status="todo"
                tasks={todoTasks}
                onMove={handleMove}
                onCardClick={handleEditCard}
                color="168, 85, 247" // Purple
              />
              <Column
                title="In Progress"
                status="inprogress"
                tasks={inProgressTasks}
                onMove={handleMove}
                onCardClick={handleEditCard}
                color="0, 212, 255" // Blue
              />
              <Column
                title="Done"
                status="done"
                tasks={doneTasks}
                onMove={handleMove}
                onCardClick={handleEditCard}
                color="34, 197, 94" // Green
              />
            </div>
          </div>
        </div>

        {/* Floating Action Buttons - Right Edge */}
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

        {/* Card Modal */}
        <CardModal
          isOpen={isCardModalOpen}
          onClose={() => setIsCardModalOpen(false)}
          onSave={handleSaveCard}
          initialData={selectedCard}
          boardId={boardId || undefined}
        />
      </div>
    </DndProvider>
  );
}
