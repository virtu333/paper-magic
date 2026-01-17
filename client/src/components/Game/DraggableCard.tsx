import { useDraggable, type DraggableSyntheticListeners } from '@dnd-kit/core';
import type { Card as CardType, Zone } from '@paper-magic/shared';
import { Card } from './Card';
import type { DragData } from './DndProvider';
import { useMemo } from 'react';

interface DraggableCardProps {
  card: CardType;
  sourceZone: Zone;
  size?: 'sm' | 'md' | 'md-responsive' | 'lg';
  showBack?: boolean;
  selected?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  onDoubleClick?: () => void;
  onRightClick?: (e: React.MouseEvent) => void;
}

export function DraggableCard({
  card,
  sourceZone,
  size = 'md',
  showBack = false,
  selected = false,
  disabled = false,
  onClick,
  onDoubleClick,
  onRightClick,
}: DraggableCardProps) {
  const dragData: DragData = {
    card,
    sourceZone,
  };

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: card.instanceId,
    data: dragData,
    disabled,
  });

  // Filter listeners to only activate on left-click (button 0)
  // This allows right-click to pass through to context menu
  const filteredListeners = useMemo(() => {
    if (!listeners) return {};

    const filtered: DraggableSyntheticListeners = {};
    for (const [key, handler] of Object.entries(listeners)) {
      if (key === 'onPointerDown') {
        filtered[key] = (e: React.PointerEvent) => {
          // Only handle left-click (button 0) for dragging
          if (e.button === 0) {
            (handler as (e: React.PointerEvent) => void)(e);
          }
        };
      } else {
        filtered[key] = handler;
      }
    }
    return filtered;
  }, [listeners]);

  return (
    <div
      ref={setNodeRef}
      {...filteredListeners}
      {...attributes}
      className={`
        touch-none
        ${isDragging ? 'opacity-30' : ''}
      `}
      style={{ cursor: disabled ? 'default' : 'grab' }}
    >
      <Card
        card={card}
        size={size}
        showBack={showBack}
        selected={selected}
        onClick={onClick}
        onDoubleClick={onDoubleClick}
        onRightClick={onRightClick}
      />
    </div>
  );
}
