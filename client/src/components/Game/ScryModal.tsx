import { useState, useCallback, useEffect } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import type { Card as CardType, Zone } from '@paper-magic/shared';
import { Card } from './Card';
import { CardContextMenu } from './CardContextMenu';

interface ScryModalProps {
  isOpen: boolean;
  onClose: () => void;
  cards: CardType[];
  onComplete: (topCards: CardType[], bottomCards: CardType[]) => void;
  mode: 'scry' | 'reveal' | 'reveal-interactive';
  onMoveToZone?: (card: CardType, zone: Zone) => void;
}

export function ScryModal({
  isOpen,
  onClose,
  cards,
  onComplete,
  mode,
  onMoveToZone,
}: ScryModalProps) {
  // Track which cards go on top vs bottom
  const [topCards, setTopCards] = useState<CardType[]>([]);
  const [bottomCards, setBottomCards] = useState<CardType[]>([]);
  const [pendingCards, setPendingCards] = useState<CardType[]>(cards);
  const [movedCards, setMovedCards] = useState<CardType[]>([]);

  const isInteractive = mode === 'reveal-interactive';

  // Reset state when cards change
  useEffect(() => {
    setTopCards([]);
    setBottomCards([]);
    setPendingCards(cards);
    setMovedCards([]);
  }, [cards]);

  const handleMoveToZone = useCallback((card: CardType, zone: Zone) => {
    setPendingCards(prev => prev.filter(c => c.instanceId !== card.instanceId));
    setTopCards(prev => prev.filter(c => c.instanceId !== card.instanceId));
    setBottomCards(prev => prev.filter(c => c.instanceId !== card.instanceId));
    setMovedCards(prev => [...prev, card]);
    onMoveToZone?.(card, zone);
  }, [onMoveToZone]);

  const handlePutOnTop = useCallback((card: CardType) => {
    setPendingCards(prev => prev.filter(c => c.instanceId !== card.instanceId));
    setTopCards(prev => [...prev, card]);
  }, []);

  const handlePutOnBottom = useCallback((card: CardType) => {
    setPendingCards(prev => prev.filter(c => c.instanceId !== card.instanceId));
    setBottomCards(prev => [...prev, card]);
  }, []);

  const handleRemoveFromTop = useCallback((card: CardType) => {
    setTopCards(prev => prev.filter(c => c.instanceId !== card.instanceId));
    setPendingCards(prev => [...prev, card]);
  }, []);

  const handleRemoveFromBottom = useCallback((card: CardType) => {
    setBottomCards(prev => prev.filter(c => c.instanceId !== card.instanceId));
    setPendingCards(prev => [...prev, card]);
  }, []);

  const handleAllToTop = useCallback(() => {
    setTopCards(prev => [...prev, ...pendingCards]);
    setPendingCards([]);
  }, [pendingCards]);

  const handleAllToBottom = useCallback(() => {
    setBottomCards(prev => [...prev, ...pendingCards]);
    setPendingCards([]);
  }, [pendingCards]);

  const handleConfirm = useCallback(() => {
    // Any remaining pending cards stay on top in original order
    const finalTop = [...topCards, ...pendingCards];
    onComplete(finalTop, bottomCards);
    onClose();
  }, [topCards, pendingCards, bottomCards, onComplete, onClose]);

  const handleCancel = useCallback(() => {
    // Reset and close - keep all cards on top
    onComplete(cards, []);
    onClose();
  }, [cards, onComplete, onClose]);

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && handleCancel()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/70 z-50" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-surface-dark border border-gray-700 rounded-lg p-6 w-[700px] max-h-[80vh] overflow-y-auto z-50">
          <Dialog.Title className="text-xl font-bold text-gray-100 mb-4">
            {mode === 'scry'
              ? `Scry ${cards.length}`
              : isInteractive
                ? `Revealed ${cards.length} cards (also shown to opponent)`
                : `Looking at top ${cards.length} cards`}
          </Dialog.Title>

          <Dialog.Description className="text-sm text-gray-400 mb-4">
            {mode === 'scry'
              ? 'Click cards to put them on top or bottom of your library. Cards on top will be in the order shown (left = top of library).'
              : isInteractive
                ? 'Right-click cards to move to other zones. Use buttons to arrange on top/bottom of library.'
                : 'View your top cards. Click to put on top or bottom of your library.'}
          </Dialog.Description>

          {/* Pending cards */}
          {pendingCards.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-300">
                  Cards to arrange ({pendingCards.length})
                </h3>
                <div className="flex gap-2">
                  <button
                    onClick={handleAllToTop}
                    className="px-2 py-1 text-xs bg-green-600 hover:bg-green-500 rounded"
                  >
                    All to top
                  </button>
                  <button
                    onClick={handleAllToBottom}
                    className="px-2 py-1 text-xs bg-red-600 hover:bg-red-500 rounded"
                  >
                    All to bottom
                  </button>
                </div>
              </div>
              <div className="flex gap-2 flex-wrap p-3 bg-surface/50 rounded-lg min-h-[100px]">
                {pendingCards.map((card) => (
                  <div key={card.instanceId} className="flex flex-col items-center gap-1">
                    {isInteractive ? (
                      <CardContextMenu
                        card={card}
                        currentZone="deck"
                        onMoveTo={(zone) => handleMoveToZone(card, zone)}
                        onPutOnTop={() => handlePutOnTop(card)}
                        onPutOnBottom={() => handlePutOnBottom(card)}
                      >
                        <div>
                          <Card card={card} size="md" />
                        </div>
                      </CardContextMenu>
                    ) : (
                      <Card card={card} size="md" />
                    )}
                    <div className="flex gap-1 flex-wrap justify-center">
                      <button
                        onClick={() => handlePutOnTop(card)}
                        className="px-2 py-0.5 text-xs bg-green-600 hover:bg-green-500 rounded"
                        title="Put on top of library"
                      >
                        Top
                      </button>
                      <button
                        onClick={() => handlePutOnBottom(card)}
                        className="px-2 py-0.5 text-xs bg-red-600 hover:bg-red-500 rounded"
                        title="Put on bottom of library"
                      >
                        Bottom
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Top of library section */}
          <div className="mb-4">
            <h3 className="text-sm font-medium text-green-400 mb-2">
              Top of library ({topCards.length}) - Left card will be on top
            </h3>
            <div className="flex gap-2 flex-wrap p-3 bg-green-900/20 border border-green-800 rounded-lg min-h-[80px]">
              {topCards.length === 0 ? (
                <span className="text-gray-600 text-sm">No cards selected for top</span>
              ) : (
                topCards.map((card, index) => (
                  <div key={card.instanceId} className="relative">
                    <div className="absolute -top-2 -left-1 w-5 h-5 bg-green-600 rounded-full flex items-center justify-center text-xs font-bold z-10">
                      {index + 1}
                    </div>
                    <Card card={card} size="sm" onClick={() => handleRemoveFromTop(card)} />
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Bottom of library section */}
          <div className="mb-4">
            <h3 className="text-sm font-medium text-red-400 mb-2">
              Bottom of library ({bottomCards.length})
            </h3>
            <div className="flex gap-2 flex-wrap p-3 bg-red-900/20 border border-red-800 rounded-lg min-h-[80px]">
              {bottomCards.length === 0 ? (
                <span className="text-gray-600 text-sm">No cards selected for bottom</span>
              ) : (
                bottomCards.map((card) => (
                  <div key={card.instanceId}>
                    <Card card={card} size="sm" onClick={() => handleRemoveFromBottom(card)} />
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Moved cards section - only for interactive mode */}
          {isInteractive && movedCards.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-medium text-blue-400 mb-2">
                Moved to other zones ({movedCards.length})
              </h3>
              <div className="flex gap-2 flex-wrap p-3 bg-blue-900/20 border border-blue-800 rounded-lg">
                {movedCards.map((card) => (
                  <div key={card.instanceId} className="opacity-60">
                    <Card card={card} size="sm" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <button
              onClick={handleCancel}
              className="px-4 py-2 text-sm bg-surface-light hover:bg-surface-lighter rounded"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              className="px-4 py-2 text-sm bg-accent hover:bg-accent/80 rounded font-medium"
            >
              Confirm
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
