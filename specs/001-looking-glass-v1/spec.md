# Looking Glass — Visual Memory System (V1.0)

## Overview
A local-first, open-source spatial memory system. Bookmarks, web clips, ideas — on an infinite canvas.

## User Stories

### US-1: Infinite Canvas (P1)
As a user, I want an infinite canvas where I can freely pan, zoom, and arrange cards.
- **Given** I open the app, **When** I drag the canvas, **Then** the view pans smoothly
- **Given** cards are on the canvas, **When** I scroll/pinch, **Then** zoom in/out works
- **Given** I right-click the canvas, **Then** I can create a new card at that position

### US-2: URL Paste (P1)
As a user, I want to paste a URL and automatically get a card with title, image, and description.
- **Given** I'm on the canvas, **When** I press Ctrl+V with a URL in clipboard, **Then** a new card is created with metadata
- **Given** a URL is pasted, **When** metadata fetching fails, **Then** a card is created with the URL as title

### US-3: Local Storage (P1)
As a user, I want my canvas to auto-save to my browser so I don't lose data.
- **Given** I make changes, **When** I close and reopen the browser, **Then** my canvas is restored
- **Given** I have saved data, **When** I clear browser data, **Then** I get a warning that data will be lost

### US-4: Search (P2)
As a user, I want to search all cards by content, title, or URL.
- **Given** cards exist, **When** I type in the search bar, **Then** matching cards are highlighted
- **Given** no matches, **When** I search, **Then** a "no results" message is shown

### US-5: Groups (P2)
As a user, I want to group related cards together with colored labels.
- **Given** cards are selected, **When** I click "Group", **Then** a colored group is created
- **Given** a group exists, **When** I drag it, **Then** all cards in the group move together

### US-6: Undo/Redo (P2)
As a user, I want to undo and redo canvas changes.
- **Given** I make a change, **When** I press Ctrl+Z, **Then** the change is undone
- **Given** I undo, **When** I press Ctrl+Y, **Then** the change is redone

### US-7: Export (P3)
As a user, I want to export my canvas as JSON or PNG.
- **Given** cards exist, **When** I click "Export JSON", **Then** a .json file downloads
- **Given** cards exist, **When** I click "Export PNG", **Then** a .png image downloads
- **Given** cards exist, **When** I click "Export PDF", **Then** a .pdf file downloads
- **Given** cards exist, **When** I click "Export Markdown", **Then** a .md file downloads

### US-8: PWA (P3)
As a user, I want to install the app on my phone home screen.
- **Given** I'm on mobile, **When** I tap "Add to Home Screen", **Then** the app installs
- **Given** the app is installed, **When** I open it, **Then** it launches in standalone mode

## Functional Requirements

- FR-001: Canvas supports infinite pan and zoom (mouse wheel, pinch, right-click drag)
- FR-002: Cards can be created, moved, resized, and deleted
- FR-003: URL paste auto-fetches metadata (title, image, description)
- FR-004: All data persists in IndexedDB
- FR-005: Search indexes card titles, URLs, and content
- FR-006: Groups have colored labels and can be collapsed
- FR-007: Undo/redo stack supports 50+ operations
- FR-008: Export supports JSON, PNG, PDF, Markdown formats
- FR-009: PWA manifest with correct start_url and scope for GitHub Pages
- FR-010: Service worker caches app shell for offline use

## Key Entities

- **Card**: { id, type, x, y, width, height, content, url, title, image, description, createdAt, updatedAt }
- **Group**: { id, name, color, cardIds[], x, y }
- **Canvas**: { zoom, panX, panY, cards[], groups[] }

## Success Criteria

- SC-001: Canvas renders at 60fps with 100+ cards
- SC-002: URL paste creates a card within 2 seconds
- SC-003: Search returns results within 100ms
- SC-004: Export JSON produces valid, re-importable data
- SC-005: PWA installs and launches offline on iOS and Android
- SC-006: Undo/redo works for all card operations

## Assumptions

- User has a modern browser (Chrome, Firefox, Safari, Edge)
- IndexedDB is available and not full
- Network is available for URL metadata fetching (graceful fallback if not)

## Edge Cases

- URL paste with invalid URL → show error, create card with raw URL
- IndexedDB full → show warning, offer export
- Very large canvas (1000+ cards) → virtualize rendering
- Concurrent tabs → last-write-wins with conflict warning
