/**
 * Deck parser for standard MTG decklist formats
 *
 * Supported formats:
 * - "4 Lightning Bolt"
 * - "4x Lightning Bolt"
 * - "Lightning Bolt" (assumes 1)
 * - "4 Lightning Bolt (M10)" (ignores set)
 * - "4 Lightning Bolt #123" (ignores collector number)
 *
 * Sideboard is separated by:
 * - Empty line followed by "Sideboard" or "SB:"
 * - Or just "Sideboard:" / "SB:" on its own line
 */

export interface ParsedDeckEntry {
  count: number;
  name: string;
  line: number; // Original line number for error reporting
}

export interface ParsedDeck {
  mainDeck: ParsedDeckEntry[];
  sideboard: ParsedDeckEntry[];
  errors: Array<{ line: number; message: string }>;
}

// Regex patterns
const CARD_LINE_PATTERN = /^(\d+)?x?\s*(.+?)(?:\s*\([^)]+\))?(?:\s*#\d+)?$/i;
const SIDEBOARD_MARKER_PATTERN = /^(?:sideboard|sb):?\s*$/i;
const COMPANION_MARKER_PATTERN = /^companion:?\s*$/i;
const COMMANDER_MARKER_PATTERN = /^commander:?\s*$/i;

// Clean card name (remove extra whitespace, normalize)
function cleanCardName(name: string): string {
  return name.trim().replace(/\s+/g, ' ');
}

// Parse a single line
function parseLine(line: string, lineNumber: number): ParsedDeckEntry | null {
  const trimmed = line.trim();

  // Skip empty lines, comments, and section markers
  if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('#')) {
    return null;
  }

  // Skip section markers
  if (SIDEBOARD_MARKER_PATTERN.test(trimmed) ||
      COMPANION_MARKER_PATTERN.test(trimmed) ||
      COMMANDER_MARKER_PATTERN.test(trimmed)) {
    return null;
  }

  const match = trimmed.match(CARD_LINE_PATTERN);
  if (!match) {
    return null;
  }

  const countStr = match[1];
  const name = cleanCardName(match[2]);

  if (!name) {
    return null;
  }

  // Default to 1 if no count specified
  const count = countStr ? parseInt(countStr, 10) : 1;

  if (isNaN(count) || count < 1 || count > 99) {
    return null;
  }

  return { count, name, line: lineNumber };
}

/**
 * Parse a decklist string into main deck and sideboard
 */
export function parseDeck(input: string): ParsedDeck {
  const lines = input.split(/\r?\n/);
  const mainDeck: ParsedDeckEntry[] = [];
  const sideboard: ParsedDeckEntry[] = [];
  const errors: Array<{ line: number; message: string }> = [];

  let inSideboard = false;
  let emptyLineIndex = -1; // Track where we saw an empty line

  for (let i = 0; i < lines.length; i++) {
    const lineNumber = i + 1;
    const line = lines[i];
    const trimmed = line.trim();

    // Check for sideboard marker
    if (SIDEBOARD_MARKER_PATTERN.test(trimmed)) {
      inSideboard = true;
      continue;
    }

    // Track empty lines - they might indicate sideboard start
    if (!trimmed) {
      // Only mark as potential sideboard break if we've already parsed some main deck cards
      if (mainDeck.length > 0 && emptyLineIndex === -1) {
        emptyLineIndex = i;
      }
      continue;
    }

    // If we see "Sideboard" text after empty line
    if (emptyLineIndex !== -1 && trimmed.toLowerCase().startsWith('sideboard')) {
      inSideboard = true;
      continue;
    }

    // Parse the line
    const entry = parseLine(line, lineNumber);

    if (entry) {
      // If we saw an empty line and this is a valid card, switch to sideboard
      // (common format: main deck, blank line, sideboard cards without header)
      // Note: Check total card COUNT, not entry count (a 60-card deck may have only 20 entries)
      const totalMainCards = mainDeck.reduce((sum, e) => sum + e.count, 0);
      if (emptyLineIndex !== -1 && !inSideboard && totalMainCards >= 40) {
        inSideboard = true;
      }

      if (inSideboard) {
        sideboard.push(entry);
      } else {
        mainDeck.push(entry);
      }
    } else if (trimmed && !trimmed.startsWith('//')) {
      // Only report error for non-empty, non-comment lines that failed to parse
      errors.push({ line: lineNumber, message: `Could not parse: "${trimmed}"` });
    }
  }

  return { mainDeck, sideboard, errors };
}

/**
 * Get unique card names from a parsed deck
 */
export function getUniqueCardNames(deck: ParsedDeck): string[] {
  const names = new Set<string>();

  for (const entry of deck.mainDeck) {
    names.add(entry.name);
  }

  for (const entry of deck.sideboard) {
    names.add(entry.name);
  }

  return Array.from(names);
}

export type DeckFormat = 'constructed' | 'limited';

/**
 * Validate deck has correct card counts
 */
export function validateDeckSize(deck: ParsedDeck, format: DeckFormat = 'constructed'): {
  valid: boolean;
  mainDeckCount: number;
  sideboardCount: number;
  errors: string[];
} {
  const mainDeckCount = deck.mainDeck.reduce((sum, e) => sum + e.count, 0);
  const sideboardCount = deck.sideboard.reduce((sum, e) => sum + e.count, 0);
  const errors: string[] = [];

  const minMainDeck = format === 'limited' ? 40 : 60;

  if (mainDeckCount < minMainDeck) {
    errors.push(`Main deck has ${mainDeckCount} cards (minimum ${minMainDeck})`);
  }

  if (sideboardCount > 15) {
    errors.push(`Sideboard has ${sideboardCount} cards (maximum 15)`);
  }

  return {
    valid: errors.length === 0,
    mainDeckCount,
    sideboardCount,
    errors,
  };
}

/**
 * Format a deck back to text (useful for display)
 */
export function formatDeck(deck: ParsedDeck): string {
  const lines: string[] = [];

  for (const entry of deck.mainDeck) {
    lines.push(`${entry.count} ${entry.name}`);
  }

  if (deck.sideboard.length > 0) {
    lines.push('');
    lines.push('Sideboard');
    for (const entry of deck.sideboard) {
      lines.push(`${entry.count} ${entry.name}`);
    }
  }

  return lines.join('\n');
}
