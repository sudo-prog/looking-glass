/**
 * LOOKING GLASS — Canvas Engine v2
 * Infinite canvas with pan, zoom, viewport transforms, and virtual culling.
 *
 * Pan: right-click drag or middle-click drag (not left-click — that is for cards).
 * Zoom: scroll wheel, centered on cursor, range 0.1x–5x.
 * Virtual culling: only cards within viewport bounds + padding are rendered.
 * Target: 60fps at 100 cards, 55fps+ at 500 cards.
 */

export interface Viewport {
  x: number;
  y: number;
  zoom: number;
}

export interface Bounds {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export interface CardRect {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

const MIN_ZOOM = 0.1;
const MAX_ZOOM = 5.0;
const CULL_PADDING = 200; // extra pixels around viewport for culling

export class CanvasEngine {
  private container: HTMLElement | null = null;
  private world: HTMLElement | null = null;
  private viewport: Viewport = { x: 0, y: 0, zoom: 1 };
  private isPanning = false;
  private panButton: number | null = null; // 1 = middle, 2 = right
  private lastPointer = { x: 0, y: 0 };
  private rafId: number | null = null;
  private onViewportChange: ((v: Viewport) => void) | null = null;
  private onCull: ((visible: Set<string>) => void) | null = null;
  private cardRects: Map<string, CardRect> = new Map();
  private visibleIds: Set<string> = new Set();
  private boundOnPointerDown: (e: PointerEvent) => void;
  private boundOnPointerMove: (e: PointerEvent) => void;
  private boundOnPointerUp: (e: PointerEvent) => void;
  private boundOnWheel: (e: WheelEvent) => void;
  private boundOnContextMenu: (e: Event) => void;

  constructor() {
    this.boundOnPointerDown = this.onPointerDown.bind(this);
    this.boundOnPointerMove = this.onPointerMove.bind(this);
    this.boundOnPointerUp = this.onPointerUp.bind(this);
    this.boundOnWheel = this.onWheel.bind(this);
    this.boundOnContextMenu = (e: Event) => e.preventDefault();
  }

  /**
   * Attach engine to a DOM container. The container must have a child
   * with id="canvas-world" (or one will be created).
   */
  init(
    container: HTMLElement,
    opts?: {
      onViewportChange?: (v: Viewport) => void;
      onCull?: (visible: Set<string>) => void;
    }
  ) {
    this.container = container;
    this.onViewportChange = opts?.onViewportChange ?? null;
    this.onCull = opts?.onCull ?? null;

    this.world = container.querySelector('#canvas-world');
    if (!this.world) {
      this.world = document.createElement('div');
      this.world.id = 'canvas-world';
      this.world.style.cssText =
        'position:absolute;width:1px;height:1px;transform-origin:0 0;will-change:transform;';
      container.appendChild(this.world);
    }

    container.style.touchAction = 'none';
    container.style.cursor = 'grab';

    container.addEventListener('pointerdown', this.boundOnPointerDown);
    window.addEventListener('pointermove', this.boundOnPointerMove);
    window.addEventListener('pointerup', this.boundOnPointerUp);
    container.addEventListener('wheel', this.boundOnWheel, { passive: false });
    container.addEventListener('contextmenu', this.boundOnContextMenu);
  }

  destroy() {
    if (!this.container) return;
    this.container.removeEventListener('pointerdown', this.boundOnPointerDown);
    window.removeEventListener('pointermove', this.boundOnPointerMove);
    window.removeEventListener('pointerup', this.boundOnPointerUp);
    this.container.removeEventListener('wheel', this.boundOnWheel);
    this.container.removeEventListener('contextmenu', this.boundOnContextMenu);
    if (this.rafId) cancelAnimationFrame(this.rafId);
  }

  // ── Pan (right-click or middle-click drag) ──────────────

  private onPointerDown(e: PointerEvent) {
    // Only pan on right-click (2) or middle-click (1)
    if (e.button !== 1 && e.button !== 2) return;

    // Don't pan if pointer is on a card
    const target = e.target as HTMLElement;
    if (target !== this.container && target !== this.world) return;

    e.preventDefault();
    this.isPanning = true;
    this.panButton = e.button;
    this.lastPointer = { x: e.clientX, y: e.clientY };
    this.container!.setPointerCapture(e.pointerId);
    this.container!.style.cursor = 'grabbing';
  }

  private onPointerMove(e: PointerEvent) {
    if (!this.isPanning) return;
    if (this.rafId) cancelAnimationFrame(this.rafId);
    this.rafId = requestAnimationFrame(() => {
      const dx = e.clientX - this.lastPointer.x;
      const dy = e.clientY - this.lastPointer.y;
      this.viewport.x += dx;
      this.viewport.y += dy;
      this.lastPointer = { x: e.clientX, y: e.clientY };
      this.applyTransform();
      this.runCull();
      this.onViewportChange?.(this.getViewport());
    });
  }

  private onPointerUp(e: PointerEvent) {
    if (!this.isPanning || e.button !== this.panButton) return;
    this.isPanning = false;
    this.panButton = null;
    if (this.container) this.container.style.cursor = 'grab';
    this.onViewportChange?.(this.getViewport());
  }

  // ── Zoom (scroll wheel, cursor-centered) ───────────────

  private onWheel(e: WheelEvent) {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.92 : 1.08;
    const newZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, this.viewport.zoom * delta));

