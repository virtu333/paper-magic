import type { Card as CardType, Zone } from '@paper-magic/shared';
import { Card } from './Card';
import { DraggableCard } from './DraggableCard';
import { CardContextMenu } from './CardContextMenu';

interface HandProps {
  cards: CardType[];
  isOpponent?: boolean;
  onCardClick?: (card: CardType, index: number) => void;
  onCardDoubleClick?: (card: CardType, index: number) => void;
  onCardMoveTo?: (card: CardType, zone: Zone, faceDown?: boolean) => void;
  onRevealCard?: (card: CardType) => void;
  selectedCardId?: string;
  enableDrag?: boolean;
}

export function Hand({
  cards,
  isOpponent = false,
  onCardClick,
  onCardDoubleClick,
  onCardMoveTo,
  onRevealCard,
  selectedCardId,
  enableDrag = true,
}: HandProps) {
  if (cards.length === 0) {
    return (
      <div className="h-28 flex items-center justify-center text-gray-600 text-sm">
        {isOpponent ? 'Opponent has no cards in hand' : 'Your hand is empty'}
      </div>
    );
  }

  // Calculate overlap based on number of cards
  const getOverlap = () => {
    if (cards.length <= 5) return 0;
    if (cards.length <= 7) return 20;
    if (cards.length <= 10) return 35;
    return 45;
  };

  const overlap = getOverlap();

  return (
    <div className="relative h-28 flex items-center justify-center">
      <div
        className="flex items-center"
        style={{
          marginLeft: overlap > 0 ? `${overlap * (cards.length - 1) / 2}px` : 0,
        }}
      >
        {cards.map((card, index) => (
          <div
            key={card.instanceId}
            className="transition-transform hover:z-10 hover:-translate-y-2"
            style={{
              marginLeft: index > 0 ? `-${overlap}px` : 0,
              zIndex: index,
            }}
          >
            {!isOpponent ? (
              <CardContextMenu
                card={card}
                currentZone="hand"
                onMoveTo={(zone, faceDown) => onCardMoveTo?.(card, zone, faceDown)}
                onRevealCard={() => onRevealCard?.(card)}
              >
                <div>
                  {enableDrag ? (
                    <DraggableCard
                      card={card}
                      sourceZone="hand"
                      size="md"
                      showBack={false}
                      selected={card.instanceId === selectedCardId}
                      onClick={() => onCardClick?.(card, index)}
                      onDoubleClick={() => onCardDoubleClick?.(card, index)}
                    />
                  ) : (
                    <Card
                      card={card}
                      size="md"
                      showBack={false}
                      selected={card.instanceId === selectedCardId}
                      onClick={() => onCardClick?.(card, index)}
                      onDoubleClick={() => onCardDoubleClick?.(card, index)}
                    />
                  )}
                </div>
              </CardContextMenu>
            ) : (
              <Card
                card={card}
                size="md"
                showBack={true}
                selected={card.instanceId === selectedCardId}
                onClick={() => onCardClick?.(card, index)}
              />
            )}
          </div>
        ))}
      </div>

      {/* Card count */}
      <div className="absolute top-0 right-0 px-2 py-1 bg-surface-lighter rounded text-xs text-gray-400">
        {cards.length} cards
      </div>
    </div>
  );
}
