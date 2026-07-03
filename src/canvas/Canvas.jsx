/**
 * LOOKING GLASS — Canvas Component (React)
 * V0.6: Infinite canvas with Stack & Folder drop-on-card support,
 * drag-to-select box (Visuals.mp4 / Stacks.mp4), and the floating
 * SelectionToolbar (STACK_BIG_TO_SMALL.mp4).
 *
 * Fixes applied (audit pass):
 *  - position:fixed on DropModePicker via CSS (not a fragment layout issue)
 *  - wheel event registered as { passive: false } via useEffect so preventDefault works
 *  - unused draggedType variable removed
 *  - panning lastPointer updated outside rAF to avoid stale reads on fast swipes
 *  - PINCH TO ZOOM for mobile devices
 */
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { CanvasCard } from '../components/CanvasCard.jsx';
import { DropModePicker } from '../components/DropModePicker.jsx';
import { SelectionToolbar } from '../ui/SelectionToolbar.jsx';
import { ITEM_TYPES } from '../data/schema.js';

const DRAG_SELECT_THRESHOLD = 4; // px before a click on empty canvas becomes a box-select

export function Canvas({
  items,
  viewport,
  selectedIds,
  onViewportChange,
  onSelectItem,
  onSetSelection,
  onClearSelection,
  onItemMove,
  onItemSave,
  onItemDelete,
  onLightbox,
  onCreateStack,
  onAddToStack,
  onCreateFolder,
  onAddToFolder,
  onContextMenu,
  onOpenFolder,
  onColorSelected,
  onCopyLinkSelected,
  onDeleteSelected,
  onArrangeSelected,
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

  // ── Pinch-to-zoom state (mobile) ─────────────────────────────────────
  const pointers    = useRef(new Map()); // Track active pointers by ID
  const initialDist = useRef(0);
  const initialScale = useRef(1);

  // Drop-mode picker state
  const [picker, setPicker] = useState(null); // { x, y, draggedId, targetId }

  // Drag-to-select box state
  const [selectBox, setSelectBox] = useState(null); // { startX, startY, x, y, w, h } in screen coords
  const isBoxSelecting = useRef(false);
  const boxAdditive = useRef(false);

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

  // ── Pinch-to-zoom handlers (mobile) ────────────────────────────────────

  const handlePointerDown = useCallback((e) => {
    // Track pointers for pinch detection
    if (e.pointerId) {
      pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    }
    if (pointers.current.size === 2) {
      // Two fingers down - start pinch zoom
      const pts = [...pointers.current.values()];
      const dx = pts[0].x - pts[1].x;
      const dy = pts[0].y - pts[1].y;
      initialDist.current = Math.sqrt(dx * dx + dy * dy);
      initialScale.current = transformRef.current.scale;
    }

    if (e.target.closest('.canvas-card')) return;
    if (e.target === viewportRef.current || e.target === worldRef.current) {
      setPicker(null);

      // Start a potential drag-select box. We don't commit to panning vs.
      // box-select until the pointer actually moves (see handlePointerMove),
      // so a plain click on empty canvas still clears selection as before.
      isBoxSelecting.current = true;
      boxAdditive.current = e.shiftKey || e.ctrlKey || e.metaKey;
      const rect = viewportRef.current.getBoundingClientRect();
      setSelectBox({
        startX: e.clientX - rect.left,
        startY: e.clientY - rect.top,
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
        w: 0,
        h: 0,
      });

      isPanning.current = true;
      lastPointer.current = { x: e.clientX, y: e.clientY };
      viewportRef.current.setPointerCapture(e.pointerId);
      viewportRef.current.style.cursor = 'grabbing';
    }
  }, []);

  const handlePointerMove = useCallback((e) => {
    // Update pointer positions for pinch detection
    if (pointers.current.has(e.pointerId)) {
      pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    }

    // Handle pinch zoom
    if (pointers.current.size === 2) {
      const pts = [...pointers.current.values()];
      const dx = pts[0].x - pts[1].x;
      const dy = pts[0].y - pts[1].y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (initialDist.current > 0) {
        const scaleFactor = dist / initialDist.current;
        const newScale = Math.min(3, Math.max(0.1, initialScale.current * scaleFactor));
        const t = transformRef.current;
        const newTransform = { ...t, scale: newScale };
        setTransform(newTransform);
        isInternalChange.current = true;
        onViewportChange(newTransform);
        lastExternalViewport.current = newTransform;
      }
      return;
    }

    if (isBoxSelecting.current) {
      const rect = viewportRef.current.getBoundingClientRect();
      const curX = e.clientX - rect.left;
      const curY = e.clientY - rect.top;

      setSelectBox((prev) => {
        if (!prev) return prev;
        const dx = curX - prev.startX;
        const dy = curY - prev.startY;
        // Once the drag exceeds the threshold, treat this as box-select
        // rather than a canvas pan.
        if (Math.abs(dx) > DRAG_SELECT_THRESHOLD || Math.abs(dy) > DRAG_SELECT_THRESHOLD) {
          isPanning.current = false;
        }
        return {
          ...prev,
          x: Math.min(prev.startX, curX),
          y: Math.min(prev.startY, curY),
          w: Math.abs(dx),
          h: Math.abs(dy),
        };
      });
    }

    if (isPanning.current && !isBoxSelecting.current) {
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
    } else if (isPanning.current && isBoxSelecting.current) {
      // Still ambiguous (under threshold) — track pointer so a real pan
      // after the threshold doesn't jump.
      lastPointer.current = { x: e.clientX, y: e.clientY };
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
  }, [onViewportChange]);

  const handlePointerUp = useCallback((e) => {
    // Clean up pointer tracking
    pointers.current.delete(e.pointerId);
    initialDist.current = 0;

    // Clear all drop highlights
    document.querySelectorAll('.drop-target-stack, .drop-target-folder').forEach((el) => {
      el.classList.remove('drop-target-stack', 'drop-target-folder');
    });

    const wasBoxSelecting = isBoxSelecting.current;
    const boxHadArea = selectBox && (selectBox.w > DRAG_SELECT_THRESHOLD || selectBox.h > DRAG_SELECT_THRESHOLD);

    if (wasBoxSelecting) {
      finishBoxSelect();
    }

    if (isPanning.current) {
      isPanning.current = false;
      if (viewportRef.current) viewportRef.current.style.cursor = 'grab';
      // A plain click (no box drag, no pan-with-area) on empty canvas clears
      // selection, matching the previous click-to-deselect behaviour.
      if (wasBoxSelecting && !boxHadArea && !boxAdditive.current) {
        onClearSelection();
      }
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
  }, [selectBox, finishBoxSelect, onViewportChange, onItemMove, onAddToStack, onAddToFolder, onClearSelection]);

  const finishBoxSelect = useCallback(() => {
    if (!selectBox || !worldRef.current) return;
    const { x, y, w, h } = selectBox;

    // Only commit a selection if the box actually has area — otherwise
    // this was just a click, which the existing clear-selection logic below
    // already handles.
    if (w > DRAG_SELECT_THRESHOLD || h > DRAG_SELECT_THRESHOLD) {
      const viewportRect = viewportRef.current.getBoundingClientRect();
      const boxScreen = {
        left: viewportRect.left + x,
        top: viewportRect.top + y,
        right: viewportRect.left + x + w,
        bottom: viewportRect.top + y + h,
      };

      const hitIds = [];
      worldRef.current.querySelectorAll('.canvas-card').forEach((el) => {
        const r = el.getBoundingClientRect();
        const overlaps = !(r.right < boxScreen.left || r.left > boxScreen.right || r.bottom < boxScreen.top || r.top > boxScreen.bottom);
        if (overlaps && el.dataset.id) hitIds.push(el.dataset.id);
      });

      if (hitIds.length > 0) {
        if (boxAdditive.current) {
          onSetSelection?.(new Set([...selectedIds, ...hitIds]));
        } else {
          onSetSelection?.(new Set(hitIds));
        }
      } else if (!boxAdditive.current) {
        onClearSelection();
      }
    }

    setSelectBox(null);
    isBoxSelecting.current = false;
  }, [selectBox, selectedIds, onSetSelection, onClearSelection]);

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
    await onCreateFolder?.([picker.draggedId, picker.targetId], 'Folder name', '');
    setPicker(null);
  }, [picker, onCreateFolder]);

  // ── Selection toolbar handlers ────────────────────────────────────────

  const selectedArray = [...selectedIds];
  const selectedColor = (() => {
    if (selectedArray.length !== 1) return null;
    const el = items.find((i) => i.id === selectedArray[0]);
    return el?.meta?.color || null;
  })();

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
            onContextMenu={onContextMenu}
            onOpenFolder={onOpenFolder}
          />
        ))}
      </div>

      {/* Drag-to-select rectangle */}
      {selectBox && (selectBox.w > 1 || selectBox.h > 1) && (
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            left: `${selectBox.x}px`,
            top: `${selectBox.y}px`,
            width: `${selectBox.w}px`,
            height: `${selectBox.h}px`,
            border: '1px solid rgba(255,255,255,0.45)',
            background: 'rgba(255,255,255,0.06)',
            borderRadius: '2px',
            pointerEvents: 'none',
            zIndex: 'var(--z-canvas-ui)',
          }}
        />
      )}

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

      <SelectionToolbar
        count={selectedIds.size}
        canStack={selectedIds.size > 1}
        canFolder={selectedIds.size > 1}
        canArrange={selectedIds.size > 1}
        activeColor={selectedColor}
        onColor={(hex) => onColorSelected?.(hex)}
        onStack={() => onCreateStack?.(selectedArray)}
        onFolder={() => onCreateFolder?.(selectedArray, 'Folder name', '')}
        onArrange={() => onArrangeSelected?.(selectedArray)}
        onCopyLink={() => onCopyLinkSelected?.()}
        onDelete={() => onDeleteSelected?.()}
        onClear={() => onClearSelection()}
      />
    </div>
  );
}