/**
 * Game Room Manager
 * Handles game creation, joining, and state management
 */

import { WebSocket } from 'ws';
import { v4 as uuidv4 } from 'uuid';
import { createHash } from 'crypto';
import type {
  GameState,
  Player,
  ServerMessage,
  GameCreatedPayload,
  GameJoinedPayload,
  PlayerJoinedPayload,
  StateUpdatePayload,
  ErrorPayload,
  CardsRevealedPayload,
  ActionLogEntry,
} from '@paper-magic/shared';
import { createGameState, createPlayer } from '@paper-magic/shared';

// Simple password hashing (not for production security, just basic obfuscation)
function hashPassword(password: string): string {
  return createHash('sha256').update(password).digest('hex');
}

interface ConnectedPlayer {
  ws: WebSocket;
  playerIndex: 0 | 1;
  playerId: string;
}

interface StateSnapshot {
  state: string; // JSON serialized state
  timestamp: number;
}

interface GameRoom {
  state: GameState;
  players: Map<string, ConnectedPlayer>; // playerId -> connection
  // Undo/redo state snapshots (stored server-side to keep wire protocol slim)
  stateHistory: StateSnapshot[];
  historyIndex: number;
}

class GameManager {
  private games = new Map<string, GameRoom>();

  /**
   * Generate a short, readable game ID
   */
  private generateGameId(): string {
    // Generate a 6-character alphanumeric ID
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed ambiguous chars (0,O,1,I)
    let id = '';
    for (let i = 0; i < 6; i++) {
      id += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    // Make sure it's unique
    if (this.games.has(id)) {
      return this.generateGameId();
    }
    return id;
  }

  /**
   * Create a new game room
   */
  createGame(ws: WebSocket, playerName: string, password: string): ServerMessage {
    const gameId = this.generateGameId();
    const playerId = uuidv4();
    const passwordHash = hashPassword(password);

    // Create game state
    const state = createGameState(gameId, passwordHash);

    // Create player and add to game
    const player = createPlayer(playerId, playerName);
    state.players[0] = player;

    // Create room
    const room: GameRoom = {
      state,
      players: new Map(),
      stateHistory: [],
      historyIndex: -1,
    };

    // Add connection
    room.players.set(playerId, {
      ws,
      playerIndex: 0,
      playerId,
    });

    this.games.set(gameId, room);

    console.log(`[GameManager] Game created: ${gameId} by ${playerName}`);

    const payload: GameCreatedPayload = {
      gameId,
      playerIndex: 0,
    };

    return {
      type: 'GAME_CREATED',
      payload,
    };
  }

  /**
   * Join an existing game
   */
  joinGame(
    ws: WebSocket,
    gameId: string,
    playerName: string,
    password: string
  ): ServerMessage {
    const room = this.games.get(gameId.toUpperCase());

    if (!room) {
      const payload: ErrorPayload = {
        code: 'GAME_NOT_FOUND',
        message: `Game ${gameId} not found`,
      };
      return { type: 'ERROR', payload };
    }

    // Verify password
    if (room.state.passwordHash !== hashPassword(password)) {
      const payload: ErrorPayload = {
        code: 'INVALID_PASSWORD',
        message: 'Invalid password',
      };
      return { type: 'ERROR', payload };
    }

    // Check if game is full
    if (room.state.players[0] && room.state.players[1]) {
      const payload: ErrorPayload = {
        code: 'GAME_FULL',
        message: 'Game is full',
      };
      return { type: 'ERROR', payload };
    }

    // Find empty slot
    const playerIndex: 0 | 1 = room.state.players[0] ? 1 : 0;
    const playerId = uuidv4();

    // Create player
    const player = createPlayer(playerId, playerName);
    room.state.players[playerIndex] = player;

    // Add connection
    room.players.set(playerId, {
      ws,
      playerIndex,
      playerId,
    });

    console.log(`[GameManager] ${playerName} joined game ${gameId} as player ${playerIndex + 1}`);

    // Notify other player
    this.broadcastToOthers(room, playerId, {
      type: 'PLAYER_JOINED',
      payload: {
        playerIndex,
        playerName,
      } as PlayerJoinedPayload,
    });

    // Return join confirmation with full state
    const payload: GameJoinedPayload = {
      gameId: room.state.id,
      playerIndex,
      gameState: this.sanitizeStateForPlayer(room.state, playerIndex),
    };

    return { type: 'GAME_JOINED', payload };
  }

  /**
   * Handle player disconnection
   */
  handleDisconnect(ws: WebSocket): void {
    for (const [gameId, room] of this.games) {
      for (const [playerId, conn] of room.players) {
        if (conn.ws === ws) {
          room.players.delete(playerId);
          console.log(`[GameManager] Player disconnected from game ${gameId}`);

          // Notify other players
          this.broadcastToRoom(room, {
            type: 'PLAYER_LEFT',
            payload: { playerIndex: conn.playerIndex },
          });

          // Clean up empty games after a delay
          if (room.players.size === 0) {
            setTimeout(() => {
              if (room.players.size === 0) {
                this.games.delete(gameId);
                console.log(`[GameManager] Game ${gameId} cleaned up (empty)`);
              }
            }, 300000); // 5 minute grace period for reconnection
          }

          return;
        }
      }
    }
  }

  /**
   * Reconnect a player to their game
   */
  reconnect(ws: WebSocket, gameId: string, playerId: string): ServerMessage {
    const room = this.games.get(gameId.toUpperCase());

    if (!room) {
      return {
        type: 'ERROR',
        payload: { code: 'GAME_NOT_FOUND', message: 'Game not found or expired' },
      };
    }

    // Find the player in the game state
    const playerIndex = room.state.players.findIndex(p => p?.id === playerId);
    if (playerIndex === -1) {
      return {
        type: 'ERROR',
        payload: { code: 'PLAYER_NOT_FOUND', message: 'Player not found in game' },
      };
    }

    // Update the connection
    room.players.set(playerId, {
      ws,
      playerIndex: playerIndex as 0 | 1,
      playerId,
    });

    console.log(`[GameManager] Player ${playerIndex + 1} reconnected to game ${gameId}`);

    // Notify other players
    this.broadcastToOthers(room, playerId, {
      type: 'PLAYER_RECONNECTED',
      payload: { playerIndex },
    });

    // Return full state to reconnecting player
    return {
      type: 'RECONNECTED',
      payload: {
        gameId: room.state.id,
        playerIndex,
        gameState: this.sanitizeStateForPlayer(room.state, playerIndex as 0 | 1),
      },
    };
  }

  /**
   * Get a player's connection info by WebSocket
   */
  getPlayerBySocket(ws: WebSocket): { room: GameRoom; playerId: string; playerIndex: 0 | 1 } | null {
    for (const room of this.games.values()) {
      for (const [playerId, conn] of room.players) {
        if (conn.ws === ws) {
          return { room, playerId, playerIndex: conn.playerIndex };
        }
      }
    }
    return null;
  }

  /**
   * Submit a deck for a player
   */
  submitDeck(
    ws: WebSocket,
    mainDeck: Array<{ scryfallId: string; name: string; imageUri: string; backImageUri?: string }>,
    sideboard: Array<{ scryfallId: string; name: string; imageUri: string; backImageUri?: string }>
  ): ServerMessage {
    const playerInfo = this.getPlayerBySocket(ws);
    if (!playerInfo) {
      return {
        type: 'ERROR',
        payload: { code: 'NOT_IN_GAME', message: 'You are not in a game' } as ErrorPayload,
      };
    }

    const { room, playerIndex } = playerInfo;
    const player = room.state.players[playerIndex];

    if (!player) {
      return {
        type: 'ERROR',
        payload: { code: 'INVALID_STATE', message: 'Player state not found' } as ErrorPayload,
      };
    }

    // Convert to Card instances with unique IDs
    player.deck = mainDeck.map((card) => ({
      instanceId: uuidv4(),
      scryfallId: card.scryfallId,
      name: card.name,
      imageUri: card.imageUri,
      backImageUri: card.backImageUri,
      isTapped: false,
      isFaceDown: false,
      isTransformed: false,
      counters: [],
      attachments: [],
    }));

    player.sideboard = sideboard.map((card) => ({
      instanceId: uuidv4(),
      scryfallId: card.scryfallId,
      name: card.name,
      imageUri: card.imageUri,
      backImageUri: card.backImageUri,
      isTapped: false,
      isFaceDown: false,
      isTransformed: false,
      counters: [],
      attachments: [],
    }));

    console.log(`[GameManager] Player ${playerIndex + 1} submitted deck: ${player.deck.length} main, ${player.sideboard.length} sideboard`);

    // Broadcast updated state
    this.broadcastStateUpdate(room);

    return {
      type: 'DECK_SUBMITTED',
      payload: { success: true },
    };
  }

  /**
   * Broadcast a message to all players in a room
   */
  private broadcastToRoom(room: GameRoom, message: ServerMessage): void {
    const msgStr = JSON.stringify(message);
    for (const conn of room.players.values()) {
      if (conn.ws.readyState === WebSocket.OPEN) {
        conn.ws.send(msgStr);
      }
    }
  }

  /**
   * Broadcast to all players except one
   */
  private broadcastToOthers(room: GameRoom, excludePlayerId: string, message: ServerMessage): void {
    const msgStr = JSON.stringify(message);
    for (const [playerId, conn] of room.players) {
      if (playerId !== excludePlayerId && conn.ws.readyState === WebSocket.OPEN) {
        conn.ws.send(msgStr);
      }
    }
  }

  /**
   * Send a message to the opponent of a specific player
   */
  private sendToOpponent(room: GameRoom, playerIndex: 0 | 1, message: ServerMessage): void {
    const opponentIndex = playerIndex === 0 ? 1 : 0;
    const msgStr = JSON.stringify(message);
    for (const conn of room.players.values()) {
      if (conn.playerIndex === opponentIndex && conn.ws.readyState === WebSocket.OPEN) {
        conn.ws.send(msgStr);
      }
    }
  }

  /**
   * Send a message to a specific player by their ID
   */
  private sendToPlayer(room: GameRoom, playerId: string, message: ServerMessage): void {
    const conn = room.players.get(playerId);
    if (conn && conn.ws.readyState === WebSocket.OPEN) {
      conn.ws.send(JSON.stringify(message));
    }
  }

  /**
   * Broadcast state update to all players (sanitized per player)
   */
  private broadcastStateUpdate(room: GameRoom): void {
    for (const conn of room.players.values()) {
      if (conn.ws.readyState === WebSocket.OPEN) {
        const sanitizedState = this.sanitizeStateForPlayer(room.state, conn.playerIndex);
        const message: ServerMessage = {
          type: 'STATE_UPDATE',
          payload: { gameState: sanitizedState } as StateUpdatePayload,
        };
        conn.ws.send(JSON.stringify(message));
        console.log(`[GameManager] Sent STATE_UPDATE to player ${conn.playerIndex + 1}`);
      } else {
        console.warn(`[GameManager] Skipped player ${conn.playerIndex + 1} - socket not open (readyState: ${conn.ws.readyState})`);
      }
    }
  }

  /**
   * Sanitize game state for a specific player
   * - Hide opponent's hand cards (show count only)
   * - Hide opponent's deck order
   */
  private sanitizeStateForPlayer(state: GameState, playerIndex: 0 | 1): GameState {
    const opponentIndex = playerIndex === 0 ? 1 : 0;
    const sanitized = JSON.parse(JSON.stringify(state)) as GameState;

    const opponent = sanitized.players[opponentIndex];
    if (opponent) {
      // Hide opponent's hand (replace with card backs)
      opponent.hand = opponent.hand.map((card) => ({
        ...card,
        // Keep instanceId for tracking, hide details
        name: 'Hidden',
        imageUri: '', // Client will show card back
        oracleText: undefined,
      }));

      // Hide opponent's deck completely (just keep count)
      const deckCount = opponent.deck.length;
      opponent.deck = Array(deckCount).fill(null).map((_, i) => ({
        instanceId: `hidden-${i}`,
        scryfallId: '',
        name: 'Hidden',
        imageUri: '',
        isTapped: false,
        isFaceDown: true,
        isTransformed: false,
        counters: [],
        attachments: [],
      }));
    }

    return sanitized;
  }

  /**
   * Start the game (transition from lobby to mulligan phase)
   */
  startGame(ws: WebSocket): ServerMessage {
    const playerInfo = this.getPlayerBySocket(ws);
    if (!playerInfo) {
      return {
        type: 'ERROR',
        payload: { code: 'NOT_IN_GAME', message: 'You are not in a game' } as ErrorPayload,
      };
    }

    const { room, playerIndex } = playerInfo;

    // Only host (player 0) can start the game
    if (playerIndex !== 0) {
      return {
        type: 'ERROR',
        payload: { code: 'NOT_HOST', message: 'Only the host can start the game' } as ErrorPayload,
      };
    }

    // Check both players have submitted decks
    const player0 = room.state.players[0];
    const player1 = room.state.players[1];

    // In goldfish mode, only check player 0 exists and has a deck
    if (room.state.isGoldfishMode) {
      if (!player0) {
        return {
          type: 'ERROR',
          payload: { code: 'INVALID_STATE', message: 'Player not found' } as ErrorPayload,
        };
      }
      if (player0.deck.length === 0) {
        return {
          type: 'ERROR',
          payload: { code: 'DECK_NOT_SUBMITTED', message: 'You must submit a deck' } as ErrorPayload,
        };
      }
    } else {
      // Normal 2-player mode
      if (!player0 || !player1) {
        return {
          type: 'ERROR',
          payload: { code: 'WAITING_FOR_PLAYER', message: 'Waiting for opponent to join' } as ErrorPayload,
        };
      }

      if (player0.deck.length === 0 || player1.deck.length === 0) {
        return {
          type: 'ERROR',
          payload: { code: 'DECK_NOT_SUBMITTED', message: 'Both players must submit decks' } as ErrorPayload,
        };
      }
    }

    // Shuffle decks and draw opening hands
    this.shuffleArray(player0.deck);
    if (player1 && player1.deck.length > 0) {
      this.shuffleArray(player1.deck);
    }

    // Draw opening hands (7 cards each)
    for (let i = 0; i < 7; i++) {
      if (player0.deck.length > 0) {
        player0.hand.push(player0.deck.shift()!);
      }
      if (player1 && player1.deck.length > 0) {
        player1.hand.push(player1.deck.shift()!);
      }
    }

    // Transition to mulligan phase
    room.state.phase = 'mulligan';
    room.state.turn = {
      number: 0,
      activePlayer: 0,
      phase: 'pre-game',
    };

    console.log(`[GameManager] Game ${room.state.id} started, entering mulligan phase`);

    // Broadcast state update to all players
    this.broadcastStateUpdate(room);

    return {
      type: 'GAME_STARTED',
      payload: { success: true },
    };
  }

  /**
   * Process a game action
   */
  processAction(ws: WebSocket, action: any): ServerMessage {
    const playerInfo = this.getPlayerBySocket(ws);
    if (!playerInfo) {
      return {
        type: 'ERROR',
        payload: { code: 'NOT_IN_GAME', message: 'You are not in a game' } as ErrorPayload,
      };
    }

    const { room, playerIndex, playerId } = playerInfo;
    const player = room.state.players[playerIndex];

    if (!player) {
      return {
        type: 'ERROR',
        payload: { code: 'INVALID_STATE', message: 'Player state not found' } as ErrorPayload,
      };
    }

    // Handle UNDO/REDO separately (don't save snapshot)
    if (action.type === 'UNDO') {
      const success = this.undoAction(room);
      if (success) {
        this.broadcastStateUpdate(room);
      }
      return {
        type: 'ACK',
        payload: { action: 'UNDO', success },
      };
    }

    if (action.type === 'REDO') {
      const success = this.redoAction(room);
      if (success) {
        this.broadcastStateUpdate(room);
      }
      return {
        type: 'ACK',
        payload: { action: 'REDO', success },
      };
    }

    if (action.type === 'SAVE_GAME') {
      const saveCode = this.createSaveCode(room);
      return {
        type: 'GAME_SAVED',
        payload: { saveCode },
      };
    }

    if (action.type === 'LOAD_GAME') {
      const code = action.code as string;
      const success = this.loadSaveCode(room, code);
      if (success) {
        this.broadcastStateUpdate(room);
        return {
          type: 'GAME_LOADED',
          payload: { success: true },
        };
      } else {
        return {
          type: 'ERROR',
          payload: { code: 'LOAD_FAILED', message: 'Failed to load save code' } as ErrorPayload,
        };
      }
    }

    // Save snapshot before processing action (for undo)
    this.saveStateSnapshot(room);

    // Process the action based on type
    switch (action.type) {
      case 'ENABLE_GOLDFISH': {
        // Can only enable goldfish mode in lobby phase with no opponent
        if (room.state.phase !== 'lobby') {
          return {
            type: 'ERROR',
            payload: { code: 'INVALID_PHASE', message: 'Can only enable goldfish mode in lobby' } as ErrorPayload,
          };
        }
        if (room.state.players[1] !== null) {
          return {
            type: 'ERROR',
            payload: { code: 'OPPONENT_PRESENT', message: 'Cannot enable goldfish mode with opponent present' } as ErrorPayload,
          };
        }

        room.state.isGoldfishMode = true;

        // Create a dummy opponent player with empty zones
        const dummyOpponent = {
          id: 'goldfish-opponent',
          name: 'Goldfish Opponent',
          deck: [],
          hand: [],
          battlefield: [],
          graveyard: [],
          exileActive: [],
          exilePermanent: [],
          sideboard: [],
          life: [{ delta: 0, total: 20, timestamp: Date.now() }],
          counters: { poison: 0, energy: 0, experience: 0 },
          mulliganCount: 0,
          hasKeptHand: true, // Always ready
          readyForNextGame: true, // Always ready
        };
        room.state.players[1] = dummyOpponent;

        console.log(`[GameManager] Goldfish mode enabled for game ${room.state.id}`);
        break;
      }

      case 'DRAW_CARDS': {
        const count = action.count || 1;
        for (let i = 0; i < count && player.deck.length > 0; i++) {
          player.hand.push(player.deck.shift()!);
        }
        this.addLogEntry(room, playerIndex, `drew ${count} card${count !== 1 ? 's' : ''}`, 'DRAW_CARDS');
        break;
      }

      case 'SHUFFLE_DECK': {
        this.shuffleArray(player.deck);
        this.addLogEntry(room, playerIndex, 'shuffled their library', 'SHUFFLE_DECK');
        break;
      }

      case 'PUT_ON_TOP': {
        // Remove cards from deck and put them on top in specified order
        const instanceIds: string[] = action.instanceIds || [];
        const cardsToTop: any[] = [];
        for (const instanceId of instanceIds) {
          const cardIndex = player.deck.findIndex(c => c.instanceId === instanceId);
          if (cardIndex !== -1) {
            cardsToTop.push(player.deck.splice(cardIndex, 1)[0]);
          }
        }
        // Put cards on top (first card in array = top of deck)
        player.deck.unshift(...cardsToTop);
        break;
      }

      case 'PUT_ON_BOTTOM': {
        // Remove cards from deck and put them on bottom
        const instanceIds: string[] = action.instanceIds || [];
        const cardsToBottom: any[] = [];
        for (const instanceId of instanceIds) {
          const cardIndex = player.deck.findIndex(c => c.instanceId === instanceId);
          if (cardIndex !== -1) {
            cardsToBottom.push(player.deck.splice(cardIndex, 1)[0]);
          }
        }
        // Put cards on bottom
        player.deck.push(...cardsToBottom);
        break;
      }

      case 'TAP_CARD': {
        const card = this.findCardInZones(player, action.instanceId);
        if (card) {
          card.isTapped = true;
        }
        break;
      }

      case 'UNTAP_CARD': {
        const card = this.findCardInZones(player, action.instanceId);
        if (card) {
          card.isTapped = false;
        }
        break;
      }

      case 'UNTAP_ALL': {
        player.battlefield.forEach(card => {
          card.isTapped = false;
        });
        break;
      }

      case 'MOVE_CARD': {
        // Special handling for stack (shared zone on gameState, not per-player)
        if (action.to === 'stack') {
          const card = this.removeCardFromPlayerZone(player, action.instanceId, action.from);
          if (card) {
            card.position = action.position;
            card.isTapped = false;
            room.state.stack.push(card);
          }
          break;
        }
        if (action.from === 'stack') {
          const cardIndex = room.state.stack.findIndex(c => c.instanceId === action.instanceId);
          if (cardIndex !== -1) {
            const [card] = room.state.stack.splice(cardIndex, 1);
            this.addCardToPlayerZone(player, card, action.to, action.position);
          }
          break;
        }
        // Normal per-player zone move
        this.moveCard(player, action.instanceId, action.from, action.to, action.position, action.faceDown);

        // Log face-down plays
        if (action.faceDown) {
          if (action.to === 'battlefield') {
            this.addLogEntry(room, playerIndex, 'played a card face down', 'PLAY_FACE_DOWN');
          } else if (action.to === 'exileActive') {
            this.addLogEntry(room, playerIndex, 'exiled a card face down', 'FORETELL');
          }
        }
        break;
      }

      case 'MOVE_CARD_POSITION': {
        const card = player.battlefield.find(c => c.instanceId === action.instanceId);
        if (card) {
          card.position = action.position;
        }
        break;
      }

      case 'FLIP_CARD': {
        const card = this.findCardInZones(player, action.instanceId);
        if (card) {
          card.isFaceDown = !card.isFaceDown;
        }
        break;
      }

      case 'TRANSFORM_CARD': {
        const card = this.findCardInZones(player, action.instanceId);
        if (card) {
          card.isTransformed = !card.isTransformed;
        }
        break;
      }

      case 'ADD_COUNTER': {
        const card = this.findCardInZones(player, action.instanceId);
        if (card && action.counter) {
          card.counters.push(action.counter);
        }
        break;
      }

      case 'REMOVE_COUNTER': {
        const card = this.findCardInZones(player, action.instanceId);
        if (card && typeof action.counterIndex === 'number' && card.counters[action.counterIndex]) {
          card.counters.splice(action.counterIndex, 1);
        }
        break;
      }

      case 'ATTACH_CARD': {
        // Attach one card to another (e.g., aura to creature) - works cross-player
        const cardInfo = this.findCardInGameState(room.state, action.instanceId);
        const targetInfo = this.findCardInGameState(room.state, action.targetId);
        if (!cardInfo || !targetInfo || cardInfo.zone !== 'battlefield' || targetInfo.zone !== 'battlefield') break;
        if (cardInfo.card.instanceId === targetInfo.card.instanceId) break;

        const card = cardInfo.card;
        const target = targetInfo.card;

        // Remove from any previous attachment (search both players' battlefields)
        if (card.attachedTo) {
          const prevTargetInfo = this.findCardInGameState(room.state, card.attachedTo);
          if (prevTargetInfo && prevTargetInfo.zone === 'battlefield') {
            prevTargetInfo.card.attachments = prevTargetInfo.card.attachments.filter((id: string) => id !== card.instanceId);
          }
        }

        // Set new attachment
        card.attachedTo = target.instanceId;
        if (!target.attachments) target.attachments = [];
        if (!target.attachments.includes(card.instanceId)) {
          target.attachments.push(card.instanceId);
        }
        // Move attached card to target's position
        card.position = target.position;
        console.log(`[GameManager] Attached ${card.name} to ${target.name}`);
        break;
      }

      case 'DETACH_CARD': {
        // Detach a card from its target - works cross-player
        const cardInfo = this.findCardInGameState(room.state, action.instanceId);
        if (!cardInfo || cardInfo.zone !== 'battlefield') break;

        const card = cardInfo.card;
        if (!card.attachedTo) break;

        // Find the target (could be on either player's battlefield)
        const targetInfo = this.findCardInGameState(room.state, card.attachedTo);
        if (targetInfo && targetInfo.zone === 'battlefield') {
          targetInfo.card.attachments = targetInfo.card.attachments.filter((id: string) => id !== card.instanceId);
        }

        card.attachedTo = undefined;
        // Give it a new position slightly offset from current
        if (card.position) {
          card.position = {
            x: Math.min(90, card.position.x + 10),
            y: card.position.y,
          };
        }
        console.log(`[GameManager] Detached ${card.name}`);
        break;
      }

      case 'MOVE_TO_OPPONENT_BATTLEFIELD': {
        // Move a card from your zones to opponent's battlefield (paper Magic style)
        const opponentIndex = playerIndex === 0 ? 1 : 0;
        const opponent = room.state.players[opponentIndex];
        if (!opponent) break;

        const card = this.removeCardFromPlayerZone(player, action.instanceId, action.from);
        if (card) {
          card.isTapped = false;
          card.isFaceDown = false;
          card.position = action.position || { x: 50, y: 50 };
          opponent.battlefield.push(card);
          console.log(`[GameManager] Moved ${card.name} to opponent's battlefield`);
        }
        break;
      }

      case 'MOVE_CARD_ON_ANY_BATTLEFIELD': {
        // Move any card on any battlefield (either player can reposition any card)
        const cardInfo = this.findCardInGameState(room.state, action.instanceId);
        if (!cardInfo || cardInfo.zone !== 'battlefield') break;

        const { card } = cardInfo;
        card.position = action.position;
        console.log(`[GameManager] Repositioned ${card.name} on battlefield`);
        break;
      }

      case 'TAKE_FROM_OPPONENT_BATTLEFIELD': {
        // Take a card from opponent's battlefield (move it to your zone)
        const opponentIndex = playerIndex === 0 ? 1 : 0;
        const opponent = room.state.players[opponentIndex];
        if (!opponent) break;

        // Find and remove card from opponent's battlefield
        const cardIndex = opponent.battlefield.findIndex(c => c.instanceId === action.instanceId);
        if (cardIndex === -1) break;
        const [card] = opponent.battlefield.splice(cardIndex, 1);

        // Add to requesting player's zone
        this.addCardToPlayerZone(player, card, action.to, action.position);
        console.log(`[GameManager] ${player.name} took ${card.name} from opponent's battlefield to ${action.to}`);
        break;
      }

      case 'BRING_TO_FRONT': {
        // Find the card on any battlefield
        const cardInfo = this.findCardInGameState(room.state, action.instanceId);
        if (!cardInfo || cardInfo.zone !== 'battlefield') break;

        const ownerPlayer = room.state.players[cardInfo.playerIndex];
        if (!ownerPlayer) break;

        // Find the highest zIndex on that player's battlefield (treat undefined as 1)
        let maxZIndex = 1;
        for (const c of ownerPlayer.battlefield) {
          const z = c.zIndex ?? 1;
          if (z > maxZIndex) {
            maxZIndex = z;
          }
        }

        // Set this card's zIndex higher
        cardInfo.card.zIndex = maxZIndex + 1;
        console.log(`[GameManager] Brought ${cardInfo.card.name} to front (zIndex: ${cardInfo.card.zIndex})`);
        break;
      }

      case 'SEND_TO_BACK': {
        // Find the card on any battlefield
        const cardInfo = this.findCardInGameState(room.state, action.instanceId);
        if (!cardInfo || cardInfo.zone !== 'battlefield') break;

        const ownerPlayer = room.state.players[cardInfo.playerIndex];
        if (!ownerPlayer) break;

        // Bump all OTHER cards up by 1 to make room, then set this card to 1
        for (const c of ownerPlayer.battlefield) {
          if (c.instanceId !== cardInfo.card.instanceId) {
            c.zIndex = (c.zIndex ?? 1) + 1;
          }
        }
        cardInfo.card.zIndex = 1;
        console.log(`[GameManager] Sent ${cardInfo.card.name} to back (zIndex: ${cardInfo.card.zIndex})`);
        break;
      }

      case 'PEEK_OPPONENT_LIBRARY': {
        // Peek at top N cards of opponent's library (only visible to requesting player)
        const opponentIndex = playerIndex === 0 ? 1 : 0;
        const opponent = room.state.players[opponentIndex];
        if (!opponent || !opponent.deck || opponent.deck.length === 0) break;

        const count = Math.min(action.count, opponent.deck.length);
        const topCards = opponent.deck.slice(0, count);

        // Send reveal message only to requesting player
        const revealPayload: CardsRevealedPayload = {
          revealerName: opponent.name,
          source: `Top ${count} of ${opponent.name}'s Library`,
          cards: topCards.map(c => ({
            instanceId: c.instanceId,
            name: c.name,
            imageUri: c.imageUri,
            backImageUri: c.backImageUri,
          })),
        };

        this.sendToPlayer(room, playerId, {
          type: 'CARDS_REVEALED',
          payload: revealPayload,
        });

        this.addLogEntry(room, playerIndex, `peeked at top ${count} of opponent's library`, 'PEEK_OPPONENT_LIBRARY');
        console.log(`[GameManager] ${player.name} peeked at top ${count} of opponent's library`);
        // Don't broadcast state update for peek - it's private
        return {
          type: 'ACK',
          payload: { action: action.type },
        };
      }

      case 'MULLIGAN_KEEP': {
        player.hasKeptHand = true;

        // In goldfish mode, transition immediately when player 0 keeps
        if (room.state.isGoldfishMode && playerIndex === 0) {
          room.state.phase = 'playing';
          room.state.turn = {
            number: 1,
            activePlayer: 0,
            phase: 'Main',
          };
          console.log(`[GameManager] Goldfish mode: player kept, starting game ${room.state.id}`);
          break;
        }

        // Check if both players have kept - transition to playing phase
        const otherPlayer = room.state.players[playerIndex === 0 ? 1 : 0];
        if (otherPlayer?.hasKeptHand) {
          room.state.phase = 'playing';
          room.state.turn = {
            number: 1,
            activePlayer: 0, // Player 1 goes first (could randomize)
            phase: 'Main',
          };
          console.log(`[GameManager] Both players kept, starting game ${room.state.id}`);
        }
        break;
      }

      case 'MULLIGAN_AGAIN': {
        // Put current hand back into deck
        while (player.hand.length > 0) {
          player.deck.push(player.hand.pop()!);
        }

        // Shuffle
        this.shuffleArray(player.deck);

        // Increment mulligan count
        player.mulliganCount++;

        // Draw 7 new cards
        for (let i = 0; i < 7 && player.deck.length > 0; i++) {
          player.hand.push(player.deck.shift()!);
        }

        console.log(`[GameManager] Player ${playerIndex + 1} mulliganed to ${7 - player.mulliganCount}`);
        break;
      }

      case 'BOTTOM_CARDS': {
        // Move specified cards from hand to bottom of deck
        const instanceIds = action.instanceIds as string[];
        for (const instanceId of instanceIds) {
          const cardIndex = player.hand.findIndex(c => c.instanceId === instanceId);
          if (cardIndex !== -1) {
            const [card] = player.hand.splice(cardIndex, 1);
            player.deck.push(card); // Push to end (bottom of library)
          }
        }
        break;
      }

      case 'UPDATE_LIFE': {
        const delta = action.delta as number;
        const note = action.note as string | undefined;
        const currentTotal = player.life.length > 0
          ? player.life[player.life.length - 1].total
          : 20;

        player.life.push({
          delta,
          total: currentTotal + delta,
          note,
          timestamp: Date.now(),
        });
        break;
      }

      case 'SET_PLAYER_COUNTER': {
        const counterType = action.counterType as string;
        const value = action.value as number;
        player.counters[counterType] = Math.max(0, value);
        break;
      }

      case 'CREATE_TOKEN': {
        const token = action.token as any;
        if (token) {
          const newToken = {
            ...token,
            instanceId: uuidv4(),
          };
          player.battlefield.push(newToken);
          console.log(`[GameManager] Created token: ${token.name}`);
        }
        break;
      }

      case 'DESTROY_TOKEN': {
        const tokenId = action.instanceId as string;
        const tokenIndex = player.battlefield.findIndex(
          c => c.instanceId === tokenId && 'isToken' in c && (c as any).isToken === true
        );
        if (tokenIndex !== -1) {
          const [removedToken] = player.battlefield.splice(tokenIndex, 1);
          console.log(`[GameManager] Destroyed token: ${removedToken.name}`);
        }
        break;
      }

      case 'REVEAL_HAND': {
        // Reveal player's hand to opponent
        const cardsToReveal = player.hand.map(card => ({
          instanceId: card.instanceId,
          name: card.name,
          imageUri: card.imageUri,
          backImageUri: card.backImageUri,
        }));

        const revealPayload: CardsRevealedPayload = {
          revealerName: player.name,
          source: 'Hand',
          cards: cardsToReveal,
        };

        // Send reveal message to opponent only
        this.sendToOpponent(room, playerIndex, {
          type: 'CARDS_REVEALED',
          payload: revealPayload,
        });

        this.addLogEntry(room, playerIndex, 'revealed their hand', 'REVEAL_HAND');
        console.log(`[GameManager] ${player.name} revealed hand (${cardsToReveal.length} cards)`);
        break;
      }

      case 'REVEAL_CARDS_TO_OPPONENT': {
        // Reveal specific cards to opponent
        const instanceIds: string[] = action.instanceIds || [];
        const source: string = action.source || 'Cards';

        // Find cards in player's zones
        const cardsToReveal = instanceIds
          .map(id => this.findCardInZones(player, id))
          .filter(Boolean)
          .map(card => ({
            instanceId: card!.instanceId,
            name: card!.name,
            imageUri: card!.imageUri,
            backImageUri: card!.backImageUri,
          }));

        if (cardsToReveal.length > 0) {
          const revealPayload: CardsRevealedPayload = {
            revealerName: player.name,
            source,
            cards: cardsToReveal,
          };

          // Send reveal message to opponent only
          this.sendToOpponent(room, playerIndex, {
            type: 'CARDS_REVEALED',
            payload: revealPayload,
          });

          this.addLogEntry(room, playerIndex, `revealed ${cardsToReveal.length} card${cardsToReveal.length !== 1 ? 's' : ''} from ${source}`, 'REVEAL_CARDS_TO_OPPONENT');
          console.log(`[GameManager] ${player.name} revealed ${cardsToReveal.length} cards from ${source}`);
        }
        break;
      }

      case 'CONCEDE': {
        // Player concedes - opponent wins this game
        const opponentIndex = playerIndex === 0 ? 1 : 0;
        const winner = opponentIndex === 0 ? 'player1' : 'player2';
        this.endGame(room, winner as 'player1' | 'player2');
        break;
      }

      case 'DECLARE_WINNER': {
        // Manually declare a winner (for tracking who won when life hits 0, etc.)
        const winner = action.winner as 'player1' | 'player2' | 'draw';
        this.endGame(room, winner);
        break;
      }

      case 'READY_FOR_NEXT_GAME': {
        player.readyForNextGame = true;

        // In goldfish mode, skip opponent ready check
        if (room.state.isGoldfishMode) {
          this.startNextGame(room);
          break;
        }

        // Check if both players are ready
        const otherPlayer = room.state.players[playerIndex === 0 ? 1 : 0];
        if (otherPlayer?.readyForNextGame) {
          this.startNextGame(room);
        }
        break;
      }

      case 'SWAP_SIDEBOARD': {
        const mainIndex = action.mainDeckIndex as number;
        const sideIndex = action.sideboardIndex as number;

        // Combine all cards into "main deck" for sideboarding
        const allMainCards = [
          ...player.deck,
          ...player.hand,
          ...player.battlefield,
          ...player.graveyard,
        ];

        if (mainIndex >= 0 && mainIndex < allMainCards.length &&
            sideIndex >= 0 && sideIndex < player.sideboard.length) {
          // Get the cards to swap
          const mainCard = allMainCards[mainIndex];
          const sideCard = player.sideboard[sideIndex];

          // Remove main card from wherever it is
          let found = false;
          for (const zone of ['deck', 'hand', 'battlefield', 'graveyard'] as const) {
            const idx = player[zone].findIndex(c => c.instanceId === mainCard.instanceId);
            if (idx !== -1) {
              player[zone].splice(idx, 1);
              found = true;
              break;
            }
          }

          if (found) {
            // Swap the cards
            player.sideboard[sideIndex] = mainCard;
            player.deck.push(sideCard); // Add side card to deck
          }
        }
        break;
      }

      case 'PASS_TURN': {
        const currentTurn = room.state.turn;
        // In goldfish mode, always keep activePlayer as 0
        const nextActivePlayer = room.state.isGoldfishMode ? 0 : (currentTurn.activePlayer === 0 ? 1 : 0);
        room.state.turn = {
          number: currentTurn.number + 1,
          activePlayer: nextActivePlayer,
          phase: 'Main',
        };
        this.addLogEntry(room, playerIndex, 'ended their turn', 'PASS_TURN');
        console.log(`[GameManager] Turn ${room.state.turn.number} - Player ${room.state.turn.activePlayer + 1}'s turn`);
        break;
      }

      default:
        console.log(`[GameManager] Unhandled action type: ${action.type}`);
    }

    // Broadcast updated state
    this.broadcastStateUpdate(room);

    return {
      type: 'ACK',
      payload: { action: action.type },
    };
  }

  /**
   * Find a card in any of the player's zones
   */
  private findCardInZones(player: Player, instanceId: string) {
    return (
      player.hand.find(c => c.instanceId === instanceId) ||
      player.battlefield.find(c => c.instanceId === instanceId) ||
      player.graveyard.find(c => c.instanceId === instanceId) ||
      player.exileActive.find(c => c.instanceId === instanceId) ||
      player.exilePermanent.find(c => c.instanceId === instanceId) ||
      player.deck.find(c => c.instanceId === instanceId)
    );
  }

  /**
   * Find a card across both players' zones
   * Returns the card, which player owns it, and which zone it's in
   */
  private findCardInGameState(
    state: GameState,
    instanceId: string
  ): { card: any; playerIndex: 0 | 1; zone: string } | null {
    const zones = ['hand', 'battlefield', 'graveyard', 'exileActive', 'exilePermanent', 'deck'] as const;

    for (let playerIndex = 0; playerIndex < 2; playerIndex++) {
      const player = state.players[playerIndex as 0 | 1];
      if (!player) continue;

      for (const zone of zones) {
        const card = player[zone].find((c: any) => c.instanceId === instanceId);
        if (card) {
          return { card, playerIndex: playerIndex as 0 | 1, zone };
        }
      }
    }

    // Also check the stack (shared zone)
    const stackCard = state.stack.find(c => c.instanceId === instanceId);
    if (stackCard) {
      return { card: stackCard, playerIndex: 0, zone: 'stack' }; // Stack owner doesn't matter much
    }

    return null;
  }

  /**
   * Move a card between zones
   */
  private moveCard(
    player: Player,
    instanceId: string,
    from: string,
    to: string,
    position?: { x: number; y: number },
    faceDown?: boolean
  ): void {
    const zones: Record<string, typeof player.hand> = {
      hand: player.hand,
      battlefield: player.battlefield,
      graveyard: player.graveyard,
      exileActive: player.exileActive,
      exilePermanent: player.exilePermanent,
      deck: player.deck,
      sideboard: player.sideboard,
    };

    const fromZone = zones[from];
    const toZone = zones[to];

    if (!fromZone || !toZone) {
      console.log(`[GameManager] Invalid zone: ${from} -> ${to}`);
      return;
    }

    const cardIndex = fromZone.findIndex(c => c.instanceId === instanceId);
    if (cardIndex === -1) {
      console.log(`[GameManager] Card not found in ${from}: ${instanceId}`);
      return;
    }

    const [card] = fromZone.splice(cardIndex, 1);

    // Reset card state when moving zones
    if (to === 'battlefield') {
      card.isTapped = false;
      card.isFaceDown = faceDown ?? false;
      // Use provided position, or place in a sensible default area
      if (position) {
        card.position = position;
      } else {
        // Place in center-ish area with slight offset to avoid perfect stacking
        card.position = {
          x: 40 + (Math.random() - 0.5) * 10,
          y: 40 + (Math.random() - 0.5) * 10,
        };
      }
    } else if (to === 'exileActive' || to === 'exilePermanent') {
      card.isTapped = false;
      card.isFaceDown = faceDown ?? false;
      card.position = undefined;
    } else if (to === 'hand') {
      // Cards returning to hand should untap and be face up
      card.isTapped = false;
      card.isFaceDown = false;
      card.position = undefined;
    } else {
      // All other zones: untap, face up, and clear position
      card.isTapped = false;
      card.isFaceDown = false;
      card.position = undefined;
    }

    toZone.push(card);
  }

  /**
   * Remove a card from a player's zone and return it
   */
  private removeCardFromPlayerZone(player: Player, instanceId: string, zone: string): any | null {
    const zones: Record<string, any[]> = {
      hand: player.hand,
      battlefield: player.battlefield,
      graveyard: player.graveyard,
      exileActive: player.exileActive,
      exilePermanent: player.exilePermanent,
      deck: player.deck,
      sideboard: player.sideboard,
    };
    const targetZone = zones[zone];
    if (!targetZone) return null;
    const index = targetZone.findIndex((c: any) => c.instanceId === instanceId);
    if (index === -1) return null;
    return targetZone.splice(index, 1)[0];
  }

  /**
   * Add a card to a player's zone with proper state reset
   */
  private addCardToPlayerZone(player: Player, card: any, zone: string, position?: { x: number; y: number }): void {
    if (zone === 'battlefield') {
      card.isTapped = false;
      card.position = position || {
        x: 40 + (Math.random() - 0.5) * 10,
        y: 40 + (Math.random() - 0.5) * 10,
      };
    } else if (zone === 'hand') {
      card.isTapped = false;
      card.position = undefined;
    } else {
      card.isTapped = false;
      card.position = undefined;
    }

    const zones: Record<string, any[]> = {
      hand: player.hand,
      battlefield: player.battlefield,
      graveyard: player.graveyard,
      exileActive: player.exileActive,
      exilePermanent: player.exilePermanent,
      deck: player.deck,
      sideboard: player.sideboard,
    };
    zones[zone]?.push(card);
  }

  /**
   * Shuffle an array in place (Fisher-Yates)
   */
  private shuffleArray<T>(array: T[]): void {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }

  /**
   * Add an entry to the action log
   */
  private addLogEntry(
    room: GameRoom,
    playerIndex: 0 | 1,
    message: string,
    actionType: string
  ): void {
    const player = room.state.players[playerIndex];
    const entry: ActionLogEntry = {
      id: uuidv4(),
      timestamp: Date.now(),
      playerIndex,
      playerName: player?.name || `Player ${playerIndex + 1}`,
      message,
      type: actionType,
    };

    room.state.actionLog.push(entry);

    // Keep only last 30 entries
    if (room.state.actionLog.length > 30) {
      room.state.actionLog = room.state.actionLog.slice(-30);
    }
  }

  /**
   * Save current state to history (for undo)
   */
  private saveStateSnapshot(room: GameRoom): void {
    const MAX_HISTORY = 50;

    // Create snapshot
    const snapshot: StateSnapshot = {
      state: JSON.stringify(room.state),
      timestamp: Date.now(),
    };

    // If we're not at the end of history, truncate forward history
    if (room.historyIndex < room.stateHistory.length - 1) {
      room.stateHistory = room.stateHistory.slice(0, room.historyIndex + 1);
    }

    // Add new snapshot
    room.stateHistory.push(snapshot);
    room.historyIndex = room.stateHistory.length - 1;

    // Limit history size
    if (room.stateHistory.length > MAX_HISTORY) {
      room.stateHistory.shift();
      room.historyIndex--;
    }
  }

  /**
   * Restore state from a snapshot
   */
  private restoreStateFromSnapshot(room: GameRoom, snapshot: StateSnapshot): void {
    const restoredState = JSON.parse(snapshot.state) as GameState;
    room.state = restoredState;
  }

  /**
   * Undo last action
   */
  private undoAction(room: GameRoom): boolean {
    if (room.historyIndex <= 0) {
      console.log('[GameManager] Nothing to undo');
      return false;
    }

    room.historyIndex--;
    const snapshot = room.stateHistory[room.historyIndex];
    this.restoreStateFromSnapshot(room, snapshot);
    console.log(`[GameManager] Undo - restored to history index ${room.historyIndex}`);
    return true;
  }

  /**
   * Redo previously undone action
   */
  private redoAction(room: GameRoom): boolean {
    if (room.historyIndex >= room.stateHistory.length - 1) {
      console.log('[GameManager] Nothing to redo');
      return false;
    }

    room.historyIndex++;
    const snapshot = room.stateHistory[room.historyIndex];
    this.restoreStateFromSnapshot(room, snapshot);
    console.log(`[GameManager] Redo - restored to history index ${room.historyIndex}`);
    return true;
  }

  /**
   * Create a save code from current game state
   */
  private createSaveCode(room: GameRoom): string {
    try {
      // Create a saveable version of state (exclude sensitive data like password hash)
      const saveData = {
        players: room.state.players,
        stack: room.state.stack,
        phase: room.state.phase,
        currentGame: room.state.currentGame,
        gameResults: room.state.gameResults,
        turn: room.state.turn,
        savedAt: Date.now(),
      };

      // Serialize to JSON and encode as base64
      const jsonStr = JSON.stringify(saveData);
      const base64 = Buffer.from(jsonStr).toString('base64');

      // Add a prefix for validation
      const saveCode = `PM1_${base64}`;
      console.log(`[GameManager] Created save code (${saveCode.length} chars)`);
      return saveCode;
    } catch (error) {
      console.error('[GameManager] Failed to create save code:', error);
      return '';
    }
  }

  /**
   * Load game state from a save code
   */
  private loadSaveCode(room: GameRoom, code: string): boolean {
    try {
      // Validate prefix
      if (!code.startsWith('PM1_')) {
        console.error('[GameManager] Invalid save code prefix');
        return false;
      }

      // Decode base64
      const base64 = code.slice(4);
      const jsonStr = Buffer.from(base64, 'base64').toString('utf-8');
      const saveData = JSON.parse(jsonStr);

      // Validate structure
      if (!saveData.players || !saveData.phase) {
        console.error('[GameManager] Invalid save data structure');
        return false;
      }

      // Restore state (preserve game ID and password hash)
      room.state.players = saveData.players;
      room.state.stack = saveData.stack || [];
      room.state.phase = saveData.phase;
      room.state.currentGame = saveData.currentGame || 1;
      room.state.gameResults = saveData.gameResults || [];
      room.state.turn = saveData.turn || { number: 1, activePlayer: 0, phase: 'Main' };
      room.state.lastAction = Date.now();

      // Clear undo history after load
      room.stateHistory = [];
      room.historyIndex = -1;

      console.log('[GameManager] Loaded game from save code');
      return true;
    } catch (error) {
      console.error('[GameManager] Failed to load save code:', error);
      return false;
    }
  }

  /**
   * End the current game and record the result
   */
  private endGame(room: GameRoom, winner: 'player1' | 'player2' | 'draw'): void {
    // Record the result
    room.state.gameResults.push(winner);

    console.log(`[GameManager] Game ${room.state.currentGame} ended. Winner: ${winner}`);

    // Check if match is over (best of 3)
    const player1Wins = room.state.gameResults.filter(r => r === 'player1').length;
    const player2Wins = room.state.gameResults.filter(r => r === 'player2').length;

    if (player1Wins >= 2 || player2Wins >= 2 || room.state.gameResults.length >= 3) {
      // Match is over
      room.state.phase = 'finished';
      console.log(`[GameManager] Match finished! Player1: ${player1Wins}, Player2: ${player2Wins}`);
    } else {
      // Go to sideboarding
      room.state.phase = 'sideboarding';
      room.state.currentGame++;

      // Reset player ready states
      for (const player of room.state.players) {
        if (player) {
          player.readyForNextGame = false;
        }
      }

      console.log(`[GameManager] Moving to sideboarding for game ${room.state.currentGame}`);
    }

    // Broadcast state update
    this.broadcastStateUpdate(room);
  }

  /**
   * Start the next game after sideboarding
   */
  private startNextGame(room: GameRoom): void {
    const player0 = room.state.players[0];
    const player1 = room.state.players[1];

    if (!player0 || !player1) return;

    // Reset player states for new game
    for (const player of [player0, player1]) {
      // Collect all cards back to deck (except sideboard)
      player.deck = [
        ...player.deck,
        ...player.hand,
        ...player.battlefield,
        ...player.graveyard,
        ...player.exileActive,
        ...player.exilePermanent,
      ].filter(c => !('isToken' in c)); // Remove tokens

      player.hand = [];
      player.battlefield = [];
      player.graveyard = [];
      player.exileActive = [];
      player.exilePermanent = [];

      // Reset card states
      for (const card of player.deck) {
        card.isTapped = false;
        card.isFaceDown = false;
        card.isTransformed = false;
        card.counters = [];
        card.attachedTo = undefined;
        card.attachments = [];
        card.position = undefined;
      }

      // Reset player state
      player.life = [{ delta: 0, total: 20, timestamp: Date.now() }];
      player.counters = { poison: 0, energy: 0, experience: 0 };
      player.mulliganCount = 0;
      player.hasKeptHand = false;
      player.readyForNextGame = false;

      // Shuffle deck
      this.shuffleArray(player.deck);

      // Draw opening hand
      for (let i = 0; i < 7 && player.deck.length > 0; i++) {
        player.hand.push(player.deck.shift()!);
      }
    }

    // In goldfish mode, set dummy opponent as always ready
    if (room.state.isGoldfishMode && player1) {
      player1.hasKeptHand = true;
      player1.readyForNextGame = true;
    }

    // Set game phase to mulligan
    room.state.phase = 'mulligan';
    room.state.turn = {
      number: 0,
      activePlayer: 0,
      phase: 'pre-game',
    };

    console.log(`[GameManager] Starting game ${room.state.currentGame}`);

    // Broadcast state update
    this.broadcastStateUpdate(room);
  }

  /**
   * Get game stats for debugging
   */
  getStats(): { activeGames: number; totalPlayers: number } {
    let totalPlayers = 0;
    for (const room of this.games.values()) {
      totalPlayers += room.players.size;
    }
    return {
      activeGames: this.games.size,
      totalPlayers,
    };
  }
}

// Singleton instance
export const gameManager = new GameManager();
