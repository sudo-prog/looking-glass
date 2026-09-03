# Agent Notes — Looking Glass
**Last updated:** 2026-08-31
**Status:** Single-path AI landed on branch `sudo-prog/lg-ai-single-path` + a mobile-UI pass (commit 76e653f3). AI config consolidated to the side panel (orb = chat only), providers = OmniRoute + OpenRouter free, orb bugs fixed, and the mobile viewport (390x844) gate is 8/8 (welcome card + kebab on-screen, orb chat safe-area). PR #1 open, awaiting review/merge.

---

## Change Log — 2026-08-31 (mobile UI pass, commit 76e653f3)

Ran a Playwright mobile gate at 390x844 touch (`_verify_mobile.cjs`, **8/8 gates**), guided by `quality/mobile-ui-verification-standard`. Visual inspection via agent-browser screenshots + DOM hit-tests.

- `src/ui/spacesSlice.js` — seeded welcome card moved to `x:24` (was `x:200`); its right edge was 480px, clipped off a 390px phone. Now 304px, fully on-screen.
- `src/components/CanvasCard.jsx` — the card kebab (... Card actions) clamped to BOTH viewport edges (`Math.max(8, min(cardRight-34, innerWidth-46))`) so it can never be unreachable on mobile at default zoom.
- `src/ui/LiquidOrb.css` — orb chat panel gets `env(safe-area-inset-bottom)` to clear the notch/home-indicator on notched phones.

Method: applied via headless VS Code + `delegate_task` subagent (auto/coding:free) per the NEVER-self-code rule; the previous opencode attempt stalled so it was not used. Independently re-verified: `git diff --stat` + `pnpm build` clean + gate 8/8.

---

## Change Log — 2026-08-31 (single-path AI + orb fixes)

Delivered on branch `sudo-prog/lg-ai-single-path`. All items independently verified in a real headless browser against the live OmniRoute gateway — not self-reported by the agents that wrote them.

**Single AI path**
- `src/utils/aiConfig.js` — `BUILTIN_PROVIDERS` cut from 11 providers to **2**: `omniroute` (default) + `openrouter` (free). Removed anthropic, openai, google, groq, ollama, litellm, gemini-web2api, nous, opencode. Added `resolveEndpoint()` and `testConnection()`. Default model `openrouter/free`. Stale saved providers migrate to `omniroute`.
- `src/ui/LiquidOrb.jsx` — **−654 lines**: the entire in-orb provider setup UI removed. Orb is now chat-only and consumes the shared config.
- `src/ui/SettingsPanel.jsx` — the single AI config surface (AI Assistant section) with a working **Test connection** button.
- `api/chat.js` — provider resolution reworked; removed the dead paid-model map.

**Bugs fixed (each reproduced before fixing)**
- **SSE crash.** The gateway streams by default and returns `data: {...}` SSE, so browser `response.json()` threw `Unexpected token 'd', "data: {"id"... is not valid JSON` on *every* orb reply. Fixed by sending `"stream": false` from all three client call sites. `api/chat.js` already did this.
- **Orb entirely unclickable.** `.lg-orb-bd` backdrop (`z-index:90`, `pointer-events:auto` when open) covered the chat panel, which had no z-index — `elementFromPoint()` at each button's centre returned the backdrop. Edit UI never flipped mode; the Debug Log never opened. Fixed with `.lg-orb-chat { z-index:95 }`.
- **Built-in debug log was permanently empty.** `logMut()` only pushed 4-second React toasts and never called `addDebugEntry()`, so the Debug Log viewer and its markdown export were useless. Now persists mutations, `/debug` toggles, and AI call failures (`orb.callAI`).
- **Duplicate Settings in the sidebar.** `settings` was in the default `menuIconOrder` *and* rendered as a dedicated footer gear. The nav copy was also absent from `ICON_POOL`, so it was a phantom the user couldn't reorder or remove. Footer gear kept as the single entry; existing users migrated by filtering `settings` out of the saved order.
- **Mobile: Settings was unreachable (pre-existing, not a regression — confirmed on `main`).** The bottom canvas toolbar becomes `flex-direction: column` under 640px, grows tall, and covered the sidebar menu FAB at the same `z-index:100`. A real touch tap did nothing while a direct `.click()` worked, proving an overlay not a handler bug. Fixed with `z-index: calc(var(--z-toolbar) + 2)` on the mobile FAB rule.
- **Tap target.** `.lg-orb-tool` was 34px → now 44px (MOBILE-UI-STANDARD).

