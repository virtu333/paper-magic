/**
 * Scryfall API proxy with caching
 * Rate limit: 10 requests/second - we batch lookups and cache results
 */

export interface ScryfallCard {
  id: string;
  name: string;
  layout: string;
  image_uris?: {
    small: string;
    normal: string;
    large: string;
    png: string;
    art_crop: string;
    border_crop: string;
  };
  card_faces?: Array<{
    name: string;
    mana_cost?: string;
    type_line?: string;
    oracle_text?: string;
    image_uris?: {
      small: string;
      normal: string;
      large: string;
      png: string;
      art_crop: string;
      border_crop: string;
    };
  }>;
  mana_cost?: string;
  type_line: string;
  oracle_text?: string;
  power?: string;
  toughness?: string;
  colors?: string[];
  color_identity: string[];
  set: string;
  set_name: string;
  collector_number: string;
  rarity: string;
}

export interface ResolvedCard {
  scryfallId: string;
  name: string;
  searchedAs?: string;  // Original search term if different from name (for adventures/split/MDFC)
  imageUri: string;
  backImageUri?: string;
  layout: string;
  typeLine: string;
  oracleText?: string;
  manaCost?: string;
  power?: string;
  toughness?: string;
  set: string;
  setName: string;
}

export interface CardLookupResult {
  found: ResolvedCard[];
  notFound: string[];
}

// In-memory cache for card data
const cardCache = new Map<string, ScryfallCard>();

// Normalize card name for cache lookup
function normalizeCardName(name: string): string {
  return name.toLowerCase().trim();
}

// Get image URI handling DFCs and other layouts
function getImageUri(card: ScryfallCard, face: 'front' | 'back' = 'front'): string {
  // Standard cards with image_uris at top level
  if (card.image_uris) {
    return card.image_uris.normal;
  }

  // DFCs, split cards, etc. with card_faces
  if (card.card_faces && card.card_faces.length > 0) {
    const faceIndex = face === 'front' ? 0 : 1;
    const cardFace = card.card_faces[faceIndex] || card.card_faces[0];
    return cardFace.image_uris?.normal || '';
  }

  return '';
}

// Convert Scryfall card to our resolved format
function toResolvedCard(card: ScryfallCard, searchedAs?: string): ResolvedCard {
  const resolved: ResolvedCard = {
    scryfallId: card.id,
    name: card.name,
    imageUri: getImageUri(card, 'front'),
    layout: card.layout,
    typeLine: card.type_line,
    oracleText: card.oracle_text,
    manaCost: card.mana_cost,
    power: card.power,
    toughness: card.toughness,
    set: card.set,
    setName: card.set_name,
  };

  // Add searchedAs if different from the resolved name
  if (searchedAs && normalizeCardName(searchedAs) !== normalizeCardName(card.name)) {
    resolved.searchedAs = searchedAs;
  }

  // Add back face for DFCs
  if (card.card_faces && card.card_faces.length > 1) {
    const backImage = getImageUri(card, 'back');
    if (backImage) {
      resolved.backImageUri = backImage;
    }
  }

  return resolved;
}

// Check cache for a card
function getCached(name: string): ScryfallCard | undefined {
  return cardCache.get(normalizeCardName(name));
}

// Add card to cache
function cacheCard(card: ScryfallCard): void {
  cardCache.set(normalizeCardName(card.name), card);

  // Also cache by individual face names for split/DFC cards
  if (card.card_faces) {
    for (const face of card.card_faces) {
      if (face.name && face.name !== card.name) {
        cardCache.set(normalizeCardName(face.name), card);
      }
    }
  }
}

/**
 * Batch lookup cards using Scryfall's collection endpoint
 * Max 75 identifiers per request
 */
