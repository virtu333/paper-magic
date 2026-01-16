import { useState } from 'react';
import type { GameState, Player, GameResult } from '@paper-magic/shared';
import { Card } from './Card';

interface GameOverlayProps {
  gameState: GameState;
  myPlayer: Player;
  myPlayerIndex: 0 | 1;
  opponent: Player | null;
  onConcede: () => void;
  onDeclareWinner: (winner: GameResult) => void;
  onReadyForNextGame: () => void;
  onSwapSideboardCard: (mainDeckIndex: number, sideboardIndex: number) => void;
}

export function GameOverlay({
  gameState,
  myPlayer,
  myPlayerIndex,
  opponent,
  onConcede: _onConcede,
  onDeclareWinner: _onDeclareWinner,
  onReadyForNextGame,
  onSwapSideboardCard,
}: GameOverlayProps) {
  // Note: onConcede and onDeclareWinner are reserved for future use
  void _onConcede;
  void _onDeclareWinner;
  // Only show overlay in specific phases
  if (gameState.phase !== 'sideboarding' && gameState.phase !== 'finished') {
    return null;
  }

  // Match finished
  if (gameState.phase === 'finished') {
    return (
      <MatchFinishedOverlay
        gameState={gameState}
        myPlayerIndex={myPlayerIndex}
      />
    );
  }

  // Sideboarding phase
  if (gameState.phase === 'sideboarding') {
    return (
      <SideboardingOverlay
        gameState={gameState}
        myPlayer={myPlayer}
        opponent={opponent}
        onReadyForNextGame={onReadyForNextGame}
        onSwapSideboardCard={onSwapSideboardCard}
      />
    );
  }

  return null;
}

// Concede confirmation dialog
interface ConcedeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function ConcedeDialog({ isOpen, onClose, onConfirm }: ConcedeDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
      <div className="bg-surface-light rounded-xl p-6 max-w-md w-full mx-4">
        <h2 className="text-xl font-bold text-white mb-4">Concede Game?</h2>
        <p className="text-gray-400 mb-6">
          Are you sure you want to concede this game? Your opponent will win this game.
        </p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors"
          >
            Concede
          </button>
        </div>
      </div>
    </div>
  );
}

