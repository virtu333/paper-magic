import { useState, useCallback } from 'react';
import type { PlayerCounters as PlayerCountersType } from '@paper-magic/shared';

interface PlayerCountersProps {
  counters: PlayerCountersType;
  isOpponent?: boolean;
  onCounterChange?: (type: string, value: number) => void;
}

// Counter definitions with display info
const COUNTER_TYPES = [
  { key: 'poison', label: 'Poison', icon: '☠️', color: 'text-green-400', bgColor: 'bg-green-900/30', max: 10 },
  { key: 'energy', label: 'Energy', icon: '⚡', color: 'text-yellow-400', bgColor: 'bg-yellow-900/30' },
  { key: 'experience', label: 'Exp', icon: '★', color: 'text-purple-400', bgColor: 'bg-purple-900/30' },
] as const;

export function PlayerCounters({
  counters,
  isOpponent = false,
  onCounterChange,
}: PlayerCountersProps) {
  const [expandedCounter, setExpandedCounter] = useState<string | null>(null);

  const handleIncrement = useCallback((type: string, delta: number) => {
    const currentValue = counters[type] || 0;
    const newValue = Math.max(0, currentValue + delta);
    onCounterChange?.(type, newValue);
  }, [counters, onCounterChange]);

  // Only show counters that have a value or are being hovered
  const visibleCounters = COUNTER_TYPES.filter(
    ct => counters[ct.key] > 0 || expandedCounter === ct.key
  );

  // Check for poison death (10+ poison counters)
  const isPoisoned = counters.poison >= 10;

  return (
    <div className="flex items-center gap-2">
      {/* Always visible counter badges */}
      {visibleCounters.map(ct => (
        <CounterBadge
          key={ct.key}
          type={ct}
          value={counters[ct.key] || 0}
          isOpponent={isOpponent}
          isExpanded={expandedCounter === ct.key}
          onExpand={() => setExpandedCounter(expandedCounter === ct.key ? null : ct.key)}
          onIncrement={(delta) => handleIncrement(ct.key, delta)}
        />
      ))}

      {/* Add counter button (shows hidden counters) */}
      {!isOpponent && visibleCounters.length < COUNTER_TYPES.length && (
        <AddCounterMenu
          availableCounters={COUNTER_TYPES.filter(ct => !visibleCounters.includes(ct))}
          onAdd={(type) => {
            setExpandedCounter(type);
            handleIncrement(type, 1);
          }}
        />
      )}

      {/* Poison warning */}
      {isPoisoned && (
        <span className="text-red-500 text-xs font-bold animate-pulse ml-1">
          LETHAL POISON!
        </span>
      )}
    </div>
  );
}

// Individual counter badge
interface CounterBadgeProps {
  type: typeof COUNTER_TYPES[number];
  value: number;
  isOpponent: boolean;
  isExpanded: boolean;
  onExpand: () => void;
  onIncrement: (delta: number) => void;
}

function CounterBadge({
  type,
  value,
  isOpponent,
  isExpanded,
  onExpand,
  onIncrement,
}: CounterBadgeProps) {
  return (
    <div className="relative">
      <div
        className={`flex items-center gap-1 px-2 py-0.5 rounded ${type.bgColor} ${
          !isOpponent ? 'cursor-pointer hover:opacity-80' : ''
        } transition-opacity`}
        onClick={!isOpponent ? onExpand : undefined}
      >
        <span className="text-sm">{type.icon}</span>
        <span className={`text-sm font-bold ${type.color}`}>{value}</span>
      </div>

      {/* Expanded controls */}
      {isExpanded && !isOpponent && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 z-50">
          <div className="bg-surface-light rounded-lg shadow-xl border border-gray-700 p-2">
            <div className="text-xs text-gray-400 text-center mb-2">{type.label}</div>
            <div className="flex items-center gap-2">
              <button
                onClick={(e) => { e.stopPropagation(); onIncrement(-1); }}
                className="w-6 h-6 rounded bg-red-900/50 hover:bg-red-800/50 text-red-400 text-sm font-bold"
              >
                -
              </button>
              <span className={`text-lg font-bold min-w-[2rem] text-center ${type.color}`}>
                {value}
              </span>
              <button
                onClick={(e) => { e.stopPropagation(); onIncrement(1); }}
                className="w-6 h-6 rounded bg-green-900/50 hover:bg-green-800/50 text-green-400 text-sm font-bold"
              >
                +
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Add counter menu
interface AddCounterMenuProps {
  availableCounters: typeof COUNTER_TYPES[number][];
  onAdd: (type: string) => void;
}

function AddCounterMenu({ availableCounters, onAdd }: AddCounterMenuProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-6 h-6 rounded bg-surface-lighter hover:bg-gray-600 text-gray-400 text-sm font-bold transition-colors"
        title="Add counter"
      >
        +
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 z-50">
          <div className="bg-surface-light rounded-lg shadow-xl border border-gray-700 p-1 min-w-[120px]">
            {availableCounters.map(ct => (
              <button
                key={ct.key}
                onClick={() => {
                  onAdd(ct.key);
                  setIsOpen(false);
                }}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-surface-lighter text-left transition-colors"
              >
                <span>{ct.icon}</span>
                <span className={`text-sm ${ct.color}`}>{ct.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
