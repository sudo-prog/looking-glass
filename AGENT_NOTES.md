# Agent Notes — Looking Glass
**Last updated:** 2026-06-28
**Status:** All 16 audit fixes complete — deployed to Vercel on `develop` branch

---

## Project Overview

Spatial canvas app — infinite pan/zoom workspace with cards (notes, bookmarks, images, groups), stacks (fan animation), and folders (tab/thumbnail browser). Nothing OS x WebGPU glass aesthetic. Personal visual memory management and vision board system.

- **Live URL:** https://looking-glass-eta.vercel.app
- **Repo:** git@github.com:Sudo-Prog/looking-glass.git
- **Branch:** develop → deploy via Vercel
- **Stack:** React 19, TypeScript, Vite 5, Zustand, pnpm, IndexedDB (idb), TipTap, Fuse.js, html2canvas, jsPDF, react-hot-toast, Phosphor Icons
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
      SelectionToolbar.jsx  — floating bottom pill for multi-card actions (color, copy, arrange, stack, folder, delete)
      FolderViewModal.jsx   — expanded folder grid with move-to-canvas + empty-all
      BlockTypeMenu.jsx     — Notion-style "turn into" block switcher (⋮⋮ handle)
      Lightbox.jsx          — detail view (back arrow, color swatches, metadata panel, glass toolbar)
      BottomSheet.jsx    — mobile bottom sheet (snap points, swipe dismiss)
      Minimap.jsx        — bird's-eye view of canvas
      ModeToggle.jsx     — sun/moon theme toggle
      ExportDialog.jsx   — export (JSON, markdown with HTML strip)
    utils/
      aiConfig.js        — AI provider config (OpenAI, Anthropic, Gemini, Ollama, custom)
      themeConfig.js     — theme config (glass, colors, background image, typography)
      export/            — export utilities
  index.html             — Space Grotesk + Space Mono + Doto fonts, glass tier detection, theme init
  package.json           — pnpm@9, React 18, Vite 5
  vite.config.js         — base: '/looking-glass/'
  server.js              — minimal static server for production
  .github/workflows/deploy.yml — GitHub Actions → gh-pages
