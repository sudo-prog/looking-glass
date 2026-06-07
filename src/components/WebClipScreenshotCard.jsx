/**
 * LOOKING GLASS — WebClipScreenshotCard
 * Magazine-style full-page screenshot webclip. Spatial's killer feature, done better.
 *
 * Screenshot pipeline:
 *   1. Primary: screenshotone.com (free tier, 100 req/mo — user can supply API key)
 *   2. Fallback: microlink.io /screenshot (free tier)
 *   3. Fallback: urlbox.io (free trial)
 *   4. Last resort: render existing OG image at card aspect ratio
 *
 * The card stores the screenshot as a base64 blob in IndexedDB (blobs store)
 * so it's available offline and loads instantly.
 *
 * INTEGRATION:
 *   - Add ITEM_TYPES.WEB_CLIP_SCREENSHOT = 'web_clip_screenshot' to schema.js
 *   - Add case ITEM_TYPES.WEB_CLIP_SCREENSHOT in CanvasCard.jsx switch
 *   - In meta-fetcher.js, call captureScreenshot(url) after metadata fetch
 *   - Provide optional screenshotone API key via the AIModal / settings panel
 *
 * Usage example (store action):
 *   const meta = await fetchMetadata(url);
 *   const screenshotBlob = await captureScreenshot(url, apiKey);
 *   await addItem({
 *     type: ITEM_TYPES.WEB_CLIP_SCREENSHOT,
 *     content: { ...meta, screenshot_blob_id: screenshotBlob?.blobId },
 *   });
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Globe, ArrowSquareOut, Camera, WarningCircle, ArrowClockwise } from '@phosphor-icons/react';
import { store as idbStore } from '../data/store.js';

// ─────────────────────────────────────────────────────────────
// SCREENSHOT CAPTURE UTILITY
// ─────────────────────────────────────────────────────────────

const SCREENSHOT_APIS = [
  {
    name: 'screenshotone',
    url: (url, key) =>
      key
        ? `https://api.screenshotone.com/take?access_key=${key}&url=${encodeURIComponent(url)}&full_page=false&viewport_width=1440&viewport_height=900&format=jpg&image_quality=80&block_ads=true&block_cookie_banners=true`
        : null,
  },
  {
    name: 'microlink',
    url: (url) =>
      `https://api.microlink.io/?url=${encodeURIComponent(url)}&screenshot=true&meta=false&embed=screenshot.url`,
  },
  {
    name: 'urlbox',
    url: (url, _, token) =>
      token
        ? `https://api.urlbox.io/v1/${token}/png?url=${encodeURIComponent(url)}&width=1440&height=900&thumb_width=800&full_page=false&hide_cookie_banners=true`
        : null,
  },
];

/** Fetches a screenshot blob URL from the best available API. */
export async function captureScreenshot(url, { screenshotoneKey, urlboxToken } = {}) {
  for (const api of SCREENSHOT_APIS) {
    const endpoint = api.url(url, screenshotoneKey, urlboxToken);
    if (!endpoint) continue;

    try {
      let imageUrl = null;

      if (api.name === 'microlink') {
        // Microlink returns JSON; parse to extract screenshot URL
        const resp = await fetch(endpoint, { signal: AbortSignal.timeout(12000) });
        if (!resp.ok) continue;
        const data = await resp.json();
        imageUrl = data?.data?.screenshot?.url || null;
      } else {
        // Direct image endpoint
        const resp = await fetch(endpoint, { signal: AbortSignal.timeout(12000) });
        if (!resp.ok) continue;
        const blob = await resp.blob();
        if (!blob.size) continue;
        // Persist to IndexedDB blobs store
        const blobId = `screenshot-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        await idbStore.saveBlob(blobId, blob);
        return { blobId, objectUrl: URL.createObjectURL(blob), apiUsed: api.name };
      }

      if (imageUrl) {
        // Fetch the resolved image URL and store
        const imgResp = await fetch(imageUrl, { signal: AbortSignal.timeout(12000) });
        if (!imgResp.ok) continue;
        const blob = await imgResp.blob();
        if (!blob.size) continue;
        const blobId = `screenshot-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        await idbStore.saveBlob(blobId, blob);
        return { blobId, objectUrl: URL.createObjectURL(blob), apiUsed: api.name };
      }
    } catch {
      // try next API
    }
  }
  return null; // all APIs failed
}

// ─────────────────────────────────────────────────────────────
// WEBCLIP SCREENSHOT CARD COMPONENT
// ─────────────────────────────────────────────────────────────

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/**
 * Props:
 *   item          {CardItem}
 *   isSelected    {boolean}
 *   onSelect      {(multi) => void}
 *   onDragStart   {(e) => void}
 *   onSave        {(updates) => void}
 *   onDelete      {() => void}
 *   onLightbox    {() => void}
 */
