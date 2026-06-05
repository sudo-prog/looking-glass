/**
 * LOOKING GLASS — Drag Manager v2
 * Card drag system with glass spring physics, snap-to-grid, alignment guides,
 * and multi-drag support.
 *
 * Drag initiation: card header (48px height zone from top of card).
 * During drag: scale(1.02), rotation ±2°, shadow intensity increase, glass deformation.
 * Spring on drop: stiffness 250, damping 22, settle over ~280ms.
 * Snap-to-grid: optional, 32px alignment.
 * Alignment guides: appear at ±8px from other card edges.
 */

import { CanvasEngine } from './CanvasEngine';

interface DragState {
  cardId: string;
  startScreenX: number;
  startScreenY: number;
  startWorldX: number;
  startWorldY: number;
}

interface SnapResult {
  x: number;
  y: number;
  guideX: number | null; // screen x of vertical guide line, or null
  guideY: number | null; // screen y of horizontal guide line, or null
}

const HEADER_ZONE = 48; // px — drag initiation zone from top of card
const DRAG_SCALE = 1.02;
const DRAG_ROTATE_RANGE = 2; // degrees
const GRID_SIZE = 32; // px — snap-to-grid
const ALIGN_THRESHOLD = 8; // px — alignment guide trigger distance
const SPRING_STIFFNESS = 250;
const SPRING_DAMPING = 22;
const SETTLE_DURATION = 280; // ms

export class DragManager {
  private engine: CanvasEngine;
  private world: HTMLElement | null = null;
  private isDragging = false;
  private dragStates: DragState[] = [];
  private selectedIds: Set<string> = new Set();
  private snapEnabled = false;
  private liquidDeformation = false;

  private boundOnPointerDown: (e: PointerEvent) => void;
  private boundOnPointerMove: (e: PointerEvent) => void;
  private boundOnPointerUp: (e: PointerEvent) => void;

  /** All card elements keyed by id, for alignment guide computation. */
  private cardElements: Map<string, HTMLElement> = new Map();

  /** Guide line elements. */
  private guideLines: HTMLElement[] = [];

  /** Currently dragged card IDs. */
  private draggingIds: Set<string> = new Set();

  constructor(engine: CanvasEngine) {
    this.engine = engine;
    this.boundOnPointerDown = this.onPointerDown.bind(this);
    this.boundOnPointerMove = this.onPointerMove.bind(this);
    this.boundOnPointerUp = this.onPointerUp.bind(this);
  }

  init(world: HTMLElement) {
    this.world = world;
    world.addEventListener('pointerdown', this.boundOnPointerDown);
    window.addEventListener('pointermove', this.boundOnPointerMove);
    window.addEventListener('pointerup', this.boundOnPointerUp);
  }

  destroy() {
    if (!this.world) return;
    this.world.removeEventListener('pointerdown', this.boundOnPointerDown);
    window.removeEventListener('pointermove', this.boundOnPointerMove);
    window.removeEventListener('pointerup', this.boundOnPointerUp);
    this.clearGuides();
  }

  // ── Card registry (for alignment guides) ─────────────────

  registerCard(id: string, el: HTMLElement) {
    this.cardElements.set(id, el);
  }

  unregisterCard(id: string) {
    this.cardElements.delete(id);
  }

  setSelectedIds(ids: Set<string>) {
    this.selectedIds = new Set(ids);
  }

  setSnapEnabled(enabled: boolean) {
    this.snapEnabled = enabled;
  }

  // ── Drag initiation ──────────────────────────────────────

