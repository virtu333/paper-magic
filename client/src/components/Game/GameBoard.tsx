import { useCallback, useState } from 'react';
import type { Card as CardType, GameState, Zone, CounterType, Token, GameResult } from '@paper-magic/shared';
import { PlayerArea } from './PlayerArea';
import { Stack } from './Stack';
import { ActionLog } from './ActionLog';
import { DndProvider } from './DndProvider';
import { MulliganOverlay } from './MulliganOverlay';
import { CreateTokenModal } from './CreateTokenModal';
import { GameOverlay, ConcedeDialog } from './GameOverlay';
import { SaveLoadModal } from './SaveLoadModal';
import { ScryModal } from './ScryModal';
import { SearchLibraryModal } from './SearchLibraryModal';
import { HelpModal } from './HelpModal';
import { RevealedCardsModal } from './RevealedCardsModal';
import { useGameStore } from '../../stores/gameStore';

interface GameBoardProps {
  gameState: GameState;
  playerId: string;
}

export function GameBoard({ gameState, playerId }: GameBoardProps) {
  const { sendAction, sendActionWithResponse, revealedCards, dismissRevealedCards } = useGameStore();
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [showConcedeDialog, setShowConcedeDialog] = useState(false);
  const [showSaveLoadModal, setShowSaveLoadModal] = useState(false);
  const [saveCode, setSaveCode] = useState<string | null>(null);
  const [scryModalState, setScryModalState] = useState<{
    isOpen: boolean;
    cards: CardType[];
    mode: 'scry' | 'reveal' | 'reveal-interactive';
  }>({ isOpen: false, cards: [], mode: 'scry' });
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);

  // Determine which player is which
  const myPlayer = gameState.players.find(p => p?.id === playerId);
  const opponent = gameState.players.find(p => p && p.id !== playerId);
  const myPlayerIndex: 0 | 1 = gameState.players[0]?.id === playerId ? 0 : 1;
  const isGoldfishMode = gameState.isGoldfishMode;

  if (!myPlayer) {
    return (
      <div className="flex items-center justify-center h-full text-red-500">
        Error: Could not find your player data
      </div>
    );
  }

  // Combine both players' battlefield cards for cross-player attachments
  const allBattlefieldCards = [
    ...myPlayer.battlefield,
    ...(opponent?.battlefield ?? []),
  ];

  // Card action handlers
  const handleDraw = useCallback(() => {
    sendAction({ type: 'DRAW_CARDS', count: 1 });
  }, [sendAction]);

  const handleShuffle = useCallback(() => {
    sendAction({ type: 'SHUFFLE_DECK' });
  }, [sendAction]);

  const handleSearch = useCallback(() => {
    if (!myPlayer || myPlayer.deck.length === 0) return;
    setShowSearchModal(true);
  }, [myPlayer]);

  const handleScry = useCallback((count: number) => {
    if (!myPlayer) return;
    // Get top N cards from deck
    const topCards = myPlayer.deck.slice(0, count);
    if (topCards.length === 0) return;
    setScryModalState({ isOpen: true, cards: topCards, mode: 'scry' });
  }, [myPlayer]);

  const handleRevealTop = useCallback((count: number) => {
    if (!myPlayer) return;
    // Get top N cards from deck
    const topCards = myPlayer.deck.slice(0, count);
    if (topCards.length === 0) return;
    setScryModalState({ isOpen: true, cards: topCards, mode: 'reveal' });
  }, [myPlayer]);

  const handleRevealTopToOpponent = useCallback((count: number) => {
    if (!myPlayer) return;
    // Get top N cards from deck and reveal them to opponent
    const topCards = myPlayer.deck.slice(0, count);
    if (topCards.length === 0) return;
    // Send reveal to opponent
    sendAction({
      type: 'REVEAL_CARDS_TO_OPPONENT',
      instanceIds: topCards.map(c => c.instanceId),
      source: `Top ${count} of Library`,
    });
    // Also open ScryModal in interactive mode so player can act on cards
    setScryModalState({ isOpen: true, cards: topCards, mode: 'reveal-interactive' });
  }, [myPlayer, sendAction]);

  const handleRevealHand = useCallback(() => {
    sendAction({ type: 'REVEAL_HAND' });
  }, [sendAction]);

  const handleRevealCard = useCallback((card: CardType) => {
    sendAction({
      type: 'REVEAL_CARDS_TO_OPPONENT',
      instanceIds: [card.instanceId],
      source: 'Hand',
    });
  }, [sendAction]);

  const handleScryComplete = useCallback((topCards: CardType[], bottomCards: CardType[]) => {
    // Send actions to rearrange deck
    if (topCards.length > 0) {
      sendAction({ type: 'PUT_ON_TOP', instanceIds: topCards.map(c => c.instanceId) });
    }
    if (bottomCards.length > 0) {
      sendAction({ type: 'PUT_ON_BOTTOM', instanceIds: bottomCards.map(c => c.instanceId) });
    }
    setScryModalState({ isOpen: false, cards: [], mode: 'scry' });
  }, [sendAction]);

  const handleScryMoveToZone = useCallback((card: CardType, zone: Zone) => {
    // Move card from deck to the specified zone
    sendAction({
      type: 'MOVE_CARD',
      instanceId: card.instanceId,
      from: 'deck',
      to: zone,
    });
  }, [sendAction]);

  const handleSearchSelectCard = useCallback((card: CardType, destination: 'hand' | 'battlefield' | 'top' | 'bottom' | 'exileActive' | 'exilePermanent' | 'graveyard') => {
    switch (destination) {
      case 'hand':
        sendAction({ type: 'MOVE_CARD', instanceId: card.instanceId, from: 'deck', to: 'hand' });
        break;
      case 'battlefield':
        sendAction({ type: 'MOVE_CARD', instanceId: card.instanceId, from: 'deck', to: 'battlefield' });
        break;
      case 'top':
        sendAction({ type: 'PUT_ON_TOP', instanceIds: [card.instanceId] });
        break;
      case 'bottom':
        sendAction({ type: 'PUT_ON_BOTTOM', instanceIds: [card.instanceId] });
        break;
      case 'exileActive':
        sendAction({ type: 'MOVE_CARD', instanceId: card.instanceId, from: 'deck', to: 'exileActive' });
        break;
      case 'exilePermanent':
        sendAction({ type: 'MOVE_CARD', instanceId: card.instanceId, from: 'deck', to: 'exilePermanent' });
        break;
      case 'graveyard':
        sendAction({ type: 'MOVE_CARD', instanceId: card.instanceId, from: 'deck', to: 'graveyard' });
        break;
    }
  }, [sendAction]);

  const handleSearchComplete = useCallback((shuffle: boolean) => {
    if (shuffle) {
      sendAction({ type: 'SHUFFLE_DECK' });
    }
    setShowSearchModal(false);
  }, [sendAction]);

  const handleCardTap = useCallback((card: CardType) => {
    sendAction({ type: 'TAP_CARD', instanceId: card.instanceId });
  }, [sendAction]);

  const handleCardUntap = useCallback((card: CardType) => {
    sendAction({ type: 'UNTAP_CARD', instanceId: card.instanceId });
  }, [sendAction]);

  const handleCardFlip = useCallback((card: CardType) => {
    sendAction({ type: 'FLIP_CARD', instanceId: card.instanceId });
  }, [sendAction]);

  const handleCardTransform = useCallback((card: CardType) => {
    sendAction({ type: 'TRANSFORM_CARD', instanceId: card.instanceId });
  }, [sendAction]);

  const handleCardMoveTo = useCallback((card: CardType, zone: Zone, faceDown?: boolean) => {
    // Check if card is on opponent's battlefield first
    const isOnOpponentBattlefield = opponent?.battlefield.some(c => c.instanceId === card.instanceId);

    if (isOnOpponentBattlefield) {
      sendAction({
        type: 'TAKE_FROM_OPPONENT_BATTLEFIELD',
        instanceId: card.instanceId,
        to: zone,
      });
      return;
    }

    // Determine source zone from card's current location in your zones
    const sourceZone = myPlayer?.battlefield.some(c => c.instanceId === card.instanceId) ? 'battlefield'
      : myPlayer?.hand.some(c => c.instanceId === card.instanceId) ? 'hand'
      : myPlayer?.graveyard.some(c => c.instanceId === card.instanceId) ? 'graveyard'
      : myPlayer?.exileActive.some(c => c.instanceId === card.instanceId) ? 'exileActive'
      : myPlayer?.exilePermanent.some(c => c.instanceId === card.instanceId) ? 'exilePermanent'
      : myPlayer?.deck.some(c => c.instanceId === card.instanceId) ? 'deck'
      : 'battlefield';

    sendAction({
      type: 'MOVE_CARD',
      instanceId: card.instanceId,
      from: sourceZone,
      to: zone,
      faceDown,
    });
  }, [sendAction, myPlayer, opponent]);

  const handleCardPutOnTop = useCallback((card: CardType) => {
    sendAction({ type: 'PUT_ON_TOP', instanceIds: [card.instanceId] });
  }, [sendAction]);

  const handleCardPutOnBottom = useCallback((card: CardType) => {
    sendAction({ type: 'PUT_ON_BOTTOM', instanceIds: [card.instanceId] });
  }, [sendAction]);

  const handleCardAddCounter = useCallback((card: CardType, counterType: string) => {
    sendAction({
      type: 'ADD_COUNTER',
      instanceId: card.instanceId,
      counter: {
        type: counterType as CounterType,
        value: 1,
      },
    });
  }, [sendAction]);

  const handleCardRemoveCounter = useCallback((card: CardType, counterIndex: number) => {
    sendAction({
      type: 'REMOVE_COUNTER',
      instanceId: card.instanceId,
      counterIndex,
    });
  }, [sendAction]);

  const handleCardAttachTo = useCallback((card: CardType, targetId: string) => {
    sendAction({
      type: 'ATTACH_CARD',
      instanceId: card.instanceId,
      targetId,
    });
  }, [sendAction]);

  const handleCardDetach = useCallback((card: CardType) => {
    sendAction({
      type: 'DETACH_CARD',
      instanceId: card.instanceId,
    });
  }, [sendAction]);

  const handleBringToFront = useCallback((card: CardType) => {
    sendAction({
      type: 'BRING_TO_FRONT',
      instanceId: card.instanceId,
    });
  }, [sendAction]);

  const handleSendToBack = useCallback((card: CardType) => {
    sendAction({
      type: 'SEND_TO_BACK',
      instanceId: card.instanceId,
    });
  }, [sendAction]);

  const handlePeekOpponentLibrary = useCallback((count: number) => {
    sendAction({
      type: 'PEEK_OPPONENT_LIBRARY',
      count,
    });
  }, [sendAction]);

  // Toggle tap on double-click
  const handleCardDoubleTap = useCallback((card: CardType) => {
    if (card.isTapped) {
      sendAction({ type: 'UNTAP_CARD', instanceId: card.instanceId });
    } else {
      sendAction({ type: 'TAP_CARD', instanceId: card.instanceId });
    }
  }, [sendAction]);

  const handleHandCardDoubleClick = useCallback((card: CardType) => {
    // Double-click to play to battlefield
    sendAction({
      type: 'MOVE_CARD',
      instanceId: card.instanceId,
      from: 'hand',
      to: 'battlefield',
    });
  }, [sendAction]);

  // Life and player counter handlers
  const handleLifeChange = useCallback((delta: number, note?: string) => {
    sendAction({ type: 'UPDATE_LIFE', delta, note });
  }, [sendAction]);

  const handlePlayerCounterChange = useCallback((counterType: string, value: number) => {
    sendAction({ type: 'SET_PLAYER_COUNTER', counterType, value });
  }, [sendAction]);

  // Token creation handler
  const handleCreateToken = useCallback((token: Omit<Token, 'instanceId'>) => {
    sendAction({ type: 'CREATE_TOKEN', token });
  }, [sendAction]);

  const handleDestroyToken = useCallback((card: CardType) => {
    sendAction({ type: 'DESTROY_TOKEN', instanceId: card.instanceId });
  }, [sendAction]);

  // Game lifecycle handlers
  const handleConcede = useCallback(() => {
    sendAction({ type: 'CONCEDE' });
    setShowConcedeDialog(false);
  }, [sendAction]);

  const handleDeclareWinner = useCallback((winner: GameResult) => {
    sendAction({ type: 'DECLARE_WINNER', winner });
  }, [sendAction]);

  const handleReadyForNextGame = useCallback(() => {
    sendAction({ type: 'READY_FOR_NEXT_GAME' });
  }, [sendAction]);

  const handleSwapSideboardCard = useCallback((mainDeckIndex: number, sideboardIndex: number) => {
    sendAction({ type: 'SWAP_SIDEBOARD', mainDeckIndex, sideboardIndex });
  }, [sendAction]);

  // Mulligan handlers
  const handleMulliganKeep = useCallback((cardsToBottom: string[]) => {
    if (cardsToBottom.length > 0) {
      // First put cards on bottom, then keep
      sendAction({ type: 'BOTTOM_CARDS', instanceIds: cardsToBottom });
    }
    sendAction({ type: 'MULLIGAN_KEEP' });
  }, [sendAction]);

  const handleMulliganAgain = useCallback(() => {
    sendAction({ type: 'MULLIGAN_AGAIN' });
  }, [sendAction]);

  // Save/Load handlers
  const handleSaveGame = useCallback(async () => {
    const response = await sendActionWithResponse({ type: 'SAVE_GAME' });
    if (response?.payload && typeof response.payload === 'object' && 'saveCode' in response.payload) {
      setSaveCode(response.payload.saveCode as string);
    }
  }, [sendActionWithResponse]);

  const handleLoadGame = useCallback((code: string) => {
    sendAction({ type: 'LOAD_GAME', code });
    setShowSaveLoadModal(false);
    setSaveCode(null);
  }, [sendAction]);

  // Drag and drop handler
  const handleDragEnd = useCallback(
    (card: CardType, sourceZone: Zone, targetZone: Zone, position?: { x: number; y: number }, isOpponentBattlefield?: boolean) => {
      // Check if card is on opponent's battlefield (source)
      const isCardOnOpponentBattlefield = opponent?.battlefield.some(c => c.instanceId === card.instanceId);

      // Handle cards FROM opponent's battlefield
      if (isCardOnOpponentBattlefield) {
        if (targetZone === 'battlefield' && isOpponentBattlefield && position) {
          // Repositioning on opponent's battlefield
          sendAction({
            type: 'MOVE_CARD_ON_ANY_BATTLEFIELD',
            instanceId: card.instanceId,
            position,
          });
        } else if (targetZone === 'battlefield' && !isOpponentBattlefield) {
          // Moving from opponent's battlefield to your own battlefield
          sendAction({
            type: 'TAKE_FROM_OPPONENT_BATTLEFIELD',
            instanceId: card.instanceId,
            to: 'battlefield',
            position,
          });
        } else {
          // Moving from opponent's battlefield to another zone (hand, graveyard, etc.)
          sendAction({
            type: 'TAKE_FROM_OPPONENT_BATTLEFIELD',
            instanceId: card.instanceId,
            to: targetZone,
          });
        }
        return;
      }

      // Moving card to opponent's battlefield (paper Magic style - free placement)
      if (targetZone === 'battlefield' && isOpponentBattlefield) {
        // Moving card to opponent's battlefield
        sendAction({
          type: 'MOVE_TO_OPPONENT_BATTLEFIELD',
          instanceId: card.instanceId,
          from: sourceZone,
          position,
        });
        return;
      }

      // Don't do anything if dropped on same zone (unless it's battlefield with position change)
      if (sourceZone === targetZone && targetZone !== 'battlefield') {
        return;
      }

      // If moving within battlefield, update position
      if (sourceZone === 'battlefield' && targetZone === 'battlefield' && position) {
        sendAction({
          type: 'MOVE_CARD_POSITION',
          instanceId: card.instanceId,
          position,
        });
        return;
      }

      // Move card between zones
      sendAction({
        type: 'MOVE_CARD',
        instanceId: card.instanceId,
        from: sourceZone,
        to: targetZone,
        position,
      });
    },
    [sendAction, opponent]
  );

  return (
    <DndProvider onDragEnd={handleDragEnd}>
    <div className="flex h-full bg-surface-dark">
      {/* Main game area */}
      <div className="flex-1 flex flex-col p-4 pb-14 overflow-hidden">
        {/* Opponent area (top) */}
        {opponent ? (
          <div className="flex-[0.8] min-h-0">
            {isGoldfishMode ? (
              <div className="h-full flex flex-col">
                <div className="px-4 py-2 bg-purple-900/30 border-b border-purple-700 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-purple-400" />
                  <span className="text-purple-300 text-sm font-medium">Goldfish Opponent</span>
                  <span className="text-purple-400/60 text-xs ml-auto">Solo practice mode</span>
                </div>
                <div className="flex-1">
                  <PlayerArea
                    player={opponent}
                    isOpponent={true}
                    onPeekOpponentLibrary={handlePeekOpponentLibrary}
                    onCardDoubleClick={handleCardDoubleTap}
                    onCardTap={handleCardTap}
                    onCardUntap={handleCardUntap}
                    onCardFlip={handleCardFlip}
                    onCardTransform={handleCardTransform}
                    onCardMoveTo={handleCardMoveTo}
                    onCardPutOnTop={handleCardPutOnTop}
                    onCardPutOnBottom={handleCardPutOnBottom}
                    onCardAddCounter={handleCardAddCounter}
                    onCardRemoveCounter={handleCardRemoveCounter}
                    onDestroyToken={handleDestroyToken}
                    onCardAttachTo={handleCardAttachTo}
                    onCardDetach={handleCardDetach}
                    onBringToFront={handleBringToFront}
                    onSendToBack={handleSendToBack}
                    allBattlefieldCards={allBattlefieldCards}
                  />
                </div>
              </div>
            ) : (
              <PlayerArea
                player={opponent}
                isOpponent={true}
                onPeekOpponentLibrary={handlePeekOpponentLibrary}
                onCardDoubleClick={handleCardDoubleTap}
                onCardTap={handleCardTap}
                onCardUntap={handleCardUntap}
                onCardFlip={handleCardFlip}
                onCardTransform={handleCardTransform}
                onCardMoveTo={handleCardMoveTo}
                onCardPutOnTop={handleCardPutOnTop}
                onCardPutOnBottom={handleCardPutOnBottom}
                onCardAddCounter={handleCardAddCounter}
                onCardRemoveCounter={handleCardRemoveCounter}
                onDestroyToken={handleDestroyToken}
                onCardAttachTo={handleCardAttachTo}
                onCardDetach={handleCardDetach}
                onBringToFront={handleBringToFront}
                onSendToBack={handleSendToBack}
                allBattlefieldCards={allBattlefieldCards}
              />
            )}
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-600">
            Waiting for opponent...
          </div>
        )}

        {/* Your area (bottom) */}
        <div className="flex-[1.2] min-h-0">
          <PlayerArea
            player={myPlayer}
            isOpponent={false}
            onDraw={handleDraw}
            onShuffle={handleShuffle}
            onSearch={handleSearch}
            onScry={handleScry}
            onRevealTop={handleRevealTop}
            onRevealTopToOpponent={handleRevealTopToOpponent}
            onRevealHand={handleRevealHand}
            onRevealCard={handleRevealCard}
            onCardDoubleClick={handleCardDoubleTap}
            onHandCardDoubleClick={handleHandCardDoubleClick}
            onCardTap={handleCardTap}
            onCardUntap={handleCardUntap}
            onCardFlip={handleCardFlip}
            onCardTransform={handleCardTransform}
            onCardMoveTo={handleCardMoveTo}
            onCardPutOnTop={handleCardPutOnTop}
            onCardPutOnBottom={handleCardPutOnBottom}
            onCardAddCounter={handleCardAddCounter}
            onCardRemoveCounter={handleCardRemoveCounter}
            onLifeChange={handleLifeChange}
            onPlayerCounterChange={handlePlayerCounterChange}
            onDestroyToken={handleDestroyToken}
            onCardAttachTo={handleCardAttachTo}
            onCardDetach={handleCardDetach}
            onBringToFront={handleBringToFront}
            onSendToBack={handleSendToBack}
            allBattlefieldCards={allBattlefieldCards}
          />
        </div>
      </div>

      {/* Stack sidebar */}
      <div className="w-48 border-l border-gray-800 bg-surface/50 flex flex-col">
        {/* Action log - top portion */}
        <div className="h-40 border-b border-gray-800">
          <ActionLog
            entries={gameState.actionLog || []}
            myPlayerIndex={myPlayerIndex}
          />
        </div>
        {/* Stack - remaining space */}
        <div className="flex-1 min-h-0">
          <Stack cards={gameState.stack || []} />
        </div>
      </div>

      {/* Game info footer */}
      <div className="absolute bottom-0 left-0 right-48 bg-surface-dark border-t border-gray-800 px-4 py-2 flex items-center justify-between text-sm">
        <div className="flex items-center gap-4">
          <span className="text-gray-500">
            Game {gameState.currentGame}/3
          </span>
          {gameState.gameResults.length > 0 && (
            <span className="text-gray-400">
              Score: {gameState.gameResults.filter(r => r === (myPlayerIndex === 0 ? 'player1' : 'player2')).length} - {gameState.gameResults.filter(r => r === (myPlayerIndex === 0 ? 'player2' : 'player1')).length}
            </span>
          )}
          {/* Turn indicator */}
          <div className={`px-3 py-1 rounded-lg font-medium ${
            isGoldfishMode
              ? 'bg-purple-600/30 text-purple-400 border border-purple-600'
              : gameState.turn?.activePlayer === myPlayerIndex
                ? 'bg-green-600/30 text-green-400 border border-green-600'
                : 'bg-gray-700/30 text-gray-400 border border-gray-600'
          }`}>
            {isGoldfishMode
              ? "Your Turn"
              : gameState.turn?.activePlayer === myPlayerIndex
                ? "Your Turn"
                : `${opponent?.name || "Opponent"}'s Turn`}
            {' '}({gameState.turn?.number || 1})
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => sendAction({ type: 'PASS_TURN' })}
            className="px-3 py-1 text-xs font-medium bg-green-600 hover:bg-green-500 rounded"
          >
            End Turn
          </button>
          <button
            onClick={() => setShowTokenModal(true)}
            className="px-2 py-1 text-xs bg-amber-600 hover:bg-amber-500 rounded"
          >
            Create Token
          </button>
          <button
            onClick={() => sendAction({ type: 'UNDO' })}
            className="px-2 py-1 text-xs bg-surface-light hover:bg-surface-lighter rounded"
          >
            Undo
          </button>
          <button
            onClick={() => sendAction({ type: 'REDO' })}
            className="px-2 py-1 text-xs bg-surface-light hover:bg-surface-lighter rounded"
          >
            Redo
          </button>
          <button
            onClick={() => sendAction({ type: 'UNTAP_ALL' })}
            className="px-2 py-1 text-xs bg-blue-600 hover:bg-blue-500 rounded"
          >
            Untap All
          </button>
          <button
            onClick={() => {
              setSaveCode(null);
              setShowSaveLoadModal(true);
            }}
            className="px-2 py-1 text-xs bg-purple-600 hover:bg-purple-500 rounded"
          >
            Save/Load
          </button>
          <button
            onClick={() => setShowHelpModal(true)}
            className="px-2 py-1 text-xs bg-gray-600 hover:bg-gray-500 rounded"
            title="How to play"
          >
            ?
          </button>
          <button
            onClick={() => setShowConcedeDialog(true)}
            className="px-2 py-1 text-xs bg-red-700 hover:bg-red-600 rounded"
          >
            Concede
          </button>
        </div>
      </div>

      {/* Create Token Modal */}
      <CreateTokenModal
        isOpen={showTokenModal}
        onClose={() => setShowTokenModal(false)}
        onCreate={handleCreateToken}
      />

      {/* Save/Load Modal */}
      <SaveLoadModal
        isOpen={showSaveLoadModal}
        onClose={() => {
          setShowSaveLoadModal(false);
          setSaveCode(null);
        }}
        onSave={handleSaveGame}
        onLoad={handleLoadGame}
        saveCode={saveCode}
      />

      {/* Scry Modal */}
      <ScryModal
        isOpen={scryModalState.isOpen}
        onClose={() => setScryModalState({ isOpen: false, cards: [], mode: 'scry' })}
        cards={scryModalState.cards}
        mode={scryModalState.mode}
        onComplete={handleScryComplete}
        onMoveToZone={handleScryMoveToZone}
      />

      {/* Search Library Modal */}
      <SearchLibraryModal
        isOpen={showSearchModal}
        onClose={() => setShowSearchModal(false)}
        cards={myPlayer?.deck || []}
        onSelectCard={handleSearchSelectCard}
        onComplete={handleSearchComplete}
      />

      {/* Help Modal */}
      <HelpModal
        isOpen={showHelpModal}
        onClose={() => setShowHelpModal(false)}
      />

      {/* Revealed Cards Modal (opponent revealed cards to you) */}
      <RevealedCardsModal
        isOpen={revealedCards !== null}
        onClose={dismissRevealedCards}
        data={revealedCards}
      />

      {/* Mulligan overlay */}
      {gameState.phase === 'mulligan' && (
        <MulliganOverlay
          player={myPlayer}
          opponent={opponent ?? null}
          isGoldfishMode={isGoldfishMode}
          onKeep={handleMulliganKeep}
          onMulligan={handleMulliganAgain}
        />
      )}

      {/* Concede confirmation dialog */}
      <ConcedeDialog
        isOpen={showConcedeDialog}
        onClose={() => setShowConcedeDialog(false)}
        onConfirm={handleConcede}
      />

      {/* Game lifecycle overlays (sideboarding, finished) */}
      <GameOverlay
        gameState={gameState}
        myPlayer={myPlayer}
        myPlayerIndex={myPlayerIndex}
        opponent={opponent ?? null}
        onConcede={handleConcede}
        onDeclareWinner={handleDeclareWinner}
        onReadyForNextGame={handleReadyForNextGame}
        onSwapSideboardCard={handleSwapSideboardCard}
      />
    </div>
    </DndProvider>
  );
}
