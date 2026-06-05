/* ════════════════════════════════════════════════
   LOOKING GLASS — GLASS UNIFORMS
   All 10 surface parameter objects (5 surfaces × dark + light)
   Source: Design Brief V2 Part IV — Glass Effect Specification
   ════════════════════════════════════════════════ */

export interface Bezels {
  tl: number;
  tr: number;
  br: number;
  bl: number;
}

export interface GlassUniforms {
  refractionStrength: number;
  blurRadius: number;
  specularIntensity: number;
  shadowIntensity: number;
  thickness: number;
  bezels: Bezels;
  liquidDeformation: boolean;
  deformationRadius?: number;
  springStiffness?: number;
  springDamping?: number;
  backdropDim?: number;
}

// ── GLASS-1 — Canvas Cards ──────────────────────────
// Cards feel like frosted acrylic resting on the canvas
export const CARD_GLASS_DARK: GlassUniforms = {
  refractionStrength: 0.08,
  blurRadius: 6.0,
  specularIntensity: 0.20,
  shadowIntensity: 0.10,
  thickness: 0.04,
  bezels: { tl: 12, tr: 12, br: 12, bl: 12 },
  liquidDeformation: true,
  deformationRadius: 0.3,
  springStiffness: 300,
  springDamping: 20,
};

export const CARD_GLASS_LIGHT: GlassUniforms = {
  ...CARD_GLASS_DARK,
  refractionStrength: 0.05,
  specularIntensity: 0.40,
  shadowIntensity: 0.25,
};

// ── GLASS-2 — Toolbar ──────────────────────────────
// Premium hardware control surface
export const TOOLBAR_GLASS_DARK: GlassUniforms = {
  refractionStrength: 0.22,
  blurRadius: 20.0,
  specularIntensity: 0.30,
  shadowIntensity: 0.40,
  thickness: 0.10,
  bezels: { tl: 20, tr: 20, br: 20, bl: 20 },
  liquidDeformation: false,
};

export const TOOLBAR_GLASS_LIGHT: GlassUniforms = {
  ...TOOLBAR_GLASS_DARK,
  refractionStrength: 0.18,
  specularIntensity: 0.50,
  shadowIntensity: 0.30,
};

// ── GLASS-3 — Command Palette ──────────────────────
// Hero glass element — large sharp pane catching ambient light
export const COMMAND_GLASS_DARK: GlassUniforms = {
  refractionStrength: 0.35,
  blurRadius: 32.0,
  specularIntensity: 0.45,
  shadowIntensity: 0.60,
  thickness: 0.16,
  bezels: { tl: 16, tr: 16, br: 16, bl: 16 },
  liquidDeformation: false,
  backdropDim: 0.30,
};

export const COMMAND_GLASS_LIGHT: GlassUniforms = {
  ...COMMAND_GLASS_DARK,
  refractionStrength: 0.28,
  specularIntensity: 0.60,
  shadowIntensity: 0.25,
};

// ── GLASS-4 — Context Menu ─────────────────────────
// Small and surgical. No liquid deformation.
export const CONTEXT_GLASS_DARK: GlassUniforms = {
  refractionStrength: 0.15,
  blurRadius: 14.0,
  specularIntensity: 0.20,
  shadowIntensity: 0.50,
  thickness: 0.08,
  bezels: { tl: 8, tr: 8, br: 8, bl: 8 },
  liquidDeformation: false,
};

export const CONTEXT_GLASS_LIGHT: GlassUniforms = {
  ...CONTEXT_GLASS_DARK,
  refractionStrength: 0.12,
  specularIntensity: 0.35,
  shadowIntensity: 0.20,
};

// ── GLASS-5 — Lightbox / Media Viewer ──────────────
// Controls overlay uses the thickest glass. Cinematic.
export const LIGHTBOX_GLASS_DARK: GlassUniforms = {
  refractionStrength: 0.40,
  blurRadius: 40.0,
  specularIntensity: 0.50,
  shadowIntensity: 0.70,
  thickness: 0.20,
  bezels: { tl: 24, tr: 24, br: 24, bl: 24 },
  liquidDeformation: true,
  deformationRadius: 0.5,
  springStiffness: 400,
  springDamping: 25,
};

export const LIGHTBOX_GLASS_LIGHT: GlassUniforms = {
  ...LIGHTBOX_GLASS_DARK,
  refractionStrength: 0.32,
  specularIntensity: 0.65,
  shadowIntensity: 0.30,
};

// ── Mode-aware uniform resolver ────────────────────

export type GlassSurface =
  | 'card'
  | 'toolbar'
  | 'command-palette'
  | 'context-menu'
  | 'lightbox';

export const getUniforms = (
  surface: GlassSurface,
  isDark: boolean
): GlassUniforms => {
  const map: Record<GlassSurface, { dark: GlassUniforms; light: GlassUniforms }> = {
    card: { dark: CARD_GLASS_DARK, light: CARD_GLASS_LIGHT },
    toolbar: { dark: TOOLBAR_GLASS_DARK, light: TOOLBAR_GLASS_LIGHT },
    'command-palette': { dark: COMMAND_GLASS_DARK, light: COMMAND_GLASS_LIGHT },
    'context-menu': { dark: CONTEXT_GLASS_DARK, light: CONTEXT_GLASS_LIGHT },
    lightbox: { dark: LIGHTBOX_GLASS_DARK, light: LIGHTBOX_GLASS_LIGHT },
  };
  return isDark ? map[surface].dark : map[surface].light;
};
