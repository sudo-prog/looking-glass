/**
 * LOOKING GLASS — Scene JSON Schema (Phase 3: Supercharge Scenes)
 *
 * A Scene is the atomic unit of the Scenes workspace: a named, ordered
 * collection of SVG primitives rendered on a single stage, plus the optional
 * motion (animation preset + keyframes) applied to each element.
 *
 * This module is plain JS and depends only on `zod`. It is intentionally
 * framework-free so it can be unit-tested and reused by the canvas engine and
 * the persistence layer without pulling in React.
 *
 * Public API:
 *   sceneSchema        — the Zod schema
 *   elementSchema      — the element sub-schema (re-exported for reuse)
 *   createScene(opts)  — build a valid default scene
 *   createElement(...) — build a valid default element
 *   validateScene(obj) — safe validation → { ok, data, errors }
 */

import { z } from 'zod';

// ─────────────────────────────────────────────────────────────
// ELEMENTS
// ─────────────────────────────────────────────────────────────

/** SVG primitive kinds the element library can insert. */
export const ELEMENT_KINDS = [
  'rect',
  'circle',
  'ellipse',
  'line',
  'path',
  'text',
];

/** Recognised animation preset ids (see src/ui/AnimationPresets.jsx). */
export const ANIMATION_PRESETS = [
  'none',
  'fade',
  'slide-up',
  'pulse',
  'float',
  'scale-in',
];

/**
 * A single keyframe: a point in time (0..1 normalised) with a partial set of
 * animatable props. Kept loose (record of string→number/string) so the
 * timeline can store arbitrary tweenable values without a rigid schema.
 */
const keyframeSchema = z.object({
  at: z.number().min(0).max(1),
  props: z.record(z.union([z.number(), z.string()])).default({}),
});

const elementSchema = z.object({
  id: z.string().min(1),
  kind: z.enum(ELEMENT_KINDS),
  name: z.string().default(''),
  // Geometry / presentation props for the SVG node (x, y, width, height, fill…).
  props: z.record(z.union([z.number(), z.string()])).default({}),
  // Optional motion applied to this element.
  animation: z
    .object({
      preset: z.enum(ANIMATION_PRESETS).default('none'),
      // Normalised keyframes (0..1). Empty = driven purely by the preset.
      keyframes: z.array(keyframeSchema).default([]),
    })
    .default({ preset: 'none', keyframes: [] }),
});

// ─────────────────────────────────────────────────────────────
// SCENE
// ─────────────────────────────────────────────────────────────

export const sceneSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1, 'Scene name is required'),
  // Background as a CSS colour string (or 'transparent').
  background: z.string().default('transparent'),
  elements: z.array(elementSchema).default([]),
  meta: z
    .object({
      createdAt: z.number().optional(),
      updatedAt: z.number().optional(),
      durationMs: z.number().min(0).default(3000),
      tags: z.array(z.string()).default([]),
    })
    .default({}),
});

export { elementSchema };

// ─────────────────────────────────────────────────────────────
// FACTORY HELPERS
// ─────────────────────────────────────────────────────────────

let _seq = 0;
function uid(prefix) {
  _seq += 1;
  return `${prefix}_${Date.now().toString(36)}_${_seq.toString(36)}`;
}

/** Build a single valid element with sane defaults per kind. */
export function createElement(kind, overrides = {}) {
  const defaultsByKind = {
    rect:    { x: 40, y: 40, width: 160, height: 100, fill: '#D71921' },
    circle:  { cx: 100, cy: 100, r: 60, fill: '#D71921' },
    ellipse: { cx: 120, cy: 80, rx: 100, ry: 60, fill: '#D71921' },
    line:    { x1: 20, y1: 20, x2: 220, y2: 160, stroke: '#F5F5F5', strokeWidth: 4 },
    path:    { d: 'M20 120 L100 20 L180 120 Z', fill: '#D71921' },
    text:    { x: 40, y: 90, content: 'Text', fill: '#F5F5F5', fontSize: 28 },
  };
  const { name, props, animation, ...rest } = overrides;
  return {
    id: uid('el'),
    kind,
    name: name || kind,
    props: { ...(defaultsByKind[kind] || {}), ...(props || {}) },
    animation: { preset: 'none', keyframes: [], ...(animation || {}) },
    ...rest,
  };
}

/** Build a blank, valid scene. */
export function createScene(overrides = {}) {
  return {
    id: uid('scene'),
    name: overrides.name || 'Untitled Scene',
    background: overrides.background || 'transparent',
    elements: overrides.elements || [],
    meta: {
      createdAt: Date.now(),
      updatedAt: Date.now(),
      durationMs: 3000,
      tags: [],
      ...(overrides.meta || {}),
    },
  };
}

// ─────────────────────────────────────────────────────────────
// VALIDATION
// ─────────────────────────────────────────────────────────────

/**
 * Safe validation of an unknown object as a Scene.
 *
 * @param {unknown} obj
 * @returns {{ ok: boolean, data?: object, errors?: Array<{ path: string, message: string }> }}
 */
export function validateScene(obj) {
  const result = sceneSchema.safeParse(obj);
  if (result.success) {
    return { ok: true, data: result.data };
  }
  const errors = result.error.issues.map((issue) => ({
    path: issue.path.join('.') || '(root)',
    message: issue.message,
  }));
  return { ok: false, errors };
}
