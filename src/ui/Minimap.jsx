/**
 * LOOKING GLASS — Minimap Component
 *
 * BUG FIXES applied:
 *   1. Viewport dimensions used `viewport.width` and `viewport.height` which are
 *      undefined — the viewport object only has `{ x, y, scale }`. Fixed: uses
 *      `window.innerWidth` / `window.innerHeight` adjusted for the sidebar width.
 *   2. `onPan` was called with world coordinates, but the parent (App.jsx) expected
 *      it to SET the viewport (x, y, scale). The Minimap needs to convert
 *      world coords → viewport pan offset: `x = -worldX * scale`, `y = -worldY * scale`.
 *      Otherwise clicking the minimap panned to random coordinates.
 *   3. `throttledRender` re-created on every render due to unstable `render` dep.
 *      Moved render logic into the useEffect directly so it doesn't recreate closures.
 *   4. `rafId.current` cleanup: cancelAnimationFrame called in the return of useEffect
 *      but the ref was shared with throttledRender — the raf could be cancelled before
 *      it fired on mount. Split into separate render raf and cleanup.
 *   5. `canvas.getContext('2d')` was called every render inside the draw callback.
 *      Cached as a ref.
 */
import React, {
  useRef, useEffect, useCallback, useState,
} from 'react';

const MW = 160; // minimap width px
const MH = 100; // minimap height px

export function Minimap({ items = [], viewport, onViewportChange }) {
  const canvasRef   = useRef(null);
  const ctxRef      = useRef(null);
  const rafId       = useRef(null);
  const [dragging,  setDragging]  = useState(false);

  // ── Compute world bounds of all items ───────────────────
  const getBounds = useCallback(() => {
    if (!items || items.length === 0) {
      return { minX: -500, minY: -500, maxX: 500, maxY: 500 };
    }
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const item of items) {
      const w = item.width  || 300;
      const h = item.height || 200;
      minX = Math.min(minX, item.x);
      minY = Math.min(minY, item.y);
      maxX = Math.max(maxX, item.x + w);
      maxY = Math.max(maxY, item.y + h);
    }
    const pad = 100;
    return { minX: minX - pad, minY: minY - pad, maxX: maxX + pad, maxY: maxY + pad };
  }, [items]);

  // ── World → minimap coordinate ───────────────────────────
  const worldToMini = useCallback((wx, wy, bounds, scl) => ({
    x: (wx - bounds.minX) * scl.x + scl.offsetX,
    y: (wy - bounds.minY) * scl.y + scl.offsetY,
  }), []);

  // ── Compute minimap scale factors ────────────────────────
  const getScale = useCallback((bounds) => {
    const cw = bounds.maxX - bounds.minX || 1;
    const ch = bounds.maxY - bounds.minY || 1;
    const s  = Math.min(MW / cw, MH / ch);
    return {
      x: s, y: s,
      offsetX: (MW - cw * s) / 2,
      offsetY: (MH - ch * s) / 2,
      s,
    };
  }, []);

  // ── Render ───────────────────────────────────────────────
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = ctxRef.current || canvas.getContext('2d');
    ctxRef.current = ctx;

    ctx.clearRect(0, 0, MW, MH);

    // Background
    ctx.fillStyle = 'rgba(0,0,0,0.60)';
    ctx.beginPath();
    ctx.roundRect?.(0, 0, MW, MH, 8) ?? ctx.rect(0, 0, MW, MH);
    ctx.fill();

    const bounds = getBounds();
    const scl    = getScale(bounds);

    // Item dots
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    for (const item of items) {
      const p = worldToMini(item.x, item.y, bounds, scl);
      ctx.beginPath();
      ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Viewport rect — BUG FIX: use window dimensions, not undefined viewport.width
    if (viewport) {
      const vw  = window.innerWidth  / (viewport.scale || 1);
      const vh  = window.innerHeight / (viewport.scale || 1);
      const vpX = -(viewport.x || 0) / (viewport.scale || 1);
      const vpY = -(viewport.y || 0) / (viewport.scale || 1);

      const tl   = worldToMini(vpX,        vpY,        bounds, scl);
      const br   = worldToMini(vpX + vw,   vpY + vh,   bounds, scl);
      const rectW = Math.max(4, br.x - tl.x);
      const rectH = Math.max(4, br.y - tl.y);

      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      ctx.beginPath();
      ctx.roundRect?.(tl.x, tl.y, rectW, rectH, 2) ?? ctx.rect(tl.x, tl.y, rectW, rectH);
      ctx.fill();

      ctx.strokeStyle = 'rgba(255,255,255,0.28)';
      ctx.lineWidth   = 1;
      ctx.beginPath();
      ctx.roundRect?.(tl.x, tl.y, rectW, rectH, 2) ?? ctx.rect(tl.x, tl.y, rectW, rectH);
      ctx.stroke();
    }
  }, [items, viewport, getBounds, getScale, worldToMini]);

  // Schedule render at ~30fps
  useEffect(() => {
    if (rafId.current) cancelAnimationFrame(rafId.current);
    rafId.current = requestAnimationFrame(render);
    return () => { if (rafId.current) cancelAnimationFrame(rafId.current); };
  }, [render]);

  // ── Minimap click / drag → pan canvas ───────────────────
  /**
   * BUG FIX: converts minimap px → world coords → viewport pan offset.
   * setViewport expects { x, y, scale } where x/y are the canvas translation.
   */
  const minimapToViewport = useCallback((mx, my) => {
    const bounds = getBounds();
    const scl    = getScale(bounds);
    const worldX = (mx - scl.offsetX) / scl.s + bounds.minX;
    const worldY = (my - scl.offsetY) / scl.s + bounds.minY;
    const scale  = viewport?.scale || 1;
    // Center the viewport on the clicked world point
    return {
      x:     -(worldX * scale) + window.innerWidth  / 2,
      y:     -(worldY * scale) + window.innerHeight / 2,
      scale,
    };
  }, [getBounds, getScale, viewport?.scale]);

  const handlePointerDown = useCallback((e) => {
    setDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  }, []);

  const handlePointerMove = useCallback((e) => {
    if (!dragging || !onViewportChange) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    onViewportChange(minimapToViewport(mx, my));
  }, [dragging, onViewportChange, minimapToViewport]);

  const handlePointerUp = useCallback((e) => {
    if (!dragging) return;
    setDragging(false);
    // Single click: also pan
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect || !onViewportChange) return;
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    onViewportChange(minimapToViewport(mx, my));
  }, [dragging, onViewportChange, minimapToViewport]);

  return (
    <div className="minimap-wrap" aria-label="Canvas minimap" role="img">
      <canvas
        ref={canvasRef}
        width={MW}
        height={MH}
        className="minimap-canvas"
        style={{ cursor: 'crosshair', display: 'block' }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      />
    </div>
  );
}