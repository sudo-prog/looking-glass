# AGENT_NOTES — Looking Glass

> Last updated: 2026-07-16
> Repo: git@github.com:sudo-prog/looking-glass.git (main → Vercel auto/prod)
> Live: https://looking-glass-eta.vercel.app

## LG-9 Cloud Sync — LIVE (2026-07-16) ✅
- Supabase project `ljlrqqzsowaaimvzbsqp` (ap-northeast-2). DB tables `canvases` + `items`
  (schema in `supabase/migrations/0001_init.sql`), RLS owner policies (`canvases_owner` /
  `items_owner`) lock every row to `auth.uid()`.
- Client: `src/lib/supabaseClient.js` (reads `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`,
  build-time only — NEVER the service_role key), `src/lib/sync.js` (IndexedDB↔Supabase LWW),
  `src/ui/AuthPanel.jsx` (email/password). Local IndexedDB remains source of truth; Supabase is
  the cross-device mirror.
- **Verified end-to-end against live DB**: sign-in via anon key (200) → insert canvas (201) +
  item (201) → read back (200) → anon/no-auth read returns 0 rows (RLS enforced).
- **REMINDER for user**: Supabase "Confirm email" is ON — a brand-new signup must click the
  confirm email before sync activates. To make signup instant: Supabase dashboard →
  Authentication → Providers → Email → OFF "Confirm email". (User aware; left ON for now for account security.)
- Vercel env holds only `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` (encrypted). The anon key
  is PUBLIC (browser-safe; RLS protects data) — safe to appear in the built bundle.

## SECRET HYGIENE — MANDATORY (see `secret-echo-watchdog.py` + `tmp-secret-scrub.py`)
1. NEVER type a secret value in chat (passwords / keys / tokens / JWTs / connection strings).
   Reference by Bitwarden item NAME or ID only.
2. Pull credentials programmatically: unlock via `bin/bitwarden-unlock.py`, read with
   `bw get item` (note: `bw get` TRUNCATES long values — use `bw list items --pretty` to get
   the FULL anon key / JWT). Write to a chmod-600 temp file, use via env, then **shred
   immediately** (`shred -u -z`). Never leave temp secret files for end-of-task cleanup.
3. SECRET CLEANUP IS DONE **IN-SESSION, PERSONALLY** — NOT by an autonomous cron. A daily
   REPORT-ONLY reminder (`tmp-secret-cleanup-reminder`, 09:00) nudges the agent to scan /tmp
   and shred leftover plaintext secrets **with verification** (look at each file first). The
   old auto-scrub cron was REMOVED after it destroyed 29 collateral files on 2026-07-16.
   MANDATORY AUDIT TRAIL: every file shredded (in-session or via the reminder) MUST be logged to OPS_LOG.md — dated line with absolute path, matched secret type, and reason judged safe to delete. No deletion without a log line.

## How to verify mobile UI (MANDATORY — see `mobile-ui-verification-standard` skill)
The agent model is text-only (no native vision). Previous "fixed" claims were wrong
because they relied on build success + code reading + a screenshot. Correct loop:
1. Fix in code (VS Code headless sub-agent, isolated data dir, Kilo/Roo off).
2. `pnpm build` (must pass).
3. `vercel deploy --prod --yes` — git push alone does NOT update the live site.
4. Run a Playwright script from the project dir (`NODE_PATH=node_modules`,
   `LG_URL=https://looking-glass-eta.vercel.app`) that loads the LIVE URL at 390×844,
   hasTouch:true, and asserts via DOM:
   - new card `getBoundingClientRect()` is within [0,390]×[0,844] (on-screen)
   - long-press (CDP `Input.dispatchTouchEvent`, NOT synthetic JS TouchEvent) opens
     `[role="menu"]` with visible items
   - `document.elementFromPoint(menuItemCenter)` resolves to the menu, not the toolbar
   - `document.documentElement.scrollWidth <= 391` (no horizontal overflow)
   - zero console / page errors
5. Repeat until OVERALL_PASS is true. Do not claim done on build alone.

## Known mobile bugs + status (verified 2026-07-15)
- [x] **Menu unreachable on touch** (§1a) — CanvasCard long-press (500ms) + ⋯ kebab now
      open the context menu. Verified: roleMenu opens on long-press, toolbarSwallows=false.
- [x] **New cards spawn off-screen on mobile** — useStore.js hardcoded spawn at screen
      (400,300) → world x≈412, off the right edge on a 390px phone. Fixed with
      `newItemScreenCenter(vp)` (viewport center) across all 9 add* fns. Verified
      cardOnScreen=true (x≈212).
- [x] **Right-click Delete crash** (§0a) — already fixed in HEAD (`const target` rename).
- [x] **AI Summarise/Organise** (§1) — AISummarisePanel uses shared aiConfig.js.
- [x] **AI relay** — api/chat.js: OpenRouter → Google native → web2api fallback,
      free-tier-only models, no personal key.
- [ ] **LG-8 refinements (2026-07-16, IN PROGRESS):** §9.1 send-twice (LiquidOrb), §9.2
      ScratchPad flexbox+dvh centering, §9.3 FolderCard tap feedback, §9.4 LiquidOrb
      fonts/radii→design tokens, §1d sidebar touch reorder, §10.1 shared Modal primitive,
      §10.2 stylelint. New verification harness: `lg8-verify-mobile.mjs` (Playwright 390×844).
      Build + deploy + visual verify PENDING (worker editing worktree).

## Gotchas for future agents
- The infinite canvas applies a world transform (`translate(x,y) scale(s)`); screen→world
  conversion is `worldX = (-vp.x + screenX)/vp.scale`. Spawn coords MUST use the real
  `window.innerWidth/innerHeight`, never a hardcoded desktop number.
- `vercel inspect --prod` is NOT valid syntax; use `vercel inspect <url>` or
  `vercel alias ls`.
- VS Code headless: clear any stale `Xvfb :99` before launching (kill by PID, not
  `pkill -f 'Xvfb :99'` which self-matches). Launch script refuses if display is taken.
- Playwright scripts must run from the repo dir so `require('playwright')` resolves
  from `./node_modules` (it's a devDependency, not global).
