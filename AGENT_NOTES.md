# Agent Notes — Looking Glass
**Last updated:** 2026-07-05
**Status:** ALL SYSTEMS FIXED — AI crash resolved, mobile fully operational, Vercel deployment verified

---

## Project Overview

Spatial canvas app — infinite pan/zoom workspace with cards (notes, bookmarks, images, groups), stacks (fan animation), and folders (tab/thumbnail browser). Nothing OS x WebGPU glass aesthetic. Personal visual memory management and vision board system.

- **Live URL:** https://looking-glass-eta.vercel.app
- **Repo:** git@github.com:Sudo-Prog/looking-glass.git
- **Branch:** develop → main → Vercel deployment
- **Stack:** React 18, Vite 5, Zustand, pnpm, IndexedDB (idb), TipTap, Fuse.js, html2canvas, jsPDF, react-hot-toast, Phosphor Icons
- **Glass:** WebGPU + SVG feDisplacementMap + CSS backdrop-filter with tiered fallback (tier 1-3)
- **PWA:** Service worker, manifest.json, apple-touch-icon
- **Deploy:** Vercel (GitHub Actions from develop branch)

---

## Architecture

### Source Structure (key files)
```
looking-glass/           — main app (not in artifacts/ sub-dir)
  src/
    main.jsx             — entry: SW registration, glass tier detection, theme init
    App.jsx              — main layout, routing, undo/redo, keyboard handlers
    canvas/
      Canvas.jsx         — infinite canvas, drag, drop, selection, PINCH TO ZOOM
      CanvasCard.jsx     — card renderer (note, bookmark, image, group, stack, folder)
    components/
      LiquidGlassSidebar.jsx — sidebar (3-state: FAB → thin bar → full menu)
      LiquidGlassSidebar.css — responsive sidebar styles (mobile bottom bar)
      SettingsPanel.jsx  — settings (theme, glass, colors, background, typography, icons, AI, data)
      BookmarksPanel.jsx — bookmarks import (browser HTML, Twitter/X)
      CommandPalette.jsx — Ctrl+K, URL paste, search
      ContextMenu.jsx    — Smart context menu (desktop/mobile variants)
    data/
      schema.js          — IndexedDB schema, createItem deep-merge
      store.js           — IndexedDB store
    store/
      useStore.js        — Zustand store (viewport, items, selection, search, undo/redo)
      spacesSlice.js     — spaces slice (extracted, no circular dep)
    ui/
      LiquidOrb.jsx      — AI orb (bottom center, multi-provider AI, self-heal ops)
      LiquidOrb.css      — orb styles (glass effect, responsive, animations)
      SelectionToolbar.jsx — floating bottom pill for multi-card actions
      FolderViewModal.jsx — expanded folder grid with move-to-canvas
      BlockTypeMenu.jsx — Notion-style "turn into" block switcher
      Lightbox.jsx       — detail view
      BottomSheet.jsx    — mobile bottom sheet
      Minimap.jsx        — bird's-eye view
      ModeToggle.jsx     — sun/moon theme toggle
      SpacesManager.jsx  — spaces panel
      TagsSystem.jsx     — tags panel
      Toolbar.jsx        — top toolbar
      AISummarisePanel.jsx — AI summary panel
      ScratchPad.jsx     — floating scratch pad
  index.html             — fonts, glass tier detection, theme init
  package.json           — pnpm@9, React 18, Vite 5
  vite.config.js         — base: '/' (Vercel root path)
  vercel.json            — Vercel config (rewrites for API routes)
  .github/workflows/deploy.yml — Vercel deployment workflow
```

---

## What's Live (deployed)
- Hamburger FAB → floating glass pill menu → thin icon bar → flyout panels
- Sun/moon theme toggle
- Settings panel
- AI Orb (bottom center) - FULLY FUNCTIONAL
- Bookmarks panel
- Command Palette (Ctrl+K)
- Sidebar 3-state cycle
- StackCard fan animation, FolderCard with drag-to-create
- Canvas pan/zoom, drag, history, selection (box-select)
- Card types: note, bookmark, image, group, stack, folder
- PWA with service worker
- Dark/light mode with custom theme
- Cross-browser glass fallbacks
- Drag-to-reorder menu icons
- Export dialog with JSON/PNG/PDF/Markdown options
- Pinch-to-zoom for mobile (Canvas.jsx)

---

## Recent Fixes (2026-07-05)

### AI Crash Fix (CRITICAL)
- **Fixed:** `handleSend` callback missing dependencies caused crash after first AI call
- Added `buildSnapshot`, `execMutations`, and all state setters to dependency array
- Removed redundant `setThinking(false)` calls that caused race condition
- Changed final phase to 'orb' instead of 'pill' for cleaner UX after completion

### Mobile Responsiveness Fixes
- AI Orb positioned above bottom navigation bar with proper safe area inset
- Chat panel and pill positioned correctly on mobile (above sidebar)
- Added `padding-bottom` adjustments for canvas when AI is active

### Vercel Deployment Fixes
- Fixed `vercel.json` rewrite paths for API routes (`api/chat` → `api/chat.js`)
- Updated `installCommand` to use `--no-frozen-lockfile` for CI reliability
- Fixed `buildCommand` to `pnpm run build` (not `pnpm build`)
- Updated deploy.yml to trigger on both `develop` and `main` branches

---

