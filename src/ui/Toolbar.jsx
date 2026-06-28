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
        zIndex: 'var(--z-canvas-ui, 100)',
        display: 'flex',
        alignItems: 'center',
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
        }
        .toolbar-btn:hover { background: rgba(255,255,255,0.08); }
        .toolbar-btn:disabled { opacity: 0.3; cursor: default; }
        .toolbar-btn:disabled:hover { background: transparent; }
        .toolbar-sep { width: 1px; height: 20px; background: rgba(255,255,255,0.12); margin: 0 2px; }
        .toolbar-zoom { font-family: var(--font-mono, monospace); font-size: 11px; color: var(--text-secondary, #999); min-width: 40px; text-align: center; }
      `}</style>

      {/* Add note */}
      <button className="toolbar-btn" title="Add note (N)" aria-label="Add note" onClick={onAddNote}>
        <Plus size={16} weight="regular" />
      </button>

      {/* Delete selected */}
      <button
        className="toolbar-btn"
        title="Delete selected"
        aria-label="Delete selected"
        onClick={onDelete}
        disabled={selectedCount === 0}
      >
        <Trash size={16} weight="regular" />
      </button>

      <div className="toolbar-sep" />

      {/* Undo / Redo */}
      <button className="toolbar-btn" title="Undo (Ctrl+Z)" aria-label="Undo" onClick={onUndo} disabled={!canUndo}>
        <ArrowUUpLeft size={16} weight="regular" />
      </button>
      <button className="toolbar-btn" title="Redo (Ctrl+Shift+Z)" aria-label="Redo" onClick={onRedo} disabled={!canRedo}>
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
      <button className="toolbar-btn" title="Fit to view" aria-label="Fit to view" onClick={onFit}>
        <ArrowsOut size={14} weight="regular" />
      </button>

      <div className="toolbar-sep" />

      {/* Export / Import */}
      <button className="toolbar-btn" title="Export" aria-label="Export" onClick={onExport}>
        <Download size={16} weight="regular" />
      </button>
      <button className="toolbar-btn" title="Import" aria-label="Import" onClick={onImport}>
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
