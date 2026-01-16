import { useState, useCallback, useEffect, useMemo } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import * as ContextMenu from '@radix-ui/react-context-menu';
import type { Card as CardType } from '@paper-magic/shared';
import { Card } from './Card';

interface SearchLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  cards: CardType[];
  onSelectCard: (card: CardType, destination: 'hand' | 'battlefield' | 'top' | 'bottom' | 'exileActive' | 'exilePermanent' | 'graveyard') => void;
  onComplete: (shuffle: boolean) => void;
}

type Destination = 'hand' | 'battlefield' | 'top' | 'bottom' | 'exileActive' | 'exilePermanent' | 'graveyard';

interface SelectedCard {
  card: CardType;
  destination: Destination;
}

export function SearchLibraryModal({
  isOpen,
  onClose,
  cards,
  onSelectCard,
  onComplete,
}: SearchLibraryModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCards, setSelectedCards] = useState<SelectedCard[]>([]);
  const [shuffleAfter, setShuffleAfter] = useState(true);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setSelectedCards([]);
      setShuffleAfter(true);
    }
  }, [isOpen]);

  // Filter cards based on search query
  const filteredCards = useMemo(() => {
    if (!searchQuery.trim()) {
      return cards;
    }
    const query = searchQuery.toLowerCase();
    return cards.filter(card =>
      card.name.toLowerCase().includes(query)
    );
  }, [cards, searchQuery]);

  // Get cards that haven't been selected yet
  const availableCards = useMemo(() => {
    const selectedIds = new Set(selectedCards.map(s => s.card.instanceId));
    return filteredCards.filter(card => !selectedIds.has(card.instanceId));
  }, [filteredCards, selectedCards]);

  // Check if any cards are going to top/bottom (affects shuffle)
  const hasTopOrBottom = useMemo(() => {
    return selectedCards.some(s => s.destination === 'top' || s.destination === 'bottom');
  }, [selectedCards]);

  const handleSelectCard = useCallback((card: CardType, destination: Destination) => {
    setSelectedCards(prev => [...prev, { card, destination }]);
  }, []);

  const handleRemoveSelection = useCallback((instanceId: string) => {
    setSelectedCards(prev => prev.filter(s => s.card.instanceId !== instanceId));
  }, []);

  const handleConfirm = useCallback(() => {
    // Process all selected cards
    for (const selection of selectedCards) {
      onSelectCard(selection.card, selection.destination);
    }
    // Don't shuffle if cards were placed on top/bottom of library
    const shouldShuffle = shuffleAfter && !hasTopOrBottom;
    onComplete(shouldShuffle);
    onClose();
  }, [selectedCards, shuffleAfter, hasTopOrBottom, onSelectCard, onComplete, onClose]);

  const handleCancel = useCallback(() => {
    // Just shuffle if requested (search without selecting)
    onComplete(shuffleAfter);
    onClose();
  }, [shuffleAfter, onComplete, onClose]);

  const getDestinationLabel = (dest: Destination) => {
    switch (dest) {
      case 'hand': return 'Hand';
      case 'battlefield': return 'Battlefield';
      case 'top': return 'Top of Library';
      case 'bottom': return 'Bottom of Library';
      case 'exileActive': return 'Exile 1 (Active)';
      case 'exilePermanent': return 'Exile 2 (Permanent)';
      case 'graveyard': return 'Graveyard';
    }
  };

  const getDestinationColor = (dest: Destination) => {
    switch (dest) {
      case 'hand': return 'text-blue-400';
      case 'battlefield': return 'text-green-400';
      case 'top': return 'text-yellow-400';
      case 'bottom': return 'text-gray-400';
      case 'exileActive': return 'text-purple-400';
      case 'exilePermanent': return 'text-purple-600';
      case 'graveyard': return 'text-red-400';
    }
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && handleCancel()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/70 z-50" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-surface-dark border border-gray-700 rounded-lg p-6 w-[900px] max-h-[85vh] overflow-hidden flex flex-col z-50">
          <Dialog.Title className="text-xl font-bold text-gray-100 mb-2">
            Search Library ({cards.length} cards)
          </Dialog.Title>

          <Dialog.Description className="text-sm text-gray-400 mb-4">
            Right-click a card to choose where to put it.
          </Dialog.Description>

          {/* Search input */}
          <div className="mb-4">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by card name..."
              className="w-full px-3 py-2 bg-surface-light border border-gray-700 rounded text-gray-100 placeholder-gray-500 focus:outline-none focus:border-accent"
              autoFocus
            />
          </div>

          {/* Selected cards section */}
          {selectedCards.length > 0 && (
            <div className="mb-4 p-3 bg-surface/50 rounded-lg border border-gray-700">
              <h3 className="text-sm font-medium text-gray-300 mb-2">
                Selected Cards ({selectedCards.length})
              </h3>
              <div className="flex gap-2 flex-wrap">
                {selectedCards.map((selection) => (
                  <div
                    key={selection.card.instanceId}
                    className="flex items-center gap-2 px-2 py-1 bg-surface-light rounded text-sm"
                  >
                    <span className="text-gray-200 truncate max-w-[150px]">
                      {selection.card.name}
                    </span>
                    <span className={`text-xs ${getDestinationColor(selection.destination)}`}>
                      → {getDestinationLabel(selection.destination)}
                    </span>
                    <button
                      onClick={() => handleRemoveSelection(selection.card.instanceId)}
                      className="text-gray-500 hover:text-red-400 ml-1"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Card grid */}
          <div className="flex-1 overflow-y-auto min-h-0">
            {availableCards.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                {searchQuery ? 'No cards match your search' : 'Library is empty'}
              </div>
            ) : (
              <div className="grid grid-cols-5 gap-3 pb-2">
                {availableCards.map((card) => (
                  <ContextMenu.Root key={card.instanceId}>
                    <ContextMenu.Trigger asChild>
                      <div className="flex flex-col items-center cursor-context-menu hover:ring-2 hover:ring-accent/50 rounded-lg p-1 transition-all">
                        <Card card={card} size="sm" />
                        <span className="text-xs text-gray-500 mt-1 text-center truncate w-full">
                          {card.name}
                        </span>
                      </div>
                    </ContextMenu.Trigger>
                    <ContextMenu.Portal>
                      <ContextMenu.Content className="min-w-[180px] bg-gray-900 rounded-lg p-1 shadow-xl border border-gray-700 z-[100]">
                        <ContextMenu.Item
                          className="px-3 py-2 text-sm text-blue-400 hover:bg-blue-600 hover:text-white rounded cursor-pointer outline-none"
                          onSelect={() => handleSelectCard(card, 'hand')}
                        >
                          To Hand
                        </ContextMenu.Item>
                        <ContextMenu.Item
                          className="px-3 py-2 text-sm text-green-400 hover:bg-green-600 hover:text-white rounded cursor-pointer outline-none"
                          onSelect={() => handleSelectCard(card, 'battlefield')}
                        >
                          To Battlefield
                        </ContextMenu.Item>
                        <ContextMenu.Separator className="h-px bg-gray-700 my-1" />
                        <ContextMenu.Item
                          className="px-3 py-2 text-sm text-yellow-400 hover:bg-yellow-600 hover:text-white rounded cursor-pointer outline-none"
                          onSelect={() => handleSelectCard(card, 'top')}
                        >
                          To Top of Library
                        </ContextMenu.Item>
                        <ContextMenu.Item
                          className="px-3 py-2 text-sm text-gray-400 hover:bg-gray-600 hover:text-white rounded cursor-pointer outline-none"
                          onSelect={() => handleSelectCard(card, 'bottom')}
                        >
                          To Bottom of Library
                        </ContextMenu.Item>
                        <ContextMenu.Separator className="h-px bg-gray-700 my-1" />
                        <ContextMenu.Item
                          className="px-3 py-2 text-sm text-purple-400 hover:bg-purple-600 hover:text-white rounded cursor-pointer outline-none"
                          onSelect={() => handleSelectCard(card, 'exileActive')}
                        >
                          Exile 1 (Active)
                        </ContextMenu.Item>
                        <ContextMenu.Item
                          className="px-3 py-2 text-sm text-purple-600 hover:bg-purple-800 hover:text-white rounded cursor-pointer outline-none"
                          onSelect={() => handleSelectCard(card, 'exilePermanent')}
                        >
                          Exile 2 (Permanent)
                        </ContextMenu.Item>
                        <ContextMenu.Separator className="h-px bg-gray-700 my-1" />
                        <ContextMenu.Item
                          className="px-3 py-2 text-sm text-red-400 hover:bg-red-600 hover:text-white rounded cursor-pointer outline-none"
                          onSelect={() => handleSelectCard(card, 'graveyard')}
                        >
                          To Graveyard
                        </ContextMenu.Item>
                      </ContextMenu.Content>
                    </ContextMenu.Portal>
                  </ContextMenu.Root>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-700">
            <div className="flex flex-col gap-1">
              <label className="flex items-center gap-2 text-sm text-gray-300">
                <input
                  type="checkbox"
                  checked={shuffleAfter}
                  onChange={(e) => setShuffleAfter(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-600 bg-surface-light"
                  disabled={hasTopOrBottom}
                />
                Shuffle library after search
              </label>
              {hasTopOrBottom && (
                <span className="text-xs text-yellow-500">
                  Shuffle disabled (cards placed on top/bottom)
                </span>
              )}
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleCancel}
                className="px-4 py-2 text-sm bg-surface-light hover:bg-surface-lighter rounded"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                className="px-4 py-2 text-sm bg-accent hover:bg-accent/80 rounded font-medium"
                disabled={selectedCards.length === 0}
              >
                Confirm ({selectedCards.length} selected)
              </button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
