/**
 * LOOKING GLASS — React Main Entry Point
 * V0.4: React 18 + SQLite + Rich Text
 */

import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './components/App.jsx';
import './styles/tokens.css';
import './styles/reset.css';
import './styles/a11y.css';
import './styles/responsive.css';
import './styles/canvas.css';
import './styles/tiptap.css';
import './styles/glass-fallback.css';
import './styles/ui-chrome.css';
import './components/mobile/BottomSheet.css';

const container = document.getElementById('app');
const root = createRoot(container);
root.render(<App />);
