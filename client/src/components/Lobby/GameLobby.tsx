import { useState } from 'react';
import { useGameStore } from '../../stores/gameStore';
import { DeckImport } from './DeckImport';
import type { ResolvedCard } from '../../services/api';

interface ResolvedDeck {
  mainDeck: Array<{ card: ResolvedCard; count: number }>;
  sideboard: Array<{ card: ResolvedCard; count: number }>;
}

export function GameLobby() {
  const { gameId, playerIndex, gameState, leaveGame, submitDeck, startGame, enableGoldfishMode, error, clearError } = useGameStore();
  const [showDeckImport, setShowDeckImport] = useState(false);
  const [deckSubmitted, setDeckSubmitted] = useState(false);

  if (!gameId || playerIndex === null) {
    return null;
  }

  const player = gameState?.players[playerIndex];
  const opponent = gameState?.players[playerIndex === 0 ? 1 : 0];
  const isGoldfishMode = gameState?.isGoldfishMode ?? false;

  // Derive deck status from BOTH local state (optimistic) AND server state (reliable after reconnect)
  // This fixes the bug where deckSubmitted resets to false on reconnect but server still has deck
  const hasDeck = deckSubmitted || (player?.deck && player.deck.length > 0);

  const handleDeckResolved = (deck: ResolvedDeck) => {
    submitDeck(deck);
    setDeckSubmitted(true);
    setShowDeckImport(false);
  };

  const handleCopyGameId = () => {
    navigator.clipboard.writeText(gameId);
  };

  return (
    <div className="space-y-6">
      {/* Error Display */}
      {error && (
        <div className="bg-red-500/10 border border-red-500 rounded-lg p-4">
          <div className="flex items-start justify-between">
            <p className="text-red-400">{error}</p>
            <button
              onClick={clearError}
              className="text-red-300 hover:text-red-100 ml-4"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Game ID Banner */}
      <div className="bg-surface-light rounded-lg p-6 text-center">
        <p className="text-gray-400 text-sm mb-2">Game ID</p>
        <div className="flex items-center justify-center gap-3">
          <span className="text-4xl font-mono font-bold text-accent tracking-widest">
            {gameId}
          </span>
          <button
            onClick={handleCopyGameId}
            className="p-2 text-gray-400 hover:text-gray-200 transition-colors"
            title="Copy to clipboard"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </button>
        </div>
        <p className="text-gray-500 text-sm mt-2">
          Share this ID and the password with your opponent
        </p>
      </div>

      {/* Players */}
      <div className="grid grid-cols-2 gap-4">
        {/* You */}
        <div className="bg-surface-light rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-3 h-3 rounded-full bg-green-400" />
            <span className="font-medium text-gray-100">
              {player?.name || 'You'}
            </span>
            <span className="text-xs text-gray-500">(Player {playerIndex + 1})</span>
          </div>

          {player?.deck && player.deck.length > 0 ? (
            <div className="flex items-center gap-2 text-sm text-green-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Deck ready ({player.deck.length} cards)
            </div>
          ) : deckSubmitted ? (
            <div className="flex items-center gap-2 text-sm text-green-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Deck submitted
            </div>
          ) : (
            <div className="text-sm text-yellow-400">
              No deck submitted
            </div>
          )}
        </div>

        {/* Opponent */}
        <div className="bg-surface-light rounded-lg p-4">
          {isGoldfishMode ? (
            <>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-3 h-3 rounded-full bg-purple-400" />
                <span className="font-medium text-purple-300">
                  Goldfish Mode
                </span>
              </div>
              <div className="text-sm text-purple-400">
                Solo practice - no opponent
              </div>
            </>
          ) : opponent ? (
            <>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-3 h-3 rounded-full bg-green-400" />
                <span className="font-medium text-gray-100">
                  {opponent.name}
                </span>
                <span className="text-xs text-gray-500">(Player {playerIndex === 0 ? 2 : 1})</span>
              </div>

              {opponent.deck && opponent.deck.length > 0 ? (
                <div className="flex items-center gap-2 text-sm text-green-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Deck ready ({opponent.deck.length} cards)
                </div>
              ) : (
                <div className="text-sm text-yellow-400">
                  No deck submitted
                </div>
              )}
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-3 h-3 rounded-full bg-gray-600 animate-pulse" />
                <span className="font-medium text-gray-400">
                  Waiting for opponent...
                </span>
              </div>
              <div className="text-sm text-gray-500 mb-3">
                Share the game ID and password
              </div>
              <button
                onClick={enableGoldfishMode}
                className="w-full py-2 px-3 text-sm bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-colors"
              >
                Play Solo (Goldfish)
              </button>
            </>
          )}
        </div>
      </div>

      {/* Deck Import Section */}
      {!hasDeck && (
        <div className="bg-surface-light rounded-lg p-6">
          {showDeckImport ? (
            <>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-100">Import Your Deck</h3>
                <button
                  onClick={() => setShowDeckImport(false)}
                  className="text-gray-400 hover:text-gray-200"
                >
                  Cancel
                </button>
              </div>
              <DeckImport onDeckResolved={handleDeckResolved} />
            </>
          ) : (
            <button
              onClick={() => setShowDeckImport(true)}
              className="w-full py-3 px-4 bg-accent text-surface font-medium rounded-lg hover:bg-accent/90 transition-colors"
            >
              Import Deck
            </button>
          )}
        </div>
      )}

      {/* Ready Status */}
      {hasDeck && (isGoldfishMode || opponent) && (
        <div className="bg-surface-light rounded-lg p-6 text-center">
          {isGoldfishMode ? (
            <>
              <p className="text-purple-400 font-medium mb-2">Ready to goldfish!</p>
              <p className="text-gray-400 text-sm">
                Practice with your deck in solo mode
              </p>
              {playerIndex === 0 && (
                <button
                  onClick={startGame}
                  className="mt-4 py-2 px-6 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-500 transition-colors"
                >
                  Start Goldfish
                </button>
              )}
            </>
          ) : opponent?.deck && opponent.deck.length > 0 ? (
            <>
              <p className="text-green-400 font-medium mb-2">Both players ready!</p>
              <p className="text-gray-400 text-sm">
                Game will start when the host clicks Start Game
              </p>
              {playerIndex === 0 && (
                <button
                  onClick={startGame}
                  className="mt-4 py-2 px-6 bg-green-600 text-white font-medium rounded-lg hover:bg-green-500 transition-colors"
                >
                  Start Game
                </button>
              )}
            </>
          ) : (
            <p className="text-yellow-400">
              Waiting for opponent to submit their deck...
            </p>
          )}
        </div>
      )}

      {/* Leave Game */}
      <div className="text-center">
        <button
          onClick={leaveGame}
          className="text-gray-400 hover:text-red-400 text-sm transition-colors"
        >
          Leave Game
        </button>
      </div>
    </div>
  );
}
