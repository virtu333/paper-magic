import { useState, useCallback, type ReactNode } from 'react';
import {
  DndContext,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import type { Card as CardType, Zone } from '@paper-magic/shared';
import { Card } from './Card';

// Snap Y position to rows for horizontal alignment, leave X free
function snapToGrid(position: { x: number; y: number }): { x: number; y: number } {
  const GRID_Y = 12.5;  // 12.5% vertical grid (gives ~7 rows)
  const MIN_Y = 8;
  const MAX_Y = 92;

  return {
    x: position.x,  // Keep X as-is (no horizontal snap) so cards don't stack
    y: Math.max(MIN_Y, Math.min(MAX_Y, Math.round(position.y / GRID_Y) * GRID_Y)),
  };
}

export interface DragData {
  card: CardType;
  sourceZone: Zone;
}

export interface DropData {
  zone: Zone;
  position?: { x: number; y: number };
}

interface DndProviderProps {
  children: ReactNode;
  onDragEnd: (card: CardType, sourceZone: Zone, targetZone: Zone, position?: { x: number; y: number }) => void;
}

export function DndProvider({ children, onDragEnd }: DndProviderProps) {
  const [activeCard, setActiveCard] = useState<CardType | null>(null);
  const [activeSourceZone, setActiveSourceZone] = useState<Zone | null>(null);

  // Configure sensors with a small activation distance to prevent accidental drags
  const mouseSensor = useSensor(MouseSensor, {
    activationConstraint: {
      distance: 8,
    },
  });

  const touchSensor = useSensor(TouchSensor, {
    activationConstraint: {
      delay: 200,
      tolerance: 8,
    },
  });

  const sensors = useSensors(mouseSensor, touchSensor);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const data = event.active.data.current as DragData | undefined;
    if (data) {
      setActiveCard(data.card);
      setActiveSourceZone(data.sourceZone);
    }
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;

    if (over && activeCard && activeSourceZone) {
      const dropData = over.data.current as DropData | undefined;

      if (dropData) {
        let position: { x: number; y: number } | undefined;

        // Calculate position for battlefield/stack using rect data at drop time
        // This is more reliable than tracking mouse position during drag
        if ((dropData.zone === 'battlefield' || dropData.zone === 'stack') &&
            over.rect && active.rect.current?.translated) {
          const overRect = over.rect;
          const activeRect = active.rect.current.translated;

          // Calculate center of dragged card relative to droppable
          const centerX = activeRect.left + activeRect.width / 2;
          const centerY = activeRect.top + activeRect.height / 2;

          // Convert to percentage and clamp to bounds
          const rawPosition = {
            x: Math.max(5, Math.min(95, ((centerX - overRect.left) / overRect.width) * 100)),
            y: Math.max(5, Math.min(95, ((centerY - overRect.top) / overRect.height) * 100)),
          };

          // Apply grid snapping for battlefield, free positioning for stack
          position = dropData.zone === 'battlefield' ? snapToGrid(rawPosition) : rawPosition;
        }

        onDragEnd(activeCard, activeSourceZone, dropData.zone, position);
      }
    }

    // Reset state
    setActiveCard(null);
    setActiveSourceZone(null);
  }, [activeCard, activeSourceZone, onDragEnd]);

  const handleDragCancel = useCallback(() => {
    setActiveCard(null);
    setActiveSourceZone(null);
  }, []);

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      {children}

      {/* Drag overlay - shows the card being dragged */}
      <DragOverlay dropAnimation={null}>
        {activeCard && (
          <div className="opacity-90 rotate-3 scale-105">
            <Card card={activeCard} size="md" />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
