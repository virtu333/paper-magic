import type { Player } from './player.js';
import type { Card } from './card.js';

export type GamePhase =
  | 'lobby'        // Waiting for players, submitting decks
  | 'mulligan'     // London mulligan phase
  | 'playing'      // Active game
  | 'sideboarding' // Between games in a match
  | 'finished';    // Match complete

export type Zone =
  | 'deck'
  | 'hand'
  | 'battlefield'
  | 'graveyard'
  | 'exileActive'
  | 'exilePermanent'
  | 'sideboard'
  | 'stack';

export type GameResult = 'player1' | 'player2' | 'draw';

export interface TurnState {
  number: number;       // Turn number
  activePlayer: 0 | 1;
  phase: string;        // Just a label for communication, no rules enforcement
}

export interface ActionLogEntry {
  id: string;
  timestamp: number;
  playerIndex: 0 | 1;
  playerName: string;
  message: string;
  type: string;
}

export interface GameState {
  id: string;
  passwordHash: string;  // Hashed password for joining

  // Players (null = slot not filled)
  players: [Player | null, Player | null];

  // Shared stack zone (spells/abilities waiting to resolve)
  stack: Card[];

  // Game flow
  phase: GamePhase;
  currentGame: number;           // 1, 2, or 3 in a best-of-3 match
  gameResults: GameResult[];     // Results of completed games
  turn: TurnState;

  // Timestamps
  createdAt: number;
  lastAction: number;

  // Action history for undo/redo
  actionHistory: string[];       // Serialized actions
  actionIndex: number;           // Current position in history

  // Action log for transparency
  actionLog: ActionLogEntry[];
}

// Create initial game state
export function createGameState(id: string, passwordHash: string): GameState {
  return {
    id,
    passwordHash,
    players: [null, null],
    stack: [],
    phase: 'lobby',
    currentGame: 1,
    gameResults: [],
    turn: {
      number: 0,
      activePlayer: 0,
      phase: 'Pre-game',
    },
    createdAt: Date.now(),
    lastAction: Date.now(),
    actionHistory: [],
    actionIndex: -1,
    actionLog: [],
  };
}

// Get player by index safely
export function getPlayer(state: GameState, index: 0 | 1): Player | null {
  return state.players[index];
}

// Check if game is full (both players joined)
export function isGameFull(state: GameState): boolean {
  return state.players[0] !== null && state.players[1] !== null;
}

// Check if both players have kept their hands
export function bothPlayersReady(state: GameState): boolean {
  const p1 = state.players[0];
  const p2 = state.players[1];
  return p1 !== null && p2 !== null && p1.hasKeptHand && p2.hasKeptHand;
}
