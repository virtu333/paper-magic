// Card types
export type {
  Counter,
  CounterType,
  CardPosition,
  Card,
  Token,
} from './card.js';

export {
  isToken,
  createCard,
} from './card.js';

// Player types
export type {
  LifeEntry,
  PlayerCounters,
  Player,
} from './player.js';

export {
  getCurrentLife,
  createPlayer,
} from './player.js';

// Game types
export type {
  GamePhase,
  Zone,
  GameResult,
  TurnState,
  ActionLogEntry,
  GameState,
} from './game.js';

export {
  createGameState,
  getPlayer,
  isGameFull,
  bothPlayersReady,
} from './game.js';

// Action types
export type {
  GameAction,
  ActionPayload,
} from './actions.js';

// Protocol types
export type {
  ClientMessageType,
  ServerMessageType,
  ClientMessage,
  ServerMessage,
  CreateGamePayload,
  JoinGamePayload,
  SubmitDeckPayload,
  LoadGamePayload,
  GameCreatedPayload,
  GameJoinedPayload,
  PlayerJoinedPayload,
  StateUpdatePayload,
  ErrorPayload,
  GameSavedPayload,
  CardsRevealedPayload,
} from './protocol.js';

export { ErrorCodes } from './protocol.js';
