---
name: liquid-glass-web
description: >
  Engineering and design reference for building production-grade liquid glass
  effects on the web. Synthesises the Aave Glass SVG-displacement approach,
  the jeantimex WebGPU/HTML-in-Canvas renderer, and the liquid-dom React
  binding layer — mapped onto the Looking Glass design system (Nothing OS ×
  WebGPU aesthetic, Space Grotesk/Mono/Doto fonts, dual dark/light themes,
  five named glass surfaces, three-tier fallback, Phosphor Icons outline-only,
  spring physics, strict anti-patterns).
version: 1.0.0
project: looking-glass (https://github.com/sudo-prog/looking-glass)
branch: develop
---

# Liquid Glass — Looking Glass SKILL

This skill is the single source of truth for implementing glass effects in
Looking Glass. It covers technique selection, rendering pipeline, cross-browser
quirks, design tokens, component patterns, mobile parity, and anti-patterns.
Read it in full before writing any glass-related code.

**Reference:** `references/audit-fixes-2026-06.md` contains the June 2026
audit fix details (infrastructure, design system, mobile parity) that were
applied to the project. Consult it for file-level change history.

---

## 1. Technique Landscape

Three viable approaches exist for web glass. Choose based on the surface type.

| Technique | Chromium | Safari | Firefox | Notes |
|---|---|---|---|---|
| **SVG `feDisplacementMap`** | ✓ | ✓ | ✓ | Universal. Works on live DOM. Pixels stay selectable. Core technique for all card/toolbar glass. |
| **WebGPU + WGSL shader** | ✓ (113+) | Partial | Flag | Required for canvas-drawn surfaces (QR, video, minimap). Highest fidelity. Falls back gracefully. |
| **HTML-in-Canvas API** | Canary + flag | ✗ | ✗ | Experimental. Use only as progressive enhancement for article/live-DOM-in-texture. Always provide `html2canvas` fallback. |
| **CSS `backdrop-filter`** | ✓ | ✓ | ✓ | Tier-3 fallback only. Provides blur+tint when JS glass fails. Never use as primary. |

**Looking Glass tier rule (enforce strictly):**
```
WebGPU shader (tier 1)
  └─ SVG feDisplacementMap (tier 2, universal DOM glass)
       └─ CSS backdrop-filter + flat tint (tier 3, no-JS / reduced-motion)
```

Detect at runtime:
```js
const gpu = await navigator.gpu?.requestAdapter();
const TIER = gpu ? 1 : ('backdropFilter' in document.body.style) ? 2 : 3;
document.documentElement.dataset.glassTier = TIER;
```

---

## 2. SVG Displacement Map Glass (Tier 2 — Primary DOM Glass)

### 2.1 Core Mechanic

`feDisplacementMap` reads a displacement PNG (generated on the fly) and shifts
each pixel of the content element by amounts encoded in the map's R (horizontal)
and G (vertical) channels. Outside the lens region the map holds a neutral 50%
grey — those pixels are not moved.

```
content pixels → feImage (displacement map PNG) → feDisplacementMap → output
```

The map is a small canvas-rendered PNG. Because only the content's own pixels
move (nothing is sampled from underneath), text remains selectable and links
clickable.

### 2.2 Map Generation

Generate a fresh map PNG whenever the lens shape or size changes (never on
positional moves — reposition the filter region instead).

```js
function generateLensMap({ lensW, lensH, borderRadius, scale, depth, curvature, splay, chroma }) {
  const canvas = new OffscreenCanvas(lensW, lensH);
  const ctx = canvas.getContext('2d');
  const imgData = ctx.createImageData(lensW, lensH);
  const { data } = imgData;

  // Four-fold symmetry optimisation (Aave technique):
  // compute top-left quadrant, mirror to all four.
  const hw = lensW / 2, hh = lensH / 2;
  for (let y = 0; y < hh; y++) {
    for (let x = 0; x < hw; x++) {
      const nx = x / hw, ny = y / hh; // 0→1
      const sdf = roundedRectSDF(nx, ny, borderRadius / hw);
      if (sdf > 0) { /* outside lens — neutral */ continue; }
      const dx = Math.sin(-sdf * Math.PI * curvature / 100) * scale * splay;
      const dy = Math.sin(-sdf * Math.PI * curvature / 100) * scale;
      const r = Math.round((0.5 + dx) * 255);
      const g = Math.round((0.5 + dy) * 255);
      // mirror into all four quadrants
      writePixel(data, lensW,  x,        y,       r, g);
      writePixel(data, lensW, lensW-1-x, y,       255-r+128-128, g); // negate X
      writePixel(data, lensW,  x,       lensH-1-y, r, 255-g+128-128);
      writePixel(data, lensW, lensW-1-x,lensH-1-y, 255-r+128-128, 255-g+128-128);
    }
  }
  ctx.putImageData(imgData, 0, 0);
  return canvas.convertToBlob({ type: 'image/png' });
}
```

### 2.3 Safari-Specific Fixes (Required)

**Issue 1: SVG filter caching.** Safari caches filter output by ID. If the map
PNG changes but the filter ID stays the same, Safari renders stale output.
Fix: bump the filter ID on every map regeneration.

```js
let filterId = 0;
function applyGlass(el, mapUrl) {
  const id = `lg-glass-${++filterId}`;
  const svg = buildFilterSVG(id, mapUrl);
  el.style.filter = `url(#${id})`;
  document.getElementById('lg-svg-defs').innerHTML = svg;
}
```

**Issue 2: Source-graphic size ceiling.** Safari silently breaks effects on
large DOMs. Keep glass surfaces ≤ 1200 × 800 px. Never apply glass to full-
viewport ancestors on mobile. Use `will-change: filter` on the glass element
only, not its parent.

**Issue 3: Specular highlight cost.** The specular pass covers the full filter
region by default. On Safari restrict it to the lens bounding box only:

```xml
<feSpecularLighting result="spec" x="0" y="0"
  width="{lensW}" height="{lensH}"
  surfaceScale="5" specularConstant="0.8" specularExponent="20">
  <fePointLight x="{lensW/2}" y="-40" z="80"/>
</feSpecularLighting>
```

**Issue 4: Live `<video>` elements.** Safari never hands video pixels to SVG
filters. If glass must sit over video, use the WebGPU path (tier 1) on Safari,
or accept tier-3 (CSS backdrop-filter tint only).

### 2.4 SVG Filter Template

```xml
<svg id="lg-svg-defs" width="0" height="0"
     style="position:absolute;overflow:hidden;pointer-events:none">
  <defs>
    <filter id="{id}" x="0" y="0" width="100%" height="100%"
            color-interpolation-filters="linearRGB">

      <!-- 1. Displacement -->
      <feImage id="disp-map" href="{mapDataUrl}" result="map"
               x="{lensX}" y="{lensY}" width="{lensW}" height="{lensH}" />
      <feDisplacementMap in="SourceGraphic" in2="map"
               scale="{dispScale}" xChannelSelector="R" yChannelSelector="G"
               result="displaced" />

      <!-- 2. Chroma fringe (thin edge aberration) -->
      <feColorMatrix in="displaced" type="matrix"
               values="1.04 0 0 0 -0.02  0 1 0 0 0  0 0 0.96 0 0.02  0 0 0 1 0"
               result="chromaShift" />

      <!-- 3. Specular highlight (lens-sized region only) -->
      <feFlood flood-color="white" flood-opacity="0" result="blank"/>
      <feComposite in="blank" in2="SourceGraphic" operator="in" result="lensOnly"/>
      <feSpecularLighting in="lensOnly" result="spec"
               x="{lensX}" y="{lensY}" width="{lensW}" height="{lensH}"
               surfaceScale="4" specularConstant="0.6" specularExponent="18">
        <fePointLight x="{lensX + lensW*0.4}" y="{lensY - 40}" z="60"/>
      </feSpecularLighting>
      <feComposite in="spec" in2="lensOnly" operator="in" result="specMasked"/>

      <!-- 4. Edge glow rim -->
      <feMorphology in="lensOnly" operator="dilate" radius="1" result="rim"/>
      <feColorMatrix in="rim" type="matrix"
               values="1 0 0 0 0  1 0 0 0 0  1 0 0 0 0  0 0 0 0.15 0"
               result="rimLight"/>

      <!-- 5. Composite layers -->
      <feBlend in="chromaShift" in2="specMasked" mode="screen" result="withSpec"/>
      <feBlend in="withSpec" in2="rimLight" mode="screen"/>
    </filter>
  </defs>
</svg>
```

---

## 3. WebGPU Glass (Tier 1 — High-Fidelity Surfaces)

Use for: canvas minimap, video overlay controls, WebGPU infinite canvas layer.

### 3.1 Uniform Buffer Layout

```wgsl
struct GlassUniforms {
  lensRect     : vec4<f32>,  // x, y, w, h  (NDC)
  refraction   : f32,
  blur         : f32,
  specular     : f32,
  chroma       : f32,
  borderRadius : f32,
  edgeGlow     : f32,
  depth        : f32,
  _pad         : f32,
}
```

### 3.2 Five Named Surfaces — Token Values

These are the canonical surface presets for Looking Glass. Always use CSS
custom properties from `--lg-glass-*` namespace.

| Surface | `refraction` | `blur` | `specular` | `chroma` | `borderRadius` | `edgeGlow` |
|---|---|---|---|---|---|---|
| `panel` | 0.08 | 12 | 0.6 | 0.12 | 16 | 0.18 |
| `card` | 0.06 | 8 | 0.5 | 0.10 | 12 | 0.14 |
| `toolbar` | 0.04 | 16 | 0.4 | 0.08 | 24 | 0.12 |
| `modal` | 0.10 | 20 | 0.7 | 0.15 | 20 | 0.22 |
| `pip` | 0.12 | 6 | 0.8 | 0.18 | 32 | 0.28 |

```css
/* Design tokens — import from src/styles/glass-tokens.css */
:root {
  --lg-glass-panel-refraction:    0.08;
  --lg-glass-panel-blur:          12px;
  --lg-glass-panel-radius:        16px;

  --lg-glass-card-refraction:     0.06;
  --lg-glass-card-blur:           8px;
  --lg-glass-card-radius:         12px;

  --lg-glass-toolbar-refraction:  0.04;
  --lg-glass-toolbar-blur:        16px;
  --lg-glass-toolbar-radius:      24px;

  --lg-glass-modal-refraction:    0.10;
  --lg-glass-modal-blur:          20px;
  --lg-glass-modal-radius:        20px;

  --lg-glass-pip-refraction:      0.12;
  --lg-glass-pip-blur:            6px;
  --lg-glass-pip-radius:          32px;
}
```

### 3.3 Spring Physics per Surface

Use spring damping physics — never linear/easing — for all glass surface
position, scale, and shape transitions.

```js
// Minimal spring — call every rAF frame
function spring(current, target, velocity, { stiffness = 180, damping = 22, mass = 1 } = {}) {
  const force = -stiffness * (current - target) - damping * velocity;
  const accel = force / mass;
  const newVel = velocity + accel * (1 / 60);
  return { value: current + newVel * (1 / 60), velocity: newVel };
}
```

Surface-specific spring presets:

| Surface | stiffness | damping | feel |
|---|---|---|---|
| `panel` | 160 | 20 | deliberate |
| `card` | 200 | 24 | snappy |
| `toolbar` | 120 | 18 | floaty |
| `modal` | 140 | 22 | weighted |
| `pip` | 280 | 30 | elastic |

### 3.4 HTML-in-Canvas (Experimental, Progressive Enhancement)

Only activate when `detectHTMLInCanvasSupport()` returns true.

```js
export function detectHTMLInCanvasSupport() {
  const c = document.createElement('canvas');
  return {
    layoutsubtree: 'layoutsubtree' in c,
    copyElementImageToTexture: typeof GPUQueue?.prototype?.copyElementImageToTexture === 'function',
  };
}
```

When supported:
1. Set `<canvas layoutsubtree>` attribute.
2. `canvas.appendChild(domContent)` — element is hit-testable but invisible.
3. In render loop: `device.queue.copyElementImageToTexture(el, { texture: bgTex })`.
4. Bind `bgTex` as the background sampler in the glass shader.

When not supported: fall through to `html2canvas` for a static snapshot (no
text selection). Log the degradation with `console.info('[LG] glass tier 1 DOM
path not available — html2canvas fallback active')`.

---

## 4. Looking Glass Design System

### 4.1 Fonts (strict)

```css
@import url('https://fonts.googleapis.com/css2?
  family=Space+Grotesk:wght@300;400;500;600;700&
  family=Space+Mono:wght@400;700&
  family=Doto:ROND@0..100;wght@100..900&
  display=swap');

:root {
  --font-ui:    'Space Grotesk', system-ui, sans-serif;  /* all UI text */
  --font-mono:  'Space Mono', 'Fira Code', monospace;    /* code, IDs, timestamps */
  --font-display: 'Doto', var(--font-ui);                /* logo mark, counters */
}
```

**Bug fix:** `index.html` currently loads `DM Sans` and `DM Mono`. Replace
with the above. This is a known bug in the repo.

### 4.2 Colour Tokens

```css
/* Dark mode (default) */
[data-theme="dark"], :root {
  --bg-base:        #0A0A0A;   /* NOT #0a0a0f — fix the current wrong token */
  --bg-elevated:    #111111;
  --text-primary:   #F0F0F0;
  --text-secondary: #888888;
  --accent:         #FFFFFF;
  --border:         rgba(255,255,255,0.08);

  /* Glass surface tints */
  --glass-tint-dark:   rgba(15, 15, 15, 0.40);
  --glass-border-dark: rgba(255, 255, 255, 0.06);
}

/* Light mode */
[data-theme="light"] {
  --bg-base:        #F5F2EE;
  --bg-elevated:    #FFFFFF;
  --text-primary:   #0A0A0A;
  --text-secondary: #666666;
  --accent:         #000000;
  --border:         rgba(0,0,0,0.08);

  --glass-tint-light:   rgba(245, 242, 238, 0.55);
  --glass-border-light: rgba(0, 0, 0, 0.06);
}
```

**Bug fix:** The `data-theme` init script is missing from `index.html`. Add
before `</head>`:

```html
<script>
  (function(){
    var t = localStorage.getItem('lg-theme') ||
      (matchMedia('(prefers-color-scheme:light)').matches ? 'light' : 'dark');
    document.documentElement.dataset.theme = t;
  })();
</script>
```

### 4.3 Phosphor Icons — Vocabulary (29 items)

Use **outline weight only**. Import from `@phosphor-icons/react` (outline variant).
Never use: filled, duotone, bold, thin.

```
ArrowLeft  ArrowRight  ArrowUp  ArrowDown
BookmarkSimple  Link  Image  Note  MagnifyingGlass
Plus  X  Check  DotsThree  DotsThreeVertical
SquaresFour  List  Sidebar  PanelRight
Robot  Sparkle  Lightning  Brain
Sun  Moon  Monitor  Gear  Info  Warning
```

---

## 5. Component Patterns

### 5.1 GlassCard

```jsx
// src/components/glass/GlassCard.jsx
import { useRef, useEffect } from 'react';
import { applyGlass, disposeGlass } from '../../engine/glass';

export function GlassCard({ surface = 'card', children, className, style }) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const handle = applyGlass(el, surface);
    el.dispatchEvent(new CustomEvent('glass-surface-mount', {
      bubbles: true,
      detail: { surface, el },
    }));
    return () => disposeGlass(handle);
  }, [surface]);

  return (
    <div
      ref={ref}
      className={`lg-glass lg-glass--${surface} ${className ?? ''}`}
      style={style}
      data-glass-surface={surface}
    >
      {children}
    </div>
  );
}
```

CSS pattern (all surfaces share this base):

```css
.lg-glass {
  position: relative;
  isolation: isolate;
  /* Tier-3 fallback styles — overridden when JS glass is active */
  background: var(--glass-tint-dark);
  border: 1px solid var(--glass-border-dark);
  backdrop-filter: blur(var(--lg-glass-card-blur));
  -webkit-backdrop-filter: blur(var(--lg-glass-card-blur));
}

[data-glass-tier="1"] .lg-glass,
[data-glass-tier="2"] .lg-glass {
  /* JS glass applied — remove CSS fallback blur to avoid double-processing */
  backdrop-filter: none;
  -webkit-backdrop-filter: none;
  background: transparent;
}
```

### 5.2 LiquidGlassSidebar — Mobile Collapse Behaviour

On `< 768 px`, the sidebar must collapse to a bottom bar — not a drawer or
a hidden overlay. This is the **mobile UI parity** requirement.

```jsx
// Breakpoint detection
const isMobile = useMediaQuery('(max-width: 767px)');

// Collapsed state: fixed bottom bar, 56px tall, full-width
// Expanded state (mobile): bottom sheet at 80% viewport height
// Collapsed state (desktop): 48px icon rail on the left
// Expanded state (desktop): 280px full sidebar
```

```css
/* Mobile bottom bar */
@media (max-width: 767px) {
  .lg-sidebar {
    top: auto;
    bottom: calc(env(safe-area-inset-bottom) + 0px);
    left: 0;
    right: 0;
    width: 100%;
    height: 56px;
    border-radius: 20px 20px 0 0;
    flex-direction: row;
    align-items: center;
    justify-content: space-around;
    padding: 0 16px;
  }

  .lg-sidebar--expanded {
    height: 80dvh;
    flex-direction: column;
    align-items: flex-start;
    justify-content: flex-start;
    padding: 20px 16px;
  }

  /* Safe area insets for iPhone notch/home bar */
  .lg-bottom-bar {
    padding-bottom: env(safe-area-inset-bottom);
  }
}
```

### 5.3 iOS Bottom Sheet (Existing Component)

The existing `BottomSheet.js` component is well-structured. Issues to fix:

1. **Font mismatch** — uses `-apple-system` stack. Replace with `var(--font-ui)`.
2. **Exposed demo** — `bottom-sheet-demo.html` is at the repo root and will be
   served by the dev server. Move to `src/demos/` and add to `.gitignore` for
   production builds, or guard it with `import.meta.env.DEV`.
3. **CSS import path** — `href="/src/components/mobile/BottomSheet.css"` is
   absolute and will break on GitHub Pages where base path is `/looking-glass/`.
   Use a relative `../` path or inject via JS module.

---

## 6. Infrastructure Bugs — Remediation Checklist

These are all confirmed bugs in the `develop` branch as of June 2026.

### 6.1 package.json — Phantom Dependencies

```json
// REMOVE — these version numbers do not exist yet:
"@tiptap/extension-link":       "^3.25.0",   // latest is 2.x
"@tiptap/extension-underline":  "^3.25.0",
"@tiptap/react":                "^3.25.0",
"@tiptap/starter-kit":          "^3.25.0",
"jspdf":                        "^4.2.1",    // latest is 3.x
"sql.js":                       "^1.14.1",   // latest is 1.12.x

// REPLACE WITH:
"@tiptap/extension-link":       "^2.4.0",
"@tiptap/extension-underline":  "^2.4.0",
"@tiptap/react":                "^2.4.0",
"@tiptap/starter-kit":          "^2.4.0",
"jspdf":                        "^2.5.2",
"sql.js":                       "^1.12.0",
```

### 6.2 Mixed Lockfiles

`package-lock.json` and `pnpm-lock.yaml.bak` coexist. The `.bak` file should
be removed or renamed to `pnpm-lock.yaml` and `package-lock.json` deleted,
depending on which package manager is canonical. Choose pnpm (README says
`pnpm install`).

```bash
rm package-lock.json
mv pnpm-lock.yaml.bak pnpm-lock.yaml
echo 'package-lock.json' >> .gitignore
pnpm install
```

### 6.3 Missing `server.js`

`package.json` has `"start": "node server.js"` but the file doesn't exist.
Add a minimal Node.js static server.

### 6.4 GitHub Actions Workflow — Wrong Branch

The deploy workflow targets `main` (deleted). Fix to target `develop` and use
`peaceiris/actions-gh-pages` for deployment.

### 6.5 Vite Config — Base Path for GitHub Pages

Add `base: '/looking-glass/'` to `vite.config.js`.

### 6.6 `index.html` — Three Fixes

1. Wrong font → Space Grotesk + Space Mono + Doto
2. Add `data-theme` init script before `</head>`
3. Add `apple-touch-icon` link
4. Fix background color to `#0A0A0A`

---

## 7. Mobile UI Parity — Full Specification

### 7.0 Mobile Audit Triage (When Mobile "Is Missing Features")

When mobile layout is broken despite responsive CSS existing, the #1 cause is **inline styles vs CSS class mismatch**: components use `style={{...}}` for layout but responsive.css targets `.toolbar`/`.sidebar` classes that don't match. The responsive rules are dead code.

**Fix location:** Component's own `<style>` tag media queries, not external CSS.

See `references/mobile-responsive-audit.md` in the `project-auditor` skill for the full diagnostic checklist.

### 7.1 Breakpoints

```css
/* Looking Glass responsive system */
--bp-mobile:  480px;   /* compact — single column */
--bp-tablet:  768px;   /* medium — sidebar collapsed to bottom bar */
--bp-desktop: 1024px;  /* full layout */
```

### 7.2 Canvas — Touch Interactions

The infinite canvas must support:
- **Pan**: one-finger drag
- **Zoom**: pinch-to-zoom
- **Card tap**: single tap within 10px
- **Long press**: 500 ms hold → context menu (bottom sheet on mobile)
- **Prevent default scroll**: `{ passive: false }` on `touchmove` inside canvas

### 7.3 Mobile Overlap Pitfall

When the sidebar becomes a bottom bar on mobile (`position: fixed; bottom: 0`), other fixed/absolute positioned elements get hidden behind it. Always raise:

- **Selection toolbar** (`bottom: 28px`) → `bottom: calc(72px + env(safe-area-inset-bottom))`
- **AI orb / floating buttons** (`bottom: 28px`) → `bottom: calc(72px + env(safe-area-inset-bottom))`
- **Main content area** → add `padding-bottom: calc(64px + env(safe-area-inset-bottom))` via `[data-main-content]` selector
- **Toolbar** → hide secondary buttons on mobile, allow `flex-wrap: wrap`, increase touch targets to 36px
