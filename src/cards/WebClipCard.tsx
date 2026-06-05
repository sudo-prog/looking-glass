/**
 * LOOKING GLASS — Web Clip Card Component
 * URL paste with metadata card using BaseCard.
 */

import React from 'react';
import { BaseCard, BaseCardProps } from './BaseCard';
import { Globe as GlobeIcon } from '@phosphor-icons/react';

interface WebClipCardProps extends Omit<BaseCardProps, 'children'> {}

function escapeHtml(str: string | null | undefined): string {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

export const WebClipCard: React.FC<WebClipCardProps> = (props) => {
  const { item, onLightbox } = props;

  return (
    <BaseCard {...props} accentColor="#3B82F6">
      {/* Full-bleed image area */}
      {item.content.image_url && (
        <div
          className="card-image-area"
          onClick={(e) => { e.stopPropagation(); onLightbox?.(); }}
          style={{ cursor: 'zoom-in' }}
        >
          <img
            src={escapeHtml(item.content.image_url)}
            alt=""
            loading="lazy"
            style={{
              display: 'block',
              width: '100%',
              height: 'auto',
              borderRadius: '12px 12px 0 0',
            }}
          />
        </div>
      )}

      {/* 1px separator */}
      <div
        className="card-separator"
        aria-hidden="true"
        style={{ height: '1px', background: 'var(--color-border)' }}
      />

      {/* Content area */}
      <div className="card-content" style={{ padding: '12px 16px' }}>
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
          {escapeHtml(item.content.title || 'Web Clip')}
        </div>

        {item.content.description && (
          <div
            className="card-description"
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 'var(--text-sm)',
              color: 'var(--text-secondary)',
              marginTop: '6px',
              lineHeight: 'var(--leading-snug)',
            }}
          >
            {escapeHtml(item.content.description)}
          </div>
        )}

        {item.content.url && (
          <a
            href={escapeHtml(item.content.url)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              marginTop: '8px',
              fontFamily: 'var(--font-ui)',
              fontSize: 'var(--text-xs)',
              color: 'var(--text-secondary)',
              textDecoration: 'none',
            }}
          >
            <GlobeIcon size={12} weight="regular" />
            {item.meta?.domain ? escapeHtml(item.meta.domain) : 'Open URL'}
          </a>
        )}

        {/* Embed HTML if present */}
        {item.content.embed_html && (
          <div
            className="card-embed"
            style={{ marginTop: '8px' }}
            dangerouslySetInnerHTML={{ __html: item.content.embed_html }}
          />
        )}
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
        <span>{item.meta?.domain ? escapeHtml(item.meta.domain) : 'WEB CLIP'}</span>
        <span>{new Date(item.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
      </div>
    </BaseCard>
  );
};

export default WebClipCard;
