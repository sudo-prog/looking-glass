/**
 * LOOKING GLASS — Scenes Workspace Shell (Phase 3: Supercharge Scenes)
 *
 * Self-contained workspace that mounts the three Phase-3 panels — SVG Element
 * Library, Animation Presets, Keyframe Timeline — and renders a live preview
 * stage of the scene using Framer-Motion. Owns its own scene state so it can be
 * dropped in / torn down by App.jsx behind a `showScenes` gate without touching
 * unrelated components.
 *
 * Stage rendering: each element is drawn as a motion.* SVG node driven by its
 * `animation.preset` (via PRESET_VARIANTS from AnimationPresets.jsx). Playing
 * runs a rAF loop that advances `currentTime` (0..1) over `meta.durationMs`,
 * moving the timeline playhead; scrubbing pauses and sets the playhead.
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, FilmStrip, Plus } from '@phosphor-icons/react';
import SvgElementLibrary from './SvgElementLibrary.jsx';
import AnimationPresets from './AnimationPresets.jsx';
import KeyframeTimeline from './KeyframeTimeline.jsx';
import { createScene, createElement, validateScene } from '../lib/sceneSchema.js';
import { getPresetVariants } from './AnimationPresets.jsx';

// ── SVG element renderer ──────────────────────────────────

function renderSvgElement(el, isSelected) {
  const variants = getPresetVariants(el.animation?.preset);
  const common = {
    variants,
    initial: variants ? 'initial' : false,
    animate: variants ? 'animate' : undefined,
    style: { outline: isSelected ? '1px dashed var(--color-accent)' : 'none' },
  };
  switch (el.kind) {
    case 'rect':
      return <motion.rect {...common} x={el.props.x} y={el.props.y} width={el.props.width} height={el.props.height} fill={el.props.fill} rx={6} />;
    case 'circle':
      return <motion.circle {...common} cx={el.props.cx} cy={el.props.cy} r={el.props.r} fill={el.props.fill} />;
    case 'ellipse':
      return <motion.ellipse {...common} cx={el.props.cx} cy={el.props.cy} rx={el.props.rx} ry={el.props.ry} fill={el.props.fill} />;
    case 'line':
      return <motion.line {...common} x1={el.props.x1} y1={el.props.y1} x2={el.props.x2} y2={el.props.y2} stroke={el.props.stroke} strokeWidth={el.props.strokeWidth} strokeLinecap="round" />;
    case 'path':
      return <motion.path {...common} d={el.props.d} fill={el.props.fill} />;
    case 'text':
      return (
        <motion.text {...common} x={el.props.x} y={el.props.y} fill={el.props.fill} fontSize={el.props.fontSize} fontFamily="var(--font-display)" fontWeight={700}>
          {el.props.content}
        </motion.text>
      );
    default:
      return null;
  }
}

// ── Workspace ─────────────────────────────────────────────

/**
 * Props:
 *   onClose  {() => void}   Tear down the workspace (clears showScenes in parent).
 */
