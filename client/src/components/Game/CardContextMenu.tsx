import { useState, useRef, useEffect } from 'react';
import * as ContextMenu from '@radix-ui/react-context-menu';
import type { Card as CardType, Zone } from '@paper-magic/shared';
import { isToken } from '@paper-magic/shared';
import type { ReactNode } from 'react';
import { Card } from './Card';

interface CardContextMenuProps {
  card: CardType;
  currentZone: Zone;
  children: ReactNode;
  disabled?: boolean;
  onTap?: () => void;
  onUntap?: () => void;
  onFlip?: () => void;
  onTransform?: () => void;
  onMoveTo?: (zone: Zone, faceDown?: boolean) => void;
  onPutOnTop?: () => void;
  onPutOnBottom?: () => void;
  onAddCounter?: (type: string) => void;
  onRemoveCounter?: (index: number) => void;
  onDestroyToken?: () => void;
  onAttachTo?: (targetId: string) => void;
  onDetach?: () => void;
  onBringToFront?: () => void;
  onSendToBack?: () => void;
  onRevealCard?: () => void;
  otherBattlefieldCards?: CardType[];
}

export function CardContextMenu({
  card,
  currentZone,
  children,
  disabled = false,
  onTap,
  onUntap,
  onFlip,
  onTransform,
  onMoveTo,
  onPutOnTop,
  onPutOnBottom,
  onAddCounter,
  onRemoveCounter,
  onDestroyToken,
  onAttachTo,
  onDetach,
  onBringToFront,
  onSendToBack,
  onRevealCard,
  otherBattlefieldCards = [],
}: CardContextMenuProps) {
  const [showCardPreview, setShowCardPreview] = useState(false);
  const [menuPosition, setMenuPosition] = useState<'top' | 'bottom'>('top');
  const contentRef = useRef<HTMLDivElement>(null);

  // Update menu position when preview is shown
  useEffect(() => {
    if (showCardPreview && contentRef.current) {
      const rect = contentRef.current.getBoundingClientRect();
      // If menu is in bottom half of viewport, position preview at top
      setMenuPosition(rect.top > window.innerHeight / 2 ? 'bottom' : 'top');
    }
  }, [showCardPreview]);

  if (disabled) {
    return <>{children}</>;
  }

  const isBattlefield = currentZone === 'battlefield';
  const isHand = currentZone === 'hand';
  const isGraveyard = currentZone === 'graveyard';
  const isExile = currentZone === 'exileActive' || currentZone === 'exilePermanent';
  const hasDFC = !!card.backImageUri;
  const cardIsToken = isToken(card);

  return (
    <ContextMenu.Root>
      <ContextMenu.Trigger asChild>
        {children}
      </ContextMenu.Trigger>

      <ContextMenu.Portal>
        <ContextMenu.Content
          ref={contentRef}
          className="min-w-[180px] bg-surface-light rounded-lg p-1.5 shadow-xl border border-gray-700 z-[100]"
        >
          {/* Card name header - hover for zoom preview */}
          <div
            className="px-2 py-1.5 text-sm font-medium text-gray-300 border-b border-gray-700 mb-1 truncate cursor-help hover:text-blue-300"
            onMouseEnter={() => setShowCardPreview(true)}
            onMouseLeave={() => setShowCardPreview(false)}
          >
            {card.name}
            <span className="text-xs text-gray-500 ml-1">(hover to zoom)</span>
          </div>

          {/* Card zoom preview - positioned based on menu location, shows both faces for DFCs */}
          {showCardPreview && (
            <div
              className="fixed z-[200] pointer-events-none"
              style={{
                right: hasDFC ? '50px' : '220px',
                ...(menuPosition === 'bottom'
                  ? { bottom: '50px' }
                  : { top: '50px' }
                ),
              }}
            >
              <div className="flex gap-2">
                <Card card={card} size="xl" />
                {hasDFC && (
                  <Card card={{...card, isTransformed: !card.isTransformed}} size="xl" />
                )}
              </div>
            </div>
          )}

          {/* Tap/Untap - only on battlefield */}
          {isBattlefield && (
            <>
              {card.isTapped ? (
                <ContextMenu.Item
                  className="flex items-center px-2 py-1.5 text-sm text-gray-200 rounded hover:bg-surface-lighter cursor-pointer outline-none"
                  onSelect={onUntap}
                >
                  <span className="mr-2">↺</span> Untap
                </ContextMenu.Item>
              ) : (
                <ContextMenu.Item
                  className="flex items-center px-2 py-1.5 text-sm text-gray-200 rounded hover:bg-surface-lighter cursor-pointer outline-none"
                  onSelect={onTap}
                >
                  <span className="mr-2">↻</span> Tap
                </ContextMenu.Item>
              )}
            </>
          )}

          {/* Flip face down/up - on battlefield */}
          {isBattlefield && (
            <ContextMenu.Item
              className="flex items-center px-2 py-1.5 text-sm text-gray-200 rounded hover:bg-surface-lighter cursor-pointer outline-none"
              onSelect={onFlip}
            >
              <span className="mr-2">🔄</span> {card.isFaceDown ? 'Turn Face Up' : 'Turn Face Down'}
            </ContextMenu.Item>
          )}

          {/* Transform - only for DFCs */}
          {hasDFC && isBattlefield && (
            <ContextMenu.Item
              className="flex items-center px-2 py-1.5 text-sm text-gray-200 rounded hover:bg-surface-lighter cursor-pointer outline-none"
              onSelect={onTransform}
            >
              <span className="mr-2">⟳</span> Transform
            </ContextMenu.Item>
          )}

          <ContextMenu.Separator className="h-px bg-gray-700 my-1" />

          {/* Move to zone submenu */}
          <ContextMenu.Sub>
            <ContextMenu.SubTrigger className="flex items-center justify-between px-2 py-1.5 text-sm text-gray-200 rounded hover:bg-surface-lighter cursor-pointer outline-none">
              <span>Send to...</span>
              <span className="ml-4 text-gray-500">▸</span>
            </ContextMenu.SubTrigger>
            <ContextMenu.Portal>
              <ContextMenu.SubContent
                className="min-w-[160px] bg-surface-light rounded-lg p-1.5 shadow-xl border border-gray-700 z-[100]"
              >
                {!isHand && (
                  <ContextMenu.Item
                    className="flex items-center px-2 py-1.5 text-sm text-blue-400 rounded hover:bg-surface-lighter cursor-pointer outline-none"
                    onSelect={() => onMoveTo?.('hand')}
                  >
                    Hand
                  </ContextMenu.Item>
                )}
                {!isBattlefield && (
                  <ContextMenu.Item
                    className="flex items-center px-2 py-1.5 text-sm text-green-400 rounded hover:bg-surface-lighter cursor-pointer outline-none"
                    onSelect={() => onMoveTo?.('battlefield')}
                  >
                    Battlefield
                  </ContextMenu.Item>
                )}
                {currentZone !== 'stack' && (
                  <ContextMenu.Item
                    className="flex items-center px-2 py-1.5 text-sm text-yellow-400 rounded hover:bg-surface-lighter cursor-pointer outline-none"
                    onSelect={() => onMoveTo?.('stack')}
                  >
                    Stack
                  </ContextMenu.Item>
                )}
                {!isGraveyard && (
                  <ContextMenu.Item
                    className="flex items-center px-2 py-1.5 text-sm text-red-400 rounded hover:bg-surface-lighter cursor-pointer outline-none"
                    onSelect={() => onMoveTo?.('graveyard')}
                  >
                    Graveyard
                  </ContextMenu.Item>
                )}
                <ContextMenu.Separator className="h-px bg-gray-700 my-1" />
                {currentZone !== 'exileActive' && (
                  <ContextMenu.Item
                    className="flex items-center px-2 py-1.5 text-sm text-purple-400 rounded hover:bg-surface-lighter cursor-pointer outline-none"
                    onSelect={() => onMoveTo?.('exileActive')}
                  >
                    Exile 1 (Active)
                  </ContextMenu.Item>
                )}
                {currentZone !== 'exilePermanent' && (
                  <ContextMenu.Item
                    className="flex items-center px-2 py-1.5 text-sm text-purple-600 rounded hover:bg-surface-lighter cursor-pointer outline-none"
                    onSelect={() => onMoveTo?.('exilePermanent')}
                  >
                    Exile 2 (Permanent)
                  </ContextMenu.Item>
                )}
                <ContextMenu.Separator className="h-px bg-gray-700 my-1" />
                <ContextMenu.Item
                  className="flex items-center px-2 py-1.5 text-sm text-gray-400 rounded hover:bg-surface-lighter cursor-pointer outline-none"
                  onSelect={onPutOnTop}
                >
                  Top of Library
                </ContextMenu.Item>
                <ContextMenu.Item
                  className="flex items-center px-2 py-1.5 text-sm text-gray-500 rounded hover:bg-surface-lighter cursor-pointer outline-none"
                  onSelect={onPutOnBottom}
                >
                  Bottom of Library
                </ContextMenu.Item>
              </ContextMenu.SubContent>
            </ContextMenu.Portal>
          </ContextMenu.Sub>

          {/* Reveal to opponent - only for hand cards */}
          {isHand && onRevealCard && (
            <ContextMenu.Item
              className="flex items-center px-2 py-1.5 text-sm text-yellow-400 rounded hover:bg-surface-lighter cursor-pointer outline-none"
              onSelect={onRevealCard}
            >
              <span className="mr-2">👁</span> Reveal to Opponent
            </ContextMenu.Item>
          )}

          {/* Play Face Down - only for hand cards (Disguise/Morph) */}
          {isHand && onMoveTo && (
            <>
              <ContextMenu.Separator className="h-px bg-gray-700 my-1" />
              <ContextMenu.Item
                className="flex items-center px-2 py-1.5 text-sm text-cyan-400 rounded hover:bg-surface-lighter cursor-pointer outline-none"
                onSelect={() => onMoveTo('battlefield', true)}
              >
                <span className="mr-2">?</span> Play Face Down
              </ContextMenu.Item>
              <ContextMenu.Item
                className="flex items-center px-2 py-1.5 text-sm text-purple-400 rounded hover:bg-surface-lighter cursor-pointer outline-none"
                onSelect={() => onMoveTo('exileActive', true)}
              >
                <span className="mr-2">?</span> Exile Face Down (Foretell)
              </ContextMenu.Item>
            </>
          )}

          {/* Counters - available on battlefield and exile (for Suspend, etc.) */}
          {(isBattlefield || isExile) && (
            <>
              <ContextMenu.Separator className="h-px bg-gray-700 my-1" />
              <ContextMenu.Sub>
                <ContextMenu.SubTrigger className="flex items-center justify-between px-2 py-1.5 text-sm text-gray-200 rounded hover:bg-surface-lighter cursor-pointer outline-none">
                  <span>Add Counter</span>
                  <span className="ml-4 text-gray-500">▸</span>
                </ContextMenu.SubTrigger>
                <ContextMenu.Portal>
                  <ContextMenu.SubContent
                    className="min-w-[140px] bg-surface-light rounded-lg p-1.5 shadow-xl border border-gray-700 z-[100]"
                  >
                    {isBattlefield && (
                      <>
                        <ContextMenu.Item
                          className="flex items-center px-2 py-1.5 text-sm text-green-400 rounded hover:bg-surface-lighter cursor-pointer outline-none"
                          onSelect={() => onAddCounter?.('plusOne')}
                        >
                          +1/+1 Counter
                        </ContextMenu.Item>
                        <ContextMenu.Item
                          className="flex items-center px-2 py-1.5 text-sm text-red-400 rounded hover:bg-surface-lighter cursor-pointer outline-none"
                          onSelect={() => onAddCounter?.('minusOne')}
                        >
                          -1/-1 Counter
                        </ContextMenu.Item>
                        <ContextMenu.Item
                          className="flex items-center px-2 py-1.5 text-sm text-yellow-400 rounded hover:bg-surface-lighter cursor-pointer outline-none"
                          onSelect={() => onAddCounter?.('loyalty')}
                        >
                          Loyalty Counter
                        </ContextMenu.Item>
                        <ContextMenu.Separator className="h-px bg-gray-700 my-1" />
                      </>
                    )}
                    {isExile && (
                      <>
                        <ContextMenu.Item
                          className="flex items-center px-2 py-1.5 text-sm text-cyan-400 rounded hover:bg-surface-lighter cursor-pointer outline-none"
                          onSelect={() => onAddCounter?.('time')}
                        >
                          Time Counter
                        </ContextMenu.Item>
                        <ContextMenu.Separator className="h-px bg-gray-700 my-1" />
                      </>
                    )}
                    <ContextMenu.Item
                      className="flex items-center px-2 py-1.5 text-sm text-gray-400 rounded hover:bg-surface-lighter cursor-pointer outline-none"
                      onSelect={() => onAddCounter?.('custom')}
                    >
                      Other Counter...
                    </ContextMenu.Item>
                  </ContextMenu.SubContent>
                </ContextMenu.Portal>
              </ContextMenu.Sub>

              {/* Remove counters if card has any */}
              {card.counters.length > 0 && (
                <ContextMenu.Sub>
                  <ContextMenu.SubTrigger className="flex items-center justify-between px-2 py-1.5 text-sm text-gray-200 rounded hover:bg-surface-lighter cursor-pointer outline-none">
                    <span>Remove Counter</span>
                    <span className="ml-4 text-gray-500">▸</span>
                  </ContextMenu.SubTrigger>
                  <ContextMenu.Portal>
                    <ContextMenu.SubContent
                      className="min-w-[140px] bg-surface-light rounded-lg p-1.5 shadow-xl border border-gray-700 z-[100]"
                    >
                      {card.counters.map((counter, index) => (
                        <ContextMenu.Item
                          key={index}
                          className="flex items-center justify-between px-2 py-1.5 text-sm text-gray-200 rounded hover:bg-surface-lighter cursor-pointer outline-none"
                          onSelect={() => onRemoveCounter?.(index)}
                        >
                          <span>{counter.label || counter.type}</span>
                          <span className="text-gray-500">({counter.value})</span>
                        </ContextMenu.Item>
                      ))}
                    </ContextMenu.SubContent>
                  </ContextMenu.Portal>
                </ContextMenu.Sub>
              )}
            </>
          )}

          {/* Attach/Detach - only on battlefield */}
          {isBattlefield && (
            <>
              <ContextMenu.Separator className="h-px bg-gray-700 my-1" />

              {/* Attach to another card (same player) */}
              {otherBattlefieldCards.length > 0 && (
                <ContextMenu.Sub>
                  <ContextMenu.SubTrigger className="flex items-center justify-between px-2 py-1.5 text-sm text-gray-200 rounded hover:bg-surface-lighter cursor-pointer outline-none">
                    <span>Attach to...</span>
                    <span className="ml-4 text-gray-500">▸</span>
                  </ContextMenu.SubTrigger>
                  <ContextMenu.Portal>
                    <ContextMenu.SubContent
                      className="min-w-[160px] max-h-[300px] overflow-y-auto bg-surface-light rounded-lg p-1.5 shadow-xl border border-gray-700 z-[100]"
                    >
                      {otherBattlefieldCards
                        .filter(c => c.instanceId !== card.instanceId && !c.attachedTo)
                        .map(targetCard => (
                          <ContextMenu.Item
                            key={targetCard.instanceId}
                            className="flex items-center px-2 py-1.5 text-sm text-gray-200 rounded hover:bg-surface-lighter cursor-pointer outline-none truncate"
                            onSelect={() => onAttachTo?.(targetCard.instanceId)}
                          >
                            {targetCard.name}
                          </ContextMenu.Item>
                        ))}
                    </ContextMenu.SubContent>
                  </ContextMenu.Portal>
                </ContextMenu.Sub>
              )}

              {/* Detach if currently attached */}
              {card.attachedTo && (
                <ContextMenu.Item
                  className="flex items-center px-2 py-1.5 text-sm text-yellow-400 rounded hover:bg-surface-lighter cursor-pointer outline-none"
                  onSelect={onDetach}
                >
                  <span className="mr-2">⤢</span> Detach
                </ContextMenu.Item>
              )}

              {/* Layer control - available for all battlefield cards */}
              <ContextMenu.Item
                className="flex items-center px-2 py-1.5 text-sm text-gray-300 rounded hover:bg-surface-lighter cursor-pointer outline-none"
                onSelect={onBringToFront}
              >
                <span className="mr-2">↑</span> Bring to Front
              </ContextMenu.Item>
              <ContextMenu.Item
                className="flex items-center px-2 py-1.5 text-sm text-gray-300 rounded hover:bg-surface-lighter cursor-pointer outline-none"
                onSelect={onSendToBack}
              >
                <span className="mr-2">↓</span> Send to Back
              </ContextMenu.Item>
            </>
          )}

          {/* Destroy Token - only for tokens on battlefield */}
          {cardIsToken && isBattlefield && (
            <>
              <ContextMenu.Separator className="h-px bg-gray-700 my-1" />
              <ContextMenu.Item
                className="flex items-center px-2 py-1.5 text-sm text-red-400 rounded hover:bg-red-900/30 cursor-pointer outline-none"
                onSelect={onDestroyToken}
              >
                <span className="mr-2">X</span> Destroy Token
              </ContextMenu.Item>
            </>
          )}
        </ContextMenu.Content>
      </ContextMenu.Portal>
    </ContextMenu.Root>
  );
}
