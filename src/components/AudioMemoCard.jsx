/**
 * LOOKING GLASS — AudioMemoCard
 * Voice memo card. Record directly on the canvas, visualise as animated waveform.
 * Audio stored as Blob in IndexedDB. Plays back inline. No external deps needed.
 *
 * INTEGRATION:
 *   1. Add ITEM_TYPES.AUDIO = 'audio' to src/data/schema.js
 *   2. Add addAudio() action to useStore.js (see bottom of this file)
 *   3. Add case ITEM_TYPES.AUDIO → <AudioMemoCard> in CanvasCard.jsx
 *   4. Add an Audio button to Toolbar.jsx and LiquidGlassSidebar.jsx
 *
 * Schema for audio items:
 *   content.title            — auto-generated timestamp or user label
 *   content.audio_blob_id    — ID in IndexedDB blobs store
 *   content.duration_ms      — recording duration in ms
 *   meta.recording_date      — ISO timestamp
 *   meta.transcription       — optional AI transcription (future)
 */

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
} from 'react';
import {
  Microphone,
  Stop,
  Play,
  Pause,
  Trash,
  Waveform,
  WarningCircle,
  ArrowClockwise,
} from '@phosphor-icons/react';
import { store as idbStore } from '../data/store.js';

// ─────────────────────────────────────────────────────────────
// WAVEFORM CANVAS — animated bars
// ─────────────────────────────────────────────────────────────

function WaveformCanvas({ analyser, isRecording, isPlaying, audioBuffer, currentTime, duration }) {
  const canvasRef = useRef(null);
  const rafId     = useRef(null);

  // Live recording waveform
  useEffect(() => {
    if (!isRecording || !analyser) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx    = canvas.getContext('2d');
    const dpr    = window.devicePixelRatio || 1;
    const W      = canvas.width  / dpr;
    const H      = canvas.height / dpr;
    const bars   = 40;
    const gap    = 2;
    const barW   = (W - gap * (bars - 1)) / bars;
    const data   = new Uint8Array(analyser.frequencyBinCount);

    const draw = () => {
      analyser.getByteFrequencyData(data);
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (let i = 0; i < bars; i++) {
        const idx    = Math.floor((i / bars) * data.length);
        const norm   = data[idx] / 255;
        const barH   = Math.max(2, norm * H * 0.85);
        const x      = i * (barW + gap);
        const y      = (H - barH) / 2;
        const alpha  = 0.35 + norm * 0.65;
        ctx.fillStyle = `rgba(245,245,245,${alpha})`;
        ctx.beginPath();
        ctx.roundRect(x, y, barW, barH, barW / 2);
        ctx.fill();
      }
      rafId.current = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(rafId.current);
  }, [isRecording, analyser]);

  // Playback progress bars (static waveform from buffer)
  useEffect(() => {
    if (isRecording || !audioBuffer) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx  = canvas.getContext('2d');
    const dpr  = window.devicePixelRatio || 1;
    const W    = canvas.width  / dpr;
    const H    = canvas.height / dpr;
    const bars = 60;
    const gap  = 1.5;
    const barW = (W - gap * (bars - 1)) / bars;

    // Downsample channel data to bars
    const channelData = audioBuffer.getChannelData(0);
    const step        = Math.floor(channelData.length / bars);
    const progress    = duration > 0 ? currentTime / duration : 0;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let i = 0; i < bars; i++) {
      let sum = 0;
      for (let j = 0; j < step; j++) {
        sum += Math.abs(channelData[i * step + j] || 0);
      }
      const norm   = Math.min(sum / step / 0.4, 1); // amplify and clamp
      const barH   = Math.max(2, norm * H * 0.75);
      const x      = i * (barW + gap);
      const y      = (H - barH) / 2;
      const played = i / bars < progress;
      ctx.fillStyle = played
        ? 'rgba(245,245,245,0.85)'
        : 'rgba(255,255,255,0.18)';
      ctx.beginPath();
      ctx.roundRect(x, y, barW, barH, barW / 2);
      ctx.fill();
    }
  }, [isRecording, audioBuffer, currentTime, duration]);

  return (
    <canvas
      ref={canvasRef}
      width={280 * (window.devicePixelRatio || 1)}
      height={52  * (window.devicePixelRatio || 1)}
      style={{
        width:  '100%',
        height: '52px',
        display: 'block',
      }}
    />
  );
}

// ─────────────────────────────────────────────────────────────
// AUDIO MEMO CARD
// ─────────────────────────────────────────────────────────────

