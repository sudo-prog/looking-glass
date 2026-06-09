# Looking Glass — Bug Audit Report

## Summary

| Severity | Count | Status |
|----------|-------|--------|
| Critical / Data loss | 5 | ✅ Fixed |
| Broken feature | 9 | ✅ Fixed |
| Accessibility | 2 | ✅ Fixed |
| Stale / dead code | 1 | ✅ Deleted |

---

## Files Changed

| File | Bugs Fixed |
|------|-----------|
| `src/data/schema.js` | Deep-merge in `createItem` so partial overrides don't drop base keys |
| `src/data/store.js` | Concurrent `openDB()` race; `bulkImport` atomicity; added `deleteCanvas()` |
| `src/store/useStore.js` | 7 bugs (see below) |
| `src/components/App.jsx` | 10 bugs (see below) |
| `src/canvas/Canvas.jsx` | 6 bugs (see below) |
| `src/components/CanvasCard.jsx` | 5 bugs (see below) |
| `src/history/HistoryManager.js` | `redo()` for move/update was a no-op |
| `src/ui/BottomSheet.jsx` | Inverted snap points; `top` vs `transform`; wrong close threshold |
| `src/ui/ModeToggle.jsx` | Keyboard inaccessible (outer div had no handler) |
| `src/utils/export/ExportDialog.jsx` | HTML tags in markdown export |
| `src/schema.js` | **Deleted** — stale duplicate of `src/data/schema.js` |

---

## Bug Details

### `src/data/store.js`
- **Race condition**: `openDB()` called concurrently before first resolve could trigger `onupgradeneeded` twice in some browsers. Fixed with a singleton in-flight promise guard.
- **`bulkImport` no atomicity**: used `Promise.all()` with per-item transactions — if one failed, others continued, leaving DB in partial state. Fixed: single transaction wrapping all puts.
- **Missing `deleteCanvas()`**: referenced by `SpacesManager` but never implemented. Added.

### `src/store/useStore.js`
- **`updateItem` swallowed explicit `null`**: `updates.content || {}` turned `{ content: null }` into `{}`. Fixed: checks `!= null` before merging.
- **`setViewport` thrashed IDB on every frame**: called `idbStore.saveCanvas()` on every pan/zoom pointer event (60fps). Fixed: debounced at 400ms.
- **`deleteSelected` N re-renders**: called `deleteItem()` in a loop, each triggering a re-render. Fixed: batched into one `set()` call.
- **`search` matched raw HTML**: note content is stored as Tiptap HTML. Searching `"hello"` missed `<p>hello</p>`. Fixed: strips HTML before matching.
- **`exportData` wrong structure**: returned `{ items }` flat, not the `{ canvases: [{ items }] }` v0.3 format expected by import. Fixed.
- **`init` forgot last active canvas**: always loaded `canvases[0]`. Now persists last canvas ID to `localStorage`.
- **`addNote` always spawned at same point**: no jitter → stacked notes invisible. Added small random offset.

### `src/components/App.jsx`
- **`handleUndo` mutated array in-place**: `items.splice(...)` then `setState({ items: [...items] })` — the spread creates a new array but the splice already mutated the original. Fixed: filter/map to new arrays.
- **`handleRedo` missing `move` and `update` cases**: redo only handled `add`/`delete`. Fixed: all four types handled symmetrically with undo.
- **`handleDeleteSelected` stale closure**: read `selectedIds` from a closure that was captured before the last selection change. Fixed: reads `useStore.getState()` fresh.
- **`handleZoomIn/Out` local `zoom` state**: maintained a local `zoom` variable that drifted from `viewport.scale` in the store. Fixed: reads from store directly.
- **`handleFit` was a no-op**: set local zoom to 1 but did nothing to the canvas transform. Fixed: calls `canvasRef.current.fitToContent()` via `forwardRef`.
- **`prompt()` for search**: blocked main thread on mobile, caused Safari to re-layout canvas mid-interaction. Fixed: opens `CommandPalette` instead.
- **`ModeToggle` never mounted**: existed as a component but was not rendered anywhere. Fixed: wired into `LiquidGlassSidebar` via `isDark`/`onToggleTheme` props.
- **Keyboard handler missing deps**: `handleUndo`/`handleRedo` not in the `useEffect` dependency array. Fixed.
- **`handleItemSave` redo snapshot**: `UpdateItemCommand` was constructed with `{ ...item }` for old but the new snapshot wasn't computed — just passed `updates`. Fixed: compute full merged snapshot for both old and new.
- **`handleFit` zoom state not updated**: Even after fixing fitToContent, the zoom indicator would show stale value. Fixed: fitToContent now calls `onViewportChange` which updates the store.

