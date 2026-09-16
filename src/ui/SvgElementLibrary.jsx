/**
 * LOOKING GLASS — SVG Element Library (Phase 3: Supercharge Scenes)
 *
 * A panel of insertable SVG primitives. Each item renders a small live SVG
 * preview and, when tapped, calls `onInsert(elementDef)` with a fully-formed
 * element object (built via `createElement` from sceneSchema.js). The parent
 * workspace owns the scene state and appends the new element.
 *
 * Visual language reuses the existing glass tokens already used by
 * TagsSystem.jsx / CanvasCard.jsx: --glass-frost, --color-border,
 * --state-hover, --text-secondary, 44px tap targets, --font-ui.
 */

import React from 'react';
import { Square, Circle, CircleHalf, LineSegment, Path, TextT } from '@phosphor-icons/react';
import { createElement, ELEMENT_KINDS } from '../lib/sceneSchema.js';

// ── Catalogue ──────────────────────────────────────────────
// label + icon + a tiny inline-SVG preview snippet for each kind.

const LIBRARY = [
  {
    kind: 'rect',
    label: 'Rectangle',
    Icon: Square,
    preview: 'M6 10 h36 v24 h-36 z',
  },
  {
    kind: 'circle',
    label: 'Circle',
    Icon: Circle,
    preview: 'M24 24 m-16 0 a16 16 0 1 0 32 0 a16 16 0 1 0 -32 0',
  },
  {
    kind: 'ellipse',
    label: 'Ellipse',
    Icon: CircleHalf,
    preview: 'M24 24 m-20 0 a20 12 0 1 0 40 0 a20 12 0 1 0 -40 0',
  },
  {
    kind: 'line',
    label: 'Line',
    Icon: LineSegment,
    preview: 'M6 36 L42 12',
  },
  {
    kind: 'path',
    label: 'Path',
    Icon: Path,
    preview: 'M8 34 L24 8 L40 34 Z',
  },
  {
    kind: 'text',
    label: 'Text',
    Icon: TextT,
    preview: null,
  },
];

function ElementPreview({ item }) {
  if (item.kind === 'text') {
    return (
      <span
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: '16px',
          fontWeight: 700,
          color: 'var(--text-primary)',
          letterSpacing: '0.02em',
        }}
      >
        T
      </span>
    );
  }
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" aria-hidden="true">
      <path
        d={item.preview}
        fill={item.kind === 'line' ? 'none' : 'var(--color-accent)'}
        stroke={item.kind === 'line' ? 'var(--text-primary)' : 'none'}
        strokeWidth={item.kind === 'line' ? 3 : 0}
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * Props:
 *   onInsert  {(elementDef) => void}  Called with a full element object.
 *   disabled  {boolean}               Disable insertion (e.g. no active scene).
 */
export default function SvgElementLibrary({ onInsert, disabled = false }) {
  const handleInsert = (kind) => {
    if (disabled) return;
    const elementDef = createElement(kind);
    onInsert?.(elementDef);
  };

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
        SVG Elements
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '8px',
        }}
      >
        {LIBRARY.map((item) => {
          const Icon = item.Icon;
          return (
            <button
              key={item.kind}
              type="button"
              disabled={disabled}
              onClick={() => handleInsert(item.kind)}
              aria-label={`Insert ${item.label}`}
              title={`Insert ${item.label}`}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
                minWidth: '44px',
                minHeight: '72px',
                padding: '8px 4px',
                borderRadius: 'var(--radius-md, 8px)',
                border: '1px solid var(--color-border)',
                background: 'var(--glass-frost)',
                color: 'var(--text-secondary)',
                cursor: disabled ? 'not-allowed' : 'pointer',
                opacity: disabled ? 0.45 : 1,
                transition: 'background 0.12s ease, border-color 0.12s ease',
              }}
              onMouseEnter={(e) => {
                if (!disabled) e.currentTarget.style.background = 'var(--state-hover)';
              }}
              onMouseLeave={(e) => {
                if (!disabled) e.currentTarget.style.background = 'var(--glass-frost)';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '40px' }}>
                <ElementPreview item={item} />
              </div>
              <span
                style={{
                  fontFamily: 'var(--font-ui)',
                  fontSize: '10px',
                  letterSpacing: '0.04em',
                  color: 'var(--text-secondary)',
                }}
              >
                {item.label}
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
        {ELEMENT_KINDS.length} primitives · tap to add to scene
      </div>
    </div>
  );
}
