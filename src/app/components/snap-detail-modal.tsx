import { X, Calendar, Hash, Edit2, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Tag } from './tag';

import { Snap } from '@/services/api';

interface SnapDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  snap: Snap | null;
  onEdit?: (snapId: string) => void;
  onDelete?: (snapId: string) => void;
}

export function SnapDetailModal({ isOpen, onClose, snap, onEdit, onDelete }: SnapDetailModalProps) {
  if (!snap) return null;

  const tags = (snap.snadds?.labels || []).map(label => ({ label, variant: 'blue' as const }));

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50"
            style={{
              backgroundColor: 'rgba(0, 0, 0, 0.7)',
              backdropFilter: 'blur(20px)'
            }}
          />

          {/* Modal */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="w-full max-w-3xl max-h-[90vh] pointer-events-auto relative overflow-hidden"
            >
              {/* Modal Container */}
              <div
                className="rounded-2xl backdrop-blur-[40px] flex flex-col"
                style={{
                  background: 'rgba(10, 10, 10, 0.95)',
                  border: '1px solid transparent',
                  backgroundImage: 'linear-gradient(rgba(10, 10, 10, 0.95), rgba(10, 10, 10, 0.95)), linear-gradient(135deg, #00D4FF, #A855F7)',
                  backgroundOrigin: 'border-box',
                  backgroundClip: 'padding-box, border-box',
                  boxShadow: '0 20px 60px rgba(0, 0, 0, 0.8), 0 0 80px rgba(0, 212, 255, 0.2)',
                  maxHeight: '90vh'
                }}
              >
                {/* Glow Effect */}
                <div
                  className="absolute inset-0 opacity-20 pointer-events-none"
                  style={{
                    background: 'radial-gradient(circle at top, rgba(0, 212, 255, 0.3), transparent 60%)'
                  }}
                />

                {/* Header */}
                <div className="relative z-10 p-6 border-b border-white/10">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1 pr-4">
                      <h2
                        className="text-2xl font-bold mb-2"
                        style={{ color: 'var(--snaps-text-primary)' }}
                      >
                        {snap.name || 'Untitled Snap'}
                      </h2>

                      {/* Meta Info */}
                      <div className="flex items-center gap-4 text-sm">
                        <span
                          className="flex items-center gap-1.5"
                          style={{ color: 'var(--snaps-text-secondary)' }}
                        >
                          <Calendar className="w-4 h-4" />
                          {new Date(snap.created_at).toLocaleDateString()}
                        </span>
                        {/* 
                        {snap.project && (
                          <span 
                            className="px-2 py-1 rounded text-xs"
...
                          >
                            {snap.project}
                          </span>
                        )}
                        */}
                      </div>
                    </div>

                    <motion.button
                      whileHover={{ scale: 1.1, rotate: 90 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={onClose}
                      className="w-9 h-9 rounded-lg flex items-center justify-center transition-all"
                      style={{
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.1)'
                      }}
                    >
                      <X className="w-5 h-5" style={{ color: 'var(--snaps-text-secondary)' }} />
                    </motion.button>
                  </div>

                  {/* Tags */}
                  {tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {tags.map((tag, i) => (
                        <Tag key={i} variant={tag.variant}>
                          <Hash className="w-3 h-3" />
                          {tag.label}
                        </Tag>
                      ))}
                    </div>
                  )}
                </div>

                {/* Content Area */}
                <div
                  className="relative z-10 flex-1 overflow-y-auto p-6"
                  style={{
                    scrollbarWidth: 'thin',
                    scrollbarColor: 'rgba(0, 212, 255, 0.3) transparent'
                  }}
                >
                  <div
                    className="prose prose-invert max-w-none"
                    style={{
                      color: 'var(--snaps-text-primary)',
                      lineHeight: '1.8'
                    }}
                  >
                    <p style={{ whiteSpace: 'pre-wrap' }}>
                      {snap.content}
                    </p>
                  </div>
                </div>

                {/* Footer */}
                <div className="relative z-10 flex items-center justify-end gap-3 p-6 border-t border-white/10">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      onDelete?.(snap.id);
                      onClose();
                    }}
                    className="px-6 py-2.5 rounded-xl font-medium flex items-center gap-2 transition-all"
                    style={{
                      background: 'rgba(239, 68, 68, 0.1)',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      color: '#EF4444'
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      onEdit?.(snap.id);
                      onClose();
                    }}
                    className="px-6 py-2.5 rounded-xl font-medium flex items-center gap-2 transition-all"
                    style={{
                      background: 'linear-gradient(135deg, #00D4FF 0%, #0099CC 100%)',
                      border: '1px solid rgba(0, 212, 255, 0.3)',
                      color: 'white',
                      boxShadow: '0 4px 20px rgba(0, 212, 255, 0.4)'
                    }}
                  >
                    <Edit2 className="w-4 h-4" />
                    Edit
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
