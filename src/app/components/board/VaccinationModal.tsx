import type { Card } from '@/services/types';
import { motion, AnimatePresence } from 'motion/react';
import { Zap, Edit2, Check } from 'lucide-react';

interface VaccinationModalProps {
  isOpen: boolean;
  onClose: () => void;
  vaccinationCard: Card | null;
  vaccinationContent: string;
  setVaccinationContent: (val: string) => void;
  handleVaccinate: () => Promise<void>;
  isVaccinating: boolean;
}

export function VaccinationModal({
  isOpen,
  onClose,
  vaccinationCard,
  vaccinationContent,
  setVaccinationContent,
  handleVaccinate,
  isVaccinating
}: VaccinationModalProps) {
  return (
    <AnimatePresence>
      {isOpen && vaccinationCard && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-6">
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="bg-[#0A0A0A] border border-red-500/30 rounded-2xl w-full max-w-xl p-8 shadow-[0_0_50px_rgba(239,68,68,0.2)] flex flex-col relative overflow-hidden"
          >
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-red-500/10 blur-[100px]" />
            
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center border border-red-500/40 shadow-[0_0_15px_rgba(239,68,68,0.3)]">
                <Zap className="w-6 h-6 text-red-500" />
              </div>
              <div>
                <h2 className="text-2xl font-black text-white tracking-tight uppercase">Vacinação de Bug</h2>
                <p className="text-zinc-500 text-sm font-medium">Converta esta resolução em memória agêntica</p>
              </div>
            </div>

            <div className="space-y-4 mb-8">
              <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">Bug</p>
                <h3 className="text-white font-bold">{vaccinationCard.title}</h3>
                {vaccinationCard.code && <span className="text-[10px] font-mono text-red-400/70">{vaccinationCard.code}</span>}
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                  <Edit2 className="w-3 h-3" />
                  Resolução Técnica (Lesson Learned)
                </label>
                <textarea
                  autoFocus
                  value={vaccinationContent}
                  onChange={(e) => setVaccinationContent(e.target.value)}
                  placeholder="Descreva como o bug foi resolvido e o que o agente deve saber para evitar que aconteça novamente..."
                  className="w-full h-40 bg-black/40 border border-white/10 rounded-xl p-4 text-sm text-zinc-200 focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/20 transition-all resize-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                onClick={onClose}
                className="px-6 py-2.5 rounded-xl text-zinc-400 hover:text-white font-bold transition-colors"
              >
                Ignorar
              </button>
              <button
                onClick={handleVaccinate}
                disabled={!vaccinationContent.trim() || isVaccinating}
                className="px-8 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white font-black shadow-[0_0_20px_rgba(239,68,68,0.4)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-all transform hover:scale-105"
              >
                {isVaccinating ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Check className="w-5 h-5" />
                    VACINAR AGORA
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
