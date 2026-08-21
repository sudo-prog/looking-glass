/**
 * LOOKING GLASS — React Main Entry Point
 * V0.5: React 18 + SQLite + Rich Text + Glass + Mobile
 * Cache bust: 2026-06-08-fix-import-order
 */

import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './components/App.jsx';
import { ErrorBoundary } from './components/ErrorBoundary.jsx';
import { initErrorTelemetry } from './utils/errorTelemetry.js';
import './styles/tokens.css';
import './styles/reset.css';
import './styles/canvas.css';
import './styles/tiptap.css';
import './styles/stack-folder.css';
import './styles/glass-fallback.css';
import './styles/ui-chrome.css';
import './styles/responsive.css';
import './styles/a11y.css';
import './components/mobile/BottomSheet.css';

async function detectGlassTier() {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return 3;
  try {
    const adapter = await navigator.gpu.requestAdapter();
    if (adapter) return 1;
  } catch (_) {}
  if (CSS.supports('backdrop-filter', 'blur(1px)') ||
      CSS.supports('-webkit-backdrop-filter', 'blur(1px)')) return 2;
  return 3;
}
detectGlassTier().then((tier) => {
  document.documentElement.dataset.glassTier = String(tier);
  console.info('[Looking Glass] Glass tier: ' + tier);
});

// Register service worker for PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', { scope: '/' })
      .catch(err => console.warn('[SW] registration failed', err));
  });
}

// Install global client-side error telemetry (window.onerror +
// window.onunhandledrejection → /api/log). Best-effort, fire-and-forget.
initErrorTelemetry();

const container = document.getElementById('app');
// Mobile-safe root container (MOBILE-UI-STANDARD)
container.style.height = '100vh';
container.style.height = '100dvh';
container.style.width = '100%';
container.style.maxWidth = '100%';
container.style.overflowX = 'hidden';
container.style.paddingTop = 'env(safe-area-inset-top, 0px)';
container.style.paddingBottom = 'env(safe-area-inset-bottom, 0px)';
container.style.paddingLeft = 'env(safe-area-inset-left, 0px)';
container.style.paddingRight = 'env(safe-area-inset-right, 0px)';
container.style.boxSizing = 'border-box';
const root = createRoot(container);
root.render(
  <ErrorBoundary name="root">
    <App />
  </ErrorBoundary>
);