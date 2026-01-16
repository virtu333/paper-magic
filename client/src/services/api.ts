/**
 * API service for communicating with the Paper Magic server
 */

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

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

export interface CardResolveResult {
  found: ResolvedCard[];
  notFound: string[];
}

/**
 * Resolve a list of card names to card data
 */
export async function resolveCards(cardNames: string[]): Promise<CardResolveResult> {
  const response = await fetch(`${API_BASE}/api/cards/resolve`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ cards: cardNames }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

/**
 * Search for a single card by exact name
 */
export async function searchCard(name: string): Promise<ResolvedCard | null> {
  const response = await fetch(
    `${API_BASE}/api/cards/search?name=${encodeURIComponent(name)}`
  );

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  const data = await response.json();
  return data.card;
}

/**
 * Autocomplete card names
 */
export async function autocompleteCards(query: string): Promise<string[]> {
  if (query.length < 2) {
    return [];
  }

  const response = await fetch(
    `${API_BASE}/api/cards/autocomplete?q=${encodeURIComponent(query)}`
  );

  if (!response.ok) {
    return [];
  }

  const data = await response.json();
  return data.suggestions || [];
}

/**
 * Check server health
 */
export async function checkHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE}/health`);
    return response.ok;
  } catch {
    return false;
  }
}
