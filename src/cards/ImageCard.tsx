/**
 * LOOKING GLASS — Image Card Component
 * Upload/paste image card using BaseCard.
 */

import React from 'react';
import { BaseCard, BaseCardProps } from './BaseCard';
import { Image as ImageIcon } from '@phosphor-icons/react';

interface ImageCardProps extends Omit<BaseCardProps, 'children'> {}

function escapeHtml(str: string | null | undefined): string {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

export const ImageCard: React.FC<ImageCardProps> = (props) => {
  const { item, onLightbox } = props;

  return (
    <BaseCard {...props} accentColor="var(--color-success)">
      {/* Full-bleed image area (no glass over image) */}
      {item.content.image_url ? (
        <div
          className="card-image-area"
          onClick={(e) => { e.stopPropagation(); onLightbox?.(); }}
          style={{ cursor: 'zoom-in' }}
        >
          <img
            src={escapeHtml(item.content.image_url)}
            alt={item.content.title || 'Image'}
            loading="lazy"
            style={{
              display: 'block',
              width: '100%',
              height: 'auto',
              borderRadius: '12px 12px 0 0',
            }}
          />
        </div>
      ) : (
        <div
          className="card-image-placeholder"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            padding: '32px 16px',
            fontFamily: 'var(--font-ui)',
            fontSize: 'var(--text-xs)',
            color: 'var(--text-disabled)',
            textTransform: 'uppercase',
            letterSpacing: '0.12em',
          }}
        >
          <ImageIcon size={20} weight="regular" />
          <span>[NO IMAGE]</span>
        </div>
      )}

      {/* 1px separator */}
      <div
        className="card-separator"
        aria-hidden="true"
        style={{ height: '1px', background: 'var(--color-border)' }}
      />

      {/* Title */}
      <div
        className="card-content"
        style={{ padding: '12px 16px' }}
      >
        <div
          className="card-title"
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 'var(--text-base)',
            color: 'var(--text-primary)',
            fontWeight: 500,
            lineHeight: 'var(--leading-snug)',
          }}
        >
          {escapeHtml(item.content.title || 'Image')}
        </div>
      </div>

      {/* Metadata row */}
      <div
        className="card-metadata"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '8px 16px',
          fontFamily: 'var(--font-ui)',
          fontSize: '10px',
          textTransform: 'uppercase',
          letterSpacing: '0.12em',
          color: 'var(--text-secondary)',
          borderTop: '1px solid var(--color-border)',
        }}
      >
        <span>IMAGE</span>
        <span>{new Date(item.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
      </div>
    </BaseCard>
  );
};

export default ImageCard;
