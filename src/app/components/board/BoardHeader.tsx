import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Zap, Play, Settings, Check, Layers } from 'lucide-react';
import { FilterMultiSelect } from '../FilterMultiSelect';
import { BOARD_COLORS } from '../board-constants';
import { Epic, Sprint } from '@/services/api';

interface BoardHeaderProps {
  projectId?: string;
  boardId?: string;
  navigate: (path: string) => void;
  boardName: string;
  setBoardName: (val: string) => void;
  boardCode: string;
  setBoardCode: (val: string) => void;
  boardColor: string;
  setBoardColor: (val: string) => void;
  isColorPickerOpen: boolean;
  setIsColorPickerOpen: (val: boolean) => void;
  project: any;
  board: any;
  selectedEpicIds: string[];
  setSelectedEpicIds: (ids: string[]) => void;
  epics: Epic[];
  setIsEpicModalOpen: (val: boolean) => void;
  selectedSprintIds: string[];
  setSelectedSprintIds: (ids: string[]) => void;
  sprints: Sprint[];
  setIsSprintModalOpen: (val: boolean) => void;
  handleQuickExecute: () => Promise<void>;
  isDirty: boolean;
  isSaving: boolean;
  handleSaveBoard: () => Promise<void>;
  handleOpenBulkApply: () => Promise<void>;
}

