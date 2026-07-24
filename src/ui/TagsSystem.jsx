/**
 * LOOKING GLASS — Tags System
 *
 * Three exports:
 *   TagsPanel     — sidebar panel listing all tags with counts + click-to-filter
 *   TagEditor     — inline chip editor for a single card's tags
 *   TagFilterBar  — horizontal pill bar (used above canvas for active filters)
 *
 * Integration:
 *   1. Add to useStore:  tags state + addTag / removeTag / toggleTagFilter actions.
 *   2. Mount <TagsPanel> in the LiquidGlassSidebar when activeItem === 'tags'.
 *   3. Mount <TagEditor> inside NoteCard / BookmarkCard / WebClipCard.
 *   4. Mount <TagFilterBar> between the sidebar and canvas when any tag is active.
 *
 * Auto-extraction: #hashtags in note text are parsed and auto-added to that card's tags.
 */

import React, {
  useState,
  useCallback,
  useRef,
  useEffect,
  useMemo,
} from 'react';
import { Hash, X, Plus, Tag } from '@phosphor-icons/react';

// ─────────────────────────────────────────────────────────────
// TAG UTILITIES
// ─────────────────────────────────────────────────────────────

/** Parse #hashtags from plain text / HTML string */
export function extractHashtags(text) {
  if (!text) return [];
  // Strip HTML tags first
  const plain = text.replace(/<[^>]+>/g, ' ');
  const matches = plain.match(/#([a-zA-Z0-9_\-]+)/g) || [];
  return [...new Set(matches.map((m) => m.slice(1).toLowerCase()))];
}

/** Normalise a tag: lowercase, no spaces, no leading # */
export function normaliseTag(raw) {
  return raw.replace(/^#+/, '').toLowerCase().replace(/\s+/g, '-').trim();
}

/** Aggregate tags from all items → Map<tagName, count> */
export function aggregateTags(items) {
  const map = new Map();
  for (const item of items) {
    const tags = [
      ...(item.meta?.tags || []),
      ...extractHashtags(item.content?.text || ''),
    ];
    for (const tag of tags) {
      const key = normaliseTag(tag);
      if (key) map.set(key, (map.get(key) || 0) + 1);
    }
  }
  return map;
}

// ─────────────────────────────────────────────────────────────
// TAG CHIP — shared rendering atom
// ─────────────────────────────────────────────────────────────

function TagChip({ tag, count, active, onRemove, onClick, size = 'sm' }) {
  const isSmall = size === 'sm';
  return (
    <div
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: isSmall ? '2px 8px' : '4px 10px',
        borderRadius: '9999px',
        border: `1px solid ${active ? 'rgba(255,255,255,0.30)' : 'var(--color-border)'}`,
        background: active ? 'rgba(255,255,255,0.10)' : 'transparent',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.12s ease',
        userSelect: 'none',
        flexShrink: 0,
      }}
      role={onClick ? 'button' : undefined}
      aria-pressed={onClick ? active : undefined}
    >
      <Hash
        size={isSmall ? 10 : 11}
        weight="regular"
        style={{ color: active ? 'var(--text-primary)' : 'var(--text-secondary)', flexShrink: 0 }}
      />
      <span
        style={{
          fontFamily: 'var(--font-ui)',
          fontSize: isSmall ? '10px' : '11px',
          letterSpacing: '0.06em',
          color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
          whiteSpace: 'nowrap',
        }}
      >
        {tag}
      </span>
      {count !== undefined && (
        <span
          style={{
            fontFamily: 'var(--font-ui)',
            fontSize: '9px',
            color: 'var(--text-disabled)',
            marginLeft: '2px',
          }}
        >
          {count}
        </span>
      )}
      {onRemove && (
        <button
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          aria-label={`Remove tag ${tag}`}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '14px',
            height: '14px',
            border: 'none',
            background: 'transparent',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            borderRadius: '50%',
            padding: 0,
            marginLeft: '2px',
            flexShrink: 0,
          }}
        >
          <X size={8} weight="bold" />
        </button>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// TAGS PANEL — sidebar section showing all tags globally
// ─────────────────────────────────────────────────────────────

/**
 * Props:
 *   items          {Item[]}       All canvas items
 *   activeTagFilters {Set<string>} Currently filtered tags
 *   onToggleTag    {(tag) => void}
 *   onClearTags    {() => void}
 */
export function TagsPanel({ items = [], activeTagFilters = new Set(), onToggleTag, onClearTags }) {
  const [search, setSearch] = useState('');

  const tagMap = useMemo(() => aggregateTags(items), [items]);

  const sortedTags = useMemo(() => {
    const entries = [...tagMap.entries()];
    if (search.trim()) {
      const q = search.toLowerCase();
      return entries.filter(([tag]) => tag.includes(q)).sort((a, b) => b[1] - a[1]);
    }
    return entries.sort((a, b) => b[1] - a[1]);
  }, [tagMap, search]);

  if (tagMap.size === 0) {
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
        <Tag size={20} weight="regular" style={{ marginBottom: '8px', display: 'block', margin: '0 auto 8px' }} />
        No tags yet.{'\n'}Add #hashtags to notes or tag cards.
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {/* Search tags */}
      <div style={{ padding: '8px 12px 6px' }}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter tags…"
          style={{
            width: '100%',
            height: '30px',
            border: '1px solid var(--color-border)',
            borderRadius: '6px',
            background: 'var(--color-bg-raised)',
            color: 'var(--text-primary)',
            fontFamily: 'var(--font-body)',
            fontSize: '12px',
            padding: '0 10px',
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />
      </div>

      {/* Clear filters */}
      {activeTagFilters.size > 0 && (
        <button
          onClick={onClearTags}
          style={{
            margin: '0 12px 6px',
            height: '28px',
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
          CLEAR {activeTagFilters.size} FILTER{activeTagFilters.size > 1 ? 'S' : ''}
        </button>
      )}

      {/* Tag list */}
      <div style={{ padding: '0 8px 8px', display: 'flex', flexDirection: 'column', gap: '1px' }}>
        {sortedTags.map(([tag, count]) => {
          const active = activeTagFilters.has(tag);
          return (
            <button
              key={tag}
              onClick={() => onToggleTag?.(tag)}
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
              }}
              onMouseEnter={(e) => {
                if (!active) e.currentTarget.style.background = 'var(--state-hover)';
              }}
              onMouseLeave={(e) => {
                if (!active) e.currentTarget.style.background = 'transparent';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Hash
                  size={11}
                  weight="regular"
                  style={{ color: active ? 'var(--text-primary)' : 'var(--text-secondary)', flexShrink: 0 }}
                />
                <span
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: '13px',
                    color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
                    fontWeight: active ? 600 : 400,
                  }}
                >
                  {tag}
                </span>
              </div>
              <span
                style={{
                  fontFamily: 'var(--font-ui)',
                  fontSize: '10px',
                  color: 'var(--text-disabled)',
                }}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// TAG EDITOR — inline chip editor for a card
// ─────────────────────────────────────────────────────────────

/**
 * Props:
 *   tags       {string[]}          Current tags for this card
 *   onChange   {(tags) => void}    Called with full new tag list
 *   compact    {boolean}           Show compact (1 row, no expand)
 */
export function TagEditor({ tags = [], onChange, compact = false }) {
  const [inputVal, setInputVal] = useState('');
  const [expanded, setExpanded] = useState(false);
  const inputRef = useRef(null);

  const addTag = useCallback(
    (raw) => {
      const tag = normaliseTag(raw);
      if (!tag || tags.includes(tag)) return;
      onChange?.([...tags, tag]);
    },
    [tags, onChange],
  );

  const removeTag = useCallback(
    (tag) => {
      onChange?.(tags.filter((t) => t !== tag));
    },
    [tags, onChange],
  );

  const handleKeyDown = useCallback(
    (e) => {
      if ((e.key === 'Enter' || e.key === ',') && inputVal.trim()) {
        e.preventDefault();
        addTag(inputVal);
        setInputVal('');
      }
      if (e.key === 'Backspace' && !inputVal && tags.length > 0) {
        removeTag(tags[tags.length - 1]);
      }
    },
    [inputVal, addTag, removeTag, tags],
  );

  const displayTags = compact && !expanded ? tags.slice(0, 3) : tags;
  const overflow    = compact && !expanded && tags.length > 3;

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '4px',
        alignItems: 'center',
        padding: '6px 16px',
        borderTop: '1px solid var(--color-border)',
        minHeight: '32px',
      }}
    >
      {displayTags.map((tag) => (
        <TagChip
          key={tag}
          tag={tag}
          onRemove={() => removeTag(tag)}
          size="sm"
        />
      ))}

      {overflow && (
        <button
          onClick={() => setExpanded(true)}
          style={{
            fontFamily: 'var(--font-ui)',
            fontSize: '9px',
            color: 'var(--text-disabled)',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            padding: '2px 4px',
          }}
        >
          +{tags.length - 3} more
        </button>
      )}

      {/* Input */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
        <Hash size={9} weight="regular" style={{ color: 'var(--text-disabled)' }} />
        <input
          ref={inputRef}
          className="lg-tag-input"
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => {
            if (inputVal.trim()) { addTag(inputVal); setInputVal(''); }
          }}
          placeholder="tag"
          style={{
            border: 'none',
            background: 'transparent',
            color: 'var(--text-secondary)',
            fontFamily: 'var(--font-ui)',
            fontSize: '10px',
            letterSpacing: '0.04em',
            outline: 'none',
            width: `${Math.max(30, inputVal.length * 7 + 30)}px`,
            minWidth: '30px',
            maxWidth: '120px',
            height: '28px',
            minHeight: '28px',
            padding: '4px 2px',
            caretColor: 'var(--text-primary)',
          }}
        />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// TAG FILTER BAR — horizontal pill row above canvas
// ─────────────────────────────────────────────────────────────

/**
 * Props:
 *   activeTagFilters  {Set<string>}
 *   onToggleTag       {(tag) => void}
 *   onClearTags       {() => void}
 */
export function TagFilterBar({ activeTagFilters = new Set(), onToggleTag, onClearTags }) {
  if (activeTagFilters.size === 0) return null;

  return (
    <div
      role="toolbar"
      aria-label="Active tag filters"
      style={{
        position: 'absolute',
        top: '12px',
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
        maxWidth: 'calc(100vw - 320px)',
        flexWrap: 'nowrap',
        overflowX: 'auto',
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
        FILTERED BY
      </span>

      {[...activeTagFilters].map((tag) => (
        <TagChip
          key={tag}
          tag={tag}
          active
          onRemove={() => onToggleTag?.(tag)}
          size="sm"
        />
      ))}

      <button
        onClick={onClearTags}
        title="Clear all filters"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '20px',
          height: '20px',
          border: 'none',
          background: 'transparent',
          color: 'var(--text-disabled)',
          cursor: 'pointer',
          borderRadius: '50%',
          padding: 0,
          flexShrink: 0,
        }}
        aria-label="Clear all tag filters"
      >
        <X size={10} weight="bold" />
      </button>
    </div>
  );
}

export default { TagsPanel, TagEditor, TagFilterBar, extractHashtags, normaliseTag, aggregateTags };
