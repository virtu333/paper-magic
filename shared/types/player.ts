import type { Card } from './card';

export interface LifeEntry {
  delta: number;      // Change amount (+3, -2, etc.)
  total: number;      // Running total after this change
  note?: string;      // Optional note (e.g., "Sheoldred trigger")
  timestamp: number;  // Unix timestamp
}

export interface PlayerCounters {
  poison: number;
  energy: number;
  experience: number;
  [key: string]: number; // Custom player counters
}

export interface Player {
  id: string;
  name: string;

  // Card zones
  deck: Card[];
  hand: Card[];
  battlefield: Card[];
  graveyard: Card[];
  exileActive: Card[];      // Adventures, impulse draw, foretell - can return
  exilePermanent: Card[];   // Gone forever (Swords, Path, etc.)
  sideboard: Card[];

  // Life and counters
  life: LifeEntry[];
  counters: PlayerCounters;

  // Mulligan state
  mulliganCount: number;
  hasKeptHand: boolean;

  // Sideboard state
  readyForNextGame: boolean;
}

// Get current life total
export function getCurrentLife(player: Player): number {
  if (player.life.length === 0) return 20;
  return player.life[player.life.length - 1].total;
}

// Create initial player state
export function createPlayer(id: string, name: string): Player {
  return {
    id,
    name,
    deck: [],
    hand: [],
    battlefield: [],
    graveyard: [],
    exileActive: [],
    exilePermanent: [],
    sideboard: [],
    life: [{ delta: 0, total: 20, timestamp: Date.now() }],
    counters: {
      poison: 0,
      energy: 0,
      experience: 0,
    },
    mulliganCount: 0,
    hasKeptHand: false,
    readyForNextGame: false,
  };
}
