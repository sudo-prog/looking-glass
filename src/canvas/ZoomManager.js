/**
 * LOOKING GLASS — Zoom Manager
 * Handles zoom constraints and smooth zoom transitions.
 */
export class ZoomManager {
  constructor(engine) {
    this.engine = engine;
    this.min = 0.1;
    this.max = 3.0;
    this.step = 0.1;
  }

  zoomIn() {
    const newScale = Math.min(this.max, this.engine.state.scale * (1 + this.step));
    this.engine.zoomTo(newScale, this.engine.viewport.clientWidth / 2, this.engine.viewport.clientHeight / 2);
  }

  zoomOut() {
    const newScale = Math.max(this.min, this.engine.state.scale * (1 - this.step));
    this.engine.zoomTo(newScale, this.engine.viewport.clientWidth / 2, this.engine.viewport.clientHeight / 2);
  }

  reset() {
    this.engine.zoomTo(1, this.engine.viewport.clientWidth / 2, this.engine.viewport.clientHeight / 2);
    this.engine.panTo(0, 0);
  }

  fitToContent() {
    this.engine.fitToContent();
  }
}
