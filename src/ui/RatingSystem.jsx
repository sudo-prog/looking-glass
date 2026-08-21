/**
 * LOOKING GLASS — Rating System (star ratings 1-5)
 *
 * Three exports:
 *   StarRating     — interactive 1-5 star control (44px tap targets, null=unrated, click toggles off)
 *   RatingPanel    — sidebar panel listing ratings 5→1 with counts + click-to-filter (mirrors TagsPanel)
 *   RatingFilterBar— horizontal pill above canvas when a rating is active (mirrors TagFilterBar)
 *
 * Integration:
 *   1. Add to useStore: ratingFilter state + setRatingFilter / clearRatingFilter / toggleRatingFilter.
 *   2. Mount <RatingPanel> in the LiquidGlassSidebar when activeItem === 'ratings'.
 *   3. Mount <StarRating> inside CanvasCard (after <TagEditor>) so every item type can be rated.
 *   4. Mount <RatingFilterBar> between the sidebar and canvas when any rating is active.
 *
 * Ratings live on `meta.rating` (null = unrated; 1|2|3|4|5 = stars). Adding the field needs
 * NO DB migration — items persist as opaque objects via IndexedDB.
 */

import React, { useState, useMemo } from 'react';
import { Star, X } from '@phosphor-icons/react';

// ─────────────────────────────────────────────────────────────
// STAR RATING — interactive 1-5 control
// ─────────────────────────────────────────────────────────────

/**
 * Props:
 *   value     {number|null}  Current rating (null = unrated)
 *   onChange  {(n: number|null) => void}
 *   size      {number}       Star pixel size (default 18)
 */
