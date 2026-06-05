import { motion } from 'motion/react';
import { FileText, Download, Trash2, Eye, HardDrive, Clock, Zap, FileSpreadsheet, Image as ImageIcon, Edit2 } from 'lucide-react';
import type { GovernanceDoc } from '@/services/types';

export interface FileDocument {
  id: string;
  name: string;
  type: 'generated' | 'imported';
  format: 'md' | 'docx' | 'pdf' | 'txt' | 'xlsx' | 'png' | 'jpg';
  size: string;
  date: string;
  thumbnail?: string;
}

const formatIcons = {
  md: FileText,
  docx: FileText,
  pdf: FileText,
  txt: FileText,
  xlsx: FileSpreadsheet,
  png: ImageIcon,
  jpg: ImageIcon
};

const formatColors = {
  md: { bg: 'rgba(0, 212, 255, 0.1)', border: 'rgba(0, 212, 255, 0.3)', color: '#00D4FF' },
  docx: { bg: 'rgba(0, 112, 192, 0.1)', border: 'rgba(0, 112, 192, 0.3)', color: '#0070C0' },
  pdf: { bg: 'rgba(255, 59, 48, 0.1)', border: 'rgba(255, 59, 48, 0.3)', color: '#FF3B30' },
  txt: { bg: 'rgba(255, 255, 255, 0.1)', border: 'rgba(255, 255, 255, 0.2)', color: '#FFFFFF' },
  xlsx: { bg: 'rgba(34, 197, 94, 0.1)', border: 'rgba(34, 197, 94, 0.3)', color: '#22C55E' },
  png: { bg: 'rgba(168, 85, 247, 0.1)', border: 'rgba(168, 85, 247, 0.3)', color: '#A855F7' },
  jpg: { bg: 'rgba(168, 85, 247, 0.1)', border: 'rgba(168, 85, 247, 0.3)', color: '#A855F7' }
};

interface DocCardProps {
  doc?: GovernanceDoc;
  fileDoc?: FileDocument;
  index: number;
  onView: () => void;
  onEdit?: () => void;
  onDelete: () => void;
  onIngest?: (e: React.MouseEvent) => void;
  ingestingId?: string | null;
  ingestResult?: { docId: string; sprints: number; cards: number } | null;
}

