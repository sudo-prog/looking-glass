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

### 2026-06-10 — Menu UI Redesign
**Branch:** `develop`

Complete menu UI redesign as per user requirements:

1. **Hamburger icon (3 stacked lines)** — Collapsed FAB shows `List` icon from Phosphor. Click expands to thin icon bar.
2. **Thin icon bar with hover tooltips** — 56px-wide strip with icons only. Hovering shows glass tooltips with labels (no persistent text).
3. **Flyout panels on click** — Each nav icon opens a section-specific flyout panel to the right with categorized actions (Canvas → VIEW/CREATE/ACTIONS, Spaces → Explore/All Tags, etc.)
4. **Sun/moon theme toggle** — Single icon button (sun when dark, moon when light). No track, no text.
5. **Settings cog at bottom, opens from left** — Gear icon sits in footer in the same style as nav icons. SettingsPanel now slides from left side using `var(--glass-frost)` and `var(--color-border)` tokens matching the sidebar's liquid glass theme.
6. **AI orb separate at bottom** — LiquidOrb is standalone, centered at bottom of screen. First click shows centered floating setup dialog for provider/model/key. After setup, opens directly to pill/chat. Also reconfigurable via settings cog or orb's own ⚙ button.
7. **Liquid glass effect** — All panels use CSS variables: `var(--glass-frost)` with backdrop-filter blur, `var(--color-border)`, `var(--glass-cast-shadow)`, and `inset 0 1px 0 var(--glass-specular)` for consistent glass aesthetic.

**Files modified (5):**
- `src/ui/LiquidGlassSidebar.jsx` — Full rewrite: collapsed/hamburger state, thin icon bar, flyout panels, sun/moon theme toggle, settings gear in footer
- `src/ui/LiquidGlassSidebar.css` — Full rewrite: thin bar layout (56px), tooltips, flyout animations, footer styling
- `src/ui/ModeToggle.jsx` — Replaced full component with simple sun/moon icon button (no text/track)
- `src/ui/SettingsPanel.jsx` — Rewritten: slides from left, uses CSS var tokens for glass theme, provider tabs from aiConfig.js, model select, custom model input
- `src/ui/LiquidOrb.jsx` — Added centered floating first-time setup dialog, isConfigured check, phase flow routing
- `src/utils/aiConfig.js` — Added `endpoint` parameter to `saveAIConfig()`

**Build:** ✓ SUCCESS (4720 modules, 0 errors)

### 2026-06-10 — Floating Pill Menu + Theme Customization (User Feedback #2)
**Branch:** `develop` → `main` → deployed

Second round of menu UI refinements based on user feedback:

**Changes:**
1. **Floating glass pill menu** — Collapsed state is a round floating glass orb (Sparkle icon). Click morphs it into a floating pill shape with all icons. Uses `--glass-menu-radius` CSS variable driven by theme thickness setting. Backdrop overlay appears when open.
2. **Drag to reorder icons** — Icons are draggable. Hold and drag to rearrange. Position persists to `lg-theme-config` in localStorage.
3. **Long-press to remove** — Hold an icon for 600ms to enter remove mode (shake animation + red X button appears). Click X to remove it to the icon pool.
4. **Icon pool manager in settings** — New "Icons" tab in Settings panel. Shows active menu icons as drag chips, and an icon pool below for available icons. Drag from pool into menu, drag within menu to reorder, click X to remove.
5. **Theme customization** — New "Theme" tab in Settings panel:
   - Dark/Light mode toggle (simple icon)
   - Glass Opacity slider (10%–100%) — adjusts `--glass-frost` alpha
   - Glass Thickness slider (1–5) — controls `--glass-menu-radius` (12px–42px)
   - Glass Blur slider (4px–60px) — controls backdrop-filter blur
   - Color pickers for: Accent Color, Text Primary, Text Secondary, Glass BG Color
   - All changes live-previewed on the UI
   - Save button persists via `themeConfig.js`
6. **All panels open from left** — BookmarksPanel now slides from left with `var(--glass-frost)` and `var(--color-border)` tokens matching all other panels.
7. **New file:** `src/utils/themeConfig.js` — Utility for loading/saving/applying `lg-theme-config` from localStorage. Handles hex-to-rgba conversion, thickness-to-radius mapping, CSS variable injection.

**Files modified (4):** `LiquidGlassSidebar.jsx`, `LiquidGlassSidebar.css`, `SettingsPanel.jsx`, `BookmarksPanel.jsx`
**Files created (1):** `themeConfig.js`
**Build:** ✓ SUCCESS (4721 modules, 0 errors)
**Deploy:** ✓ SUCCESS (GitHub Pages)

### 2026-06-11 — Full Theme Customization + Background Image + Custom LLMs
**Branch:** `develop` → `main` → deployed

Extended theme system with background images, fonts, and custom AI providers.