  private onPointerDown(e: PointerEvent) {
    // Only left-click initiates drag
    if (e.button !== 0) return;

    const card = (e.target as HTMLElement).closest('[data-card-id]') as HTMLElement | null;
    if (!card) return;

    const cardId = card.dataset.cardId!;

    // Check if pointer is within the header zone (top 48px of card)
    const cardRect = card.getBoundingClientRect();
    const localY = e.clientY - cardRect.top;
    if (localY > HEADER_ZONE) return;

    // Don't start drag on interactive elements
    const target = e.target as HTMLElement;
    if (
      target.closest('a') ||
      target.closest('button') ||
      target.closest('input') ||
      target.closest('textarea') ||
      target.closest('[contenteditable]')
    )
      return;

    e.stopPropagation();

    // Determine which cards to drag
    const dragIds = this.selectedIds.has(cardId)
      ? new Set(this.selectedIds)
      : new Set([cardId]);

    this.draggingIds = dragIds;
    this.dragStates = [];

    dragIds.forEach((id) => {
      const el = this.cardElements.get(id);
      if (!el) return;
      const worldPos = this.engine.screenToWorld(
        e.clientX,
        e.clientY
      );
      const rect = el.getBoundingClientRect();
      const currentWorldPos = this.engine.screenToWorld(rect.left, rect.top);
      this.dragStates.push({
        cardId: id,
        startScreenX: e.clientX,
        startScreenY: e.clientY,
        startWorldX: currentWorldPos.x,
        startWorldY: currentWorldPos.y,
      });
    });

    this.isDragging = true;
    this.liquidDeformation = true;

    // Apply drag visuals
    dragIds.forEach((id, idx) => {
      const el = this.cardElements.get(id);
      if (!el) return;
      el.style.zIndex = String(10000 + idx);
      el.style.cursor = 'grabbing';
      el.style.transform = `scale(${DRAG_SCALE}) rotate(${(idx % 2 === 0 ? 1 : -1) * DRAG_ROTATE_RANGE}deg)`;
      el.style.boxShadow = '0 12px 40px rgba(0,0,0,0.35)';
      el.style.transition = 'none';
      el.dataset.liquidDeform = 'true';
    });
  }

  // ── Drag move ────────────────────────────────────────────

  private onPointerMove(e: PointerEvent) {
    if (!this.isDragging) return;

    const dx = (e.clientX - this.dragStates[0].startScreenX) / this.engine.getViewport().zoom;
    const dy = (e.clientY - this.dragStates[0].startScreenY) / this.engine.getViewport().zoom;

    this.dragStates.forEach((state) => {
      let newX = state.startWorldX + dx;
      let newY = state.startWorldY + dy;

      // Snap-to-grid
      if (this.snapEnabled) {
        newX = Math.round(newX / GRID_SIZE) * GRID_SIZE;
        newY = Math.round(newY / GRID_SIZE) * GRID_SIZE;
      }

      const el = this.cardElements.get(state.cardId);
      if (el) {
        el.style.left = `${newX}px`;
        el.style.top = `${newY}px`;
      }
    });

    // Alignment guides
    this.updateAlignmentGuides(dx, dy);
  }

  // ── Alignment guides ─────────────────────────────────────

  private updateAlignmentGuides(dx: number, dy: number) {
    this.clearGuides();

    if (this.dragStates.length === 0) return;

    const primary = this.dragStates[0];
    const primaryEl = this.cardElements.get(primary.cardId);
    if (!primaryEl) return;

    const primaryRect = primaryEl.getBoundingClientRect();
    const primaryLeft = primary.startWorldX + dx;
    const primaryTop = primary.startWorldY + dy;
    const primaryRight = primaryLeft + primaryRect.width / this.engine.getViewport().zoom;
    const primaryBottom = primaryTop + primaryRect.height / this.engine.getViewport().zoom;

    let guideX: number | null = null;
    let guideY: number | null = null;

    this.cardElements.forEach((el, id) => {
      if (this.draggingIds.has(id)) return;

      const rect = el.getBoundingClientRect();
      const worldRect = this.engine.screenToWorld(rect.left, rect.top);
      const otherLeft = worldRect.x;
      const otherTop = worldRect.y;
      const otherRight = otherLeft + rect.width / this.engine.getViewport().zoom;
      const otherBottom = otherTop + rect.height / this.engine.getViewport().zoom;

      // Check horizontal alignment (left, center, right edges)
      const hChecks = [
        { a: primaryLeft, b: otherLeft },
        { a: primaryLeft, b: otherRight },
        { a: primaryRight, b: otherLeft },
        { a: primaryRight, b: otherRight },
        { a: (primaryLeft + primaryRight) / 2, b: (otherLeft + otherRight) / 2 },
      ];

      for (const check of hChecks) {
        if (Math.abs(check.a - check.b) < ALIGN_THRESHOLD / this.engine.getViewport().zoom) {
          const screenPos = this.engine.worldToScreen(check.b, 0);
          guideX = screenPos.x;
        }
      }

      // Check vertical alignment (top, center, bottom edges)
      const vChecks = [
        { a: primaryTop, b: otherTop },
        { a: primaryTop, b: otherBottom },
        { a: primaryBottom, b: otherTop },
        { a: primaryBottom, b: otherBottom },
        { a: (primaryTop + primaryBottom) / 2, b: (otherTop + otherBottom) / 2 },
      ];

      for (const check of vChecks) {
        if (Math.abs(check.a - check.b) < ALIGN_THRESHOLD / this.engine.getViewport().zoom) {
          const screenPos = this.engine.worldToScreen(0, check.b);
          guideY = screenPos.y;
        }
      }
    });

    if (guideX !== null) this.createGuideLine('vertical', guideX);
    if (guideY !== null) this.createGuideLine('horizontal', guideY);
  }

