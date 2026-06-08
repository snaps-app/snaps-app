import { Rocket } from 'lucide-react';
import { useProjectRole } from '@/contexts/project-role-context';
import type { Card } from '@/services/types';

interface SprintMacroCardProps {
  card: Card;
  onClick: (card: Card) => void;
  onStartExecution?: (sprintId: string) => void;
}

export function SprintMacroCard({ card, onClick, onStartExecution }: SprintMacroCardProps) {
  const { can } = useProjectRole();

  return (
    <div
      className="relative rounded-xl overflow-hidden cursor-pointer select-none mb-3"
      style={{
        background: 'linear-gradient(135deg, rgba(139,92,246,0.08) 0%, rgba(0,212,255,0.05) 100%)',
      }}
      onClick={() => onClick(card)}
    >
      <div
        className="absolute inset-0 rounded-xl pointer-events-none"
        style={{ boxShadow: 'inset 0 0 0 2px rgba(139,92,246,0.5)' }}
      />

      <div className="p-4">
        <div className="flex items-center gap-1.5 mb-2">
          <Rocket className="w-3.5 h-3.5 text-purple-400" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-purple-400">
            Sprint Macro
          </span>
        </div>

        <h3 className="text-sm font-bold text-white leading-snug mb-2">
          {card.title}
        </h3>

        {card.description && (
          <p className="text-xs text-slate-400 mb-3 line-clamp-2">
            {card.description}
          </p>
        )}

        {can('write') && onStartExecution && card.sprint_id && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onStartExecution(card.sprint_id!);
            }}
            className="w-full mt-2 py-2 px-3 rounded-lg text-xs font-semibold text-white flex items-center justify-center gap-2 transition-all hover:opacity-90"
            style={{ background: 'linear-gradient(90deg, #8B5CF6, #00D4FF)' }}
          >
            <Rocket className="w-3.5 h-3.5" />
            Iniciar Execução da Sprint
          </button>
        )}
      </div>
    </div>
  );
}
