# Kanban — Looking Glass (Updated 2026-06-27)

## 🔴 In Progress (Phase 2 — Audit Fixes)
- [ ] **FIX 2:** Lockfile cleanup (delete package-lock.json, add to .gitignore)
- [ ] **FIX 10:** Add missing server.js (minimal static server)
- [ ] **FIX 14:** BottomSheet font token (replace -apple-system with design tokens)
- [ ] **FIX 17:** Glass tier detection in index.html + main.jsx
- [ ] **FIX 12:** Mobile sidebar bottom bar (full CSS + JSX from audit)

## 🟡 To Do Next (Phase 3 — Critical)
- [ ] Onboarding demo canvas — pre-populated canvas showing all card types + tooltip tour
- [ ] GitHub auto-backup — OAuth flow → private repo → canvas JSON auto-commits on save
- [ ] Touch / mobile gesture parity — pinch-to-zoom, two-finger pan, tap behaviors
- [ ] Permanent masonry canvas mode (vs current on-demand arrangeMasonry)
- [ ] Subheader (###) block type implementation (currently greyed out in menu)

## 🟢 To Do (Phase 4 — Product Quality)
- [ ] Backgrounds & themes — dark/light/custom canvas textures (linen, dot grid variations)
- [ ] Micro-sounds — subtle audio feedback on card drop, create, delete (< 5ms, opt-in)

## 🔵 To Do (Phase 5 — Polish)
- [ ] Tests — Vitest unit tests for Quadtree, schema, exporters; Playwright E2E
- [ ] Design.md a11y report — contrast ratios + WCAG pass/fail
- [ ] Design token live preview — live swatch/preview panel
- [ ] Legacy cleanup — remove src/cards/ and SelectionManager.ts (not in render path)

## ⚪ Backlog (Phase 6 — Desktop/Mobile)
- [ ] Tauri desktop — config files written, needs Rust installed locally to compile
- [ ] Capacitor mobile — capacitor.config.ts written, needs @capacitor packages

## ⚪ Backlog (Phase 7 — Commercial)
- [ ] Cloud sync (Supabase)
- [ ] Real-time collaboration (Yjs CRDT)
- [ ] Version history / timeline
- [ ] Browser extension
- [ ] Plugin system
- [ ] Monetisation (Stripe)

## ✅ Done
- [x] V2 rewrite (phases 1-9)
- [x] Deploy pipeline
- [x] Sidebar 3-state
- [x] StackCard, FolderCard, DropModePicker
- [x] Canvas pan/zoom, drag, history, selection
- [x] Bug audits (36+ fixes)
- [x] Cross-browser fixes
- [x] Menu UI (3 iterations)
- [x] Settings panel
- [x] AI Orb + custom LLMs
- [x] Bookmarks panel
- [x] Command Palette
- [x] Theme customization
- [x] Floating pill menu
- [x] **Reference-Capture Feature Update (2026-06-27):**
  - [x] SelectionToolbar — floating bottom pill for multi-card actions (color, copy, arrange, stack, folder, delete)
  - [x] Canvas drag-to-select (box select with 4px threshold)
  - [x] StackCard diagonal big-to-small cascade + 2-column grid fan
  - [x] FolderCard manila-folder silhouette with name/description on face
  - [x] FolderViewModal — expanded folder grid with move-to-canvas + empty-all
  - [x] BlockTypeMenu — Notion-style "turn into" block switcher (⋮⋮ handle)
  - [x] NoteCard Tiptap with TaskList + TaskItem + Placeholder extensions
  - [x] Lightbox rewrite — back arrow, color swatches, metadata panel, glass toolbar
  - [x] ContextMenu — "Open Folder" / "Break Stack" options
  - [x] VideoCard autoplay muted looping
  - [x] WebClipScreenshotCard blinking-cursor loading state
  - [x] useStore new actions — setSelection, unstackToCanvas, removeFromFolder, unfolderToCanvas, arrangeMasonry
