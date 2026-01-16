import { useEffect, useState } from 'react';
import { useGameStore } from './stores/gameStore';
import { CreateGame } from './components/Lobby/CreateGame';
import { JoinGame } from './components/Lobby/JoinGame';
import { GameLobby } from './components/Lobby/GameLobby';
import { GameBoard } from './components/Game/GameBoard';

type LobbyTab = 'create' | 'join';

function App() {
  const {
    connectionStatus,
    gameStatus,
    gameId,
    gameState,
    playerIndex,
    connect,
  } = useGameStore();

  const [lobbyTab, setLobbyTab] = useState<LobbyTab>('create');

  useEffect(() => {
    connect(import.meta.env.VITE_WS_URL || 'ws://localhost:3001');
  }, [connect]);

  // Determine which view to show based on game state
  const inLobby = gameStatus === 'in_lobby' && (!gameState || gameState.phase === 'lobby');
  const inGame = gameState && (gameState.phase === 'mulligan' || gameState.phase === 'playing' || gameState.phase === 'sideboarding');
  const playerId = gameState?.players[playerIndex ?? 0]?.id;

  return (
    <div className="min-h-screen bg-surface">
      {/* Header */}
      <header className="border-b border-gray-800 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <h1 className="text-2xl font-bold text-accent">Paper Magic</h1>

          <div className="flex items-center gap-2 text-sm">
            <div
              className={`w-2 h-2 rounded-full ${
                connectionStatus === 'connected'
                  ? 'bg-green-400'
                  : connectionStatus === 'connecting'
                  ? 'bg-yellow-400 animate-pulse'
                  : 'bg-red-400'
              }`}
            />
            <span className="text-gray-400">
              {connectionStatus === 'connected' ? 'Connected' : connectionStatus}
            </span>
            {gameId && (
              <span className="ml-2 px-2 py-0.5 bg-surface-light rounded text-accent font-mono text-xs">
                {gameId}
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Main content */}
      {inGame && gameState && playerId ? (
        // Full-screen game board
        <main className="h-[calc(100vh-64px)]">
          <GameBoard gameState={gameState} playerId={playerId} />
        </main>
      ) : (
        <main className="max-w-4xl mx-auto p-6">
        {connectionStatus !== 'connected' ? (
          // Connecting screen
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-gray-400">Connecting to server...</p>
          </div>
        ) : inLobby ? (
          // In game lobby
          <GameLobby />
        ) : (
          // Create/Join selection
          <div className="max-w-md mx-auto">
            {/* Tab switcher */}
            <div className="flex mb-6">
              <button
                onClick={() => setLobbyTab('create')}
                className={`flex-1 py-3 text-center font-medium transition-colors rounded-l-lg ${
                  lobbyTab === 'create'
                    ? 'bg-surface-light text-accent'
                    : 'bg-surface-lighter text-gray-400 hover:text-gray-200'
                }`}
              >
                Create Game
              </button>
              <button
                onClick={() => setLobbyTab('join')}
                className={`flex-1 py-3 text-center font-medium transition-colors rounded-r-lg ${
                  lobbyTab === 'join'
                    ? 'bg-surface-light text-accent'
                    : 'bg-surface-lighter text-gray-400 hover:text-gray-200'
                }`}
              >
                Join Game
              </button>
            </div>

            {/* Form */}
            <div className="bg-surface-light rounded-lg p-6">
              {lobbyTab === 'create' ? <CreateGame /> : <JoinGame />}
            </div>

            {/* Info text */}
            <p className="mt-6 text-center text-gray-500 text-sm">
              {lobbyTab === 'create'
                ? 'Create a new game and share the ID with your opponent.'
                : 'Enter the game ID and password shared by your opponent.'}
            </p>

            {/* About Section */}
            <div className="mt-10 mb-20 p-6 bg-surface-light rounded-lg border border-gray-800">
              <h2 className="text-lg font-semibold text-accent mb-4">About Paper Magic</h2>

              <p className="text-gray-300 text-sm mb-4">
                A real-time shared tabletop for playtesting Magic: The Gathering with a friend over Discord or voice chat.
                Perfect for testing new sets before they hit Arena or MTGO.
              </p>

              <h3 className="text-sm font-semibold text-gray-200 mb-2">Features</h3>
              <ul className="text-gray-400 text-sm space-y-1 mb-4 list-disc list-inside">
                <li>Import decklists with card images from Scryfall</li>
                <li>Test with preview cards from unreleased sets</li>
                <li>Drag-and-drop cards between zones</li>
                <li>Track life totals, counters, and tokens</li>
                <li>Undo/redo actions and save game state</li>
              </ul>

              <h3 className="text-sm font-semibold text-gray-200 mb-2">How to Play</h3>
              <ol className="text-gray-400 text-sm space-y-1 mb-4 list-decimal list-inside">
                <li>Create a game and share the Game ID + password with your opponent</li>
                <li>Both players import their decklists (paste from any deck builder)</li>
                <li>Click "Ready" to start the game and draw opening hands</li>
                <li>Play as you would in paper - drag cards, right-click for actions</li>
                <li>Use keyboard shortcuts: T to tap, U to untap all, D to draw</li>
              </ol>

              <div className="mt-4 p-3 bg-surface rounded border border-gray-700">
                <p className="text-gray-500 text-xs">
                  <span className="text-gray-400 font-medium">Note:</span> This tool mirrors paper play and is not a rules engine.
                  Some complex mechanics (especially in Legacy/Vintage formats) may require manual workarounds.
                  Use your best judgment and communicate with your opponent!
                </p>
              </div>
            </div>
          </div>
        )}
        </main>
      )}

      {/* Footer - only show when not in game */}
      {!inGame && (
        <footer className="fixed bottom-0 left-0 right-0 border-t border-gray-800 bg-surface px-6 py-3">
          <p className="text-center text-gray-500 text-sm">
            Real-time shared tabletop for playtesting Magic: The Gathering
          </p>
        </footer>
      )}
    </div>
  );
}

export default App;
