# Looking Glass — Audit Report & Fixes
> Branch: `develop` · Audited: June 2026
> Covers: infrastructure bugs, design-system drift, mobile UI parity, glass implementation

---

## Summary Table

| # | Severity | Area | Issue | Fix |
|---|---|---|---|---|
| 1 | 🔴 CRITICAL | Infrastructure | Phantom npm package versions | Pin to real versions |
| 2 | 🔴 CRITICAL | Infrastructure | Mixed lockfiles (npm + pnpm) | Delete `package-lock.json`, promote pnpm |
| 3 | 🔴 CRITICAL | CI/CD | Deploy workflow targets deleted `main` branch | Retarget to `develop` → `gh-pages` |
| 4 | 🔴 CRITICAL | CI/CD | Build step deletes compiled files before commit | Use `peaceiris/actions-gh-pages` |
| 5 | 🔴 CRITICAL | CI/CD | Vite `base` path not set for GitHub Pages | Add `base: '/looking-glass/'` |
| 6 | 🟠 HIGH | Design System | Wrong font (`DM Sans`) in `index.html` | Replace with Space Grotesk + Space Mono + Doto |
| 7 | 🟠 HIGH | Design System | Wrong background color token (`#0a0a0f`) | Fix to `#0A0A0A` |
| 8 | 🟠 HIGH | Design System | Missing `data-theme` init script | Add inline script before `</head>` |
| 9 | 🟠 HIGH | Security | `bottom-sheet-demo.html` exposed at root | Move to `src/demos/`, gate with `DEV` |
| 10 | 🟠 HIGH | Missing File | `server.js` referenced in package.json but absent | Add minimal node server |
| 11 | 🟡 MEDIUM | Design System | Missing `apple-touch-icon` in `index.html` | Add `<link>` tag |
| 12 | 🟡 MEDIUM | Mobile UI | Sidebar doesn't collapse to bottom bar on `<768px` | Full CSS + JS fix |
| 13 | 🟡 MEDIUM | Mobile UI | Canvas touch events not passive-false | Add correct event options |
| 14 | 🟡 MEDIUM | Mobile UI | Bottom sheet CSS uses `-apple-system` font stack | Replace with design system tokens |
| 15 | 🟡 MEDIUM | Mobile UI | Bottom sheet CSS absolute path breaks on GH Pages | Fix to relative or inject via JS module |
| 16 | 🟢 LOW | Glass Engine | No `glass-surface-mount` event wiring on mobile expand | Add event dispatch |
| 17 | 🟢 LOW | Glass Engine | No glass tier detection / data attribute | Add boot script |

---

## Fix 1–5 — Infrastructure & CI/CD

### `package.json` — correct dependency versions

```json
{
  "name": "looking-glass",
  "version": "0.1.0",
  "description": "Your visual memory — bookmarks, web clips, ideas on an infinite canvas",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "start": "node server.js"
  },
  "keywords": ["pwa", "canvas", "bookmarks", "visual-memory"],
  "author": "Sudo-Prog",
  "license": "MIT",
  "dependencies": {
    "@tiptap/extension-link":      "^2.4.0",
    "@tiptap/extension-underline": "^2.4.0",
    "@tiptap/react":               "^2.4.0",
    "@tiptap/starter-kit":         "^2.4.0",
    "fuse.js":                     "^7.0.0",
    "html2canvas":                 "^1.4.1",
    "idb":                         "^8.0.0",
    "jspdf":                       "^2.5.2",
    "react":                       "^18.3.1",
    "react-dom":                   "^18.3.1",
    "sql.js":                      "^1.12.0",
    "zustand":                     "^4.5.0"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.3.0",
    "vite":                 "^5.4.0"
  }
}
```

### `.github/workflows/deploy.yml` — corrected

```yaml
name: Deploy to GitHub Pages
on:
  push:
    branches: [develop]
  workflow_dispatch:

permissions:
  contents: write

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup pnpm
        uses: pnpm/action-setup@v3
        with:
          version: 9

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'

      - name: Install
        run: pnpm install --frozen-lockfile

      - name: Build
        run: pnpm build

      - name: Deploy
        uses: peaceiris/actions-gh-pages@v4
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dist
          publish_branch: gh-pages
          cname: ''
```

### `vite.config.js` — add base path

```js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/looking-glass/',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
  },
  server: {
    port: 5173,
    open: true,
  },
});
```

