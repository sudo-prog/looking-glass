/* ════════════════════════════════════════════════
   LOOKING GLASS — WebGPU GLASS RENDERER
   Wrapper around jeantimex/glass-effect-webgpu pipeline
   Part IV Glass Effect Specification + Part XVII Phase 2
   ════════════════════════════════════════════════ */

import { getUniforms, type GlassUniforms, type GlassSurface } from './uniforms';

// ── Types ──────────────────────────────────────────

interface GlassRendererState {
  device: GPUDevice | null;
  adapter: GPUAdapter | null;
  context: GPUCanvasContext | null;
  pipeline: GPURenderPipeline | null;
  bindGroup: GPUBindGroup | null;
  uniformBuffer: GPUBuffer | null;
  canvas: HTMLCanvasElement | null;
  surfaceType: GlassSurface;
  uniformData: GlassUniforms;
  isDark: boolean;
  reducedMotion: boolean;
  initialized: boolean;
}

// ── Uniform buffer layout ──────────────────────────
// Matches the WGSL struct:
//   struct GlassUniforms {
//     refractionStrength : f32,
//     blurRadius         : f32,
//     specularIntensity  : f32,
//     shadowIntensity    : f32,
//     thickness          : f32,
//     bezels             : vec4<f32>,
//     liquidDeformation  : f32,  // 0.0 or 1.0
//     deformationRadius  : f32,
//     springStiffness    : f32,
//     springDamping      : f32,
//     backdropDim        : f32,
//     _padding           : vec3<f32>, // alignment
//   };

const UNIFORM_BUFFER_STRIDE = 64; // 16 × 4-byte floats

function uniformsToFloat32Array(
  u: GlassUniforms,
  reducedMotion: boolean
): Float32Array {
  const floatDeformation = (u.liquidDeformation && !reducedMotion) ? 1.0 : 0.0;
  return new Float32Array([
    u.refractionStrength,
    u.blurRadius,
    u.specularIntensity,
    u.shadowIntensity,
    u.thickness,
    u.bezels.tl,
    u.bezels.tr,
    u.bezels.br,
    u.bezels.bl,
    floatDeformation,
    u.deformationRadius ?? 0.3,
    u.springStiffness ?? 300,
    u.springDamping ?? 20,
    u.backdropDim ?? 0.0,
    0, 0, 0, // padding
  ]);
}

// ── Renderer State ─────────────────────────────────

const state: GlassRendererState = {
  device: null,
  adapter: null,
  context: null,
  pipeline: null,
  bindGroup: null,
  uniformBuffer: null,
  canvas: null,
  surfaceType: 'card',
  uniformData: getUniforms('card', true),
  isDark: true,
  reducedMotion: false,
  initialized: false,
};

// ── Singleton Renderer ─────────────────────────────

class GlassRenderer {
  private static instance: GlassRenderer | null = null;

  static getInstance(): GlassRenderer {
    if (!GlassRenderer.instance) {
      GlassRenderer.instance = new GlassRenderer();
    }
    return GlassRenderer.instance;
  }

  // ── Initialization ───────────────────────────────

  async init(canvas?: HTMLCanvasElement): Promise<boolean> {
    if (state.initialized) return true;

    // Check prefers-reduced-motion on init
    state.reducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;

    if (!window.gpu) {
      console.warn('[GlassRenderer] WebGPU not available — falling back to CSS/flat tier');
      return false;
    }

    try {
      state.adapter = await navigator.gpu.requestAdapter();
      if (!state.adapter) {
        console.warn('[GlassRenderer] requestAdapter() returned null');
        return false;
      }

      state.device = await state.adapter.requestDevice();

      if (canvas) {
        this.attachCanvas(canvas);
      }

      await this.createPipeline();
      state.initialized = true;

      // Listen for theme-change events from theme.js
      window.addEventListener('theme-change', this.handleThemeChange);

      // Listen for reduced-motion changes
      window.matchMedia('(prefers-reduced-motion: reduce)')
        .addEventListener('change', this.handleReducedMotionChange);

      console.log('[GlassRenderer] Initialised successfully');
      return true;
    } catch (err) {
      console.error('[GlassRenderer] Init failed:', err);
      return false;
    }
  }

  // ── Canvas attachment ────────────────────────────