export function AudioMemoCard({
  item,
  isSelected,
  onSelect,
  onDragStart,
  onSave,
  onDelete,
}) {
  const blobId = item.content?.audio_blob_id;

  // ── Recorder state ────────────────────────────────────
  const [recState,    setRecState]    = useState('idle'); // idle | recording | done | error
  const [playState,   setPlayState]   = useState('paused'); // playing | paused
  const [currentTime, setCurrentTime] = useState(0);
  const [duration,    setDuration]    = useState(item.content?.duration_ms ? item.content.duration_ms / 1000 : 0);
  const [audioBuffer, setAudioBuffer] = useState(null);

  const mediaRecRef   = useRef(null);
  const chunksRef     = useRef([]);
  const analyserRef   = useRef(null);
  const audioCtxRef   = useRef(null);
  const sourceNodeRef = useRef(null);
  const audioElRef    = useRef(null);
  const timerRef      = useRef(null);
  const startTimeRef  = useRef(0);
  const [elapsedMs,   setElapsedMs]   = useState(0);

  // ── Load audio blob from IndexedDB ───────────────────
  useEffect(() => {
    if (!blobId) return;
    let url = null;
    (async () => {
      const blob = await idbStore.getBlob(blobId);
      if (!blob) return;
      url = URL.createObjectURL(blob);
      if (audioElRef.current) {
        audioElRef.current.src = url;
      }
      // Decode for waveform
      const arrayBuf = await blob.arrayBuffer();
      const ctx      = new AudioContext();
      const decoded  = await ctx.decodeAudioData(arrayBuf);
      setAudioBuffer(decoded);
      setDuration(decoded.duration);
      ctx.close();
    })();
    return () => { if (url) URL.revokeObjectURL(url); };
  }, [blobId]);

  // ── Start recording ───────────────────────────────────
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const ctx    = new AudioContext();
      audioCtxRef.current = ctx;

      const source   = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 128;
      source.connect(analyser);
      analyserRef.current = analyser;

      const rec = new MediaRecorder(stream);
      mediaRecRef.current = rec;
      chunksRef.current   = [];

      rec.ondataavailable = (e) => { if (e.data.size) chunksRef.current.push(e.data); };
      rec.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const ms   = Date.now() - startTimeRef.current;
        const bid  = `audio-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        await idbStore.saveBlob(bid, blob);
        await onSave?.({
          content: {
            title:          item.content?.title || `Memo ${new Date().toLocaleTimeString()}`,
            audio_blob_id:  bid,
            duration_ms:    ms,
          },
          meta: { recording_date: new Date().toISOString() },
        });
        stream.getTracks().forEach((t) => t.stop());
        ctx.close();
        setElapsedMs(ms);
        setRecState('done');
      };

      rec.start(100);
      startTimeRef.current = Date.now();
      setRecState('recording');

      // Elapsed counter
      timerRef.current = setInterval(() => {
        setElapsedMs(Date.now() - startTimeRef.current);
      }, 100);
    } catch (err) {
      console.error('AudioMemoCard: mic error', err);
      setRecState('error');
    }
  }, [item.content?.title, onSave]);

  const stopRecording = useCallback(() => {
    mediaRecRef.current?.stop();
    clearInterval(timerRef.current);
  }, []);

  // ── Playback ──────────────────────────────────────────
  const togglePlay = useCallback(() => {
    const el = audioElRef.current;
    if (!el) return;
    if (playState === 'playing') {
      el.pause();
      setPlayState('paused');
    } else {
      el.play();
      setPlayState('playing');
    }
  }, [playState]);

  // ── Elapsed timer format ──────────────────────────────
  const formatTime = (ms) => {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    return `${m}:${String(s % 60).padStart(2, '0')}`;
  };

  const isRecording = recState === 'recording';
  const hasMemo     = !!blobId || recState === 'done';

  return (
    <div
      className={`canvas-card card-audio ${isSelected ? 'selected' : ''}`}
      data-id={item.id}
      data-type={item.type}
      style={{
        position: 'absolute',
        left: item.x,
        top: item.y,
        width: item.width || 300,
        borderRadius: '12px',
        background: isRecording
          ? 'rgba(30,10,10,0.82)'
          : 'rgba(14,14,14,0.78)',
        backdropFilter: 'blur(16px) saturate(108%)',
        WebkitBackdropFilter: 'blur(16px) saturate(108%)',
        border: isSelected
          ? '1px solid rgba(255,255,255,0.30)'
          : isRecording
          ? '1px solid rgba(215,25,33,0.40)'
          : '1px solid rgba(255,255,255,0.08)',
        boxShadow: isRecording
          ? '0 0 0 3px rgba(215,25,33,0.15), 0 8px 32px rgba(0,0,0,0.60)'
          : '0 4px 20px rgba(0,0,0,0.55)',
        userSelect: 'none',
        cursor: 'grab',
        transition: 'border-color 0.2s ease, background 0.2s ease',
        overflow: 'hidden',
      }}
      onPointerDown={onDragStart}
      onClick={(e) => onSelect(e.ctrlKey || e.metaKey)}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '12px 14px 8px',
        }}
      >
        <Microphone
          size={14}
          weight="regular"
          style={{ color: isRecording ? 'var(--color-accent)' : 'var(--text-secondary)', flexShrink: 0 }}
        />
        <span
          style={{
            flex: 1,
            fontFamily: 'var(--font-body)',
            fontSize: '13px',
            fontWeight: 500,
            color: 'var(--text-primary)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {item.content?.title || 'Voice Memo'}
        </span>
        <span
          style={{
            fontFamily: 'var(--font-ui)',
            fontSize: '10px',
            color: isRecording ? 'var(--color-accent)' : 'var(--text-disabled)',
            letterSpacing: '0.04em',
            flexShrink: 0,
          }}
        >
          {isRecording ? `● ${formatTime(elapsedMs)}` : formatTime(hasMemo ? duration * 1000 : 0)}
        </span>
      </div>

      {/* Separator */}
      <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)' }} />

      {/* Waveform area */}
      <div style={{ padding: '12px 14px' }}>
        {recState === 'error' ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              height: '52px',
              color: 'var(--text-disabled)',
              fontFamily: 'var(--font-ui)',
              fontSize: '10px',
              letterSpacing: '0.08em',
            }}
          >
            <WarningCircle size={16} weight="regular" />
            MICROPHONE ACCESS DENIED
          </div>
        ) : (
          <WaveformCanvas
            analyser={isRecording ? analyserRef.current : null}
            isRecording={isRecording}
            isPlaying={playState === 'playing'}
            audioBuffer={audioBuffer}
            currentTime={currentTime}
            duration={duration}
          />
        )}
      </div>

      {/* Hidden audio element */}
      <audio
        ref={audioElRef}
        onTimeUpdate={(e) => setCurrentTime(e.target.currentTime)}
        onEnded={() => setPlayState('paused')}
        onDurationChange={(e) => setDuration(e.target.duration)}
        style={{ display: 'none' }}
      />

      {/* Controls */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 14px 12px',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Left: record / stop */}
        {!hasMemo ? (
          <button
            onClick={isRecording ? stopRecording : startRecording}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              height: '32px',
              padding: '0 14px',
              borderRadius: '8px',
              border: `1px solid ${isRecording ? 'rgba(215,25,33,0.40)' : 'rgba(255,255,255,0.12)'}`,
              background: isRecording ? 'rgba(215,25,33,0.12)' : 'rgba(255,255,255,0.06)',
              color: isRecording ? 'var(--color-accent)' : 'var(--text-secondary)',
              fontFamily: 'var(--font-ui)',
              fontSize: '10px',
              letterSpacing: '0.08em',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            {isRecording
              ? <><Stop size={11} weight="fill" /> STOP</>
              : <><Microphone size={11} weight="regular" /> RECORD</>}
          </button>
        ) : (
          <button
            onClick={togglePlay}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              border: '1px solid rgba(255,255,255,0.12)',
              background: 'rgba(255,255,255,0.06)',
              color: 'var(--text-primary)',
              cursor: 'pointer',
              transition: 'background 0.12s ease',
            }}
            aria-label={playState === 'playing' ? 'Pause' : 'Play'}
          >
            {playState === 'playing'
              ? <Pause size={14} weight="fill" />
              : <Play  size={14} weight="fill" />}
          </button>
        )}

        {/* Right: delete */}
        <button
          onClick={(e) => { e.stopPropagation(); onDelete?.(); }}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '28px',
            height: '28px',
            borderRadius: '6px',
            border: 'none',
            background: 'transparent',
            color: 'var(--text-disabled)',
            cursor: 'pointer',
          }}
          aria-label="Delete memo"
        >
          <Trash size={13} weight="regular" />
        </button>
      </div>

      {/* Recording pulse ring */}
      {isRecording && (
        <div
          style={{
            position: 'absolute',
            top: '12px',
            right: '12px',
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: 'var(--color-accent)',
            animation: 'audio-pulse 1s ease infinite',
          }}
        />
      )}
      <style>{`
        @keyframes audio-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: 0.4; transform: scale(1.4); }
        }
      `}</style>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// STORE ACTION — paste into useStore.js
// ─────────────────────────────────────────────────────────────

/**
 * Add this to the useStore create() body:
 *
 *   addAudio: async () => {
 *     const state = get();
 *     const vp    = state.viewport;
 *     const x     = (-vp.x + 400) / vp.scale;
 *     const y     = (-vp.y + 300) / vp.scale;
 *     return get().addItem({
 *       type:    ITEM_TYPES.AUDIO,
 *       x, y,
 *       width:   300,
 *       content: {
 *         title:         `Memo ${new Date().toLocaleTimeString()}`,
 *         audio_blob_id: null,
 *         duration_ms:   0,
 *       },
 *       meta: { recording_date: null },
 *     });
 *   },
 */

export default AudioMemoCard;
