import { useRef, useCallback } from 'react';
import { useDroppable } from '@dnd-kit/core';
import type { Card as CardType, Zone } from '@paper-magic/shared';
import { InteractiveCard } from './InteractiveCard';
import type { DropData } from './DndProvider';

interface BattlefieldProps {
  cards: CardType[];
  isOpponent?: boolean;
  onCardClick?: (card: CardType) => void;
  onCardDoubleClick?: (card: CardType) => void;
  selectedCardId?: string;
  enableDrag?: boolean;
  // Context menu actions
  onCardTap?: (card: CardType) => void;
  onCardUntap?: (card: CardType) => void;
  onCardFlip?: (card: CardType) => void;
  onCardTransform?: (card: CardType) => void;
  onCardMoveTo?: (card: CardType, zone: Zone) => void;
  onCardPutOnTop?: (card: CardType) => void;
  onCardPutOnBottom?: (card: CardType) => void;
  onCardAddCounter?: (card: CardType, type: string) => void;
  onCardRemoveCounter?: (card: CardType, index: number) => void;
  onDestroyToken?: (card: CardType) => void;
  onCardAttachTo?: (card: CardType, targetId: string) => void;
  onCardDetach?: (card: CardType) => void;
  onBringToFront?: (card: CardType) => void;
  onSendToBack?: (card: CardType) => void;
  // Combined cards from both battlefields for cross-player attachments
  allBattlefieldCards?: CardType[];
}

export function Battlefield({
  cards,
  isOpponent = false,
  onCardClick,
  onCardDoubleClick,
  selectedCardId,
  enableDrag = true,
  onCardTap,
  onCardUntap,
  onCardFlip,
  onCardTransform,
  onCardMoveTo,
  onCardPutOnTop,
  onCardPutOnBottom,
  onCardAddCounter,
  onCardRemoveCounter,
  onDestroyToken,
  onCardAttachTo,
  onCardDetach,
  onBringToFront,
  onSendToBack,
  allBattlefieldCards,
}: BattlefieldProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Set up droppable - position is calculated at drop time in DndProvider
  const dropData: DropData = {
    zone: 'battlefield',
    isOpponentBattlefield: isOpponent,
  };

  const { setNodeRef, isOver } = useDroppable({
    id: isOpponent ? 'opponent-battlefield' : 'battlefield',
    data: dropData,
    // Allow drops on both battlefields (paper Magic style)
  });

  // Group cards by attachment
  const baseCards = cards.filter(c => !c.attachedTo);
  const attachments = cards.filter(c => c.attachedTo);

  // Get attachments for a card, sorted by zIndex (descending) so Bring to Front/Send to Back works
  // Higher zIndex = sorts first = attachIndex 0 = CSS zIndex -1 = visually on top
  const getAttachments = (cardId: string) => {
    return attachments
      .filter(a => a.attachedTo === cardId)
      .sort((a, b) => (b.zIndex ?? 1) - (a.zIndex ?? 1));
  };

  // Combine refs
  const setRefs = useCallback((node: HTMLDivElement | null) => {
    (containerRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
    setNodeRef(node);
  }, [setNodeRef]);

  return (
    <div
      ref={setRefs}
      className={`
        relative w-full h-80
        bg-surface-lighter/30 rounded-lg border border-gray-800
        cursor-crosshair
        ${isOver ? 'ring-2 ring-accent bg-accent/10' : ''}
      `}
    >
      {/* Empty state */}
      {cards.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center text-gray-600 text-sm pointer-events-none">
          {isOpponent ? "Opponent's battlefield" : 'Your battlefield - drag cards here'}
        </div>
      )}

      {/* Cards */}
      {baseCards.map((card) => {
        // Use card's position - server provides default if none set
        const position = card.position || { x: 50, y: 50 };
        const cardAttachments = getAttachments(card.instanceId);

        return (
          <div
            key={card.instanceId}
            className="absolute"
            style={{
              left: `${position.x}%`,
              top: `${isOpponent ? 100 - position.y : position.y}%`,
              transform: 'translate(-50%, -50%)',
              // Use card's zIndex (default to 1), but selected card always goes on top
              zIndex: card.instanceId === selectedCardId ? 1000 : (card.zIndex ?? 1),
            }}
          >
            {/* Attachments (rendered behind/tucked like paper Magic) */}
            {cardAttachments.map((attachment, attachIndex) => (
              <div
                key={attachment.instanceId}
                className="absolute"
                style={{
                  // Offset each attachment so it peeks out behind the main card
                  top: `${(attachIndex + 1) * 25}px`,
                  left: `${(attachIndex + 1) * 8}px`,
                  zIndex: -attachIndex - 1,
                }}
              >
                <InteractiveCard
                  card={attachment}
                  zone="battlefield"
                  size="md"
                  enableDrag={enableDrag}
                  enableContextMenu={true}
                  onClick={() => onCardClick?.(attachment)}
                  onDoubleClick={() => onCardDoubleClick?.(attachment)}
                  onTap={() => onCardTap?.(attachment)}
                  onUntap={() => onCardUntap?.(attachment)}
                  onFlip={() => onCardFlip?.(attachment)}
                  onTransform={() => onCardTransform?.(attachment)}
                  onMoveTo={(zone) => onCardMoveTo?.(attachment, zone)}
                  onPutOnTop={() => onCardPutOnTop?.(attachment)}
                  onPutOnBottom={() => onCardPutOnBottom?.(attachment)}
                  onAddCounter={(type) => onCardAddCounter?.(attachment, type)}
                  onRemoveCounter={(index) => onCardRemoveCounter?.(attachment, index)}
                  onDestroyToken={() => onDestroyToken?.(attachment)}
                  onAttachTo={(targetId) => onCardAttachTo?.(attachment, targetId)}
                  onDetach={() => onCardDetach?.(attachment)}
                  onBringToFront={() => onBringToFront?.(attachment)}
                  onSendToBack={() => onSendToBack?.(attachment)}
                  otherBattlefieldCards={allBattlefieldCards ?? cards}
                />
              </div>
            ))}

            {/* Main card */}
            <InteractiveCard
              card={card}
              zone="battlefield"
              size="md"
              selected={card.instanceId === selectedCardId}
              enableDrag={enableDrag}
              enableContextMenu={true}
              onClick={() => onCardClick?.(card)}
              onDoubleClick={() => onCardDoubleClick?.(card)}
              onTap={() => onCardTap?.(card)}
              onUntap={() => onCardUntap?.(card)}
              onFlip={() => onCardFlip?.(card)}
              onTransform={() => onCardTransform?.(card)}
              onMoveTo={(zone) => onCardMoveTo?.(card, zone)}
              onPutOnTop={() => onCardPutOnTop?.(card)}
              onPutOnBottom={() => onCardPutOnBottom?.(card)}
              onAddCounter={(type) => onCardAddCounter?.(card, type)}
              onRemoveCounter={(index) => onCardRemoveCounter?.(card, index)}
              onDestroyToken={() => onDestroyToken?.(card)}
              onAttachTo={(targetId) => onCardAttachTo?.(card, targetId)}
              onDetach={() => onCardDetach?.(card)}
              onBringToFront={() => onBringToFront?.(card)}
              onSendToBack={() => onSendToBack?.(card)}
              otherBattlefieldCards={allBattlefieldCards ?? cards}
            />
          </div>
        );
      })}

      {/* Zone label */}
      <div className="absolute bottom-1 left-1 text-xs text-gray-600 pointer-events-none">
        {isOpponent ? 'Opponent' : 'Battlefield'} ({cards.length})
      </div>
    </div>
  );
}