export default function ScenesWorkspace({ onClose }) {
  const [scene, setScene] = useState(() => createScene({ name: 'Scene 1' }));
  const [selectedId, setSelectedId] = useState(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const rafRef = useRef(null);

  const selectedElement = scene.elements.find((e) => e.id === selectedId) || null;

  // Playback loop: advance the playhead over the scene duration.
  useEffect(() => {
    if (!playing) return undefined;
    let last = performance.now();
    const tick = (now) => {
      const dt = now - last;
      last = now;
      setCurrentTime((t) => {
        const next = t + dt / (scene.meta.durationMs || 3000);
        return next >= 1 ? 0 : next;
      });
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [playing, scene.meta.durationMs]);

  const handleInsert = useCallback((elementDef) => {
    setScene((prev) => {
      const next = { ...prev, elements: [...prev.elements, elementDef] };
      // Validate defensively (keeps state consistent with the schema).
      if (!validateScene(next).ok) return prev;
      return next;
    });
    setSelectedId(elementDef.id);
  }, []);

  const handleApplyPreset = useCallback((presetId) => {
    setScene((prev) => ({
      ...prev,
      elements: prev.elements.map((e) =>
        e.id === selectedId ? { ...e, animation: { ...e.animation, preset: presetId } } : e,
      ),
    }));
  }, [selectedId]);

  const handleAddKeyframe = useCallback((t) => {
    setScene((prev) => ({
      ...prev,
      elements: prev.elements.map((e) => {
        if (e.id !== selectedId) return e;
        const existing = e.animation.keyframes.filter((k) => Math.abs(k.at - t) > 0.01);
        return {
          ...e,
          animation: {
            ...e.animation,
            keyframes: [...existing, { at: t, props: {} }].sort((a, b) => a.at - b.at),
          },
        };
      }),
    }));
  }, [selectedId]);

  const handleScrub = useCallback((t) => {
    setPlaying(false);
    setCurrentTime(t);
  }, []);

  const handleTogglePlay = useCallback(() => setPlaying((p) => !p), []);

  const handleClear = useCallback(() => {
    setScene(createScene({ name: 'Scene 1' }));
    setSelectedId(null);
    setCurrentTime(0);
    setPlaying(false);
  }, []);

  const activePreset = selectedElement?.animation?.preset || null;

  return (
    <div
      role="region"
      aria-label="Scenes workspace"
      style={{
        position: 'absolute',
        inset: '0',
        zIndex: 'var(--z-toolbar, 100)',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--color-bg, #0A0A0A)',
        color: 'var(--text-primary)',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          minHeight: '44px',
          padding: '8px 16px',
          borderBottom: '1px solid var(--color-border)',
          background: 'var(--glass-frost)',
        }}
      >
        <FilmStrip size={20} weight="regular" style={{ color: 'var(--color-accent)' }} />
        <span style={{ fontFamily: 'var(--font-display)', fontSize: '16px', fontWeight: 700, letterSpacing: '0.02em' }}>
          Scenes
        </span>
        <input
          value={scene.name}
          onChange={(e) => setScene((prev) => ({ ...prev, name: e.target.value }))}
          aria-label="Scene name"
          style={{
            minHeight: '44px',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md, 8px)',
            background: 'var(--color-bg-raised)',
            color: 'var(--text-primary)',
            fontFamily: 'var(--font-body)',
            fontSize: '13px',
            padding: '0 10px',
            outline: 'none',
            width: '200px',
            maxWidth: '40vw',
          }}
        />
        <span style={{ fontFamily: 'var(--font-ui)', fontSize: '9px', color: 'var(--text-disabled)', marginLeft: 'auto' }}>
          {scene.elements.length} element{scene.elements.length === 1 ? '' : 's'}
        </span>
        <button
          type="button"
          onClick={handleClear}
          style={{
            display: 'flex', alignItems: 'center', gap: '4px', minHeight: '44px', padding: '0 12px',
            border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md, 8px)',
            background: 'var(--glass-frost)', color: 'var(--text-secondary)',
            fontFamily: 'var(--font-ui)', fontSize: '10px', cursor: 'pointer',
          }}
        >
          <Plus size={14} weight="bold" /> New
        </button>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close scenes workspace"
          title="Close"
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', width: '44px', height: '44px',
            minWidth: '44px', minHeight: '44px', border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md, 8px)', background: 'var(--glass-frost)',
            color: 'var(--text-secondary)', cursor: 'pointer',
          }}
        >
          <X size={18} weight="regular" />
        </button>
      </div>

      {/* Body: left = preview stage, right = panel rail */}
      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        {/* Preview stage */}
        <div
          style={{
            flex: 1,
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            background: scene.background === 'transparent' ? 'transparent' : scene.background,
            backgroundImage: 'radial-gradient(circle, rgba(127,127,127,0.18) 1px, transparent 1px)',
            backgroundSize: '20px 20px',
          }}
        >
          <svg width="100%" height="100%" viewBox="0 0 320 240" preserveAspectRatio="xMidYMid meet">
            <AnimatePresence>
              {scene.elements.map((el) => (
                <g
                  key={el.id}
                  onClick={() => setSelectedId(el.id)}
                  style={{ cursor: 'pointer' }}
                >
                  {renderSvgElement(el, el.id === selectedId)}
                </g>
              ))}
            </AnimatePresence>
          </svg>
          {scene.elements.length === 0 && (
            <div style={{ position: 'absolute', fontFamily: 'var(--font-ui)', fontSize: '11px', color: 'var(--text-disabled)', textAlign: 'center' }}>
              Insert an SVG element from the right panel to begin.
            </div>
          )}
        </div>

        {/* Panel rail */}
        <aside
          style={{
            width: '320px',
            maxWidth: '90vw',
            flexShrink: 0,
            borderLeft: '1px solid var(--color-border)',
            background: 'var(--color-bg-raised)',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
            overflowY: 'auto',
          }}
        >
          <SvgElementLibrary onInsert={handleInsert} disabled={false} />
          <div style={{ height: '1px', background: 'var(--color-border)' }} />
          <AnimationPresets
            activePreset={activePreset}
            onApplyPreset={handleApplyPreset}
            disabled={!selectedElement}
          />
          <div style={{ height: '1px', background: 'var(--color-border)' }} />
          <KeyframeTimeline
            element={selectedElement}
            durationMs={scene.meta.durationMs}
            currentTime={currentTime}
            playing={playing}
            onScrub={handleScrub}
            onAddKeyframe={handleAddKeyframe}
            onTogglePlay={handleTogglePlay}
            disabled={!selectedElement}
          />
        </aside>
      </div>
    </div>
  );
}
