/**
 * LOOKING GLASS — BaseCard Component (React)
 * Shared card component with glass effect, drag, selection, and all 5 states.
 *
 * Card anatomy per Design Brief V2 Part IV/VII:
 * - Full-bleed image area (no glass over image)
 * - 1px separator between image and content
 * - Content: title (Space Grotesk 15px --text-primary), description (Space Grotesk 13px --text-secondary)
 * - Metadata row: Space Mono 10px ALL CAPS (domain + timestamp), 16px h-padding, flush to bottom
 * - Accent dot: 4×4px in top-right corner, above glass layer (never refracted)
 * - Card border-radius: 12px
 * - CARD_GLASS uniforms applied
 *
 * States: REST, HOVER, DRAG, SELECTED, FOCUS, DROP
 */

import React, { useRef, useCallback, useState, useEffect } from 'react';
import { getUniforms } from '../webgpu/uniforms.ts';
import { isDark } from '../utils/theme.js';

// ── Types ──────────────────────────────────────────────────

export interface CardItem {
  id: string;
  type: string;
  created_at: number;
  updated_at: number;
  x: number;
  y: number;
  width: number;
  height?: number | null;
  rotation: number;
  z_index: number;
  content: {
    title: string;
    description?: string;
    url?: string | null;
    image_url?: string | null;
    text?: string | null;
    file_path?: string | null;
    embed_html?: string | null;
  };
  meta: {
    source?: string;
    tags?: string[];
    color?: string | null;
    pinned?: boolean;
    archived?: boolean;
    group_id?: string | null;
    twitter_id?: string | null;
    domain?: string | null;
    read_at?: number | null;
    fetch_status?: string;
    child_count?: number;
    collapsed?: boolean;
  };
  style?: {
    background?: string | null;
    text_color?: string | null;
    font_size?: number | null;
    opacity?: number;
  };
}

export type CardState = 'rest' | 'hover' | 'drag' | 'selected' | 'focus' | 'drop';

export interface BaseCardProps {
  item: CardItem;
  isSelected: boolean;
  accentColor?: string;
  children?: React.ReactNode;
  onSelect: (multi: boolean) => void;
  onDragStart: (e: React.PointerEvent) => void;
  onSave?: (updates: Partial<CardItem>) => void;
  onDelete?: () => void;
  onLightbox?: () => void;
  className?: string;
  tabIndex?: number;
  'aria-posinset'?: number;
  'aria-setsize'?: number;
}

// ── Accent dot colors (5 status colors) ────────────────────

const ACCENT_COLORS = [
  'var(--text-secondary)',  // default
  'var(--color-accent)',    // red
  'var(--color-success)',   // green
  'var(--color-warning)',   // amber
  '#3B82F6',                // blue
];

function getAccentColor(item: CardItem): string {
  if (item.meta?.color) return item.meta.color;
  return ACCENT_COLORS[0];
}

// ── Timestamp formatter ────────────────────────────────────

function timeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return `${seconds}S AGO`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}M AGO`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}H AGO`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}D AGO`;
  const months = Math.floor(days / 30);
  return `${months}MO AGO`;
}

// ── Component ──────────────────────────────────────────────

export const BaseCard: React.FC<BaseCardProps> = ({
  item,
  isSelected,
  accentColor,
  children,
  onSelect,
  onDragStart,
  className = '',
  tabIndex = 0,
  'aria-posinset': ariaPosinset,
  'aria-setsize': ariaSetsize,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [cardState, setCardState] = useState<CardState>('rest');
  const [isDropAnimating, setIsDropAnimating] = useState(false);

  const dark = isDark();
  const uniforms = getUniforms('card', dark);
  const accent = accentColor || getAccentColor(item);

  // Compute state-dependent styles per Design Brief V2 Part VII
  const getStateStyles = useCallback((): React.CSSProperties => {
    const base: React.CSSProperties = {};

    switch (cardState) {
      case 'rest':
        base.boxShadow = '0 2px 8px rgba(0,0,0,' + (dark ? '0.10' : '0.08') + ')';
        base.transform = 'scale(1.0)';
        break;
      case 'hover':
        base.boxShadow = '0 4px 16px rgba(0,0,0,' + (dark ? '0.20' : '0.12') + ')';
        base.transform = 'scale(1.0)';
        break;
      case 'drag':
        base.boxShadow = '0 12px 40px rgba(0,0,0,' + (dark ? '0.55' : '0.18') + ')';
        base.transform = 'scale(1.02) rotate(' + (Math.random() > 0.5 ? '2' : '-2') + 'deg)';
        break;
      case 'selected':
        base.boxShadow = '0 4px 16px rgba(0,0,0,' + (dark ? '0.20' : '0.12') + ')';
        base.transform = 'scale(1.0)';
        break;
      case 'focus':
        base.boxShadow = '0 4px 16px rgba(0,0,0,' + (dark ? '0.20' : '0.12') + ')';
        base.transform = 'scale(1.0)';
        break;
      case 'drop':
        base.boxShadow = '0 2px 8px rgba(0,0,0,' + (dark ? '0.10' : '0.08') + ')';
        base.transform = 'scale(1.0)';
        break;
    }

    if (isSelected) {
      base.border = `1px solid ${dark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.25)'}`;
    }

    if (cardState === 'focus') {
      base.outline = dark
        ? '2px solid rgba(255, 255, 255, 0.60)'
        : '2px solid rgba(0, 0, 0, 0.50)';
      base.outlineOffset = '3px';
    }

    return base;
  }, [cardState, isSelected, dark]);

  // Drop animation: spring settle to REST over 280ms
  useEffect(() => {
    if (cardState === 'drop') {
      setIsDropAnimating(true);
      const timer = setTimeout(() => {
        setCardState('rest');
        setIsDropAnimating(false);
      }, 280);
      return () => clearTimeout(timer);
    }
  }, [cardState]);

  const handlePointerEnter = useCallback(() => {
    if (cardState !== 'drag' && cardState !== 'selected') {
      setCardState('hover');
    }
  }, [cardState]);

  const handlePointerLeave = useCallback(() => {
    if (cardState === 'hover') {
      setCardState('rest');
    }
  }, [cardState]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    // Don't start drag on interactive elements
    const target = e.target as HTMLElement;
    if (
      target.closest('.card-note-editor') ||
      target.closest('a') ||
      target.closest('button') ||
      target.closest('input') ||
      target.closest('[contenteditable]')
    ) {
      return;
    }
    setCardState('drag');
    onDragStart(e);
  }, [onDragStart]);

  const handlePointerUp = useCallback(() => {
    if (cardState === 'drag') {
      setCardState('drop');
    }
  }, [cardState]);

  const handleClick = useCallback((e: React.MouseEvent) => {
    onSelect(e.ctrlKey || e.metaKey);
  }, [onSelect]);

  const handleFocus = useCallback(() => {
    if (cardState !== 'drag') {
      setCardState('focus');
    }
  }, [cardState]);

  const handleBlur = useCallback(() => {
    if (cardState === 'focus') {
      setCardState('rest');
    }
  }, [cardState]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelect(e.ctrlKey || e.metaKey);
    }
    if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      // Delete handled by parent
    }
  }, [onSelect]);

  // Glass class based on tier
  const glassClass = 'glass-card';

  const stateOverlay = cardState === 'hover' ? { background: 'var(--state-hover)' } : {};

  return (
    <div
      ref={cardRef}
      role="article"
      aria-label={`${item.content.title || 'Untitled'} — ${item.type} — added ${timeAgo(item.created_at)}`}
      aria-posinset={ariaPosinset}
      aria-setsize={ariaSetsize}
      tabIndex={tabIndex}
      className={`canvas-card ${glassClass} ${className} ${isSelected ? 'selected' : ''} state-${cardState} ${isDropAnimating ? 'drop-animating' : ''}`}
      data-id={item.id}
      data-type={item.type}
      style={{
        left: item.x,
        top: item.y,
        width: item.width,
        zIndex: item.z_index,
        borderRadius: '12px',
        transition: cardState === 'drop'
          ? 'transform 280ms cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 280ms cubic-bezier(0.34, 1.56, 0.64, 1)'
          : cardState === 'drag'
            ? 'none'
            : 'transform 160ms var(--ease-out), box-shadow 160ms var(--ease-out)',
        ...getStateStyles(),
      }}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onClick={handleClick}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
    >
      {/* Glass overlay layer */}
      <div className="card-glass-layer" aria-hidden="true" />

      {/* State hover overlay */}
      {cardState === 'hover' && (
        <div className="card-state-overlay" style={stateOverlay} aria-hidden="true" />
      )}

      {/* Accent dot: 4×4px, top-right, above glass, never refracted */}
      <div
        className="card-accent-dot"
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: '8px',
          right: '8px',
          width: '4px',
          height: '4px',
          borderRadius: '50%',
          background: accent,
          zIndex: 10,
        }}
      />

      {/* Card content rendered by children */}
      <div className="card-content-wrapper">
        {children}
      </div>
    </div>
  );
};

export default BaseCard;
