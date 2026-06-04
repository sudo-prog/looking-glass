/**
 * LOOKING GLASS — Minimap Component
 *
 * Renders a simplified overview of the entire canvas with a draggable
 * viewport indicator. Click to pan. Auto-hides when zoomed in past
 * the coverage threshold.
 *
 * Configurable position: 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right'
 */

import {
  computeContentBounds,
  computeMinimapScale,
  worldToMinimap,
  minimapToWorld,
  viewportCoverage,
} from '../../utils/minimap/scale.js';

export class Minimap {
  constructor(engine, options = {}) {
    this.engine = engine;
    this.options = {
      position: options.position || 'bottom-right',
      width: options.width || 200,
      height: options.height || 150,
      padding: 10,
      autoHideThreshold: options.autoHideThreshold || 0.8,
      bgColor: options.bgColor || 'rgba(20, 20, 30, 0.85)',
      viewportColor: options.viewportColor || 'rgba(100, 140, 255, 0.25)',
      viewportBorder: options.viewportBorder || 'rgba(100, 140, 255, 0.8)',
      elementColor: options.elementColor || 'rgba(200, 200, 220, 0.5)',
      ...options,
    };

    this.el = null;
    this.canvas = null;
    this.ctx = null;
    this.isDragging = false;
    this.contentBounds = null;
    this.minimapScale = 1;
    this._onStateChange = this._onStateChange.bind(this);
    this._onPointerDown = this._onPointerDown.bind(this);
    this._onPointerMove = this._onPointerMove.bind(this);
    this._onPointerUp = this._onPointerUp.bind(this);
  }

  init(container) {
    // Build DOM
    this.el = document.createElement('div');
    this.el.className = 'minimap minimap--' + this.options.position;
    this.el.style.cssText = `
      position: fixed;
      width: ${this.options.width}px;
      height: ${this.options.height}px;
      background: ${this.options.bgColor};
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 8px;
      overflow: hidden;
      z-index: 90;
      pointer-events: auto;
      transition: opacity 0.2s ease, transform 0.2s ease;
      backdrop-filter: blur(4px);
    `;

    // Position
    const pos = this.options.position;
    if (pos.includes('bottom')) this.el.style.bottom = '16px';
    if (pos.includes('top')) this.el.style.top = '16px';
    if (pos.includes('right')) this.el.style.right = '16px';
    if (pos.includes('left')) this.el.style.left = '16px';

    this.canvas = document.createElement('canvas');
    this.canvas.width = this.options.width;
    this.canvas.height = this.options.height;
    this.canvas.style.display = 'block';
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';
    this.el.appendChild(this.canvas);

    this.ctx = this.canvas.getContext('2d');

    container.appendChild(this.el);

    // Subscribe to engine state changes (chain with existing handler)
    this._prevOnStateChange = this.engine.onStateChange;
    this.engine.onStateChange = (state) => {
      this._render();
      if (this._prevOnStateChange) this._prevOnStateChange(state);
    };

    // Pointer events for viewport dragging
    this.canvas.addEventListener('pointerdown', this._onPointerDown);
    window.addEventListener('pointermove', this._onPointerMove);
    window.addEventListener('pointerup', this._onPointerUp);

    // Initial render
    this._render();
  }

  _onStateChange(state) {
    this._render();
  }

  _getContentBounds() {
    return computeContentBounds(this.engine.world);
  }

  _getViewportWorldBounds() {
    return this.engine.getViewportBounds();
  }

