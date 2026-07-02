/**
 * LOOKING GLASS — React Main Entry Point
 * V0.5: React 18 + SQLite + Rich Text + Glass + Mobile
 * Cache bust: 2026-06-08-fix-import-order
 */

import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './components/App.jsx';
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

// Glass tier is detected by the inline script in index.html (runs before hydration).
// Log the final tier after page load for debugging.
window.addEventListener('load', function () {
  var tier = document.documentElement.dataset.glassTier || '?';
  console.info('[Looking Glass] Glass tier: ' + tier);
});

// Register service worker for PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', { scope: '/' })
      .catch(err => console.warn('[SW] registration failed', err));
  });
}

const container = document.getElementById('app');
const root = createRoot(container);
root.render(<App />);