// Match finished overlay
function MatchFinishedOverlay({
  gameState,
  myPlayerIndex,
}: {
  gameState: GameState;
  myPlayerIndex: 0 | 1;
}) {
  const player1Wins = gameState.gameResults.filter(r => r === 'player1').length;
  const player2Wins = gameState.gameResults.filter(r => r === 'player2').length;

  const myWins = myPlayerIndex === 0 ? player1Wins : player2Wins;
  const opponentWins = myPlayerIndex === 0 ? player2Wins : player1Wins;

  const iWon = myWins > opponentWins;
  const isDraw = myWins === opponentWins;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
      <div className="bg-surface-light rounded-xl p-8 max-w-md w-full mx-4 text-center">
        <div className={`text-6xl mb-4 ${iWon ? '' : isDraw ? '' : ''}`}>
          {iWon ? '🏆' : isDraw ? '🤝' : '😔'}
        </div>
        <h2 className={`text-3xl font-bold mb-4 ${
          iWon ? 'text-green-400' : isDraw ? 'text-yellow-400' : 'text-red-400'
        }`}>
          {iWon ? 'Victory!' : isDraw ? 'Draw!' : 'Defeat'}
        </h2>
        <p className="text-gray-400 mb-6">
          Match Result: {myWins} - {opponentWins}
        </p>
        <div className="flex justify-center gap-2 mb-6">
          {gameState.gameResults.map((result, i) => (
            <div
              key={i}
              className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                (result === 'player1' && myPlayerIndex === 0) ||
                (result === 'player2' && myPlayerIndex === 1)
                  ? 'bg-green-500 text-white'
                  : result === 'draw'
                  ? 'bg-yellow-500 text-white'
                  : 'bg-red-500 text-white'
              }`}
            >
              {i + 1}
            </div>
          ))}
        </div>
        <p className="text-gray-500 text-sm">
          Thanks for playing! Close this window to return to the lobby.
        </p>
      </div>
    </div>
  );
}

// Sideboarding overlay
function SideboardingOverlay({
  gameState,
  myPlayer,
  opponent,
  onReadyForNextGame,
  onSwapSideboardCard,
}: {
  gameState: GameState;
  myPlayer: Player;
  opponent: Player | null;
  onReadyForNextGame: () => void;
  onSwapSideboardCard: (mainDeckIndex: number, sideboardIndex: number) => void;
}) {
  const [selectedMainCard, setSelectedMainCard] = useState<number | null>(null);
  const [selectedSideCard, setSelectedSideCard] = useState<number | null>(null);

  const player1Wins = gameState.gameResults.filter(r => r === 'player1').length;
  const player2Wins = gameState.gameResults.filter(r => r === 'player2').length;

  // Handle card selection for swap
  const handleMainCardClick = (index: number) => {
    if (selectedSideCard !== null) {
      // Swap with selected sideboard card
      onSwapSideboardCard(index, selectedSideCard);
      setSelectedMainCard(null);
      setSelectedSideCard(null);
    } else {
      setSelectedMainCard(selectedMainCard === index ? null : index);
    }
  };

  const handleSideCardClick = (index: number) => {
    if (selectedMainCard !== null) {
      // Swap with selected main deck card
      onSwapSideboardCard(selectedMainCard, index);
      setSelectedMainCard(null);
      setSelectedSideCard(null);
    } else {
      setSelectedSideCard(selectedSideCard === index ? null : index);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/90 flex flex-col z-50 overflow-hidden">
      {/* Header */}
      <div className="bg-surface-light px-6 py-4 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Sideboarding</h2>
          <p className="text-gray-400 text-sm">
            Game {gameState.currentGame} of 3 | Score: {player1Wins} - {player2Wins}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-sm">
            {opponent?.readyForNextGame ? (
              <span className="text-green-400">Opponent ready</span>
            ) : (
              <span className="text-yellow-400">Opponent sideboarding...</span>
            )}
          </div>
          <button
            onClick={onReadyForNextGame}
            disabled={myPlayer.readyForNextGame}
            className={`px-6 py-2 rounded-lg font-medium transition-colors ${
              myPlayer.readyForNextGame
                ? 'bg-green-700 text-green-200 cursor-not-allowed'
                : 'bg-green-600 hover:bg-green-500 text-white'
            }`}
          >
            {myPlayer.readyForNextGame ? 'Waiting...' : 'Ready for Game ' + (gameState.currentGame + 1)}
          </button>
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-surface px-6 py-2 text-sm text-gray-400">
        Click a card from your main deck, then click a sideboard card to swap them.
        {selectedMainCard !== null && ' Now click a sideboard card to swap.'}
        {selectedSideCard !== null && ' Now click a main deck card to swap.'}
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Main Deck */}
        <div>
          <h3 className="text-lg font-medium text-white mb-3">
            Main Deck ({myPlayer.deck.length + myPlayer.hand.length + myPlayer.battlefield.length + myPlayer.graveyard.length} cards)
          </h3>
          <div className="flex flex-wrap gap-2">
            {/* Combine all zones for display - in sideboarding, all cards go back to deck */}
            {[...myPlayer.deck, ...myPlayer.hand, ...myPlayer.battlefield, ...myPlayer.graveyard].map((card, index) => (
              <div
                key={card.instanceId}
                className={`cursor-pointer transition-all ${
                  selectedMainCard === index
                    ? 'ring-4 ring-accent scale-105 -translate-y-1'
                    : 'hover:scale-105'
                }`}
                onClick={() => handleMainCardClick(index)}
              >
                <Card card={card} size="sm" />
              </div>
            ))}
          </div>
        </div>

        {/* Sideboard */}
        <div>
          <h3 className="text-lg font-medium text-white mb-3">
            Sideboard ({myPlayer.sideboard.length} cards)
          </h3>
          {myPlayer.sideboard.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {myPlayer.sideboard.map((card, index) => (
                <div
                  key={card.instanceId}
                  className={`cursor-pointer transition-all ${
                    selectedSideCard === index
                      ? 'ring-4 ring-purple-500 scale-105 -translate-y-1'
                      : 'hover:scale-105'
                  }`}
                  onClick={() => handleSideCardClick(index)}
                >
                  <Card card={card} size="sm" />
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">No sideboard cards</p>
          )}
        </div>
      </div>
    </div>
  );
}
