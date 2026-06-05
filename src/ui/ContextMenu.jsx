/**
 * LOOKING GLASS — Context Menu (Phase 5 / V2)
 *
 * Width: 180px, item height: 40px, h-padding: 16px
 * Glass: CONTEXT_GLASS_DARK / CONTEXT_GLASS_LIGHT
 * Structure: actions → divider → group/color dots → divider → archive/delete
 * Delete: --color-accent (only red item)
 * Color dots: 4px circles, 5 colors
 * Desktop: cursor-positioned | Mobile: bottom sheet
 */
import React, { useEffect, useRef, useCallback } from 'react';
import {
  ArrowSquareOut,
  PencilSimple,
  CopySimple,
  Brackets,
  Archive,
  Trash,
} from '@phosphor-icons/react';

const COLOR_DOTS = [
  '#D71921', // red
  '#F59E0B', // amber
  '#22C55E', // green
  '#3B82F6', // blue
  '#8B5CF6', // violet
];

const ACTIONS = [
  { id: 'open', label: 'OPEN', icon: ArrowSquareOut },
  { id: 'edit', label: 'EDIT', icon: PencilSimple },
  { id: 'copy-link', label: 'COPY LINK', icon: CopySimple },
];

export function ContextMenu({
  isOpen,
  x,
  y,
  onClose,
  onAction,
  position = 'desktop',
}) {
  const menuRef = useRef(null);

  // Close on outside click / Escape
  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (!isOpen) return;

    const handleOutsideClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose, handleKeyDown]);

  if (!isOpen) return null;

  // Mobile: render as bottom sheet trigger
  if (position === 'mobile') {
    return null; // Parent should use BottomSheet instead
  }

  // Clamp position to viewport
  const menuWidth = 180;
  const menuHeight = 320; // approximate
  const clampedX = Math.min(x, window.innerWidth - menuWidth - 8);
  const clampedY = Math.min(y, window.innerHeight - menuHeight - 8);

  return (
    <div
      ref={menuRef}
      className="context-menu glass-context-menu"
      style={{ left: clampedX, top: clampedY }}
      role="menu"
      aria-label="Context menu"
    >
      {/* Actions */}
      {ACTIONS.map((action) => {
        const Icon = action.icon;
        return (
          <button
            key={action.id}
            className="context-menu__item"
            role="menuitem"
            onClick={() => {
              if (onAction) onAction(action.id);
              onClose();
            }}
            type="button"
          >
            <Icon size={20} weight="regular" />
            <span>{action.label}</span>
          </button>
        );
      })}

      {/* Divider */}
      <div className="context-menu__divider" />

      {/* Group */}
      <button
        className="context-menu__item"
        role="menuitem"
        onClick={() => {
          if (onAction) onAction('group');
          onClose();
        }}
        type="button"
      >
        <Brackets size={20} weight="regular" />
        <span>GROUP</span>
      </button>

      {/* Color dots */}
      <div className="context-menu__colors" role="menuitem">
        <span>COLOR</span>
        <div className="context-menu__color-dots">
          {COLOR_DOTS.map((color, i) => (
            <button
              key={i}
              className="context-menu__color-dot"
              style={{ backgroundColor: color }}
              onClick={() => {
                if (onAction) onAction(`color-${i}`);
                onClose();
              }}
              type="button"
              aria-label={`Color ${i + 1}`}
            />
          ))}
        </div>
      </div>

      {/* Divider */}
      <div className="context-menu__divider" />

      {/* Archive */}
      <button
        className="context-menu__item"
        role="menuitem"
        onClick={() => {
          if (onAction) onAction('archive');
          onClose();
        }}
        type="button"
      >
        <Archive size={20} weight="regular" />
        <span>ARCHIVE</span>
      </button>

      {/* Delete */}
      <button
        className="context-menu__item context-menu__item--danger"
        role="menuitem"
        onClick={() => {
          if (onAction) onAction('delete');
          onClose();
        }}
        type="button"
      >
        <Trash size={20} weight="regular" />
        <span>DELETE</span>
      </button>
    </div>
  );
}
