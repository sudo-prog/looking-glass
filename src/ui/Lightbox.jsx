/**
 * LOOKING GLASS — Lightbox Component (React)
 * Full-screen image viewer
 */
import React, { useEffect } from 'react';

export function Lightbox({ item, onClose }) {
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  if (!item) return null;

  return (
    <div className="lightbox-overlay" onClick={onClose}>
      <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
        <button className="lightbox-close" onClick={onClose}>✕</button>
        {item.content?.image_url && (
          <img src={item.content.image_url} alt={item.content.title || ''} />
        )}
        {item.content?.title && <h3>{item.content.title}</h3>}
        {item.content?.description && <p>{item.content.description}</p>}
        {item.content?.url && (
          <a href={item.content.url} target="_blank" rel="noopener">Open original ↗</a>
        )}
      </div>
    </div>
  );
}