export function DocCard({
  doc,
  fileDoc,
  index,
  onView,
  onEdit,
  onDelete,
  onIngest,
  ingestingId,
  ingestResult
}: DocCardProps) {
  if (doc) {
    const colors = { bg: 'rgba(34, 197, 94, 0.1)', border: 'rgba(34, 197, 94, 0.3)', color: '#22C55E' };
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3, delay: index * 0.05 }}
        whileHover={{ scale: 1.03, y: -4 }}
        className="relative rounded-xl backdrop-blur-xl overflow-hidden cursor-pointer group"
        style={{
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)'
        }}
      >
        <div className="flex items-center justify-center h-32 relative" style={{ background: colors.bg, borderBottom: `1px solid ${colors.border}` }}>
          <FileText className="w-16 h-16" style={{ color: colors.color }} />
          <div className="absolute top-3 right-3 px-2 py-1 rounded text-xs font-bold uppercase" style={{ background: colors.bg, border: `1px solid ${colors.border}`, color: colors.color }}>
            {doc.type}
          </div>
        </div>
        <div className="p-4">
          <h3 className="font-semibold mb-2 truncate" style={{ color: 'var(--snaps-text-primary)' }}>{doc.name}</h3>
          <div className="flex items-center justify-between text-xs mb-3">
            <span className="flex items-center gap-1" style={{ color: 'var(--snaps-text-secondary)' }}><HardDrive className="w-3 h-3" />MD</span>
            <span className="flex items-center gap-1" style={{ color: 'var(--snaps-text-secondary)' }}><Clock className="w-3 h-3" />{new Date(doc.created_at || Date.now()).toLocaleDateString()}</span>
          </div>
          <div className="flex items-center gap-2">
            <motion.button onClick={(e) => { e.stopPropagation(); onView(); }} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="flex-1 py-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1 transition-all" style={{ background: 'rgba(0, 212, 255, 0.1)', border: '1px solid rgba(0, 212, 255, 0.3)', color: 'var(--snaps-accent-blue)' }}>
              <Eye className="w-3 h-3" /> View
            </motion.button>
            {doc.type === 'roadmap' && onIngest && (
              <motion.button
                onClick={onIngest}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                disabled={ingestingId === doc.id}
                className="p-2 rounded-lg text-xs font-medium transition-all relative"
                style={{ background: 'rgba(168, 85, 247, 0.1)', border: '1px solid rgba(168, 85, 247, 0.3)', color: '#A855F7', opacity: ingestingId === doc.id ? 0.6 : 1 }}
                title="Ingerir Roadmap (Gerar Sprints e Cards)"
              >
                {ingestingId === doc.id
                  ? <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
                  : <Zap className="w-3 h-3" />}
                {ingestResult?.docId === doc.id && (
                  <span className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap bg-violet-900 border border-violet-500/40 text-violet-200 text-xs px-2 py-1 rounded-lg pointer-events-none">
                    ✓ {ingestResult.sprints}s · {ingestResult.cards}c
                  </span>
                )}
              </motion.button>
            )}
            {onEdit && (
              <motion.button onClick={(e) => { e.stopPropagation(); onEdit(); }} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="p-2 rounded-lg text-xs font-medium transition-all" style={{ background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.3)', color: 'var(--snaps-accent-green)' }}>
                <Edit2 className="w-3 h-3" />
              </motion.button>
            )}
            <motion.button onClick={(e) => { e.stopPropagation(); onDelete(); }} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="p-2 rounded-lg text-xs font-medium transition-all" style={{ background: 'rgba(255, 59, 48, 0.1)', border: '1px solid rgba(255, 59, 48, 0.3)', color: '#FF3B30' }}>
              <Trash2 className="w-3 h-3" />
            </motion.button>
          </div>
        </div>
      </motion.div>
    );
  }

  if (fileDoc) {
    const Icon = formatIcons[fileDoc.format];
    const colors = formatColors[fileDoc.format];
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3, delay: index * 0.05 }}
        whileHover={{ scale: 1.03, y: -4 }}
        className="relative rounded-xl backdrop-blur-xl overflow-hidden cursor-pointer group"
        style={{
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)'
        }}
      >
        <div className="flex items-center justify-center h-32 relative" style={{ background: colors.bg, borderBottom: `1px solid ${colors.border}` }}>
          <Icon className="w-16 h-16" style={{ color: colors.color }} />
          <div className="absolute top-3 right-3 px-2 py-1 rounded text-xs font-bold uppercase" style={{ background: colors.bg, border: `1px solid ${colors.border}`, color: colors.color }}>
            .{fileDoc.format}
          </div>
        </div>
        <div className="p-4">
          <h3 className="font-semibold mb-2 truncate" style={{ color: 'var(--snaps-text-primary)' }}>{fileDoc.name}</h3>
          <div className="flex items-center justify-between text-xs mb-3">
            <span className="flex items-center gap-1" style={{ color: 'var(--snaps-text-secondary)' }}><HardDrive className="w-3 h-3" />{fileDoc.size}</span>
            <span className="flex items-center gap-1" style={{ color: 'var(--snaps-text-secondary)' }}><Clock className="w-3 h-3" />{fileDoc.date}</span>
          </div>
          <div className="flex items-center gap-2">
            <motion.button onClick={(e) => { e.stopPropagation(); onView(); }} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="flex-1 py-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1 transition-all" style={{ background: 'rgba(0, 212, 255, 0.1)', border: '1px solid rgba(0, 212, 255, 0.3)', color: 'var(--snaps-accent-blue)' }}>
              <Eye className="w-3 h-3" /> View
            </motion.button>
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="p-2 rounded-lg text-xs font-medium transition-all" style={{ background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.3)', color: 'var(--snaps-accent-green)' }}>
              <Download className="w-3 h-3" />
            </motion.button>
            <motion.button onClick={(e) => { e.stopPropagation(); onDelete(); }} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="p-2 rounded-lg text-xs font-medium transition-all" style={{ background: 'rgba(255, 59, 48, 0.1)', border: '1px solid rgba(255, 59, 48, 0.3)', color: '#FF3B30' }}>
              <Trash2 className="w-3 h-3" />
            </motion.button>
          </div>
        </div>
        <motion.div className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: `radial-gradient(circle at center, ${colors.color}10, transparent 70%)`, boxShadow: `inset 0 0 20px ${colors.color}20` }} />
      </motion.div>
    );
  }

  return null;
}
