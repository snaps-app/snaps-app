import { motion } from 'motion/react';
import { Sparkles } from 'lucide-react';
import { Card } from '@/app/components/shared/card';

export interface ReferencedSnap {
  id: string;
  title: string;
  content: string;
  isActive: boolean;
  tags: Array<{ label: string; variant: 'blue' | 'orange' | 'purple' | 'green' | 'pink' }>;
  timestamp: string;
}

interface ReferencedSnapCardProps {
  snap: ReferencedSnap;
  index: number;
  onClick: () => void;
}

export function ReferencedSnapCard({ snap, index, onClick }: ReferencedSnapCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3, delay: index * 0.1 }}
    >
      <Card
        size="compact"
        className="cursor-pointer relative"
        style={{
          background: snap.isActive
            ? 'rgba(0, 212, 255, 0.08)'
            : 'rgba(255, 255, 255, 0.03)',
          backdropFilter: 'blur(20px)',
          border: snap.isActive
            ? '1px solid rgba(0, 212, 255, 0.3)'
            : '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: snap.isActive
            ? '0 0 30px rgba(0, 212, 255, 0.3)'
            : 'none'
        }}
        onClick={onClick}
      >
        {/* Active Synapse Pulse */}
        {snap.isActive && (
          <motion.div
            className="absolute -top-1 -right-1 w-3 h-3 rounded-full"
            style={{ background: 'var(--snaps-accent-blue)' }}
            animate={{
              scale: [1, 1.5, 1],
              opacity: [1, 0.5, 1]
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'easeInOut'
            }}
          />
        )}

        <p
          className="text-sm leading-relaxed"
          style={{
            color: snap.isActive
              ? 'var(--snaps-text-primary)'
              : 'var(--snaps-text-secondary)'
          }}
        >
          {snap.content}
        </p>

        {snap.isActive && (
          <div className="mt-3 pt-3 border-t border-white/10">
            <span
              className="text-xs flex items-center gap-2"
              style={{ color: 'var(--snaps-accent-blue)' }}
            >
              <Sparkles className="w-3 h-3" />
              Active in conversation
            </span>
          </div>
        )}
      </Card>
    </motion.div>
  );
}
