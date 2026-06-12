import { motion, AnimatePresence } from 'motion/react';
import { X, Bot, Send } from 'lucide-react';

interface PlannerPanelProps {
  isOpen: boolean;
  onClose: () => void;
  plannerInput: string;
  setPlannerInput: (val: string) => void;
}

export function PlannerPanel({
  isOpen,
  onClose,
  plannerInput,
  setPlannerInput
}: PlannerPanelProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
          />

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
                    <h2 className="text-xl font-bold text-white">Planner Agent</h2>
                    <p className="text-sm text-gray-400">Talk to your board</p>
                  </div>
                </div>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={onClose}
                  className="w-9 h-9 rounded-lg flex items-center justify-center transition-all bg-white/5 border border-white/10"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </motion.button>
              </div>
            </div>

            <div className="flex-1 p-6 overflow-y-auto">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <div
                  className="p-4 rounded-2xl backdrop-blur-xl bg-orange-500/10 border border-orange-500/30"
                >
                  <p className="text-sm text-white leading-relaxed">
                    Hi! I'm your Planner Agent. I can help you organize tasks, suggest priorities, and optimize your workflow. What would you like to plan?
                  </p>
                </div>
              </motion.div>
            </div>

            <div className="p-6 border-t border-white/10">
              <div
                className="relative rounded-2xl backdrop-blur-xl bg-white/5 border border-white/10 shadow-2xl"
              >
                <input
                  type="text"
                  value={plannerInput}
                  onChange={(e) => setPlannerInput(e.target.value)}
                  placeholder="Ask the planner..."
                  className="w-full px-6 py-4 bg-transparent text-sm text-white focus:outline-none"
                />
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  disabled={!plannerInput.trim()}
                  className={`absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                    plannerInput.trim() ? 'bg-gradient-to-br from-orange-500 to-orange-600 shadow-lg shadow-orange-500/40' : 'bg-white/5 opacity-50'
                  }`}
                >
                  <Send className="w-5 h-5 text-white" />
                </motion.button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
