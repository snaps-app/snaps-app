import type { Card, Epic, Sprint } from '@/services/types';
import { useState } from 'react';
import { Palette } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useDrag, useDrop } from 'react-dnd';
import { KanbanCard } from '@/app/components/shared/KanbanCard';
import { BOARD_COLORS } from '@/app/components/board/board-constants';

import { useProjectRole } from '@/contexts/project-role-context';

export interface BoardColumnProps {
  title: string;
  status: string;
  tasks: Card[];
  onMove: (taskId: string, newStatus: string) => void;
  onCardClick: (card: Card) => void;
  onTitleChange: (newTitle: string) => void;
  onColorChange: (newColor: string) => void;
  onMoveColumn: (dragIndex: number, hoverIndex: number) => void;
  index: number;
  color: string;
  epics: Epic[];
  sprints: Sprint[];
  boardColor: string;
}

export function BoardColumn({
  title,
  status,
  tasks,
  onMove,
  onCardClick,
  onTitleChange,
  onColorChange,
  onMoveColumn,
  index,
  color,
  epics,
  sprints,
  boardColor,
}: BoardColumnProps) {
  const { can } = useProjectRole();
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState(title);
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);

  const [{ isOver }, dropCard] = useDrop(() => ({
    accept: 'TASK',
    canDrop: () => can('write'),
    drop: (item: { id: string; status: string }) => {
      if (item.status !== status && can('write')) {
        onMove(item.id, status);
      }
    },
    collect: (monitor) => ({
      isOver: !!monitor.isOver() && monitor.canDrop(),
    }),
  }), [can]);

  const [, dragColumn] = useDrag({
    type: 'COLUMN',
    item: { index },
    canDrag: can('write'),
  }, [can]);

  const [, dropColumn] = useDrop({
    accept: 'COLUMN',
    canDrop: () => can('write'),
    hover(item: { index: number }) {
      if (item.index !== index && can('write')) {
        onMoveColumn(item.index, index);
        item.index = index;
      }
    },
  }, [can]);

  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`
      : '168, 85, 247';
  };

  const rgbColor = hexToRgb(color);

  return (
    <div
      ref={(node) => {
        dropCard(dropColumn(node));
      }}
      className="flex-1 min-w-[300px]"
    >
      <div
        ref={dragColumn as any}
        className="p-4 rounded-t-xl backdrop-blur-xl border-b-2 relative cursor-move group"
        style={{
          background: `rgba(${rgbColor}, 0.1)`,
          borderColor: `rgba(${rgbColor}, 0.5)`,
          boxShadow: `0 0 20px rgba(${rgbColor}, 0.3)`,
        }}
      >
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-2 flex-1 mr-2">
            {isEditingTitle ? (
              <input
                autoFocus
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
                onBlur={() => {
                  setIsEditingTitle(false);
                  if (editedTitle.trim() && editedTitle !== title) {
                    onTitleChange(editedTitle);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    setIsEditingTitle(false);
                    if (editedTitle.trim() && editedTitle !== title) {
                      onTitleChange(editedTitle);
                    }
                  }
                }}
                className="bg-transparent border-none text-lg font-bold focus:outline-none w-full"
                style={{ color: `rgb(${rgbColor})` }}
              />
            ) : (
              <h2
                onClick={() => {
                  if (can('write')) setIsEditingTitle(true);
                }}
                className={`text-lg font-bold truncate ${can('write') ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}`}
                style={{
                  color: `rgb(${rgbColor})`,
                  textShadow: `0 0 10px rgba(${rgbColor}, 0.6)`,
                }}
              >
                {title}
              </h2>
            )}
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <button
                onClick={() => setIsColorPickerOpen(!isColorPickerOpen)}
                className="p-1.5 rounded-lg hover:bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ color: `rgb(${rgbColor})` }}
              >
                <Palette className="w-4 h-4" />
              </button>

              <AnimatePresence>
                {isColorPickerOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsColorPickerOpen(false)} />
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: 10 }}
                      className="absolute top-full right-0 mt-2 p-2 bg-[#0A0A0A] border border-white/10 rounded-xl shadow-2xl z-50 grid grid-cols-4 gap-2 min-w-[120px]"
                    >
                      {BOARD_COLORS.map((c) => (
                        <button
                          key={c}
                          onClick={() => {
                            onColorChange(c);
                            setIsColorPickerOpen(false);
                          }}
                          className="w-6 h-6 rounded-full border border-white/20 transition-transform hover:scale-110"
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

            <span
              className="text-sm px-2 py-1 rounded-full"
              style={{
                background: `rgba(${rgbColor}, 0.2)`,
                color: `rgb(${rgbColor})`,
                border: `1px solid rgba(${rgbColor}, 0.4)`,
              }}
            >
              {tasks.length}
            </span>
          </div>
        </div>
      </div>

      <div
        className="p-4 rounded-b-xl min-h-[500px] transition-all"
        style={{
          background: isOver
            ? `rgba(${rgbColor}, 0.08)`
            : 'rgba(255, 255, 255, 0.02)',
          border: '1px solid rgba(255, 255, 255, 0.05)',
          borderTop: 'none',
        }}
      >
        <AnimatePresence>
          {tasks.map((task, i) => (
            <motion.div
              key={task.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.3, delay: i * 0.05 }}
            >
              <KanbanCard
                task={task}
                onCardClick={onCardClick}
                boardColor={boardColor}
                epic={epics.find((e) => e.id === task.epic_id)}
                sprint={sprints.find((s) => s.id === task.sprint_id)}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
