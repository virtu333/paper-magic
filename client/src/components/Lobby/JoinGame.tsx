import { useState } from 'react';
import { useGameStore } from '../../stores/gameStore';

export function JoinGame() {
  const [gameId, setGameId] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [password, setPassword] = useState('');

  const { joinGame, gameStatus, error, clearError } = useGameStore();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (gameId.trim() && playerName.trim() && password.trim()) {
      joinGame(gameId.trim().toUpperCase(), playerName.trim(), password.trim());
    }
  };

  const isLoading = gameStatus === 'joining';

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">
          Game ID
        </label>
        <input
          type="text"
          value={gameId}
          onChange={(e) => {
            // Auto-uppercase and limit to 6 chars
            setGameId(e.target.value.toUpperCase().slice(0, 6));
            if (error) clearError();
          }}
          placeholder="XXXXXX"
          className="w-full bg-surface border border-gray-700 rounded-lg px-3 py-2 text-gray-100 font-mono text-lg tracking-widest text-center focus:outline-none focus:border-accent"
          disabled={isLoading}
          autoFocus
          maxLength={6}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">
          Your Name
        </label>
        <input
          type="text"
          value={playerName}
          onChange={(e) => {
            setPlayerName(e.target.value);
            if (error) clearError();
          }}
          placeholder="Enter your name"
          className="w-full bg-surface border border-gray-700 rounded-lg px-3 py-2 text-gray-100 focus:outline-none focus:border-accent"
          disabled={isLoading}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">
          Game Password
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            if (error) clearError();
          }}
          placeholder="Enter the game password"
          className="w-full bg-surface border border-gray-700 rounded-lg px-3 py-2 text-gray-100 focus:outline-none focus:border-accent"
          disabled={isLoading}
        />
      </div>

      {error && (
        <div className="p-3 bg-red-900/30 border border-red-700 rounded-lg text-red-300 text-sm">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={gameId.length !== 6 || !playerName.trim() || !password.trim() || isLoading}
        className="w-full py-2 px-4 bg-accent text-surface font-medium rounded-lg hover:bg-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {isLoading ? (
          <>
            <div className="w-4 h-4 border-2 border-surface border-t-transparent rounded-full animate-spin" />
            Joining...
          </>
        ) : (
          'Join Game'
        )}
      </button>
    </form>
  );
}
