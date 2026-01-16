/**
 * Game state store using Zustand
 * Manages game state, WebSocket connection, and game actions
 */

import { create } from 'zustand';
import type {
  GameState,
  GameAction,
  ClientMessage,
  ServerMessage,
  GameCreatedPayload,
  GameJoinedPayload,
  PlayerJoinedPayload,
  StateUpdatePayload,
  ErrorPayload,
  CardsRevealedPayload,
} from '@paper-magic/shared';
import type { ResolvedCard } from '../services/api';

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'reconnecting';
type GameStatus = 'idle' | 'creating' | 'joining' | 'in_lobby' | 'in_game';

// Session storage keys for reconnection
const STORAGE_KEYS = {
  GAME_ID: 'papermagic_gameId',
  PLAYER_ID: 'papermagic_playerId',
  WS_URL: 'papermagic_wsUrl',
};

// Pending request tracking for responses
const pendingRequests = new Map<string, {
  resolve: (response: ServerMessage) => void;
  reject: (error: Error) => void;
}>();

interface GameStore {
  // Connection state
  connectionStatus: ConnectionStatus;
  ws: WebSocket | null;
  wsUrl: string | null;
  reconnectAttempts: number;

  // Game state
  gameStatus: GameStatus;
  gameId: string | null;
  playerId: string | null;
  playerIndex: 0 | 1 | null;
  gameState: GameState | null;
  error: string | null;

  // Revealed cards (from opponent)
  revealedCards: CardsRevealedPayload | null;

  // Actions
  connect: (url: string) => void;
  disconnect: () => void;
  createGame: (playerName: string, password: string) => void;
  joinGame: (gameId: string, playerName: string, password: string) => void;
  reconnect: () => void;
  submitDeck: (deck: {
    mainDeck: Array<{ card: ResolvedCard; count: number }>;
    sideboard: Array<{ card: ResolvedCard; count: number }>;
  }) => void;
  sendAction: (action: GameAction) => void;
  sendActionWithResponse: (action: GameAction) => Promise<ServerMessage | null>;
  startGame: () => void;
  leaveGame: () => void;
  clearError: () => void;
  dismissRevealedCards: () => void;
}

// Generate unique request IDs
function generateRequestId(): string {
  return crypto.randomUUID();
}