export function BoardHeader({
  projectId,
  boardId,
  navigate,
  boardName,
  setBoardName,
  boardCode,
  setBoardCode,
  boardColor,
  setBoardColor,
  isColorPickerOpen,
  setIsColorPickerOpen,
  project,
  board,
  selectedEpicIds,
  setSelectedEpicIds,
  epics,
  setIsEpicModalOpen,
  selectedSprintIds,
  setSelectedSprintIds,
  sprints,
  setIsSprintModalOpen,
  handleQuickExecute,
  isDirty,
  isSaving,
  handleSaveBoard,
  handleOpenBulkApply
}: BoardHeaderProps) {
  return (
    <motion.div
      className="p-6 border-b border-white/10 backdrop-blur-[30px] z-20 flex-shrink-0"
      style={{ backgroundColor: 'rgba(10, 10, 10, 0.6)' }}
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <div className="flex items-center justify-between gap-4 px-2">
        {/* Left: Board Info */}
        <div className="flex items-center gap-4 shrink-0">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate(`/project/${projectId}`)}
            className="w-9 h-9 rounded-xl backdrop-blur-xl flex items-center justify-center transition-all group"
            style={{
              background: 'rgba(255, 107, 53, 0.05)',
              border: '1px solid rgba(255, 107, 53, 0.2)',
            }}
          >
            <ArrowLeft className="w-5 h-5 text-orange-500/70 group-hover:text-orange-500 transition-colors" />
          </motion.button>

          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={boardName}
                onChange={(e) => setBoardName(e.target.value)}
                className="bg-transparent border-none text-xl font-black text-white focus:outline-none focus:ring-1 focus:ring-white/10 rounded px-1 w-auto min-w-[80px]"
                placeholder="Board Name"
              />
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-white/5 border border-white/10">
                <input
                  type="text"
                  value={boardCode}
                  onChange={(e) => setBoardCode(e.target.value.toUpperCase().substring(0, 3))}
                  className="bg-transparent border-none text-[10px] font-black text-white/40 focus:outline-none w-7 text-center uppercase focus:text-white transition-colors"
                  placeholder="XXX"
                  maxLength={3}
                />
                <button
                  onClick={() => setIsColorPickerOpen(!isColorPickerOpen)}
                  className="w-3 h-3 rounded-full relative transition-transform hover:scale-125"
                  style={{ backgroundColor: boardColor, boxShadow: `0 0 12px ${boardColor}88` }}
                >
                  <AnimatePresence>
                    {isColorPickerOpen && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        className="absolute top-full left-0 mt-4 p-2 bg-[#0A0A0A] border border-white/10 rounded-2xl shadow-2xl z-[60] grid grid-cols-4 gap-2 min-w-[140px]"
                      >
                        {BOARD_COLORS.map(color => (
                          <button
                            key={color}
                            onClick={(e) => {
                              e.stopPropagation();
                              setBoardColor(color);
                              setIsColorPickerOpen(false);
                            }}
                            className="w-6 h-6 rounded-full border border-white/5 hover:border-white/30 transition-all"
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </button>
              </div>
            </div>
            {project?.name && (
              <div className="flex items-center gap-2 mt-0.5 ml-1">
                <p className="text-[9px] text-white/30 font-bold uppercase tracking-[0.2em]">{project.name}</p>
                {board?.board_type === 'support' && (
                  <span className="text-[8px] font-black bg-red-500/10 text-red-500/80 px-1.5 py-0.5 rounded border border-red-500/20 uppercase tracking-widest">
                    Support
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Middle: Unified Filter Section */}
        <div className="flex items-center p-1 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-2xl shadow-2xl">
          <FilterMultiSelect 
            label="EPICS"
            options={[
              { id: 'no_epic', name: 'NO EPIC' },
              ...epics.map(e => ({ id: e.id, name: e.name }))
            ]}
            selectedIds={selectedEpicIds}
            onChange={setSelectedEpicIds}
            icon={Settings}
            onManage={() => setIsEpicModalOpen(true)}
            manageTitle="Manage Epics"
          />

          <FilterMultiSelect 
            label="SPRINTS"
            options={[
              { id: 'no_sprint', name: 'NO SPRINT' },
              ...sprints.map(s => ({ id: s.id, name: `${s.name} ${s.status === 'active' ? '●' : ''}` }))
            ]}
            selectedIds={selectedSprintIds}
            onChange={setSelectedSprintIds}
            icon={Zap}
            onManage={() => setIsSprintModalOpen(true)}
            manageTitle="Manage Sprints"
          />

          <div className="relative group ml-3 mr-1">
            <motion.button
              whileHover={selectedSprintIds.length > 0 && !selectedSprintIds.includes('no_sprint') ? { scale: 1.02, x: 2 } : {}}
              whileTap={selectedSprintIds.length > 0 && !selectedSprintIds.includes('no_sprint') ? { scale: 0.98 } : {}}
              onClick={handleQuickExecute}
              disabled={selectedSprintIds.length === 0 || selectedSprintIds.includes('no_sprint')}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.15em] transition-all disabled:opacity-10 disabled:grayscale"
              style={{
                background: 'linear-gradient(135deg, #00D4FF 0%, #A855F7 100%)',
                boxShadow: selectedSprintIds.length > 0 && !selectedSprintIds.includes('no_sprint') ? '0 8px 20px rgba(168,85,247,0.3)' : 'none',
                color: 'white',
              }}
            >
              <Play className="w-3 h-3 fill-current" />
              Execute {selectedSprintIds.length > 1 ? `(${selectedSprintIds.length})` : ''}
            </motion.button>
            {(selectedSprintIds.length === 0 || selectedSprintIds.includes('no_sprint')) && (
              <div className="absolute top-full mt-4 right-0 w-56 p-3 bg-[#0A0A0A] border border-white/10 rounded-2xl text-[9px] text-white/40 opacity-0 group-hover:opacity-100 transition-all pointer-events-none z-[70] shadow-2xl leading-relaxed backdrop-blur-xl">
                <p className="text-purple-400 font-bold mb-1 text-[10px]">AI EXECUTION READY</p>
                Select specific Sprints to unlock autonomous implementation.
              </div>
            )}
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setIsSprintModalOpen(true)}
            className="p-2.5 rounded-xl hover:bg-white/5 border border-transparent hover:border-white/10 transition-all text-white/20 hover:text-white"
            title="Sprint Management"
          >
            <Zap className="w-4 h-4" />
          </button>

          {(isDirty || !boardId) && (
            <div className="flex items-center gap-2">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleSaveBoard}
                disabled={isSaving}
                className="px-4 py-2 rounded-xl flex items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all"
                style={{
                  background: 'rgba(34, 197, 94, 0.05)',
                  border: '1px solid rgba(34, 197, 94, 0.2)',
                  color: '#22C55E'
                }}
              >
                {isSaving ? <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" /> : <Check className="w-3 h-3" />}
                Apply
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleOpenBulkApply}
                disabled={isSaving}
                className="px-4 py-2 rounded-xl flex items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all"
                style={{
                  background: 'rgba(0, 212, 255, 0.05)',
                  border: '1px solid rgba(0, 212, 255, 0.2)',
                  color: '#00D4FF'
                }}
              >
                <Layers className="w-3 h-3" />
                Bulk
              </motion.button>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
