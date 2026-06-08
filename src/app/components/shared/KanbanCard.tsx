import type { Card, Epic, Sprint } from '@/services/types';
import { useDrag } from 'react-dnd';
import { BoardCard } from '@/app/components/shared/board-card';
import { SprintMacroCard } from '@/app/components/shared/SprintMacroCard';
import { useProjectRole } from '@/contexts/project-role-context';

interface KanbanCardProps {
  task: Card;
  onCardClick: (card: Card) => void;
  boardColor: string;
  epic?: Epic;
  sprint?: Sprint;
  onStartExecution?: (sprintId: string) => void;
}

export function KanbanCard({ task, onCardClick, boardColor, epic, sprint, onStartExecution }: KanbanCardProps) {
  const { can } = useProjectRole();

  const [{ isDragging }, drag] = useDrag(() => ({
    type: 'TASK',
    item: { id: task.id, status: task.status },
    canDrag: can('write'),
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  }), [can]);

  if (task.card_type === 'sprint_macro') {
    return (
      <div ref={drag as any} style={{ opacity: isDragging ? 0.5 : 1 }}>
        <SprintMacroCard
          card={task}
          onClick={onCardClick}
          onStartExecution={onStartExecution}
        />
      </div>
    );
  }

  return (
    <div ref={drag as any} style={{ opacity: isDragging ? 0.5 : 1 }}>
      <BoardCard
        card={task}
        onClick={onCardClick}
        boardColor={boardColor}
        epic={epic}
        sprint={sprint}
      />
    </div>
  );
}
