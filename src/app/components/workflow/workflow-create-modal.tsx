import { motion } from 'motion/react';
import { Sparkles, X } from 'lucide-react';
import type { WorkflowTemplate } from '@/services/types';

interface WorkflowCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  modalTemplateName: string;
  setModalTemplateName: (val: string) => void;
  modalSourceTemplateId: string;
  setModalSourceTemplateId: (val: string) => void;
  templates: WorkflowTemplate[];
  onConfirm: () => void;
}

export function WorkflowCreateModal({
  isOpen,
  onClose,
  modalTemplateName,
  setModalTemplateName,
  modalSourceTemplateId,
  setModalSourceTemplateId,
  templates,
  onConfirm
}: WorkflowCreateModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-[#111] border border-white/10 rounded-2xl w-full max-w-md overflow-hidden flex flex-col"
      >
        <div className="p-6 border-b border-white/10 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-400 animate-pulse" />
            New Workflow Template
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6 space-y-4">
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-300 text-left">Template Name</label>
            <input
              type="text"
              value={modalTemplateName}
              onChange={(e) => setModalTemplateName(e.target.value)}
              placeholder="e.g. Custom SDLC Pipeline"
              className="w-full bg-black/45 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder:text-gray-600 focus:outline-none focus:border-purple-500 text-sm"
              autoFocus
            />
          </div>
          
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-300 text-left">Start From</label>
            <select
              value={modalSourceTemplateId}
              onChange={(e) => setModalSourceTemplateId(e.target.value)}
              className="w-full bg-black/45 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-purple-500 text-sm"
            >
              <option value="scratch">Scratch (Empty template)</option>
              {templates.map(t => (
                <option key={t.id} value={t.id}>
                  Clone: {t.name} ({t.phases.length} {t.phases.length === 1 ? 'phase' : 'phases'})
                </option>
              ))}
            </select>
          </div>
        </div>
        
        <div className="p-6 border-t border-white/10 flex justify-end gap-3 bg-black/25">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-white/10 text-gray-400 hover:text-white transition-colors text-xs font-bold cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={!modalTemplateName.trim()}
            className="px-6 py-2 rounded-lg bg-purple-500/20 border border-purple-500/30 text-purple-400 font-bold hover:bg-purple-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-xs cursor-pointer"
          >
            Create Template
          </button>
        </div>
      </motion.div>
    </div>
  );
}
