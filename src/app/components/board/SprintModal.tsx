import type { Sprint } from '@/services/types';
import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Zap, Plus, Edit2, Trash2 } from 'lucide-react';

interface SprintModalProps {
  isOpen: boolean;
  onClose: () => void;
  sprints: Sprint[];
  editingSprintId: string | null;
  sprintNameInput: string;
  sprintTagInput: string;
  sprintObjectiveInput: string;
  isSprintFormOpen: boolean;
  isSprintSaving: boolean;
  setSprintNameInput: (val: string) => void;
  setSprintTagInput: (val: string) => void;
  setSprintObjectiveInput: (val: string) => void;
  setIsSprintFormOpen: (val: boolean) => void;
  setEditingSprintId: (val: string | null) => void;
  handleCreateSprint: () => Promise<void>;
  handleUpdateSprint: (id: string) => Promise<void>;
  handleDeleteSprint: (id: string) => Promise<void>;
  startEditingSprint: (sprint: Sprint) => void;
}

export function SprintModal({
  isOpen,
  onClose,
  sprints,
  editingSprintId,
  sprintNameInput,
  sprintTagInput,
  sprintObjectiveInput,
  isSprintFormOpen,
  isSprintSaving,
  setSprintNameInput,
  setSprintTagInput,
  setSprintObjectiveInput,
  setIsSprintFormOpen,
  setEditingSprintId,
  handleCreateSprint,
  handleUpdateSprint,
  handleDeleteSprint,
  startEditingSprint
}: SprintModalProps) {
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
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Zap className="w-5 h-5 text-purple-400" />
                Manage Sprints
              </h2>
              <button
                onClick={onClose}
                className="p-1 rounded-lg hover:bg-white/10"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 mb-6 pr-2">
              {sprints.map(sprint => (
                <div key={sprint.id} className="group bg-white/5 border border-white/10 rounded-xl p-3">
                  {editingSprintId === sprint.id ? (
                    <div className="flex flex-col gap-3">
                      <input
                        type="text"
                        value={sprintNameInput}
                        onChange={(e) => setSprintNameInput(e.target.value)}
                        className="bg-black/20 border border-white/10 rounded px-3 py-2 text-sm focus:outline-none focus:border-purple-500 text-white"
                        placeholder="Sprint Name"
                        autoFocus
                      />
                      <input
                        type="text"
                        value={sprintTagInput}
                        onChange={(e) => setSprintTagInput(e.target.value)}
                        className="bg-black/20 border border-white/10 rounded px-3 py-2 text-sm focus:outline-none focus:border-purple-500 text-white font-mono"
                        placeholder="sprint-tag"
                      />
                      <textarea
                        value={sprintObjectiveInput}
                        onChange={(e) => setSprintObjectiveInput(e.target.value)}
                        className="bg-black/20 border border-white/10 rounded px-3 py-2 text-sm focus:outline-none focus:border-purple-500 text-white min-h-[60px]"
                        placeholder="Objective..."
                      />
                      <div className="flex items-center gap-2 justify-end">
                        <button
                          onClick={() => setEditingSprintId(null)}
                          className="p-2 rounded hover:bg-white/10 text-xs text-white"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleUpdateSprint(sprint.id)}
                          className="p-2 rounded bg-purple-500/20 text-purple-400 text-xs font-bold"
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white leading-none">{sprint.name}</span>
                          <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded border ${
                            sprint.status === 'active' ? 'bg-green-500/20 text-green-400 border-green-500/50' :
                            sprint.status === 'done' ? 'bg-blue-500/20 text-blue-400 border-blue-500/50' :
                            'bg-yellow-500/20 text-yellow-500 border-yellow-500/50'
                          }`}>
                            {sprint.status}
                          </span>
                        </div>
                        <span className="text-xs font-mono text-gray-500">{sprint.tag}</span>
                        {sprint.objective && (
                          <p className="text-xs text-gray-400 mt-1 line-clamp-2">{sprint.objective}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => startEditingSprint(sprint)}
                          className="p-1.5 rounded hover:bg-white/10 text-gray-400 hover:text-white"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteSprint(sprint.id)}
                          className="p-1.5 rounded hover:bg-red-500/10 text-red-500 hover:text-red-400"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {isSprintFormOpen ? (
                <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-3">
                  <div className="flex flex-col gap-3">
                    <input
                      type="text"
                      value={sprintNameInput}
                      onChange={(e) => setSprintNameInput(e.target.value)}
                      className="bg-black/20 border border-purple-500/30 rounded px-3 py-2 text-sm focus:outline-none focus:border-purple-500 text-white"
                      placeholder="Sprint Name (e.g. Sprint 1)"
                      autoFocus
                    />
                    <input
                      type="text"
                      value={sprintTagInput}
                      onChange={(e) => setSprintTagInput(e.target.value)}
                      className="bg-black/20 border border-purple-500/30 rounded px-3 py-2 text-sm focus:outline-none focus:border-purple-500 text-white font-mono"
                      placeholder="Tag (e.g. sprint-1)"
                    />
                    <textarea
                      value={sprintObjectiveInput}
                      onChange={(e) => setSprintObjectiveInput(e.target.value)}
                      className="bg-black/20 border border-purple-500/30 rounded px-3 py-2 text-sm focus:outline-none focus:border-purple-500 text-white min-h-[60px]"
                      placeholder="Sprint Objective..."
                    />
                    <div className="flex items-center gap-2 justify-end mt-2">
                      <button
                        onClick={() => setIsSprintFormOpen(false)}
                        className="p-2 rounded hover:bg-white/10 text-xs text-white"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleCreateSprint}
                        disabled={!sprintNameInput.trim() || !sprintTagInput.trim() || isSprintSaving}
                        className="p-2 rounded bg-purple-500/20 text-purple-400 text-xs font-bold disabled:opacity-50 flex items-center gap-2"
                      >
                        {isSprintSaving ? (
                          <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        ) : 'Create'}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => { setIsSprintFormOpen(true); setEditingSprintId(null); setSprintNameInput(''); setSprintTagInput(''); setSprintObjectiveInput(''); }}
                  className="w-full py-3 rounded-xl border border-dashed border-white/10 hover:border-purple-500/30 hover:bg-purple-500/5 text-gray-400 hover:text-purple-400 transition-all flex items-center justify-center gap-2 text-sm font-medium"
                >
                  <Plus className="w-4 h-4" />
                  New Sprint
                </button>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