### `src/canvas/Canvas.jsx`
- **Drag position divergence**: `dragStart.current.itemX` read from `item.x` React prop. If store updated mid-drag, prop and DOM position diverged. Fixed: reads `parseFloat(card.style.left)` from the DOM element at drag-start.
- **Viewport feedback loop**: `onViewportChange` called on every pointer move event triggered `useEffect([viewport])` → `applyTransform` → another render. Fixed: viewport committed to store only on `pointerUp` and wheel end; transform applied directly to DOM during interaction.
- **Drop-target highlights not cleared on fast moves**: `clearDropHighlights()` was only in `pointerUp`. On a fast drag that skips cards, stale `.drop-target-*` classes remained. Fixed: called in both `pointerMove` rAF and `pointerUp`.
- **Variable shadowing `t`**: `const t = transformRef.current` inside the drag handler, then `const t = target.dataset.type` — second `t` shadowed the first in closure. Fixed: renamed inner variable to `tgt`.
- **`forwardRef` missing**: `App.jsx` needed `canvasRef.current.fitToContent()` but `Canvas` was a plain function. Fixed: wrapped with `forwardRef` + `useImperativeHandle`.
- **`handlePickerFolder` used `prompt()`**: blocks thread on mobile. Fixed: creates folder with default name; user can rename inline via `FolderCard`.

### `src/components/CanvasCard.jsx`
- **`NoteCard` saveTimeout leak**: `saveTimeout.current` never cleared on unmount. `onSave` called after component was gone. Fixed: cleanup in `useEffect` return.
- **`NoteCard` Tiptap editor leak**: `editor` not destroyed on unmount. Fixed: `editor?.destroy()` in cleanup.
- **`StackCard` fan button started drag**: `onPointerDown={onDragStart}` on the parent fired before `toggleFan` could stop propagation. Fixed: added `onPointerDown={e => e.stopPropagation()}` to `.stack-hint`.
- **`FolderCard` used `prompt()`**: thread-blocking on mobile Safari. Fixed: inline rename `<input>` shown on double-click, confirmed on Enter/blur.
- **`GroupCard` children not rendered**: accepted `children` prop but also had `child_items` in `meta`. The `children` prop was always `undefined` from `CanvasCard`. Fixed: reads from `item.meta?.child_items`.

### `src/history/HistoryManager.js`
- **`MoveItemCommand` missing `newX`/`newY`**: redo for a move had no data to re-apply. Fixed: constructor stores `newX`/`newY`; `redo()` returns them.
- **`UpdateItemCommand` missing `redo()` return**: `redo()` returned `undefined`. Fixed: returns `this.newData`.
- **`HistoryManager.redo()` always returned `result: null`**: callers (App.jsx) couldn't act on redo data. Fixed: passes `cmd.redo()` result back.

### `src/ui/BottomSheet.jsx`
- **Snap points inverted**: `peek: 15` meant sheet top at 15% from top of screen = 85% open (the full position). `full: 90` = almost entirely off screen. Corrected to `full: 0.10`, `half: 0.50`, `peek: 0.82`.
- **`top` + `bottom: 0` = stretched sheet**: when both `top` and `bottom` are set on a `position:fixed` element it stretches. Fixed: use `transform: translateY()` only, no `top`.
- **Close threshold `> peek + 10 = 25`**: at default position (50) this immediately closed the sheet. Fixed: close threshold is `0.92` (nearly off screen).

### `src/ui/ModeToggle.jsx`
- **Keyboard inaccessible**: outer `div` had `role="switch"` and `tabIndex=0` but no `onClick` or `onKeyDown`. Tab focus went to div but Space/Enter did nothing. Fixed: both outer div and track activate toggle; `onKeyDown` handles Space and Enter.

### `src/utils/export/ExportDialog.jsx`
- **HTML in markdown export**: note `content.text` is Tiptap HTML (`<p>hello <strong>world</strong></p>`). Export wrote raw HTML into `.md` files. Fixed: `stripHtml()` applied before writing.

### `src/schema.js` (root) — DELETED
- Stale duplicate of `src/data/schema.js`. Had different `ITEM_TYPES` (missing STACK/FOLDER) and different version (0.4.0 vs 0.1.0). Could cause import confusion. Deleted.
