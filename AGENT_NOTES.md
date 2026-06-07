# AGENT_NOTES.md — Looking Glass

Dev log for OWL/Hermes agent sessions. BOSS reads this to get current state without repeating context.

---

## 2026-06-08 — Session (Current)

### Deploy Pipeline
- `develop` branch → merge to `main` → GitHub Actions auto-deploys to GitHub Pages
- Workflow: `.github/workflows/deploy.yml` — uses `actions/upload-pages-artifact@v3` + `actions/deploy-pages@v4` (modern API, NOT legacy gh-pages branch)
- Live URL: `https://sudo-prog.github.io/looking-glass/` (with hyphen)
- CDN cache can lag 30-60s after push

### What's Live (as of last deploy)
- Sidebar: 3-state cycle (FAB → expanded → fullmenu → FAB) using `(prev + 1) % 3`
- StackCard, FolderCard, DropModePicker — code complete, deployed
- Import/Export buttons — MISSING from LiquidGlassSidebar (dropped when Toolbar was replaced)
- JS bundle: ~582KB, CSS: ~35KB

### Bugs Found This Session

#### BUG-1: Canvas viewport 0px width (FIXED + deployed)
- App.jsx flex container missing `width: 100%` → canvas got 0px
- Fix: added `width: '100%'` to inline style

#### BUG-2: Card inner element CSS missing (FIXED + deployed)
- V2 CSS rewrite stripped card styles from canvas.css
- Restored: `.canvas-card`, `.card-header`, `.card-title`, `.card-handle`, `.card-note-editor`, etc.

#### BUG-3: Cards invisible — white on cream (PARTIALLY FIXED, still investigating)
- Card computed style says `background: rgb(255,255,255)` but screenshot pixels show `(245,242,238)` (cream)
- Card DOM exists, getBoundingClientRect correct, getComputedStyle reports white
- Vision model consistently reports "blank canvas" — but cards ARE in the DOM
- Hypothesis: `#canvas-world` background (dot grid) is compositing over cards, or z-index stacking issue
- The `#canvas-world` div is `position: absolute; width: 1px; height: 1px` with `z-index: auto`
- Cards are children of `#canvas-world` with `z-index: auto`
- **Next step:** Try giving cards explicit `z-index: 1` or move cards outside `#canvas-world`

#### BUG-4: Import/Export buttons missing
- LiquidGlassSidebar has NO import/export/add/delete/undo/redo/zoom buttons
- Old Toolbar class had these, but was replaced by LiquidGlassSidebar
- ExportDialog.jsx still exists in src/utils/export/ but is never rendered (no trigger)
- **Not yet fixed** — need to add toolbar buttons somewhere (FAB menu? LiquidGlassSidebar state 2?)

### Key File Map
```
src/components/App.jsx          — Main app, LiquidGlassSidebar + Canvas + ExportDialog
src/canvas/Canvas.jsx           — DnD, card rendering, DropModePicker portal
src/components/CanvasCard.jsx   — Switch by item.type, renders StackCard/FolderCard/note/bookmark/image/group
src/components/StackCard.tsx    — Fan animation, reads item.meta.stack_items
src/components/FolderCard.tsx   — Tab/thumbnail/expand/rename, reads item.meta.child_items
src/components/DropModePicker.jsx — Stack/Folder choice popup
src/ui/LiquidGlassSidebar.jsx   — Navigation sidebar, 3-state cycle
src/styles/canvas.css           — Card styles (restored this session)
src/styles/stack-folder.css    — Stack/Folder specific styles
src/store/useStore.js           — createStack, addToStack, createFolder, addToFolder
src/data/schema.js              — ITEM_TYPES including STACK and FOLDER
```

### BOSS Preferences for This Project
- Never delete files without explicit approval
- Workers: openrouter/free + ollama, NEVER nous/opus
- No Tailwind, no Lucide icons — Phosphor only
- No gradients in sidebar
- spec-kit init before coding
- Build in VS Code subagent, not terminal
- Visual verification required before claiming done

### Still TODO
1. Fix BUG-3 (cards invisible in screenshots) — likely z-index or DOM structure issue
2. Add toolbar buttons (add/import/export/undo/redo/zoom) — decide with BOSS where they go
3. Test drag-and-drop stack/folder creation in browser
4. Verify StackCard fan animation works with real items
5. Verify FolderCard expand/collapse/rename works
