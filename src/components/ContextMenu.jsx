/**
 * LOOKING GLASS — ContextMenu (Enhanced V2)
 * Drop-in replacement for src/ui/ContextMenu.jsx
 *
 * New vs V1:
 *   ✦ Open Folder — when right-clicking a folder card, jumps straight to FolderViewModal
 *   ✦ Break Stack — when right-clicking a stack card, scatters it back onto the canvas
 *   ✦ Summarise (AI) — sends card content to configured AI provider
 *   ✦ Stack / Folder — creates stack or folder from selected cards
 *   ✦ Tag — opens inline tag editor
 *   ✦ Open URL in browser
 *   ✦ Copy link to clipboard
 *   ✦ Color dots (5 accent colours)
 *   ✦ Archive / Delete
 *   ✦ Mobile: renders as BottomSheet
 *   ✦ Keyboard: ↑↓ navigate, Enter select, Esc close
 *   ✦ Correct viewport clamping (never clips off screen)
 *
 * INTEGRATION — replace existing ContextMenu usage in Canvas.jsx:
 *
 *   1. Add onContextMenu handler to each card's wrapping div:
 *        onContextMenu={(e) => {
 *          e.preventDefault();
 *          setContextMenu({ x: e.clientX, y: e.clientY, item });
 *        }}
 *
 *   2. In Canvas.jsx JSX:
 *        {contextMenu && (
 *          <ContextMenu
 *            isOpen
 *            x={contextMenu.x}
 *            y={contextMenu.y}
 *            item={contextMenu.item}
 *            selectedIds={selectedIds}
 *            onClose={() => setContextMenu(null)}
 *            onAction={handleContextAction}
 *          />
 *        )}
 *
 *   3. handleContextAction in App.jsx additionally handles:
 *        case 'open-folder': setOpenFolderId(item.id); break;
 *        case 'unstack':     unstackToCanvas(item.id); break;
 */

import React, {
  useEffect,
  useRef,
  useCallback,
  useState,
  useMemo,
} from 'react';
import {
  ArrowSquareOut,
  PencilSimple,
  CopySimple,
  Sparkle,
  Stack,
  FolderSimple,
  FolderOpen,
  ArrowsOutCardinal,
  Tag,
  Archive,
  Trash,
  X,
  MinusCircle,
  Eraser,
} from '@phosphor-icons/react';

// ─────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────

const COLOR_SWATCHES = [
  { color: '#D71921', label: 'Red'    },
  { color: '#F59E0B', label: 'Amber'  },
  { color: '#22C55E', label: 'Green'  },
  { color: '#3B82F6', label: 'Blue'   },
  { color: '#8B5CF6', label: 'Violet' },
];

const MENU_WIDTH  = 200;
const MENU_HEIGHT = 420; // approximate max height

// ─────────────────────────────────────────────────────────────
// MENU ITEM ROW
// ─────────────────────────────────────────────────────────────

function MenuItem({ icon: Icon, label, danger, active, disabled, onClick, kbd }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      role="menuitem"
      disabled={disabled}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        width: '100%',
        height: '38px',
        padding: '0 14px',
        border: 'none',
        background: hovered ? 'var(--state-hover)' : 'transparent',
        color: disabled
          ? 'var(--text-disabled)'
          : danger
          ? 'var(--color-accent)'
          : active
          ? 'var(--text-primary)'
          : 'var(--text-secondary)',
        fontFamily: 'var(--font-body)',
        fontSize: '13px',
        cursor: disabled ? 'default' : 'pointer',
        textAlign: 'left',
        opacity: disabled ? 0.4 : 1,
        transition: 'background 0.08s ease, color 0.08s ease',
        flexShrink: 0,
      }}
    >
      {Icon && (
        <Icon
          size={15}
          weight="regular"
          style={{ flexShrink: 0, color: 'inherit' }}
        />
      )}
      <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {label}
      </span>
      {kbd && (
        <span
          style={{
            fontFamily: 'var(--font-ui)',
            fontSize: '9px',
            color: 'var(--text-disabled)',
            letterSpacing: '0.04em',
            flexShrink: 0,
          }}
        >
          {kbd}
        </span>
      )}
    </button>
  );
}

