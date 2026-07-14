# Development Roadmap — Looking Glass

> Last updated: 2026-06-27
> Repo: git@github.com:Sudo-Prog/looking-glass.git
> Branch: main → Vercel auto-deploy (GitHub Pages / develop are stale)

---

## Phase 1 — V2 Foundation ✅

### Phases 1-9 (Completed 2026-06-05 → 2026-06-11)
- [x] Design tokens + glass rendering engine (WebGPU + tiered fallback)
- [x] Infinite canvas engine (pan/zoom/drag/drop)
- [x] Card system (note, bookmark, image, group, stack, folder)
- [x] Sidebar 3-state cycle (FAB → thin bar → full menu)
- [x] UI chrome: settings panel, AI orb, bookmarks panel, command palette
- [x] Cross-browser glass fallbacks (Firefox, Safari, mobile)
- [x] Theme customization (glass, colors, background image, typography)
- [x] Custom LLM providers in AI Orb
- [x] Floating pill menu with drag-to-reorder icons
- [x] Deploy pipeline (GitHub Actions → gh-pages)

---

## Phase 2 — Audit Fixes ⏳

- [ ] **FIX 2:** Lockfile cleanup (delete package-lock.json, add to .gitignore)
- [ ] **FIX 10:** Add missing server.js (minimal static server)
- [ ] **FIX 14:** BottomSheet font token (replace -apple-system with design tokens)
- [ ] **FIX 17:** Glass tier detection in index.html + main.jsx *(partially done in built output)*
- [ ] **FIX 12:** Mobile sidebar bottom bar (full CSS + JSX from audit)

---

## Phase 3 — Critical Features 📋

- [ ] Onboarding demo canvas — pre-populated canvas showing all card types + tooltip tour
- [ ] GitHub auto-backup — OAuth flow → private repo → canvas JSON auto-commits on save
- [ ] Touch / mobile gesture parity — pinch-to-zoom, two-finger pan, tap behaviors

---

## Phase 4 — Product Quality 📋

- [ ] Backgrounds & themes — dark/light/custom canvas textures (linen, dot grid variations)
- [ ] Micro-sounds — subtle audio feedback on card drop, create, delete (< 5ms, opt-in)

---

## Phase 5 — Polish 📋

- [ ] Tests — Vitest unit tests for Quadtree, schema, exporters; Playwright E2E
- [ ] Design.md a11y report — contrast ratios + WCAG pass/fail
- [ ] Design token live preview — live swatch/preview panel
- [ ] Legacy cleanup — remove src/cards/ and SelectionManager.ts (not in render path)

---

## Phase 6 — Desktop/Mobile Wrappers ⚪

- [ ] Tauri desktop — config files written (src-tauri/), needs Rust installed locally to compile
- [ ] Capacitor mobile — capacitor.config.ts written, needs @capacitor packages installed locally

---

## Phase 7 — Commercial ⚪

- [ ] Cloud sync (Supabase)
- [ ] Real-time collaboration (Yjs CRDT)
- [ ] Version history / timeline
- [ ] Browser extension
- [ ] Plugin system
- [ ] Monetisation (Stripe / Lemon Squeezy)

---

## Completed Feature Updates

### Reference-Capture Feature Update — 2026-06-27 ✅

Applied from video reference analysis (Web_clip.mp4, Visuals.mp4, Stacks.mp4, STACK_BIG_TO_SMALL.mp4, Paragraphs.mp4, Notes.mp4, FOLDER_GROUPING_.mp4).

