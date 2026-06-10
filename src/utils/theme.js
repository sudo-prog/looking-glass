/* ════════════════════════════════════════════════
   LOOKING GLASS — THEME UTILITY
   Dual mode: dark (OLED black) + light (warm off-white)
   Both are first-class. Neither is derived from the other.
   ════════════════════════════════════════════════ */

const STORAGE_KEY = 'lg-theme';

export const getInitialTheme = () => {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved === 'dark' || saved === 'light') return saved;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

export const applyTheme = (theme) => {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem(STORAGE_KEY, theme);
  document.querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', theme === 'dark' ? '#0A0A0A' : '#F5F2EE');
  window.dispatchEvent(new CustomEvent('theme-change', { detail: { theme } }));
};

export const toggleTheme = (theme) => {
  const current = theme || document.documentElement.getAttribute('data-theme') || 'dark';
  applyTheme(current === 'dark' ? 'light' : 'dark');
};

export const isDark = () => {
  return (document.documentElement.getAttribute('data-theme') || 'dark') === 'dark';
};
