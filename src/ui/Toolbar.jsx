/**
 * LOOKING GLASS — Toolbar Component (Phase 5 / V2)
 *
 * Desktop: left rail, 64px wide, icon+label vertical layout.
 * Mobile: bottom bar, 56px + safe-area-inset-bottom.
 *
 * Glass: TOOLBAR_GLASS_DARK / TOOLBAR_GLASS_LIGHT
 * Icons: Phosphor outline weight only.
 * Labels: Space Mono 9px ALL CAPS, 4px gap below icon, hidden < 375px.
 */
import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  SquaresFour,
  Plus,
  Command,
  GearSix,
  MagnifyingGlass,
  CornersOut,
  Export,
  DownloadSimple,
  ArrowCounterClockwise,
  ArrowClockwise,
  Trash,
  X,
} from '@phosphor-icons/react';

/**
 * Single toolbar action button (icon + label).
 */
function ToolbarButton({ icon: Icon, label, onClick, disabled, active, className = '' }) {
  return (
    <button
      className={`toolbar-btn ${active ? 'toolbar-btn--active' : ''} ${className}`}
      onClick={onClick}
      disabled={disabled}
      title={label}
      type="button"
    >
      <Icon size={16} weight="regular" />
      <span className="toolbar-btn__label">{label.toUpperCase()}</span>
    </button>
  );
}

export function Toolbar({
  zoom,
  searchQuery,
  onAddNote,
  onAddUrl,
  onAddImage,
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
  onToggleSpaces = () => {},
  onToggleCommandPalette = () => {},
}) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchValue, setSearchValue] = useState(searchQuery || '');
  const searchInputRef = useRef(null);

  useEffect(() => {
    if (searchOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [searchOpen]);

  const handleSearchChange = useCallback(
    (e) => {
      const val = e.target.value;
      setSearchValue(val);
      onSearch(val);
    },
    [onSearch]
  );

  const handleSearchClear = useCallback(() => {
    setSearchValue('');
    setSearchOpen(false);
    onSearchClear();
  }, [onSearchClear]);

  const handleSearchKeyDown = useCallback(
    (e) => {
      if (e.key === 'Escape') {
        handleSearchClear();
      }
    },
    [handleSearchClear]
  );

  return (
    <div className="toolbar glass-toolbar" role="toolbar" aria-label="Main toolbar">
      {/* ── Primary Actions ── */}
      <ToolbarButton
        icon={SquaresFour}
        label="Spaces"
        onClick={onToggleSpaces}
      />
      <ToolbarButton
        icon={Plus}
        label="Add"
        onClick={onAddUrl}
      />
      <ToolbarButton
        icon={Command}
        label="Search"
        onClick={onToggleCommandPalette}
      />

      {/* ── Search inline (collapsible) ── */}
      <div className={`toolbar-search-wrap ${searchOpen ? 'toolbar-search-wrap--active' : ''}`}>
        <button
          className={`toolbar-btn toolbar-search-toggle ${searchOpen ? 'toolbar-search-toggle--hidden' : ''}`}
          onClick={() => setSearchOpen(true)}
          title="Search (Ctrl+K)"
          type="button"
        >
          <MagnifyingGlass size={16} weight="regular" />
          <span className="toolbar-btn__label">SRCH</span>
        </button>
        <input
          ref={searchInputRef}
          type="text"
          className="toolbar-search-input"
          placeholder="Search..."
          value={searchValue}
          onChange={handleSearchChange}
          onKeyDown={handleSearchKeyDown}
        />
        <button
          className="toolbar-search-clear"
          onClick={handleSearchClear}
          title="Clear search"
          type="button"
        >
          <X size={14} weight="regular" />
        </button>
      </div>

      {/* ── Spacer ── */}
      <div className="toolbar-spacer" />

      {/* ── History ── */}
      <ToolbarButton
        icon={ArrowCounterClockwise}
        label="Undo"
        onClick={onUndo}
        disabled={!canUndo}
      />
      <ToolbarButton
        icon={ArrowClockwise}
        label="Redo"
        onClick={onRedo}
        disabled={!canRedo}
      />

      {/* ── Zoom ── */}
      <ToolbarButton
        icon={CornersOut}
        label="Fit"
        onClick={onFit}
      />

      {/* ── Delete ── */}
      <ToolbarButton
        icon={Trash}
        label="Delete"
        onClick={onDelete}
        disabled={selectedCount === 0}
      />

      {/* ── Spacer ── */}
      <div className="toolbar-spacer" />

      {/* ── Import / Export ── */}
      <ToolbarButton
        icon={Export}
        label="Export"
        onClick={onExport}
      />
      <ToolbarButton
        icon={DownloadSimple}
        label="Import"
        onClick={onImport}
      />

      {/* ── Settings ── */}
      <ToolbarButton
        icon={GearSix}
        label="Settings"
        onClick={() => {}}
      />

      {/* ── Zoom indicator ── */}
      <span className="toolbar-zoom-indicator" aria-label={`Zoom: ${Math.round((zoom || 1) * 100)}%`}>
        {Math.round((zoom || 1) * 100)}%
      </span>
    </div>
  );
}
