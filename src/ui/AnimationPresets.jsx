/**
 * LOOKING GLASS — Animation Presets Panel (Phase 3: Supercharge)
 *
 * A one-click gallery of named Framer-Motion presets. Selecting a preset calls
 * `onApplyPreset(presetId)`. The preset ids map directly onto the `animation.preset`
 * field validated by sceneSchema.js (ANIMATION_PRESETS).
 *
 * PRESET_VARIANTS below is the single source of truth for the actual Framer-Motion
 * `variants` objects. The canvas/scene renderer imports PRESET_VARIANTS to animate
 * elements; this panel is just the picker. See framer-motion (motion / AnimatePresence).
 */

import React from 'react';
import { ArrowsIn, ArrowDown, Sparkle, Waveform, MagnifyingGlassPlus, Circle } from '@phosphor-icons/react';

// ── Preset catalogue (id must match sceneSchema ANIMATION_PRESETS) ──

export const PRESET_LIST = [
  { id: 'fade',     label: 'Fade',     Icon: ArrowsIn,            hint: 'Opacity in' },
  { id: 'slide-up', label: 'Slide Up', Icon: ArrowDown,           hint: 'Rise into place' },
  { id: 'pulse',    label: 'Pulse',    Icon: Waveform,            hint: 'Beat / breathe' },
  { id: 'float',    label: 'Float',    Icon: Sparkle,             hint: 'Gentle drift' },
  { id: 'scale-in', label: 'Scale In', Icon: MagnifyingGlassPlus, hint: 'Pop from center' },
];

/**
 * Framer-Motion variants for every preset, keyed by preset id.
 * `none` is intentionally absent — it means "no preset", plain static render.
 * Each entry exposes `initial`, `animate`, and an optional `transition`.
 */
export const PRESET_VARIANTS = {
  fade: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    transition: { duration: 0.6, ease: 'easeOut' },
  },
  'slide-up': {
    initial: { opacity: 0, y: 40 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.5, ease: 'easeOut' },
  },
  pulse: {
    initial: { scale: 1 },
    animate: { scale: [1, 1.08, 1] },
    transition: { duration: 1.4, ease: 'easeInOut', repeat: Infinity, repeatType: 'loop' },
  },
  float: {
    initial: { y: 0 },
    animate: { y: [0, -10, 0] },
    transition: { duration: 3, ease: 'easeInOut', repeat: Infinity, repeatType: 'loop' },
  },
  'scale-in': {
    initial: { opacity: 0, scale: 0.6 },
    animate: { opacity: 1, scale: 1 },
    transition: { duration: 0.45, ease: [0.34, 1.1, 0.64, 1] },
  },
};

/** Resolve a preset id to its variants (falls back to a no-op). */
export function getPresetVariants(presetId) {
  return PRESET_VARIANTS[presetId] || null;
}

/**
 * Props:
 *   activePreset  {string|null}  Currently applied preset (highlights it).
 *   onApplyPreset {(presetId) => void}
 *   disabled      {boolean}
 */
export default function AnimationPresets({ activePreset = null, onApplyPreset, disabled = false }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <div
        style={{
          fontFamily: 'var(--font-ui)',
          fontSize: '9px',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: 'var(--text-disabled)',
          padding: '2px 4px',
        }}
      >
        Animation Presets
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {PRESET_LIST.map(({ id, label, Icon, hint }) => {
          const active = activePreset === id;
          return (
            <button
              key={id}
              type="button"
              disabled={disabled}
              onClick={() => onApplyPreset?.(id)}
              aria-pressed={active}
              title={`${label} — ${hint}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                minWidth: '44px',
                minHeight: '44px',
                padding: '0 12px',
                borderRadius: 'var(--radius-md, 8px)',
                border: `1px solid ${active ? 'var(--text-primary)' : 'var(--color-border)'}`,
                background: active ? 'var(--state-active, rgba(255,255,255,0.10))' : 'var(--glass-frost)',
                color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
                cursor: disabled ? 'not-allowed' : 'pointer',
                opacity: disabled ? 0.45 : 1,
                transition: 'background 0.12s ease, border-color 0.12s ease',
              }}
              onMouseEnter={(e) => {
                if (!disabled && !active) e.currentTarget.style.background = 'var(--state-hover)';
              }}
              onMouseLeave={(e) => {
                if (!disabled && !active) e.currentTarget.style.background = 'var(--glass-frost)';
              }}
            >
              <Icon size={16} weight="regular" style={{ flexShrink: 0 }} />
              <span style={{ fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: active ? 600 : 400 }}>
                {label}
              </span>
              <span
                style={{
                  marginLeft: 'auto',
                  fontFamily: 'var(--font-ui)',
                  fontSize: '9px',
                  color: 'var(--text-disabled)',
                }}
              >
                {hint}
              </span>
            </button>
          );
        })}
      </div>

      <div
        style={{
          fontFamily: 'var(--font-ui)',
          fontSize: '9px',
          color: 'var(--text-disabled)',
          padding: '0 4px',
          lineHeight: 1.5,
        }}
      >
        {disabled ? 'Select an element to animate' : 'Tap a preset to apply it'}
      </div>
    </div>
  );
}
