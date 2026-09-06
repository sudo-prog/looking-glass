# Agent Notes — Looking Glass

Architecture decisions, file structure, API patterns, and known issues.

---

## Project Path
`/home/thinkpad/Data/20_Projects/20.05_LOOKING_GLASS/looking-glass/`

## Repository
- GitHub: `sudo-prog/looking-glass` (private)
- Main branch: `main`

## Project Structure
- Frontend: React 18, Vite 5, Tailwind, Zustand
- Backend: API folder with server.js (Express-like)
- Features: Infinite canvas, visual bookmarks, web clipper, PWA support

## Key Technologies
- React 18, Vite 5, Tailwind CSS
- Zustand for state management
- html2canvas for screenshots
- jsdom/jspdf for export
- TipTap for rich text editing
- PWA with service worker
- WebGPU detection for glass tier support

## Vercel Deployment Configuration
- Deployed via Vercel with `vercel.json` configuration
- Output directory: `dist`
- API served from `api/` folder

## AI Integration
- No AI features currently implemented
- Could integrate with gemini-web2api or OpenRouter

## Known Issues
- No backend AI endpoints
- Requires `EXPO_PUBLIC_DOMAIN` for mobile features if any
- Service worker needs proper scope configuration for Vercel

---

## Deployment Checklist
- [ ] Set `VITE_API_BASE_URL` if separate backend needed
- [ ] Verify service worker scope matches Vercel deployment
- [ ] Configure Web Push notifications if using

---

## Session Log

### 2026-09-04 (overnight cron, ~02:00–02:20 AEST)
Three feature branches rebased onto current `develop` (29aa215e), built green, force-pushed.

| Branch | SHA | Files | ±Lines | Build | Review | Push |
|---|---|---|---|---|---|---|
| `feat/phase3-scenes` | 3ca63a75 | 10 | +1146 / −54 | EXIT 0 (vite 22.96s) | manual diff review (OCR `auto/coding:free` 403-quota'd on LLM step; tool-calls succeeded but review.json had no comments) | origin ✅ |
| `feat/star-rating` | 714627e1 | 8 | +434 / −4 | EXIT 0 (vite 17.42s) | manual diff review (mirrors tag-system pattern; 44px tap targets confirmed in RatingSystem.jsx) | origin ✅ |
| `feat/canvas-texture-ui` | 60be9ca9 | 1 | +14 / −1 | EXIT 0 (delegate_task subagent build, 23.17s) | subagent-reported; **verified on disk** before push | origin ✅ |

**Conflict resolution (both rebases):** single conflict in `src/utils/themeConfig.js` `menuIconOrder` array — feature branches ADD a new icon ('scenes' / 'ratings') AND restore 'settings'. Resolution: kept feature-branch version. Auto-mergeable on next merge if user wants to combine them, but each branch's `App.jsx` adds a separate `showScenes`/`showRatings` state so they need a manual merge to develop (state hooks coexist).

**Phase 2 audit items confirmed shipped in develop (29aa215e):** FIX 2 (package-lock.json absent + .gitignore), FIX 10 (server.js present), FIX 14 (BottomSheet font token), FIX 17 (glass-tier detection in index.html + main.jsx), FIX 12 (mobile sidebar bottom bar — see `fix/phase2-audit` branch, already on origin).

**OCR review status:** `ocr review` invoked, llm.test passed, but the `auto/coding:free` calls returned HTTP 403 from the gateway (free-tier quota exhausted; per zero-trust rule no paid fallback). Tool-calls completed (76 calls, file_read/file_read_diff/file_search all OK) so the diff WAS inspected by OCR infrastructure — only the LLM summarization step failed. Manual diff review done in lieu.

**Not tackled (too big for one-night cron):** Phase 3 onboarding demo canvas, Phase 5 Vitest+Playwright tests, design.md a11y report, Phase 6 Tauri/Capacitor wrappers, Phase 7 collab/extension/plugin/monetisation, Phase 8 Immich integration, Phase 9 bookmark DnD reorder / Twitter archive / GitHub stars import.

**Cleanup state:** 10 worktrees listed (4 LG-feature, 4 Orca-stale, 2 LG9-mobile). Orca worktrees (`lg-ai-single-path`, `lg-phase2`, `lg-ui-fix`, `setup-teams-audit`, `team-a-audit`) are leftover from prior Aug sessions and currently stale.

### 2026-09-07 (overnight cron, ~02:00–04:30 AEST)
**Phase 3 onboarding demo canvas — SHIPPED.** Branch `feat/phase3-onboarding` @ `e158de16` (+205/−27 across 5 files) built green (EXIT 0, 15.83s), pushed to origin.

**Files added:**
- `src/data/demoCanvas.js` (61 lines) — DEMO_CANVAS_NAME + 4 seed items (2 NOTES, 1 BOOKMARK, 1 IMAGE) pre-positioned for visible 390px mobile viewport
- `src/ui/OnboardingTour.jsx` (74 lines) — dismissible welcome modal with 4 tour steps, accessible (button labels, dismiss/CTA)

**Files modified:**
- `src/store/useStore.js` (+17) — `seedDemoCanvas()`, `hasSeenOnboarding`, `markOnboardingSeen` (localStorage-backed `lg_onboarding_seen` flag)
- `src/components/App.jsx` (+20) — onboarding render-gate, dismiss wires `markOnboardingSeen()`
- `src/ui/spacesSlice.js` — internal welcome-card seeding skipped on first launch (delegated to Phase 3)

**Logic:** first launch → empty canvas + no flag → seed 4 demo items + show tour → user dismisses → flag persisted → subsequent visits skip both. Coords ensure all 4 cards visible at 390×844 (smallest phone) and 1280×900 (desktop).

**Verification (independent):**
- `git log --oneline origin/develop..origin/feat/phase3-onboarding` → 1 commit, 0 behind
- `npx vite build` re-run from worktree: EXIT 0 in 15.83s, 5104 modules transformed, `dist/assets/demoCanvas-CL0k-Z5q.js` chunk 1.06 kB
- OCR review: invoked, JSON produced, but `auto/coding:free` context-canceled at 13 findings (free-tier limit). Manual diff review done — logic, localStorage gating, and mobile coords all check out.

**Push status:** `git push -u origin feat/phase3-onboarding` → "Everything up-to-date, branch set up to track origin" (EXIT 0). Branch is on origin and ready for develop merge.

**Remaining unmerged work (for human review, NOT pushed to develop):**
- `wip/main-phase9-ui-edits` — local-only WIP, 1 commit ahead of main. Has Phase 9 UI fixes. User should review.
- `fix/phase2-audit` — already 1 commit BEHIND develop (develop has the fixes); branch tip is now stale. Safe to delete from origin.
- Stale Orca worktrees still listed above.