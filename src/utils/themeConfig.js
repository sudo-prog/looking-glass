/**
 * LOOKING GLASS — Theme Configuration
 * Persists and applies ALL visual theme settings:
 * colors, glass properties, background image, fonts, layout.
 */
const STORAGE_KEY = 'lg-theme-config';

export const THEME_DEFAULTS = {
  // Glass appearance
  glassOpacity: 0.60,
  glassThickness: 3,
  glassBlur: 32,
  glassColor: '',           // custom glass background color (hex)
  bgColor: '',              // custom page background (hex)

  // Colors
  accentColor: '#D71921',
  textPrimary: '#F5F5F5',
  textSecondary: '#999999',

  // Background image
  bgImage: '',              // data URL or upload base64
  bgImageMode: 'cover',     // 'cover' | 'center' | 'tile' | 'stretch'
  bgImageOpacity: 1.0,
  bgOverlay1: '',           // first overlay color hex
  bgOverlay1Opacity: 0.0,
  bgOverlay2: '',           // second overlay color hex
  bgOverlay2Opacity: 0.0,

  // Typography
  fontFamily: '',
  fontImport: '',           // Google Fonts @import URL or custom CSS
  fontSize: 15,             // base font size in px
  fontDropShadow: false,
  fontShadowColor: 'rgba(0,0,0,0.30)',
  fontShadowOffsetX: 1,
  fontShadowOffsetY: 1,
  fontShadowBlur: 2,
  fontStroke: false,
  fontStrokeColor: 'rgba(0,0,0,0.20)',
  fontStrokeWidth: 1,

  // Menu icon order
  menuIconOrder: [
    'canvas', 'search', 'library', 'spaces', 'tags', 'saved',
  ],
  removedIcons: [],
  allIconIds: [
    'canvas', 'search', 'library', 'spaces', 'tags', 'saved',
    'starred', 'archive', 'home', 'export', 'note', 'bookmark', 'url',
  ],
};

export function loadThemeConfig() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...THEME_DEFAULTS };
    const parsed = JSON.parse(raw);
    return { ...THEME_DEFAULTS, ...parsed };
  } catch {
    return { ...THEME_DEFAULTS };
  }
}

export function saveThemeConfig(config) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

/**
 * Apply ALL theme settings as CSS custom properties and inline styles.
 * Called on settings save AND on page load.
 */
