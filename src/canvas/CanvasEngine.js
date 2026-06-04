/**
 * LOOKING GLASS — Canvas Engine
 * Infinite canvas using CSS transforms (NOT canvas element).
 * Pan via pointer events on viewport. Zoom via wheel. Pinch via touch.
 */

export class CanvasEngine {
  constructor() {
    this.viewport = null;
    this.world = null;
    this.state = { x: 0, y: 0, scale: 1 };
    this.isPanning = false;
    this.lastPointer = { x: 0, y: 0 };
    this.rafId = null;
    this.onStateChange = null; // callback
  }

  init(containerEl) {
    this.viewport = containerEl;
    this.world = containerEl.querySelector('#canvas-world');
    if (!this.world) {
      this.world = document.createElement('div');
      this.world.id = 'canvas-world';
      containerEl.appendChild(this.world);
    }

    // Pointer events for pan
    this.viewport.addEventListener('pointerdown', this._onPointerDown.bind(this));
    window.addEventListener('pointermove', this._onPointerMove.bind(this));
    window.addEventListener('pointerup', this._onPointerUp.bind(this));

    // Wheel for zoom
    this.viewport.addEventListener('wheel', this._onWheel.bind(this), { passive: false });

    // Prevent default touch behaviors
    this.viewport.style.touchAction = 'none';
  }

  _onPointerDown(e) {
    // Only pan if clicking on viewport background, not on cards
    if (e.target !== this.viewport && e.target !== this.world) return;
    this.isPanning = true;
    this.lastPointer = { x: e.clientX, y: e.clientY };
    this.viewport.setPointerCapture(e.pointerId);
    this.viewport.style.cursor = 'grabbing';
  }

  _onPointerMove(e) {
    if (!this.isPanning) return;
    if (this.rafId) cancelAnimationFrame(this.rafId);
    this.rafId = requestAnimationFrame(() => {
      const dx = e.clientX - this.lastPointer.x;
      const dy = e.clientY - this.lastPointer.y;
      this.state.x += dx;
      this.state.y += dy;
      this.lastPointer = { x: e.clientX, y: e.clientY };
      this._applyTransform();
    });
  }

  _onPointerUp() {
    if (!this.isPanning) return;
    this.isPanning = false;
    this.viewport.style.cursor = 'grab';
    if (this.onStateChange) this.onStateChange(this.state);
  }

  _onWheel(e) {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.min(3, Math.max(0.1, this.state.scale * delta));

    // Zoom toward cursor
    const rect = this.viewport.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;

    this.state.x = cx - (cx - this.state.x) * (newScale / this.state.scale);
    this.state.y = cy - (cy - this.state.y) * (newScale / this.state.scale);
    this.state.scale = newScale;

    this._applyTransform();
    if (this.onStateChange) this.onStateChange(this.state);
  }

  _applyTransform() {
    if (!this.world) return;
    this.world.style.transform = `translate(${this.state.x}px, ${this.state.y}px) scale(${this.state.scale})`;
  }

  panTo(x, y, animate = false) {
    if (animate) {
      this.viewport.style.transition = 'transform 0.3s ease';
    }
    this.state.x = x;
    this.state.y = y;
    this._applyTransform();
  }

  zoomTo(scale, originX, originY) {
    const newScale = Math.min(3, Math.max(0.1, scale));
    this.state.x = originX - (originX - this.state.x) * (newScale / this.state.scale);
    this.state.y = originY - (originY - this.state.y) * (newScale / this.state.scale);
    this.state.scale = newScale;
    this._applyTransform();
  }

  fitToContent() {
    // Calculate bounds of all items
    const items = this.world.querySelectorAll('.canvas-item');
    if (!items.length) return;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    items.forEach(el => {
      const x = parseFloat(el.dataset.x) || 0;
      const y = parseFloat(el.dataset.y) || 0;
      const w = el.offsetWidth;
      const h = el.offsetHeight;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x + w);
      maxY = Math.max(maxY, y + h);
    });
    const contentW = maxX - minX;
    const contentH = maxY - minY;
    const scaleX = this.viewport.clientWidth / contentW;
    const scaleY = this.viewport.clientHeight / contentH;
    const scale = Math.min(scaleX, scaleY, 1) * 0.9;
    this.zoomTo(scale, this.viewport.clientWidth / 2, this.viewport.clientHeight / 2);
    this.panTo(
      (this.viewport.clientWidth - contentW * scale) / 2 - minX * scale,
      (this.viewport.clientHeight - contentH * scale) / 2 - minY * scale
    );
  }

  getViewportBounds() {
    const w = this.viewport.clientWidth;
    const h = this.viewport.clientHeight;
    return {
      left: -this.state.x / this.state.scale,
      top: -this.state.y / this.state.scale,
      right: (w - this.state.x) / this.state.scale,
      bottom: (h - this.state.y) / this.state.scale,
    };
  }

  worldToScreen(x, y) {
    return {
      x: x * this.state.scale + this.state.x,
      y: y * this.state.scale + this.state.y,
    };
  }

  screenToWorld(x, y) {
    return {
      x: (x - this.state.x) / this.state.scale,
      y: (y - this.state.y) / this.state.scale,
    };
  }
}
