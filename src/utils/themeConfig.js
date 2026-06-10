/**
 * LOOKING GLASS — Theme Configuration
 * Persists and applies visual theme settings: colors, glass properties, layout.
 */
const STORAGE_KEY = 'lg-theme-config';

export const THEME_DEFAULTS = {
  // Glass appearance
  glassOpacity: 0.60,      // 0 = transparent, 1 = solid (maps to --glass-frost alpha)
  glassThickness: 3,       // 1-5 scale, affects border-radius of floating menus
  glassBlur: 32,           // backdrop-filter blur in px

  // Colors
  accentColor: '#D71921',  // --color-accent
  textPrimary: '#F5F5F5',  // --text-primary (dark mode)
  textSecondary: '#999999', // --text-secondary
  glassBgColor: '',        // empty = use default --glass-frost fallback

  // Menu icon order — array of nav item IDs
  menuIconOrder: [
    'canvas',
    'search',
    'library',
    'spaces',
    'tags',
    'saved',
  ],

  // Removed/extra icons — available to drag back in
  removedIcons: [],

  // All possible icon IDs for the pool
  allIconIds: [
    'canvas',
    'search',
    'library',
    'spaces',
    'tags',
    'saved',
    'starred',
    'archive',
    'home',
    'export',
    'note',
    'bookmark',
    'url',
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

export function applyThemeConfig(config) {
  const root = document.documentElement;

  // Glass opacity — adjust the --glass-frost alpha channel
  const frostColor = config.glassBgColor
    ? hexToRgba(config.glassBgColor, config.glassOpacity)
    : '';
  if (frostColor) {
    root.style.setProperty('--glass-frost', frostColor);
  } else if (config.glassOpacity !== THEME_DEFAULTS.glassOpacity) {
    // Recalculate default frost with new opacity
    const isDark = root.getAttribute('data-theme') !== 'light';
    const baseColor = isDark ? '#0A0A0A' : '#F0ECE5';
    root.style.setProperty('--glass-frost', hexToRgba(baseColor, config.glassOpacity));
  } else {
    root.style.removeProperty('--glass-frost');
  }

  // Glass thickness → border-radius on floating menus
  const thicknessMap = { 1: 12, 2: 18, 3: 24, 4: 32, 5: 42 };
  const borderRadius = thicknessMap[config.glassThickness] || 24;
  root.style.setProperty('--glass-menu-radius', `${borderRadius}px`);

  // Blur
  root.style.setProperty('--glass-blur-xl', `${config.glassBlur}px`);

  // Colors
  root.style.setProperty('--color-accent', config.accentColor);
  root.style.setProperty('--text-primary', config.textPrimary);
  root.style.setProperty('--text-secondary', config.textSecondary);

  // Save for light mode text too
  if (root.getAttribute('data-theme') === 'light') {
    root.style.setProperty('--text-primary', config.textPrimary);
    root.style.setProperty('--text-secondary', config.textSecondary);
  }
}

function hexToRgba(hex, alpha) {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function getThicknessRadius(thickness) {
  const map = { 1: 12, 2: 18, 3: 24, 4: 32, 5: 42 };
  return map[thickness] || 24;
}