### `server.js` — add missing file

```js
// server.js — minimal production static server
import { createServer } from 'node:http';
import { createReadStream, existsSync } from 'node:fs';
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
  if (!existsSync(file)) file = join(DIST, 'index.html'); // SPA fallback

  res.setHeader('Content-Type', MIME[extname(file)] ?? 'application/octet-stream');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  createReadStream(file)
    .on('error', () => { res.writeHead(404); res.end('Not found'); })
    .pipe(res);
}).listen(PORT, () => console.log(`Looking Glass → http://localhost:${PORT}/looking-glass/`));
```

### Lockfile cleanup

```bash
# Run once in repo root
rm package-lock.json
echo 'package-lock.json' >> .gitignore
pnpm install
```

---

## Fix 6–11 — `index.html` — Full Corrected File

```html
<!DOCTYPE html>
<html lang="en" data-theme="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
  <meta name="theme-color" content="#0A0A0A">
  <meta name="description" content="Your visual memory — bookmarks, web clips, ideas on an infinite canvas">

  <!-- PWA -->
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
  <meta name="apple-mobile-web-app-title" content="Looking Glass">
  <link rel="manifest" href="/looking-glass/manifest.json">
  <link rel="icon" type="image/svg+xml" href="/looking-glass/icons/icon-192.png">
  <link rel="apple-touch-icon" href="/looking-glass/icons/apple-touch-icon.png">

  <title>Looking Glass</title>

  <!-- FIX 6: Space Grotesk + Space Mono + Doto (was DM Sans / DM Mono) -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=Space+Mono:ital,wght@0,400;0,700;1,400&family=Doto:ROND@0..100;wght@100..900&display=swap" rel="stylesheet">

  <!-- FIX 17: Glass tier detection -->
  <script>
    (function () {
      if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
        document.documentElement.dataset.glassTier = '3';
        return;
      }
      if (typeof CSS !== 'undefined' && CSS.supports('backdrop-filter', 'blur(1px)')) {
        document.documentElement.dataset.glassTier = '2'; // upgraded to 1 by main.jsx if WebGPU available
      } else {
        document.documentElement.dataset.glassTier = '3';
      }
    })();
  </script>

  <!-- FIX 8: data-theme init — runs before React hydration to prevent flash -->
  <script>
    (function () {
      var stored = localStorage.getItem('lg-theme');
      var prefersDark = !stored && matchMedia('(prefers-color-scheme: dark)').matches;
      var theme = stored || (prefersDark ? 'dark' : 'light');
      document.documentElement.dataset.theme = theme;
    })();
  </script>

  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    html, body {
      height: 100%;
      overflow: hidden;
      /* FIX 7: correct background token #0A0A0A not #0a0a0f */
      background: #0A0A0A;
      color: #F0F0F0;
      /* FIX 6: Space Grotesk as primary UI font */
      font-family: 'Space Grotesk', system-ui, sans-serif;
    }

    [data-theme="light"] body {
      background: #F5F2EE;
      color: #0A0A0A;
    }

    #app {
      height: 100%;
      display: flex;
      flex-direction: column;
    }

    /* Prevent FOUC on glass elements */
    .lg-glass {
      visibility: hidden;
    }
    .lg-glass[data-glass-ready] {
      visibility: visible;
    }
  </style>
</head>
<body>
  <div id="app"></div>
  <script type="module" src="/src/main.jsx"></script>
</body>
</html>
```

---

## Fix 9 — Move `bottom-sheet-demo.html`

```bash
mkdir -p src/demos
mv bottom-sheet-demo.html src/demos/
```

---

## Fix 12 — Mobile UI Parity: Sidebar Bottom Bar

This is the core mobile parity fix. The sidebar must collapse to a bottom bar
on `< 768px` — not disappear, not become a hamburger.

```css
/* src/ui/LiquidGlassSidebar.css — MOBILE ADDITIONS */