export function StarRating({ value = null, onChange, size = 18 }) {
  const stars = [1, 2, 3, 4, 5];

  const handleClick = (n) => {
    // Clicking the already-selected star clears the rating (null = unrated)
    onChange?.(value === n ? null : n);
  };

  return (
    <div
      role="radiogroup"
      aria-label="Rating"
      onClick={(e) => e.stopPropagation()}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '2px',
        padding: '6px 16px',
        borderTop: '1px solid var(--color-border)',
        minHeight: '44px',
      }}
    >
      {stars.map((n) => {
        const filled = typeof value === 'number' && n <= value;
        return (
          <button
            key={n}
            role="radio"
            aria-checked={value === n}
            aria-label={`${n} star${n > 1 ? 's' : ''}`}
            title={`${n} star${n > 1 ? 's' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              handleClick(n);
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '44px',
              height: '44px',
              minWidth: '44px',
              minHeight: '44px',
              border: 'none',
              background: 'transparent',
              color: filled ? 'var(--accent-rating, #F5A623)' : 'var(--text-disabled)',
              cursor: 'pointer',
              padding: '0',
              borderRadius: '50%',
              transition: 'color 0.10s ease, transform 0.08s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = filled ? 'var(--accent-rating, #F5A623)' : 'var(--text-secondary)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = filled ? 'var(--accent-rating, #F5A623)' : 'var(--text-disabled)';
            }}
          >
            <Star
              size={size}
              weight={filled ? 'fill' : 'regular'}
              style={{ pointerEvents: 'none' }}
            />
          </button>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// RATING PANEL — sidebar list 5→1 with counts + click-to-filter
// ─────────────────────────────────────────────────────────────

/**
 * Props:
 *   items        {Item[]}         All canvas items
 *   ratingFilter {number|null}    Currently filtered rating
 *   onSetRating  {(n) => void}
 *   onClear      {() => void}
 */
export function RatingPanel({ items = [], ratingFilter = null, onSetRating, onClear }) {
  const counts = useMemo(() => {
    const map = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const item of items) {
      const r = item.meta?.rating ?? null;
      if (r != null && map[r] !== undefined) map[r] += 1;
    }
    return map;
  }, [items]);

  const totalRated = counts[1] + counts[2] + counts[3] + counts[4] + counts[5];

  if (totalRated === 0) {
    return (
      <div
        style={{
          padding: '24px 16px',
          fontFamily: 'var(--font-ui)',
          fontSize: '11px',
          color: 'var(--text-disabled)',
          textAlign: 'center',
          lineHeight: 1.6,
        }}
      >
        <Star size={20} weight="regular" style={{ marginBottom: '8px', display: 'block', margin: '0 auto 8px', color: 'var(--text-disabled)' }} />
        No ratings yet.{'\\n'}Star a card to filter by rating.
      </div>
    );
  }

  const rows = [5, 4, 3, 2, 1];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {/* Clear filter */}
      {ratingFilter != null && (
        <button
          onClick={onClear}
          style={{
            margin: '0 12px 6px',
            minWidth: '44px',
            minHeight: '44px',
            height: '44px',
            border: '1px solid var(--color-border)',
            borderRadius: '6px',
            background: 'transparent',
            color: 'var(--text-secondary)',
            fontFamily: 'var(--font-ui)',
            fontSize: '9px',
            letterSpacing: '0.10em',
            textTransform: 'uppercase',
            cursor: 'pointer',
          }}
        >
          CLEAR FILTER
        </button>
      )}

      {/* Rating rows */}
      <div style={{ padding: '0 8px 8px', display: 'flex', flexDirection: 'column', gap: '1px' }}>
        {rows.map((n) => {
          const active = ratingFilter === n;
          return (
            <button
              key={n}
              onClick={() => onSetRating?.(n)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '7px 8px',
                border: 'none',
                background: active ? 'var(--state-active)' : 'transparent',
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'background 0.08s ease',
                width: '100%',
                minHeight: '44px',
              }}
              onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = 'var(--state-hover)'; }}
              onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = 'transparent'; }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                {[1, 2, 3, 4, 5].map((s) => {
                  const filled = s <= n;
                  return (
                    <Star
                      key={s}
                      size={13}
                      weight={filled ? 'fill' : 'regular'}
                      style={{ color: filled ? 'var(--accent-rating, #F5A623)' : 'var(--text-disabled)', flexShrink: 0 }}
                    />
                  );
                })}
              </div>
              <span
                style={{
                  fontFamily: 'var(--font-ui)',
                  fontSize: '10px',
                  color: 'var(--text-disabled)',
                }}
              >
                {counts[n]}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// RATING FILTER BAR — horizontal pill above canvas
// ─────────────────────────────────────────────────────────────

/**
 * Props:
 *   ratingFilter {number|null}
 *   onClear      {() => void}
 */
export function RatingFilterBar({ ratingFilter = null, onClear }) {
  if (ratingFilter == null) return null;

  return (
    <div className="overflow-x-auto">
      <div
        role="toolbar"
        aria-label="Active rating filter"
        style={{
          position: 'absolute',
          top: 'calc(12px + env(safe-area-inset-top))',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 'var(--z-canvas-ui)',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '6px 10px',
          borderRadius: '9999px',
          background: 'var(--glass-frost)',
          backdropFilter: 'blur(var(--glass-blur-lg))',
          WebkitBackdropFilter: 'blur(var(--glass-blur-lg))',
          border: '1px solid var(--color-border)',
          boxShadow: '0 4px 16px rgba(0,0,0,0.40)',
          maxWidth: 'calc(100vw - 24px)',
          flexWrap: 'wrap',
        }}
      >
        <span
          style={{
            fontFamily: 'var(--font-ui)',
            fontSize: '9px',
            letterSpacing: '0.12em',
            color: 'var(--text-disabled)',
            textTransform: 'uppercase',
            flexShrink: 0,
          }}
        >
          RATED
        </span>

        <div
          role="button"
          aria-label={`Filtered by ${ratingFilter} star${ratingFilter > 1 ? 's' : ''}`}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '1px',
            padding: '2px 8px',
            borderRadius: '9999px',
            border: '1px solid var(--color-border)',
            background: 'rgba(255,255,255,0.10)',
            cursor: 'default',
          }}
        >
          {[1, 2, 3, 4, 5].map((s) => {
            const filled = s <= ratingFilter;
            return (
              <Star
                key={s}
                size={10}
                weight={filled ? 'fill' : 'regular'}
                style={{ color: filled ? 'var(--accent-rating, #F5A623)' : 'var(--text-disabled)', flexShrink: 0 }}
              />
            );
          })}
        </div>

        <button
          onClick={onClear}
          title="Clear rating filter"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '32px',
            height: '32px',
            minWidth: '44px',
            minHeight: '44px',
            border: 'none',
            background: 'transparent',
            color: 'var(--text-disabled)',
            cursor: 'pointer',
            borderRadius: '50%',
            padding: 0,
            flexShrink: 0,
          }}
          aria-label="Clear rating filter"
        >
          <X size={12} weight="bold" />
        </button>
      </div>
    </div>
  );
}

export default { StarRating, RatingPanel, RatingFilterBar };
