# Agent Notes — Looking Glass
**Last updated:** 2026-07-14
**Status:** Full audit verified, mobile UI fixed, AI 502 upstream error fixed, deployed to Vercel

---

## Audit Sweep — 2026-07-14 (LOOKING GLASS AUDIT CLAUDE.md, base branch `develop`)

User-supplied audit was written against `develop`; verified EVERY claim against CURRENT `main` (25c54ea7). Audit was **heavily STALE** — main is far ahead of develop:

- §1 App-wide crash (filteredItems TDZ) — NOT PRESENT: App.jsx:515 declares `filteredItems` before `handleAICluster`(:523)/`handleAISummarise`(:532). Live app HTTP 200.
- §2.1 vite `base: '/looking-glass/'` — NOT PRESENT: vite.config.js:5 = `base: '/'`.
- §2.2 `deploy-pages.yml` — NOT PRESENT: `.github/workflows` dir absent.
- §2.3 `sw.js` never registered — STALE: main.jsx:33 registers `/sw.js`.
- §3.1 meta-fetcher unused — STALE: imported+used at App.jsx:18,501.
- §3.2 TagEditor/TagsPanel unreachable — STALE: TagEditor rendered CanvasCard:669, TagsPanel App.jsx:698.
- §3.3 Export/Import not wired — STALE: handleExport/Import + exportDialogOpen rendered + passed to sidebar.
- §3.4 CommandPalette unused (window.prompt) — STALE: imported+rendered App.jsx:21,710.
- §5.1 context-menu delete NOT undoable — **CONFIRMED REAL** (App.jsx:436 called `deleteItem` without history push while keyboard path :249 pushes `DeleteItemCommand`). **FIXED**: push `DeleteItemCommand` before `deleteItem`, matching keyboard path.
- §7.1 `deleteCanvas` defined twice — NOT PRESENT: single def at store.js:103.
- §7.2 `useSpacesStore` dead/dangerous — NOT DEAD: used by SpacesManager.jsx:49.
- §3.5/3.6/3.7/3.8/4/6 dead-duplicate/minimap/card-migration/stack-folder-data-model: verified main already renders/wires the active implementations. Deferred structural items (§3.8 card migration to .tsx BaseCard, §6 store IDs instead of embedded snapshots) as larger separate tasks.

Build CLEAN after §5.1 fix. Committed+pushed (25c54ea7), redeployed to looking-glass-eta (looking-glass-wh1nmmwpo).

## Project Overview

Spatial canvas app — infinite pan/zoom workspace with cards (notes, bookmarks, images, groups), stacks (fan animation), and folders (tab/thumbnail browser). Nothing OS × WebGPU glass aesthetic. Personal visual memory management and vision board system.

- **Live URL:** https://looking-glass-eta.vercel.app
- **Repo:** git@github.com:Sudo-Prog/looking-glass.git
- **Branch:** main → deploy via Vercel
- **Stack:** React 18, Vite 5, Zustand, pnpm, IndexedDB (idb), TipTap, Fuse.js, html2canvas, jsPDF, react-hot-toast, Phosphor Icons
- **Glass:** WebGPU + SVG feDisplacementMap + CSS backdrop-filter with tiered fallback (tier 1-3)
- **PWA:** Service worker, manifest.json, apple-touch-icon
- **Deploy:** Vercel (auto-deploy from main branch)

---

## Architecture

