/**
 * LOOKING GLASS — Canvas Component (React)
 * V0.5: Infinite canvas with Stack & Folder drop-on-card support.
 *
 * Fixes applied (audit pass):
 *  - position:fixed on DropModePicker via CSS (not a fragment layout issue)
 *  - wheel event registered as { passive: false } via useEffect so preventDefault works
 *  - unused draggedType variable removed
 *  - panning lastPointer updated outside rAF to avoid stale reads on fast swipes
 */
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { CanvasCard } from '../components/CanvasCard.jsx';
import { DropModePicker } from '../components/DropModePicker.jsx';
import { ITEM_TYPES } from '../data/schema.js';

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
  onCreateStack,
  onAddToStack,
  onCreateFolder,
  onAddToFolder,
}) {
  const viewportRef = useRef(null);
  const worldRef    = useRef(null);
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const isPanning    = useRef(false);
  const lastPointer  = useRef({ x: 0, y: 0 });
  const rafId        = useRef(null);
  const dragItem     = useRef(null);
  const dragStart    = useRef({ x: 0, y: 0, itemX: 0, itemY: 0 });
  const hasMoved     = useRef(false);
  const transformRef = useRef(transform); // always-current transform for rAF closures

  // Drop-mode picker state
  const [picker, setPicker] = useState(null); // { x, y, draggedId, targetId }

  // Keep transformRef in sync
  useEffect(() => { transformRef.current = transform; }, [transform]);

  // Sync viewport from store (only when changed externally, not from local wheel/pan)
  const lastExternalViewport = useRef(null);
  const isInternalChange = useRef(false);
  useEffect(() => {
    // Skip if this viewport was just set by us (wheel/pan)
    if (lastExternalViewport.current === viewport) return;
    if (isInternalChange.current) {
      isInternalChange.current = false;
      return;
    }
    setTransform(viewport);
  }, [viewport]);

  const applyTransform = useCallback((t) => {
    if (worldRef.current) {
      worldRef.current.style.transform = `translate(${t.x}px, ${t.y}px) scale(${t.scale})`;
    }
  }, []);

  useEffect(() => {
    applyTransform(transform);
  }, [transform, applyTransform]);

  // Dismiss picker on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') setPicker(null); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Non-passive wheel for zoom (React onWheel is passive in React 17+)
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const handler = (e) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      const t = transformRef.current;
      const newScale = Math.min(3, Math.max(0.1, t.scale * delta));
      const rect = el.getBoundingClientRect();
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;
      const newTransform = {
        x: cx - (cx - t.x) * (newScale / t.scale),
        y: cy - (cy - t.y) * (newScale / t.scale),
        scale: newScale,
      };
      setTransform(newTransform);
      isInternalChange.current = true;
      onViewportChange(newTransform);
      lastExternalViewport.current = newTransform;
    };
    el.addEventListener('wheel', handler, { passive: false });
    return () => el.removeEventListener('wheel', handler);
  }, [onViewportChange]);

  // ── Panning ────────────────────────────────────────────────────────────

  const handlePointerDown = useCallback((e) => {
    if (e.target.closest('.canvas-card')) return;
    if (e.target === viewportRef.current || e.target === worldRef.current) {
      onClearSelection();
      setPicker(null);
    }
    isPanning.current = true;
    lastPointer.current = { x: e.clientX, y: e.clientY };
    viewportRef.current.setPointerCapture(e.pointerId);
    viewportRef.current.style.cursor = 'grabbing';
  }, [onClearSelection]);

  const handlePointerMove = useCallback((e) => {
    if (isPanning.current) {
      // Update lastPointer BEFORE rAF so fast movements don't lag
      const dx = e.clientX - lastPointer.current.x;
      const dy = e.clientY - lastPointer.current.y;
      lastPointer.current = { x: e.clientX, y: e.clientY };

      if (rafId.current) cancelAnimationFrame(rafId.current);
      rafId.current = requestAnimationFrame(() => {
        setTransform((prev) => {
          const updated = { ...prev, x: prev.x + dx, y: prev.y + dy };
          return updated;
        });
      });
    }

    if (dragItem.current) {
      hasMoved.current = true;
      const clientX = e.clientX;
      const clientY = e.clientY;

      if (rafId.current) cancelAnimationFrame(rafId.current);
      rafId.current = requestAnimationFrame(() => {
        const t = transformRef.current;
        const dx = (clientX - dragStart.current.x) / t.scale;
        const dy = (clientY - dragStart.current.y) / t.scale;
        dragItem.current.style.left = `${dragStart.current.itemX + dx}px`;
        dragItem.current.style.top  = `${dragStart.current.itemY + dy}px`;

        // Highlight drop target under dragged card
        dragItem.current.style.pointerEvents = 'none';
        const el = document.elementFromPoint(clientX, clientY);
        dragItem.current.style.pointerEvents = '';

        const target = el?.closest('.canvas-card');
        document.querySelectorAll('.drop-target-stack, .drop-target-folder').forEach((el) => {
          el.classList.remove('drop-target-stack', 'drop-target-folder');
        });
        if (target && target !== dragItem.current) {
          const t = target.dataset.type;
          if (t === ITEM_TYPES.FOLDER)      target.classList.add('drop-target-folder');
          else if (t === ITEM_TYPES.STACK)  target.classList.add('drop-target-stack');
          else                              target.classList.add('drop-target-folder');
        }
      });
    }
  }, []);

  const handlePointerUp = useCallback((e) => {
    // Clear all drop highlights
    document.querySelectorAll('.drop-target-stack, .drop-target-folder').forEach((el) => {
      el.classList.remove('drop-target-stack', 'drop-target-folder');
    });

    if (isPanning.current) {
      isPanning.current = false;
      if (viewportRef.current) viewportRef.current.style.cursor = 'grab';
      isInternalChange.current = true;
      lastExternalViewport.current = transformRef.current;
      onViewportChange(transformRef.current);
    }

    if (dragItem.current && hasMoved.current) {
      const draggedId = dragItem.current.dataset.id;

      // Reset visual state
      dragItem.current.style.zIndex  = dragItem.current.dataset.zIndex || 0;
      dragItem.current.style.cursor  = 'grab';
      dragItem.current.style.transition = '';

      // Hit-test for drop target
      dragItem.current.style.pointerEvents = 'none';
      const el = document.elementFromPoint(e.clientX, e.clientY);
      dragItem.current.style.pointerEvents = '';
      const target = el?.closest('.canvas-card');

      if (target && target !== dragItem.current) {
        const targetId   = target.dataset.id;
        const targetType = target.dataset.type;

        if (targetType === ITEM_TYPES.FOLDER) {
          onAddToFolder?.(draggedId, targetId);
          dragItem.current = null;
          hasMoved.current = false;
          return;
        } else if (targetType === ITEM_TYPES.STACK) {
          onAddToStack?.(draggedId, targetId);
          dragItem.current = null;
          hasMoved.current = false;
          return;
        } else {
          // Regular card → show Stack / Folder picker
          const rect = target.getBoundingClientRect();
          setPicker({
            x: rect.left + rect.width / 2,
            y: rect.top,
            draggedId,
            targetId,
          });
          dragItem.current = null;
          hasMoved.current = false;
          return;
        }
      }

      // Normal drop — save final position
      const finalX = parseFloat(dragItem.current.style.left);
      const finalY = parseFloat(dragItem.current.style.top);
      onItemMove(draggedId, finalX, finalY);
    }

    dragItem.current = null;
    hasMoved.current = false;
  }, [onViewportChange, onItemMove, onAddToStack, onAddToFolder]);

  // ── Card drag start ────────────────────────────────────────────────────

  const handleCardDragStart = useCallback((e, itemId) => {
    if (
      e.target.closest('.card-note-editor') ||
      e.target.closest('a') ||
      e.target.closest('button') ||
      e.target.closest('input') ||
      e.target.closest('.folder-tab') ||
      e.target.closest('.stack-hint')
    ) return;

    e.stopPropagation();
    const card = document.querySelector(`[data-id="${itemId}"]`);
    if (card) {
      dragItem.current  = card;
      hasMoved.current  = false;
      // Read current position from DOM (may differ from item prop after drag)
      const currentX = parseFloat(card.style.left) || 0;
      const currentY = parseFloat(card.style.top) || 0;
      dragStart.current = { x: e.clientX, y: e.clientY, itemX: currentX, itemY: currentY };
      card.style.zIndex     = 9999;
      card.style.cursor     = 'grabbing';
      card.style.transition = 'none';
    }
  }, []);

  // ── Picker handlers ───────────────────────────────────────────────────

  const handlePickerStack = useCallback(async () => {
    if (!picker) return;
    await onCreateStack?.([picker.draggedId, picker.targetId]);
    setPicker(null);
  }, [picker, onCreateStack]);

  const handlePickerFolder = useCallback(async () => {
    if (!picker) return;
    const name = prompt('Folder name:', 'Folder') ?? 'Folder';
    await onCreateFolder?.([picker.draggedId, picker.targetId], name);
    setPicker(null);
  }, [picker, onCreateFolder]);

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
      /* onWheel is intentionally omitted — handled via non-passive useEffect above */
    >
      <div
        ref={worldRef}
        id="canvas-world"
        style={{
          position: 'absolute',
          inset: 0,
          minWidth: '5000px',
          minHeight: '5000px',
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
            onDragStart={(e) => handleCardDragStart(e, item.id)}
            onSave={(updates) => onItemSave(item.id, updates)}
            onDelete={() => onItemDelete(item.id)}
            onLightbox={() => onLightbox(item)}
          />
        ))}
      </div>

      {picker && createPortal(
        <DropModePicker
          x={picker.x}
          y={picker.y}
          onStack={handlePickerStack}
          onFolder={handlePickerFolder}
          onDismiss={() => setPicker(null)}
        />,
        document.body
      )}
    </div>
  );
}
