/* ════════════════════════════════════════════════
   LOOKING GLASS — GLASS TIER DETECTION
   Three-tier fallback: WebGPU → CSS backdrop-filter → flat
   ════════════════════════════════════════════════ */

export type GlassTier = 'webgpu' | 'css-backdrop' | 'flat';

export const getGlassTier = async (): Promise<GlassTier> => {
  if (navigator.gpu) {
    const adapter = await navigator.gpu.requestAdapter();
    if (adapter) return 'webgpu';
  }
  if (CSS.supports('backdrop-filter', 'blur(1px)') ||
      CSS.supports('-webkit-backdrop-filter', 'blur(1px)')) {
    return 'css-backdrop';
  }
  return 'flat';
};
