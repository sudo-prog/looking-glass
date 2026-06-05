/**
 * LOOKING GLASS — Minimap Component (Phase 5 / V2)
 *
 * Size: 160×100px desktop, hidden mobile
 * Background: rgba(0,0,0,0.60) — NOT glass
 * Item dots: 2px, --text-secondary
 * Viewport rect: glass rectangle
 * Position: bottom-right, 8px radius
 * Click → pan, drag viewport → live pan
 * 30fps throttle
 */
import React, { useRef, useEffect, useCallback, useState } from 'react';

const MINIMAP_WIDTH = 160;
const MINIMAP_HEIGHT = 100;
const THROTTLE_MS = 33; // ~30fps

export function Minimap({ items = [], viewport, canvasSize, onPan }) {
  const canvasRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const lastRender = useRef(0);
  const rafId = useRef(null);

  // Compute content bounds
  const getBounds = useCallback(() => {
    if (!items || items.length === 0) {
      return { minX: -500, minY: -500, maxX: 500, maxY: 500 };
    }
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    items.forEach((item) => {
      const w = item.width || 300;
      const h = item.height || 200;
      if (item.x < minX) minX = item.x;
      if (item.y < minY) minY = item.y;
      if (item.x + w > maxX) maxX = item.x + w;
      if (item.y + h > maxY) maxY = item.y + h;
    });
    // Add padding
    const pad = 100;
    return { minX: minX - pad, minY: minY - pad, maxX: maxX + pad, maxY: maxY + pad };
  }, [items]);

  // World → minimap coords
  const worldToMinimap = useCallback(
    (wx, wy, bounds) => {
      const contentW = bounds.maxX - bounds.minX || 1;
      const contentH = bounds.maxY - bounds.minY || 1;
      const scaleX = MINIMAP_WIDTH / contentW;
      const scaleY = MINIMAP_HEIGHT / contentH;
      const scale = Math.min(scaleX, scaleY);
      const offsetX = (MINIMAP_WIDTH - contentW * scale) / 2;
      const offsetY = (MINIMAP_HEIGHT - contentH * scale) / 2;
      return {
        x: (wx - bounds.minX) * scale + offsetX,
        y: (wy - bounds.minY) * scale + offsetY,
        scale,
      };
    },
    []
  );

  // Render
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear
    ctx.clearRect(0, 0, MINIMAP_WIDTH, MINIMAP_HEIGHT);

    // Background: rgba(0,0,0,0.60) — NOT glass
    ctx.fillStyle = 'rgba(0, 0, 0, 0.60)';
    ctx.beginPath();
    ctx.roundRect(0, 0, MINIMAP_WIDTH, MINIMAP_HEIGHT, 8);
    ctx.fill();

    const bounds = getBounds();

    // Draw item dots (2px, --text-secondary)
    ctx.fillStyle = 'var(--text-secondary)';
    items.forEach((item) => {
      const pos = worldToMinimap(item.x, item.y, bounds);
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 2, 0, Math.PI * 2);
      ctx.fill();
    });

    // Draw viewport rect (glass rectangle)
    if (viewport) {
      const vpW = (viewport.width || window.innerWidth) / (viewport.scale || 1);
      const vpH = (viewport.height || window.innerHeight) / (viewport.scale || 1);
      const vpX = (-viewport.x || 0) / (viewport.scale || 1);
      const vpY = (-viewport.y || 0) / (viewport.scale || 1);

      const tl = worldToMinimap(vpX, vpY, bounds);
      const vpWm = vpW * tl.scale;
      const vpHm = vpH * tl.scale;

      // Glass rectangle fill
      ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.beginPath();
      ctx.roundRect(tl.x, tl.y, vpWm, vpHm, 2);
      ctx.fill();

      // Glass rectangle border
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(tl.x, tl.y, vpWm, vpHm, 2);
      ctx.stroke();
    }
  }, [items, viewport, getBounds, worldToMinimap]);

  // Throttled render at ~30fps
  const throttledRender = useCallback(() => {
    const now = Date.now();
    if (now - lastRender.current < THROTTLE_MS) {
      if (!rafId.current) {
        rafId.current = requestAnimationFrame(() => {
          rafId.current = null;
          lastRender.current = Date.now();
          render();
        });
      }
      return;
    }
    lastRender.current = now;
    render();
  }, [render]);

  useEffect(() => {
    throttledRender();
  }, [throttledRender]);

  useEffect(() => {
    return () => {
      if (rafId.current) cancelAnimationFrame(rafId.current);
    };
  }, []);

  // Click → pan
  const handleClick = useCallback(
    (e) => {
      if (isDragging) return;
      const canvas = canvasRef.current;
      if (!canvas || !onPan) return;
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;

      const bounds = getBounds();
      const contentW = bounds.maxX - bounds.minX || 1;
      const contentH = bounds.maxY - bounds.minY || 1;
      const scaleX = MINIMAP_WIDTH / contentW;
      const scaleY = MINIMAP_HEIGHT / contentH;
      const scale = Math.min(scaleX, scaleY);
      const offsetX = (MINIMAP_WIDTH - contentW * scale) / 2;
      const offsetY = (MINIMAP_HEIGHT - contentH * scale) / 2;

      const wx = (mx - offsetX) / scale + bounds.minX;
      const wy = (my - offsetY) / scale + bounds.minY;

      onPan(wx, wy);
    },
    [isDragging, onPan, getBounds]
  );

  // Drag viewport → live pan
  const handlePointerDown = useCallback((e) => {
    setIsDragging(true);
    e.target.setPointerCapture?.(e.pointerId);
  }, []);

  const handlePointerMove = useCallback(
    (e) => {
      if (!isDragging || !onPan) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;

      const bounds = getBounds();
      const contentW = bounds.maxX - bounds.minX || 1;
      const contentH = bounds.maxY - bounds.minY || 1;
      const scaleX = MINIMAP_WIDTH / contentW;
      const scaleY = MINIMAP_HEIGHT / contentH;
      const scale = Math.min(scaleX, scaleY);
      const offsetX = (MINIMAP_WIDTH - contentW * scale) / 2;
      const offsetY = (MINIMAP_HEIGHT - contentH * scale) / 2;

      const wx = (mx - offsetX) / scale + bounds.minX;
      const wy = (my - offsetY) / scale + bounds.minY;

      onPan(wx, wy);
    },
    [isDragging, onPan, getBounds]
  );

  const handlePointerUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  return (
    <div className="minimap-wrap">
      <canvas
        ref={canvasRef}
        width={MINIMAP_WIDTH}
        height={MINIMAP_HEIGHT}
        className="minimap-canvas"
        onClick={handleClick}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      />
    </div>
  );
}