export const useGameStore = create<GameStore>((set, get) => ({
  // Initial state
  connectionStatus: 'disconnected',
  ws: null,
  wsUrl: null,
  reconnectAttempts: 0,
  gameStatus: 'idle',
  gameId: sessionStorage.getItem(STORAGE_KEYS.GAME_ID),
  playerId: sessionStorage.getItem(STORAGE_KEYS.PLAYER_ID),
  playerIndex: null,
  gameState: null,
  error: null,
  revealedCards: null,

  connect: (url: string) => {
    const { ws } = get();
    if (ws?.readyState === WebSocket.OPEN) return;

    set({ connectionStatus: 'connecting', wsUrl: url });
    sessionStorage.setItem(STORAGE_KEYS.WS_URL, url);

    const socket = new WebSocket(url);

    socket.onopen = () => {
      console.log('[GameStore] Connected');
      set({ connectionStatus: 'connected', ws: socket, reconnectAttempts: 0 });

      // Try to reconnect to existing game if we have stored credentials
      const storedGameId = sessionStorage.getItem(STORAGE_KEYS.GAME_ID);
      const storedPlayerId = sessionStorage.getItem(STORAGE_KEYS.PLAYER_ID);
      if (storedGameId && storedPlayerId) {
        console.log('[GameStore] Attempting reconnect to game', storedGameId);
        get().reconnect();
      }
    };

    socket.onmessage = (event) => {
      try {
        const message: ServerMessage = JSON.parse(event.data);
        console.log('[GameStore] Received:', message.type);

        // Check if this is a response to a pending request
        if (message.requestId && pendingRequests.has(message.requestId)) {
          const pending = pendingRequests.get(message.requestId)!;
          pendingRequests.delete(message.requestId);
          pending.resolve(message);
        }

        switch (message.type) {
          case 'GAME_CREATED': {
            const payload = message.payload as GameCreatedPayload;
            // Store game ID for reconnection (playerId will be in STATE_UPDATE)
            sessionStorage.setItem(STORAGE_KEYS.GAME_ID, payload.gameId);
            set({
              gameStatus: 'in_lobby',
              gameId: payload.gameId,
              playerIndex: payload.playerIndex,
              error: null,
            });
            break;
          }

          case 'GAME_JOINED': {
            const payload = message.payload as GameJoinedPayload;
            // Store credentials for reconnection
            sessionStorage.setItem(STORAGE_KEYS.GAME_ID, payload.gameId);
            const myPlayer = payload.gameState.players[payload.playerIndex];
            if (myPlayer) {
              sessionStorage.setItem(STORAGE_KEYS.PLAYER_ID, myPlayer.id);
              set({ playerId: myPlayer.id });
            }
            set({
              gameStatus: 'in_lobby',
              gameId: payload.gameId,
              playerIndex: payload.playerIndex,
              gameState: payload.gameState,
              error: null,
            });
            break;
          }

          case 'RECONNECTED': {
            const payload = message.payload as GameJoinedPayload;
            console.log('[GameStore] Reconnected to game', payload.gameId);
            set({
              gameStatus: payload.gameState.phase === 'lobby' ? 'in_lobby' : 'in_game',
              gameId: payload.gameId,
              playerIndex: payload.playerIndex,
              gameState: payload.gameState,
              error: null,
            });
            break;
          }

          case 'PLAYER_RECONNECTED': {
            const payload = message.payload as { playerIndex: number };
            console.log(`[GameStore] Player ${payload.playerIndex + 1} reconnected`);
            break;
          }

          case 'PLAYER_JOINED': {
            const payload = message.payload as PlayerJoinedPayload;
            console.log(`Player ${payload.playerIndex + 1} (${payload.playerName}) joined`);
            // State update will follow
            break;
          }

          case 'PLAYER_LEFT': {
            console.log('Opponent left the game');
            // State update will follow
            break;
          }

          case 'STATE_UPDATE': {
            const payload = message.payload as StateUpdatePayload;
            const { playerIndex, playerId: currentPlayerId } = get();
            // Store playerId if we don't have it yet (for game creator)
            if (playerIndex !== null && !currentPlayerId) {
              const myPlayer = payload.gameState.players[playerIndex];
              if (myPlayer) {
                sessionStorage.setItem(STORAGE_KEYS.PLAYER_ID, myPlayer.id);
                set({ playerId: myPlayer.id });
              }
            }
            set({ gameState: payload.gameState });
            break;
          }

          case 'DECK_SUBMITTED': {
            console.log('Deck submitted successfully');
            break;
          }

          case 'ERROR': {
            const payload = message.payload as ErrorPayload;
            console.error('[GameStore] Error:', payload.message);
            set({
              error: payload.message,
              gameStatus: get().gameId ? get().gameStatus : 'idle',
            });
            break;
          }

          case 'CARDS_REVEALED': {
            const payload = message.payload as CardsRevealedPayload;
            console.log(`[GameStore] ${payload.revealerName} revealed ${payload.cards.length} cards from ${payload.source}`);
            set({ revealedCards: payload });
            break;
          }

          case 'ACK':
          case 'PONG':
            // Acknowledgments, no state change needed
            break;
        }
      } catch (error) {
        console.error('[GameStore] Failed to parse message:', error);
      }
    };

    socket.onclose = () => {
      console.log('[GameStore] Disconnected');
      const { wsUrl, reconnectAttempts, gameId, playerId } = get();

      set({
        connectionStatus: 'disconnected',
        ws: null,
      });

      // Auto-reconnect if we were in a game
      if (wsUrl && gameId && playerId && reconnectAttempts < 5) {
        const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000); // Exponential backoff, max 30s
        console.log(`[GameStore] Reconnecting in ${delay}ms (attempt ${reconnectAttempts + 1})`);
        set({ connectionStatus: 'reconnecting', reconnectAttempts: reconnectAttempts + 1 });

        setTimeout(() => {
          const state = get();
          if (state.connectionStatus === 'reconnecting') {
            get().connect(wsUrl);
          }
        }, delay);
      }
    };

    socket.onerror = (error) => {
      console.error('[GameStore] WebSocket error:', error);
    };

    set({ ws: socket });
  },

  disconnect: () => {
    const { ws } = get();
    ws?.close();
    set({
      connectionStatus: 'disconnected',
      ws: null,
      gameStatus: 'idle',
      gameId: null,
      playerIndex: null,
      gameState: null,
    });
  },

  createGame: (playerName: string, password: string) => {
    const { ws, connectionStatus } = get();
    if (connectionStatus !== 'connected' || !ws) {
      set({ error: 'Not connected to server' });
      return;
    }

    set({ gameStatus: 'creating', error: null });

    const message: ClientMessage = {
      type: 'CREATE_GAME',
      payload: { playerName, password },
      requestId: generateRequestId(),
    };

    ws.send(JSON.stringify(message));
  },

  joinGame: (gameId: string, playerName: string, password: string) => {
    const { ws, connectionStatus } = get();
    if (connectionStatus !== 'connected' || !ws) {
      set({ error: 'Not connected to server' });
      return;
    }

    set({ gameStatus: 'joining', error: null });

    const message: ClientMessage = {
      type: 'JOIN_GAME',
      payload: { gameId, playerName, password },
      requestId: generateRequestId(),
    };

    ws.send(JSON.stringify(message));
  },

  reconnect: () => {
    const { ws, connectionStatus, gameId, playerId } = get();
    if (connectionStatus !== 'connected' || !ws) {
      console.log('[GameStore] Cannot reconnect - not connected');
      return;
    }

    if (!gameId || !playerId) {
      console.log('[GameStore] Cannot reconnect - missing credentials');
      return;
    }

    console.log(`[GameStore] Sending reconnect for game ${gameId}`);

    const message: ClientMessage = {
      type: 'RECONNECT',
      payload: { gameId, playerId },
      requestId: generateRequestId(),
    };

    ws.send(JSON.stringify(message));
  },

  submitDeck: (deck) => {
    const { ws, connectionStatus } = get();
    if (connectionStatus !== 'connected' || !ws) {
      set({ error: 'Not connected to server' });
      return;
    }

    // Flatten deck with counts into individual cards
    const mainDeck = deck.mainDeck.flatMap(({ card, count }) =>
      Array(count).fill(null).map(() => ({
        scryfallId: card.scryfallId,
        name: card.name,
        imageUri: card.imageUri,
        backImageUri: card.backImageUri,
      }))
    );

    const sideboard = deck.sideboard.flatMap(({ card, count }) =>
      Array(count).fill(null).map(() => ({
        scryfallId: card.scryfallId,
        name: card.name,
        imageUri: card.imageUri,
        backImageUri: card.backImageUri,
      }))
    );

    const message: ClientMessage = {
      type: 'SUBMIT_DECK',
      payload: { mainDeck, sideboard },
      requestId: generateRequestId(),
    };

    ws.send(JSON.stringify(message));
  },

  sendAction: (action: GameAction) => {
    const { ws, connectionStatus } = get();
    if (connectionStatus !== 'connected' || !ws) {
      set({ error: 'Not connected to server' });
      return;
    }

    const message: ClientMessage = {
      type: 'GAME_ACTION',
      payload: action,
      requestId: generateRequestId(),
    };

    ws.send(JSON.stringify(message));
  },

  sendActionWithResponse: (action: GameAction) => {
    const { ws, connectionStatus } = get();
    if (connectionStatus !== 'connected' || !ws) {
      set({ error: 'Not connected to server' });
      return Promise.resolve(null);
    }

    const requestId = generateRequestId();
    const message: ClientMessage = {
      type: 'GAME_ACTION',
      payload: action,
      requestId,
    };

    return new Promise((resolve, reject) => {
      // Set timeout for response
      const timeout = setTimeout(() => {
        pendingRequests.delete(requestId);
        reject(new Error('Request timeout'));
      }, 10000);

      pendingRequests.set(requestId, {
        resolve: (response) => {
          clearTimeout(timeout);
          resolve(response);
        },
        reject: (error) => {
          clearTimeout(timeout);
          reject(error);
        },
      });

      ws.send(JSON.stringify(message));
    });
  },

  startGame: () => {
    const { ws, connectionStatus } = get();
    if (connectionStatus !== 'connected' || !ws) {
      set({ error: 'Not connected to server' });
      return;
    }

    const message: ClientMessage = {
      type: 'START_GAME',
      payload: {},
      requestId: generateRequestId(),
    };

    ws.send(JSON.stringify(message));
  },

  leaveGame: () => {
    const { ws } = get();

    if (ws) {
      const message: ClientMessage = {
        type: 'LEAVE_GAME',
        payload: {},
        requestId: generateRequestId(),
      };
      ws.send(JSON.stringify(message));
    }

    // Clear session storage for reconnection
    sessionStorage.removeItem(STORAGE_KEYS.GAME_ID);
    sessionStorage.removeItem(STORAGE_KEYS.PLAYER_ID);

    set({
      gameStatus: 'idle',
      gameId: null,
      playerId: null,
      playerIndex: null,
      gameState: null,
      error: null,
      reconnectAttempts: 0,
    });
  },

  clearError: () => {
    set({ error: null });
  },

  dismissRevealedCards: () => {
    set({ revealedCards: null });
  },
}));
