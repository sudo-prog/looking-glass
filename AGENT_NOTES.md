# AGENT_NOTES.md — Looking Glass

Dev log for OWL/Hermes agent sessions. BOSS reads this to get current state without repeating context.

---

## Project Overview

Spatial canvas app — infinite pan/zoom workspace with cards (notes, bookmarks, images, groups), stacks (fan animation), and folders (tab/thumbnail browser). Nothing OS × WebGPU Glass aesthetic.

- **Live URL:** `https://sudo-prog.github.io/looking-glass/` (with hyphen)
- **Repo:** `git@github.com:Sudo-Prog/looking-glass.git`
- **Branch:** `develop` → merge to `main` → auto-deploy

---

## Deploy Pipeline

- `develop` branch → merge to `main` → GitHub Actions auto-deploys to GitHub Pages
- Workflow: `.github/workflows/deploy.yml` — uses `actions/upload-pages-artifact@v3` + `actions/deploy-pages@v4` (modern API, NOT legacy gh-pages branch)
- CDN cache can lag 30-60s after push
- JS bundle: ~723KB, CSS: ~43KB

---

## Session Log

### 2026-06-05 — V2 Rewrite + Deploy Setup

**Commits:** `52c46ce0` → `78e43c90`

- spec-kit init (SDD) — `.specify/` templates, constitution, workflows
- V1.0 feature spec (SDD)
- Design Brief v2.0 (Nothing OS × WebGPU Glass)
- **Phase 1:** Token Foundation
- **Phase 2:** Glass Renderer (WebGPU + CSS fallback + tier detection)
- **Phase 3:** Canvas Engine (pan/zoom, drag, history, selection)
- **Phase 4:** Card Components (BaseCard + 5 types, glass states)
- **Phase 5:** UI Chrome (Toolbar, CommandPalette, ContextMenu, BottomSheet, Minimap, Spaces, Lightbox, ModeToggle)
- **Phase 6-9:** Typography audit, Accessibility, Responsive, PWA
- Wired V2 card components and UI chrome into App.jsx and Canvas.jsx
- **Code audit** (`c851f472`): removed 4575 lines of dead code — **MISTAKE:** deleted 27 V2 files (card components, UI chrome, canvas engine TS files) that were built but not yet connected. Had to restore from git (`3edbdbd0`).
- SW cache-bust — network-first strategy + v2 cache name
- GitHub Actions Pages deployment (modern API)
- Removed broken Copilot pages-deploy.yml (wrong build dir, old node)
- Removed redundant static.yml (deploy.yml handles build+deploy)

### 2026-06-07 — Sidebar + Stack/Folder Features

**Commits:** `8538d258` → `b782dea1`