**Theme customization expanded (`themeConfig.js` + `SettingsPanel.jsx`):**
- Glass Color picker — custom hex color for glass panels
- Background Color picker — custom page background
- Accent Color, Text Primary, Text Secondary — all with eyedropper color pickers + hex input
- **Background Image upload** — full-screen image behind everything:
  - Display modes: Cover / Center / Tile / Stretch
  - Opacity slider (10%–100%)
  - Two overlay color layers (each with color picker + opacity slider)
  - Uses dedicated DOM `<div>` elements (`#lg-theme-bg-image`, `#lg-theme-overlay1`, `#lg-theme-overlay2`) instead of `body::before` pseudo-elements
  - When active: `body` and `.canvas-viewport` made transparent via injected `<style>` so the image shows through
- **Typography section:**
  - Upload font file (.ttf/.otf/.woff) — auto-generates `@font-face` + applies globally
  - Google Fonts @import URL textarea — paste any CSS import
  - Font Family CSS input — set the font-family value
  - Base Font Size slider (10–24px)
  - Text Drop Shadow toggle — color, offset X/Y, blur
  - Text Stroke (outline) toggle — color, width
- All settings live-preview in real-time on the UI
- Settings tab structure: MODE → GLASS → COLORS → BACKGROUND → TYPOGRAPHY

**Bug fixes (3):**
1. **Background image not showing** — `body { background: var(--color-bg) }` (opaque) and `.canvas-viewport { background-color: var(--canvas-bg) }` (opaque) covered the `z-index: -2` image div. Fixed by injecting `body { background: transparent !important; } .canvas-viewport { background-color: transparent !important; }` when a bg image is active.
2. **X remove button persists during drag** — `handleDragStart` now calls `setShowRemove({})` and clears the long-press timer. `handlePointerUp` resets both `showRemove` and `longPressItem`.
3. **Nav items don't match menu curvature** — Changed `.lg-sidebar__nav-item`, `.lg-sidebar__flyout`, `.lg-sidebar__theme-btn`, `.lg-sidebar__settings-btn` border-radius from fixed `--radius-lg`/`--radius-md` to `var(--glass-menu-radius, 24px)` so they all shift together when thickness changes.

**Custom LLM / API / Local Agent support (`aiConfig.js` + `LiquidOrb.jsx`):**
- Custom providers stored in `lg-custom-providers` localStorage key
- `addCustomProvider()` — creates and persists a new provider with name, icon, baseURL, models, needsKey flag
- `removeCustomProvider()` — removes a custom provider (built-in providers are protected via `builtin: true` flag)
- `refreshProviders()` — re-syncs the shared PROVIDERS object from localStorage
- **Setup dialog "+" button** — dashed-border square at the end of provider tabs, opens add provider form (name, icon, API URL, comma-separated models, requires API key checkbox)
- **Custom provider "×" button** — small red circle with × on non-builtin provider tabs, confirmation prompt before removal, falls back to OpenRouter if removed provider was active
- Same "+" / "×" UI applied to both the centered setup dialog and the in-orb settings panel

**Files modified (3):** `LiquidOrb.jsx`, `LiquidGlassSidebar.jsx`, `LiquidGlassSidebar.css`
**Files modified (2):** `themeConfig.js`, `aiConfig.js`
**Build:** ✓ SUCCESS (4721 modules, 0 errors)
**Deploy:** ✓ SUCCESS (GitHub Pages)

---

## What's Live (Current)

- **Hamburger FAB** — 3 horizontal lines, morphs into floating glass pill menu
- **Thin icon bar** — 56px wide, icons only, hover tooltips
- **Flyout panels** — click icon opens categorized section panel
- **Sun/moon toggle** — simple icon, no text
- **Settings cog** — bottom of sidebar, opens SettingsPanel from left
- **Settings Panel** — slides from left, glass-frost theme:
  - Theme tab: mode, glass (opacity/thickness/blur/color), colors, background image + overlays, typography (font upload, Google Fonts, size, shadow, stroke)
  - Icons tab: drag-to-reorder, add/remove from pool
  - AI tab: provider/model/key config
  - Data tab: export/clear
- **AI Orb** — separate at bottom center, centered floating setup dialog, provider/model/key, custom LLM add/remove
- **Bookmarks panel** — browser import, Twitter/X import, search
- **Command Palette** — Ctrl+K, URL paste detection
- **Liquid glass effect** — `var(--glass-frost)`, `backdrop-filter`, `var(--color-border)`, `var(--glass-cast-shadow)`, `var(--glass-specular)` throughout
- All theme changes live-preview in real-time

---

## Deploy Pipeline

- `develop` branch → merge to `main` → GitHub Actions auto-deploys to GitHub Pages
- Workflow: `.github/workflows/deploy.yml` — uses `actions/upload-pages-artifact@v3` + `actions/deploy-pages@v4`
- CDN cache can lag 30-60s after push
- JS bundle: ~816KB, CSS: ~59KB

---

## Session Log

### 2026-06-05 — V2 Rewrite + Deploy Setup