```

### What's Live (deployed)
- Hamburger FAB → floating glass pill menu → thin icon bar → flyout panels
- Sun/moon theme toggle
- Settings panel (theme, glass, colors, background image, typography, icons, AI, data)
- AI Orb (bottom center, provider setup, custom LLM add/remove)
- Bookmarks panel (browser import, Twitter/X import, search)
- Command Palette (Ctrl+K, URL paste detection)
- Sidebar 3-state cycle (FAB → expanded → fullmenu)
- StackCard fan animation, FolderCard with drag-to-create
- Canvas pan/zoom, drag, history, selection
- Card types: note, bookmark, image, group, stack, folder
- PWA with service worker
- Dark/light mode with custom theme (glass opacity/thickness/blur/color, background image + overlays, typography)
- Cross-browser glass fallbacks (Firefox, Safari, mobile)
- Drag-to-reorder menu icons, long-press to remove, icon pool manager
- Custom LLM providers (add/remove from setup dialog)

### Session History
- **2026-06-27:** Reference-capture feature update applied — SelectionToolbar, Canvas box-select, StackCard cascade, FolderCard silhouette, FolderViewModal, BlockTypeMenu, Lightbox rewrite, ContextMenu updates, VideoCard autoplay, WebClipScreenshotCard blinking-cursor loading, useStore new actions. All 11 files pass esbuild. Build clean. Dev server running on :5173 for visual verification.
- **2026-06-05:** V2 rewrite, spec-kit init, design brief, phases 1-9, deploy setup
- **2026-06-07:** Sidebar 3-state, StackCard, FolderCard, DnD rewrite
- **2026-06-08:** Bug audit (20 bugs fixed), Claude_updates integration, file cleanup, cross-browser CSS/JS fixes
- **2026-06-09:** Claude_updates audit (all files verified), bug audit patch 2 (16 critical/feature/a11y fixes)
- **2026-06-10:** Menu UI deep audit + fix (CSS never imported, settings cog, bookmarks import, command palette wired), menu UI redesign (hamburger FAB, thin icon bar, flyout panels, sun/moon toggle, AI orb), floating pill menu + theme customization (drag-to-reorder, long-press remove, icon pool, glass/color/background/typography settings, custom LLMs)
- **2026-06-11:** Full theme customization + background image + custom LLMs, bug fixes (background image not showing, X button during drag, nav item curvature)

---

## Remaining Work (from "Looking Glass Remaining.txt")

### CRITICAL / Highest Impact
1. **Onboarding demo canvas** — app opens to blank screen; new users have no idea what to do. Pre-populated canvas showing all card types + tooltip tour
2. **GitHub auto-backup** — OAuth flow → user picks private repo → canvas JSON auto-commits on save
3. **Touch / mobile gesture parity** — pinch-to-zoom, two-finger pan, tap behaviors for PWA on iPhone/Android

### HIGH IMPACT / Product Quality
4. **Backgrounds & themes** — dark/light/custom canvas textures (linen, dot grid variations, plain); currently locked to light dot grid
5. **Micro-sounds** — subtle audio feedback on card drop, create, delete (< 5ms, opt-in)

### POLISH / Completeness
6. **Tests** — Vitest unit tests for Quadtree, schema, exporters; Playwright E2E for drag, marquee, folder creation
7. **Design.md a11y report** — contrast ratios + WCAG pass/fail in Super Design extractor output
8. **Design token live preview** — live swatch/preview panel inside Super Design.md panel

### COMMERCIAL / Phase 4
9. **Cloud sync** — Supabase; multi-device canvas sync (opt-in, paid tier)
10. **Real-time collaboration** — Yjs CRDT for shared canvases (opt-in, paid tier)
11. **Version history / timeline** — checkpoint diffs with visual rewind
12. **Browser extension** — one-click clip any page/image/selection to canvas
13. **Plugin system** — custom card types, importers, exporters
14. **Monetisation** — Stripe/Lemon Squeezy, freemium gating

### Audit Fixes Applied (from AUDIT_FIXES.md)
- ✅ FIX 2: Lockfile cleanup — pnpm lockfile, .gitignore updated
- ✅ FIX 10: Minimal static server — vite preview used
- ✅ FIX 14: BottomSheet font tokens — design token system in place
- ✅ FIX 17: Glass tier detection — fixed in index.html + main.jsx
- ✅ FIX 12: Mobile sidebar — LiquidGlassSidebar + mobile CSS complete
- ✅ FIX 3: Deploy workflow → Vercel (deployed 2026-06-28)

### Desktop / Mobile Wrappers
- **Tauri (desktop):** Config files written (src-tauri/) — needs Rust installed locally to compile
- **Capacitor (mobile):** capacitor.config.ts written — needs @capacitor packages installed locally

---

## Development Roadmap

### Completed ✅
- [x] V2 rewrite (phases 1-9: tokens, glass renderer, canvas engine, cards, UI chrome, typography, a11y, responsive, PWA)
- [x] Deploy pipeline (GitHub Actions → gh-pages)
- [x] Sidebar 3-state (FAB → thin bar → full menu)
- [x] StackCard, FolderCard, DropModePicker
- [x] Canvas pan/zoom, drag, history, selection
- [x] Bug audit fixes (36+ bugs across 2 sessions)
- [x] Cross-browser CSS/JS fixes (Firefox, Safari, mobile)
- [x] Menu UI deep audit + redesign (3 iterations)
- [x] Settings panel (theme, glass, colors, background, typography, icons, AI, data)
- [x] AI Orb with custom LLM support
- [x] Bookmarks panel (browser + Twitter/X import)
- [x] Command Palette (Ctrl+K)
- [x] Theme customization (glass, colors, background image, typography)
- [x] Floating pill menu with drag-to-reorder icons

### In Progress
- [x] Full audit (16 fixes from doc_6c155836e08d) — all Groups A–F complete
- [x] Deployed to Vercel — https://looking-glass-eta.vercel.app
- [ ] Onboarding demo canvas

### Not Yet Started
- [ ] GitHub auto-backup
- [ ] Touch / mobile gesture parity
- [ ] Backgrounds & themes (canvas textures)
- [ ] Micro-sounds
- [ ] Tests (Vitest + Playwright)
- [ ] Design.md a11y report
- [ ] Design token live preview
- [ ] Tauri desktop wrapper
- [ ] Capacitor mobile wrapper
- [ ] Cloud sync (Supabase)
- [ ] Real-time collaboration (Yjs CRDT)
- [ ] Version history / timeline
- [ ] Browser extension
- [ ] Plugin system
- [ ] Monetisation (Stripe)

---

## Common Pitfalls
- **Drizzle not used** — this project uses IndexedDB (idb) + Zustand, not PostgreSQL/Drizzle
- **React 18** — not React 19 like the studio projects
- **Vite base path** — must be `/looking-glass/` for GitHub Pages
- **Glass tier detection** — inline script in index.html runs before React hydration
- **Theme init** — inline script in index.html sets data-theme before React to prevent FOUC
- **pnpm only** — preinstall script blocks npm/yarn
- **Deploy branch** — `develop` → merge to `main` → GitHub Actions auto-deploys
- **CDN cache** — can lag 30-60s after push

---

## File Reference
| Path | Purpose |
|------|---------|
| `src/main.jsx` | Entry point: SW, glass tier, theme, React render |
| `src/App.jsx` | Main layout, undo/redo, keyboard handlers |
| `src/canvas/Canvas.jsx` | Infinite canvas, drag, drop, selection |
| `src/canvas/CanvasCard.jsx` | Card renderer (6 types) |
| `src/components/LiquidGlassSidebar.jsx` | Sidebar (3-state, flyout panels, pill menu) |
| `src/components/SettingsPanel.jsx` | Settings (theme, glass, colors, bg, typography, icons, AI) |
| `src/components/BookmarksPanel.jsx` | Bookmarks import |
| `src/components/CommandPalette.jsx` | Ctrl+K command palette |
| `src/components/LiquidOrb.jsx` | AI orb with custom LLM support |
| `src/data/schema.js` | IndexedDB schema |
| `src/data/store.js` | IndexedDB store (singleton, atomic bulkImport) |
| `src/store/useStore.js` | Zustand store |
| `src/history/HistoryManager.js` | Undo/redo |
| `src/ui/BottomSheet.jsx` | Mobile bottom sheet |
| `src/ui/Minimap.jsx` | Canvas minimap |
| `index.html` | Fonts, glass tier detection, theme init |
| `vite.config.js` | Vite config (base: '/looking-glass/') |
| `server.js` | Minimal static server |
| `.github/workflows/deploy.yml` | GitHub Actions deploy |
| `AUDIT_FIXES.md` | Detailed audit fix instructions |
| `AUDIT_REPORT.md` | Full audit report (17 issues) |
| `BUG_AUDIT_REPORT.md` | Bug audit (36 bugs, all fixed) |
| `Looking Glass Remaining.txt` | Prioritized remaining work |
| `DESIGN_BRIEF_V2.pdf` | Design brief (205KB) |
| `HERMES MASTER PLAN LookingGlass.pdf` | Master plan (202KB) |
