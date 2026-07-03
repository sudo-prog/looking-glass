# Agent Notes — Looking Glass
**Last updated:** 2026-07-03
**Status:** Build fixed, critical bugs patched, deployed to Vercel

---

## Project Overview

Spatial canvas app — infinite pan/zoom workspace with cards (notes, bookmarks, images, groups), stacks (fan animation), and folders (tab/thumbnail browser). Nothing OS x WebGPU glass aesthetic. Personal visual memory management and vision board system.

- **Live URL:** https://looking-glass-eta.vercel.app
- **Repo:** git@github.com:Sudo-Prog/looking-glass.git
- **Branch:** develop → deploy via Vercel
- **Stack:** React 18, Vite 5, Zustand, pnpm, IndexedDB (idb), TipTap, Fuse.js, html2canvas, jsPDF, react-hot-toast, Phosphor Icons
- **Glass:** WebGPU + SVG feDisplacementMap + CSS backdrop-filter with tiered fallback (tier 1-3)
- **PWA:** Service worker, manifest.json, apple-touch-icon
- **Deploy:** Vercel (auto-deploy from develop branch)

---

## Architecture

### Source Structure (key files)
```
looking-glass/           — main app (not in artifacts/ sub-dir)
  src/
    main.jsx             — entry: SW registration, glass tier detection, theme init
    App.jsx              — main layout, routing, undo/redo, keyboard handlers
    canvas/
      Canvas.jsx         — infinite pan/zoom canvas, drag, drop, selection
      CanvasCard.jsx     — card renderer (note, bookmark, image, group, stack, folder)
    components/
      LiquidGlassSidebar.jsx — sidebar (3-state: FAB → thin bar → full menu)
      LiquidGlassSidebar.css
      SettingsPanel.jsx  — settings (theme, glass, colors, background, typography, icons, AI, data)
      BookmarksPanel.jsx — bookmarks import (browser HTML, Twitter/X)
      CommandPalette.jsx — Ctrl+K, URL paste, search
      LiquidOrb.jsx      — AI orb (bottom center, provider setup, custom LLMs)
    data/
      schema.js          — IndexedDB schema, createItem deep-merge
      store.js           — openDB singleton, bulkImport atomicity, deleteCanvas
    store/
      useStore.js        — Zustand store (viewport, items, selection, search, undo/redo)
    history/
      HistoryManager.js  — undo/redo (add, delete, move, update)
    ui/
      SelectionToolbar.jsx  — floating bottom pill for multi-card actions
      FolderViewModal.jsx   — expanded folder grid with move-to-canvas + empty-all
      BlockTypeMenu.jsx     — Notion-style "turn into" block switcher
      Lightbox.jsx          — detail view
      BottomSheet.jsx    — mobile bottom sheet
      Minimap.jsx        — bird's-eye view of canvas
      ModeToggle.jsx     — sun/moon theme toggle
      ExportDialog.jsx   — export (JSON, PNG, PDF, markdown with HTML strip)
      spacesSlice.js     — Zustand spaces slice (extracted to break circular dep)
    utils/
      aiConfig.js        — AI provider config
      themeConfig.js     — theme config
      export/            — export utilities
  index.html             — Space Grotesk + Space Mono + Doto fonts, glass tier detection, theme init
  package.json           — pnpm@9, React 18, Vite 5
  vite.config.js         — base: '/' (Vercel root path)
  server.js              — minimal static server for production
  vercel.json            — Vercel deployment config (sw.js headers, rewrites)
```

### What's Live (deployed)
- Hamburger FAB → floating glass pill menu → thin icon bar → flyout panels
- Sun/moon theme toggle
- Settings panel
- AI Orb
- Bookmarks panel
- Command Palette (Ctrl+K)
- Sidebar 3-state cycle
- StackCard fan animation, FolderCard with drag-to-create
- Canvas pan/zoom, drag, history, selection
- Card types: note, bookmark, image, group, stack, folder
- PWA with service worker
- Dark/light mode with custom theme
- Cross-browser glass fallbacks
- Drag-to-reorder menu icons
- Export dialog with JSON/PNG/PDF/Markdown options

---

