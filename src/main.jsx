/**
 * LOOKING GLASS — React Main Entry Point
 * V0.5: React 18 + SQLite + Rich Text + Glass + Mobile
 * Cache bust: 2026-06-08-audit-fixes-v3
 */

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

import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './components/App.jsx';
import './styles/tokens.css';
import './styles/reset.css';
import './styles/canvas.css';
import './styles/tiptap.css';
import './styles/stack-folder.css';
import './components/mobile/BottomSheet.css';

const container = document.getElementById('app');
const root = createRoot(container);
root.render(<App />);
