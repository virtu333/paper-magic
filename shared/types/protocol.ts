import type { GameState } from './game';
import type { GameAction } from './actions';

// Client -> Server message types
export type ClientMessageType =
  | 'CREATE_GAME'
  | 'JOIN_GAME'
  | 'LEAVE_GAME'
  | 'RECONNECT'
  | 'SUBMIT_DECK'
  | 'START_GAME'
  | 'GAME_ACTION'
  | 'ACTION'
  | 'SAVE_GAME'
  | 'LOAD_GAME'
  | 'PING';

// Server -> Client message types
export type ServerMessageType =
  | 'GAME_CREATED'
  | 'GAME_JOINED'
  | 'GAME_STARTED'
  | 'PLAYER_JOINED'
  | 'PLAYER_LEFT'
  | 'PLAYER_RECONNECTED'
  | 'RECONNECTED'
  | 'STATE_UPDATE'
  | 'CARDS_REVEALED'  // Opponent revealed cards to you
  | 'ERROR'
  | 'DECK_SUBMITTED'
  | 'GAME_SAVED'
  | 'GAME_LOADED'
  | 'ACK'
  | 'PONG';

// Client -> Server messages
export interface ClientMessage {
  type: ClientMessageType;
  payload: unknown;
  requestId: string;  // For tracking acknowledgments
}

export interface CreateGamePayload {
  playerName: string;
  password: string;
}

export interface JoinGamePayload {
  gameId: string;
  playerName: string;
  password: string;
}

export interface SubmitDeckPayload {
  mainDeck: string[];    // Card names
  sideboard: string[];   // Card names
}

export interface ActionPayload {
  action: GameAction;
}

export interface LoadGamePayload {
  saveCode: string;
}

export interface ReconnectPayload {
  gameId: string;
  playerId: string;
}

// Server -> Client messages
export interface ServerMessage {
  type: ServerMessageType;
  payload: unknown;
  requestId?: string;  // Echo back for client to match responses
}

export interface GameCreatedPayload {
  gameId: string;
  playerIndex: 0 | 1;
}

export interface GameJoinedPayload {
  gameId: string;
  playerIndex: 0 | 1;
  gameState: GameState;
}

export interface PlayerJoinedPayload {
  playerIndex: 0 | 1;
  playerName: string;
}

export interface StateUpdatePayload {
  gameState: GameState;
}

export interface ErrorPayload {
  code: string;
  message: string;
}

export interface GameSavedPayload {
  saveCode: string;
}

export interface CardsRevealedPayload {
  revealerName: string;  // Who revealed the cards
  source: string;        // Description (e.g., "Hand", "Top 3 of Library")
  cards: Array<{
    instanceId: string;
    name: string;
    imageUri: string;
    backImageUri?: string;
  }>;
}

// Error codes
export const ErrorCodes = {
  GAME_NOT_FOUND: 'GAME_NOT_FOUND',
  GAME_FULL: 'GAME_FULL',
  INVALID_PASSWORD: 'INVALID_PASSWORD',
  INVALID_ACTION: 'INVALID_ACTION',
  NOT_YOUR_TURN: 'NOT_YOUR_TURN',
  INVALID_DECK: 'INVALID_DECK',
  SAVE_FAILED: 'SAVE_FAILED',
  LOAD_FAILED: 'LOAD_FAILED',
} as const;
