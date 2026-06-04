# Looking Glass

> Your visual memory. Bookmarks, web clips, ideas — on an infinite canvas.

A local-first, open-source spatial memory system. Forked from [twitter-bookmarks-grid](https://github.com/destefanis/twitter-bookmarks-grid).

## Features (V0.1)

- ∞ Infinite canvas — pan, zoom, drag cards freely
- 🔗 Paste any URL → auto-fetch title, image, description
- 📌 Import X bookmarks via fieldtheory-cli JSON
- 💾 Auto-saves to your browser (IndexedDB)
- 📱 iPhone-ready PWA — add to home screen
- 📦 Export / Import your canvas as JSON

## Quick Start

```bash
pnpm install
pnpm dev
```

## Tech Stack

- Vanilla JS (no framework lock-in)
- IndexedDB for local storage
- Vite for builds (V0.2+)
- PWA with service worker
- GitHub Pages deployment

## Roadmap

- V0.1 — Infinite canvas + URL paste + bookmarks import
- V0.2 — Vite build, notes, images, groups, search
- V0.3 — Multi-canvas spaces, undo/redo, export formats
- V0.4 — React migration, SQLite, rich text editor
- V1.0 — Public launch
- V2.0 — AI integration, browser extension, collaboration

## License

MIT