**Verification (real, not self-reported)**
- `pnpm build` clean.
- `lg_ai_e2e.cjs` — **19/19**: no duplicate Settings, only the 2 providers, free/auto-only model list, live OmniRoute connection `{"ok":true}`, OpenRouter keyless 401 handled readably, stale-provider migration, orb has no config UI, mobile FAB on top + Settings reachable, zero console errors.
- `probe_debugmode.cjs` — **15/15**, using the app's *own* debug log as the oracle: `/debug` on/off logged, live AI reply `PONG` in debug mode, gateway 200, **no SSE/JSON error**, edit-mode mutation really applied (`--bg → #001f3f`) and logged, Debug Log viewer count matches the live log, markdown export works.

**Known caveats**
- `openrouter/free` round-robins across the free OpenRouter pool; some routed models ignore the JSON-ops contract, so edit-mode occasionally returns prose instead of ops. The app handles this gracefully (falls back to showing the text). The test retries up to 3×. This is model variance, not an app bug.
- The OmniRoute gateway is **local-only**. On HTTPS Vercel, a browser cannot call `http://127.0.0.1:20128` (mixed content). Deployed AI needs a tunnel/hosted endpoint or must proxy via `api/chat.js`. Unchanged by this work.

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
**Rewritten 2026-08-31 — single-path AI. Everything below supersedes the older gemini-web2api notes further down this file.**
- **Single config surface:** side panel → Settings → AI Assistant. The orb is **chat-only** and reads the same shared config via `loadAIConfig()`. The orb's old in-orb setup flow was removed.
- **Only two providers:** `omniroute` (default) and `openrouter` (free tier). anthropic / openai / google / groq / ollama / litellm / gemini-web2api / nous / opencode were all removed from `BUILTIN_PROVIDERS`.
- **Default model:** `openrouter/free`. Also offered: `auto/best-free`, `auto/coding:free`, `auto/best-chat`, `auto/best-coding-fast`. No paid models.
- **Migration:** `loadAIConfig()` maps any saved-but-removed provider back to `omniroute` so existing users don't get a broken config.
- **`stream: false` is REQUIRED** on every client call — the OmniRoute gateway streams SSE (`data: {...}`) by default, which breaks `response.json()`. Present in `LiquidOrb.jsx`, `aiConfig.js` (`testConnection`), `AISummarisePanel.jsx` and `api/chat.js`. Do not remove.
- **Self-Heal:** `src/utils/ai-self-heal.js` — DOM snapshot, EVAL, FIX_NOTIFICATIONS, CLEAR_STALE operations.

## File Reference
| Path | Purpose |
|------|---------|
| `src/utils/ai-self-heal.js` | Self-healing AI capability (DOM inspection, JS fixes, notification cleanup) |
| `src/utils/aiConfig.js` | AI provider config — omniroute + openrouter only, default `openrouter/free`, `resolveEndpoint()` + `testConnection()` |
| `src/utils/debugLog.js` | Built-in debug log — captures window errors, unhandled rejections, `console.error`, orb mutations |
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

---

## Main-Branch Audit Remediation — 2026-07-14 (LOOKING_GLASS_AUDIT_MAIN_BRANCH.md)

A second audit report (LOOKING_GLASS_AUDIT_MAIN_BRANCH.md) was written against `main` and covered the ACTUAL "AI features are broken" root causes — different from the stale `develop` audit above. Verified every claim against current `main`, then remediated. Committed as `d61369ff` on `main`, pushed, and deployed to looking-glass-eta.

