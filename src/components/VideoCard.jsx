/**
 * LOOKING GLASS — VideoCard
 * Renders dropped/pasted video files as inline playable cards on the canvas.
 * Video stored as Blob in IndexedDB. Hover to play, click for fullscreen.
 *
 * INTEGRATION:
 *   1. Add ITEM_TYPES.VIDEO = 'video' already exists in schema.js ✓
 *   2. Add addVideo() action to useStore.js (see bottom of file)
 *   3. Add case ITEM_TYPES.VIDEO → <VideoCard> in CanvasCard.jsx
 *   4. Handle 'video' drops in DropZoneHandler → App.jsx handleDrop
 */

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
} from 'react';
import {
  Play,
  Pause,
  SpeakerSimpleHigh,
  SpeakerSimpleSlash,
  ArrowsOut,
  FilmSlate,
} from '@phosphor-icons/react';
import { store as idbStore } from '../data/store.js';

function escapeHtml(str) {
  if (!str) return '';
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

function formatDur(secs) {
  if (!isFinite(secs)) return '0:00';
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function VideoCard({
  item,
  isSelected,
  onSelect,
  onDragStart,
  onSave,
  onDelete,
  onLightbox,
}) {
  const [srcUrl,    setSrcUrl]    = useState(null);
  const [playing,   setPlaying]   = useState(false);
  const [muted,     setMuted]     = useState(true);
  const [progress,  setProgress]  = useState(0); // 0–1
  const [duration,  setDuration]  = useState(0);
  const [hovered,   setHovered]   = useState(false);
  const [loadState, setLoadState] = useState('loading');

  const videoRef  = useRef(null);
  const blobId    = item.content?.video_blob_id;

  // ── Load blob ────────────────────────────────────────
  useEffect(() => {
    if (!blobId) {
      // If there's a direct objectUrl (e.g. newly dropped, not yet persisted)
      if (item.content?.object_url) {
        setSrcUrl(item.content.object_url);
        setLoadState('ok');
      } else {
        setLoadState('error');
      }
      return;
    }

    let url = null;
    idbStore.getBlob(blobId).then((blob) => {
      if (blob) {
        url = URL.createObjectURL(blob);
        setSrcUrl(url);
        setLoadState('ok');
      } else {
        setLoadState('error');
      }
    });
    return () => { if (url) URL.revokeObjectURL(url); };
  }, [blobId, item.content?.object_url]);

  // ── Autoplay loop on mount ─────────────────────────────
  // Visuals.mp4 shows every video card playing continuously, muted, as a
  // living thumbnail — not gated behind hover. Hover now only reveals the
  // scrub/controls overlay; playback itself runs independently.
  useEffect(() => {
    if (loadState !== 'ok' || !videoRef.current) return;
    const vid = videoRef.current;
    vid.muted = true;
    const tryPlay = () => vid.play().catch(() => {});
    if (vid.readyState >= 2) tryPlay();
    else vid.addEventListener('loadeddata', tryPlay, { once: true });
    setPlaying(true);
    return () => vid.removeEventListener('loadeddata', tryPlay);
  }, [loadState]);

  // ── Hover → reveal controls only (playback is independent now) ───────
  const handleMouseEnter = useCallback(() => {
    setHovered(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setHovered(false);
  }, []);

  const togglePlay = useCallback((e) => {
    e.stopPropagation();
    if (!videoRef.current) return;
    if (playing) {
      videoRef.current.pause();
      setPlaying(false);
    } else {
      videoRef.current.play().catch(() => {});
      setPlaying(true);
    }
  }, [playing]);

  const toggleMute = useCallback((e) => {
    e.stopPropagation();
    if (!videoRef.current) return;
    videoRef.current.muted = !videoRef.current.muted;
    setMuted(videoRef.current.muted);
  }, []);

  const handleTimeUpdate = useCallback(() => {
    if (!videoRef.current) return;
    const { currentTime, duration: dur } = videoRef.current;
    setProgress(dur > 0 ? currentTime / dur : 0);
  }, []);

  const handleSeek = useCallback((e) => {
    e.stopPropagation();
    if (!videoRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const frac = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    videoRef.current.currentTime = frac * videoRef.current.duration;
  }, []);

  return (
    <div
      className={`canvas-card card-video ${isSelected ? 'selected' : ''}`}
      data-id={item.id}
      data-type={item.type}
      style={{
        position: 'absolute',
        left: item.x,
        top: item.y,
        width: item.width || 320,
        borderRadius: '12px',
        overflow: 'hidden',
        background: '#000',
        border: isSelected
          ? '1px solid rgba(255,255,255,0.30)'
          : '1px solid rgba(255,255,255,0.08)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.60)',
        cursor: 'grab',
        userSelect: 'none',
        transition: 'border-color 0.15s ease',
      }}
      onPointerDown={onDragStart}
      onClick={(e) => onSelect(e.ctrlKey || e.metaKey)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Video area */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          paddingBottom: '56.25%', // 16:9
          background: '#0A0A0A',
          overflow: 'hidden',
        }}
      >
        {srcUrl && loadState === 'ok' ? (
          <video
            ref={videoRef}
            src={srcUrl}
            muted={muted}
            loop
            playsInline
            preload="metadata"
            onTimeUpdate={handleTimeUpdate}
            onDurationChange={(e) => setDuration(e.target.duration)}
            onEnded={() => setPlaying(false)}
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
        ) : loadState === 'loading' ? (
          <div style={centeredStyle}>
            <FilmSlate size={28} weight="regular" style={{ color: 'rgba(255,255,255,0.20)' }} />
          </div>
        ) : (
          <div style={centeredStyle}>
            <FilmSlate size={28} weight="regular" style={{ color: 'var(--color-accent)' }} />
            <span style={{ fontFamily: 'var(--font-ui)', fontSize: '9px', color: 'var(--text-disabled)' }}>
              VIDEO UNAVAILABLE
            </span>
          </div>
        )}

        {/* Overlay controls — visible on hover */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-end',
            background: hovered
              ? 'linear-gradient(to top, rgba(0,0,0,0.70) 0%, transparent 60%)'
              : 'transparent',
            transition: 'background 0.2s ease',
          }}
        >
          {hovered && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 10px',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Play/Pause */}
              <button onClick={togglePlay} style={ctrlBtnStyle} aria-label={playing ? 'Pause' : 'Play'}>
                {playing ? <Pause size={13} weight="fill" /> : <Play size={13} weight="fill" />}
              </button>

              {/* Progress bar */}
              <div
                onClick={handleSeek}
                style={{
                  flex: 1,
                  height: '3px',
                  borderRadius: '2px',
                  background: 'rgba(255,255,255,0.20)',
                  cursor: 'pointer',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    left: 0, top: 0, bottom: 0,
                    width: `${progress * 100}%`,
                    background: 'rgba(255,255,255,0.80)',
                    borderRadius: '2px',
                    transition: 'width 0.1s linear',
                  }}
                />
              </div>

              {/* Duration */}
              <span style={{ fontFamily: 'var(--font-ui)', fontSize: '9px', color: 'rgba(255,255,255,0.60)', flexShrink: 0 }}>
                {formatDur(duration)}
              </span>

              {/* Mute */}
              <button onClick={toggleMute} style={ctrlBtnStyle} aria-label={muted ? 'Unmute' : 'Mute'}>
                {muted
                  ? <SpeakerSimpleSlash size={13} weight="regular" />
                  : <SpeakerSimpleHigh  size={13} weight="regular" />}
              </button>

              {/* Fullscreen */}
              <button
                onClick={(e) => { e.stopPropagation(); onLightbox?.(); }}
                style={ctrlBtnStyle}
                aria-label="Fullscreen"
              >
                <ArrowsOut size={13} weight="regular" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Title row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 12px',
          borderTop: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <FilmSlate size={11} weight="regular" style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />
        <span
          style={{
            flex: 1,
            fontFamily: 'var(--font-body)',
            fontSize: '12px',
            fontWeight: 500,
            color: 'var(--text-primary)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {escapeHtml(item.content?.title || 'Video')}
        </span>
        <span style={{ fontFamily: 'var(--font-ui)', fontSize: '9px', color: 'var(--text-disabled)', flexShrink: 0 }}>
          {formatDur(duration)}
        </span>
      </div>
    </div>
  );
}

const centeredStyle = {
  position: 'absolute', inset: 0,
  display: 'flex', flexDirection: 'column',
  alignItems: 'center', justifyContent: 'center', gap: '8px',
};

const ctrlBtnStyle = {
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  width: '26px', height: '26px', border: 'none',
  background: 'rgba(255,255,255,0.12)', borderRadius: '6px',
  color: 'rgba(255,255,255,0.80)', cursor: 'pointer', flexShrink: 0,
};

// ─────────────────────────────────────────────────────────────
// STORE ACTION — paste into useStore.js
// ─────────────────────────────────────────────────────────────

/**
 * addVideo: async (file, objectUrl) => {
 *   const state  = get();
 *   const vp     = state.viewport;
 *   const x      = (-vp.x + 400) / vp.scale;
 *   const y      = (-vp.y + 300) / vp.scale;
 *
 *   // Persist blob
 *   const blobId = `video-${Date.now()}-${Math.random().toString(36).slice(2)}`;
 *   await idbStore.saveBlob(blobId, file);
 *
 *   return get().addItem({
 *     type:    ITEM_TYPES.VIDEO,
 *     x, y,
 *     width:   320,
 *     content: {
 *       title:          file.name.replace(/\.[^.]+$/, ''),
 *       video_blob_id:  blobId,
 *       object_url:     objectUrl, // temp, until blob loads
 *     },
 *   });
 * },
 */

export default VideoCard;
