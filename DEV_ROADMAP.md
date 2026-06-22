# Dev Roadmap — Looking Glass

## Phase 1: V2 Foundation ✅
- [x] V2 rewrite (phases 1-9: tokens, glass renderer, canvas engine, cards, UI chrome, typography, a11y, responsive, PWA)
- [x] Deploy pipeline (GitHub Actions → gh-pages)
- [x] Sidebar 3-state (FAB → thin bar → full menu)
- [x] StackCard, FolderCard, DropModePicker
- [x] Canvas pan/zoom, drag, history, selection
- [x] Bug audits (36+ fixes across 2 sessions)
- [x] Cross-browser CSS/JS fixes (Firefox, Safari, mobile)
- [x] Menu UI (3 iterations: deep audit → redesign → floating pill)
- [x] Settings panel (theme, glass, colors, background, typography, icons, AI, data)
- [x] AI Orb with custom LLM support
- [x] Bookmarks panel (browser + Twitter/X import)
- [x] Command Palette (Ctrl+K)
- [x] Theme customization (glass, colors, background image, typography)
- [x] Floating pill menu (drag-to-reorder, long-press remove, icon pool)

## Phase 2: Audit Fixes (from AUDIT_FIXES.md)
- [ ] FIX 2: Lockfile cleanup (delete package-lock.json, add to .gitignore)
- [ ] FIX 10: Add missing server.js (minimal static server)
- [ ] FIX 14: BottomSheet font token (replace -apple-system with design tokens)
- [ ] FIX 17: Glass tier detection in index.html + main.jsx
- [ ] FIX 12: Mobile sidebar bottom bar (full CSS + JSX from audit)
- [ ] FIX 3: Deploy workflow review (discuss with BOSS — current workflow works)

## Phase 3: Critical Features (from Remaining.txt)
- [ ] Onboarding demo canvas — pre-populated canvas showing all card types + tooltip tour
- [ ] GitHub auto-backup — OAuth flow → private repo → canvas JSON auto-commits on save
- [ ] Touch / mobile gesture parity — pinch-to-zoom, two-finger pan, tap behaviors

## Phase 4: Product Quality (from Remaining.txt)
- [ ] Backgrounds & themes — dark/light/custom canvas textures (linen, dot grid variations)
- [ ] Micro-sounds — subtle audio feedback on card drop, create, delete (< 5ms, opt-in)

## Phase 5: Polish (from Remaining.txt)
- [ ] Tests — Vitest unit tests for Quadtree, schema, exporters; Playwright E2E
- [ ] Design.md a11y report — contrast ratios + WCAG pass/fail
- [ ] Design token live preview — live swatch/preview panel

## Phase 6: Desktop / Mobile Wrappers (from Remaining.txt)
- [ ] Tauri desktop — config files written, needs Rust installed locally to compile
- [ ] Capacitor mobile — capacitor.config.ts written, needs @capacitor packages

## Phase 7: Commercial (from Remaining.txt)
- [ ] Cloud sync — Supabase multi-device canvas sync (opt-in, paid tier)
- [ ] Real-time collaboration — Yjs CRDT for shared canvases
- [ ] Version history / timeline — checkpoint diffs with visual rewind
- [ ] Browser extension — one-click clip any page/image/selection to canvas
- [ ] Plugin system — custom card types, importers, exporters
- [ ] Monetisation — Stripe/Lemon Squeezy, freemium gating
