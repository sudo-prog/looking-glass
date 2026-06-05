/**
 * LOOKING GLASS — Lightbox Component (Phase 5 / V2)
 *
 * Full-screen media viewer.
 * Glass: LIGHTBOX_GLASS_DARK / LIGHTBOX_GLASS_LIGHT on controls overlay.
 * Controls: bottom overlay with glass.
 */
import React, { useEffect, useCallback } from 'react';
import { X, ArrowSquareOut, DownloadSimple } from '@phosphor-icons/react';
import { createPortal } from 'react-dom';

export function Lightbox({ item, onClose }) {
  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [handleKeyDown]);

  const handleBackdropClick = useCallback(
    (e) => {
      if (e.target === e.currentTarget) onClose();
    },
    [onClose]
  );

  if (!item) return null;

  const imageUrl = item.content?.image_url;
  const title = item.content?.title || '';
  const description = item.content?.description || '';
  const url = item.content?.url;

  return createPortal(
    <div
      className="lightbox"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-label="Media viewer"
    >
      {/* Media content */}
      <div className="lightbox__media">
        {imageUrl && (
          <img src={imageUrl} alt={title} className="lightbox__image" />
        )}
      </div>

      {/* Controls overlay — glass */}
      <div className="lightbox__controls glass-lightbox">
        {/* Close */}
        <button
          className="lightbox__btn"
          onClick={onClose}
          type="button"
          aria-label="Close"
        >
          <X size={20} weight="regular" />
        </button>

        <div className="lightbox__spacer" />

        {/* Info */}
        {(title || description) && (
          <div className="lightbox__info">
            {title && <h3 className="lightbox__title">{title}</h3>}
            {description && <p className="lightbox__description">{description}</p>}
          </div>
        )}

        <div className="lightbox__spacer" />

        {/* Actions */}
        {url && (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="lightbox__btn"
            aria-label="Open original"
          >
            <ArrowSquareOut size={20} weight="regular" />
          </a>
        )}
        {imageUrl && (
          <a
            href={imageUrl}
            download
            className="lightbox__btn"
            aria-label="Download"
          >
            <DownloadSimple size={20} weight="regular" />
          </a>
        )}
      </div>
    </div>,
    document.body
  );
}
