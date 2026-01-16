import { useDroppable } from '@dnd-kit/core';
import type { Zone } from '@paper-magic/shared';
import type { ReactNode } from 'react';
import type { DropData } from './DndProvider';

interface DroppableZoneProps {
  zone: Zone;
  children: ReactNode;
  className?: string;
  disabled?: boolean;
  highlightOnOver?: boolean;
}

export function DroppableZone({
  zone,
  children,
  className = '',
  disabled = false,
  highlightOnOver = true,
}: DroppableZoneProps) {
  const dropData: DropData = { zone };

  const { setNodeRef, isOver } = useDroppable({
    id: `zone-${zone}`,
    data: dropData,
    disabled,
  });

  return (
    <div
      ref={setNodeRef}
      className={`
        ${className}
        ${highlightOnOver && isOver ? 'ring-2 ring-accent ring-opacity-50' : ''}
        transition-all duration-150
      `}
    >
      {children}
    </div>
  );
}
