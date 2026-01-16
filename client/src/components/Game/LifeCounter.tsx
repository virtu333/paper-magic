import { useState, useCallback, useRef, useEffect } from 'react';
import type { LifeEntry } from '@paper-magic/shared';

interface LifeCounterProps {
  life: LifeEntry[];
  isOpponent?: boolean;
  onLifeChange?: (delta: number, note?: string) => void;
}

export function LifeCounter({
  life,
  isOpponent = false,
  onLifeChange,
}: LifeCounterProps) {
  const [showHistory, setShowHistory] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const currentLife = life.length > 0 ? life[life.length - 1].total : 20;

  // Focus input when editing starts
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleIncrement = useCallback((amount: number) => {
    onLifeChange?.(amount);
  }, [onLifeChange]);

  const handleStartEdit = useCallback(() => {
    if (isOpponent) return;
    setEditValue(currentLife.toString());
    setIsEditing(true);
  }, [isOpponent, currentLife]);

  const handleEditSubmit = useCallback(() => {
    const newValue = parseInt(editValue, 10);
    if (!isNaN(newValue) && newValue !== currentLife) {
      const delta = newValue - currentLife;
      onLifeChange?.(delta, 'Set to ' + newValue);
    }
    setIsEditing(false);
  }, [editValue, currentLife, onLifeChange]);

  const handleEditKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleEditSubmit();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
    }
  }, [handleEditSubmit]);

  const getLifeColor = (total: number) => {
    if (total <= 0) return 'text-red-600';
    if (total <= 5) return 'text-red-500';
    if (total <= 10) return 'text-yellow-500';
    return 'text-green-500';
  };

  return (
    <div className="relative">
      <div className="flex items-center gap-2">
        {/* Decrement buttons */}
        {!isOpponent && (
          <div className="flex gap-1">
            <button
              onClick={() => handleIncrement(-5)}
              className="w-7 h-7 rounded bg-red-900/50 hover:bg-red-800/50 text-red-400 text-xs font-bold transition-colors"
            >
              -5
            </button>
            <button
              onClick={() => handleIncrement(-1)}
              className="w-7 h-7 rounded bg-red-900/50 hover:bg-red-800/50 text-red-400 text-sm font-bold transition-colors"
            >
              -1
            </button>
          </div>
        )}

        {/* Life total display */}
        <div
          className={`relative ${!isOpponent ? 'cursor-pointer' : ''}`}
          onClick={handleStartEdit}
          onMouseEnter={() => setShowHistory(true)}
          onMouseLeave={() => setShowHistory(false)}
        >
          {isEditing ? (
            <input
              ref={inputRef}
              type="number"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={handleEditSubmit}
              onKeyDown={handleEditKeyDown}
              className="w-14 h-8 text-center text-xl font-bold bg-surface-lighter rounded border border-gray-600 text-white"
            />
          ) : (
            <div className={`text-2xl font-bold min-w-[3rem] text-center ${getLifeColor(currentLife)}`}>
              {currentLife}
            </div>
          )}

          {/* Life history popup */}
          {showHistory && life.length > 1 && !isEditing && (
            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 z-50">
              <LifeHistoryPopup life={life} />
            </div>
          )}
        </div>

        {/* Increment buttons */}
        {!isOpponent && (
          <div className="flex gap-1">
            <button
              onClick={() => handleIncrement(1)}
              className="w-7 h-7 rounded bg-green-900/50 hover:bg-green-800/50 text-green-400 text-sm font-bold transition-colors"
            >
              +1
            </button>
            <button
              onClick={() => handleIncrement(5)}
              className="w-7 h-7 rounded bg-green-900/50 hover:bg-green-800/50 text-green-400 text-xs font-bold transition-colors"
            >
              +5
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// Life history popup component
function LifeHistoryPopup({ life }: { life: LifeEntry[] }) {
  // Show last 10 entries, most recent first
  const recentHistory = [...life].reverse().slice(0, 10);

  return (
    <div className="bg-surface-light rounded-lg shadow-xl border border-gray-700 p-2 min-w-[160px]">
      <div className="text-xs text-gray-400 font-medium mb-2 px-1">Life History</div>
      <div className="space-y-0.5 max-h-48 overflow-y-auto">
        {recentHistory.map((entry, i) => (
          <div
            key={i}
            className={`flex items-center justify-between px-2 py-1 rounded text-sm ${
              i === 0 ? 'bg-surface-lighter' : ''
            }`}
          >
            <div className="flex items-center gap-2">
              <span className={`font-mono font-bold ${
                entry.delta > 0 ? 'text-green-400' : entry.delta < 0 ? 'text-red-400' : 'text-gray-400'
              }`}>
                {entry.delta > 0 ? '+' : ''}{entry.delta}
              </span>
              {entry.note && (
                <span className="text-gray-500 text-xs truncate max-w-[80px]" title={entry.note}>
                  {entry.note}
                </span>
              )}
            </div>
            <span className="text-gray-400 font-medium">{entry.total}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
