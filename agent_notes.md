# AGENT_NOTES — Looking Glass

> Last updated: 2026-07-15
> Repo: git@github.com:sudo-prog/looking-glass.git (main → Vercel auto/prod)
> Live: https://looking-glass-eta.vercel.app

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
