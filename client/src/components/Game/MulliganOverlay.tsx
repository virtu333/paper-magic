import { useState, useCallback } from 'react';
import type { Card as CardType, Player } from '@paper-magic/shared';
import { Card } from './Card';

interface MulliganOverlayProps {
  player: Player;
  opponent: Player | null;
  isGoldfishMode?: boolean;
  onKeep: (cardsToBottom: string[]) => void;
  onMulligan: () => void;
}

export function MulliganOverlay({
  player,
  opponent,
  isGoldfishMode = false,
  onKeep,
  onMulligan,
}: MulliganOverlayProps) {
  const [selectedCards, setSelectedCards] = useState<Set<string>>(new Set());
  const [showBottomSelection, setShowBottomSelection] = useState(false);

  const cardsToBottom = player.mulliganCount;

  const handleKeepClick = useCallback(() => {
    if (cardsToBottom > 0) {
      // Need to select cards to put on bottom
      setShowBottomSelection(true);
    } else {
      // No cards to bottom, just keep
      onKeep([]);
    }
  }, [cardsToBottom, onKeep]);

  const handleCardSelect = useCallback((card: CardType) => {
    setSelectedCards((prev) => {
      const next = new Set(prev);
      if (next.has(card.instanceId)) {
        next.delete(card.instanceId);
      } else if (next.size < cardsToBottom) {
        next.add(card.instanceId);
      }
      return next;
    });
  }, [cardsToBottom]);

  const handleConfirmBottom = useCallback(() => {
    if (selectedCards.size === cardsToBottom) {
      onKeep(Array.from(selectedCards));
    }
  }, [selectedCards, cardsToBottom, onKeep]);

  const handleCancelBottom = useCallback(() => {
    setShowBottomSelection(false);
    setSelectedCards(new Set());
  }, []);

  // If player has already kept, show waiting state
  if (player.hasKeptHand) {
    return (
      <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-50">
        <div className="bg-surface-light rounded-xl p-8 max-w-md text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Hand Kept</h2>
          <p className="text-gray-400 mb-6">
            {opponent?.hasKeptHand
              ? 'Both players ready! Game starting...'
              : 'Waiting for opponent to finish mulligan...'}
          </p>
          <div className="flex items-center justify-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span className="text-green-400">You</span>
            <span className="text-gray-500 mx-2">|</span>
            <div className={`w-3 h-3 rounded-full ${opponent?.hasKeptHand ? 'bg-green-500' : 'bg-yellow-500 animate-pulse'}`} />
            <span className={opponent?.hasKeptHand ? 'text-green-400' : 'text-yellow-400'}>
              {opponent?.name || 'Opponent'}
            </span>
          </div>
        </div>
      </div>
    );
  }

  // Bottom card selection mode
  if (showBottomSelection) {
    return (
      <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-50">
        <div className="bg-surface-light rounded-xl p-6 max-w-4xl w-full mx-4">
          <h2 className="text-xl font-bold text-white mb-2">
            Select {cardsToBottom} card{cardsToBottom > 1 ? 's' : ''} to put on bottom
          </h2>
          <p className="text-gray-400 mb-6 text-sm">
            London mulligan: select cards to put on the bottom of your library in any order.
          </p>

          {/* Hand display */}
          <div className="flex justify-center gap-3 mb-8 flex-wrap">
            {player.hand.map((card) => (
              <div
                key={card.instanceId}
                className={`cursor-pointer transition-all ${
                  selectedCards.has(card.instanceId)
                    ? 'ring-4 ring-red-500 scale-105 -translate-y-2'
                    : 'hover:scale-105'
                }`}
                onClick={() => handleCardSelect(card)}
              >
                <Card card={card} size="lg" />
              </div>
            ))}
          </div>

          {/* Selection counter */}
          <div className="text-center mb-6">
            <span className={`text-lg font-medium ${
              selectedCards.size === cardsToBottom ? 'text-green-400' : 'text-yellow-400'
            }`}>
              {selectedCards.size} / {cardsToBottom} selected
            </span>
          </div>

          {/* Actions */}
          <div className="flex justify-center gap-4">
            <button
              onClick={handleCancelBottom}
              className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmBottom}
              disabled={selectedCards.size !== cardsToBottom}
              className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                selectedCards.size === cardsToBottom
                  ? 'bg-green-600 hover:bg-green-500 text-white'
                  : 'bg-gray-600 text-gray-400 cursor-not-allowed'
              }`}
            >
              Confirm & Keep
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Main mulligan decision
  return (
    <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-50">
      <div className="bg-surface-light rounded-xl p-6 max-w-4xl w-full mx-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white">
            Opening Hand
            {player.mulliganCount > 0 && (
              <span className="ml-2 text-yellow-400 text-base font-normal">
                (Mulligan {player.mulliganCount})
              </span>
            )}
          </h2>
          {!isGoldfishMode && (
            <div className="text-gray-400 text-sm">
              {opponent?.hasKeptHand ? (
                <span className="text-green-400">Opponent has kept</span>
              ) : (
                <span className="text-yellow-400">Opponent deciding...</span>
              )}
            </div>
          )}
          {isGoldfishMode && (
            <div className="text-purple-400 text-sm">
              Solo practice mode
            </div>
          )}
        </div>

        {/* Hand display */}
        <div className="flex justify-center gap-3 mb-8 flex-wrap">
          {player.hand.map((card) => (
            <div key={card.instanceId} className="transition-transform hover:scale-105">
              <Card card={card} size="lg" />
            </div>
          ))}
        </div>

        {/* Info text */}
        {cardsToBottom > 0 && (
          <p className="text-center text-yellow-400 text-sm mb-4">
            If you keep, you'll need to put {cardsToBottom} card{cardsToBottom > 1 ? 's' : ''} on the bottom of your library.
          </p>
        )}

        {/* Actions */}
        <div className="flex justify-center gap-4">
          <button
            onClick={onMulligan}
            disabled={player.hand.length <= 1}
            className={`px-8 py-3 rounded-lg font-medium transition-colors ${
              player.hand.length <= 1
                ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                : 'bg-red-600 hover:bg-red-500 text-white'
            }`}
          >
            Mulligan to {Math.max(0, player.hand.length - 1)}
          </button>
          <button
            onClick={handleKeepClick}
            className="px-8 py-3 bg-green-600 hover:bg-green-500 text-white rounded-lg font-medium transition-colors"
          >
            Keep Hand
          </button>
        </div>

        {/* Card count info */}
        <p className="text-center text-gray-500 text-sm mt-4">
          {player.hand.length} cards in hand | {player.deck.length} cards in library
        </p>
      </div>
    </div>
  );
}
