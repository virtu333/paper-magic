import type { Zone, GameResult } from './game.js';
import type { Counter, CardPosition, Token } from './card.js';

// All possible game actions
export type GameAction =
  // Card drawing
  | { type: 'DRAW_CARDS'; count: number }
  | { type: 'SCRY'; count: number }
  | { type: 'REVEAL_TOP'; count: number }

  // Reveal to opponent
  | { type: 'REVEAL_HAND' }  // Reveal your hand to opponent
  | { type: 'REVEAL_CARDS_TO_OPPONENT'; instanceIds: string[]; source: string }  // Reveal specific cards to opponent

  // Card movement
  | { type: 'MOVE_CARD'; instanceId: string; from: Zone; to: Zone; toIndex?: number; position?: CardPosition; faceDown?: boolean }
  | { type: 'MOVE_CARD_POSITION'; instanceId: string; position: CardPosition }
  | { type: 'MOVE_TO_STACK'; instanceId: string; from: Zone }
  | { type: 'RESOLVE_STACK_TOP'; to: Zone }

  // Card state changes
  | { type: 'TAP_CARD'; instanceId: string }
  | { type: 'UNTAP_CARD'; instanceId: string }
  | { type: 'UNTAP_ALL' }
  | { type: 'FLIP_CARD'; instanceId: string }
  | { type: 'TRANSFORM_CARD'; instanceId: string }

  // Counters
  | { type: 'ADD_COUNTER'; instanceId: string; counter: Counter }
  | { type: 'REMOVE_COUNTER'; instanceId: string; counterIndex: number }
  | { type: 'SET_COUNTER'; instanceId: string; counterIndex: number; value: number }

  // Attachments (same-player only)
  | { type: 'ATTACH_CARD'; instanceId: string; targetId: string }
  | { type: 'DETACH_CARD'; instanceId: string }

  // Cross-battlefield movement (paper Magic style - free movement)
  | { type: 'MOVE_TO_OPPONENT_BATTLEFIELD'; instanceId: string; from: Zone; position?: CardPosition }
  | { type: 'MOVE_CARD_ON_ANY_BATTLEFIELD'; instanceId: string; position: CardPosition }
  | { type: 'TAKE_FROM_OPPONENT_BATTLEFIELD'; instanceId: string; to: Zone; position?: CardPosition }

  // Layer ordering for stacked cards on battlefield
  | { type: 'BRING_TO_FRONT'; instanceId: string }
  | { type: 'SEND_TO_BACK'; instanceId: string }

  // Peek at opponent's cards (Mishra's Bauble, etc.)
  | { type: 'PEEK_OPPONENT_LIBRARY'; count: number }

  // Life and player counters
  | { type: 'UPDATE_LIFE'; delta: number; note?: string }
  | { type: 'SET_PLAYER_COUNTER'; counterType: string; value: number }

  // Tokens
  | { type: 'CREATE_TOKEN'; token: Omit<Token, 'instanceId'> }
  | { type: 'DESTROY_TOKEN'; instanceId: string }

  // Deck manipulation
  | { type: 'SHUFFLE_DECK' }
  | { type: 'SEARCH_LIBRARY' }
  | { type: 'PUT_ON_TOP'; instanceIds: string[] }      // After scry/search
  | { type: 'PUT_ON_BOTTOM'; instanceIds: string[] }   // After scry/mulligan

  // Mulligan
  | { type: 'MULLIGAN_KEEP' }
  | { type: 'MULLIGAN_AGAIN' }
  | { type: 'BOTTOM_CARDS'; instanceIds: string[] }    // Cards to bottom after keeping

  // Game flow
  | { type: 'CONCEDE' }
  | { type: 'DECLARE_WINNER'; winner: GameResult }
  | { type: 'MOVE_TO_SIDEBOARD_PHASE' }
  | { type: 'READY_FOR_NEXT_GAME' }
  | { type: 'SWAP_SIDEBOARD'; mainDeckIndex: number; sideboardIndex: number }
  | { type: 'SET_TURN_PHASE'; phase: string }
  | { type: 'PASS_TURN' }

  // Undo/Redo
  | { type: 'UNDO' }
  | { type: 'REDO' }

  // Save/Load
  | { type: 'SAVE_GAME' }
  | { type: 'LOAD_GAME'; code: string };

// Action with metadata
export interface ActionPayload {
  action: GameAction;
  playerId: string;
  timestamp: number;
}
