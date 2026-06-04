/**
 * LOOKING GLASS — Drag Manager
 * Handles dragging of individual canvas items.
 */

export class DragManager {
  constructor(engine) {
    this.engine = engine;
    this.isDragging = false;
    this.dragItem = null;
    this.offset = { x: 0, y: 0 };
    this.selectedItems = new Set();
    this.onDrop = null;
  }

  init(worldEl) {
    this.world = worldEl;
    this.world.addEventListener('pointerdown', this._onItemPointerDown.bind(this));
    window.addEventListener('pointermove', this._onPointerMove.bind(this));
    window.addEventListener('pointerup', this._onPointerUp.bind(this));
  }

  _onItemPointerDown(e) {
    const card = e.target.closest('.canvas-item');
    if (!card) return;
    e.stopPropagation(); // Prevent canvas pan when dragging cards

    // Multi-select with Shift
    if (e.shiftKey) {
      if (this.selectedItems.has(card)) {
        this.selectedItems.delete(card);
        card.classList.remove('selected');
      } else {
        this.selectedItems.add(card);
        card.classList.add('selected');
      }
      return;
    }

    // If clicking a card that isn't selected, clear selection
    if (!this.selectedItems.has(card)) {
      this.selectedItems.forEach(el => el.classList.remove('selected'));
      this.selectedItems.clear();
      this.selectedItems.add(card);
      card.classList.add('selected');
    }

    this.isDragging = true;
    this.dragItem = card;
    const rect = card.getBoundingClientRect();
    const worldRect = this.world.getBoundingClientRect();
    this.offset = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };

    // Bring to front
    card.style.zIndex = 9999;
    card.style.cursor = 'grabbing';
    card.style.transform = 'scale(1.02)';
    card.style.boxShadow = 'var(--shadow-lifted)';
  }

  _onPointerMove(e) {
    if (!this.isDragging) return;
    const items = this.selectedItems.size > 0 ? this.selectedItems : [this.dragItem];
    const worldPos = this.engine.screenToWorld(e.clientX - this.offset.x, e.clientY - this.offset.y);

    items.forEach(el => {
      const elOffset = items.length > 1 ? {
        x: parseFloat(el.dataset.x) - parseFloat(this.dragItem.dataset.x),
        y: parseFloat(el.dataset.y) - parseFloat(this.dragItem.dataset.y),
      } : { x: 0, y: 0 };
      el.style.left = `${worldPos.x + elOffset.x}px`;
      el.style.top = `${worldPos.y + elOffset.y}px`;
    });
  }

  _onPointerUp() {
    if (!this.isDragging) return;
    this.isDragging = false;

    const items = this.selectedItems.size > 0 ? this.selectedItems : [this.dragItem];
    items.forEach(el => {
      el.style.zIndex = el.dataset.zIndex || 0;
      el.style.cursor = 'grab';
      el.style.transform = '';
      el.style.boxShadow = '';
      // Update data attributes
      const left = parseFloat(el.style.left);
      const top = parseFloat(el.style.top);
      el.dataset.x = left;
      el.dataset.y = top;
    });

    if (this.onDrop) {
      this.onDrop(Array.from(items).map(el => ({
        id: el.dataset.id,
        x: parseFloat(el.dataset.x),
        y: parseFloat(el.dataset.y),
      })));
    }

    this.dragItem = null;
  }

  getSelected() {
    return Array.from(this.selectedItems);
  }

  clearSelection() {
    this.selectedItems.forEach(el => el.classList.remove('selected'));
    this.selectedItems.clear();
  }
}
