import { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import type { Card as CardType, Zone } from '@paper-magic/shared';
import { Card, CardStack } from './Card';
import { CardContextMenu } from './CardContextMenu';
import * as Dialog from '@radix-ui/react-dialog';
import type { DropData } from './DndProvider';

interface ExileZoneProps {
  activeCards: CardType[];    // Exile 1 - Adventures, impulse draw, etc.
  permanentCards: CardType[]; // Exile 2 - Permanently exiled
  isOpponent?: boolean;
  onCardClick?: (card: CardType) => void;
  onCardMoveTo?: (card: CardType, zone: Zone) => void;
  onCardPutOnTop?: (card: CardType) => void;
  onCardPutOnBottom?: (card: CardType) => void;
  onCardAddCounter?: (card: CardType, type: string) => void;
  onCardRemoveCounter?: (card: CardType, index: number) => void;
}

// Individual exile zone component
function SingleExileZone({
  cards,
  label,
  zoneId,
  droppableId,
  isOpponent,
  onCardClick,
  onCardMoveTo,
  onCardPutOnTop,
  onCardPutOnBottom,
  onCardAddCounter,
  onCardRemoveCounter,
}: {
  cards: CardType[];
  label: string;
  zoneId: 'exileActive' | 'exilePermanent';
  droppableId: string;
  isOpponent: boolean;
  onCardClick?: (card: CardType) => void;
  onCardMoveTo?: (card: CardType, zone: Zone) => void;
  onCardPutOnTop?: (card: CardType) => void;
  onCardPutOnBottom?: (card: CardType) => void;
  onCardAddCounter?: (card: CardType, type: string) => void;
  onCardRemoveCounter?: (card: CardType, index: number) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);

  const dropData: DropData = { zone: zoneId };
  const { setNodeRef, isOver } = useDroppable({
    id: droppableId,
    data: dropData,
    disabled: isOpponent,
  });

  return (
    <Dialog.Root open={isOpen} onOpenChange={setIsOpen}>
      <Dialog.Trigger asChild>
        <div
          ref={setNodeRef}
          className={`
            flex flex-col items-center gap-1 cursor-pointer p-1 rounded
            ${isOver && !isOpponent ? 'ring-2 ring-purple-500 bg-purple-500/10' : ''}
            transition-all duration-150 hover:bg-surface-lighter/30
          `}
        >
          <div className="relative">
            {cards.length > 0 ? (
              <CardStack cards={cards} size="sm" maxShow={2} />
            ) : (
              <div className="w-10 h-14 border border-dashed border-purple-800 rounded flex items-center justify-center">
                <span className="text-[10px] text-purple-700">0</span>
              </div>
            )}
          </div>
          <span className={`text-[10px] ${isOver && !isOpponent ? 'text-purple-400' : 'text-gray-500'}`}>
            {label} ({cards.length})
          </span>
        </div>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/70 z-40" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-surface-light rounded-lg p-6 max-w-2xl max-h-[80vh] overflow-auto z-50">
          <Dialog.Title className="text-lg font-medium text-gray-100 mb-4">
            {isOpponent ? `Opponent's ${label}` : label}
          </Dialog.Title>

          <p className="text-xs text-gray-500 mb-4">
            {zoneId === 'exileActive'
              ? 'Cards that can be played or returned (Adventures, Impulse draw, Foretell, Suspend, etc.)'
              : 'Cards exiled permanently - right-click for options'}
          </p>

          {cards.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No cards</p>
          ) : (
            <div className="grid grid-cols-4 gap-3">
              {cards.map((card) => (
                <div key={card.instanceId}>
                  <CardContextMenu
                    card={card}
                    currentZone={zoneId}
                    disabled={isOpponent}
                    onMoveTo={(zone) => onCardMoveTo?.(card, zone)}
                    onPutOnTop={() => onCardPutOnTop?.(card)}
                    onPutOnBottom={() => onCardPutOnBottom?.(card)}
                    onAddCounter={(type) => onCardAddCounter?.(card, type)}
                    onRemoveCounter={(index) => onCardRemoveCounter?.(card, index)}
                  >
                    <div className="relative">
                      <Card card={card} size="md" onClick={() => onCardClick?.(card)} />
                      {/* Show counters badge if card has counters */}
                      {card.counters.length > 0 && (
                        <div className="absolute -top-2 -right-2 flex gap-0.5">
                          {card.counters.map((counter, idx) => (
                            <div
                              key={idx}
                              className="w-5 h-5 rounded-full bg-cyan-600 flex items-center justify-center text-[10px] font-bold text-white border border-cyan-400"
                              title={`${counter.label || counter.type}: ${counter.value}`}
                            >
                              {counter.value}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </CardContextMenu>
                </div>
              ))}
            </div>
          )}

          <Dialog.Close asChild>
            <button
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-200"
              aria-label="Close"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export function ExileZone({
  activeCards,
  permanentCards,
  isOpponent = false,
  onCardClick,
  onCardMoveTo,
  onCardPutOnTop,
  onCardPutOnBottom,
  onCardAddCounter,
  onCardRemoveCounter,
}: ExileZoneProps) {
  return (
    <div className="flex gap-1">
      {/* Exile 1 (Active) */}
      <SingleExileZone
        cards={activeCards}
        label="Exile 1"
        zoneId="exileActive"
        droppableId={isOpponent ? 'opponent-exile-1' : 'exile-1'}
        isOpponent={isOpponent}
        onCardClick={onCardClick}
        onCardMoveTo={onCardMoveTo}
        onCardPutOnTop={onCardPutOnTop}
        onCardPutOnBottom={onCardPutOnBottom}
        onCardAddCounter={onCardAddCounter}
        onCardRemoveCounter={onCardRemoveCounter}
      />

      {/* Exile 2 (Permanent) */}
      <SingleExileZone
        cards={permanentCards}
        label="Exile 2"
        zoneId="exilePermanent"
        droppableId={isOpponent ? 'opponent-exile-2' : 'exile-2'}
        isOpponent={isOpponent}
        onCardClick={onCardClick}
        onCardMoveTo={onCardMoveTo}
        onCardPutOnTop={onCardPutOnTop}
        onCardPutOnBottom={onCardPutOnBottom}
        onCardAddCounter={onCardAddCounter}
        onCardRemoveCounter={onCardRemoveCounter}
      />
    </div>
  );
}