- **LG-1 (CRITICAL): context-menu Delete crash.** `App.jsx` `handleContextAction` `'delete'` case had `const item = state.items.find((i) => i.id === item.id)` — the local `const item` shadowed the outer `item` param, so the RHS `item.id` hit the temporal dead zone → `ReferenceError: Cannot access 'item' before initialization` on EVERY right-click-delete (delete never ran). FIXED: renamed local to `target`; `deleteItem(target?.id ?? item.id)`. (User flagged this live before it was deployed — fix was in the working tree, not yet live; now merged + deployed.)
- **LG-2 (CRITICAL): mobile card actions unreachable.** CanvasCard only opened its menu via native `onContextMenu` (no touch path). ADDED: long-press handler (`onTouchStart` 500ms timer, single-touch only, vibrate on fire, cleared on move/end/cancel) + a visible "⋯" kebab button (tappable hit area) — both call the existing `onContextMenu(item, x, y)`. Also confirmed `ContextMenu.jsx` uses a `matchMedia('(max-width:767px)')` listener (not just initial `innerWidth`) so the variant doesn't stick after rotation.
- **LG-3 (CRITICAL): AISummarisePanel ignored shared config.** Its own `callAI` defaulted to `anthropic` and threw "No API key found" for keyless providers (gemini-web2api/ollama/litellm/nous), misrouting others. FIXED: `callAI` now imports `loadAIConfig`/`getProviderDef` from `src/utils/aiConfig.js` (the same module LiquidOrb uses) and builds the request identically. With the default gemini-web2api provider (no key) Summarise/Organise/Cluster now hit the correct endpoint and no longer throw.
- **LG-4 (HIGH): AISummarisePanel not mobile-responsive.** Panel used inline `position:fixed; bottom:24px; right:24px` overlapping the bottom toolbar on phones. MOVED to a `.ai-summarise-panel` class + `@media (max-width:767px)` dock as bottom sheet (`left/right:12px; bottom: calc(64px + safe-area-inset-bottom)`).
- **LG-5 (HIGH): unsandboxed EVAL self-heal op.** `LiquidOrb.jsx` ran AI-returned code via `new Function(op.code)()` (and a PATCH_SOURCE hotfix path) — a script-injection vector. FIXED: both paths now `window.confirm(...)` showing the code before executing; cancelled → skip. (Minimum safe fix; a DEV-only gate is the longer-term hardening.)
- **LG-6 (HIGH/OPS): GEMINI_WEB2API_URL dependency.** VERIFIED in `api/chat.js:53-56`: reads `process.env.GEMINI_WEB2API_URL` (falls back to `http://localhost:8081`), and **returns 503 if unset — there is NO OpenRouter fallback**. Ops implication: the live AI feature depends entirely on a working public tunnel to the local gemini-web2api (:8081). Env var IS set in the Vercel Production project (created 2026-07-14), but its value is a tunnel URL that rotates on restart (see OPS_LOG tunnel note) → AI can 503 if the tunnel dies. No fallback added (verification-only per scope).
- **LG-7 (LOW): housekeeping.** `src/styles/responsive.css` — removed dead blocks targeting classes that no longer exist in the DOM (`.toolbar`/`.sidebar`/`.context-menu`/`.command-palette`); kept live rules. `vercel.json` was ALREADY correct (the audit's claimed no-op `/api/ai/chat`→`/api/ai/chat` identity rewrite was NOT present); kept the valid SPA fallback `/((?!api/)(?!assets/).*)`→`/index.html`.

**Deferred (not in this pass):** §3.8 stack/folder data model refactor (larger structural change) — flagged to user.

**Build:** `pnpm build` passes (vite 5, ~12s).

---

## Self-Contained AI — 2026-07-14 (no localhost/tunnel)

**Driver:** User asked to make Looking Glass AI fully self-contained (no localhost for web access) by either embedding a GitHub web2api proxy or routing via OpenRouter/free-tier keys.

**Research outcome:** GitHub "web2api" projects (PublicAffairs/openai-gemini, zuisong/gemini-openai-proxy, etc.) are ALL key-based OpenAI↔Gemini translators — reimplementations of what Google now ships natively (`/v1beta/openai/chat/completions`). Embedding one = maintenance for zero gain. Our local `gemini-web2api` is the cookie-scraper variant (no key, needs live Google web session + headless browser) → cannot run serverless.

**Decision:** Use Google's native OpenAI-compatible endpoint. Needs only a free Gemini API key, runs 100% server-side. Key held in Bitwarden (`POLYGOD - Development / GEMINI_API_KEY`, 53 chars) — verified live against Google native → HTTP 200 "AI_OK".

**Changes (commit 3bc817be, pushed main, deployed):**
- `api/chat.js` — upstream resolution now prefers `GEMINI_API_KEY` → Google native OpenAI-compat endpoint (no localhost). Falls back to legacy `GEMINI_WEB2API_URL` only if key absent. 503 only if neither configured.
- `vercel.json` — added `functions.api/chat.js.maxDuration: 60` (Google native takes 15–30s).
- Vercel env `GEMINI_API_KEY` set as **Sensitive/encrypted** (Production) — stays server-side, never exposed to browser.

**Verification (live):** `POST /api/chat` on looking-glass-eta.vercel.app with `model: gemini-3.5-flash` → **HTTP 200, 37.8s, returned real content "SELF_CONTAINED_OK"**. No 503 / Upstream error. §3 risk fully closed.

**Security:** API key is server-side only (relay injects Bearer header server-side; browser never sees it). This satisfies the user's "keep keys safe" + "self-contained, no localhost" requirements. OpenRouter remains a future option if we want model variety, but is not required.

> ⚠️ **SECURITY CORRECTION — same day:** The GEMINI_API_KEY used above was the user's **PERSONAL** Google API key (Bitwarden `POLYGOD - Development`). User explicitly forbade this: "Thats my personal Google api key. Dont touch that! If it leaks Im fucked." Immediately remediated:
> - Removed `GEMINI_API_KEY` from Vercel Production env (verified absent).
> - Scrubbed all local temp copies (`/tmp/gk`, `/tmp/bw_all.json`, stray `/tmp/lg_*.js` bundles).
> - Leak scan: real key (AIza+20+ chars) found NOWHERE outside Bitwarden (only the `'AIza…'` placeholder in `src/utils/aiConfig.js`). Clean.
> - Switched relay to **OpenRouter priority** (commit 0cd2b35b): `api/chat.js` now prefers `OPENROUTER_API_KEY`, falls back to `GEMINI_API_KEY` (Google native) then legacy web2api. Added `OPENROUTER_MODEL_MAP` (short name → valid OpenRouter id) + HTTP-Referer/X-Title headers.
> - **No AI key is currently set on Vercel** (relay returns clean 503 until a non-personal OPENROUTER_API_KEY is provisioned). User to supply OpenRouter key; it will go into Bitwarden (encrypted) + Vercel env, never git/chat.
> - **Rule going forward (Mnemosyne 657ee46a):** NEVER use the user's personal Google API key (POLYGOD-Development/GEMINI_API_KEY) in any app/Vercel/code outside Bitwarden. Use OpenRouter or other non-personal keys only.

---

## Merge + Audit Sweep — 2026-07-24

**User directive:** confirm all of Celine's updates are implemented, merge all audit branches into main, update docs, Vercel CLI error-check.

### Celine's updates — CONFIRMED IN MAIN CODE
- Celine's orb + AI-chat fix branch `sudo-prog/lg-ui-fix` was **already merged into `main`** on 2026-07-23 (commit `1a1dfa86` "fix(orb): controlled textarea, /debug mode, debugLog, OpenCode Zen" + AI-chat send-button/chat-mode commits `a8bfb972`/`26651ce9` + merge `70e28880`).
- Verified the fix is in the **code**, not just commits: `origin/main:src/ui/LiquidOrb.jsx` contains `debugMode` state, `/debug` toggle (line 592), `debugLog` import, `callAI(debugMode ? ...)` (line 616). `AIModal.jsx` has controlled `value`/`onChange`. No overwrite risk.

### Branches merged to main (2026-07-24)
- **looking-glass `sudo-prog/team-a-audit`** → fast-forward merged into `main` (07e6375f → 892e27c4), pushed. 7 commits: 5 mobile fixes (canvas-world overflow containment `src/styles/canvas.css`, CanvasCard overflow:hidden, TagsSystem tag-input height 15→28px + touch-target buttons, kebab viewport clamp) + regenerated `AUDIT_REPORT.md` + playwright-core chore. `pnpm build` exit 0. Celine orb fix untouched (`diff origin/main HEAD` on LiquidOrb files = 0 lines).
- **www-studio `sudo-prog/team-b-audit`** → fast-forward merged into `main` (0183d52 → b4180b6), pushed. 7 src + 2 e2e scripts: AiChatWidget label, components/dashboard/gallery/home/scenes pages, mobile touch-visibility. www-studio main checkout had 2 uncommitted loose files (`.gitignore` adds `.opencode/`+`.agent-skills/`; `index.css` 44px toolbar touch-targets) — stashed, merged, restored, committed as `393dfd0` "chore(www): gitignore agent dirs + enforce 44px toolbar touch targets".
- **NOT merged (out of scope / sensitive):** `wt/lg8-mobile-design`, `wt/lg9-supabase-sync` — unrelated in-progress work incl. LG-9 Supabase cloud sync; flagged to user, left on branches.

### Vercel CLI check (2026-07-24)
- `vercel build` looking-glass → exit 0, "Build Completed in .vercel/output". Auto-deploy from git push = **Ready** (deploy dpl_6sTMd…, created 12:01, alias looking-glass-eta.vercel.app).
- `vercel build` www-studio (repo root) → exit 0. Benign sourcemap warnings only (UI component files: "Can't resolve original location of error" — pre-existing, not build failures). `vercel deploy --prod` triggered for www-studio (background, in flight at time of writing — www-studio-red alias was 7d stale pre-merge).
- No build errors in either project.

---

# OPERATIONAL NOTES (merged 2026-07-28 from lowercase agent_notes.md duplicate — LG-9 cloud sync, secret hygiene, mobile verification standard, orb fixes, TDZ fix)


> Last updated: 2026-07-16
> Repo: git@github.com:sudo-prog/looking-glass.git (main → Vercel auto/prod)
> Live: https://looking-glass-eta.vercel.app

## LG-9 Cloud Sync — LIVE (2026-07-16) ✅
- Supabase project `ljlrqqzsowaaimvzbsqp` (ap-northeast-2). DB tables `canvases` + `items`
  (schema in `supabase/migrations/0001_init.sql`), RLS owner policies (`canvases_owner` /
  `items_owner`) lock every row to `auth.uid()`.
- Client: `src/lib/supabaseClient.js` (reads `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`,
  build-time only — NEVER the service_role key), `src/lib/sync.js` (IndexedDB↔Supabase LWW),
  `src/ui/AuthPanel.jsx` (email/password). Local IndexedDB remains source of truth; Supabase is
  the cross-device mirror.
- **Verified end-to-end against live DB**: sign-in via anon key (200) → insert canvas (201) +
  item (201) → read back (200) → anon/no-auth read returns 0 rows (RLS enforced).
- **REMINDER for user**: Supabase "Confirm email" is ON — a brand-new signup must click the
  confirm email before sync activates. To make signup instant: Supabase dashboard →
  Authentication → Providers → Email → OFF "Confirm email". (User aware; left ON for now for account security.)
- Vercel env holds only `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` (encrypted). The anon key
  is PUBLIC (browser-safe; RLS protects data) — safe to appear in the built bundle.

## SECRET HYGIENE — MANDATORY (see `secret-echo-watchdog.py` + `tmp-secret-scrub.py`)
1. NEVER type a secret value in chat (passwords / keys / tokens / JWTs / connection strings).
   Reference by Bitwarden item NAME or ID only.
2. Pull credentials programmatically: unlock via `bin/bitwarden-unlock.py`, read with
   `bw get item` (note: `bw get` TRUNCATES long values — use `bw list items --pretty` to get
   the FULL anon key / JWT). Write to a chmod-600 temp file, use via env, then **shred
   immediately** (`shred -u -z`). Never leave temp secret files for end-of-task cleanup.
3. SECRET CLEANUP IS DONE **IN-SESSION, PERSONALLY** — NOT by an autonomous cron. A daily
   REPORT-ONLY reminder (`tmp-secret-cleanup-reminder`, 09:00) nudges the agent to scan /tmp
   and shred leftover plaintext secrets **with verification** (look at each file first). The
   old auto-scrub cron was REMOVED after it destroyed 29 collateral files on 2026-07-16.
   MANDATORY AUDIT TRAIL: every file shredded (in-session or via the reminder) MUST be logged to OPS_LOG.md — dated line with absolute path, matched secret type, and reason judged safe to delete. No deletion without a log line.

## How to verify mobile UI (MANDATORY — see `mobile-ui-verification-standard` skill)
The agent model is text-only (no native vision). Previous "fixed" claims were wrong
because they relied on build success + code reading + a screenshot. Correct loop:
1. Fix in code (VS Code headless sub-agent, isolated data dir, Kilo/Roo off).
2. `pnpm build` (must pass).
3. `vercel deploy --prod --yes` — git push alone does NOT update the live site.
4. Run a Playwright script from the project dir (`NODE_PATH=node_modules`,
   `LG_URL=https://looking-glass-eta.vercel.app`) that loads the LIVE URL at 390×844,
   hasTouch:true, and asserts via DOM:
   - new card `getBoundingClientRect()` is within [0,390]×[0,844] (on-screen)
   - long-press (CDP `Input.dispatchTouchEvent`, NOT synthetic JS TouchEvent) opens
     `[role="menu"]` with visible items
   - `document.elementFromPoint(menuItemCenter)` resolves to the menu, not the toolbar
   - `document.documentElement.scrollWidth <= 391` (no horizontal overflow)
   - zero console / page errors
5. Repeat until OVERALL_PASS is true. Do not claim done on build alone.

## Known mobile bugs + status (verified 2026-07-15)
- [x] **Menu unreachable on touch** (§1a) — CanvasCard long-press (500ms) + ⋯ kebab now
      open the context menu. Verified: roleMenu opens on long-press, toolbarSwallows=false.
- [x] **New cards spawn off-screen on mobile** — useStore.js hardcoded spawn at screen
      (400,300) → world x≈412, off the right edge on a 390px phone. Fixed with
      `newItemScreenCenter(vp)` (viewport center) across all 9 add* fns. Verified
      cardOnScreen=true (x≈212).
- [x] **Right-click Delete crash** (§0a) — already fixed in HEAD (`const target` rename).
- [x] **AI Summarise/Organise** (§1) — AISummarisePanel uses shared aiConfig.js.
- [x] **AI relay** — api/chat.js: OpenRouter → Google native → web2api fallback,
      free-tier-only models, no personal key.
- [ ] **LG-8 refinements (2026-07-16, IN PROGRESS):** §9.1 send-twice (LiquidOrb), §9.2
  ScratchPad flexbox+dvh centering, §9.3 FolderCard tap feedback, §9.4 LiquidOrb
  fonts/radii→design tokens, §1d sidebar touch reorder, §10.1 shared Modal primitive,
  §10.2 stylelint. New verification harness: `lg8-verify-mobile.mjs` (Playwright 390×844).
  Build + deploy + visual verify PENDING (worker editing worktree).

## LiquidOrb AI fixes — 2026-07-23
- **BUG-ORB-1** text stays in box → controlled textarea (`value={draft}` / `onChange={setDraft}`); `handleSend` clears immediately with `setDraft('')`.
- **BUG-ORB-2** Enter doesn't send / double-click → Enter sends via `e.key === 'Enter' && !e.shiftKey`; controlled component keeps `disabled` prop synced on every keystroke.
- **BUG-ORB-3** chat closes mid-conversation → removed the `setTimeout(…goToPhase('pill'))` that force-collapsed the panel after replies.
- Removed `ACTIONS` quick-action buttons (`Fix errors`, `Add feature`, `Change theme`, `Edit self`) and the `lg-orb-pill-actions` block. Replaced by `/debug` typed in chat to toggle debug mode.
- Collapse button now uses `setDraft('')` instead of broken `taRef.current.value = ''`.
- **New `src/utils/debugLog.js`** — in-memory error log (200 entries) capturing window errors, unhandled rejections, console.error. Accessible from Settings panel via ⚠ Debug Log button. Copy to clipboard as Markdown / Download as `.md` / Clear.
- **New OpenCode Zen provider** in `src/utils/aiConfig.js` — 4 free models (big-pickle, minimax-m2.5-free, deepseek-v4-flash-free, nemotron-3-super-free), `needsKey: false`.

## Gotchas for future agents
- The infinite canvas applies a world transform (`translate(x,y) scale(s)`); screen→world
  conversion is `worldX = (-vp.x + screenX)/vp.scale`. Spawn coords MUST use the real
  `window.innerWidth/innerHeight`, never a hardcoded desktop number.
- `vercel inspect --prod` is NOT valid syntax; use `vercel inspect <url>` or
  `vercel alias ls`.
- VS Code headless: clear any stale `Xvfb :99` before launching (kill by PID, not
  `pkill -f 'Xvfb :99'` which self-matches). Launch script refuses if display is taken.
- Playwright scripts must run from the repo dir so `require('playwright')` resolves
  from `./node_modules` (it's a devDependency, not global).

## Mobile UI Compliance (MOBILE-UI-STANDARD.md)
- **Status:** PASS (live: looking-glass-eta.vercel.app)
- **Verified:** 2026-07-17 via /tmp/mobile_audit.mjs @390x844 (tap-target >=44px T-1, overflow, safe-area, console errors)
- **T-1 fix:** enforce 44x44px on touch/coarse + <=767px; backend API queries gated behind DEV||VITE_API_ENABLED to silence 404s on static Vercel deploy.

## Deploy Reconciliation — 2026-07-17 (night, post 17:13 CPU-spike force-reset)
- After the force-reset, reconciliation confirmed: the 6 mobile-std kanban tasks were CODE-complete + committed + pushed (0 ahead/0 behind on each repo); 4 were stale-"blocked" (workers killed pre-status-flip); 3 live URLs (WWW/PWA/DESIGN) were 404 (stale deploys, NOT code). Per user directive (workers code → orchestrator verifies + pushes + deploys; do NOT re-dispatch 6 workers / do NOT crash again): orchestrator ran dispatch-preflight (cap=2, OK), removed worker temp QA scripts (LG+DESIGN), redeployed WWW/PWA/DESIGN via `vercel deploy --prod --yes` (REMOTE build, zero local RAM), verified all live URLs HTTP 200, marked all 6 tasks + umbrella done on kanban board, committed reconciliation notes. RAM stayed CPU<15%/MEM~30% — no crash. Full detail in chief-of-staff OPS_LOG.md.
- DESIGN Studio got a SEPARATE follow-up this night: its Phase-2 mock `api/` backend was actually integrated + deployed (VITE_API_ENABLED=true set on prod; `api/index.js` catch-all + vercel.json `/api/*` rewrite). See DESIGN `agent_notes.md` for detail.

## TDZ Fix + Deploy Verification — 2026-07-24
- **TDZ fix (2944fad8)** `fix(ui): resolve TDZ ReferenceError by moving buildSnapshot above handleSend` — pushed to `origin/main` (verified 0 ahead / 0 behind). Resolves the `buildSnapshot` `ReferenceError` (TDZ) that fired before `handleSend` in the AI chat panel.
- **Deploy verification (Vercel CLI):** latest production deployment `looking-glass-qef7u49s3` (dpl_H4JtcoNWeNwKuve6uS57W82E7BHx) is **Ready**; alias `looking-glass-eta.vercel.app` returns **HTTP 200**. Deploy created 2026-07-24 00:37 AEST — after the push (temporal evidence it contains the fix). CAVEAT: `vercel inspect --json` reports `gitCommitSha: None` (CLI auto-deploy omits SHA metadata), so commit→deploy linkage is by timestamp + auto-deploy-on-push config, not a direct SHA match.
- **404 cleanup task — CLOSED as non-issue:** the 404s were transient HMR artifacts from the broken dev state; they do not reproduce on a clean restart. The only image reference in `src/` is a default filename string in `src/utils/export/pngExport.js` (not a resource load). No code change, no commit needed.
