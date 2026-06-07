/**
 * LOOKING GLASS — Canvas Component (React)
 * Infinite canvas with pan/zoom using CSS transforms.
 * Supports drag-to-stack and drag-to-folder creation.
 */
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { BookmarkCard } from '../cards/BookmarkCard.tsx';
import { NoteCard } from '../cards/NoteCard.tsx';
import { ImageCard } from '../cards/ImageCard.tsx';
import { WebClipCard } from '../cards/WebClipCard.tsx';
import { GroupCard } from '../cards/GroupCard.tsx';
import { StackCard } from '../cards/StackCard.tsx';
import { FolderCard } from '../cards/FolderCard.tsx';
import { DropModePicker } from '../ui/DropModePicker.tsx';
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
  const worldRef = useRef(null);
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const isPanning = useRef(false);
  const lastPointer = useRef({ x: 0, y: 0 });
  const rafId = useRef(null);
  const dragItem = useRef(null);
  const dragItemId = useRef(null);
  const dragStart = useRef({ x: 0, y: 0, itemX: 0, itemY: 0 });
  const [dropPicker, setDropPicker] = useState(null);

  useEffect(() => { setTransform(viewport); }, [viewport.x, viewport.y, viewport.scale]);

  const applyTransform = useCallback((t) => {
    if (worldRef.current) {
      worldRef.current.style.transform = `translate(${t.x}px, ${t.y}px) scale(${t.scale})`;
    }
  }, []);

  useEffect(() => { applyTransform(transform); }, [transform, applyTransform]);

  // Hit-test: find card under the dragged element
  const hitTestCardUnderneath = useCallback((draggedEl, clientX, clientY) => {
    draggedEl.style.visibility = 'hidden';
    const elemBelow = document.elementFromPoint(clientX, clientY);
    draggedEl.style.visibility = '';
    if (!elemBelow) return null;
    const targetCard = elemBelow.closest('.canvas-card');
    if (!targetCard) return null;
    const targetId = targetCard.dataset.id;
    if (!targetId || targetId === dragItemId.current) return null;
    return items.find((i) => i.id === targetId) || null;
  }, [items]);

  const showDropPicker = useCallback((targetItem) => {
    const cardEl = document.querySelector(`[data-id="${targetItem.id}"]`);
    if (!cardEl) return;
    const rect = cardEl.getBoundingClientRect();
    setDropPicker({
      x: rect.left + rect.width / 2 - 80,
      y: rect.top - 50,
      targetItem,
    });
  }, []);

  const closeDropPicker = useCallback(() => { setDropPicker(null); }, []);

  const handlePickerStack = useCallback(() => {
    if (!dropPicker) return;
    const { targetItem } = dropPicker;
    closeDropPicker();
    if (dragItemId.current) {
      onCreateStack([targetItem.id, dragItemId.current]);
    }
  }, [dropPicker, closeDropPicker, onCreateStack]);

  const handlePickerFolder = useCallback(() => {
    if (!dropPicker) return;
    const { targetItem } = dropPicker;
    closeDropPicker();
    if (dragItemId.current) {
      onCreateFolder('New Folder', [targetItem.id, dragItemId.current]);
    }
  }, [dropPicker, closeDropPicker, onCreateFolder]);

  const handlePointerDown = useCallback((e) => {
    if (e.target.closest('.canvas-card')) return;
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
        lastPointer.current = { x: e.clientX, y: e.clientY };
        setTransform((prev) => ({ ...prev, x: prev.x + dx, y: prev.y + dy }));
      });
    }
    if (dragItem.current) {
      if (rafId.current) cancelAnimationFrame(rafId.current);
      rafId.current = requestAnimationFrame(() => {
        const dx = (e.clientX - dragStart.current.x) / transform.scale;
        const dy = (e.clientY - dragStart.current.y) / transform.scale;
        dragItem.current.style.left = `${dragStart.current.itemX + dx}px`;
        dragItem.current.style.top = `${dragStart.current.itemY + dy}px`;
      });
    }
  }, [transform.scale]);

  const handlePointerUp = useCallback((e) => {
    if (isPanning.current) {
      isPanning.current = false;
      if (viewportRef.current) viewportRef.current.style.cursor = 'grab';
      onViewportChange(transform);
    }

    if (dragItem.current) {
      const finalX = parseFloat(dragItem.current.style.left);
      const finalY = parseFloat(dragItem.current.style.top);
      const itemId = dragItem.current.dataset.id;
      const draggedEl = dragItem.current;

      // Hit-test for drop target
      if (e && e.clientX !== undefined) {
        const targetItem = hitTestCardUnderneath(draggedEl, e.clientX, e.clientY);
        if (targetItem) {
          if (targetItem.type === ITEM_TYPES.STACK) {
            onAddToStack(targetItem.id, itemId);
          } else if (targetItem.type === ITEM_TYPES.FOLDER) {
            onAddToFolder(targetItem.id, itemId);
          } else {
            // Regular card — show picker
            dragItem.current = null;
            dragItemId.current = null;
            onItemMove(itemId, finalX, finalY);
            showDropPicker(targetItem);
            return;
          }
        }
      }

      onItemMove(itemId, finalX, finalY);
      dragItem.current = null;
      dragItemId.current = null;
    }
  }, [transform, onViewportChange, onItemMove, hitTestCardUnderneath, onAddToStack, onAddToFolder, showDropPicker]);

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

  const handleCardDragStart = useCallback((e, itemId, itemX, itemY) => {
    if (e.target.closest('.card-note-editor') || e.target.closest('a') ||
        e.target.closest('button') || e.target.closest('input') ||
        e.target.closest('.folder-tab') || e.target.closest('.stack-hint')) return;
    e.stopPropagation();
    const card = document.querySelector(`[data-id="${itemId}"]`);
    if (card) {
      dragItem.current = card;
      dragItemId.current = itemId;
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
        {items.map((item) => {
          const cardProps = {
            item,
            isSelected: selectedIds.has(item.id),
            onSelect: (multi) => onSelectItem(item.id, multi),
            onDragStart: (e) => handleCardDragStart(e, item.id, item.x, item.y),
            onSave: (updates) => onItemSave(item.id, updates),
            onDelete: () => onItemDelete(item.id),
            onLightbox: () => onLightbox(item),
            allItems: items,
          };
          switch (item.type) {
            case ITEM_TYPES.BOOKMARK: return <BookmarkCard key={item.id} {...cardProps} />;
            case ITEM_TYPES.NOTE: return <NoteCard key={item.id} {...cardProps} />;
            case ITEM_TYPES.IMAGE: return <ImageCard key={item.id} {...cardProps} />;
            case ITEM_TYPES.WEB_CLIP: return <WebClipCard key={item.id} {...cardProps} />;
            case ITEM_TYPES.GROUP: return <GroupCard key={item.id} {...cardProps} childCount={0} />;
            case ITEM_TYPES.STACK: return <StackCard key={item.id} {...cardProps} />;
            case ITEM_TYPES.FOLDER: return (
              <FolderCard key={item.id} {...cardProps}
                onToggleOpen={onToggleFolderOpen}
                onRename={onRenameFolder}
              />
            );
            default: return <BookmarkCard key={item.id} {...cardProps} />;
          }
        })}
      </div>

      {dropPicker && (
        <DropModePicker
          position={{ x: dropPicker.x, y: dropPicker.y }}
          onChooseStack={handlePickerStack}
          onChooseFolder={handlePickerFolder}
          onCancel={closeDropPicker}
        />
      )}
    </div>
  );
}
