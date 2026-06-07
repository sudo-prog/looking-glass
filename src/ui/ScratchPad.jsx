/**
 * LOOKING GLASS — ScratchPad
 * Global floating capture panel. Summon with Alt+Space (Option+Space on Mac).
 * Captures a sticky note and drops it onto the active canvas at a smart position.
 * Persists shortcut across the whole app — mount once in App.jsx.
 *
 * Usage:
 *   import { ScratchPad } from './ui/ScratchPad.jsx';
 *   // In App.jsx JSX: <ScratchPad />
 *
 * The shortcut is customizable: pass shortcutKey prop (default 'alt+ ').
 */

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
} from 'react';
import { useStore } from '../store/useStore.js';
import { ITEM_TYPES } from '../data/schema.js';

// ── Colour options for sticky notes ───────────────────────
const STICKY_COLORS = [
  { label: 'Stone',  bg: '#1A1A1A', border: 'rgba(255,255,255,0.10)' },
  { label: 'Amber',  bg: '#292210', border: 'rgba(245,158,11,0.30)' },
  { label: 'Sage',   bg: '#0E1F14', border: 'rgba(34,197,94,0.25)'  },
  { label: 'Ocean',  bg: '#0D1929', border: 'rgba(59,130,246,0.30)' },
  { label: 'Violet', bg: '#17102A', border: 'rgba(139,92,246,0.30)' },
];

// ── Smart drop position: avoids top-left cluster ──────────
function getSmartDropPosition(viewport) {
  const vp = viewport || { x: 0, y: 0, scale: 1 };
  // Place at 60% across, 40% down the visible viewport
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const worldX = (-vp.x + vw * 0.60) / vp.scale;
  const worldY = (-vp.y + vh * 0.40) / vp.scale;
  // Jitter slightly so multiple quick captures don't stack
  const jitter = () => (Math.random() - 0.5) * 80;
  return { x: worldX + jitter(), y: worldY + jitter() };
}