| File | Change |
|------|--------|
| `src/ui/SelectionToolbar.jsx` | **NEW** — floating bottom pill for 1+ card selection. Actions: color tag, copy link, arrange-in-grid, stack, folder, delete, clear selection |
| `src/canvas/Canvas.jsx` | Box-select drag (4px threshold), mount SelectionToolbar, new props for selection/folder/color/copy/delete/arrange |
| `src/components/CanvasCard.jsx` | StackCard diagonal big-to-small cascade (bottom-left anchored), 2-column grid fan on click; FolderCard manila-folder silhouette (clip-path notch, name/description on face); NoteCard BlockTypeMenu + Tiptap task extensions |
| `src/ui/FolderViewModal.jsx` | **NEW** — expanded folder clean preview grid, "View all · N items" footer, per-item "move back to canvas", "Empty onto canvas" bulk |
| `src/ui/BlockTypeMenu.jsx` | **NEW** — Notion-style "turn into" block switcher. ⋮⋮ handle tracks cursor; menu with Display #, Headline ##, Subheader ### (disabled), Body ⌘4, List ⌘L, Task ⌘T |
| `src/ui/Lightbox.jsx` | Full rewrite — back arrow, left rail color swatches, right metadata panel (Resolution/Size/Date/Color Profile), caption under image, bottom glass toolbar (copy/download/open original) |
| `src/components/ContextMenu.jsx` | Right-click folder → "Open Folder"; right-click stack → "Break Stack". Desktop + mobile bottom-sheet variants updated |
| `src/components/VideoCard.jsx` | Autoplay on mount, muted, looping (continuous, not hover-dependent); hover only reveals controls |
| `src/components/WebClipScreenshotCard.jsx` | Pending state: blinking-text-cursor + circular dismiss (✕) instead of shimmer skeleton |
| `src/store/useStore.js` | New actions: setSelection, addToSelection, unstackToCanvas, removeFromFolder, unfolderToCanvas, updateFolderDescription, createFolder(ids, name, description), arrangeMasonry |
| `package.json` | Added @tiptap/extension-task-list, task-item, placeholder |

**Build verification:** esbuild syntax check passed for all 11 files. Production build succeeded (4724 modules, 835KB). Dev server running on :5173.

**Known scope exclusions:**
- Permanent masonry canvas mode (implement as on-demand `arrangeMasonry` action instead — different engine from free-position canvas)
- Subheader (###) wired as disabled in UI — intentionally reserved per video reference
- Legacy src/cards/ and SelectionManager.ts not in render path — separate cleanup pass needed

---

## Key Architecture Notes

- **State:** Zustand (useStore.js) — no Redux, no Drizzle
- **Persistence:** IndexedDB via `idb` library (not PostgreSQL)
- **Build:** Vite 5, base path `/` for Vercel (deploy branch is `main`)
- **Glass:** WebGPU + SVG feDisplacementMap + CSS backdrop-filter with tiered fallback (1→2→3)
- **Theme:** Inline script in index.html sets data-theme before React hydration to prevent FOUC
- **Entry:** React 18, main.jsx → App.jsx → Canvas.jsx → CanvasCard.jsx

---

## Main-Branch Audit Remediation — 2026-07-14 (LOOKING_GLASS_AUDIT_MAIN_BRANCH.md)

Committed `d61369ff` on `main`, pushed, deployed to looking-glass-eta. Covers the REAL "AI broken" root causes (not the stale develop audit).

- [x] **LG-1:** Fix right-click Delete crash (TDZ/shadowed `item` → `target`)
- [x] **LG-2:** Mobile — CanvasCard long-press + kebab menu (touch can reach card actions)
- [x] **LG-3:** AISummarisePanel uses shared `aiConfig.js` (was hardcoded `anthropic`, threw on gemini-web2api)
- [x] **LG-4:** AISummarisePanel docks as bottom sheet on mobile
- [x] **LG-5:** Gate unsandboxed `new Function(op.code)()` EVAL behind `window.confirm`
- [x] **LG-6:** Verified `GEMINI_WEB2API_URL` dependency (503 if unset, no fallback) — ops item, no code change
- [x] **LG-7:** Remove dead responsive.css blocks; vercel.json already correct

**Deferred:** stack/folder data-model refactor (structural, larger task).
