/**
 * LOOKING GLASS — Canvas Component
 *
 * BUG FIXES applied:
 *   1. Canvas uses forwardRef to expose fitToContent() to App.
 *   2. Drag position reads CSS left/top from the DOM at drag-start, not item.x/y
 *      from React props — eliminates the mid-drag store-update divergence.
 *   3. Viewport sync: the wheel/pointer handler calls onViewportChange once on
 *      pointerUp, not on every frame — kills the setViewport→useEffect→setTransform
 *      feedback loop. The transform is applied directly via ref during interaction.
 *   4. Drop-target class cleanup moved to a helper called from BOTH pointermove
 *      end and pointerup (was only in pointerup — left stale classes on fast drops).
 *   5. Variable shadowing: `t` was used for both `transformRef.current` and a
 *      loop variable inside the drag handler. Renamed inner variable to `tgt`.
 *   6. FolderCard handleRename: replaced prompt() with an inline rename flow to
 *      avoid thread-blocking on mobile Safari.
 *   7. StackCard toggleFan: wrapped in stopPropagation at the card wrapper level
 *      so drag doesn't start when tapping the fan/collapse button.
 *   8. NoteCard saveTimeout: cleared on unmount to prevent calling onSave after
 *      the component is gone.
 */
import React, {
  useRef, useEffect, useState, useCallback, forwardRef, useImperativeHandle,
} from 'react';
import { createPortal }   from 'react-dom';
import { CanvasCard }     from '../components/CanvasCard.jsx';
import { DropModePicker } from '../components/DropModePicker.jsx';
import { ITEM_TYPES }     from '../data/schema.js';