export function ScratchPad() {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [colorIdx, setColorIdx] = useState(0);
  const [saving, setSaving] = useState(false);

  const textareaRef = useRef(null);
  const panelRef    = useRef(null);

  const addItem  = useStore((s) => s.addItem);
  const viewport = useStore((s) => s.viewport);

  // ── Keyboard shortcut: Alt+Space ──────────────────────
  useEffect(() => {
    const handler = (e) => {
      if (
        e.altKey &&
        e.code === 'Space' &&
        !e.ctrlKey &&
        !e.metaKey
      ) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      if (e.key === 'Escape') {
        setOpen(false);
        setText('');
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Focus textarea when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => textareaRef.current?.focus(), 60);
    }
  }, [open]);

  // Click-outside to close (but NOT save)
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    // Use setTimeout so the same click that opens doesn't immediately close
    const id = setTimeout(() => {
      document.addEventListener('mousedown', handler);
    }, 100);
    return () => {
      clearTimeout(id);
      document.removeEventListener('mousedown', handler);
    };
  }, [open]);

  // ── Save to canvas ─────────────────────────────────────
  const handleSave = useCallback(async () => {
    const trimmed = text.trim();
    if (!trimmed) {
      setOpen(false);
      return;
    }
    setSaving(true);
    const { x, y } = getSmartDropPosition(viewport);
    const color = STICKY_COLORS[colorIdx];

    await addItem({
      type: ITEM_TYPES.NOTE,
      x,
      y,
      width: 260,
      content: {
        title: trimmed.split('\n')[0].substring(0, 60) || 'Scratch note',
        text:  trimmed,
      },
      style: {
        background: color.bg,
        border:     color.border,
      },
    });

    setSaving(false);
    setText('');
    setOpen(false);
  }, [text, colorIdx, viewport, addItem]);

  // Cmd+Enter / Ctrl+Enter also saves
  const handleKeyDown = useCallback(
    (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        handleSave();
      }
    },
    [handleSave],
  );

  if (!open) return null;

  const color = STICKY_COLORS[colorIdx];

  return (
    <>
      {/* Dim overlay */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.35)',
          zIndex: 'var(--z-modal)',
          backdropFilter: 'blur(2px)',
        }}
      />

      {/* Panel */}
      <div
        ref={panelRef}
        role="dialog"
        aria-label="Scratch pad — capture a thought"
        aria-modal="true"
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 'calc(var(--z-modal) + 1)',
          width: 'min(500px, 90vw)',
          borderRadius: '20px',
          background: color.bg,
          border: `1px solid ${color.border}`,
          boxShadow:
            'inset 0 1px 0 rgba(255,255,255,0.10), 0 24px 64px rgba(0,0,0,0.80)',
          backdropFilter: 'blur(40px) saturate(120%)',
          WebkitBackdropFilter: 'blur(40px) saturate(120%)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          animation: 'scratch-appear 0.22s cubic-bezier(0.34,1.56,0.64,1) both',
        }}
      >
        <style>{`
          @keyframes scratch-appear {
            from { opacity: 0; transform: translate(-50%,-50%) scale(0.90); }
            to   { opacity: 1; transform: translate(-50%,-50%) scale(1); }
          }
        `}</style>

        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 16px 8px',
            borderBottom: `1px solid ${color.border}`,
          }}
        >
          <div
            style={{
              fontFamily: 'var(--font-ui)',
              fontSize: '9px',
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              color: 'var(--text-secondary)',
            }}
          >
            ◎ SCRATCH PAD · ALT+SPACE
          </div>

          {/* Colour picker dots */}
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            {STICKY_COLORS.map((c, i) => (
              <button
                key={i}
                aria-label={`Color: ${c.label}`}
                onClick={() => setColorIdx(i)}
                style={{
                  width: i === colorIdx ? '10px' : '6px',
                  height: i === colorIdx ? '10px' : '6px',
                  borderRadius: '50%',
                  background: c.border,
                  border: i === colorIdx
                    ? '2px solid rgba(255,255,255,0.50)'
                    : '1px solid rgba(255,255,255,0.15)',
                  cursor: 'pointer',
                  padding: 0,
                  transition: 'all 0.15s ease',
                  flexShrink: 0,
                }}
              />
            ))}
          </div>
        </div>

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Capture a thought... (⌘↵ to save)"
          rows={6}
          style={{
            width: '100%',
            border: 'none',
            outline: 'none',
            resize: 'none',
            background: 'transparent',
            color: 'var(--text-primary)',
            fontFamily: 'var(--font-body)',
            fontSize: '15px',
            lineHeight: '1.6',
            padding: '16px',
            boxSizing: 'border-box',
            caretColor: 'var(--text-primary)',
          }}
          spellCheck
        />

        {/* Footer */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 16px',
            borderTop: `1px solid ${color.border}`,
          }}
        >
          <span
            style={{
              fontFamily: 'var(--font-ui)',
              fontSize: '9px',
              color: 'var(--text-disabled)',
              letterSpacing: '0.08em',
            }}
          >
            {text.length > 0 ? `${text.length} chars` : 'Esc to dismiss'}
          </span>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => { setOpen(false); setText(''); }}
              style={{
                height: '34px',
                padding: '0 14px',
                borderRadius: '8px',
                border: `1px solid ${color.border}`,
                background: 'transparent',
                color: 'var(--text-secondary)',
                fontFamily: 'var(--font-ui)',
                fontSize: '10px',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                cursor: 'pointer',
              }}
            >
              CANCEL
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !text.trim()}
              style={{
                height: '34px',
                padding: '0 18px',
                borderRadius: '8px',
                border: 'none',
                background: saving ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.12)',
                color: text.trim() ? 'var(--text-primary)' : 'var(--text-disabled)',
                fontFamily: 'var(--font-ui)',
                fontSize: '10px',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                cursor: text.trim() ? 'pointer' : 'default',
                transition: 'background 0.15s ease',
              }}
            >
              {saving ? 'SAVING…' : 'DROP TO CANVAS ↵'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export default ScratchPad;
