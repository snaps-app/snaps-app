import { motion } from 'motion/react';
import { X } from 'lucide-react';

interface DocEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingId: string | null;
  docName: string;
  setDocName: (v: string) => void;
  docType: string;
  setDocType: (v: string) => void;
  docContent: string;
  setDocContent: (v: string) => void;
  isSaving: boolean;
  onSave: () => void;
}

export function DocEditorModal({
  isOpen,
  onClose,
  editingId,
  docName,
  setDocName,
  docType,
  setDocType,
  docContent,
  setDocContent,
  isSaving,
  onSave
}: DocEditorModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-[#111] border border-white/10 rounded-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh]"
      >
        <div className="p-6 border-b border-white/10 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">{editingId ? 'Edit Document' : 'New Document'}</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Name</label>
            <input
              value={docName}
              onChange={(e) => setDocName(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder:text-gray-600 focus:outline-none focus:border-green-500"
              placeholder="e.g. Sprint 1 PRD"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Type</label>
            <select
              value={docType}
              onChange={(e) => setDocType(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder:text-gray-600 focus:outline-none focus:border-green-500"
            >
              <option value="prd">PRD</option>
              <option value="context">Context</option>
              <option value="playbook">Playbook</option>
              <option value="strategy">Strategy</option>
              <option value="roadmap">Roadmap</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Content (Markdown)</label>
            <textarea
              value={docContent}
              onChange={(e) => setDocContent(e.target.value)}
              className="w-full h-64 bg-black/40 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder:text-gray-600 focus:outline-none focus:border-green-500 resize-none font-mono text-sm"
              placeholder="# Overview&#10;..."
            />
          </div>
        </div>
        <div className="p-6 border-t border-white/10 flex justify-end gap-3 bg-black/20">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-white/10 text-gray-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            disabled={!docName.trim() || !docContent.trim() || isSaving}
            className="px-6 py-2 rounded-lg bg-green-500/20 border border-green-500/30 text-green-400 font-bold hover:bg-green-500/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-all"
          >
            {isSaving && <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />}
            Save
          </button>
        </div>
      </motion.div>
    </div>
  );
}
