/**
 * LOOKING GLASS — Mode Toggle (Phase 5 / V2)
 *
 * Track: 28×16px, border 1px --color-border
 * Knob: glass circle 12×12px
 * Labels: Space Mono 11px ALL CAPS — "DARK ●──────── LIGHT"
 * Spring: stiffness 500, damping 30 (mechanical click)
 *
 * THIS IS THE ONLY TOGGLE using word labels instead of icon.
 */
import React, { useCallback } from 'react';

export function ModeToggle({ isDark, onToggle }) {
  const handleClick = useCallback(() => {
    onToggle(!isDark);
  }, [isDark, onToggle]);

  return (
    <div className="mode-toggle" role="switch" aria-checked={isDark} tabIndex={0}>
      <span className="mode-toggle__label mode-toggle__label--dark">
        {isDark && <span className="mode-toggle__indicator" aria-hidden="true">●</span>}
        DARK
      </span>

      <button
        className={`mode-toggle__track ${isDark ? 'mode-toggle__track--dark' : 'mode-toggle__track--light'}`}
        onClick={handleClick}
        type="button"
        aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      >
        <span className="mode-toggle__knob" />
      </button>

      <span className="mode-toggle__label mode-toggle__label--light">
        LIGHT
        {!isDark && <span className="mode-toggle__indicator" aria-hidden="true">●</span>}
      </span>
    </div>
  );
}