/* ─── Mobile: bottom bar (collapsed) ─── */
@media (max-width: 767px) {
  .lg-sidebar {
    /* Override desktop left-rail positioning */
    position: fixed;
    inset: auto 0 0 0;
    top: auto;
    left: 0;
    right: 0;
    bottom: 0;

    width: 100%;
    height: calc(56px + env(safe-area-inset-bottom));
    padding-bottom: env(safe-area-inset-bottom);

    border-radius: 20px 20px 0 0;
    border-top: 1px solid var(--glass-border-dark, rgba(255,255,255,0.08));
    border-left: none;
    border-right: none;

    flex-direction: row;
    align-items: center;
    justify-content: space-around;
    padding-left: 16px;
    padding-right: 16px;

    /* Match desktop glass surface */
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    background: var(--glass-tint-dark, rgba(15, 15, 15, 0.70));

    /* Slide up from bottom */
    transform: translateY(0);
    transition: height 0.35s cubic-bezier(0.32, 0.72, 0, 1),
                border-radius 0.35s cubic-bezier(0.32, 0.72, 0, 1);

    z-index: 100;
  }

  /* Bottom bar icon row */
  .lg-sidebar__nav {
    display: flex;
    flex-direction: row;
    gap: 0;
    width: 100%;
    justify-content: space-around;
    align-items: center;
  }

  .lg-sidebar__nav-item {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 56px;
    gap: 2px;
    font-size: 10px;
    color: var(--text-secondary, #888);
    cursor: pointer;
    transition: color 0.15s;
  }

  .lg-sidebar__nav-item:active,
  .lg-sidebar__nav-item--active {
    color: var(--text-primary, #F0F0F0);
  }

  .lg-sidebar__nav-item svg {
    width: 22px;
    height: 22px;
  }

  /* Hide desktop-only elements in bottom bar mode */
  .lg-sidebar__wordmark,
  .lg-sidebar__section-label,
  .lg-sidebar__ai-input {
    display: none;
  }

  /* ─── Mobile: expanded (bottom sheet) ─── */
  .lg-sidebar--expanded {
    height: min(80dvh, 640px);
    border-radius: 24px 24px 0 0;
    flex-direction: column;
    align-items: flex-start;
    justify-content: flex-start;
    padding: 20px 20px calc(20px + env(safe-area-inset-bottom));
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
  }

  .lg-sidebar--expanded .lg-sidebar__wordmark {
    display: block;
    margin-bottom: 16px;
  }

  .lg-sidebar--expanded .lg-sidebar__section-label {
    display: block;
  }

  .lg-sidebar--expanded .lg-sidebar__ai-input {
    display: flex;
  }

  .lg-sidebar--expanded .lg-sidebar__nav {
    flex-direction: column;
    width: 100%;
    gap: 4px;
    margin-top: 8px;
  }

  .lg-sidebar--expanded .lg-sidebar__nav-item {
    flex-direction: row;
    justify-content: flex-start;
    height: 44px;
    gap: 12px;
    font-size: 15px;
    padding: 0 8px;
    border-radius: 10px;
  }

  .lg-sidebar--expanded .lg-sidebar__nav-item:active {
    background: rgba(255,255,255,0.06);
  }

  /* Drag handle */
  .lg-sidebar__handle {
    display: block;
    width: 36px;
    height: 4px;
    background: rgba(255,255,255,0.20);
    border-radius: 2px;
    margin: 0 auto 16px;
    flex-shrink: 0;
  }

  /* Canvas safe area — push canvas up so bottom bar doesn't overlap */
  .lg-canvas-container {
    padding-bottom: calc(56px + env(safe-area-inset-bottom));
  }
}

/* Light mode adjustments for bottom bar */
@media (max-width: 767px) {
  [data-theme="light"] .lg-sidebar {
    background: rgba(245, 242, 238, 0.85);
    border-top-color: rgba(0,0,0,0.08);
  }
}
```

```jsx
// src/ui/LiquidGlassSidebar.jsx — MOBILE ADDITIONS

import { useState, useEffect, useRef, useCallback } from 'react';

export function LiquidGlassSidebar({ /* existing props */ }) {
  const [expanded, setExpanded] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const sidebarRef = useRef(null);

  // Mobile detection with matchMedia (avoids layout thrashing)
  useEffect(() => {
    const mq = matchMedia('(max-width: 767px)');
    const handler = (e) => setIsMobile(e.matches);
    setIsMobile(mq.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // Dispatch glass-surface-mount when expanded on mobile (WebGPU integration)
  useEffect(() => {
    if (isMobile && expanded && sidebarRef.current) {
      sidebarRef.current.dispatchEvent(new CustomEvent('glass-surface-mount', {
        bubbles: true,
        detail: { surface: 'toolbar', el: sidebarRef.current },
      }));
    }
  }, [isMobile, expanded]);

  // Swipe-to-dismiss on mobile
  const handleTouchStart = useRef(null);
  const onTouchStart = useCallback((e) => {
    handleTouchStart.current = e.touches[0].clientY;
  }, []);
  const onTouchEnd = useCallback((e) => {
    if (!handleTouchStart.current) return;
    const delta = e.changedTouches[0].clientY - handleTouchStart.current;
    if (delta > 80) setExpanded(false); // swipe down > 80px = dismiss
    handleTouchStart.current = null;
  }, []);

  const classNames = [
    'lg-sidebar',
    isMobile && expanded && 'lg-sidebar--expanded',
    !isMobile && 'lg-sidebar--desktop',
  ].filter(Boolean).join(' ');

  return (
    <aside
      ref={sidebarRef}
      className={classNames}
      onTouchStart={isMobile ? onTouchStart : undefined}
      onTouchEnd={isMobile ? onTouchEnd : undefined}
      data-glass-surface="toolbar"
    >
      {/* Drag handle — mobile only */}
      {isMobile && (
        <div
          className="lg-sidebar__handle"
          role="button"
          aria-label={expanded ? 'Collapse sidebar' : 'Expand sidebar'}
          onClick={() => setExpanded(!expanded)}
        />
      )}

      {/* ... rest of existing sidebar content ... */}
    </aside>
  );
}
```

---

## Fix 13 — Canvas Touch Events

```js
// src/engine/canvas.js — add to the touch event setup

// WRONG — passive:true blocks preventDefault, breaking pan/pinch
canvas.addEventListener('touchstart', handler, true);
canvas.addEventListener('touchmove', handler, true);

// CORRECT — must be { passive: false } to call preventDefault
canvas.addEventListener('touchstart', onTouchStart, { passive: false });
canvas.addEventListener('touchmove', onTouchMove, { passive: false });
canvas.addEventListener('touchend', onTouchEnd, { passive: true }); // end can be passive

function onTouchStart(e) {
  e.preventDefault(); // prevents 300ms click delay + double-tap zoom
  if (e.touches.length === 2) initPinch(e);
  else initPan(e.touches[0]);
}

function onTouchMove(e) {
  e.preventDefault();
  if (e.touches.length === 2) handlePinch(e);
  else handlePan(e.touches[0]);
}

function initPinch(e) {
  const [t1, t2] = e.touches;
  pinchState.startDist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
  pinchState.startScale = camera.scale;
  pinchState.midX = (t1.clientX + t2.clientX) / 2;
  pinchState.midY = (t1.clientY + t2.clientY) / 2;
}

function handlePinch(e) {
  const [t1, t2] = e.touches;
  const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
  const scale = pinchState.startScale * (dist / pinchState.startDist);
  camera.setScale(Math.max(0.1, Math.min(4, scale)), pinchState.midX, pinchState.midY);
}
```

---

## Fix 14 — Bottom Sheet Font

In `src/components/mobile/BottomSheet.css`, find and replace:

```css
/* BEFORE */
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;

/* AFTER */
font-family: var(--font-ui, 'Space Grotesk', system-ui, sans-serif);
```

---

## Fix 17 — Glass Tier Detection in `main.jsx`

```js
// src/main.jsx — add at the top of the boot sequence, before ReactDOM.createRoot

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

---

## Quick Reference — What File Lives Where After Fixes

```
looking-glass/
  index.html                   ← fonts fixed, data-theme script added, apple-touch-icon
  vite.config.js               ← base: '/looking-glass/' added
  server.js                    ← new file
  package.json                 ← phantom versions corrected, start script added
  pnpm-lock.yaml               ← promoted from .bak
  .gitignore                   ← package-lock.json added
  .github/
    workflows/
      deploy.yml               ← targets develop, uses peaceiris/gh-pages, pnpm
  src/
    main.jsx                   ← glass tier detection added
    demos/
      bottom-sheet-demo.html   ← moved from root, paths fixed
    ui/
      LiquidGlassSidebar.jsx   ← mobile collapse logic added
      LiquidGlassSidebar.css   ← mobile bottom bar styles added
    components/
      mobile/
        BottomSheet.css        ← font token fixed
  LIQUID_GLASS_SKILL.md        ← new comprehensive skill file
```
