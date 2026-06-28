/**
 * LOOKING GLASS — Selection Toolbar
 * Floating glass pill that appears above the canvas whenever 1+ cards are
 * selected. Matches the reference capture (STACK_BIG_TO_SMALL.mp4): a
 * dark capsule, centered, that surfaces the actions relevant to the
 * current selection — color tag, stack, folder, copy link, delete.
 *
 * Mount once in Canvas.jsx / App.jsx:
 *   <SelectionToolbar
 *     count={selectedIds.size}
 *     canStack={selectedIds.size > 1}
 *     canFolder={selectedIds.size > 1}
 *     onColor={(hex) => ...}
 *     onStack={() => createStack([...selectedIds])}
 *     onFolder={() => createFolder([...selectedIds])}
 *     onCopyLink={() => ...}
 *     onDelete={() => deleteSelected()}
 *     onClear={() => clearSelection()}
 *   />
 */
import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  Tag,
  Stack,
  FolderSimple,
  LinkSimple,
  Trash,
  X,
  SquaresFour,
} from '@phosphor-icons/react';

const COLOR_SWATCHES = [
  { color: '#D71921', label: 'Red' },
  { color: '#F59E0B', label: 'Amber' },
  { color: '#22C55E', label: 'Green' },
  { color: '#3B82F6', label: 'Blue' },
  { color: '#8B5CF6', label: 'Violet' },
];

function ToolbarIconButton({ icon: Icon, label, onClick, disabled, danger, active }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '36px',
        height: '36px',
        borderRadius: '10px',
        border: 'none',
        background: active
          ? 'rgba(255,255,255,0.14)'
          : hovered && !disabled
          ? 'var(--state-hover)'
          : 'transparent',
        color: disabled
          ? 'var(--text-disabled)'
          : danger
          ? 'var(--color-accent)'
          : 'var(--text-primary)',
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.35 : 1,
        transition: 'background 0.12s ease, transform 0.1s ease',
        flexShrink: 0,
      }}
    >
      <Icon size={17} weight="regular" />
    </button>
  );
}

export function SelectionToolbar({
  count = 0,
  canStack = false,
  canFolder = false,
  canArrange = false,
  activeColor = null,
  onColor,
  onStack,
  onFolder,
  onArrange,
  onCopyLink,
  onDelete,
  onClear,
}) {
  const [colorPickerOpen, setColorPickerOpen] = useState(false);
  const pickerRef = useRef(null);

  useEffect(() => {
    if (!colorPickerOpen) return;
    const handler = (e) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) {
        setColorPickerOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [colorPickerOpen]);

  const handlePickColor = useCallback(
    (hex) => {
      onColor?.(hex);
      setColorPickerOpen(false);
    },
    [onColor],
  );

  if (count === 0) return null;

  return (
    <div
      role="toolbar"
      aria-label="Selection actions"
      style={{
        position: 'absolute',
        bottom: '28px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 'var(--z-canvas-ui)',
        display: 'flex',
        alignItems: 'center',
        gap: '2px',
        padding: '6px',
        borderRadius: '16px',
        background: 'rgba(16,16,16,0.94)',
        backdropFilter: 'blur(28px) saturate(120%)',
        WebkitBackdropFilter: 'blur(28px) saturate(120%)',
        border: '1px solid rgba(255,255,255,0.10)',
        boxShadow:
          'inset 0 1px 0 rgba(255,255,255,0.10), 0 16px 48px rgba(0,0,0,0.65), 0 4px 12px rgba(0,0,0,0.40)',
        animation: 'sel-toolbar-in 0.18s cubic-bezier(0.34,1.56,0.64,1) both',
      }}
    >
      <style>{`
        @keyframes sel-toolbar-in {
          from { opacity: 0; transform: translateX(-50%) translateY(8px) scale(0.95); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0)    scale(1); }
        }
      `}</style>

      {/* Count badge */}
      <span
        style={{
          fontFamily: 'var(--font-ui)',
          fontSize: '10px',
          letterSpacing: '0.06em',
          color: 'var(--text-secondary)',
          padding: '0 10px',
          minWidth: '20px',
          textAlign: 'center',
          flexShrink: 0,
        }}
      >
        {count}
      </span>

      <div style={{ width: '1px', height: '20px', background: 'var(--color-border)', flexShrink: 0 }} />

      {/* Color tag */}
      <div ref={pickerRef} style={{ position: 'relative' }}>
        <ToolbarIconButton
          icon={Tag}
          label="Tag color"
          active={colorPickerOpen}
          onClick={() => setColorPickerOpen((v) => !v)}
        />
        {colorPickerOpen && (
          <div
            style={{
              position: 'absolute',
              bottom: '46px',
              left: '50%',
              transform: 'translateX(-50%)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 10px',
              borderRadius: '12px',
              background: 'rgba(16,16,16,0.96)',
              border: '1px solid rgba(255,255,255,0.10)',
              boxShadow: '0 12px 32px rgba(0,0,0,0.60)',
              animation: 'sel-toolbar-in 0.15s cubic-bezier(0.34,1.56,0.64,1) both',
            }}
          >
            <button
              onClick={() => handlePickColor(null)}
              title="Remove color"
              aria-label="Remove color"
              style={{
                width: '16px',
                height: '16px',
                borderRadius: '50%',
                border: '1px solid rgba(255,255,255,0.25)',
                background: 'transparent',
                cursor: 'pointer',
                padding: 0,
                flexShrink: 0,
              }}
            />
            {COLOR_SWATCHES.map((swatch) => (
              <button
                key={swatch.color}
                onClick={() => handlePickColor(swatch.color)}
                title={swatch.label}
                aria-label={swatch.label}
                style={{
                  width: '16px',
                  height: '16px',
                  borderRadius: '50%',
                  border: activeColor === swatch.color
                    ? '2px solid rgba(255,255,255,0.70)'
                    : '1px solid rgba(255,255,255,0.12)',
                  background: swatch.color,
                  cursor: 'pointer',
                  padding: 0,
                  flexShrink: 0,
                  transition: 'transform 0.1s ease',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.25)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
              />
            ))}
          </div>
        )}
      </div>

      <ToolbarIconButton icon={LinkSimple} label="Copy link" onClick={onCopyLink} />
      <ToolbarIconButton icon={SquaresFour} label="Arrange in grid" disabled={!canArrange} onClick={onArrange} />
      <ToolbarIconButton icon={Stack} label="Stack" disabled={!canStack} onClick={onStack} />
      <ToolbarIconButton icon={FolderSimple} label="Group into folder" disabled={!canFolder} onClick={onFolder} />

      <div style={{ width: '1px', height: '20px', background: 'var(--color-border)', flexShrink: 0 }} />

      <ToolbarIconButton icon={Trash} label="Delete" danger onClick={onDelete} />

      <ToolbarIconButton icon={X} label="Clear selection" onClick={onClear} />
    </div>
  );
}

export default SelectionToolbar;