export function applyThemeConfig(config) {
  const root = document.documentElement;
  const t = { ...THEME_DEFAULTS, ...config };

  // ── Glass ──────────────────────────────────────────
  const bgHex = t.glassColor || (isDarkMode(root) ? '#0A0A0A' : '#F0ECE5');
  root.style.setProperty('--glass-frost', hexToRgba(bgHex, t.glassOpacity));
  root.style.setProperty('--glass-blur-xl', `${t.glassBlur}px`);
  const thicknessMap = { 1: 12, 2: 18, 3: 24, 4: 32, 5: 42 };
  root.style.setProperty('--glass-menu-radius', `${thicknessMap[t.glassThickness] || 24}px`);

  // ── Colors ──────────────────────────────────────────
  root.style.setProperty('--color-accent', t.accentColor);
  root.style.setProperty('--text-primary', t.textPrimary);
  root.style.setProperty('--text-secondary', t.textSecondary);

  // ── Body background ──────────────────────────────────
  if (t.bgColor) {
    root.style.setProperty('--color-bg', t.bgColor);
    root.style.setProperty('--canvas-bg', t.bgColor);
  }

  // ── Background image ─────────────────────────────────
  const bgStyleEl = getOrCreateStyleEl('lg-theme-bg');
  let bgCSS = '';

  if (t.bgImage) {
    const sizing = t.bgImageMode === 'cover' ? 'cover' :
      t.bgImageMode === 'tile' ? 'auto' :
      t.bgImageMode === 'stretch' ? '100% 100%' : 'auto';
    const repeat = t.bgImageMode === 'tile' ? 'repeat' : 'no-repeat';
    const pos = t.bgImageMode === 'center' ? 'center center' : 'center center';

    bgCSS += `
      body::before {
        content: '';
        position: fixed;
        inset: 0;
        z-index: -2;
        background-image: url("${t.bgImage}");
        background-size: ${sizing};
        background-repeat: ${repeat};
        background-position: ${pos};
        opacity: ${t.bgImageOpacity};
        pointer-events: none;
      }`;

    // Overlay 1
    if (t.bgOverlay1 && t.bgOverlay1Opacity > 0) {
      bgCSS += `
        body::after {
          content: '';
          position: fixed;
          inset: 0;
          z-index: -1;
          background: ${hexToRgba(t.bgOverlay1, t.bgOverlay1Opacity)};
          pointer-events: none;
        }`;
    }

    // Overlay 2 (stacked on top of overlay 1)
    if (t.bgOverlay2 && t.bgOverlay2Opacity > 0) {
      bgCSS += `
        .lg-theme-overlay2 {
          position: fixed;
          inset: 0;
          z-index: -1;
          background: ${hexToRgba(t.bgOverlay2, t.bgOverlay2Opacity)};
          pointer-events: none;
        }`;
      ensureOverlay2El();
    } else {
      removeOverlay2El();
    }
  } else {
    // No background image — clear pseudo-elements
    bgCSS = `body::before { display: none; } body::after { display: none; }`;
    removeOverlay2El();
  }

  bgStyleEl.textContent = bgCSS;

  // ── Typography ───────────────────────────────────────
  // Font import
  const fontImportEl = getOrCreateStyleEl('lg-theme-font-import');
  if (t.fontImport) {
    fontImportEl.textContent = t.fontImport;
  } else {
    fontImportEl.textContent = '';
  }

  // Font family
  if (t.fontFamily) {
    root.style.setProperty('--font-body', t.fontFamily);
    root.style.setProperty('--font-ui', `'Space Mono', 'Courier New', monospace`);
  }

  // Base font size
  root.style.setProperty('font-size', `${t.fontSize}px`);

  // Text shadow / stroke
  const typeStyleEl = getOrCreateStyleEl('lg-theme-type');
  let typeCSS = '';
  if (t.fontDropShadow) {
    typeCSS += `
      body, p, h1, h2, h3, h4, h5, h6, span, a, li, button, input, textarea, select, label {
        text-shadow: ${t.fontShadowOffsetX}px ${t.fontShadowOffsetY}px ${t.fontShadowBlur}px ${t.fontShadowColor};
      }`;
  }
  if (t.fontStroke) {
    typeCSS += `
      body, p, h1, h2, h3, h4, h5, h6, span, a, li, button, input, textarea, select, label {
        -webkit-text-stroke: ${t.fontStrokeWidth}px ${t.fontStrokeColor};
        text-stroke: ${t.fontStrokeWidth}px ${t.fontStrokeColor};
      }`;
  }
  typeStyleEl.textContent = typeCSS;
}

// ── Helpers ─────────────────────────────────────

function isDarkMode(root) {
  return root.getAttribute('data-theme') !== 'light';
}

function hexToRgba(hex, alpha) {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function getOrCreateStyleEl(id) {
  let el = document.getElementById(id);
  if (!el) {
    el = document.createElement('style');
    el.id = id;
    document.head.appendChild(el);
  }
  return el;
}

function ensureOverlay2El() {
  if (!document.querySelector('.lg-theme-overlay2')) {
    const div = document.createElement('div');
    div.className = 'lg-theme-overlay2';
    document.body.appendChild(div);
  }
}

function removeOverlay2El() {
  const el = document.querySelector('.lg-theme-overlay2');
  if (el) el.remove();
}

export function getThicknessRadius(thickness) {
  const map = { 1: 12, 2: 18, 3: 24, 4: 32, 5: 42 };
  return map[thickness] || 24;
}