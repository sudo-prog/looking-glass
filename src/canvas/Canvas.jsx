/**
 * LOOKING GLASS — Canvas Component (React)
 * Infinite canvas with pan/zoom using CSS transforms.
 * Converts CanvasEngine logic to React state + refs.
 */
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { CanvasCard } from '../components/CanvasCard.jsx';

export function Canvas({
  items,
  viewport,
  selectedIds,
  onViewportChange,
  onSelectItem,
  onClearSelection,
  onItemMove,
  onItemSave,
  onItemDelete,
  onLightbox,
}) {
  const viewportRef = useRef(null);
  const worldRef = useRef(null);
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const isPanning = useRef(false);
  const lastPointer = useRef({ x: 0, y: 0 });
  const rafId = useRef(null);
  const dragItem = useRef(null);
  const dragStart = useRef({ x: 0, y: 0, itemX: 0, itemY: 0 });

  // Sync viewport from store
  useEffect(() => {
    setTransform(viewport);
  }, [viewport.x, viewport.y, viewport.scale]);

  const applyTransform = useCallback((t) => {
    if (worldRef.current) {
      worldRef.current.style.transform = `translate(${t.x}px, ${t.y}px) scale(${t.scale})`;
    }
  }, []);

  useEffect(() => {
    applyTransform(transform);
  }, [transform, applyTransform]);

  // Pointer events for panning
  const handlePointerDown = useCallback((e) => {
    // Check if clicking on a card
    if (e.target.closest('.canvas-card')) return;

    // Click on empty canvas clears selection
    if (e.target === viewportRef.current || e.target === worldRef.current) {
      onClearSelection();
    }

    isPanning.current = true;
    lastPointer.current = { x: e.clientX, y: e.clientY };
    viewportRef.current.setPointerCapture(e.pointerId);
    viewportRef.current.style.cursor = 'grabbing';
  }, [onClearSelection]);

  const handlePointerMove = useCallback((e) => {
    if (isPanning.current) {
      if (rafId.current) cancelAnimationFrame(rafId.current);
      rafId.current = requestAnimationFrame(() => {
        const dx = e.clientX - lastPointer.current.x;
        const dy = e.clientY - lastPointer.current.y;
        const newTransform = {
          ...transform,
          x: transform.x + dx,
          y: transform.y + dy,
        };
        lastPointer.current = { x: e.clientX, y: e.clientY };
        setTransform(newTransform);
      });
    }

    // Handle item dragging
    if (dragItem.current) {
      if (rafId.current) cancelAnimationFrame(rafId.current);
      rafId.current = requestAnimationFrame(() => {
        const dx = (e.clientX - dragStart.current.x) / transform.scale;
        const dy = (e.clientY - dragStart.current.y) / transform.scale;
        dragItem.current.style.left = `${dragStart.current.itemX + dx}px`;
        dragItem.current.style.top = `${dragStart.current.itemY + dy}px`;
      });
    }
  }, [transform]);

  const handlePointerUp = useCallback(() => {
    if (isPanning.current) {
      isPanning.current = false;
      if (viewportRef.current) viewportRef.current.style.cursor = 'grab';
      onViewportChange(transform);
    }

    // Finalize item drag
    if (dragItem.current) {
      const finalX = parseFloat(dragItem.current.style.left);
      const finalY = parseFloat(dragItem.current.style.top);
      const itemId = dragItem.current.dataset.id;
      onItemMove(itemId, finalX, finalY);
      dragItem.current = null;
    }
  }, [transform, onViewportChange, onItemMove]);

  // Wheel for zoom
  const handleWheel = useCallback((e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.min(3, Math.max(0.1, transform.scale * delta));

    const rect = viewportRef.current.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;

    const newTransform = {
      x: cx - (cx - transform.x) * (newScale / transform.scale),
      y: cy - (cy - transform.y) * (newScale / transform.scale),
      scale: newScale,
    };

    setTransform(newTransform);
    onViewportChange(newTransform);
  }, [transform, onViewportChange]);

  // Card drag start
  const handleCardDragStart = useCallback((e, itemId, itemX, itemY) => {
    // Only start drag if not clicking on interactive elements
    if (e.target.closest('.card-note-editor') || e.target.closest('a') || e.target.closest('button') || e.target.closest('input')) return;

    e.stopPropagation();
    const card = document.querySelector(`[data-id="${itemId}"]`);
    if (card) {
      dragItem.current = card;
      dragStart.current = { x: e.clientX, y: e.clientY, itemX, itemY };
    }
  }, []);

  return (
    <div
      ref={viewportRef}
      className="canvas-viewport"
      style={{
        flex: 1,
        position: 'relative',
        overflow: 'hidden',
        cursor: 'grab',
        touchAction: 'none',
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onWheel={handleWheel}
    >
      <div
        ref={worldRef}
        id="canvas-world"
        style={{
          position: 'absolute',
          width: '1px',
          height: '1px',
          transformOrigin: '0 0',
          willChange: 'transform',
        }}
      >
        {items.map((item) => (
          <CanvasCard
            key={item.id}
            item={item}
            isSelected={selectedIds.has(item.id)}
            scale={transform.scale}
            onSelect={(multi) => onSelectItem(item.id, multi)}
            onDragStart={(e) => handleCardDragStart(e, item.id, item.x, item.y)}
            onSave={(updates) => onItemSave(item.id, updates)}
            onDelete={() => onItemDelete(item.id)}
            onLightbox={() => onLightbox(item)}
          />
        ))}
      </div>
    </div>
  );
}
