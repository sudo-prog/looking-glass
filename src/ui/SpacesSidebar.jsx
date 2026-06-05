/**
 * LOOKING GLASS — Spaces Sidebar (Phase 5 / V2)
 *
 * Desktop: 240px overlay, TOOLBAR_GLASS
 * Active: 3×3px filled dot (●), --text-primary
 * Inactive: 3×3px outline circle (○), --text-disabled
 * Count: Space Mono 11px, right-aligned, --text-secondary
 * Hover: --state-hover, name → --text-primary
 * Drag handle: DotsSixVertical 12px on hover
 */
import React, { useState, useCallback } from 'react';
import { DotsSixVertical, Plus } from '@phosphor-icons/react';

export function SpacesSidebar({
  isOpen,
  spaces = [],
  activeSpaceId,
  onSelectSpace,
  onNewSpace,
  onClose,
}) {
  const [hoveredId, setHoveredId] = useState(null);

  const handleSelect = useCallback(
    (id) => {
      if (onSelectSpace) onSelectSpace(id);
    },
    [onSelectSpace]
  );

  const handleNew = useCallback(() => {
    if (onNewSpace) onNewSpace();
  }, [onNewSpace]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop for mobile */}
      <div className="spaces-sidebar__backdrop" onClick={onClose} />

      <aside className="spaces-sidebar glass-toolbar" role="navigation" aria-label="Spaces">
        {/* Header */}
        <div className="spaces-sidebar__header">
          <span className="spaces-sidebar__title">SPACES</span>
        </div>

        {/* Space list */}
        <div className="spaces-sidebar__list">
          {spaces.map((space) => {
            const isActive = space.id === activeSpaceId;
            const isHovered = space.id === hoveredId;

            return (
              <button
                key={space.id}
                className={`spaces-sidebar__item ${isActive ? 'spaces-sidebar__item--active' : ''}`}
                onClick={() => handleSelect(space.id)}
                onMouseEnter={() => setHoveredId(space.id)}
                onMouseLeave={() => setHoveredId(null)}
                type="button"
              >
                {/* Active/inactive indicator */}
                <span className="spaces-sidebar__indicator" aria-hidden="true">
                  {isActive ? (
                    <span className="spaces-sidebar__dot spaces-sidebar__dot--filled" />
                  ) : (
                    <span className="spaces-sidebar__dot spaces-sidebar__dot--outline" />
                  )}
                </span>

                {/* Name */}
                <span className="spaces-sidebar__name">{space.name}</span>

                {/* Count */}
                <span className="spaces-sidebar__count">{space.count ?? 0}</span>

                {/* Drag handle (visible on hover) */}
                {isHovered && (
                  <span className="spaces-sidebar__drag-handle">
                    <DotsSixVertical size={12} weight="regular" />
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Divider */}
        <div className="spaces-sidebar__divider" />

        {/* New Space */}
        <button
          className="spaces-sidebar__new"
          onClick={handleNew}
          type="button"
        >
          <Plus size={14} weight="regular" />
          <span>NEW SPACE</span>
        </button>
      </aside>
    </>
  );
}