export function WebClipScreenshotCard({
  item,
  isSelected,
  onSelect,
  onDragStart,
  onSave,
  onDelete,
  onLightbox,
}) {
  const [screenshotUrl, setScreenshotUrl] = useState(null);
  const [loadStatus,    setLoadStatus]    = useState('loading'); // loading | ok | error | capturing
  const [progress,      setProgress]      = useState(0);

  // ── Load screenshot from IndexedDB blob ─────────────────
  useEffect(() => {
    const blobId = item.content?.screenshot_blob_id;
    if (!blobId) {
      // No screenshot stored yet — use OG image as fallback
      setScreenshotUrl(item.content?.image_url || null);
      setLoadStatus(item.content?.image_url ? 'ok' : 'error');
      return;
    }

    let objectUrl = null;
    idbStore.getBlob(blobId).then((blob) => {
      if (blob) {
        objectUrl = URL.createObjectURL(blob);
        setScreenshotUrl(objectUrl);
        setLoadStatus('ok');
      } else {
        setScreenshotUrl(item.content?.image_url || null);
        setLoadStatus(item.content?.image_url ? 'ok' : 'error');
      }
    });

    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [item.content?.screenshot_blob_id, item.content?.image_url]);

  // ── Recapture ─────────────────────────────────────────
  const handleRecapture = useCallback(
    async (e) => {
      e.stopPropagation();
      if (!item.content?.url) return;
      setLoadStatus('capturing');
      setProgress(10);

      // Animate progress (fake but reassuring)
      const interval = setInterval(() => {
        setProgress((p) => Math.min(p + 8, 85));
      }, 400);

      try {
        const apiKeys = (() => {
          try { return JSON.parse(localStorage.getItem('lg-screenshot-keys') || '{}'); } catch { return {}; }
        })();

        const result = await captureScreenshot(item.content.url, apiKeys);
        clearInterval(interval);
        setProgress(100);

        if (result) {
          await onSave?.({ content: { screenshot_blob_id: result.blobId } });
          setScreenshotUrl(result.objectUrl);
          setLoadStatus('ok');
        } else {
          setLoadStatus('error');
        }
      } catch {
        clearInterval(interval);
        setLoadStatus('error');
      }
    },
    [item.content?.url, onSave],
  );

  const domain = item.meta?.domain || (() => {
    try { return new URL(item.content?.url || '').hostname; } catch { return null; }
  })();

  return (
    <div
      className={`canvas-card card-webclip-screenshot ${isSelected ? 'selected' : ''}`}
      data-id={item.id}
      data-type={item.type}
      style={{
        position: 'absolute',
        left: item.x,
        top: item.y,
        width: item.width || 320,
        borderRadius: '12px',
        overflow: 'hidden',
        background: 'rgba(14,14,14,0.75)',
        backdropFilter: 'blur(16px) saturate(108%)',
        WebkitBackdropFilter: 'blur(16px) saturate(108%)',
        border: isSelected
          ? '1px solid rgba(255,255,255,0.30)'
          : '1px solid rgba(255,255,255,0.08)',
        boxShadow: isSelected
          ? '0 8px 32px rgba(0,0,0,0.60), 0 0 0 3px rgba(255,255,255,0.08)'
          : '0 4px 20px rgba(0,0,0,0.55)',
        cursor: 'grab',
        userSelect: 'none',
        transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
      }}
      onPointerDown={onDragStart}
      onClick={(e) => onSelect(e.ctrlKey || e.metaKey)}
    >
      {/* Magazine screenshot area — 16:10 aspect ratio */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          paddingBottom: '62.5%', // 16:10
          background: 'rgba(10,10,10,0.80)',
          overflow: 'hidden',
        }}
        onClick={(e) => { e.stopPropagation(); onLightbox?.(); }}
      >
        {/* Screenshot image */}
        {screenshotUrl && loadStatus === 'ok' && (
          <img
            src={screenshotUrl}
            alt={escapeHtml(item.content?.title || 'Web clip')}
            loading="lazy"
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              objectPosition: 'top left',
              cursor: 'zoom-in',
            }}
          />
        )}

        {/* Loading shimmer */}
        {loadStatus === 'loading' && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(90deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.06) 50%, rgba(255,255,255,0.03) 100%)',
              backgroundSize: '200% 100%',
              animation: 'shimmer 1.4s ease infinite',
            }}
          />
        )}

        {/* Capturing progress */}
        {loadStatus === 'capturing' && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
            }}
          >
            <Camera size={24} weight="regular" style={{ color: 'var(--text-secondary)' }} />
            <div
              style={{
                fontFamily: 'var(--font-ui)',
                fontSize: '9px',
                color: 'var(--text-secondary)',
                letterSpacing: '0.10em',
              }}
            >
              CAPTURING… {progress}%
            </div>
            <div
              style={{
                width: '80px',
                height: '2px',
                background: 'var(--color-border)',
                borderRadius: '1px',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${progress}%`,
                  background: 'var(--text-secondary)',
                  borderRadius: '1px',
                  transition: 'width 0.4s ease',
                }}
              />
            </div>
          </div>
        )}

        {/* Error / no screenshot state */}
        {loadStatus === 'error' && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
            }}
          >
            <WarningCircle size={20} weight="regular" style={{ color: 'var(--text-disabled)' }} />
            <span
              style={{
                fontFamily: 'var(--font-ui)',
                fontSize: '9px',
                color: 'var(--text-disabled)',
                letterSpacing: '0.08em',
              }}
            >
              NO SCREENSHOT
            </span>
            {item.content?.url && (
              <button
                onClick={handleRecapture}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  border: '1px solid var(--color-border)',
                  background: 'transparent',
                  color: 'var(--text-secondary)',
                  fontFamily: 'var(--font-ui)',
                  fontSize: '9px',
                  cursor: 'pointer',
                  letterSpacing: '0.08em',
                }}
              >
                <Camera size={11} weight="regular" />
                CAPTURE
              </button>
            )}
          </div>
        )}

        {/* Recapture button (top-right, on hover) */}
        {loadStatus === 'ok' && item.content?.url && (
          <button
            className="webclip-recapture-btn"
            onClick={handleRecapture}
            title="Recapture screenshot"
            style={{
              position: 'absolute',
              top: '8px',
              right: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '28px',
              height: '28px',
              borderRadius: '8px',
              border: '1px solid rgba(255,255,255,0.15)',
              background: 'rgba(0,0,0,0.60)',
              color: 'rgba(255,255,255,0.70)',
              cursor: 'pointer',
              backdropFilter: 'blur(8px)',
              opacity: 0,
              transition: 'opacity 0.15s ease',
            }}
          >
            <ArrowClockwise size={12} weight="regular" />
          </button>
        )}

        {/* Shim: show recapture button on hover via CSS */}
        <style>{`
          .card-webclip-screenshot:hover .webclip-recapture-btn { opacity: 1 !important; }
          @keyframes shimmer {
            0%   { background-position: 200% 0; }
            100% { background-position: -200% 0; }
          }
        `}</style>
      </div>

      {/* 1px separator */}
      <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)' }} />

      {/* Content: title + domain */}
      <div style={{ padding: '10px 14px 4px' }}>
        <div
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: '14px',
            fontWeight: 500,
            color: 'var(--text-primary)',
            lineHeight: 1.35,
            overflow: 'hidden',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
          }}
        >
          {escapeHtml(item.content?.title || 'Web Clip')}
        </div>

        {item.content?.description && (
          <div
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: '12px',
              color: 'var(--text-secondary)',
              marginTop: '4px',
              lineHeight: 1.45,
              overflow: 'hidden',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
            }}
          >
            {escapeHtml(item.content.description)}
          </div>
        )}
      </div>

      {/* Footer: domain + open link */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 14px',
          borderTop: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          {/* Favicon */}
          {domain && (
            <img
              src={`https://www.google.com/s2/favicons?domain=${domain}&sz=16`}
              alt=""
              width={12}
              height={12}
              style={{ borderRadius: '2px', opacity: 0.7 }}
              onError={(e) => { e.target.style.display = 'none'; }}
            />
          )}
          <span
            style={{
              fontFamily: 'var(--font-ui)',
              fontSize: '10px',
              letterSpacing: '0.04em',
              color: 'var(--text-secondary)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              maxWidth: '160px',
            }}
          >
            {domain || 'WEB CLIP'}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span
            style={{
              fontFamily: 'var(--font-ui)',
              fontSize: '9px',
              color: 'var(--text-disabled)',
            }}
          >
            {new Date(item.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </span>
          {item.content?.url && (
            <a
              href={escapeHtml(item.content.url)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '22px',
                height: '22px',
                borderRadius: '6px',
                border: '1px solid rgba(255,255,255,0.10)',
                background: 'transparent',
                color: 'var(--text-secondary)',
                textDecoration: 'none',
                transition: 'background 0.1s ease, color 0.1s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--state-hover)';
                e.currentTarget.style.color = 'var(--text-primary)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = 'var(--text-secondary)';
              }}
            >
              <ArrowSquareOut size={11} weight="regular" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

export default WebClipScreenshotCard;
