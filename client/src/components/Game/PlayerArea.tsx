import type { Card as CardType, Player, Zone } from '@paper-magic/shared';
import { Hand } from './Hand';
import { Battlefield } from './Battlefield';
import { Deck } from './Deck';
import { Graveyard } from './Graveyard';
import { ExileZone } from './ExileZone';
import { LifeCounter } from './LifeCounter';
import { PlayerCounters } from './PlayerCounters';

interface PlayerAreaProps {
  player: Player;
  isOpponent?: boolean;
  selectedCardId?: string;
  onCardClick?: (card: CardType) => void;
  onCardDoubleClick?: (card: CardType) => void;
  onHandCardClick?: (card: CardType, index: number) => void;
  onHandCardDoubleClick?: (card: CardType, index: number) => void;
  onDraw?: () => void;
  onSearch?: () => void;
  onShuffle?: () => void;
  onScry?: (count: number) => void;
  onRevealTop?: (count: number) => void;
  onRevealTopToOpponent?: (count: number) => void;
  onRevealHand?: () => void;
  onRevealCard?: (card: CardType) => void;
  // Context menu actions
  onCardTap?: (card: CardType) => void;
  onCardUntap?: (card: CardType) => void;
  onCardFlip?: (card: CardType) => void;
  onCardTransform?: (card: CardType) => void;
  onCardMoveTo?: (card: CardType, zone: Zone, faceDown?: boolean) => void;
  onCardPutOnTop?: (card: CardType) => void;
  onCardPutOnBottom?: (card: CardType) => void;
  onCardAddCounter?: (card: CardType, type: string) => void;
  onCardRemoveCounter?: (card: CardType, index: number) => void;
  // Life and player counters
  onLifeChange?: (delta: number, note?: string) => void;
  onPlayerCounterChange?: (type: string, value: number) => void;
  // Tokens
  onDestroyToken?: (card: CardType) => void;
  // Attachments
  onCardAttachTo?: (card: CardType, targetId: string) => void;
  onCardDetach?: (card: CardType) => void;
  // Layer ordering
  onBringToFront?: (card: CardType) => void;
  onSendToBack?: (card: CardType) => void;
  // Peek at opponent's library
  onPeekOpponentLibrary?: (count: number) => void;
  // Combined cards from both battlefields for cross-player attachments
  allBattlefieldCards?: CardType[];
}

