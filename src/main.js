/**
 * LOOKING GLASS — Main Entry Point
 * V0.1: Infinite canvas + bookmark import + URL paste + PWA
 */
import { CanvasEngine } from './canvas/CanvasEngine.js';
import { DragManager } from './canvas/DragManager.js';
import { ZoomManager } from './canvas/ZoomManager.js';
import { BaseCard } from './cards/BaseCard.js';
import { WebClipCard } from './cards/WebClipCard.js';
import { BookmarkCard } from './cards/BookmarkCard.js';
import { Toolbar } from './ui/Toolbar.js';
import { Sidebar } from './ui/Sidebar.js';
import { Lightbox } from './ui/Lightbox.js';
import { store } from './data/store.js';
import { createItem, ITEM_TYPES, CANVAS_STATE_SCHEMA } from './data/schema.js';
import { fetchMetadata } from './utils/meta-fetcher.js';
import './styles/tokens.css';
import './styles/canvas.css';

class LookingGlass {
  constructor() {
    this.engine = new CanvasEngine();
    this.dragManager = new DragManager(this.engine);
    this.zoomManager = new ZoomManager(this.engine);
    this.lightbox = new Lightbox();
    this.cards = new Map();
    this.currentCanvas = { ...CANVAS_STATE_SCHEMA, id: crypto.randomUUID() };
  }

  async init() {
    // Init DB
    await store.init();

    // Setup UI
    const app = document.getElementById('app');
    app.innerHTML = '';

    const sidebar = new Sidebar(null, {
      addSpace: () => this.addSpace(),
    });
    app.appendChild(sidebar.render());

    const viewport = document.createElement('div');
    viewport.id = 'canvas-viewport';
    viewport.style.left = '240px'; // sidebar offset
    app.appendChild(viewport);

    const toolbar = new Toolbar(null, {
      'add-url': () => this.addUrl(),
      'delete': () => this.deleteSelected(),
      'zoom-in': () => this.zoomManager.zoomIn(),
      'zoom-out': () => this.zoomManager.zoomOut(),
      'fit': () => this.zoomManager.fitToContent(),
      'export': () => this.exportData(),
      'import': () => this.importData(),
    });
    app.appendChild(toolbar.render());

    // Init canvas engine
    this.engine.init(viewport);
    this.engine.onStateChange = (state) => {
      this.currentCanvas.viewport = state;
      store.saveCanvas(this.currentCanvas);
    };

    // Init drag manager
    this.dragManager.init(viewport.querySelector('#canvas-world'));
    this.dragManager.onDrop = (items) => {
      items.forEach(({ id, x, y }) => {
        const card = this.cards.get(id);
        if (card) {
          card.item.x = x;
          card.item.y = y;
          store.upsertItem(card.item);
        }
      });
    };

    // Load saved canvas
    await this.loadCanvas();

    // Keyboard shortcuts
    this._onKey = (e) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        // Don't delete if user is typing in an input
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
        this.deleteSelected();
      }
      if (e.key === 'Escape') {
        this.dragManager.clearSelection();
      }
      if (e.key === '+' || e.key === '=') this.zoomManager.zoomIn();
      if (e.key === '-') this.zoomManager.zoomOut();
      if (e.key === '0') this.zoomManager.reset();
    };
    document.addEventListener('keydown', this._onKey);

    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
  }

  async loadCanvas() {
    const canvases = await store.listCanvases();
    if (canvases.length > 0) {
      this.currentCanvas = canvases[0];
      this.engine.state = { ...this.currentCanvas.viewport };
      this.engine._applyTransform();
      // Render items
      for (const item of this.currentCanvas.items) {
        this.renderCard(item);
      }
    }
  }

  renderCard(item) {
    let card;
    switch (item.type) {
      case ITEM_TYPES.BOOKMARK:
        card = new BookmarkCard(item);
        break;
      case ITEM_TYPES.WEB_CLIP:
        card = new WebClipCard(item);
        break;
      default:
        card = new BaseCard(item);
    }
    const el = card.render();
    this.engine.world.appendChild(el);
    this.cards.set(item.id, card);

    // Click to open lightbox
    el.addEventListener('dblclick', () => this.lightbox.open(item));
  }

  async addUrl() {
    const url = prompt('Enter URL:');
    if (!url) return;

    const metadata = await fetchMetadata(url);
    const item = createItem({
      type: ITEM_TYPES.WEB_CLIP,
      x: Math.random() * 400 - 200,
      y: Math.random() * 400 - 200,
      content: {
        title: metadata.title || url,
        description: metadata.description || '',
        url: metadata.canonical_url || url,
        image_url: metadata.image_url,
      },
      meta: {
        source: 'url_paste',
        domain: metadata.domain,
        fetch_status: metadata.fetch_status,
      },
    });

    this.currentCanvas.items.push(item);
    await store.upsertItem(item);
    await store.saveCanvas(this.currentCanvas);
    this.renderCard(item);
  }

  addSpace() {
    const name = prompt('Space name:');
    if (!name) return;
    // V0.1: just create a new canvas
    this.currentCanvas = { ...CANVAS_STATE_SCHEMA, id: crypto.randomUUID(), name };
    this.engine.world.innerHTML = '';
    this.cards.clear();
    store.saveCanvas(this.currentCanvas);
  }

  async deleteSelected() {
    const selected = this.dragManager.getSelected();
    if (!selected.length) return;
    const confirmed = confirm(`Delete ${selected.length} card(s)?`);
    if (!confirmed) return;
    for (const el of selected) {
      const id = el.dataset.id;
      this.cards.get(id)?.destroy();
      this.cards.delete(id);
      await store.deleteItem(id);
      this.currentCanvas.items = this.currentCanvas.items.filter(i => i.id !== id);
    }
    this.dragManager.clearSelection();
    await store.saveCanvas(this.currentCanvas);
  }

  async exportData() {
    const data = JSON.stringify(this.currentCanvas, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `looking-glass-${this.currentCanvas.name || 'export'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async importData() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const text = await file.text();
      try {
        const data = JSON.parse(text);
        this.currentCanvas = data;
        this.engine.world.innerHTML = '';
        this.cards.clear();
        await store.saveCanvas(this.currentCanvas);
        for (const item of data.items) {
          await store.upsertItem(item);
          this.renderCard(item);
        }
      } catch (err) {
        alert('Invalid JSON file');
      }
    };
    input.click();
  }
}

// Bootstrap
const app = new LookingGlass();
app.init();
