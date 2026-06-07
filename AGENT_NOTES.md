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
- JS bundle: ~582KB, CSS: ~35KB

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
- BUG-4: updateItem null content — `updates.content || {}` → nullish check
- BUG-6: drag position divergence — reads DOM style.left at drag start
- BUG-7: Stack fan toggleFan — e.stopPropagation() added
- BUG-8: FolderCard prompt() — replaced with inline rename input
- BUG-9: NoteCard saveTimeout — cleanup on unmount
- BUG-10: init() race — dbPromise singleton pattern
- BUG-11: BottomSheet snap inverted — SNAP_POINTS corrected (full=15, peek=90)
- BUG-12: BottomSheet top positioning — switched to transform: translateY()
- BUG-13: ModeToggle role=switch — onClick + onKeyDown added to outer div
- BUG-14: Toolbar onAddNote — Add button now calls onAddNote
- BUG-15: bulkImport — single transaction with rollback
- BUG-16: ExportDialog HTML — strips HTML tags from markdown
- BUG-17: Duplicate schema — src/schema.js now re-exports from data/schema.js
- BUG-18: #canvas-world 1px — changed to inset:0 + minWidth/Height 5000px
- BUG-20: ModeToggle not wired — mounted in LiquidGlassSidebar footer

**Not bugs / already correct (4):**
- BUG-2: init() accepts canvasId param, switchCanvas exists
- BUG-3: Zustand v5 — spread creates new array, no mutation
- BUG-5: Viewport sync loop — guarded by lastExternalViewport ref

---

## What's Live (as of last deploy)

- Sidebar: 3-state cycle (FAB → expanded → fullmenu → FAB) using `(prev + 1) % 3`
- StackCard, FolderCard, DropModePicker — code complete, deployed
- Canvas pan/zoom, drag, history, selection
- Card types: note, bookmark, image, group, stack, folder
- PWA with service worker (network-first cache strategy)
- Light/dark mode
- Import/Export buttons — MISSING from LiquidGlassSidebar (dropped when Toolbar was replaced)

---

## Open Bugs

### BUG-3: Cards invisible in screenshots (PARTIALLY FIXED, still investigating)
- Card computed style says `background: rgb(255,255,255)` but screenshot pixels show `(245,242,238)` (cream canvas background)
- Card DOM exists, getBoundingClientRect correct, getComputedStyle reports white
- Vision model consistently reports "blank canvas" — but cards ARE in the DOM
- Hypothesis: `#canvas-world` background (dot grid) is compositing over cards, or z-index stacking issue
- The `#canvas-world` div is `position: absolute; width: 1px; height: 1px` with `z-index: auto`
- Cards are children of `#canvas-world` with `z-index: auto`
- **Next step:** Try giving cards explicit `z-index: 1` or move cards outside `#canvas-world`

### BUG-4: Import/Export buttons missing (NOT STARTED)
- LiquidGlassSidebar has NO import/export/add/delete/undo/redo/zoom buttons
- Old Toolbar class had these, but was replaced by LiquidGlassSidebar
- ExportDialog.jsx still exists in src/utils/export/ but is never rendered (no trigger)
- **Need to add toolbar buttons somewhere** (FAB menu? LiquidGlassSidebar state 2?)

---

## Key File Map

```
src/components/App.jsx            — Main app, LiquidGlassSidebar + Canvas + ExportDialog
src/canvas/Canvas.jsx             — DnD, card rendering, DropModePicker portal
src/components/CanvasCard.jsx     — Switch by item.type, renders StackCard/FolderCard/note/bookmark/image/group
src/components/StackCard.tsx      — Fan animation, reads item.meta.stack_items
src/components/FolderCard.tsx     — Tab/thumbnail/expand/rename, reads item.meta.child_items
src/components/DropModePicker.jsx — Stack/Folder choice popup
src/ui/LiquidGlassSidebar.jsx     — Navigation sidebar, 3-state cycle
src/styles/canvas.css             — Card styles (restored this session)
src/styles/stack-folder.css       — Stack/Folder specific styles
src/store/useStore.js             — createStack, addToStack, createFolder, addToFolder
src/data/schema.js                — ITEM_TYPES including STACK and FOLDER
```

---

## BOSS Preferences for This Project

- Never delete files without explicit approval
- Workers: openrouter/free + ollama, NEVER nous/opus
- No Tailwind, no Lucide icons — Phosphor only
- No gradients in sidebar
- spec-kit init before coding
- Build in VS Code subagent, not terminal
- Visual verification required before claiming done

---

### Still TODO

1. ~~**Fix BUG-3** (cards invisible in screenshots)~~ — Fixed in `d1f92f20` (#canvas-world size)
2. **Add toolbar buttons** (add/import/export/undo/redo/zoom) — decide with BOSS where they go
3. **Test drag-and-drop** stack/folder creation in browser
4. **Verify StackCard** fan animation works with real items
5. **Verify FolderCard** expand/collapse/rename works
6. **Add import/export UI** — ExportDialog.jsx exists but has no trigger in LiquidGlassSidebar