  _render() {
    const ctx = this.ctx;
    const w = this.options.width;
    const h = this.options.height;
    const pad = this.options.padding;

    // Clear
    ctx.clearRect(0, 0, w, h);

    // Compute bounds
    this.contentBounds = this._getContentBounds();
    this.minimapScale = computeMinimapScale(this.contentBounds, w, h, pad);

    // Check auto-hide
    const vpBounds = this._getViewportWorldBounds();
    const coverage = viewportCoverage(vpBounds, this.contentBounds);
    if (coverage >= this.options.autoHideThreshold) {
      this.el.style.opacity = '0';
      this.el.style.pointerEvents = 'none';
      return;
    }
    this.el.style.opacity = '1';
    this.el.style.pointerEvents = 'auto';

    // Draw element rectangles
    const items = this.engine.world.querySelectorAll('.canvas-item');
    ctx.fillStyle = this.options.elementColor;
    items.forEach(el => {
      const ex = parseFloat(el.dataset.x) || 0;
      const ey = parseFloat(el.dataset.y) || 0;
      const ew = parseFloat(el.dataset.width) || el.offsetWidth || 320;
      const eh = parseFloat(el.dataset.height) || el.offsetHeight || 200;
      const pos = worldToMinimap(ex, ey, this.contentBounds, this.minimapScale, pad);
      const sw = Math.max(ew * this.minimapScale, 2);
      const sh = Math.max(eh * this.minimapScale, 2);
      ctx.fillRect(pos.x, pos.y, sw, sh);
    });

    // Draw viewport indicator
    const vpTL = worldToMinimap(
      vpBounds.left, vpBounds.top,
      this.contentBounds, this.minimapScale, pad
    );
    const vpW = (vpBounds.right - vpBounds.left) * this.minimapScale;
    const vpH = (vpBounds.bottom - vpBounds.top) * this.minimapScale;

    // Viewport fill
    ctx.fillStyle = this.options.viewportColor;
    ctx.fillRect(vpTL.x, vpTL.y, vpW, vpH);

    // Viewport border
    ctx.strokeStyle = this.options.viewportBorder;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(vpTL.x, vpTL.y, vpW, vpH);
  }

  _onPointerDown(e) {
    this.isDragging = true;
    this.canvas.setPointerCapture(e.pointerId);
    this._handleViewportMove(e);
  }

  _onPointerMove(e) {
    if (!this.isDragging) return;
    this._handleViewportMove(e);
  }

  _onPointerUp() {
    if (!this.isDragging) return;
    this.isDragging = false;
  }

  _handleViewportMove(e) {
    const rect = this.canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    if (!this.contentBounds) this.contentBounds = this._getContentBounds();
    if (!this.minimapScale) {
      this.minimapScale = computeMinimapScale(
        this.contentBounds,
        this.options.width,
        this.options.height,
        this.options.padding
      );
    }

    const world = minimapToWorld(
      mx, my,
      this.contentBounds, this.minimapScale,
      this.options.padding
    );

    // Center viewport on the clicked position
    const vpBounds = this.engine.getViewportBounds();
    const vpW = vpBounds.right - vpBounds.left;
    const vpH = vpBounds.bottom - vpBounds.top;

    const targetX = world.x - this.engine.viewport.clientWidth / (2 * this.engine.state.scale);
    const targetY = world.y - this.engine.viewport.clientHeight / (2 * this.engine.state.scale);

    this.engine.panTo(-targetX * this.engine.state.scale, -targetY * this.engine.state.scale);
    this.engine._applyTransform();

    if (this.engine.onStateChange) {
      this.engine.onStateChange(this.engine.state);
    }
  }

  destroy() {
    if (this.canvas) {
      this.canvas.removeEventListener('pointerdown', this._onPointerDown);
    }
    window.removeEventListener('pointermove', this._onPointerMove);
    window.removeEventListener('pointerup', this._onPointerUp);
    if (this.el && this.el.parentNode) {
      this.el.parentNode.removeChild(this.el);
    }
    // Restore previous onStateChange handler
    if (this._prevOnStateChange) {
      this.engine.onStateChange = this._prevOnStateChange;
    }
  }

  /**
   * Update configuration at runtime.
   */
  configure(options) {
    Object.assign(this.options, options);
    this._render();
  }
}