  private createGuideLine(axis: 'vertical' | 'horizontal', pos: number) {
    const el = document.createElement('div');
    el.style.cssText = `
      position: fixed;
      ${axis === 'vertical' ? `left:${pos}px;top:0;bottom:0;width:1px` : `top:${pos}px;left:0;right:0;height:1px`};
      background: rgba(215, 25, 33, 0.6);
      pointer-events: none;
      z-index: 99999;
    `;
    document.body.appendChild(el);
    this.guideLines.push(el);
  }

  private clearGuides() {
    this.guideLines.forEach((el) => el.remove());
    this.guideLines = [];
  }

  // ── Drop with spring physics ─────────────────────────────

  private onPointerUp(e: PointerEvent) {
    if (!this.isDragging) return;
    if (e.button !== 0) return;

    this.isDragging = false;
    this.clearGuides();

    const vp = this.engine.getViewport();

    this.dragStates.forEach((state, idx) => {
      const el = this.cardElements.get(state.cardId);
      if (!el) return;

      // Final position
      const finalX = parseFloat(el.style.left);
      const finalY = parseFloat(el.style.top);

      // Spring settle animation back to final position
      // We animate from a slightly offset position to create the "settle" feel
      const offsetX = (idx % 2 === 0 ? 1 : -1) * 2;
      const offsetY = (idx % 2 === 0 ? 1 : -1) * 1;

      el.style.transition = `none`;
      el.style.left = `${finalX + offsetX}px`;
      el.style.top = `${finalY + offsetY}px`;

      // Force reflow
      void el.offsetHeight;

      // Spring animation using Web Animations API with spring physics
      const duration = SETTLE_DURATION;
      const stiffness = SPRING_STIFFNESS;
      const damping = SPRING_DAMPING;

      // Compute spring keyframes
      const keyframes = this.computeSpringKeyframes(
        offsetX, offsetY, 0, 0,
        stiffness, damping, duration
      );

      const animation = el.animate(
        [
          { left: `${finalX + offsetX}px`, top: `${finalY + offsetY}px` },
          ...keyframes,
          { left: `${finalX}px`, top: `${finalY}px` },
        ],
        { duration, easing: 'linear', fill: 'forwards' }
      );

      animation.onfinish = () => {
        el.style.left = `${finalX}px`;
        el.style.top = `${finalY}px`;
        el.style.zIndex = '';
        el.style.cursor = '';
        el.style.transform = '';
        el.style.boxShadow = '';
        el.style.transition = '';
        delete el.dataset.liquidDeform;
      };
    });

    this.liquidDeformation = false;
    this.draggingIds.clear();
    this.dragStates = [];
  }

  /**
   * Compute spring physics keyframes for settle animation.
   * Uses damped harmonic oscillator: x(t) = A * e^(-ζωt) * cos(ωd*t)
   */
  private computeSpringKeyframes(
    fromX: number, fromY: number,
    toX: number, toY: number,
    stiffness: number, damping: number,
    duration: number,
    steps = 12
  ): { left: string; top: string }[] {
    const keyframes: { left: string; top: string }[] = [];
    const omega = Math.sqrt(stiffness);
    const zeta = damping / (2 * Math.sqrt(stiffness));

    for (let i = 1; i <= steps; i++) {
      const t = (i / steps) * (duration / 1000);
      const decay = Math.exp(-zeta * omega * t);
      const displacement = decay * Math.cos(omega * t);
      keyframes.push({
        left: `${toX + (fromX - toX) * displacement}px`,
        top: `${toY + (fromY - toY) * displacement}px`,
      });
    }

    return keyframes;
  }

  isDraggingActive(): boolean {
    return this.isDragging;
  }

  getDraggingIds(): Set<string> {
    return new Set(this.draggingIds);
  }

  isLiquidDeformation(): boolean {
    return this.liquidDeformation;
  }
}
