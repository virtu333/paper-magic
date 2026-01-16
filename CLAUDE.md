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

## Game Zones
- Deck (hidden, count visible)
- Hand (yours visible, opponent sees backs)
- Stack (shared, visible to both)
- Battlefield (absolute positioned cards)
- Graveyard (expandable list)
- Exile Active (adventures, impulse draw - retrievable)
- Exile Permanent (gone forever)
- Sideboard (between games)

## Important Patterns

### WebSocket Messages
- Client sends `ClientMessage` with `type`, `payload`, `requestId`
- Server sends `ServerMessage` with state updates
- All action types defined in `shared/types/actions.ts`

### Card Instances
Every card in play has a unique `instanceId` (UUID). The `scryfallId` links to card data. This matters because a deck can have 4 copies of the same card.

### Undo/Redo
Action history stored on server. Undo reverts to previous state snapshot.

## Commands
```bash
# Development
npm run dev          # Starts both client and server in watch mode
npm run dev:client   # Client only (Vite on port 5173)
npm run dev:server   # Server only (Express on port 3001)

# Type checking
npm run typecheck    # Runs tsc across all packages

# Build
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

## Testing Approach
Manual testing during development. Game state is visual - verify by playing test games.

## Production URLs
- **Client:** https://paper-magic-client.vercel.app
- **Server:** https://paper-magic-production.up.railway.app
- **GitHub:** https://github.com/virtu333/paper-magic

## Current Phase
Phase 3 - Cross-Player Interactions (PLANNED)

**Completed Features:**
- Game lifecycle: lobby → mulligan → playing → sideboarding → finished
- All card actions: tap, untap, flip, transform, counters, attachments
- Card movement between all zones with drag-drop
- Token creation/destruction
- Life tracking with ledger history
- Player counters (poison, energy, experience)
- London mulligan with bottom cards
- Undo/redo system
- Save/load game state
- Auto-reconnection
- Scryfall card resolution with caching
- Keyboard shortcuts and context menus
- **Universal context menus** - Right-click any card in any zone to move anywhere
- **Reveal functionality** - Reveal hand or top X cards to opponent
- **Responsive dashboard** - Fixed layout issues when resizing
- **Exile zone counters** - Support for Suspend (time counters)
- **Production deployment** - Vercel (client) + Railway (server)
- **About page** - How-to and feature description on lobby

**Next Up: Cross-Player Card Interactions**
See detailed plan: `.claude/plans/iridescent-yawning-diffie.md`

Goal: Enable cards to interact with opponent's battlefield for common MTG scenarios:
- **Pacifism-style**: Your aura attaches to opponent's creature
- **O-Ring/Hearse-style**: Opponent's card "exiled under" your permanent

Key changes needed:
1. Add `attachedToOwner` field to Card interface
2. New actions: `ATTACH_TO_OPPONENT`, `TAKE_AND_ATTACH`, `MOVE_TO_OPPONENT_ZONE`
3. Enable dropping on opponent's battlefield
4. Add context menus: "Attach to Opponent's..." and "Exile Under..."
5. Update server to handle cross-player card lookups

**Future/Optional:**
- Smart alignment (snap cards to rows)
- Attachment ordering (Bring to Front / Send to Back)

## Known Issues (To Fix)
1. **Hand cards missing context menu** - Right-click on hand cards doesn't show CardContextMenu. Hand.tsx needs to wrap cards in CardContextMenu like Graveyard/ExileZone do.
2. **Context menu z-index in popups** - When right-clicking cards in expanded Graveyard/Exile popup, the context menu appears behind the popup. Need to increase z-index on CardContextMenu.Content (currently z-50).
3. **Smart snap not implemented** - Cards don't snap to rows. DndProvider.tsx needs snap logic added.

## Known Gotchas
- Scryfall rate limit: 10 req/sec - always use the server proxy
- DFCs (double-faced cards) have `card_faces` array, not `image_uris` at top level
- Adventure cards: the adventure part is in `card_faces[0]`, creature in `card_faces[1]`
- WebSocket reconnection: client should auto-reconnect and request current state