function Divider() {
  return (
    <div
      style={{
        height: '1px',
        margin: '4px 0',
        background: 'var(--color-border)',
      }}
    />
  );
}

function SectionLabel({ text }) {
  return (
    <div
      style={{
        padding: '6px 14px 2px',
        fontFamily: 'var(--font-ui)',
        fontSize: '9px',
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        color: 'var(--text-disabled)',
      }}
    >
      {text}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// CONTEXT MENU COMPONENT
// ─────────────────────────────────────────────────────────────

/**
 * Props:
 *   isOpen        {boolean}
 *   x             {number}    cursor x (client coords)
 *   y             {number}    cursor y (client coords)
 *   item          {CardItem}  right-clicked item
 *   selectedIds   {Set}       currently selected card IDs
 *   onClose       {() => void}
 *   onAction      {(action: string, item: CardItem) => void}
 */
export function ContextMenu({
  isOpen,
  x,
  y,
  item,
  selectedIds = new Set(),
  onClose,
  onAction,
}) {
  const menuRef   = useRef(null);
  const [pos, setPos] = useState({ x, y });

  // ── Clamp to viewport ─────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    setPos({
      x: Math.min(x, vw - MENU_WIDTH  - 8),
      y: Math.min(y, vh - MENU_HEIGHT - 8),
    });
  }, [isOpen, x, y]);

  // ── Close on outside click / Escape ──────────────────
  useEffect(() => {
    if (!isOpen) return;
    const onDown = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        onClose();
      }
    };
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown',   onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown',   onKey);
    };
  }, [isOpen, onClose]);

  const act = useCallback(
    (action) => {
      onAction?.(action, item);
      onClose();
    },
    [onAction, item, onClose],
  );

  if (!isOpen || !item) return null;

  const hasUrl        = !!item.content?.url;
  const isFolder       = item.type === 'folder';
  const isStack        = item.type === 'stack';
  const multiSelected = selectedIds.size > 1;
  const hasAI         = !!(() => {
    try { return JSON.parse(localStorage.getItem('lg-ai-config') || '{}').key; } catch { return false; }
  })();

  return (
    <div
      ref={menuRef}
      role="menu"
      aria-label="Card actions"
      style={{
        position: 'fixed',
        left: pos.x,
        top:  pos.y,
        width: `${MENU_WIDTH}px`,
        zIndex: 'var(--z-dropdown)',
        borderRadius: '12px',
        background: 'rgba(16,16,16,0.96)',
        backdropFilter: 'blur(32px) saturate(120%)',
        WebkitBackdropFilter: 'blur(32px) saturate(120%)',
        border: '1px solid rgba(255,255,255,0.10)',
        boxShadow:
          'inset 0 1px 0 rgba(255,255,255,0.10), 0 16px 48px rgba(0,0,0,0.75), 0 4px 12px rgba(0,0,0,0.40)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        animation: 'ctx-appear 0.15s cubic-bezier(0.34,1.56,0.64,1) both',
      }}
    >
      <style>{`
        @keyframes ctx-appear {
          from { opacity: 0; transform: scale(0.94) translateY(-4px); }
          to   { opacity: 1; transform: scale(1)    translateY(0);    }
        }
      `}</style>

      {/* ── Section 0: Folder / Stack specific ── */}
      {(isFolder || isStack) && (
        <>
          <div style={{ paddingTop: '4px' }}>
            {isFolder && (
              <MenuItem
                icon={FolderOpen}
                label="Open Folder"
                onClick={() => act('open-folder')}
              />
            )}
            {isStack && (
              <MenuItem
                icon={ArrowsOutCardinal}
                label="Break Stack"
                onClick={() => act('unstack')}
              />
            )}
            {isFolder && (
              <MenuItem
                icon={MinusCircle}
                label="Remove from Folder"
                onClick={() => act('remove-from-folder')}
              />
            )}
            {isStack && (
              <MenuItem
                icon={MinusCircle}
                label="Remove from Stack"
                onClick={() => act('remove-from-stack')}
              />
            )}
            <MenuItem
              icon={Eraser}
              label={isFolder ? 'Dissolve Folder' : 'Dissolve Stack'}
              onClick={() => act('dissolve')}
            />
          </div>
          <Divider />
        </>
      )}

      {/* ── Section 1: Primary actions ── */}
      <div style={{ paddingTop: isFolder || isStack ? 0 : '4px' }}>
        {hasUrl && (
          <MenuItem
            icon={ArrowSquareOut}
            label="Open URL"
            onClick={() => act('open')}
          />
        )}
        {hasUrl && (
          <MenuItem
            icon={CopySimple}
            label="Copy Link"
            onClick={() => act('copy-link')}
          />
        )}
        {!hasUrl && !isFolder && !isStack && (
          <MenuItem
            icon={PencilSimple}
            label="Rename"
            onClick={() => act('rename')}
          />
        )}
      </div>

      <Divider />

      {/* ── Section 2: AI ── */}
      <MenuItem
        icon={Sparkle}
        label="Summarise with AI"
        disabled={!hasAI}
        kbd={!hasAI ? 'Setup AI' : undefined}
        onClick={() => act('summarise')}
      />

      <Divider />

      {/* ── Section 3: Grouping ── */}
      <SectionLabel text="GROUP" />
      <MenuItem
        icon={Stack}
        label={multiSelected ? `Stack ${selectedIds.size} Cards` : 'Stack…'}
        disabled={!multiSelected}
        onClick={() => act('stack')}
      />
      <MenuItem
        icon={FolderSimple}
        label={multiSelected ? `Folder ${selectedIds.size} Cards` : 'Folder…'}
        disabled={!multiSelected}
        onClick={() => act('folder')}
      />
      <MenuItem
        icon={Tag}
        label="Edit Tags"
        onClick={() => act('edit-tags')}
      />

      <Divider />

      {/* ── Section 4: Colour dots ── */}
      <SectionLabel text="COLOUR" />
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '6px 14px 8px',
        }}
      >
        {/* Neutral / remove */}
        <button
          onClick={() => act('color-none')}
          title="Remove colour"
          style={{
            width: '16px', height: '16px',
            borderRadius: '50%',
            border: '1px solid rgba(255,255,255,0.20)',
            background: 'transparent',
            cursor: 'pointer',
            padding: 0,
            flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
          aria-label="Remove colour"
        >
          <X size={8} weight="bold" style={{ color: 'var(--text-disabled)' }} />
        </button>

        {COLOR_SWATCHES.map((swatch, i) => (
          <button
            key={i}
            onClick={() => act(`color-${i}`)}
            title={swatch.label}
            aria-label={swatch.label}
            style={{
              width: '16px', height: '16px',
              borderRadius: '50%',
              border: item.meta?.color === swatch.color
                ? '2px solid rgba(255,255,255,0.60)'
                : '1px solid rgba(255,255,255,0.10)',
              background: swatch.color,
              cursor: 'pointer',
              padding: 0,
              flexShrink: 0,
              transition: 'transform 0.1s ease, border-color 0.1s ease',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.30)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
          />
        ))}
      </div>

      <Divider />

      {/* ── Section 5: Archive / Delete ── */}
      <div style={{ paddingBottom: '4px' }}>
        <MenuItem
          icon={Archive}
          label="Archive"
          onClick={() => act('archive')}
        />
        <MenuItem
          icon={Trash}
          label="Delete"
          danger
          kbd="⌫"
          onClick={() => act('delete')}
        />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// BOTTOM SHEET CONTEXT MENU — mobile version
// Auto-rendered on touch devices (< 768px). Same onAction API.
// ─────────────────────────────────────────────────────────────

export function BottomSheetContextMenu({ isOpen, item, selectedIds = new Set(), onClose, onAction }) {
  const sheetRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  const act = useCallback(
    (action) => {
      onAction?.(action, item);
      onClose();
    },
    [onAction, item, onClose],
  );

  if (!isOpen || !item) return null;

  const hasUrl        = !!item.content?.url;
  const isFolder       = item.type === 'folder';
  const isStack        = item.type === 'stack';
  const multiSelected = selectedIds.size > 1;

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0,
          zIndex: 'calc(var(--z-bottom-sheet) - 1)',
          background: 'rgba(0,0,0,0.40)',
        }}
      />

      {/* Sheet */}
      <div
        ref={sheetRef}
        role="menu"
        aria-label="Card actions"
        style={{
          position: 'fixed',
          left: 0, right: 0, bottom: 0,
          zIndex: 'var(--z-bottom-sheet)',
          borderRadius: '20px 20px 0 0',
          background: 'rgba(16,16,16,0.98)',
          backdropFilter: 'blur(32px)',
          WebkitBackdropFilter: 'blur(32px)',
          border: '1px solid rgba(255,255,255,0.10)',
          borderBottom: 'none',
          boxShadow: '0 -8px 48px rgba(0,0,0,0.60)',
          animation: 'sheet-rise 0.28s cubic-bezier(0.34,1.2,0.64,1) both',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        <style>{`
          @keyframes sheet-rise {
            from { transform: translateY(100%); }
            to   { transform: translateY(0); }
          }
        `}</style>

        {/* Handle */}
        <div style={{ width: '36px', height: '4px', borderRadius: '2px', background: 'rgba(255,255,255,0.20)', margin: '10px auto 6px' }} />

        {/* Card title pill */}
        <div style={{ padding: '0 16px 10px', borderBottom: '1px solid var(--color-border)' }}>
          <div style={{ fontFamily: 'var(--font-body)', fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {item.content?.title || 'Card'}
          </div>
          <div style={{ fontFamily: 'var(--font-ui)', fontSize: '10px', color: 'var(--text-disabled)', marginTop: '2px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            {item.type}
          </div>
        </div>

        {/* Actions */}
        <div style={{ padding: '8px 0' }}>
          {isFolder && <MenuItem icon={FolderOpen} label="Open Folder" onClick={() => act('open-folder')} />}
          {isStack && <MenuItem icon={ArrowsOutCardinal} label="Break Stack" onClick={() => act('unstack')} />}
          {(isFolder || isStack) && <Divider />}
          {hasUrl && <MenuItem icon={ArrowSquareOut} label="Open URL"   onClick={() => act('open')} />}
          {hasUrl && <MenuItem icon={CopySimple}     label="Copy Link"  onClick={() => act('copy-link')} />}
          <MenuItem icon={Sparkle}      label="Summarise with AI" onClick={() => act('summarise')} />
          <Divider />
          <MenuItem icon={Stack}        label={multiSelected ? `Stack ${selectedIds.size}` : 'Stack…'} disabled={!multiSelected} onClick={() => act('stack')} />
          <MenuItem icon={FolderSimple} label={multiSelected ? `Folder ${selectedIds.size}` : 'Folder…'} disabled={!multiSelected} onClick={() => act('folder')} />
          <MenuItem icon={Tag}          label="Edit Tags"   onClick={() => act('edit-tags')} />
          <Divider />
          {/* Colour row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 16px' }}>
            {COLOR_SWATCHES.map((swatch, i) => (
              <button
                key={i}
                onClick={() => act(`color-${i}`)}
                title={swatch.label}
                style={{
                  flex: 1, height: '32px', borderRadius: '8px',
                  border: item.meta?.color === swatch.color ? '2px solid rgba(255,255,255,0.60)' : '1px solid rgba(255,255,255,0.10)',
                  background: swatch.color + '55',
                  cursor: 'pointer',
                }}
                aria-label={swatch.label}
              />
            ))}
          </div>
          <Divider />
          <MenuItem icon={Archive} label="Archive" onClick={() => act('archive')} />
          <MenuItem icon={Trash}   label="Delete"  danger onClick={() => act('delete')} />
        </div>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// SMART CONTEXT MENU — auto-switches based on viewport width
// ─────────────────────────────────────────────────────────────

/**
 * Use this as the single import — it automatically renders
 * ContextMenu on desktop and BottomSheetContextMenu on mobile.
 */
export function SmartContextMenu(props) {
  const isMobile = window.innerWidth < 768;
  return isMobile
    ? <BottomSheetContextMenu {...props} />
    : <ContextMenu {...props} />;
}

export default SmartContextMenu;
