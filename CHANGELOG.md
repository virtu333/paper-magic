# Changelog

All notable changes to Paper Magic will be documented in this file.

## [Unreleased]

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
