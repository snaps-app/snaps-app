import { motion } from 'motion/react';
import { Calendar as CalendarIcon } from 'lucide-react';
import { NeuralBackground } from './neural-background';

export function CalendarView() {
  return (
    <div className="min-h-screen relative overflow-hidden" style={{ backgroundColor: 'var(--snaps-bg)' }}>
      <NeuralBackground />
      
      <div className="relative z-10 flex flex-col items-center justify-center h-screen p-8 text-center">
        <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="p-8 rounded-3xl backdrop-blur-xl border border-white/10"
            style={{ background: 'rgba(255, 255, 255, 0.03)' }}
        >
            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-[#00D4FF] to-[#A855F7] flex items-center justify-center shadow-lg shadow-purple-500/20">
                <CalendarIcon className="w-10 h-10 text-white" />
            </div>
            
            <h1 className="text-3xl font-bold mb-4" style={{ color: 'var(--snaps-text-primary)' }}>
                Calendar
            </h1>
            
            <p className="text-lg text-zinc-400 max-w-md">
                This feature is currently under development. Soon you'll be able to visualize your project timelines here.
            </p>
        </motion.div>
      </div>
    </div>
  );
}
