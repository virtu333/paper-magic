import * as ContextMenu from '@radix-ui/react-context-menu';
import type { Card as CardType } from '@paper-magic/shared';

// Card back image - local SVG for reliability
const CARD_BACK_URL = '/card-back.svg';

interface DeckProps {
  cards: CardType[];
  isOpponent?: boolean;
  onDraw?: () => void;
  onSearch?: () => void;
  onShuffle?: () => void;
  onScry?: (count: number) => void;
  onRevealTop?: (count: number) => void;
  onRevealTopToOpponent?: (count: number) => void;
  onPeekOpponentLibrary?: (count: number) => void;
}

export function Deck({
  cards,
  isOpponent = false,
  onDraw,
  onSearch,
  onShuffle,
  onScry,
  onRevealTop,
  onRevealTopToOpponent,
  onPeekOpponentLibrary,
}: DeckProps) {
  const cardCount = cards.length;

  const handleClick = () => {
    if (!isOpponent && onDraw) {
      onDraw();
    }
  };

  const deckContent = (
    <div className="flex flex-col items-center gap-2">
      {/* Deck stack */}
      <div
        className={`
          relative w-20 aspect-[5/7] rounded-lg overflow-hidden
          ${!isOpponent ? 'cursor-pointer hover:ring-2 hover:ring-accent' : ''}
        `}
        onClick={handleClick}
      >
        {cardCount > 0 ? (
          <>
            {/* Stack effect */}
            <div className="absolute inset-0 bg-gray-800 rounded-lg transform translate-x-1 translate-y-1" />
            <div className="absolute inset-0 bg-gray-700 rounded-lg transform translate-x-0.5 translate-y-0.5" />

            {/* Top card (back) */}
            <img
              src={CARD_BACK_URL}
              alt="Card back"
              className="relative w-full h-full object-cover rounded-lg"
            />
          </>
        ) : (
          <div className="w-full h-full border-2 border-dashed border-gray-700 rounded-lg flex items-center justify-center">
            <span className="text-gray-600 text-xs">Empty</span>
          </div>
        )}

        {/* Card count badge */}
        <div className="absolute bottom-1 right-1 px-1.5 py-0.5 bg-black/70 rounded text-xs font-bold text-white">
          {cardCount}
        </div>
      </div>

      {/* Label */}
      <span className="text-xs text-gray-500">
        {isOpponent ? 'Opponent' : 'Library'}
      </span>

      {/* Actions (only for own deck) */}
      {!isOpponent && (
        <div className="flex gap-1">
          <button
            onClick={onDraw}
            className="px-2 py-1 text-xs bg-surface-light hover:bg-surface-lighter rounded transition-colors"
            title="Draw a card"
          >
            Draw
          </button>
          <button
            onClick={onSearch}
            className="px-2 py-1 text-xs bg-surface-light hover:bg-surface-lighter rounded transition-colors"
            title="Search library"
          >
            Search
          </button>
          <button
            onClick={onShuffle}
            className="px-2 py-1 text-xs bg-surface-light hover:bg-surface-lighter rounded transition-colors"
            title="Shuffle library"
          >
            Shuffle
          </button>
        </div>
      )}
    </div>
  );

  // For opponent's deck, add context menu with peek option (Mishra's Bauble, etc.)
  if (isOpponent) {
    if (!onPeekOpponentLibrary) {
      return deckContent;
    }

    return (
      <ContextMenu.Root>
        <ContextMenu.Trigger asChild>
          {deckContent}
        </ContextMenu.Trigger>

        <ContextMenu.Portal>
          <ContextMenu.Content className="min-w-[180px] bg-gray-900 border border-gray-700 rounded-lg p-1 shadow-lg z-50">
            {/* Peek at opponent's library (Mishra's Bauble, Gitaxian Probe, etc.) */}
            <ContextMenu.Sub>
              <ContextMenu.SubTrigger className="flex items-center px-2 py-1.5 text-sm text-cyan-400 hover:bg-surface-lighter rounded cursor-pointer">
                <span className="mr-2">👁</span>
                Peek at top
                <span className="ml-auto text-gray-500">▸</span>
              </ContextMenu.SubTrigger>
              <ContextMenu.Portal>
                <ContextMenu.SubContent className="min-w-[120px] bg-gray-900 border border-gray-700 rounded-lg p-1 shadow-lg z-50">
                  {[1, 2, 3, 4].map((n) => (
                    <ContextMenu.Item
                      key={n}
                      className="px-2 py-1.5 text-sm text-gray-200 hover:bg-surface-lighter rounded cursor-pointer"
                      onClick={() => onPeekOpponentLibrary(n)}
                    >
                      Top {n} {n === 1 ? 'card' : 'cards'}
                    </ContextMenu.Item>
                  ))}
                  <ContextMenu.Item
                    className="px-2 py-1.5 text-sm text-gray-200 hover:bg-surface-lighter rounded cursor-pointer"
                    onClick={() => {
                      const count = prompt('How many cards to peek at?');
                      if (count && !isNaN(parseInt(count))) {
                        onPeekOpponentLibrary(parseInt(count));
                      }
                    }}
                  >
                    Top X cards...
                  </ContextMenu.Item>
                </ContextMenu.SubContent>
              </ContextMenu.Portal>
            </ContextMenu.Sub>
          </ContextMenu.Content>
        </ContextMenu.Portal>
      </ContextMenu.Root>
    );
  }

  return (
    <ContextMenu.Root>
      <ContextMenu.Trigger asChild>
        {deckContent}
      </ContextMenu.Trigger>

      <ContextMenu.Portal>
        <ContextMenu.Content className="min-w-[180px] bg-gray-900 border border-gray-700 rounded-lg p-1 shadow-lg z-50">
          {/* Scry submenu */}
          <ContextMenu.Sub>
            <ContextMenu.SubTrigger className="flex items-center px-2 py-1.5 text-sm text-gray-200 hover:bg-surface-lighter rounded cursor-pointer">
              <span className="mr-2">🔮</span>
              Scry
              <span className="ml-auto text-gray-500">▸</span>
            </ContextMenu.SubTrigger>
            <ContextMenu.Portal>
              <ContextMenu.SubContent className="min-w-[120px] bg-gray-900 border border-gray-700 rounded-lg p-1 shadow-lg z-50">
                {[1, 2, 3, 4].map((n) => (
                  <ContextMenu.Item
                    key={n}
                    className="px-2 py-1.5 text-sm text-gray-200 hover:bg-surface-lighter rounded cursor-pointer"
                    onClick={() => onScry?.(n)}
                  >
                    Scry {n}
                  </ContextMenu.Item>
                ))}
                <ContextMenu.Item
                  className="px-2 py-1.5 text-sm text-gray-200 hover:bg-surface-lighter rounded cursor-pointer"
                  onClick={() => {
                    const count = prompt('How many cards to scry?');
                    if (count && !isNaN(parseInt(count))) {
                      onScry?.(parseInt(count));
                    }
                  }}
                >
                  Scry X...
                </ContextMenu.Item>
              </ContextMenu.SubContent>
            </ContextMenu.Portal>
          </ContextMenu.Sub>

          {/* Look at top cards submenu */}
          <ContextMenu.Sub>
            <ContextMenu.SubTrigger className="flex items-center px-2 py-1.5 text-sm text-gray-200 hover:bg-surface-lighter rounded cursor-pointer">
              <span className="mr-2">👁️</span>
              Look at top
              <span className="ml-auto text-gray-500">▸</span>
            </ContextMenu.SubTrigger>
            <ContextMenu.Portal>
              <ContextMenu.SubContent className="min-w-[120px] bg-gray-900 border border-gray-700 rounded-lg p-1 shadow-lg z-50">
                {[1, 2, 3, 4].map((n) => (
                  <ContextMenu.Item
                    key={n}
                    className="px-2 py-1.5 text-sm text-gray-200 hover:bg-surface-lighter rounded cursor-pointer"
                    onClick={() => onRevealTop?.(n)}
                  >
                    Top {n} {n === 1 ? 'card' : 'cards'}
                  </ContextMenu.Item>
                ))}
                <ContextMenu.Item
                  className="px-2 py-1.5 text-sm text-gray-200 hover:bg-surface-lighter rounded cursor-pointer"
                  onClick={() => {
                    const count = prompt('How many cards to look at?');
                    if (count && !isNaN(parseInt(count))) {
                      onRevealTop?.(parseInt(count));
                    }
                  }}
                >
                  Top X cards...
                </ContextMenu.Item>
              </ContextMenu.SubContent>
            </ContextMenu.Portal>
          </ContextMenu.Sub>

          {/* Reveal to opponent submenu */}
          <ContextMenu.Sub>
            <ContextMenu.SubTrigger className="flex items-center px-2 py-1.5 text-sm text-yellow-400 hover:bg-surface-lighter rounded cursor-pointer">
              <span className="mr-2">📣</span>
              Reveal to opponent
              <span className="ml-auto text-gray-500">▸</span>
            </ContextMenu.SubTrigger>
            <ContextMenu.Portal>
              <ContextMenu.SubContent className="min-w-[140px] bg-gray-900 border border-gray-700 rounded-lg p-1 shadow-lg z-50">
                {[1, 2, 3, 4].map((n) => (
                  <ContextMenu.Item
                    key={n}
                    className="px-2 py-1.5 text-sm text-gray-200 hover:bg-surface-lighter rounded cursor-pointer"
                    onClick={() => onRevealTopToOpponent?.(n)}
                  >
                    Top {n} {n === 1 ? 'card' : 'cards'}
                  </ContextMenu.Item>
                ))}
                <ContextMenu.Item
                  className="px-2 py-1.5 text-sm text-gray-200 hover:bg-surface-lighter rounded cursor-pointer"
                  onClick={() => {
                    const count = prompt('How many cards to reveal to opponent?');
                    if (count && !isNaN(parseInt(count))) {
                      onRevealTopToOpponent?.(parseInt(count));
                    }
                  }}
                >
                  Top X cards...
                </ContextMenu.Item>
              </ContextMenu.SubContent>
            </ContextMenu.Portal>
          </ContextMenu.Sub>

          <ContextMenu.Separator className="h-px bg-gray-700 my-1" />

          {/* Quick actions */}
          <ContextMenu.Item
            className="px-2 py-1.5 text-sm text-gray-200 hover:bg-surface-lighter rounded cursor-pointer"
            onClick={() => onDraw?.()}
          >
            <span className="mr-2">🎴</span>
            Draw card
          </ContextMenu.Item>

          <ContextMenu.Item
            className="px-2 py-1.5 text-sm text-gray-200 hover:bg-surface-lighter rounded cursor-pointer"
            onClick={() => onSearch?.()}
          >
            <span className="mr-2">🔍</span>
            Search library
          </ContextMenu.Item>

          <ContextMenu.Item
            className="px-2 py-1.5 text-sm text-gray-200 hover:bg-surface-lighter rounded cursor-pointer"
            onClick={() => onShuffle?.()}
          >
            <span className="mr-2">🔀</span>
            Shuffle
          </ContextMenu.Item>
        </ContextMenu.Content>
      </ContextMenu.Portal>
    </ContextMenu.Root>
  );
}