  attachCanvas(canvas: HTMLCanvasElement): void {
    state.canvas = canvas;
    const ctx = canvas.getContext('webgpu');
    if (ctx) {
      state.context = ctx;
      const preferredFormat = navigator.gpu.getPreferredCanvasFormat();
      ctx.configure({
        device: state.device!,
        format: preferredFormat,
        alphaMode: 'premultiplied',
      });
    }
  }

  // ── Render pipeline ──────────────────────────────

  private async createPipeline(): Promise<void> {
    if (!state.device) return;

    const shaderModule = state.device.createShaderModule({
      code: /* wgsl */ `
        struct GlassUniforms {
          refractionStrength : f32,
          blurRadius         : f32,
          specularIntensity  : f32,
          shadowIntensity    : f32,
          thickness          : f32,
          bezels             : vec4<f32>,
          liquidDeformation  : f32,
          deformationRadius  : f32,
          springStiffness    : f32,
          springDamping      : f32,
          backdropDim        : f32,
        };

        @group(0) @binding(0) var<uniform> glass : GlassUniforms;

        // ── Vertex shader ──
        struct VertexOutput {
          @builtin(position) position : vec4<f32>,
          @location(0) uv : vec2<f32>,
        };

        @vertex
        fn vertMain(@builtin(vertex_index) idx : u32) -> VertexOutput {
          var pos = array<vec2<f32>, 6>(
            vec2(-1.0, -1.0), vec2(1.0, -1.0), vec2(-1.0, 1.0),
            vec2(-1.0, 1.0),  vec2(1.0, -1.0), vec2(1.0, 1.0)
          );
          var out : VertexOutput;
          out.position = vec4(pos[idx], 0.0, 1.0);
          out.uv = (pos[idx] + 1.0) * 0.5;
          return out;
        }

        // ── Fragment shader — glass refraction ──
        fn smoothstep(e0: f32, e1: f32, x: f32) -> f32 {
          let t = clamp((x - e0) / (e1 - e0), 0.0, 1.0);
          return t * t * (3.0 - 2.0 * t);
        }

        fn roundedBoxUV(uv: vec2<f32>, size: vec2<f32>, radius: f32) -> f32 {
          let d = abs(uv - size * 0.5) - size * 0.5 + radius;
          return 1.0 - smoothstep(0.0, 0.005, length(max(d, 0.0)) - radius);
        }

        @fragment
        fn fragMain(@location(0) uv : vec2<f32>) -> @location(0) vec4<f32> {
          let size = vec2(1.0, 1.0);

          // Average bezel radius
          let avgRadius = (glass.bezels.x + glass.bezels.y + glass.bezels.z + glass.bezels.w) / 4.0 / 100.0;

          // Glass mask with rounded corners
          let mask = roundedBoxUV(uv, size, avgRadius);

          // Refraction displacement
          let center = vec2(0.5, 0.5);
          let dist = uv - center;
          let refractUV = uv + dist * glass.refractionStrength * 0.05 * mask;

          // Specular highlight arc (top edge)
          let specularY = 1.0 - uv.y;
          let specularPower = pow(specularY, 3.0) * glass.specularIntensity * mask;

          // Shadow falloff
          let shadowIntensity = glass.shadowIntensity * mix(0.5, 1.0, uv.y) * mask;

          // Thickness bezel glow
          let edgeDist = min(min(uv.x, 1.0 - uv.x), min(uv.y, 1.0 - uv.y));
          let bezelGlow = smoothstep(0.0, glass.thickness * 2.0, edgeDist);
          let edgeAlpha = mix(0.7, 1.0, bezelGlow) * mask;

          // Tint color (subtle substrate tint)
          let tintColor = vec4(0.04, 0.04, 0.04, 1.0);

          // Combine: base tint + specular - shadow
          let base = tintColor;
          let color = base.rgb + vec3(specularPower) - vec3(shadowIntensity * 0.3);
          let alpha = edgeAlpha * (0.85 + glass.backdropDim * 0.15);

          return vec4(color, alpha * mask);
        }
      `,
    });

    state.pipeline = state.device.createRenderPipeline({
      layout: 'auto',
      vertex: {
        module: shaderModule,
        entryPoint: 'vertMain',
      },
      fragment: {
        module: shaderModule,
        entryPoint: 'fragMain',
        targets: [
          {
            format: navigator.gpu.getPreferredCanvasFormat(),
            blend: {
              color: {
                srcFactor: 'src-alpha',
                dstFactor: 'one-minus-src-alpha',
              },
              alpha: {
                srcFactor: 'one',
                dstFactor: 'one-minus-src-alpha',
              },
            },
          },
        ],
      },
      primitive: {
        topology: 'triangle-list',
      },
    });

    // Create uniform buffer
    state.uniformBuffer = state.device.createBuffer({
      size: UNIFORM_BUFFER_STRIDE,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    // Create bind group
    state.bindGroup = state.device.createBindGroup({
      layout: state.pipeline.getBindGroupLayout(0),
      entries: [
        {
          binding: 0,
          resource: {
            buffer: state.uniformBuffer,
          },
        },
      ],
    });
  }

  // ── Rendering ────────────────────────────────────

  render(glassType?: GlassSurface): void {
    if (!state.initialized || !state.device || !state.context || !state.pipeline) {
      return;
    }

    if (glassType && glassType !== state.surfaceType) {
      state.surfaceType = glassType;
      state.uniformData = getUniforms(glassType, state.isDark);
    }

    // Update uniform buffer
    const data = uniformsToFloat32Array(state.uniformData, state.reducedMotion);
    state.device.queue.writeBuffer(state.uniformBuffer!, 0, data, 0, 16);

    const commandEncoder = state.device.createCommandEncoder();
    const textureView = state.context.getCurrentTexture().createView();

    const renderPass = commandEncoder.beginRenderPass({
      colorAttachments: [
        {
          view: textureView,
          loadOp: 'load',
          storeOp: 'store',
        },
      ],
    });

    renderPass.setPipeline(state.pipeline);
    renderPass.setBindGroup(0, state.bindGroup!);
    renderPass.draw(6);
    renderPass.end();

    state.device.queue.submit([commandEncoder.finish()]);
  }

  // ── Surface update ───────────────────────────────

  updateSurface(glassType: GlassSurface, isDark?: boolean): void {
    if (isDark !== undefined) {
      state.isDark = isDark;
    }
    state.surfaceType = glassType;
    state.uniformData = getUniforms(glassType, state.isDark);

    if (state.initialized && state.device) {
      const data = uniformsToFloat32Array(state.uniformData, state.reducedMotion);
      state.device.queue.writeBuffer(state.uniformBuffer!, 0, data, 0, 16);
    }
  }

  // ── Event Handlers ───────────────────────────────

  private handleThemeChange = (e: Event): void => {
    const theme = (e as CustomEvent).detail?.theme;
    if (theme === 'dark' || theme === 'light') {
      state.isDark = theme === 'dark';
      state.uniformData = getUniforms(state.surfaceType, state.isDark);

      if (state.initialized && state.device) {
        const data = uniformsToFloat32Array(state.uniformData, state.reducedMotion);
        state.device.queue.writeBuffer(state.uniformBuffer!, 0, data, 0, 16);
        this.render();
      }
    }
  };

  private handleReducedMotionChange = (e: MediaQueryListEvent): void => {
    state.reducedMotion = e.matches;
    if (state.initialized && state.device) {
      const data = uniformsToFloat32Array(state.uniformData, state.reducedMotion);
      state.device.queue.writeBuffer(state.uniformBuffer!, 0, data, 0, 16);
      this.render();
    }
  };

  // ── Destroy ──────────────────────────────────────

  destroy(): void {
    if (state.device) {
      state.device.destroy();
    }
    window.removeEventListener('theme-change', this.handleThemeChange);
    window.matchMedia('(prefers-reduced-motion: reduce)')
      .removeEventListener('change', this.handleReducedMotionChange);
    GlassRenderer.instance = null;
    state.initialized = false;
  }

  // ── Getters ──────────────────────────────────────

  isInitialized(): boolean {
    return state.initialized;
  }

  getSurfaceType(): GlassSurface {
    return state.surfaceType;
  }

  getReducedMotion(): boolean {
    return state.reducedMotion;
  }

  getDevice(): GPUDevice | null {
    return state.device;
  }
}

export { GlassRenderer, type GlassSurface };
export default GlassRenderer;
