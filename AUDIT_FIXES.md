# Looking Glass — Audit Fixes Task List

**Branch:** `develop`
**Kanban ID:** `t_audit_001`

## Fixes to Apply (in order)

### FIX 2 — Lockfile cleanup
- Delete `package-lock.json`
- Ensure `pnpm-lock.yaml` exists (it does)
- Add `package-lock.json` to `.gitignore` if not already there

### FIX 10 — Add missing `server.js`
Create `server.js` at project root:
```js
import { createServer } from 'node:http';
import { existsSync } from 'node:fs';
import { join, extname } from 'node:path';

const DIST = new URL('./dist', import.meta.url).pathname;
const PORT = process.env.PORT ?? 3000;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'text/javascript',
  '.css':  'text/css',
  '.json': 'application/json',
  '.png':  'image/png',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
  '.woff2':'font/woff2',
  '.webmanifest': 'application/manifest+json',
};

createServer((req, res) => {
  let url = req.url.replace(/\?.*$/, '').replace(/^\/looking-glass/, '') || '/';
  let file = join(DIST, url === '/' ? 'index.html' : url);
  if (!existsSync(file)) file = join(DIST, 'index.html');
  res.setHeader('Content-Type', MIME[extname(file)] ?? 'application/octet-stream');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  createReadStream(file)
    .on('error', () => { res.writeHead(404); res.end('Not found'); })
    .pipe(res);
}).listen(PORT, () => console.log(`Looking Glass → http://localhost:${PORT}/looking-glass/`));
```
Also add `"start": "node server.js"` to package.json scripts.

### FIX 14 — BottomSheet font token
In `src/components/mobile/BottomSheet.css`:
- Find any `font-family` declarations using `-apple-system` stack
- Replace with `font-family: var(--font-ui, 'Space Grotesk', system-ui, sans-serif);`
- If no `-apple-system` found, skip (already correct)

### FIX 17 — Glass tier detection in `index.html`
Add this script BEFORE the existing theme init script in `index.html`:
```html
<script>
  (function () {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      document.documentElement.dataset.glassTier = '3';
      return;
    }
    if (typeof CSS !== 'undefined' && CSS.supports('backdrop-filter', 'blur(1px)')) {
      document.documentElement.dataset.glassTier = '2';
    } else {
      document.documentElement.dataset.glassTier = '3';
    }
  })();
</script>
```
Also add glass tier detection to `src/main.jsx` at the top (before ReactDOM.createRoot):
```js
async function detectGlassTier() {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return 3;
  try {
    const adapter = await navigator.gpu?.requestAdapter();
    if (adapter) return 1;
  } catch (_) {}
  if (CSS.supports('backdrop-filter', 'blur(1px)') ||
      CSS.supports('-webkit-backdrop-filter', 'blur(1px)')) return 2;
  return 3;
}

detectGlassTier().then((tier) => {
  document.documentElement.dataset.glassTier = String(tier);
  console.info(`[Looking Glass] Glass tier: ${tier}`);
});
```

### FIX 12 — Mobile sidebar bottom bar (LIQUID GLASS SIDEBAR)
**This is NEW COMPONENT WORK.** The audit provides full CSS and JSX for mobile sidebar behavior.

The sidebar component is at `src/components/LiquidGlassSidebar.jsx` (NOT in a `sidebar/` subdirectory — it's directly in `src/components/`).

Read the current `LiquidGlassSidebar.jsx` and `LiquidGlassSidebar.css` (if it exists at `src/components/LiquidGlassSidebar.css` or similar).

Add mobile collapse behavior:
1. Add `isMobile` state using `matchMedia('(max-width: 767px)')` with `useEffect` listener
2. Add `expanded` state for mobile bottom sheet
3. Add `glass-surface-mount` CustomEvent dispatch when expanded on mobile
4. Add swipe-to-dismiss (touchStart/touchEnd handlers)
5. Add CSS classes: `lg-sidebar--expanded`, `lg-sidebar--desktop`, `lg-sidebar__handle`, `lg-sidebar__nav`, `lg-sidebar__nav-item`, `lg-sidebar__wordmark`, `lg-sidebar__section-label`, `lg-sidebar__ai-input`
6. Add mobile CSS media query block at `< 768px` for bottom bar layout
7. Add `data-glass-surface="toolbar"` attribute on the aside element

Use the full CSS and JSX from the audit report (LOOKING_GLASS_AUDIT_AND_FIXES.md lines 300-528).

### FIX 3 — Deploy workflow (OPTIONAL — discuss with BOSS first)
Current workflow uses GitHub's native `actions/deploy-pages@v4`. The audit suggests switching to `peaceiris/actions-gh-pages@v4` targeting `gh-pages` branch. 
**DECISION NEEDED:** Current workflow works. Only change if BOSS approves.

## Files to Modify
1. `.gitignore` — add `package-lock.json`
2. `package.json` — add `"start": "node server.js"` script
3. `server.js` — CREATE new file
4. `src/components/mobile/BottomSheet.css` — fix font token
5. `index.html` — add glass tier detection script
6. `src/main.jsx` — add glass tier detection
7. `src/components/LiquidGlassSidebar.jsx` — add mobile collapse behavior
8. `src/components/LiquidGlassSidebar.css` — add mobile bottom bar styles (or create if doesn't exist)

## Verification
After all fixes:
1. Run `cd /home/thinkpad/superpower.studio/projects/looking-glass && npx vite build` — must succeed
2. Check for TypeScript/import errors
3. Commit all changes to `develop` branch
4. Do NOT merge to main (BOSS will decide when to deploy)
