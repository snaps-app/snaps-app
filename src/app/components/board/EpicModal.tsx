import type { Epic } from '@/services/types';
import { motion, AnimatePresence } from 'motion/react';
import { X, Edit2, Trash2, Plus } from 'lucide-react';
import { BOARD_COLORS } from '@/app/components/board/board-constants';

interface EpicModalProps {
  isOpen: boolean;
  onClose: () => void;
  epics: Epic[];
  editingEpicId: string | null;
  epicNameInput: string;
  epicColorInput: string;
  isCreatingEpic: boolean;
  isCreatingEpicUtils: boolean;
  setEpicNameInput: (val: string) => void;
  setEpicColorInput: (val: string) => void;
  handleCreateEpic: () => Promise<void>;
  handleUpdateEpic: (id: string) => Promise<void>;
  handleDeleteEpic: (id: string) => Promise<void>;
  startEditingEpic: (epic: Epic) => void;
  startCreatingEpic: () => void;
  setIsCreatingEpic: (val: boolean) => void;
  setEditingEpicId: (val: string | null) => void;
}

export function EpicModal({
  isOpen,
  onClose,
  epics,
  editingEpicId,
  epicNameInput,
  epicColorInput,
  isCreatingEpic,
  isCreatingEpicUtils,
  setEpicNameInput,
  setEpicColorInput,
  handleCreateEpic,
  handleUpdateEpic,
  handleDeleteEpic,
  startEditingEpic,
  startCreatingEpic,
  setIsCreatingEpic,
  setEditingEpicId
}: EpicModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-[#0A0A0A] border border-white/10 rounded-2xl w-full max-w-lg p-6 shadow-2xl max-h-[80vh] flex flex-col"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">Manage Epics</h2>
              <button
                onClick={onClose}
                className="p-1 rounded-lg hover:bg-white/10"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 mb-6 pr-2">
              {epics.map(epic => (
                <div key={epic.id} className="bg-white/5 border border-white/10 rounded-xl p-3">
                  {editingEpicId === epic.id ? (
                    <div className="flex flex-col gap-3">
                      <input
                        type="text"
                        value={epicNameInput}
                        onChange={(e) => setEpicNameInput(e.target.value)}
                        className="bg-black/20 border border-white/10 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500 text-white"
                        placeholder="Epic Name"
                        autoFocus
                      />
                      <div className="flex items-center gap-2">
                        <div className="flex gap-1 flex-wrap">
                          {BOARD_COLORS.slice(0, 8).map(c => (
                            <button
                              key={c}
                              onClick={() => setEpicColorInput(c)}
                              className={`w-5 h-5 rounded-full border-2 ${epicColorInput === c ? 'border-white' : 'border-transparent'}`}
                              style={{ backgroundColor: c }}
                            />
                          ))}
                        </div>
                        <div className="flex-1" />
                        <button
                          onClick={() => handleDeleteEpic(epic.id)}
                          className="p-2 rounded hover:bg-red-500/10 text-red-500 hover:text-red-400 transition-colors"
                          title="Delete Epic"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setEditingEpicId(null)}
                          className="p-2 rounded hover:bg-white/10 text-xs text-white"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleUpdateEpic(epic.id)}
                          className="p-2 rounded bg-green-500/20 text-green-400 text-xs font-bold"
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: epic.color }} />
                        <span className="font-medium text-white">{epic.name}</span>
                      </div>
                      <button
                        onClick={() => startEditingEpic(epic)}
                        className="p-2 rounded-lg hover:bg-white/10 opacity-50 hover:opacity-100 text-white"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              ))}

              {isCreatingEpic ? (
                <div className="bg-white/5 border border-white/10 rounded-xl p-3 animate-in fade-in slide-in-from-top-2">
                  <div className="flex flex-col gap-3">
                    <input
                      type="text"
                      value={epicNameInput}
                      onChange={(e) => setEpicNameInput(e.target.value)}
                      className="bg-black/20 border border-white/10 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500 text-white"
                      placeholder="New Epic Name"
                      autoFocus
                    />
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1 flex-wrap">
                        {BOARD_COLORS.slice(0, 8).map(c => (
                          <button
                            key={c}
                            onClick={() => setEpicColorInput(c)}
                            className={`w-5 h-5 rounded-full border-2 ${epicColorInput === c ? 'border-white' : 'border-transparent'}`}
                            style={{ backgroundColor: c }}
                          />
                        ))}
                      </div>
                      <div className="flex-1" />
                      <button
                        onClick={() => setIsCreatingEpic(false)}
                        className="p-2 rounded hover:bg-white/10 text-xs text-white"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleCreateEpic}
                        disabled={!epicNameInput.trim() || isCreatingEpicUtils}
                        className="p-2 rounded bg-blue-500/20 text-blue-400 text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        {isCreatingEpicUtils ? (
                          <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        ) : 'Create'}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <button
                  onClick={startCreatingEpic}
                  className="w-full py-3 rounded-xl border border-dashed border-white/10 hover:border-white/30 hover:bg-white/5 text-gray-400 hover:text-white transition-all flex items-center justify-center gap-2 text-sm font-medium"
                >
                  <Plus className="w-4 h-4" />
                  Add New Epic
                </button>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
