/**
 * LOOKING GLASS — Lightbox (V3)
 * Recreates the rich detail view from STACK_BIG_TO_SMALL.mp4:
 *   - Back arrow (top-left) instead of a bare close X
 *   - Left rail of color-tag swatches
 *   - Right metadata panel: Resolution, Size, Date, Color Profile
 *   - Paragraph caption under the image
 *   - Bottom-center glass toolbar: copy + download
 *
 * Props:
 *   item        {CardItem}
 *   onClose     {() => void}
 *   onColor     {(hex|null) => void}   optional — wires up the swatch rail
 */
import React, { useEffect, useCallback, useState } from 'react';
import { ArrowLeft, CopySimple, DownloadSimple, ArrowSquareOut } from '@phosphor-icons/react';
import { createPortal } from 'react-dom';

const COLOR_SWATCHES = ['#FFFFFF', '#9CA3AF', '#111111', '#D71921', '#3B82F6', '#22C55E'];

function formatBytes(bytes) {
  if (!bytes) return '—';
  const units = ['B', 'KB', 'MB', 'GB'];
  let i = 0;
  let val = bytes;
  while (val >= 1024 && i < units.length - 1) {
    val /= 1024;
    i++;
  }
  return `${val.toFixed(val >= 10 ? 0 : 1)} ${units[i]}`;
}

function formatDate(ts) {
  if (!ts) return '—';
  return new Date(ts).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase();
}

export function Lightbox({ item, onClose, onColor }) {
  const [naturalSize, setNaturalSize] = useState(null);
  const [activeColor, setActiveColor] = useState(item?.meta?.color || null);

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose],
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [handleKeyDown]);

  useEffect(() => {
    setActiveColor(item?.meta?.color || null);
    setNaturalSize(null);
  }, [item?.id]);

  const handleBackdropClick = useCallback(
    (e) => {
      if (e.target === e.currentTarget) onClose();
    },
    [onClose],
  );

  const handlePickColor = useCallback(
    (hex) => {
      const next = activeColor === hex ? null : hex;
      setActiveColor(next);
      onColor?.(next);
    },
    [activeColor, onColor],
  );

  const handleCopy = useCallback(() => {
    const text = item?.content?.url || item?.content?.title || '';
    if (text) navigator.clipboard?.writeText(text);
  }, [item]);

  if (!item) return null;

  const imageUrl = item.content?.image_url;
  const title = item.content?.title || 'Untitled';
  const description = item.content?.description || '';
  const url = item.content?.url;

  return createPortal(
    <div
      className="lightbox-v3"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-label="Media viewer"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 'var(--z-lightbox)',
        background: 'rgba(8,8,8,0.94)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Top bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '18px 20px',
          flexShrink: 0,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          aria-label="Back"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            border: '1px solid rgba(255,255,255,0.10)',
            background: 'rgba(255,255,255,0.06)',
            color: 'var(--text-primary)',
            cursor: 'pointer',
          }}
        >
          <ArrowLeft size={17} weight="regular" />
        </button>
      </div>

      {/* Body: swatches | media | metadata */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 'clamp(16px, 4vw, 56px)',
          padding: '0 24px',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Color swatch rail */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
            flexShrink: 0,
          }}
        >
          {COLOR_SWATCHES.map((hex) => (
            <button
              key={hex}
              onClick={() => handlePickColor(hex)}
              aria-label={`Tag color ${hex}`}
              style={{
                width: '22px',
                height: '22px',
                borderRadius: '50%',
                border: activeColor === hex
                  ? '2px solid rgba(255,255,255,0.85)'
                  : '1px solid rgba(255,255,255,0.18)',
                background: hex,
                cursor: 'pointer',
                padding: 0,
                boxShadow: hex === '#FFFFFF' ? 'inset 0 0 0 1px rgba(0,0,0,0.10)' : 'none',
                transition: 'transform 0.12s ease',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.15)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
            />
          ))}
        </div>

        {/* Media + caption */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '18px',
            alignItems: 'center',
            maxWidth: '640px',
            minWidth: 0,
          }}
        >
          {imageUrl && (
            <img
              src={imageUrl}
              alt={title}
              onLoad={(e) => setNaturalSize({ w: e.target.naturalWidth, h: e.target.naturalHeight })}
              style={{
                maxWidth: '100%',
                maxHeight: '52vh',
                objectFit: 'contain',
                borderRadius: '6px',
                boxShadow: '0 24px 64px rgba(0,0,0,0.55)',
                display: 'block',
              }}
            />
          )}

          {description && (
            <p
              style={{
                margin: 0,
                fontFamily: 'var(--font-body)',
                fontSize: '13px',
                lineHeight: 1.6,
                color: 'var(--text-secondary)',
                textAlign: 'left',
                width: '100%',
              }}
            >
              {description}
            </p>
          )}
        </div>

        {/* Metadata panel */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            flexShrink: 0,
            minWidth: '120px',
          }}
        >
          {[
            ['RESOLUTION', naturalSize ? `${naturalSize.w} × ${naturalSize.h}` : '—'],
            ['SIZE', formatBytes(item.meta?.file_size)],
            ['DATE', formatDate(item.created_at)],
            ['COLOR PROFILE', item.meta?.color_profile || 'sRGB IEC61966-2.1'],
          ].map(([label, value]) => (
            <div key={label}>
              <div
                style={{
                  fontFamily: 'var(--font-ui)',
                  fontSize: '9px',
                  letterSpacing: '0.10em',
                  color: 'var(--text-disabled)',
                  marginBottom: '3px',
                }}
              >
                {label}
              </div>
              <div
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: '12px',
                  color: 'var(--text-secondary)',
                }}
              >
                {value}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom glass toolbar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          padding: '20px',
          flexShrink: 0,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            padding: '6px',
            borderRadius: '14px',
            background: 'rgba(16,16,16,0.92)',
            backdropFilter: 'blur(24px) saturate(120%)',
            WebkitBackdropFilter: 'blur(24px) saturate(120%)',
            border: '1px solid rgba(255,255,255,0.10)',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.10), 0 12px 32px rgba(0,0,0,0.55)',
          }}
        >
          <button
            onClick={handleCopy}
            title="Copy link"
            aria-label="Copy link"
            style={{ ...lightboxBtnStyle }}
          >
            <CopySimple size={16} weight="regular" />
          </button>

          {imageUrl && (
            <a
              href={imageUrl}
              download
              title="Download"
              aria-label="Download"
              style={{ ...lightboxBtnStyle, textDecoration: 'none' }}
            >
              <DownloadSimple size={16} weight="regular" />
            </a>
          )}

          {url && (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              title="Open original"
              aria-label="Open original"
              style={{ ...lightboxBtnStyle, textDecoration: 'none' }}
            >
              <ArrowSquareOut size={16} weight="regular" />
            </a>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

const lightboxBtnStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '36px',
  height: '36px',
  borderRadius: '10px',
  border: 'none',
  background: 'transparent',
  color: 'var(--text-primary)',
  cursor: 'pointer',
};

export default Lightbox;