## Session History
- **2026-07-03:** Updated default AI provider from `nous` (Hermes) to `gemini-web2api` with model `gemini-3.5-flash`. Added OpenRouter as fallback provider. Added `ai-self-heal.js` — self-healing AI capability for DOM inspection, JS fixes, notification dismissal, and stale element cleanup. Integrated `@agent-native/core` for agent-native AI orchestration. Fixed AI Summarise sidebar to check for selection before opening. Added `refreshSpaceCount` calls after add/delete operations.
- **2026-07-02:** Fixed circular dependency (`useStore.js` ↔ `SpacesManager.jsx`) by extracting `spacesSlice.js`. Fixed build hang. Fixed viewport IDB thrashing (debounced 400ms), note spawn jitter, search HTML stripping, zoom state drift, handleFit no-op, NoteCard Tiptap editor destroy leak. Rebuilt and redeployed to Vercel.
- **2026-06-28:** Reference-capture feature update applied — all 11 files pass esbuild. Build clean. Deployed to Vercel.
- **2026-06-27:** SelectionToolbar, Canvas box-select, StackCard cascade, FolderCard silhouette, FolderViewModal, BlockTypeMenu, Lightbox rewrite, ContextMenu updates.
- **2026-06-11:** Full theme customization + background image + custom LLMs, bug fixes.
- **2026-06-10:** Menu UI deep audit + redesign.
- **2026-06-08:** Bug audit (20 bugs fixed), cross-browser CSS/JS fixes.
- **2026-06-05:** V2 rewrite, spec-kit init, design brief, phases 1-9, deploy setup.

---

## Remaining Work (from "Looking Glass Remaining.txt")

### CRITICAL / Highest Impact
1. **Onboarding demo canvas** — app opens to blank screen; new users have no idea what to do.
2. **GitHub auto-backup** — OAuth flow → user picks private repo → canvas JSON auto-commits on save
3. **Touch / mobile gesture parity** — pinch-to-zoom, two-finger pan, tap behaviors for PWA on iPhone/Android

### HIGH IMPACT / Product Quality
4. **Backgrounds & themes** — dark/light/custom canvas textures
5. **Micro-sounds** — subtle audio feedback on card drop, create, delete

### POLISH / Completeness
6. **Tests** — Vitest unit tests + Playwright E2E
7. **Design.md a11y report**
8. **Design token live preview**

### COMMERCIAL / Phase 4
9. **Cloud sync** — Supabase
10. **Real-time collaboration** — Yjs CRDT
11. **Version history / timeline**
12. **Browser extension**
13. **Plugin system**
14. **Monetisation** — Stripe/Lemon Squeezy

---

## Common Pitfalls
- **Drizzle not used** — this project uses IndexedDB (idb) + Zustand, not PostgreSQL/Drizzle
- **React 18** — not React 19 like the studio projects
- **Vite base path** — is `/` for Vercel (the app is on Vercel, not GitHub Pages)
- **Glass tier detection** — inline script in index.html runs before React hydration
- **Theme init** — inline script in index.html sets data-theme before React to prevent FOUC
- **pnpm only** — preinstall script blocks npm/yarn
- **Deploy branch** — `develop` → Vercel auto-deploys (no GitHub Actions needed for Vercel)
- **CDN cache** — can lag 30-60s after push
- **Circular deps** — `useStore.js` ↔ `SpacesManager.jsx` was a build-killer; now separated via `spacesSlice.js`

---

## AI Configuration
- **Default Provider:** `gemini-web2api` (model: `gemini-3.5-flash`) — runs locally via gemini-web2api proxy at `/api/chat`
- **Fallback Provider:** `openrouter` — uses `OPENROUTER_API_KEY` env var, defaults to `openrouter/free` model
- **Self-Heal:** `src/utils/ai-self-heal.js` — provides DOM snapshot, EVAL, FIX_NOTIFICATIONS, and CLEAR_STALE operations
- **Provider Fallback Order:** `gemini-web2api` → `openrouter` → `nous` (Hermes)

## File Reference
| Path | Purpose |
|------|---------|
| `src/utils/ai-self-heal.js` | Self-healing AI capability (DOM inspection, JS fixes, notification cleanup) |
| `src/utils/aiConfig.js` | AI provider config (default: gemini-web2api, fallback: openrouter) |
| `src/main.jsx` | Entry point |
| `src/App.jsx` | Main layout, undo/redo, keyboard handlers |
| `src/canvas/Canvas.jsx` | Infinite canvas, drag, drop, selection |
| `src/canvas/CanvasCard.jsx` | Card renderer |
| `src/components/LiquidGlassSidebar.jsx` | Sidebar |
| `src/data/schema.js` | IndexedDB schema |
| `src/data/store.js` | IndexedDB store |
| `src/store/useStore.js` | Zustand store |
| `src/ui/spacesSlice.js` | Spaces slice (extracted, no circular dep) |
| `src/ui/SpacesManager.jsx` | Spaces manager panel |
| `src/history/HistoryManager.js` | Undo/redo |
| `src/ui/BottomSheet.jsx` | Mobile bottom sheet |
| `index.html` | Fonts, glass tier, theme init |
| `vite.config.js` | Vite config (base: '/' for Vercel) |
| `server.js` | Static server |
| `vercel.json` | Vercel deployment config |
| `AUDIT_FIXES.md` | Audit fix instructions |
| `AUDIT_REPORT.md` | Full audit report |
| `BUG_AUDIT_REPORT.md` | Bug audit |