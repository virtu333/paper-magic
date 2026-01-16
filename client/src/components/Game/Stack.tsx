import { useRef, useCallback, useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import type { Card as CardType } from '@paper-magic/shared';
import { InteractiveCard } from './InteractiveCard';
import type { DropData } from './DndProvider';

interface StackProps {
  cards: CardType[];
  onCardClick?: (card: CardType) => void;
  onCardRightClick?: (card: CardType, e: React.MouseEvent) => void;
}

export function Stack({ cards, onCardClick }: StackProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dropPosition, setDropPosition] = useState<{ x: number; y: number } | null>(null);

  const dropData: DropData = {
    zone: 'stack',
    position: dropPosition || undefined,
  };

  const { setNodeRef, isOver } = useDroppable({
    id: 'stack',
    data: dropData,
  });

  // Track mouse position for drop location
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!containerRef.current || !isOver) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    setDropPosition({ x, y });
  }, [isOver]);

  // Combine refs
  const setRefs = useCallback((node: HTMLDivElement | null) => {
    (containerRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
    setNodeRef(node);
  }, [setNodeRef]);

  if (cards.length === 0) {
    return (
      <div
        ref={setRefs}
        className={`w-full h-full flex items-center justify-center ${
          isOver ? 'ring-2 ring-yellow-500 bg-yellow-500/10' : ''
        }`}
        onMouseMove={handleMouseMove}
      >
        <div className="text-gray-600 text-xs text-center">
          <div className="mb-1">Stack</div>
          <div className="text-gray-700">{isOver ? 'Drop to cast' : '(Empty)'}</div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={setRefs}
      className={`relative w-full h-full ${
        isOver ? 'ring-2 ring-yellow-500 bg-yellow-500/10' : ''
      }`}
      onMouseMove={handleMouseMove}
    >
      <div className="text-xs text-gray-500 p-2">
        Stack ({cards.length})
      </div>

      {/* Drop position indicator */}
      {isOver && dropPosition && (
        <div
          className="absolute w-12 h-16 border-2 border-dashed border-yellow-500 rounded-lg pointer-events-none"
          style={{
            left: `${dropPosition.x}%`,
            top: `${dropPosition.y}%`,
            transform: 'translate(-50%, -50%)',
          }}
        />
      )}

      {/* Cards with free positioning */}
      {cards.map((card, index) => {
        // Use card's position if available, otherwise stack vertically
        const position = card.position || {
          x: 50,
          y: 15 + index * 20,
        };

        return (
          <div
            key={card.instanceId}
            className="absolute"
            style={{
              left: `${position.x}%`,
              top: `${position.y}%`,
              transform: 'translate(-50%, -50%)',
              zIndex: index + 1,
            }}
          >
            {/* Order indicator */}
            <div className="absolute -left-4 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-yellow-600 flex items-center justify-center text-[10px] font-bold text-white z-10">
              {index + 1}
            </div>
            <InteractiveCard
              card={card}
              zone="stack"
              size="sm"
              enableDrag={true}
              enableContextMenu={true}
              onClick={() => onCardClick?.(card)}
            />
          </div>
        );
      })}
    </div>
  );
}
