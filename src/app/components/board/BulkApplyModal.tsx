import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Layers, Globe, Check } from 'lucide-react';

interface BulkApplyModalProps {
  isOpen: boolean;
  onClose: () => void;
  isLoadingBoards: boolean;
  allBoards: any[];
  selectedBoardIds: Set<string>;
  toggleBoardSelection: (id: string) => void;
  handleBulkApplyConfirm: () => Promise<void>;
  isBulkSaving: boolean;
}

export function BulkApplyModal({
  isOpen,
  onClose,
  isLoadingBoards,
  allBoards,
  selectedBoardIds,
  toggleBoardSelection,
  handleBulkApplyConfirm,
  isBulkSaving
}: BulkApplyModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-[#0A0A0A] border border-white/10 rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl"
          >
            <div className="p-6 border-b border-white/10 flex items-center justify-between sticky top-0 bg-[#0A0A0A] z-10 rounded-t-2xl">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Layers className="w-5 h-5 text-blue-400" />
                  Bulk Apply Columns
                </h2>
                <p className="text-gray-400 text-sm mt-1">
                  Select boards to apply the current column configuration to
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {isLoadingBoards ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
                </div>
              ) : allBoards.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  No other boards found.
                </div>
              ) : (
                <div className="space-y-6">
                  {Array.from(new Set(allBoards.map(b => b.projectName))).map(projectName => {
                    const projectBoards = allBoards.filter(b => b.projectName === projectName);
                    if (projectBoards.length === 0) return null;

                    return (
                      <div key={projectName}>
                        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                          <Globe className="w-3 h-3" />
                          {projectName}
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {projectBoards.map(board => (
                            <div
                              key={board.id}
                              onClick={() => toggleBoardSelection(board.id)}
                              className={`p-4 rounded-xl border cursor-pointer transition-all flex items-center gap-3 ${selectedBoardIds.has(board.id)
                                ? 'bg-blue-500/10 border-blue-500/50'
                                : 'bg-white/5 border-white/10 hover:border-white/20'
                                }`}
                            >
                              <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${selectedBoardIds.has(board.id)
                                ? 'bg-blue-500 border-blue-500'
                                : 'border-gray-500'
                                }`}>
                                {selectedBoardIds.has(board.id) && <Check className="w-3 h-3 text-white" />}
                              </div>
                              <div>
                                <div className="font-medium text-white">{board.name}</div>
                                <div className="text-xs text-gray-500">{board.columns?.length || 0} columns</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="p-6 border-t border-white/10 bg-[#0A0A0A] rounded-b-2xl flex justify-end gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-lg text-gray-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkApplyConfirm}
                disabled={selectedBoardIds.size === 0 || isBulkSaving}
                className="px-6 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white font-bold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isBulkSaving ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Layers className="w-4 h-4" />
                )}
                Apply to {selectedBoardIds.size} Boards
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
