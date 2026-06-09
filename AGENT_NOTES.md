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