    const rect = this.container!.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;

    // Zoom toward cursor: keep the world point under cursor stationary
    this.viewport.x = cx - (cx - this.viewport.x) * (newZoom / this.viewport.zoom);
    this.viewport.y = cy - (cy - this.viewport.y) * (newZoom / this.viewport.zoom);
    this.viewport.zoom = newZoom;

    this.applyTransform();
    this.runCull();
    this.onViewportChange?.(this.getViewport());
  }

  // ── Transform ───────────────────────────────────────────

  private applyTransform() {
    if (!this.world) return;
    this.world.style.transform = `translate(${this.viewport.x}px, ${this.viewport.y}px) scale(${this.viewport.zoom})`;
  }

  // ── Virtual Culling ─────────────────────────────────────

  /** Register a card's world-space rect for culling. */
  registerCard(rect: CardRect) {
    this.cardRects.set(rect.id, rect);
  }

  unregisterCard(id: string) {
    this.cardRects.delete(id);
  }

  /** Update a card's registered rect (e.g. after move/resize). */
  updateCard(id: string, rect: Partial<CardRect>) {
    const existing = this.cardRects.get(id);
    if (existing) {
      this.cardRects.set(id, { ...existing, ...rect });
    }
  }

  /** Run culling: compute which cards are within viewport + padding. */
  runCull(): Set<string> {
    if (!this.container) return this.visibleIds;

    const bounds = this.getWorldBounds();
    const visible = new Set<string>();

    this.cardRects.forEach((rect, id) => {
      if (
        rect.x + rect.width >= bounds.left - CULL_PADDING &&
        rect.x <= bounds.right + CULL_PADDING &&
        rect.y + rect.height >= bounds.top - CULL_PADDING &&
        rect.y <= bounds.bottom + CULL_PADDING
      ) {
        visible.add(id);
      }
    });

    if (!setsEqual(this.visibleIds, visible)) {
      this.visibleIds = visible;
      this.onCull?.(visible);
    }

    return visible;
  }

  // ── Public API ──────────────────────────────────────────

  getViewport(): Viewport {
    return { ...this.viewport };
  }

  setViewport(v: Viewport, animate = false) {
    this.viewport = { ...v };
    if (animate && this.world) {
      this.world.style.transition = 'transform 0.3s cubic-bezier(0.4,0,0.2,1)';
      this.applyTransform();
      setTimeout(() => {
        if (this.world) this.world.style.transition = '';
      }, 300);
    } else {
      this.applyTransform();
    }
    this.runCull();
  }

  /** Convert screen coordinates to world coordinates. */
  screenToWorld(sx: number, sy: number): { x: number; y: number } {
    return {
      x: (sx - this.viewport.x) / this.viewport.zoom,
      y: (sy - this.viewport.y) / this.viewport.zoom,
    };
  }

  /** Convert world coordinates to screen coordinates. */
  worldToScreen(wx: number, wy: number): { x: number; y: number } {
    return {
      x: wx * this.viewport.zoom + this.viewport.x,
      y: wy * this.viewport.zoom + this.viewport.y,
    };
  }

  /** Get the world-space bounds of the visible viewport. */
  getWorldBounds(): Bounds {
    if (!this.container) return { left: 0, top: 0, right: 0, bottom: 0 };
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    return {
      left: -this.viewport.x / this.viewport.zoom,
      top: -this.viewport.y / this.viewport.zoom,
      right: (w - this.viewport.x) / this.viewport.zoom,
      bottom: (h - this.viewport.y) / this.viewport.zoom,
    };
  }

  /** Zoom to a specific level centered on a screen point. */
  zoomTo(zoom: number, cx?: number, cy?: number) {
    const z = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom));
    const rect = this.container?.getBoundingClientRect();
    const centerX = cx ?? (rect ? rect.width / 2 : 0);
    const centerY = cy ?? (rect ? rect.height / 2 : 0);
    this.viewport.x = centerX - (centerX - this.viewport.x) * (z / this.viewport.zoom);
    this.viewport.y = centerY - (centerY - this.viewport.y) * (z / this.viewport.zoom);
    this.viewport.zoom = z;
    this.applyTransform();
    this.runCull();
    this.onViewportChange?.(this.getViewport());
  }

  /** Fit all registered cards into view. */
  fitToContent() {
    if (!this.cardRects.size || !this.container) return;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    this.cardRects.forEach((r) => {
      minX = Math.min(minX, r.x);
      minY = Math.min(minY, r.y);
      maxX = Math.max(maxX, r.x + r.width);
      maxY = Math.max(maxY, r.y + r.height);
    });
    const contentW = maxX - minX;
    const contentH = maxY - minY;
    const cw = this.container.clientWidth;
    const ch = this.container.clientHeight;
    const scale = Math.min(cw / contentW, ch / contentH, 1) * 0.85;
    this.zoomTo(scale);
    this.viewport.x = (cw - contentW * scale) / 2 - minX * scale;
    this.viewport.y = (ch - contentH * scale) / 2 - minY * scale;
    this.applyTransform();
    this.runCull();
    this.onViewportChange?.(this.getViewport());
  }

  getVisibleIds(): Set<string> {
    return new Set(this.visibleIds);
  }
}

function setsEqual(a: Set<string>, b: Set<string>): boolean {
  if (a.size !== b.size) return false;
  for (const v of a) if (!b.has(v)) return false;
  return true;
}