export const Canvas = forwardRef(function Canvas(
  {
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
    onContextMenu,
  },
  ref
) {
  const viewportRef  = useRef(null);
  const worldRef     = useRef(null);
  const transformRef = useRef(viewport);  // always-current, never stale in rAF closures
  const isPanning    = useRef(false);
  const lastPointer  = useRef({ x: 0, y: 0 });
  const rafId        = useRef(null);
  const dragItem     = useRef(null);
  const dragStart    = useRef({ clientX: 0, clientY: 0, domLeft: 0, domTop: 0 });
  const hasMoved     = useRef(false);

  const [picker, setPicker] = useState(null);

  // ── Expose fitToContent via ref ──────────────────────────
  useImperativeHandle(ref, () => ({
    fitToContent() {
      if (!worldRef.current || !viewportRef.current) return;
      const cards = worldRef.current.querySelectorAll('.canvas-card');
      if (!cards.length) return;

      let minX =  Infinity, minY =  Infinity;
      let maxX = -Infinity, maxY = -Infinity;
      cards.forEach((el) => {
        const x = parseFloat(el.style.left) || 0;
        const y = parseFloat(el.style.top)  || 0;
        const w = el.offsetWidth  || 320;
        const h = el.offsetHeight || 200;
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x + w);
        maxY = Math.max(maxY, y + h);
      });

      const PADDING = 80;
      const vw = viewportRef.current.offsetWidth;
      const vh = viewportRef.current.offsetHeight;
      const cw = maxX - minX + PADDING * 2;
      const ch = maxY - minY + PADDING * 2;
      const scale = Math.min(3, Math.max(0.1, Math.min(vw / cw, vh / ch)));
      const x = -minX * scale + PADDING * scale + (vw - cw * scale) / 2;
      const y = -minY * scale + PADDING * scale + (vh - ch * scale) / 2;

      const t = { x, y, scale };
      transformRef.current = t;
      applyTransformDirect(t);
      onViewportChange(t);
    },
  }));

  // ── Apply transform directly to DOM (no re-render) ───────
  const applyTransformDirect = useCallback((t) => {
    if (worldRef.current) {
      worldRef.current.style.transform = `translate(${t.x}px,${t.y}px) scale(${t.scale})`;
    }
  }, []);

  // ── Sync incoming viewport (e.g. space switch) ───────────
  useEffect(() => {
    transformRef.current = viewport;
    applyTransformDirect(viewport);
  }, [viewport.x, viewport.y, viewport.scale, applyTransformDirect]);

  // ── Escape: dismiss picker ────────────────────────────────
  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') setPicker(null); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  // ── Non-passive wheel handler ─────────────────────────────
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const handler = (e) => {
      e.preventDefault();
      const delta    = e.deltaY > 0 ? 0.9 : 1.1;
      const t        = transformRef.current;
      const newScale = Math.min(3, Math.max(0.1, t.scale * delta));
      const rect     = el.getBoundingClientRect();
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;
      const next = {
        x:     cx - (cx - t.x) * (newScale / t.scale),
        y:     cy - (cy - t.y) * (newScale / t.scale),
        scale: newScale,
      };
      transformRef.current = next;
      applyTransformDirect(next);
      // Debounce the store write to avoid calling setViewport 60×/sec
      if (rafId.current) cancelAnimationFrame(rafId.current);
      rafId.current = requestAnimationFrame(() => onViewportChange(transformRef.current));
    };
    el.addEventListener('wheel', handler, { passive: false });
    return () => el.removeEventListener('wheel', handler);
  }, [onViewportChange, applyTransformDirect]);

  // ── Helpers ──────────────────────────────────────────────
  const clearDropHighlights = () => {
    document.querySelectorAll('.drop-target-stack, .drop-target-folder').forEach((el) => {
      el.classList.remove('drop-target-stack', 'drop-target-folder');
    });
  };

  // ── Panning ──────────────────────────────────────────────
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
      const dx = e.clientX - lastPointer.current.x;
      const dy = e.clientY - lastPointer.current.y;
      lastPointer.current = { x: e.clientX, y: e.clientY };

      if (rafId.current) cancelAnimationFrame(rafId.current);
      rafId.current = requestAnimationFrame(() => {
        const t    = transformRef.current;
        const next = { ...t, x: t.x + dx, y: t.y + dy };
        transformRef.current = next;
        applyTransformDirect(next);
      });
    }

    if (dragItem.current) {
      hasMoved.current = true;
      const clientX = e.clientX;
      const clientY = e.clientY;

      if (rafId.current) cancelAnimationFrame(rafId.current);
      rafId.current = requestAnimationFrame(() => {
        const t  = transformRef.current;
        const dx = (clientX - dragStart.current.clientX) / t.scale;
        const dy = (clientY - dragStart.current.clientY) / t.scale;
        dragItem.current.style.left = `${dragStart.current.domLeft + dx}px`;
        dragItem.current.style.top  = `${dragStart.current.domTop  + dy}px`;

        // Drop target highlight
        dragItem.current.style.pointerEvents = 'none';
        const el = document.elementFromPoint(clientX, clientY);
        dragItem.current.style.pointerEvents = '';

        clearDropHighlights();
        const tgt = el?.closest('.canvas-card');
        if (tgt && tgt !== dragItem.current) {
          const type = tgt.dataset.type;
          if      (type === ITEM_TYPES.FOLDER) tgt.classList.add('drop-target-folder');
          else if (type === ITEM_TYPES.STACK)  tgt.classList.add('drop-target-stack');
          else                                 tgt.classList.add('drop-target-folder');
        }
      });
    }
  }, [applyTransformDirect]);

  const handlePointerUp = useCallback((e) => {
    clearDropHighlights();

    if (isPanning.current) {
      isPanning.current = false;
      if (viewportRef.current) viewportRef.current.style.cursor = 'grab';
      // Commit final viewport to store once on release
      onViewportChange(transformRef.current);
    }

    if (dragItem.current && hasMoved.current) {
      const draggedId = dragItem.current.dataset.id;

      dragItem.current.style.zIndex     = dragItem.current.dataset.zIndex || 0;
      dragItem.current.style.cursor     = 'grab';
      dragItem.current.style.transition = '';

      dragItem.current.style.pointerEvents = 'none';
      const el = document.elementFromPoint(e.clientX, e.clientY);
      dragItem.current.style.pointerEvents = '';
      const tgt = el?.closest('.canvas-card');

      if (tgt && tgt !== dragItem.current) {
        const targetId   = tgt.dataset.id;
        const targetType = tgt.dataset.type;

        if (targetType === ITEM_TYPES.FOLDER) {
          onAddToFolder?.(draggedId, targetId);
        } else if (targetType === ITEM_TYPES.STACK) {
          onAddToStack?.(draggedId, targetId);
        } else {
          const rect = tgt.getBoundingClientRect();
          setPicker({ x: rect.left + rect.width / 2, y: rect.top, draggedId, targetId });
        }
        dragItem.current = null;
        hasMoved.current = false;
        return;
      }

      // Normal move — read final position from DOM
      const finalX = parseFloat(dragItem.current.style.left);
      const finalY = parseFloat(dragItem.current.style.top);
      onItemMove(draggedId, finalX, finalY);
    }

    dragItem.current = null;
    hasMoved.current = false;
  }, [onViewportChange, onItemMove, onAddToStack, onAddToFolder]);

  // ── Card drag start ──────────────────────────────────────
  /**
   * BUG FIX: read initial position from DOM element's current style.left/top,
   * NOT from item.x/y prop — avoids divergence if store updates mid-drag.
   */
  const handleCardDragStart = useCallback((e, itemId) => {
    if (
      e.target.closest('.card-note-editor') ||
      e.target.closest('a')                 ||
      e.target.closest('button')            ||
      e.target.closest('input')             ||
      e.target.closest('.folder-tab')       ||
      e.target.closest('.stack-hint')
    ) return;

    e.stopPropagation();
    const card = document.querySelector(`[data-id="${itemId}"]`);
    if (!card) return;

    dragItem.current  = card;
    hasMoved.current  = false;
    dragStart.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      // Read from the live DOM, not from React state
      domLeft: parseFloat(card.style.left) || 0,
      domTop:  parseFloat(card.style.top)  || 0,
    };
    card.style.zIndex     = 9999;
    card.style.cursor     = 'grabbing';
    card.style.transition = 'none';
  }, []);

  // ── Picker ───────────────────────────────────────────────
  const handlePickerStack = useCallback(async () => {
    if (!picker) return;
    await onCreateStack?.([picker.draggedId, picker.targetId]);
    setPicker(null);
  }, [picker, onCreateStack]);

  const handlePickerFolder = useCallback(async () => {
    if (!picker) return;
    // BUG FIX: avoid prompt() on mobile. Pass empty name — canvas rename handles it.
    await onCreateFolder?.([picker.draggedId, picker.targetId], 'Folder');
    setPicker(null);
  }, [picker, onCreateFolder]);

  return (
    <div
      ref={viewportRef}
      className="canvas-viewport"
      style={{
        flex:       1,
        position:   'relative',
        overflow:   'hidden',
        cursor:     'grab',
        touchAction: 'none',
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      <div
        ref={worldRef}
        id="canvas-world"
        style={{
          position:        'absolute',
          width:           '1px',
          height:          '1px',
          transformOrigin: '0 0',
          willChange:      'transform',
        }}
      >
        {items.map((item) => (
          <CanvasCard
            key={item.id}
            item={item}
            isSelected={selectedIds.has(item.id)}
            scale={transformRef.current.scale}
            onSelect={(multi) => onSelectItem(item.id, multi)}
            onDragStart={(e) => handleCardDragStart(e, item.id)}
            onSave={(updates) => onItemSave(item.id, updates)}
            onDelete={() => onItemDelete(item.id)}
            onLightbox={() => onLightbox(item)}
            onContextMenu={onContextMenu}
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
});