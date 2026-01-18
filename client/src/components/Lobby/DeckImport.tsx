import { useState, useCallback } from 'react';
import { parseDeck, getUniqueCardNames, validateDeckSize, type ParsedDeck, type DeckFormat } from '../../utils/deckParser';
import { resolveCards, type ResolvedCard } from '../../services/api';
import { preloadDeckImages } from '../../utils/imagePreloader';

interface DeckImportProps {
  onDeckResolved?: (deck: {
    mainDeck: Array<{ card: ResolvedCard; count: number }>;
    sideboard: Array<{ card: ResolvedCard; count: number }>;
  }) => void;
}

type ImportState = 'input' | 'loading' | 'preview' | 'preloading';

export function DeckImport({ onDeckResolved }: DeckImportProps) {
  const [state, setState] = useState<ImportState>('input');
  const [deckText, setDeckText] = useState('');
  const [deckFormat, setDeckFormat] = useState<DeckFormat>('constructed');
  const [parsedDeck, setParsedDeck] = useState<ParsedDeck | null>(null);
  const [resolvedCards, setResolvedCards] = useState<Map<string, ResolvedCard>>(new Map());
  const [notFoundCards, setNotFoundCards] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [preloadProgress, setPreloadProgress] = useState({ loaded: 0, total: 0 });

  const handleImport = useCallback(async () => {
    setError(null);

    // Parse the deck text
    const parsed = parseDeck(deckText);
    setParsedDeck(parsed);

    // Check for parse errors
    if (parsed.errors.length > 0) {
      setError(`Parse errors on lines: ${parsed.errors.map(e => e.line).join(', ')}`);
      return;
    }

    // Validate deck size
    const validation = validateDeckSize(parsed, deckFormat);
    if (!validation.valid) {
      setError(validation.errors.join('. '));
      return;
    }

    // Get unique card names to resolve
    const uniqueNames = getUniqueCardNames(parsed);

    if (uniqueNames.length === 0) {
      setError('No cards found in decklist');
      return;
    }

    setState('loading');

    try {
      // Resolve cards via API
      const result = await resolveCards(uniqueNames);

      // Build lookup map (by both full name and searched-as name for adventures/split/MDFC)
      const cardMap = new Map<string, ResolvedCard>();
      for (const card of result.found) {
        cardMap.set(card.name.toLowerCase(), card);
        // Also map by the original search term if different (e.g., "Marang River Regent" -> full card)
        if (card.searchedAs) {
          cardMap.set(card.searchedAs.toLowerCase(), card);
        }
      }

      setResolvedCards(cardMap);
      setNotFoundCards(result.notFound);
      setState('preview');

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resolve cards');
      setState('input');
    }
  }, [deckText, deckFormat]);

  const handleConfirm = useCallback(async () => {
    if (!parsedDeck || !onDeckResolved) return;

    const mainDeck: Array<{ card: ResolvedCard; count: number }> = [];
    const sideboard: Array<{ card: ResolvedCard; count: number }> = [];

    for (const entry of parsedDeck.mainDeck) {
      const card = resolvedCards.get(entry.name.toLowerCase());
      if (card) {
        mainDeck.push({ card, count: entry.count });
      }
    }

    for (const entry of parsedDeck.sideboard) {
      const card = resolvedCards.get(entry.name.toLowerCase());
      if (card) {
        sideboard.push({ card, count: entry.count });
      }
    }

    // Preload all card images before confirming
    setState('preloading');
    const allCards = [...mainDeck, ...sideboard].map((e) => e.card);

    await preloadDeckImages(allCards, (loaded, total) => {
      setPreloadProgress({ loaded, total });
    });

    onDeckResolved({ mainDeck, sideboard });
  }, [parsedDeck, resolvedCards, onDeckResolved]);

  const handleReset = useCallback(() => {
    setState('input');
    setParsedDeck(null);
    setResolvedCards(new Map());
    setNotFoundCards([]);
    setError(null);
  }, []);

  // Input state - show textarea
  if (state === 'input') {
    return (
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Deck Format
          </label>
          <div className="flex gap-1 p-1 bg-surface rounded-lg w-fit">
            <button
              onClick={() => setDeckFormat('constructed')}
              className={`px-3 py-1.5 text-sm font-medium rounded transition-colors ${
                deckFormat === 'constructed'
                  ? 'bg-accent text-surface'
                  : 'bg-transparent text-gray-400 hover:text-gray-200'
              }`}
            >
              Constructed (60+)
            </button>
            <button
              onClick={() => setDeckFormat('limited')}
              className={`px-3 py-1.5 text-sm font-medium rounded transition-colors ${
                deckFormat === 'limited'
                  ? 'bg-accent text-surface'
                  : 'bg-transparent text-gray-400 hover:text-gray-200'
              }`}
            >
              Limited (40+)
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Paste your decklist
          </label>
          <textarea
            value={deckText}
            onChange={(e) => setDeckText(e.target.value)}
            placeholder={`4 Lightning Bolt
4 Goblin Guide
4 Monastery Swiftspear
...

Sideboard
3 Smash to Smithereens
2 Roiling Vortex`}
            className="w-full h-64 bg-surface border border-gray-700 rounded-lg p-3 text-gray-100 font-mono text-sm resize-none focus:outline-none focus:border-accent"
          />
        </div>

        {error && (
          <div className="p-3 bg-red-900/30 border border-red-700 rounded-lg text-red-300 text-sm">
            {error}
          </div>
        )}

        <button
          onClick={handleImport}
          disabled={!deckText.trim()}
          className="w-full py-2 px-4 bg-accent text-surface font-medium rounded-lg hover:bg-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Import Deck
        </button>
      </div>
    );
  }

  // Loading state
  if (state === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-400">Resolving cards...</p>
      </div>
    );
  }

  // Preloading state
  if (state === 'preloading') {
    const percent = preloadProgress.total > 0
      ? Math.round((preloadProgress.loaded / preloadProgress.total) * 100)
      : 0;

    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-400">Preloading card images...</p>
        <div className="w-48 h-2 bg-surface rounded-full overflow-hidden">
          <div
            className="h-full bg-accent transition-all duration-200"
            style={{ width: `${percent}%` }}
          />
        </div>
        <p className="text-gray-500 text-sm">
          {preloadProgress.loaded} / {preloadProgress.total} images
        </p>
      </div>
    );
  }

  // Preview state - show resolved cards
  if (state === 'preview' && parsedDeck) {
    const mainDeckCount = parsedDeck.mainDeck.reduce((sum, e) => sum + e.count, 0);
    const sideboardCount = parsedDeck.sideboard.reduce((sum, e) => sum + e.count, 0);

    return (
      <div className="space-y-4">
        {/* Stats */}
        <div className="flex gap-4 text-sm">
          <span className="text-gray-400">
            Main Deck: <span className="text-gray-200">{mainDeckCount} cards</span>
          </span>
          <span className="text-gray-400">
            Sideboard: <span className="text-gray-200">{sideboardCount} cards</span>
          </span>
          <span className="text-gray-400">
            Resolved: <span className="text-green-400">{resolvedCards.size}</span>
          </span>
          {notFoundCards.length > 0 && (
            <span className="text-gray-400">
              Not found: <span className="text-red-400">{notFoundCards.length}</span>
            </span>
          )}
        </div>

        {/* Not found warnings */}
        {notFoundCards.length > 0 && (
          <div className="p-3 bg-yellow-900/30 border border-yellow-700 rounded-lg">
            <p className="text-yellow-300 text-sm font-medium mb-1">Cards not found:</p>
            <ul className="text-yellow-200 text-sm list-disc list-inside">
              {notFoundCards.map((name, i) => (
                <li key={i}>{name}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Card preview grid */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-gray-300">Main Deck</h3>
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
            {parsedDeck.mainDeck.map((entry, i) => {
              const card = resolvedCards.get(entry.name.toLowerCase());
              return (
                <CardPreview
                  key={i}
                  name={entry.name}
                  count={entry.count}
                  card={card}
                />
              );
            })}
          </div>

          {parsedDeck.sideboard.length > 0 && (
            <>
              <h3 className="text-sm font-medium text-gray-300 mt-6">Sideboard</h3>
              <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
                {parsedDeck.sideboard.map((entry, i) => {
                  const card = resolvedCards.get(entry.name.toLowerCase());
                  return (
                    <CardPreview
                      key={i}
                      name={entry.name}
                      count={entry.count}
                      card={card}
                    />
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-4">
          <button
            onClick={handleReset}
            className="flex-1 py-2 px-4 bg-gray-700 text-gray-200 font-medium rounded-lg hover:bg-gray-600 transition-colors"
          >
            Edit Deck
          </button>
          <button
            onClick={handleConfirm}
            disabled={notFoundCards.length > 0}
            className="flex-1 py-2 px-4 bg-accent text-surface font-medium rounded-lg hover:bg-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Confirm Deck
          </button>
        </div>
      </div>
    );
  }

  return null;
}

// Card preview component
function CardPreview({
  name,
  count,
  card,
}: {
  name: string;
  count: number;
  card?: ResolvedCard;
}) {
  const [imageError, setImageError] = useState(false);

  return (
    <div className="relative group">
      <div className="aspect-[5/7] bg-surface-lighter rounded overflow-hidden">
        {card && !imageError ? (
          <img
            src={card.imageUri}
            alt={card.name}
            className="w-full h-full object-cover"
            onError={() => setImageError(true)}
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center p-1">
            <span className="text-xs text-gray-500 text-center break-words">
              {name}
            </span>
          </div>
        )}
      </div>

      {/* Count badge */}
      {count > 1 && (
        <div className="absolute -top-1 -right-1 w-5 h-5 bg-accent text-surface text-xs font-bold rounded-full flex items-center justify-center">
          {count}
        </div>
      )}

      {/* Hover tooltip */}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-gray-100 text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
        {count}x {card?.name || name}
      </div>
    </div>
  );
}
