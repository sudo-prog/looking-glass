/**
 * LOOKING GLASS — Keyframe Timeline (Phase 3: Supercharge Scenes)
 *
 * A basic, functional timeline scrubber for the selected element's keyframes.
 * Shows normalized markers (0..1) along a track and a draggable scrubber
 * (range input). Moving the scrubber calls `onScrub(t)` so the parent can
 * preview the element at time `t`. Adding a keyframe at the current scrub
 * position calls `onAddKeyframe(t)`.
 *
 * This is intentionally simple: it visualizes + scrubs keyframes but does not
 * yet author per-property tween curves (that is a later phase). It is fully
 * wired to scene state via props.
 */

import React from 'react';
import { Plus, Play, Pause } from '@phosphor-icons/react';

/**
 * Props:
 *   element         {object|null}  The selected element (has `.animation.keyframes`).
 *   durationMs      {number}       Scene duration for the time read-out.
 *   currentTime     {number}       Current scrub position 0..1.
 *   playing         {boolean}      Whether the scene is playing.
 *   onScrub         {(t:number) => void}
 *   onAddKeyframe   {(t:number) => void}
 *   onTogglePlay    {() => void}
 *   disabled        {boolean}
 */
export default function KeyframeTimeline({
  element = null,
  durationMs = 3000,
  currentTime = 0,
  playing = false,
  onScrub,
  onAddKeyframe,
  onTogglePlay,
  disabled = false,
}) {
  const keyframes = element?.animation?.keyframes || [];
  const pct = Math.round(currentTime * 100);
  const timeMs = Math.round(currentTime * durationMs);
  const hasSelection = !!element && !disabled;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <div
        style={{
          fontFamily: 'var(--font-ui)',
          fontSize: '9px',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: 'var(--text-disabled)',
          padding: '2px 4px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span>Keyframe Timeline</span>
        <span style={{ color: 'var(--text-disabled)' }}>{pct}% · {timeMs}ms</span>
      </div>

      {/* Transport controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <button
          type="button"
          disabled={!hasSelection}
          onClick={onTogglePlay}
          aria-label={playing ? 'Pause' : 'Play'}
          title={playing ? 'Pause' : 'Play'}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '44px',
            height: '44px',
            minWidth: '44px',
            minHeight: '44px',
            borderRadius: 'var(--radius-md, 8px)',
            border: '1px solid var(--color-border)',
            background: 'var(--glass-frost)',
            color: 'var(--text-secondary)',
            cursor: !hasSelection ? 'not-allowed' : 'pointer',
            opacity: !hasSelection ? 0.45 : 1,
          }}
        >
          {playing ? <Pause size={16} weight="regular" /> : <Play size={16} weight="regular" />}
        </button>

        <button
          type="button"
          disabled={!hasSelection}
          onClick={() => onAddKeyframe?.(currentTime)}
          aria-label="Add keyframe at playhead"
          title="Add keyframe at playhead"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px',
            minWidth: '44px',
            minHeight: '44px',
            padding: '0 12px',
            borderRadius: 'var(--radius-md, 8px)',
            border: '1px solid var(--color-border)',
            background: 'var(--glass-frost)',
            color: 'var(--text-secondary)',
            fontFamily: 'var(--font-ui)',
            fontSize: '10px',
            letterSpacing: '0.04em',
            cursor: !hasSelection ? 'not-allowed' : 'pointer',
            opacity: !hasSelection ? 0.45 : 1,
          }}
        >
          <Plus size={14} weight="bold" />
          Keyframe
        </button>
      </div>

      {/* Track + markers */}
      <div
        style={{
          position: 'relative',
          height: '44px',
          minHeight: '44px',
          borderRadius: 'var(--radius-md, 8px)',
          border: '1px solid var(--color-border)',
          background: 'var(--color-bg-raised)',
          padding: '0 12px',
          display: 'flex',
          alignItems: 'center',
          opacity: !hasSelection ? 0.45 : 1,
          pointerEvents: !hasSelection ? 'none' : 'auto',
        }}
      >
        {/* Filled progress up to playhead */}
        <div
          style={{
            position: 'absolute',
            left: '12px',
            top: '50%',
            transform: 'translateY(-50%)',
            height: '4px',
            width: `calc((100% - 24px) * ${currentTime})`,
            background: 'var(--color-accent)',
            borderRadius: '9999px',
          }}
        />
        {/* Base track line */}
        <div
          style={{
            position: 'absolute',
            left: '12px',
            right: '12px',
            top: '50%',
            transform: 'translateY(-50%)',
            height: '2px',
            background: 'var(--color-border)',
            borderRadius: '9999px',
          }}
        />
        {/* Keyframe markers */}
        {keyframes.map((kf, i) => (
          <div
            key={i}
            title={`Keyframe @ ${Math.round(kf.at * 100)}%`}
            style={{
              position: 'absolute',
              left: `calc(12px + (100% - 24px) * ${kf.at})`,
              top: '50%',
              transform: 'translate(-50%, -50%)',
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              background: 'var(--text-primary)',
              border: '2px solid var(--color-accent)',
              boxSizing: 'border-box',
            }}
          />
        ))}
        {/* Playhead knob */}
        <div
          style={{
            position: 'absolute',
            left: `calc(12px + (100% - 24px) * ${currentTime})`,
            top: '50%',
            transform: 'translate(-50%, -50%)',
            width: '18px',
            height: '18px',
            borderRadius: '50%',
            background: 'var(--color-accent)',
            border: '3px solid var(--glass-frost)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
            pointerEvents: 'none',
          }}
        />
      </div>

      {/* Scrubber range input */}
      <input
        type="range"
        min={0}
        max={1}
        step={0.01}
        value={currentTime}
        disabled={!hasSelection}
        onChange={(e) => onScrub?.(parseFloat(e.target.value))}
        aria-label="Scrub timeline"
        style={{
          width: '100%',
          minHeight: '44px',
          accentColor: 'var(--color-accent)',
          cursor: !hasSelection ? 'not-allowed' : 'pointer',
          opacity: !hasSelection ? 0.45 : 1,
        }}
      />

      <div
        style={{
          fontFamily: 'var(--font-ui)',
          fontSize: '9px',
          color: 'var(--text-disabled)',
          padding: '0 4px',
          lineHeight: 1.5,
        }}
      >
        {hasSelection
          ? `${keyframes.length} keyframe${keyframes.length === 1 ? '' : 's'} on "${element.name || element.kind}"`
          : 'Select an element to edit its timeline'}
      </div>
    </div>
  );
}
