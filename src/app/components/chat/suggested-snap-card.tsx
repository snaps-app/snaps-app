import { motion } from 'motion/react';
import { Zap, Hash, Check } from 'lucide-react';
import { Card } from '@/app/components/shared/card';
import { Tag } from '@/app/components/shared/tag';

export interface SuggestedSnap {
  id: string;
  title: string;
  content: string;
  tags: Array<{ label: string; variant: 'blue' | 'orange' | 'purple' | 'green' | 'pink' }>;
  confidence: number;
  timestamp: string;
}

interface SuggestedSnapCardProps {
  snap: SuggestedSnap;
  index: number;
  onClick: () => void;
  onAccept: (e: React.MouseEvent) => void;
}

export function SuggestedSnapCard({ snap, index, onClick, onAccept }: SuggestedSnapCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.3, delay: index * 0.1 }}
    >
      <Card
        size="compact"
        className="relative cursor-pointer"
        style={{
          background: 'rgba(168, 85, 247, 0.05)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(168, 85, 247, 0.3)',
          boxShadow: '0 0 30px rgba(168, 85, 247, 0.2)'
        }}
        onClick={onClick}
      >
        {/* Confidence Badge */}
        <div
          className="absolute top-3 right-3 px-2 py-1 rounded-lg text-xs font-medium"
          style={{
            background: `rgba(168, 85, 247, ${snap.confidence * 0.3})`,
            border: '1px solid rgba(168, 85, 247, 0.5)',
            color: 'var(--snaps-accent-purple)'
          }}
        >
          {Math.round(snap.confidence * 100)}% match
        </div>

        {/* Snapper Badge */}
        <div className="flex items-center gap-2 mb-3">
          <Zap className="w-3 h-3" style={{ color: 'var(--snaps-accent-purple)' }} />
          <span className="text-xs font-medium" style={{ color: 'var(--snaps-accent-purple)' }}>
            Suggested by Snapper
          </span>
        </div>

        <h3
          className="font-semibold mb-2 pr-20"
          style={{ color: 'var(--snaps-text-primary)' }}
        >
          {snap.title}
        </h3>

        <p
          className="text-sm mb-3 leading-relaxed"
          style={{ color: 'var(--snaps-text-secondary)' }}
        >
          {snap.content}
        </p>

        {/* Tags */}
        <div className="flex flex-wrap gap-2 mb-4">
          {snap.tags.map((tag, i) => (
            <Tag key={i} variant={tag.variant}>
              <Hash className="w-3 h-3" />
              {tag.label}
            </Tag>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onAccept}
            className="flex-1 px-3 py-2 rounded-lg flex items-center justify-center gap-2 text-sm font-medium transition-all"
            style={{
              background: 'rgba(34, 197, 94, 0.2)',
              border: '1px solid rgba(34, 197, 94, 0.5)',
              color: 'var(--snaps-accent-green)'
            }}
          >
            <Check className="w-4 h-4" />
            Accept
          </motion.button>
        </div>
      </Card>
    </motion.div>
  );
}