export async function lookupCards(cardNames: string[]): Promise<CardLookupResult> {
  const found: ResolvedCard[] = [];
  const notFound: string[] = [];
  const toFetch: string[] = [];

  // Check cache first
  for (const name of cardNames) {
    const cached = getCached(name);
    if (cached) {
      found.push(toResolvedCard(cached));
    } else {
      toFetch.push(name);
    }
  }

  // If nothing to fetch, return early
  if (toFetch.length === 0) {
    return { found, notFound };
  }

  // Deduplicate names to fetch
  const uniqueNames = [...new Set(toFetch.map(normalizeCardName))];

  // Batch into chunks of 75 (Scryfall limit)
  const chunks: string[][] = [];
  for (let i = 0; i < uniqueNames.length; i += 75) {
    chunks.push(uniqueNames.slice(i, i + 75));
  }

  // Fetch each chunk
  for (const chunk of chunks) {
    try {
      const identifiers = chunk.map(name => ({ name }));

      const response = await fetch('https://api.scryfall.com/cards/collection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'PaperMagic/1.0',
        },
        body: JSON.stringify({ identifiers }),
      });

      if (!response.ok) {
        console.error(`[Scryfall] API error: ${response.status}`);
        // Add all as not found
        notFound.push(...chunk);
        continue;
      }

      const data = await response.json() as {
        data: ScryfallCard[];
        not_found?: Array<{ name: string }>;
      };

      // Cache and add found cards
      for (const card of data.data) {
        cacheCard(card);
        found.push(toResolvedCard(card));
      }

      // Track not found
      if (data.not_found) {
        for (const nf of data.not_found) {
          notFound.push(nf.name);
        }
      }

      // Rate limit: wait 100ms between chunks (10 req/sec)
      if (chunks.indexOf(chunk) < chunks.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }

    } catch (error) {
      console.error('[Scryfall] Fetch error:', error);
      notFound.push(...chunk);
    }
  }

  // Try fuzzy search for cards not found (handles adventure/split/MDFC partial names)
  const stillNotFound: string[] = [];

  for (const name of toFetch) {
    const normalized = normalizeCardName(name);
    const wasNotFound = notFound.some(nf => normalizeCardName(nf) === normalized);

    if (wasNotFound) {
      // Check if we already found it via fuzzy match of another name
      const cached = getCached(name);
      if (cached) {
        found.push(toResolvedCard(cached, name));
        continue;
      }

      // Try fuzzy search
      console.log(`[Scryfall] Trying fuzzy search for: ${name}`);
      const card = await fuzzySearchCard(name);

      if (card) {
        console.log(`[Scryfall] Fuzzy match found: ${name} -> ${card.name}`);
        found.push(toResolvedCard(card, name));
      } else {
        stillNotFound.push(name);
      }

      // Rate limit between fuzzy searches
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  return { found, notFound: stillNotFound };
}

/**
 * Search for a single card by exact name
 */
export async function searchCard(name: string): Promise<ResolvedCard | null> {
  const cached = getCached(name);
  if (cached) {
    return toResolvedCard(cached);
  }

  try {
    const response = await fetch(
      `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(name)}`,
      {
        headers: {
          'User-Agent': 'PaperMagic/1.0',
        },
      }
    );

    if (!response.ok) {
      return null;
    }

    const card = await response.json() as ScryfallCard;
    cacheCard(card);
    return toResolvedCard(card);

  } catch (error) {
    console.error('[Scryfall] Search error:', error);
    return null;
  }
}

/**
 * Fuzzy search for a single card
 * Used for adventure/split/MDFC cards where users type just one face name
 */
async function fuzzySearchCard(name: string): Promise<ScryfallCard | null> {
  // Check cache first (including by face name)
  const cached = getCached(name);
  if (cached) {
    return cached;
  }

  try {
    const response = await fetch(
      `https://api.scryfall.com/cards/named?fuzzy=${encodeURIComponent(name)}`,
      {
        headers: {
          'User-Agent': 'PaperMagic/1.0',
        },
      }
    );

    if (!response.ok) {
      return null;
    }

    const card = await response.json() as ScryfallCard;
    cacheCard(card);
    return card;

  } catch (error) {
    console.error('[Scryfall] Fuzzy search error:', error);
    return null;
  }
}

/**
 * Fuzzy search for card name autocomplete
 */
export async function autocomplete(query: string): Promise<string[]> {
  if (query.length < 2) {
    return [];
  }

  try {
    const response = await fetch(
      `https://api.scryfall.com/cards/autocomplete?q=${encodeURIComponent(query)}`,
      {
        headers: {
          'User-Agent': 'PaperMagic/1.0',
        },
      }
    );

    if (!response.ok) {
      return [];
    }

    const data = await response.json() as { data: string[] };
    return data.data;

  } catch (error) {
    console.error('[Scryfall] Autocomplete error:', error);
    return [];
  }
}

// Export cache stats for debugging
export function getCacheStats(): { size: number } {
  return { size: cardCache.size };
}