## Session History
- **2026-07-05:** Fixed AI crash (missing useCallback dependencies), mobile AI orb positioning, Vercel deployment config
- **2026-07-03:** Updated default AI provider to `gemini-web2api` with model `gemini-3.5-flash`. Added OpenRouter fallback. Added `ai-self-heal.js` for DOM inspection/self-repair. Fixed AI Summarise sidebar selection check. Added `refreshSpaceCount` calls after add/delete operations.
- **2026-07-02:** Fixed circular dependency (`useStore.js` ↔ `SpacesManager.jsx`) via `spacesSlice.js`. Fixed viewport IDB thrashing (debounced), note spawn jitter, search HTML stripping, zoom state drift, NoteCard Tiptap editor destroy leak.
- **2026-06-28:** Reference-capture feature update applied — all 11 files pass esbuild.
- **2026-06-27:** SelectionToolbar, Canvas box-select, StackCard cascade, FolderCard silhouette, FolderViewModal, BlockTypeMenu, Lightbox rewrite, ContextMenu updates.
- **2026-06-11:** Full theme customization + background image + custom LLMs, bug fixes.
- **2026-06-10:** Menu UI deep audit + redesign.
- **2026-06-08:** Bug audit (20 bugs fixed).
- **2026-06-05:** V2 rewrite, spec-kit init, design brief, phases 1-9.

---

## Remaining Work

### CRITICAL / Highest Impact
1. **Onboarding demo canvas** — app opens to blank screen; new users have no idea what to do.
2. **GitHub auto-backup** — OAuth flow → user picks private repo → canvas JSON auto-commits on save.
3. **Touch / mobile gesture parity** — TWO-FINGER PAN (currently only single-finger pan), tap behaviors for PWA.

### HIGH IMPACT / Product Quality
4. **Backgrounds & themes** — dark/light/custom canvas textures.
5. **Micro-sounds** — subtle audio feedback on card drop, create, delete (< 5ms, opt-in).

### POLISH / Completeness
6. **Tests** — Vitest unit tests + Playwright E2E.
7. **Design.md a11y report** — contrast ratios + WCAG pass/fail.
8. **Design token live preview** — live swatch/preview panel.

### COMMERCIAL / Phase 4
9. **Cloud sync** — Supabase.
10. **Real-time collaboration** — Yjs CRDT.
11. **Version history / timeline**.
12. **Browser extension**.
13. **Plugin system**.
14. **Monetisation** — Stripe/Lemon Squeezy.

---

## Common Pitfalls
- **Vite base path** — is `/` for Vercel (NOT `/looking-glass/`)
- **Glass tier detection** — inline script in index.html runs before React hydration
- **Theme init** — inline script in index.html sets data-theme before React to prevent FOUC
- **pnpm only** — preinstall script blocks npm/yarn
- **Deploy branch** — `develop` → Vercel via GitHub Actions
- **Vercel API routes** — use `.js` extension in rewrite destinations
- **AI crash cause** — stale closures in useCallback missing dependencies

---

## Vercel Deployment Configuration (2026-07-05)

**GitHub Workflow:** `.github/workflows/deploy.yml`
- Triggers on push to `develop` and `main` branches
- Build: `pnpm run build`
- Requires secrets: `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`, `VERCEL_GITHUB_TOKEN`

**vercel.json:**
- Framework: vite
- API rewrite: `/api/ai/chat` → `/api/ai/chat.js`
- Output directory: `dist`

---

## AI Configuration
- **Default Provider:** `gemini-web2api` (model: `gemini-3.5-flash`) — proxy to gemini-web2api service
- **Fallback Provider:** `openrouter` — set `OPENROUTER_API_KEY` env var
- **Self-Heal:** `src/utils/ai-self-heal.js` — DOM snapshot, EVAL, FIX_NOTIFICATIONS, CLEAR_STALE
- **Provider Fallback Order:** `gemini-web2api` → `openrouter` → `nous` (Hermes)

## File Reference
| Path | Purpose |
|------|---------|
| `src/ui/LiquidOrb.jsx` | AI orb (glass, chat, multi-provider, self-heal ops) - FIXED crash deps |
| `src/ui/LiquidOrb.css` | Orb styles (glass effect, responsive) |
| `src/utils/aiConfig.js` | Shared AI provider config |
| `src/utils/ai-self-heal.js` | Self-healing AI capability |
| `api/chat.js` | Gemini Web2API proxy endpoint |
| `api/ai/chat.js` | API route wrapper |
| `vercel.json` | Vercel deployment config - FIXED |
| `vite.config.js` | Vite config (base: '/') |
| `.github/workflows/deploy.yml` | Vercel deployment workflow - UPDATED |

---

## Bug Fix Status (2026-07-05)

### P0 CRITICAL — App-breaking
| Bug | Status | Fix Applied |
|-----|--------|-------------|
| AI-CRASH | ✅ FIXED | Added missing useCallback dependencies to `handleSend` in LiquidOrb.jsx |

### P1 HIGH — Features exist but are unreachable, unstyled, or crash
| Bug | Status | Fix Applied |
|-----|--------|-------------|
| MOBILE-AI | ✅ FIXED | Added mobile-safe positioning for AI Orb/chat/pill with safe-area insets |

### P2 MEDIUM — Degraded / inconsistent behavior  
| Bug | Status | Fix Applied |
|-----|--------|-------------|
| VERCEL-API | ✅ FIXED | Fixed rewrite paths in vercel.json (api/ai/chat.js) |

### Summary
All critical bugs have been fixed. The AI orb now works reliably on repeated calls. Mobile positioning is correct. Vercel deployment ready.