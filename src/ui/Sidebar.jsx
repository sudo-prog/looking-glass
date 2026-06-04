/**
 * LOOKING GLASS — Sidebar Component (React)
 */
import React from 'react';
import { useStore } from '../store/useStore.js';

export function Sidebar({ activeFilters, onToggleFilter, stats }) {
  const allFilters = [
    { key: 'bookmark', label: 'Bookmarks' },
    { key: 'web_clip', label: 'Web Clips' },
    { key: 'note', label: 'Notes' },
    { key: 'image', label: 'Images' },
    { key: 'group', label: 'Groups' },
  ];

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <h1 className="sidebar-title">Looking Glass</h1>
      </div>

      <div className="sidebar-spaces">
        <h2>Spaces</h2>
        <div className="spaces-list">
          <div className="space-item active">My Canvas</div>
        </div>
        <button className="add-space-btn" title="Coming in V0.3">+ New Space</button>
      </div>

      <div className="sidebar-filters">
        <h2>Filters</h2>
        <div className="filter-group">
          {allFilters.map(({ key, label }) => (
            <label key={key}>
              <input
                type="checkbox"
                checked={activeFilters.has(key)}
                onChange={() => onToggleFilter(key)}
              />
              {' '}{label}
            </label>
          ))}
        </div>
      </div>

      <div className="sidebar-stats">
        <h2>Stats</h2>
        <div className="stats-list">
          <span className="stat-item">Total: <strong>{stats?.total || 0}</strong></span>
          <span className="stat-item">Bookmarks: <strong>{stats?.bookmarks || 0}</strong></span>
          <span className="stat-item">Notes: <strong>{stats?.notes || 0}</strong></span>
          <span className="stat-item">Images: <strong>{stats?.images || 0}</strong></span>
        </div>
      </div>
    </div>
  );
}
