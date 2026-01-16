import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { v4 as uuidv4 } from 'uuid';
import type {
  ClientMessage,
  ServerMessage,
  CreateGamePayload,
  JoinGamePayload,
  SubmitDeckPayload,
} from '@paper-magic/shared';
import { lookupCards, searchCard, autocomplete, getCacheStats } from './services/scryfall.js';
import { gameManager } from './gameManager.js';

const PORT = process.env.PORT || 3001;

// Express setup
const app = express();

// CORS configuration - restrict origins in production
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5173'];
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, or same-origin)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    // In development, allow all origins
    if (process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));

app.use(express.json());

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

// ============================================
// Card API Endpoints (Scryfall Proxy)
// ============================================

/**
 * POST /api/cards/resolve
 * Batch resolve card names to card data
 * Body: { cards: string[] }
 */
app.post('/api/cards/resolve', async (req, res) => {
  const { cards } = req.body as { cards?: string[] };

  if (!cards || !Array.isArray(cards)) {
    res.status(400).json({ error: 'Missing or invalid "cards" array in request body' });
    return;
  }

  if (cards.length === 0) {
    res.json({ found: [], notFound: [] });
    return;
  }

  if (cards.length > 300) {
    res.status(400).json({ error: 'Too many cards. Maximum 300 per request.' });
    return;
  }

  try {
    const result = await lookupCards(cards);
    res.json(result);
  } catch (error) {
    console.error('[API] Card resolve error:', error);
    res.status(500).json({ error: 'Failed to resolve cards' });
  }
});

/**
 * GET /api/cards/search?name=<cardName>
 * Search for a single card by exact name
 */
app.get('/api/cards/search', async (req, res) => {
  const { name } = req.query;

  if (!name || typeof name !== 'string') {
    res.status(400).json({ error: 'Missing "name" query parameter' });
    return;
  }

  try {
    const card = await searchCard(name);
    if (card) {
      res.json({ card });
    } else {
      res.status(404).json({ error: 'Card not found' });
    }
  } catch (error) {
    console.error('[API] Card search error:', error);
    res.status(500).json({ error: 'Failed to search for card' });
  }
});

/**
 * GET /api/cards/autocomplete?q=<query>
 * Autocomplete card names
 */
app.get('/api/cards/autocomplete', async (req, res) => {
  const { q } = req.query;

  if (!q || typeof q !== 'string') {
    res.status(400).json({ error: 'Missing "q" query parameter' });
    return;
  }

  try {
    const suggestions = await autocomplete(q);
    res.json({ suggestions });
  } catch (error) {
    console.error('[API] Autocomplete error:', error);
    res.status(500).json({ error: 'Failed to autocomplete' });
  }
});

/**
 * GET /api/cards/cache-stats
 * Get cache statistics (for debugging)
 */
app.get('/api/cards/cache-stats', (_req, res) => {
  res.json(getCacheStats());
});

/**
 * GET /api/games/stats
 * Get game statistics (for debugging)
 */
app.get('/api/games/stats', (_req, res) => {
  res.json(gameManager.getStats());
});

// Create HTTP server
const server = createServer(app);

// WebSocket server
const wss = new WebSocketServer({ server });

// Track connected clients
const clients = new Map<string, WebSocket>();

wss.on('connection', (ws) => {
  const clientId = uuidv4();
  clients.set(clientId, ws);

  console.log(`[WS] Client connected: ${clientId}`);

  // Send welcome message
  const welcomeMsg: ServerMessage = {
    type: 'ACK',
    payload: { message: 'Connected to Paper Magic server', clientId },
  };
  ws.send(JSON.stringify(welcomeMsg));

  ws.on('message', (data) => {
    try {
      const message: ClientMessage = JSON.parse(data.toString());
      console.log(`[WS] Received from ${clientId}:`, message.type);

      let response: ServerMessage;

      switch (message.type) {
        case 'PING':
          response = {
            type: 'PONG',
            payload: { timestamp: Date.now() },
            requestId: message.requestId,
          };
          break;

        case 'CREATE_GAME': {
          const { playerName, password } = message.payload as CreateGamePayload;
          response = gameManager.createGame(ws, playerName, password);
          response.requestId = message.requestId;
          break;
        }

        case 'JOIN_GAME': {
          const { gameId, playerName, password } = message.payload as JoinGamePayload;
          response = gameManager.joinGame(ws, gameId, playerName, password);
          response.requestId = message.requestId;
          break;
        }

        case 'RECONNECT': {
          const { gameId, playerId } = message.payload as { gameId: string; playerId: string };
          response = gameManager.reconnect(ws, gameId, playerId);
          response.requestId = message.requestId;
          break;
        }

        case 'SUBMIT_DECK': {
          const payload = message.payload as SubmitDeckPayload & {
            mainDeck: Array<{ scryfallId: string; name: string; imageUri: string; backImageUri?: string }>;
            sideboard: Array<{ scryfallId: string; name: string; imageUri: string; backImageUri?: string }>;
          };
          response = gameManager.submitDeck(ws, payload.mainDeck, payload.sideboard);
          response.requestId = message.requestId;
          break;
        }

        case 'START_GAME': {
          response = gameManager.startGame(ws);
          response.requestId = message.requestId;
          break;
        }

        case 'GAME_ACTION': {
          response = gameManager.processAction(ws, message.payload);
          response.requestId = message.requestId;
          break;
        }

        default:
          response = {
            type: 'ACK',
            payload: { received: message.type },
            requestId: message.requestId,
          };
      }

      ws.send(JSON.stringify(response));

    } catch (error) {
      console.error(`[WS] Error parsing message from ${clientId}:`, error);
      const errorMsg: ServerMessage = {
        type: 'ERROR',
        payload: { code: 'PARSE_ERROR', message: 'Invalid message format' },
      };
      ws.send(JSON.stringify(errorMsg));
    }
  });

  ws.on('close', () => {
    console.log(`[WS] Client disconnected: ${clientId}`);
    clients.delete(clientId);
    gameManager.handleDisconnect(ws);
  });

  ws.on('error', (error) => {
    console.error(`[WS] Error for client ${clientId}:`, error);
    clients.delete(clientId);
    gameManager.handleDisconnect(ws);
  });
});

// Start server
server.listen(PORT, () => {
  console.log(`[Server] Running on http://localhost:${PORT}`);
  console.log(`[Server] WebSocket available on ws://localhost:${PORT}`);
});
