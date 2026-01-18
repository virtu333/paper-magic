# Changelog

All notable changes to Paper Magic will be documented in this file.

## [Unreleased]

## [2025-01-18] - Goldfish Mode (Solo Practice)

### Added
- **Goldfish Mode** - Single-player practice mode for testing decks without an opponent
  - "Play Solo (Goldfish)" button appears in lobby while waiting for opponent
  - Creates a dummy opponent with empty zones
  - Turn always stays with player (no alternating)
  - Mulligan transitions immediately after keeping (no waiting)
  - Purple-themed UI indicators throughout (lobby, game board, turn indicator)
  - Works with all existing features (draw, play, untap all, save/load, etc.)

### Technical Details
- Added `isGoldfishMode: boolean` to `GameState`
- Added `ENABLE_GOLDFISH` action type
- Server creates dummy opponent player with `hasKeptHand: true` and `readyForNextGame: true`
- `PASS_TURN` keeps `activePlayer` at 0 in goldfish mode
- `MULLIGAN_KEEP` transitions to playing phase immediately in goldfish mode
- `READY_FOR_NEXT_GAME` skips opponent check in goldfish mode

## [2025-01-17] - Start Game Bug Fix & WebSocket Reliability

### Fixed
- **"Start Game" button doing nothing** - Fixed silent failures when clicking Start Game
  - Added error display to GameLobby (previously errors were set but never shown)
  - Added `ws.readyState` checks before all WebSocket sends (Zustand state could show "connected" while socket was closing)
  - Wrapped all `ws.send()` calls in try-catch to prevent uncaught exceptions
  - Added server-side logging to track STATE_UPDATE delivery to each player

### Technical Details
- Files modified: `GameLobby.tsx`, `gameStore.ts`, `gameManager.ts`
- All client WebSocket methods now check `ws.readyState === WebSocket.OPEN` before sending
- Server logs when STATE_UPDATE is sent or skipped for each player
- Error messages now visible in lobby UI with dismiss button

## [2025-01-16] - Cross-Player Interactions & Attachment Ordering

### Added
- **Cross-player card interactions**
  - Attach cards to opponent's creatures (Pacifism, Control Magic, etc.)
  - Exile opponent's cards under your permanents (Oblivion Ring, Banisher Priest, etc.)
  - Context menu options for targeting opponent's permanents
- **Attachment ordering**
  - "Bring to Front" moves an attachment visually above other attachments on the same host
  - "Send to Back" moves an attachment visually behind other attachments on the same host
  - Attachments sorted by zIndex (higher = visually on top)

### Changed
- Added `zIndex` property to Card type for ordering support
- Updated CardContextMenu with cross-player interaction options
- Server now handles ATTACH_TO_OPPONENT_CARD and TAKE_OPPONENT_CARD actions

### Technical Details
- Attachments are sorted by zIndex descending in `Battlefield.tsx`
- Higher zIndex = sortIndex 0 = CSS zIndex -1 = visually closest to host card
- BRING_TO_FRONT sets card zIndex to max + 1
- SEND_TO_BACK sets card zIndex to 1 and bumps all others up

## [2025-01-15] - About Page & Documentation

### Added
- About section on lobby page with how-to guide and feature list
- Documentation for cross-player interaction feature plan

## [2025-01-14] - Production Deployment

### Added
- Vercel deployment for client
- Railway deployment for server
- Production environment configuration

## [Initial Release] - Core Game Features

### Added
- Real-time multiplayer game state synchronization via WebSocket
- Full game lifecycle: lobby → mulligan → playing → sideboarding → finished
- Card actions: tap, untap, flip, transform, counters, attachments
- Drag-drop card movement between all zones
- Token creation and destruction
- Life tracking with ledger history
- Player counters (poison, energy, experience)
- London mulligan with bottom cards selection
- Undo/redo system
- Save/load game state
- Auto-reconnection on disconnect
- Scryfall card resolution with server-side caching
- Keyboard shortcuts and context menus
- Universal context menus for all zones
- Reveal functionality (hand, top X of library)
- Exile zone counters for Suspend