export function PlayerArea({
  player,
  isOpponent = false,
  selectedCardId,
  onCardClick,
  onCardDoubleClick,
  onHandCardClick,
  onHandCardDoubleClick,
  onDraw,
  onSearch,
  onShuffle,
  onScry,
  onRevealTop,
  onRevealTopToOpponent,
  onRevealHand,
  onRevealCard,
  onCardTap,
  onCardUntap,
  onCardFlip,
  onCardTransform,
  onCardMoveTo,
  onCardPutOnTop,
  onCardPutOnBottom,
  onCardAddCounter,
  onCardRemoveCounter,
  onLifeChange,
  onPlayerCounterChange,
  onDestroyToken,
  onCardAttachTo,
  onCardDetach,
  onBringToFront,
  onSendToBack,
  onPeekOpponentLibrary,
  allBattlefieldCards,
}: PlayerAreaProps) {
  // For opponent, show minimal info. For player, show full dashboard below hand.
  if (isOpponent) {
    return (
      <div className="relative flex flex-col gap-2 h-full">
        {/* Opponent: Minimal info bar */}
        <div className="flex items-center justify-between px-3 py-1 rounded-lg bg-red-900/30 flex-shrink-0">
          <span className="font-medium text-gray-200 text-sm">{player.name}</span>
          <div className="flex items-center gap-3">
            <LifeCounter
              life={player.life}
              isOpponent={isOpponent}
              onLifeChange={onLifeChange}
            />
            <span className="text-xs text-gray-400">
              Hand: {player.hand.length} | Lib: {player.deck.length}
            </span>
          </div>
        </div>

        {/* Battlefield row - can shrink to fit */}
        <div className="flex gap-2 flex-1 min-h-0 overflow-hidden">
          {/* Side zones */}
          <div className="flex flex-col gap-2 w-36 flex-shrink-0">
            <Deck
              cards={player.deck}
              isOpponent={isOpponent}
              onDraw={onDraw}
              onSearch={onSearch}
              onShuffle={onShuffle}
              onScry={onScry}
              onRevealTop={onRevealTop}
              onRevealTopToOpponent={onRevealTopToOpponent}
              onPeekOpponentLibrary={onPeekOpponentLibrary}
            />
            <div className="flex gap-1">
              <Graveyard
                cards={player.graveyard}
                isOpponent={isOpponent}
                onCardClick={onCardClick}
                onCardMoveTo={onCardMoveTo}
                onCardPutOnTop={onCardPutOnTop}
                onCardPutOnBottom={onCardPutOnBottom}
              />
              <ExileZone
                activeCards={player.exileActive}
                permanentCards={player.exilePermanent}
                isOpponent={isOpponent}
                onCardClick={onCardClick}
                onCardMoveTo={onCardMoveTo}
                onCardPutOnTop={onCardPutOnTop}
                onCardPutOnBottom={onCardPutOnBottom}
                onCardAddCounter={onCardAddCounter}
                onCardRemoveCounter={onCardRemoveCounter}
              />
            </div>
          </div>

          {/* Main battlefield - expanded height */}
          <div className="flex-1">
            <Battlefield
              cards={player.battlefield}
              isOpponent={isOpponent}
              onCardClick={onCardClick}
              onCardDoubleClick={onCardDoubleClick}
              selectedCardId={selectedCardId}
              onCardTap={onCardTap}
              onCardUntap={onCardUntap}
              onCardFlip={onCardFlip}
              onCardTransform={onCardTransform}
              onCardMoveTo={onCardMoveTo}
              onCardPutOnTop={onCardPutOnTop}
              onCardPutOnBottom={onCardPutOnBottom}
              onCardAddCounter={onCardAddCounter}
              onCardRemoveCounter={onCardRemoveCounter}
              onDestroyToken={onDestroyToken}
              onCardAttachTo={onCardAttachTo}
              onCardDetach={onCardDetach}
              onBringToFront={onBringToFront}
              onSendToBack={onSendToBack}
              allBattlefieldCards={allBattlefieldCards}
            />
          </div>
        </div>
      </div>
    );
  }

  // Player's own area - dashboard below hand
  return (
    <div className="relative flex flex-col gap-2 h-full">
      {/* Battlefield row - can shrink to fit */}
      <div className="flex gap-2 flex-1 min-h-0 overflow-hidden">
        {/* Side zones */}
        <div className="flex flex-col gap-2 w-36 flex-shrink-0">
          <Deck
            cards={player.deck}
            isOpponent={isOpponent}
            onDraw={onDraw}
            onSearch={onSearch}
            onShuffle={onShuffle}
            onScry={onScry}
            onRevealTop={onRevealTop}
            onRevealTopToOpponent={onRevealTopToOpponent}
          />
          <div className="flex gap-1">
            <Graveyard
              cards={player.graveyard}
              isOpponent={isOpponent}
              onCardClick={onCardClick}
              onCardMoveTo={onCardMoveTo}
              onCardPutOnTop={onCardPutOnTop}
              onCardPutOnBottom={onCardPutOnBottom}
            />
            <ExileZone
              activeCards={player.exileActive}
              permanentCards={player.exilePermanent}
              isOpponent={isOpponent}
              onCardClick={onCardClick}
              onCardMoveTo={onCardMoveTo}
              onCardPutOnTop={onCardPutOnTop}
              onCardPutOnBottom={onCardPutOnBottom}
              onCardAddCounter={onCardAddCounter}
              onCardRemoveCounter={onCardRemoveCounter}
            />
          </div>
        </div>

        {/* Main battlefield - expanded height */}
        <div className="flex-1">
          <Battlefield
            cards={player.battlefield}
            isOpponent={isOpponent}
            onCardClick={onCardClick}
            onCardDoubleClick={onCardDoubleClick}
            selectedCardId={selectedCardId}
            onCardTap={onCardTap}
            onCardUntap={onCardUntap}
            onCardFlip={onCardFlip}
            onCardTransform={onCardTransform}
            onCardMoveTo={onCardMoveTo}
            onCardPutOnTop={onCardPutOnTop}
            onCardPutOnBottom={onCardPutOnBottom}
            onCardAddCounter={onCardAddCounter}
            onCardRemoveCounter={onCardRemoveCounter}
            onDestroyToken={onDestroyToken}
            onCardAttachTo={onCardAttachTo}
            onCardDetach={onCardDetach}
            onBringToFront={onBringToFront}
            onSendToBack={onSendToBack}
            allBattlefieldCards={allBattlefieldCards}
          />
        </div>
      </div>

      {/* Hand row */}
      <div className="bg-surface/50 rounded-lg p-2 flex-shrink-0">
        <Hand
          cards={player.hand}
          isOpponent={isOpponent}
          onCardClick={onHandCardClick}
          onCardDoubleClick={onHandCardDoubleClick}
          onCardMoveTo={onCardMoveTo}
          onRevealCard={onRevealCard}
          selectedCardId={selectedCardId}
        />
      </div>

      {/* Dashboard below hand */}
      <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-blue-900/30 flex-shrink-0 min-h-[44px]">
        <div className="flex items-center gap-4">
          <span className="font-medium text-gray-200">{player.name}</span>
          <span className="text-sm text-gray-400">
            Hand: {player.hand.length} | Library: {player.deck.length}
          </span>
          {onRevealHand && (
            <button
              onClick={onRevealHand}
              className="px-2 py-1 text-xs bg-yellow-600 hover:bg-yellow-500 rounded transition-colors"
              title="Reveal your hand to opponent"
            >
              Reveal Hand
            </button>
          )}
        </div>
        <div className="flex items-center gap-4">
          {/* Life counter */}
          <LifeCounter
            life={player.life}
            isOpponent={isOpponent}
            onLifeChange={onLifeChange}
          />
          {/* Player counters (poison, energy, etc.) */}
          <PlayerCounters
            counters={player.counters}
            isOpponent={isOpponent}
            onCounterChange={onPlayerCounterChange}
          />
        </div>
      </div>
    </div>
  );
}
