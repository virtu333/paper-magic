import { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import type { Card as CardType, Zone } from '@paper-magic/shared';
import { Card, CardStack } from './Card';
import { CardContextMenu } from './CardContextMenu';
import * as Dialog from '@radix-ui/react-dialog';
import type { DropData } from './DndProvider';

interface GraveyardProps {
  cards: CardType[];
  isOpponent?: boolean;
  onCardClick?: (card: CardType) => void;
  onCardMoveTo?: (card: CardType, zone: Zone) => void;
  onCardPutOnTop?: (card: CardType) => void;
  onCardPutOnBottom?: (card: CardType) => void;
}

export function Graveyard({
  cards,
  isOpponent = false,
  onCardClick,
  onCardMoveTo,
  onCardPutOnTop,
  onCardPutOnBottom,
}: GraveyardProps) {
  const [isOpen, setIsOpen] = useState(false);

  const dropData: DropData = { zone: 'graveyard' };
  const { setNodeRef, isOver } = useDroppable({
    id: isOpponent ? 'opponent-graveyard' : 'graveyard',
    data: dropData,
    disabled: isOpponent,
  });

  return (
    <Dialog.Root open={isOpen} onOpenChange={setIsOpen}>
      <Dialog.Trigger asChild>
        <div
          ref={setNodeRef}
          className={`
            flex flex-col items-center gap-1 cursor-pointer
            ${isOver && !isOpponent ? 'ring-2 ring-red-500 rounded-lg' : ''}
            transition-all duration-150
          `}
        >
          <CardStack
            cards={cards}
            size="sm"
            maxShow={3}
          />
          <span className={`text-xs ${isOver && !isOpponent ? 'text-red-400' : 'text-gray-500'}`}>
            GY ({cards.length})
          </span>
        </div>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/70 z-40" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-surface-light rounded-lg p-6 max-w-3xl max-h-[80vh] overflow-auto z-50">
          <Dialog.Title className="text-lg font-medium text-gray-100 mb-4">
            {isOpponent ? "Opponent's Graveyard" : 'Your Graveyard'} ({cards.length} cards)
          </Dialog.Title>

          {cards.length === 0 ? (
            <p className="text-gray-500 text-center py-8">Graveyard is empty</p>
          ) : (
            <div className="grid grid-cols-5 gap-3">
              {cards.map((card) => (
                <div key={card.instanceId}>
                  <CardContextMenu
                    card={card}
                    currentZone="graveyard"
                    disabled={isOpponent}
                    onMoveTo={(zone) => onCardMoveTo?.(card, zone)}
                    onPutOnTop={() => onCardPutOnTop?.(card)}
                    onPutOnBottom={() => onCardPutOnBottom?.(card)}
                  >
                    <div>
                      <Card
                        card={card}
                        size="md"
                        onClick={() => onCardClick?.(card)}
                      />
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