- Sidebar 3-state toggle cycle (0→1→2→0): FAB → expanded → fullmenu → FAB
- FAB in state 0, AI quick actions in state 2
- StackCard fan animation + FolderCard with drag-to-create
- DropModePicker (Stack/Folder choice popup)
- Store actions: createStack, addToStack, createFolder, addToFolder
- Canvas DnD rewrite
- LiquidGlassSidebar + AIModal (audit #4 fixes)
- Fixed sidebar 3-state toggle cycle, removed package-lock.json, fixed manifest/icon paths, created manifest.json

### 2026-06-08 — Bug Audit Fixes (20 bugs)

**Commits:** `fccbd9a0` → `d1f92f20` → `ae5343e6`

Sub-agent fixed 20 bugs from `/tmp/bugs.md`. Results:

**Fixed (16):**
- BUG-1/19: handleRedo missing move/update — already correct in code
- BUG-4: updateItem null content fix
- BUG-6: drag position divergence fix
- BUG-7: Stack fan toggleFan fix
- BUG-8: FolderCard inline rename
- BUG-9: NoteCard saveTimeout cleanup
- BUG-10: dbPromise singleton pattern
- BUG-11: BottomSheet snap inverted
- BUG-12: BottomSheet transform positioning
- BUG-13: ModeToggle role=switch
- BUG-14: Toolbar onAddNote
- BUG-15: bulkImport transaction
- BUG-16: ExportDialog HTML strip
- BUG-17: Duplicate schema re-export
- BUG-18: #canvas-world 1px fix
- BUG-20: ModeToggle wired in sidebar

### 2026-06-09 — Bug Audit Patch 2 (20+ fixes from Claude_updates)

**Branch:** `develop`

Applied comprehensive bug fix patch set from `~/Downloads/Claude_updates/lg-bug-fixes/lg-patch/`.

**Critical / Data loss fixes (5):**
- `src/data/store.js` — openDB race condition with singleton in-flight promise guard; `bulkImport()` now uses single transaction for atomicity; `deleteCanvas()` was missing — added
- `src/data/schema.js` — `createItem` now deep-merges `content`/`meta`/`style` so partial overrides don't drop base keys
- `src/store/useStore.js` — `updateItem` no longer silently drops explicit `null` values (`!= null` check); `setViewport` debounced at 400ms to prevent IDB thrashing; `deleteSelected` batched into single `setState`; `search` strips HTML before matching note content; `exportData` returns correct v0.3 multi-canvas structure

**Broken feature fixes (9):**
- `src/history/HistoryManager.js` — `redo()` now returns `{ command, result }` with proper data; `MoveItemCommand stores newX/newY` for redo; `UpdateItemCommand.redo()` returns `newData`
- `src/components/App.jsx` — zoom/pan/fit reading from store viewport (not stale local copy); `handleFit` calls `canvasRef.current.fitToContent()` via `forwardRef`; undo/redo reads fresh state; keyboard handler deps fixed
- `src/canvas/Canvas.jsx` — `forwardRef` + `useImperativeHandle` exposing `fitToContent`; drag position reads DOM (not React props) eliminating mid-drag divergence; viewport feedback loop killed (transform applied directly via ref during interaction); drop highlights cleared on both pointermove and pointerup; variable shadowing `t` fixed
- `src/components/CanvasCard.jsx` — NoteCard saveTimeout/editor cleanup on unmount; StackCard toggleFan stopPropagation; FolderCard inline rename (replaces `prompt()`); GroupCard renders from `item.meta.child_items`
- `src/ui/BottomSheet.jsx` — snap points inverted; `top`+`bottom:0` stretch fixed with `transform: translateY()`; close threshold corrected
- `src/ui/Minimap.jsx` — viewport dimensions use `window.innerWidth/innerHeight`; minimap click converts to viewport pan offset correctly; render raf cleanup fixed; `getContext('2d')` cached
- `src/ui/CommandPalette.jsx` — URL paste detection + `onAddUrl`; debounced search at 120ms; `new-note` and `paste-url` actions wired; activeIndex clamped on list change
- `src/ui/ExportDialog.jsx` — markdown export strips HTML tags with `stripHtml()` before writing
- `src/utils/export/ExportDialog.jsx` — HTML in markdown export fixed

**Accessibility fixes (2):**
- `src/ui/ModeToggle.jsx` — keyboard accessible: `role="switch"` now has `onClick` + `onKeyDown` handlers
- `src/ui/LiquidGlassSidebar.jsx` — settings button (`GearSix`) now has `onClick` handler; toggle icon shows correct direction per state (`CaretRight` for expanded, `CaretLeft` for full menu)

**Stale / dead code (1):**
- `src/schema.js` — deleted (stale duplicate of `src/data/schema.js`)

**Files changed (18):** `src/data/schema.js`, `src/data/store.js`, `src/store/useStore.js`, `src/history/HistoryManager.js`, `src/components/App.jsx`, `src/canvas/Canvas.jsx`, `src/components/CanvasCard.jsx`, `src/styles/canvas.css`, `src/ui/ModeToggle.jsx`, `src/ui/BottomSheet.jsx` (new), `src/ui/Minimap.jsx`, `src/ui/CommandPalette.jsx`, `src/ui/LiquidGlassSidebar.jsx`, `src/utils/export/ExportDialog.jsx`, `src/schema.js` (deleted), `BUG_AUDIT_REPORT.md` (copied from patch), `AGENT_NOTES.md`

### 2026-06-08 — Full Project Review & Cleanup

**Build Status:** ✓ SUCCESS

- Added glass-fallback.css import to main.jsx
- Added card-child CSS classes to glass-fallback.css
- Fixed toggleTheme optional parameter
- Fixed manifest.json icon paths with /looking-glass/ prefix
- Deleted orphaned files: src/cards/, src/canvas/*.ts, src/webgpu/

### 2026-06-08 — Claude_updates Integration + File Cleanup

**Commits:** `b4beb271`, `90262a9a`

- GitHub access verified (Sudo-Prog, PAT auth)
- Audit fixes committed and pushed
- Cross-referenced `~/Downloads/Claude_updates/` — 9/10 files already present
- Restored missing `ContextMenu.jsx` (enhanced) to `src/ui/`
- Updated App.jsx import path → `../ui/ContextMenu.jsx`

**File cleanup (approved by BOSS):**
- Removed orphaned `src/cards/` (14 files, 0 external imports)
- Removed duplicates: `Lightbox.js`, `ExportDialog.js`, root `manifest.json`, `DropModePicker.tsx`, `ui/DropModePicker.jsx`
- Removed unused: `Toolbar.jsx`, `Sidebar.jsx`, `SpacesSidebar.jsx`, `BottomSheet.jsx`
- Kept: `src/ui/Minimap.jsx` (future toggle), `src/components/mobile/BottomSheet.js` + `.css` (reference)
- Build: ✓ SUCCESS (4714 modules)

### 2026-06-09 — Claude_updates Audit (all files verified)

**Branch:** `develop`

Reviewed all 10 .jsx files + INTEGRATION.md in `~/Downloads/Claude_updates/` against current project files:

| File | Status |
|------|--------|
| AISummarisePanel.jsx | ✓ Identical |
| AudioMemoCard.jsx | ✓ Identical |
| ContextMenu.jsx | ✓ Identical |
| DropZoneHandler.jsx | ✓ Identical |
| PDFViewerCard.jsx | ✓ Identical |
| ScratchPad.jsx | ✓ Identical |
| SpacesManager.jsx | ⚠️ Bug in download (uses `useSpacesStore()` not `useStore()`) — **already fixed in project** |
| TagsSystem.jsx | ✓ Identical |
| VideoCard.jsx | ✓ Identical |
| WebClipScreenshotCard.jsx | ✓ Identical |
| INTEGRATION.md | Integration guide only — no code to apply |

**Bug found in download version (SpacesManager.jsx):**
- Component used a standalone `useSpacesStore()` Zustand store (created at bottom of file) instead of the main `useStore()` from `../store/useStore.js`
- This meant space switching/renaming/deleting would have **zero effect** on the canvas
- **Already fixed in project** — commit `2e41ba18` resolved the circular import issue by inlining `spacesSlice` into `useStore.js` and adding `import { useStore }` to SpacesManager.jsx

**Result:** No bugs to fix. All updates already applied. Working tree clean.

### 2026-06-08 — Cross-Browser CSS + JS Fixes (Firefox/mobile)

**Commits:** `f06ec520`, `36cd98f1`, `8ac53a75`, `2e41ba18`

**Problem:** App loaded blank on Firefox/mobile with `Cannot access 'fo' before initialization` — a JS Temporal Dead Zone (TDZ) error in the minified bundle.

**Fixes:**
1. **CSS `@supports not` Tier 3 fallback** (`glass-fallback.css`) — added auto-detection for browsers without `backdrop-filter` support. Applies solid backgrounds (`#1A1A1A` dark / `#EDE9E3` light) when blur is unsupported. Includes `-webkit-backdrop-filter` prefix for Safari.

2. **Circular import broken** (`useStore.js`) — `SpacesManager.jsx` imported `useStore` from `useStore.js`, and `useStore.js` imported `spacesSlice` from `SpacesManager.jsx`. Inlined `spacesSlice` directly into `useStore.js` and removed the re-export.

3. **TDZ in App.jsx** — `filteredItems` was declared *after* `handleAICluster` callback which referenced it. The minifier hoisted it and renamed to `fo`, causing `Cannot access 'fo' before initialization`. Moved `filteredItems` declaration above the callback.

4. **Missing import** (`SpacesManager.jsx`) — The component called `useStore()` but didn't import it. Added `import { useStore }` at the top of the file.

**Result:** Site loads cleanly on Firefox, Chrome, Safari. No console errors.

---

## What's Live

- Sidebar: 3-state cycle (FAB → expanded → fullmenu → FAB)
- **Settings panel** (gear icon) — theme, density, AI provider config, data management
- **Bookmarks panel** — browser bookmark import (HTML), Twitter/X bookmark URL import, search, delete
- **Command Palette** — Ctrl+K shortcut, URL paste detection, New Note/Space actions
- StackCard, FolderCard, DropModePicker — deployed
- Canvas pan/zoom, drag, history, selection
- Card types: note, bookmark, image, group, stack, folder
- PWA with service worker
- Light/dark mode
- Enhanced context menu (AI, grouping, tags, colours, mobile sheet)
- Cross-browser glass fallbacks (Firefox, older Safari, mobile)

---

## Still TODO

1. ~~Fix BUG-3~~ — Partial fix done
2. **Add toolbar buttons** (import/export/undo/redo/zoom)
3. **Wire Minimap toggle** — `src/ui/Minimap.jsx` needs on/off button
4. **Test drag-and-drop** stack/folder creation
5. **Verify StackCard** fan animation
6. **Verify FolderCard** expand/collapse/rename
7. ~~Menu UI deep audit~~ — **DONE 2026-06-10**

### 2026-06-10 — Menu UI Deep Audit & Fix

**Branch:** `develop`

Deep audit and fix of all broken menu/sidebar elements. User reported: broken menu UI, missing icons, settings cog non-functional, secondary menu hidden, missing import bookmarks feature.

**Root Cause — CSS Never Imported:**
- `src/styles/ui-chrome.css` (779 lines) and `src/styles/responsive.css` (195 lines) were **never imported** in `main.jsx`
- This killed all styling for: Command Palette, Context Menu, Bottom Sheet, Mode Toggle, Lightbox, Minimap, Spaces sidebar, and all responsive breakpoints
- **Fix:** Added both CSS imports to `src/main.jsx`

**Settings Cog Fixed:**
- Gear icon was toggling dead `showTags` state — nothing rendered
- **Created `src/ui/SettingsPanel.jsx`** — slide-in panel with Theme toggle, Density selector, AI Provider config (OpenAI/Anthropic/Gemini/Ollama), API key input, Export/Clear data, Save button

**BOOKMARKS Nav + Import Feature:**
- BOOKMARKS nav item had no handler — clicking did nothing
- **Created `src/ui/BookmarksPanel.jsx`** with:
  - Browser Bookmarks Import — parses Netscape HTML export format (Chrome/Firefox/Safari/Edge). Deduplicates URLs
  - Twitter/X Bookmark Import — paste URL to save bookmark link with twitter tag
  - Search/filter saved bookmarks, delete individual items, empty state guidance

**Full Menu (State 2) Layout Fixed:**
- Spacer div and AI Assistant button pushed menu sections below the fold
- Fixed by hiding spacer/AI button in full menu mode
- Added 2-column grid layout (`lg-sidebar__fullmenu-grid`) for compact display
- All sections now visible: NAVIGATE (5 items), CREATE (3 items), AI ACTIONS (4 items), QUICK ACTIONS (2 items)

**Command Palette Wired:**
- `CommandPalette.jsx` existed but was never imported/rendered in App.jsx
- Ctrl+K now opens Command Palette (replaced old `prompt()` hack)
- Escape key properly closes Command Palette
- Conditional rendering prevents always-on DOM

**Sidebar Callback Props Added:**
- `onSearch`, `onAddNote`, `onAddUrl`, `onExport` — all wired from App.jsx

**Files Modified (4):** `main.jsx`, `App.jsx`, `LiquidGlassSidebar.jsx`, `LiquidGlassSidebar.css`
**Files Created (2):** `SettingsPanel.jsx`, `BookmarksPanel.jsx`
**Build:** ✓ SUCCESS (4723 modules, 0 errors)

### 2026-06-09 — Liquid AI Orb Integration

**Branch:** `develop`

Integrated the Liquid AI Orb (`LiquidAIOrb-v3.html`) as a React component with full multi-provider AI support. Previously the standalone HTML file was hardcoded to Claude only — now it uses the same shared API config as the sidebar AIModal.

**New files (4):**
- `src/utils/aiConfig.js` — Shared AI config utility. Single source of truth for provider/model/key stored in `lg-ai-config` localStorage. Supports 7 providers: OpenRouter, Anthropic, OpenAI, Gemini, Groq, Ollama, LiteLLM + custom model IDs.
- `src/ui/LiquidOrb.jsx` — Full React component: SVG glass displacement (Aave four-fold technique), spring physics, phase machine (orb → pill → chat), multi-provider AI caller, self-editing mutation system, settings panel with provider tabs + custom model input.
- `src/ui/LiquidOrb.css` — All styles for orb, pill, chat, settings, mutation log, animations.

**Modified files (2):**
- `src/ui/AIModal.jsx` — Refactored to import from `aiConfig.js` instead of its own hardcoded PROVIDERS/MODELS. Added "Custom model ID…" dropdown option. Now shares config with Orb.
- `src/components/App.jsx` — Added `<LiquidOrb />` import and render.

**Key architecture:**
- Both AIModal (sidebar) and LiquidOrb read/write the same `lg-ai-config` localStorage key via `loadAIConfig()`/`saveAIConfig()` from `aiConfig.js`
- AI caller routes to correct API format per provider: Anthropic Messages API, Google Gemini, or OpenAI-compatible (OpenAI/Groq/OpenRouter/Ollama/LiteLLM)
- Orb has its own ⚙ settings panel (provider tabs, model select, custom model input, API key)
- Orb's mutation system can self-edit: PATCH_ELEMENT, SET_CSS, SET_CSS_VAR, MUTATE_LENS, REWRITE_ORB, ADD_FEATURE, REMOVE_FEATURE, SHOW_NOTIFICATION

**Build:** ✓ SUCCESS (4718 modules)
