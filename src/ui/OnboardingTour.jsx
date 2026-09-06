// LOOKING GLASS — Onboarding Tour
// Dismissible welcome overlay for first-time users.
import React from 'react';

const TOUR_STEPS = [
  {
    target: '[data-tour="sidebar"]',
    title: '🌊 The Sidebar',
    body: 'Click the sidebar to expand it. Add notes, bookmarks, images, and more. Drag it to reorder icons.',
  },
  {
    target: '[data-tour="add-button"]',
    title: '➕ Add Anything',
    body: 'Add notes, URLs, images, audio memos, and more. Drag & drop files or links from anywhere.',
  },
  {
    target: '[data-tour="command-palette"]',
    title: '⌘ Command Palette',
    body: 'Press Ctrl+K to open the command palette. Search actions, switch spaces, or trigger AI.',
  },
  {
    target: null,
    title: '✨ You\'re all set!',
    body: 'Start adding your ideas. Long-press cards on mobile, drag to move, click to expand.',
  },
];

export function OnboardingTour({ onDismiss }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
      fontFamily: 'var(--font-ui, "Space Grotesk", system-ui, sans-serif)',
    }}>
      <div style={{
        background: 'var(--color-surface, #1a1a2e)',
        border: '1px solid var(--color-border, rgba(255,255,255,0.1))',
        borderRadius: '16px', padding: '32px', maxWidth: '420px', width: '90%',
        boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
      }}>
        <h2 style={{ margin: '0 0 12px', fontSize: '20px', fontWeight: 600, color: '#fff' }}>
          ✨ Welcome to Looking Glass
        </h2>
        <p style={{ margin: '0 0 24px', color: 'rgba(255,255,255,0.7)', lineHeight: 1.6, fontSize: '14px' }}>
          Your visual memory — bookmarks, web clips, and ideas on an infinite canvas.
          We've pre-populated a few sample cards to show you around.
        </p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <button
            onClick={onDismiss}
            style={{
              padding: '10px 20px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)',
              background: 'transparent', color: 'rgba(255,255,255,0.7)', cursor: 'pointer',
              fontSize: '14px', fontFamily: 'inherit',
            }}
          >
            Dismiss tour
          </button>
          <button
            onClick={onDismiss}
            style={{
              padding: '10px 20px', borderRadius: '8px', border: 'none',
              background: 'var(--color-accent, #7c3aed)', color: '#fff', cursor: 'pointer',
              fontSize: '14px', fontWeight: 500, fontFamily: 'inherit',
            }}
          >
            Get started →
          </button>
        </div>
      </div>
    </div>
  );
}