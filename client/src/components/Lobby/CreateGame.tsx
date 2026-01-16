import { useState } from 'react';
import { useGameStore } from '../../stores/gameStore';

export function CreateGame() {
  const [playerName, setPlayerName] = useState('');
  const [password, setPassword] = useState('');

  const { createGame, gameStatus, error, clearError } = useGameStore();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (playerName.trim() && password.trim()) {
      createGame(playerName.trim(), password.trim());
    }
  };

  const isLoading = gameStatus === 'creating';

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
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
          autoFocus
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
          placeholder="Set a password for the game"
          className="w-full bg-surface border border-gray-700 rounded-lg px-3 py-2 text-gray-100 focus:outline-none focus:border-accent"
          disabled={isLoading}
        />
        <p className="mt-1 text-xs text-gray-500">
          Share this password with your opponent so they can join.
        </p>
      </div>

      {error && (
        <div className="p-3 bg-red-900/30 border border-red-700 rounded-lg text-red-300 text-sm">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={!playerName.trim() || !password.trim() || isLoading}
        className="w-full py-2 px-4 bg-accent text-surface font-medium rounded-lg hover:bg-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {isLoading ? (
          <>
            <div className="w-4 h-4 border-2 border-surface border-t-transparent rounded-full animate-spin" />
            Creating...
          </>
        ) : (
          'Create Game'
        )}
      </button>
    </form>
  );
}
