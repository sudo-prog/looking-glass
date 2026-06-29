/**
 * LOOKING GLASS — Top Toolbar
 * Floating bar over the canvas with zoom controls, search, and action buttons.
 */
import React, { useState } from 'react';
import {
  ArrowsOut,
  Download,
  Upload,
  Minus,
  ArrowUUpLeft,
  ArrowUUpRight,
  MagnifyingGlass,
  Plus,
  Trash,
  X,
} from '@phosphor-icons/react';

export function Toolbar({
  zoom,
  searchQuery,
  onAddNote,
  onDelete,
  onUndo,
  onRedo,
  onZoomIn,
  onZoomOut,
  onFit,
  onSearch,
  onSearchClear,
  onExport,
  onImport,
  canUndo,
  canRedo,
  selectedCount,
}) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [localQuery, setLocalQuery] = useState(searchQuery || '');

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (localQuery.trim()) {
      onSearch(localQuery.trim());
    }
  };

  const handleSearchClear = () => {
    setLocalQuery('');
    onSearchClear();
    setSearchOpen(false);
  };

  return (
    <div
      role="toolbar"
      aria-label="Canvas toolbar"
      style={{
        position: 'absolute',
        top: '12px',
        right: '12px',
        left: '12px',
        zIndex: 'var(--z-canvas-ui, 100)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
        flexWrap: 'wrap',
        gap: '4px',
        padding: '6px 10px',
        borderRadius: '14px',
        background: 'rgba(16,16,16,0.88)',
        backdropFilter: 'blur(20px) saturate(120%)',
        WebkitBackdropFilter: 'blur(20px) saturate(120%)',
        border: '1px solid rgba(255,255,255,0.08)',
        boxShadow: '0 8px 24px rgba(0,0,0,0.45)',
      }}
    >
      <style>{`
        .toolbar-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          border-radius: 8px;
          border: none;
          background: transparent;
          color: var(--text-primary, #e0e0e0);
          cursor: pointer;
          transition: background 0.12s ease;
          flex-shrink: 0;
          touch-action: manipulation;
        }
        .toolbar-btn:hover { background: rgba(255,255,255,0.08); }
        .toolbar-btn:disabled { opacity: 0.3; cursor: default; }
        .toolbar-btn:disabled:hover { background: transparent; }
        .toolbar-sep { width: 1px; height: 20px; background: rgba(255,255,255,0.12); margin: 0 2px; flex-shrink: 0; }
        .toolbar-zoom { font-family: var(--font-mono, monospace); font-size: 11px; color: var(--text-secondary, #999); min-width: 40px; text-align: center; flex-shrink: 0; }
        .toolbar-group { display: flex; align-items: center; gap: 2px; flex-shrink: 0; }

        /* Mobile: dock toolbar at bottom with adequate touch targets */
        @media (max-width: 767px) {
          .toolbar-btn { width: 44px; height: 44px; }
          .toolbar-btn svg { width: 20px; height: 20px; }
          .toolbar-zoom { display: none; }
          .toolbar-sep { display: none; }
          .toolbar-hide-mobile { display: none !important; }
          .toolbar-search-input { width: min(120px, 30vw) !important; }
          [role="toolbar"] {
            position: fixed !important;
            top: auto !important;
            bottom: 0 !important;
            left: 0 !important;
            right: 0 !important;
            padding: 8px 12px calc(8px + env(safe-area-inset-bottom)) !important;
            border-radius: 16px 16px 0 0 !important;
            justify-content: space-around !important;
            box-shadow: 0 -4px 24px rgba(0,0,0,0.5) !important;
            z-index: var(--z-toolbar, 100) !important;
          }
        }
        @media (max-width: 374px) {
          .toolbar-btn { width: 44px; height: 44px; }
          .toolbar-search-input { width: min(90px, 25vw) !important; }
          [role="toolbar"] { padding: 6px 8px calc(6px + env(safe-area-inset-bottom)) !important; }
        }
        @media (max-width: 320px) {
          .toolbar-btn { width: 40px; height: 40px; }
          [role="toolbar"] { padding: 4px 4px calc(4px + env(safe-area-inset-bottom)) !important; gap: 2px; }
        }
      `}</style>

      {/* Primary actions (always visible) */}
      <button className="toolbar-btn" title="Add note (N)" aria-label="Add note" onClick={onAddNote}>
        <Plus size={16} weight="regular" />
      </button>

      <button
        className="toolbar-btn toolbar-hide-mobile"
        title="Delete selected"
        aria-label="Delete selected"
        onClick={onDelete}
        disabled={selectedCount === 0}
      >
        <Trash size={16} weight="regular" />
      </button>

      <div className="toolbar-sep toolbar-hide-mobile" />

      {/* Undo / Redo */}
      <button className="toolbar-btn toolbar-hide-mobile" title="Undo (Ctrl+Z)" aria-label="Undo" onClick={onUndo} disabled={!canUndo}>
        <ArrowUUpLeft size={16} weight="regular" />
      </button>
      <button className="toolbar-btn toolbar-hide-mobile" title="Redo (Ctrl+Shift+Z)" aria-label="Redo" onClick={onRedo} disabled={!canRedo}>
        <ArrowUUpRight size={16} weight="regular" />
      </button>

      <div className="toolbar-sep" />

      {/* Zoom controls */}
      <button className="toolbar-btn" title="Zoom out" aria-label="Zoom out" onClick={onZoomOut}>
        <Minus size={14} weight="regular" />
      </button>
      <span className="toolbar-zoom">{Math.round((zoom || 1) * 100)}%</span>
      <button className="toolbar-btn" title="Zoom in" aria-label="Zoom in" onClick={onZoomIn}>
        <Plus size={14} weight="regular" />
      </button>
      <button className="toolbar-btn toolbar-hide-mobile" title="Fit to view" aria-label="Fit to view" onClick={onFit}>
        <ArrowsOut size={14} weight="regular" />
      </button>

      <div className="toolbar-sep toolbar-hide-mobile" />

      {/* Export / Import — hidden on very small, accessible via menu */}
      <button className="toolbar-btn toolbar-hide-mobile" title="Export" aria-label="Export" onClick={onExport}>
        <Download size={16} weight="regular" />
      </button>
      <button className="toolbar-btn toolbar-hide-mobile" title="Import" aria-label="Import" onClick={onImport}>
        <Upload size={16} weight="regular" />
      </button>

      <div className="toolbar-sep" />

      {/* Search toggle */}
      {searchOpen ? (
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <input
            type="text"
            value={localQuery}
            onChange={(e) => setLocalQuery(e.target.value)}
            placeholder="Search..."
            autoFocus
            className="toolbar-search-input"
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: '8px',
              padding: '4px 8px',
              fontSize: '12px',
              color: 'var(--text-primary, #e0e0e0)',
              outline: 'none',
              width: '140px',
              fontFamily: 'var(--font-ui)',
            }}
          />
          <button type="button" className="toolbar-btn" title="Clear search" aria-label="Clear search" onClick={handleSearchClear}>
            <X size={14} weight="regular" />
          </button>
        </form>
      ) : (
        <button
          className="toolbar-btn"
          title="Search (Ctrl+K)"
          aria-label="Search"
          onClick={() => setSearchOpen(true)}
        >
          <MagnifyingGlass size={16} weight="regular" />
        </button>
      )}
    </div>
  );
}

export default Toolbar;