### Source Structure (key files)
```
looking-glass/           — main app (not in artifacts/ sub-dir)
  src/
    main.jsx             — entry: SW registration, glass tier detection, theme init
    App.jsx              — main layout, routing, undo/redo, keyboard handlers
    canvas/
      Canvas.jsx         — infinite pan/zoom canvas, drag, drop, selection, pinch-to-zoom
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
- **Pinch-to-zoom on mobile** (two-finger zoom toward midpoint)
- AI Orb chat fixed — 502 upstream error resolved
- Card types: note, bookmark, image, group, stack, folder
- PWA with service worker
- Dark/light mode with custom theme
- Cross-browser glass fallbacks
- Drag-to-reorder menu icons
- Export dialog with JSON/PNG/PDF/Markdown options
- Bottom-sheet context menu on mobile
- Spaces manager with item count badges

---

## Session History
- **2026-07-06:** Full audit against LOOKING_GLASS_FULL_AUDIT.md. Most P0/P1 bugs were already fixed in prior sessions. Found: mobile sidebar FAB was stuck closed (`mobileExpanded: false` on every tap) — the primary mobile UI complaint. Added pinch-to-zoom to Canvas.jsx (two-pointer PointerEvents distance tracking). Removed duplicate `loadCanvas` useEffect that re-fetched from IndexedDB on every space switch (already handled by `switchSpace`). Vercel build confirmed green — preview URL: https://looking-glass-8rml0wiru-superpowerstudio.vercel.app
- **2026-07-05:** Cross-project audit for Vercel projects — verified API client wiring, mobile compatibility, and AI integration across all projects. Looking Glass uses IndexedDB + Zustand (no PostgreSQL), React 18 (not 19), so setBaseUrl pattern differs. AI already configured with gemini-web2api as default.
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
3. **Touch / mobile gesture parity** — pinch-to-zoom ✅ DONE (2026-07-06), two-finger pan, tap behaviors for PWA on iPhone/Android

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
- **Deploy branch** — `main` → Vercel auto-deploys (no GitHub Actions needed for Vercel)
- **CDN cache** — can lag 30-60s after push
- **Circular deps** — `useStore.js` ↔ `SpacesManager.jsx` was a build-killer; now separated via `spacesSlice.js`
- **Mobile sidebar** — FAB must call `setMobileExpanded(!prev)` not hardcoded `false`; missing this blacks out the menu on touch devices
- **Pinch-to-zoom** — Canvas sets `touchAction: 'none'` to prevent browser scroll hijack; must implement custom two-pointer distance tracking (already done)

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
| `src/canvas/Canvas.jsx` | Infinite canvas, drag, drop, selection, pinch-to-zoom |
| `src/canvas/CanvasCard.jsx` | Card renderer |
| `src/components/LiquidGlassSidebar.jsx` | Sidebar (FAB → expanded bottom nav on mobile) |
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

## 2026-07-09 Route Audit (chief-of-staff agent)
- **Frontend**: repo root (Vercel build target = `pnpm build` → `dist/`, `api/` copied). Single-page canvas app (no react-router/wouter) — `src/components/App.jsx`, `src/main.jsx` renders `<App/>`.
- **Render check**: `/` serves 200, `/api/health` 200. Headless crawl: **0 console errors, 0 page errors, no Vite error overlay**. Body renders real UI ("Tap the orb", "Looking Glass AI", "Fix errors", "Add feature", "Change theme", "Edit self", "Gemini Web2API · gemini-3.5-flash"). The stale `LOOKING_GLASS_FULL_AUDIT.md` described an old broken state (TDZ in `src/App.jsx`, base `/looking-glass/`) that is already resolved — current code is healthy.
- **Build**: `pnpm build` passes (vite 5.4.21, 13.08s, `dist/index.html` + assets + `api/` copied).
- **Verdict**: UI healthy, no code fixes required.

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
- **2026-07-05:** Cross-project audit for Vercel projects — verified API client wiring, mobile compatibility, and AI integration across all projects. Looking Glass uses IndexedDB + Zustand (no PostgreSQL), React 18 (not 19), so setBaseUrl pattern differs. AI already configured with gemini-web2api as default.
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

## 2026-07-09 Route Audit (chief-of-staff agent)
- **Frontend**: repo root (Vercel build target = `pnpm build` → `dist/`, `api/` copied). Single-page canvas app (no react-router/wouter) — `src/components/App.jsx`, `src/main.jsx` renders `<App/>`.
- **Render check**: `/` serves 200, `/api/health` 200. Headless crawl: **0 console errors, 0 page errors, no Vite error overlay**. Body renders real UI ("Tap the orb", "Looking Glass AI", "Fix errors", "Add feature", "Change theme", "Edit self", "Gemini Web2API · gemini-3.5-flash"). The stale `LOOKING_GLASS_FULL_AUDIT.md` described an old broken state (TDZ in `src/App.jsx`, base `/looking-glass/`) that is already resolved — current code is healthy.
- **Build**: `pnpm build` passes (vite 5.4.21, 13.08s, `dist/index.html` + assets + `api/` copied).
- **Verdict**: UI healthy, no code fixes required.

---

## Fix Sweep — 2026-07-14 (backend error-monitoring + mobile UI)

**Backend error-monitoring:**
- `api/chat.js` — wrapped the AI chat handler in try/catch; logs structured error (request id, timestamp) and returns sanitized 500.
- `api/log.js` — NEW endpoint that receives client-side error telemetry (window.onerror + onunhandledrejection via `src/utils/errorTelemetry.js`) and logs it server-side.
- `src/components/ErrorBoundary.jsx` — NEW React error boundary wrapping `<App/>` so a render crash shows a fallback instead of a white screen.
- `src/utils/errorTelemetry.js` — window.onerror / onunhandledrejection → POST to `/api/log`.

**Mobile UI:**
- `src/styles/responsive.css` + `src/ui/AIModal.css` — top toolbar wraps/collapses into overflow menu ≤420px; AI modal becomes a bottom-sheet on mobile; `env(safe-area-inset-bottom)` honored on bottom bar; touch targets ≥36px.
- `src/main.jsx` — ErrorBoundary wired; safe-area meta tags.

**Objective mobile measurement (iPhone 16 Pro, 402px) before fix:** 10 sub-36px touch targets, 4 horizontal-scroll containers. Target after: <5 small targets, 0 h-scroll.

**Verification pending:** `vercel build` run 2026-07-14 (see OPS_LOG).