# Paper Magic - Online Playtesting Tool

## Project Overview
A real-time shared tabletop for playing paper Magic: The Gathering online with a friend. Not a rules engine - just a synchronized visual game state used alongside voice chat (Discord, etc.). Built for testing new sets before they hit Arena/MTGO.

## Tech Stack
- **Monorepo:** npm workspaces
- **Client:** React + TypeScript + Vite + Tailwind CSS + Radix UI + @dnd-kit + Zustand
- **Server:** Node.js + Express + ws (WebSocket)
- **Shared:** TypeScript types shared between client/server
- **Deployment:** Vercel (client) + Railway (server)

## Project Structure
```
paper-magic/
├── client/          # React frontend
├── server/          # Node.js backend
├── shared/          # Shared types - THE DATA CONTRACT
└── package.json     # Workspace root
```

## Key Architecture Decisions
1. **State authority:** Server is authoritative. Client sends actions, server broadcasts state updates.
2. **Scryfall proxy:** All card lookups go through server `/api/cards/resolve` to centralize caching and rate limiting.
3. **Zustand for client state:** Applies server-pushed updates, supports optimistic local actions.
4. **@dnd-kit for drag-drop:** Sortable for hand, droppable zones for battlefield/stack/etc.
5. **Battlefield positioning:** Absolute positioning with attachment snapping (auras/equipment tuck behind creatures).

## Important Patterns

### WebSocket Messages
- Client sends `ClientMessage` with `type`, `payload`, `requestId`
- Server sends `ServerMessage` with state updates
- All action types defined in `shared/types/actions.ts`
- **Always check `ws.readyState === WebSocket.OPEN` before sending** (see Known Gotchas)

### Card Instances
Every card in play has a unique `instanceId` (UUID). The `scryfallId` links to card data. This matters because a deck can have 4 copies of the same card.

### Undo/Redo
Action history stored on server. Undo reverts to previous state snapshot.

## Commands
```bash
npm run dev          # Starts both client and server in watch mode
npm run dev:client   # Client only (Vite on port 5173)
npm run dev:server   # Server only (Express on port 3001)
npm run typecheck    # Runs tsc across all packages
npm run build        # Production build
```

## Environment Variables
```
# server/.env
PORT=3001
NODE_ENV=development

# client/.env
VITE_API_URL=http://localhost:3001
VITE_WS_URL=ws://localhost:3001
```

## Code Style
- Prefer `function` declarations for React components
- Use named exports (not default) except for pages/routes
- Colocate types with their modules when specific, use shared/ for cross-boundary types
- Tailwind for styling - avoid CSS files
- Use Radix primitives for modals, dropdowns, dialogs

## Production URLs
- **Client:** https://paper-magic-client.vercel.app
- **Server:** https://paper-magic-production.up.railway.app
- **GitHub:** https://github.com/virtu333/paper-magic

## Current Status
Phase 3 complete. Core gameplay fully functional. See CHANGELOG.md for feature history.

**Future/Optional:**
- Smart alignment (snap cards to rows)

## Known Gotchas
- Scryfall rate limit: 10 req/sec - always use the server proxy
- DFCs (double-faced cards) have `card_faces` array, not `image_uris` at top level
- Adventure cards: the adventure part is in `card_faces[0]`, creature in `card_faces[1]`
- WebSocket reconnection: client should auto-reconnect and request current state
- WebSocket state mismatch: Zustand `connectionStatus` can show "connected" while `ws.readyState` is CLOSING - always check both before sending
