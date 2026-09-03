/**
 * LOOKING GLASS — Drop Mode Picker
 * Appears when a card is dropped onto another regular card.
 * Two options: Stack (largest bottom, smallest top) or Folder.
 */
import React, { useEffect, useRef } from 'react';

export function DropModePicker({ x, y, onStack, onFolder, onDismiss }) {
  const ref = useRef(null);

  // Dismiss on outside click
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        onDismiss();
      }
    };
    // Delay so the pointerup that triggered this doesn't immediately dismiss it
    const tid = setTimeout(() => window.addEventListener('pointerdown', handler), 50);
    return () => {
      clearTimeout(tid);
      window.removeEventListener('pointerdown', handler);
    };
  }, [onDismiss]);

  // Clamp to viewport
  const pickerWidth = 188;
  const pickerHeight = 64;
  const left = Math.max(8, Math.min(x - pickerWidth / 2, window.innerWidth - pickerWidth - 8));
  const top  = Math.max(8, y - pickerHeight - 12);

  return (
    <div
      ref={ref}
      className="drop-mode-picker"
      style={{ left, top }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      {/* Mobile-UI-STANDARD: ≥44×44 (prefer 48px) tap targets (T-1), flex-wrap (L-3),
          viewport-capped width (L-4) — gated to mobile, desktop layout untouched. */}
      <style>{`
        .dmp-btn { min-height: 44px; }
        @media (max-width: 640px) {
          .drop-mode-picker { display: flex; flex-direction: column; flex-wrap: wrap; max-width: calc(100vw - 16px); overflow-x: auto; }
          .dmp-btn { min-height: 48px; min-width: 48px; }
        }
      `}</style>
      <button
        className="dmp-btn dmp-stack"
        title="Stack: largest card on the bottom, smallest on top"
        onClick={(e) => { e.stopPropagation(); onStack(); }}
      >
        <span className="dmp-icon">🗂</span>
        <span className="dmp-label">Stack</span>
      </button>

      <button
        className="dmp-btn dmp-folder"
        title="Group into a folder"
        onClick={(e) => { e.stopPropagation(); onFolder(); }}
      >
        <span className="dmp-icon">📁</span>
        <span className="dmp-label">Folder</span>
      </button>
    </div>
  );
}
