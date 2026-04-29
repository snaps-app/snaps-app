import { useDrag } from 'react-dnd';
import { BoardCard } from './board-card';
import { Card, Epic, Sprint } from '@/services/api';

interface KanbanCardProps {
  task: Card;
  onCardClick: (card: Card) => void;
  boardColor: string;
  epic?: Epic;
  sprint?: Sprint;
}

export function KanbanCard({ task, onCardClick, boardColor, epic, sprint }: KanbanCardProps) {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: 'TASK',
    item: { id: task.id, status: task.status },
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  }));

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
