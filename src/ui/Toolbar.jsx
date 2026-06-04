/**
 * LOOKING GLASS — Toolbar Component (React)
 */
import React, { useState, useRef, useEffect } from 'react';

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
}) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchValue, setSearchValue] = useState(searchQuery || '');
  const searchInputRef = useRef(null);

  useEffect(() => {
    if (searchOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [searchOpen]);

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchValue(val);
    onSearch(val);
  };

  const handleSearchClear = () => {
    setSearchValue('');
    setSearchOpen(false);
    onSearchClear();
  };

  const handleSearchKeyDown = (e) => {
    if (e.key === 'Escape') {
      handleSearchClear();
    }
  };

  return (
    <div className="toolbar">
      <button className="toolbar-btn" onClick={onAddUrl} title="Add URL">🔗</button>
      <button className="toolbar-btn" onClick={onAddNote} title="New Note (N)">📝</button>
      <button className="toolbar-btn" onClick={onAddImage} title="Add Image">🖼</button>
      <button className="toolbar-btn" onClick={onDelete} title="Delete Selected (Del)" disabled={selectedCount === 0}>🗑</button>
      <div className="toolbar-separator" />

      <div className={`toolbar-search-wrap ${searchOpen ? 'active' : ''}`}>
        <button className={`toolbar-btn toolbar-search-toggle ${searchOpen ? 'hidden' : ''}`} onClick={() => setSearchOpen(true)} title="Search (Ctrl+K)">🔍</button>
        <input
          ref={searchInputRef}
          type="text"
          className="toolbar-search-input"
          placeholder="Search..."
          value={searchValue}
          onChange={handleSearchChange}
          onKeyDown={handleSearchKeyDown}
        />
        <button className="toolbar-btn toolbar-search-clear" onClick={handleSearchClear} title="Clear search">✕</button>
      </div>

      <div className="toolbar-separator" />
      <button className={`toolbar-btn ${!canUndo ? 'disabled' : ''}`} onClick={onUndo} title="Undo (Ctrl+Z)">↩</button>
      <button className={`toolbar-btn ${!canRedo ? 'disabled' : ''}`} onClick={onRedo} title="Redo (Ctrl+Shift+Z)">↪</button>

      <div className="toolbar-separator" />
      <button className="toolbar-btn" onClick={onZoomIn} title="Zoom In (+)">+</button>
      <button className="toolbar-btn" onClick={onZoomOut} title="Zoom Out (−)">−</button>
      <button className="toolbar-btn" onClick={onFit} title="Fit to Content">⊡</button>
      <span className="toolbar-zoom-indicator" title="Zoom level">{Math.round((zoom || 1) * 100)}%</span>

      <div className="toolbar-separator" />
      <button className="toolbar-btn" onClick={onExport} title="Export">↓</button>
      <button className="toolbar-btn" onClick={onImport} title="Import">↑</button>
    </div>
  );
}
