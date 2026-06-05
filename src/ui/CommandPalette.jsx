/**
 * LOOKING GLASS — Command Palette (Phase 5 / V2)
 *
 * Width: min(640px, 90vw)
 * Glass: COMMAND_GLASS_DARK / COMMAND_GLASS_LIGHT
 * Input: Space Grotesk 16px, placeholder "Search or paste a URL..."
 * Results: 48px height, Space Grotesk 14px
 * Section headers: Space Mono 10px ALL CAPS
 * Keyboard: ↑↓ navigate, Enter select, Esc close
 * Overlay with backdrop dim.
 */
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { MagnifyingGlass, ArrowUpRight, Note, SquaresFour, X } from '@phosphor-icons/react';

const RECENT_ITEMS = [];
const ACTIONS = [
  { id: 'new-note', label: 'New Note', icon: Note, action: 'new-note' },
  { id: 'new-space', label: 'New Space', icon: SquaresFour, action: 'new-space' },
];

export function CommandPalette({ isOpen, onClose, onAction, onSearch }) {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef(null);
  const resultsRef = useRef(null);

  // Flattened list of selectable items for keyboard nav
  const flatItems = useMemo(() => {
    const items = [];
    if (RECENT_ITEMS.length > 0) {
      items.push({ type: 'section', label: 'RECENT' });
      RECENT_ITEMS.forEach((r) => items.push({ type: 'result', ...r }));
    }
    items.push({ type: 'section', label: 'ACTIONS' });
    ACTIONS.forEach((a) => items.push({ type: 'action', ...a }));
    return items;
  }, []);

  const selectableItems = useMemo(
    () => flatItems.filter((i) => i.type === 'result' || i.type === 'action'),
    [flatItems]
  );

  // Reset on open
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setActiveIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Scroll active item into view
  useEffect(() => {
    if (resultsRef.current) {
      const activeEl = resultsRef.current.querySelector(
        `[data-index="${activeIndex}"]`
      );
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [activeIndex]);

  const handleKeyDown = useCallback(
    (e) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setActiveIndex((prev) =>
            prev < selectableItems.length - 1 ? prev + 1 : 0
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setActiveIndex((prev) =>
            prev > 0 ? prev - 1 : selectableItems.length - 1
          );
          break;
        case 'Enter': {
          e.preventDefault();
          const selected = selectableItems[activeIndex];
          if (selected) {
            if (selected.type === 'action' && onAction) {
              onAction(selected.action);
            } else if (selected.type === 'result' && onSearch) {
              onSearch(selected);
            }
          }
          onClose();
          break;
        }
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    },
    [activeIndex, selectableItems, onClose, onAction, onSearch]
  );

  const handleChange = useCallback(
    (e) => {
      const val = e.target.value;
      setQuery(val);
      setActiveIndex(0);
      if (onSearch) onSearch(val);
    },
    [onSearch]
  );

  if (!isOpen) return null;

  let selectableIdx = -1;

  return (
    <div className="command-palette-overlay" onClick={onClose}>
      <div
        className="command-palette glass-command-palette"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Command palette"
      >
        {/* Input */}
        <div className="command-palette__input-wrap">
          <MagnifyingGlass size={20} weight="regular" className="command-palette__search-icon" />
          <input
            ref={inputRef}
            type="text"
            className="command-palette__input"
            placeholder="Search or paste a URL..."
            value={query}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            autoComplete="off"
            spellCheck={false}
          />
          <button
            className="command-palette__close"
            onClick={onClose}
            type="button"
            aria-label="Close"
          >
            <X size={16} weight="regular" />
          </button>
        </div>

        {/* Results */}
        <div className="command-palette__results" ref={resultsRef}>
          {flatItems.map((item, i) => {
            if (item.type === 'section') {
              return (
                <div key={`section-${i}`} className="command-palette__section">
                  {item.label}
                </div>
              );
            }

            selectableIdx++;
            const idx = selectableIdx;
            const isActive = idx === activeIndex;
            const Icon = item.icon;

            return (
              <button
                key={item.id || `item-${i}`}
                data-index={idx}
                className={`command-palette__result ${isActive ? 'command-palette__result--active' : ''}`}
                onClick={() => {
                  if (item.type === 'action' && onAction) onAction(item.action);
                  onClose();
                }}
                type="button"
              >
                {Icon && <Icon size={16} weight="regular" className="command-palette__result-icon" />}
                <span className="command-palette__result-label">{item.label}</span>
                {item.url && (
                  <span className="command-palette__result-url">{item.url}</span>
                )}
              </button>
            );
          })}

          {selectableItems.length === 0 && (
            <div className="command-palette__empty">[NO RESULTS]</div>
          )}
        </div>
      </div>
    </div>
  );
}
