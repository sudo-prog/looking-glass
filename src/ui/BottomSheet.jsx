/**
 * LOOKING GLASS — Bottom Sheet
 *
 * BUG FIXES applied:
 *   1. Snap points were inverted — peek:15 made the sheet nearly fullscreen.
 *      Corrected: peek≈85vh from top (sheet shows ~15vh), default≈50vh, full≈10vh.
 *   2. Position uses CSS `transform: translateY()` instead of `top: ${y}%`.
 *      `top` + `bottom: 0` caused the sheet to stretch; transform moves without resize.
 *   3. Close threshold: was `currentY > peek + 10 = 25` which closed at default(50).
 *      Now closes when dragged below the peek snap point (i.e. mostly off screen).
 *   4. Drag delta calculation: used (deltaY / window.innerHeight * 100) which worked
 *      only in viewport-percent space. Converted to translateY px space for accuracy.
 */
import React, {
  useEffect, useRef, useState, useCallback,
} from 'react';
import { createPortal } from 'react-dom';

// translateY values as % of window.innerHeight:
//   FULL  = 10vh from top  (almost fully open)
//   HALF  = 50vh from top  (half open)
//   PEEK  = 82vh from top  (peeking at bottom)
//   CLOSE = 105vh          (off screen)
const SNAP = {
  full:  0.10,
  half:  0.50,
  peek:  0.82,
};
const CLOSE_THRESHOLD = 0.92; // if dragged below this, close

export function BottomSheet({ isOpen, onClose, snap = 'half', children }) {
  const sheetRef    = useRef(null);
  const [yFrac, setYFrac] = useState(1.05); // 1.05 = off-screen initially
  const isDragging      = useRef(false);
  const dragStartY      = useRef(0);
  const dragStartFrac   = useRef(0);

  const targetFrac = SNAP[snap] ?? SNAP.half;

  // ── Animate open ────────────────────────────────────────
  useEffect(() => {
    if (isOpen) {
      // Let render complete at off-screen position, then animate to target
      requestAnimationFrame(() => setYFrac(targetFrac));
    }
  }, [isOpen, targetFrac]);

  // ── Close ────────────────────────────────────────────────
  const handleClose = useCallback(() => {
    setYFrac(1.05);
    setTimeout(onClose, 260);
  }, [onClose]);

  // ── Drag handle ──────────────────────────────────────────
  const handlePointerDown = useCallback((e) => {
    isDragging.current    = true;
    dragStartY.current    = e.clientY;
    dragStartFrac.current = yFrac;
    e.target.setPointerCapture?.(e.pointerId);
  }, [yFrac]);

  const handlePointerMove = useCallback((e) => {
    if (!isDragging.current) return;
    const deltaFrac = (e.clientY - dragStartY.current) / window.innerHeight;
    const newFrac   = Math.max(SNAP.full - 0.05, dragStartFrac.current + deltaFrac);
    setYFrac(newFrac);
  }, []);

  const handlePointerUp = useCallback(() => {
    if (!isDragging.current) return;
    isDragging.current = false;

    if (yFrac >= CLOSE_THRESHOLD) {
      handleClose();
      return;
    }

    // Snap to nearest defined snap point
    const points  = Object.values(SNAP);
    const closest = points.reduce((prev, curr) =>
      Math.abs(curr - yFrac) < Math.abs(prev - yFrac) ? curr : prev
    );
    setYFrac(closest);
  }, [yFrac, handleClose]);

  // ── Escape key ───────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => { if (e.key === 'Escape') handleClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, handleClose]);

  if (!isOpen) return null;

  const translateY = `${yFrac * 100}vh`;

  return createPortal(
    <div
      className="bottom-sheet-overlay"
      onClick={handleClose}
      style={{ position: 'fixed', inset: 0, zIndex: 'var(--z-bottom-sheet, 500)', background: `rgba(0,0,0,${Math.max(0, 0.50 - yFrac * 0.40)})` }}
    >
      <div
        ref={sheetRef}
        className="bottom-sheet glass-surface"
        style={{
          position:   'fixed',
          left:       0,
          right:      0,
          bottom:     0,
          // Use transform instead of top so bottom:0 doesn't stretch the element
          transform:  `translateY(${translateY})`,
          transition: isDragging.current
            ? 'none'
            : 'transform 280ms cubic-bezier(0.32,0.72,0,1)',
          borderRadius: 'var(--radius-2xl) var(--radius-2xl) 0 0',
          maxHeight:    '92vh',
          overflowY:    'auto',
        }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div
          className="bottom-sheet__handle"
          style={{ width: 36, height: 4, background: 'rgba(255,255,255,0.20)', borderRadius: 2, margin: '10px auto 6px', cursor: 'grab' }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        />
        <div className="bottom-sheet__content">{children}</div>
      </div>
    </div>,
    document.body
  );
}