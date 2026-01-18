import { useRef, useEffect } from 'react';
import type { ActionLogEntry } from '@paper-magic/shared';

interface ActionLogProps {
  entries: ActionLogEntry[];
  myPlayerIndex: 0 | 1;
}

export function ActionLog({ entries, myPlayerIndex }: ActionLogProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  // Show last 10 entries, most recent at bottom
  const recentEntries = entries.slice(-10);

  // Autoscroll to bottom when entries change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [entries.length]);

  return (
    <div className="h-full flex flex-col">
      <div className="px-2 py-1 text-xs font-semibold text-gray-400 border-b border-gray-700 flex-shrink-0">
        Action Log
      </div>
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-2 space-y-1 text-xs">
        {recentEntries.length === 0 ? (
          <div className="text-gray-600 italic">No actions yet</div>
        ) : (
          recentEntries.map(entry => (
            <div
              key={entry.id}
              className={`py-0.5 ${
                entry.playerIndex === myPlayerIndex
                  ? 'text-blue-400'
                  : 'text-orange-400'
              }`}
            >
              <span className="font-medium">{entry.playerName}</span>
              {' '}{entry.message}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
