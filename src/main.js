/**
 * LOOKING GLASS — Main Entry Point
 * V0.3: Notes, Images, Groups, Search, Undo/Redo, Export, Minimap, Bottom Sheet
 */
import { CanvasEngine } from './canvas/CanvasEngine.js';
import { DragManager } from './canvas/DragManager.js';
import { ZoomManager } from './canvas/ZoomManager.js';
import { BaseCard } from './cards/BaseCard.js';
import { WebClipCard } from './cards/WebClipCard.js';
import { BookmarkCard } from './cards/BookmarkCard.js';
import { NoteCard } from './cards/NoteCard.js';
import { ImageCard } from './cards/ImageCard.js';
import { GroupCard } from './cards/GroupCard.js';
import { Toolbar } from './ui/Toolbar.js';
import { Sidebar } from './ui/Sidebar.js';
import { Lightbox } from './ui/Lightbox.js';
import { Minimap } from './components/minimap/Minimap.js';
import { ExportDialog } from './utils/export/ExportDialog.js';
import { BottomSheet } from './components/mobile/BottomSheet.js';
import { store } from './data/store.js';
import { createItem, ITEM_TYPES, CANVAS_STATE_SCHEMA } from './data/schema.js';
import { fetchMetadata } from './utils/meta-fetcher.js';
import { SearchEngine } from './search/SearchEngine.js';
import { GroupManager } from './groups/GroupManager.js';
import {
  HistoryManager,
  AddItemCommand,
  DeleteItemCommand,
  MoveItemCommand,
  UpdateItemCommand,
  GroupCommand,
  UngroupCommand,
} from './history/HistoryManager.js';
import './styles/tokens.css';
import './styles/canvas.css';
import './components/mobile/BottomSheet.css';

class LookingGlass {
  constructor() {
    this.engine = new CanvasEngine();
    this.dragManager = new DragManager(this.engine);
    this.zoomManager = new ZoomManager(this.engine);
    this.lightbox = new Lightbox();
    this.cards = new Map();
    this.currentCanvas = { ...CANVAS_STATE_SCHEMA, id: crypto.randomUUID() };

    // V0.2 managers
    this.searchEngine = new SearchEngine();
    this.groupManager = new GroupManager();
    this.history = new HistoryManager(100);

    // Active filters
    this.activeFilters = new Set(['bookmark', 'web_clip', 'note', 'image', 'group']);
  }

  async init() {
    // Init DB
    await store.init();

    // Setup UI
    const app = document.getElementById('app');
    app.innerHTML = '';

    const sidebar = new Sidebar(null, {
      addSpace: () => this.addSpace(),
      'filter-toggle': (filter, checked) => this.toggleFilter(filter, checked),
    });
    app.appendChild(sidebar.render());

    const viewport = document.createElement('div');
    viewport.id = 'canvas-viewport';
    viewport.style.left = '240px';
    app.appendChild(viewport);

    const toolbar = new Toolbar(null, {
      'add-note': () => this.addNote(),
      'add-url': () => this.addUrl(),
      'add-image': () => this.addImage(),
      'group-selected': () => this.groupSelected(),
      'delete': () => this.deleteSelected(),
      'undo': () => this.undo(),
      'redo': () => this.redo(),
      'zoom-in': () => this.zoomManager.zoomIn(),
      'zoom-out': () => this.zoomManager.zoomOut(),
      'fit': () => this.zoomManager.fitToContent(),
      'export': () => this.exportData(),
      'import': () => this.importData(),
      'search': (query) => this.performSearch(query),
      'search-clear': () => this.clearSearch(),
    });
    app.appendChild(toolbar.render());

    // Init canvas engine
    this.engine.init(viewport);
    this.engine.onStateChange = (state) => {
      this.currentCanvas.viewport = state;
      store.saveCanvas(this.currentCanvas);
      toolbar.updateZoomIndicator(state.scale);
    };

    // Init minimap
    this.minimap = new Minimap(this.engine, {
      position: 'bottom-right',
      width: 200,
      height: 150,
    });
    this.minimap.init(app);

    // Init bottom sheet for mobile panels
    this.bottomSheet = new BottomSheet({
      content: this._renderSheetContent(),
      onSnap: () => {},
      onDismiss: () => {},
    });
    document.body.appendChild(this.bottomSheet.element);

    // Init drag manager
    this.dragManager.init(viewport.querySelector('#canvas-world'));
    this.dragManager.onDrop = (items) => {
      items.forEach(({ id, x, y }) => {
        const card = this.cards.get(id);
        if (card) {
          const oldX = card.item.x;
          const oldY = card.item.y;
          card.item.x = x;
          card.item.y = y;
          store.upsertItem(card.item);

          // History
          this.history.push(new MoveItemCommand(id, oldX, oldY, x, y));

          // If card is in a group, move group too
          if (card.item.meta?.group_id) {
            const groupId = card.item.meta.group_id;
            const groupCard = this.cards.get(groupId);
            if (groupCard) {
              groupCard.item.x += (x - oldX);
              groupCard.item.y += (y - oldY);
              store.upsertItem(groupCard.item);
            }
          }
        }
      });
      this.updateSearchIndex();
    };

    // Load saved canvas
    await this.loadCanvas();

    // Keyboard shortcuts
    this._onKey = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) return;

      if (e.key === 'Delete' || e.key === 'Backspace') {
        this.deleteSelected();
      }
      if (e.key === 'Escape') {
        this.dragManager.clearSelection();
      }
      if (e.key === '+' || e.key === '=') this.zoomManager.zoomIn();
      if (e.key === '-') this.zoomManager.zoomOut();
      if (e.key === '0') this.zoomManager.reset();

      // V0.2 shortcuts
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z' && !e.shiftKey) {
          e.preventDefault();
          this.undo();
        }
        if ((e.key === 'z' && e.shiftKey) || e.key === 'y') {
          e.preventDefault();
          this.redo();
        }
        if (e.key === 'g') {
          e.preventDefault();
          this.groupSelected();
        }
      }
      if (e.key === '/' || (e.ctrlKey && e.key === 'k')) {
        e.preventDefault();
        // Focus search
        const searchInput = document.querySelector('.toolbar-search-input');
        const searchToggle = document.querySelector('.toolbar-search-toggle');
        const searchWrap = document.querySelector('.toolbar-search-wrap');
        if (searchInput && searchWrap && searchToggle) {
          searchWrap.classList.add('active');
          searchToggle.classList.add('hidden');
          searchInput.focus();
        }
      }
      if (e.key === 'n') {
        this.addNote();
      }
    };
    document.addEventListener('keydown', this._onKey);

    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
  }

  _renderSheetContent() {
    return `
      <h3>Canvas Info</h3>
      <p>Space: ${this.currentCanvas.name || 'Untitled'}</p>
      <p>Cards: ${this.currentCanvas.items.length}</p>
      <hr style="border-color: rgba(255,255,255,0.1); margin: 12px 0;" />
      <h3>Shortcuts</h3>
      <p><strong>Delete</strong> — Remove selected</p>
      <p><strong>Escape</strong> — Deselect</p>
      <p><strong>Ctrl+Z</strong> — Undo</p>
      <p><strong>Ctrl+Y</strong> — Redo</p>
      <p><strong>Ctrl+G</strong> — Group selected</p>
      <p><strong>N</strong> — New note</p>
      <p><strong>Ctrl+K or /</strong> — Search</p>
      <p><strong>+/-</strong> — Zoom in/out</p>
      <p><strong>0</strong> — Reset zoom</p>
    `;
  }

  showMobilePanel() {
    this.bottomSheet.content = this._renderSheetContent();
    this.bottomSheet.open(1);
  }

  async loadCanvas() {
    const canvases = await store.listCanvases();
    if (canvases.length > 0) {
      this.currentCanvas = canvases[0];
      this.engine.state = { ...this.currentCanvas.viewport };
      this.engine._applyTransform();
      for (const item of this.currentCanvas.items) {
        this.renderCard(item);
      }
      this.updateSearchIndex();
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
      case ITEM_TYPES.NOTE:
        card = new NoteCard(item);
        break;
      case ITEM_TYPES.IMAGE:
        card = new ImageCard(item);
        break;
      case ITEM_TYPES.GROUP:
        card = new GroupCard(item);
        break;
      default:
        card = new BaseCard(item);
    }
    const el = card.render();
    this.engine.world.appendChild(el);
    this.cards.set(item.id, card);

    // Click to open lightbox
    el.addEventListener('dblclick', (e) => {
      if (e.target.isContentEditable) return;
      this.lightbox.open(item);
    });

    // V0.2: Group toggle
    el.addEventListener('group-toggle', (e) => {
      const groupItem = e.detail.item;
      const updated = this.groupManager.toggleCollapsed(groupItem);
      Object.assign(groupItem, updated);
      store.upsertItem(groupItem);
      card.setCollapsed(updated.meta.collapsed);
    });

    // V0.2: Group rename
    el.addEventListener('group-rename', (e) => {
      store.upsertItem(e.detail.item);
    });

    // V0.2: Note save
    el.addEventListener('note-save', (e) => {
      store.upsertItem(e.detail.item);
      this.updateSearchIndex();
    });
  }

  async addNote() {
    const item = createItem({
      type: ITEM_TYPES.NOTE,
      x: Math.random() * 400 - 200,
      y: Math.random() * 400 - 200,
      content: { text: '' },
      meta: { source: 'manual' },
    });

    this.currentCanvas.items.push(item);
    await store.upsertItem(item);
    await store.saveCanvas(this.currentCanvas);
    this.renderCard(item);
    this.history.push(new AddItemCommand(item, this.currentCanvas));
    this.updateSearchIndex();
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
    this.history.push(new AddItemCommand(item, this.currentCanvas));
    this.updateSearchIndex();
  }

  async addImage() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const item = await ImageCard.fromFile(
        file,
        Math.random() * 400 - 200,
        Math.random() * 400 - 200
      );

      this.currentCanvas.items.push(item);
      await store.upsertItem(item);
      await store.saveCanvas(this.currentCanvas);
      this.renderCard(item);
      this.history.push(new AddItemCommand(item, this.currentCanvas));
      this.updateSearchIndex();
    };
    input.click();
  }

  async groupSelected() {
    const selected = this.dragManager.getSelected();
    if (selected.length < 2) {
      alert('Select 2+ cards to group (Shift+click)');
      return;
    }

    const selectedItems = selected
      .map(el => this.cards.get(el.dataset.id)?.item)
      .filter(Boolean);

    if (selectedItems.length < 2) return;

    const name = prompt('Group name:', 'Group');
    if (name === null) return;

    const result = this.groupManager.createGroup(selectedItems, name);
    if (!result) return;

    // Add group to canvas
    this.currentCanvas.items.push(result.group);
    await store.upsertItem(result.group);

    // Update children
    for (const updated of result.updates) {
      const idx = this.currentCanvas.items.findIndex(i => i.id === updated.id);
      if (idx !== -1) {
        this.currentCanvas.items[idx] = updated;
        await store.upsertItem(updated);
      }
    }

    // Re-render
    this.engine.world.innerHTML = '';
    this.cards.clear();
    for (const item of this.currentCanvas.items) {
      this.renderCard(item);
    }

    await store.saveCanvas(this.currentCanvas);
    this.history.push(new GroupCommand(result.group, result.updates));
    this.updateSearchIndex();
  }

  addSpace() {
    const name = prompt('Space name:');
    if (!name) return;
    this.currentCanvas = { ...CANVAS_STATE_SCHEMA, id: crypto.randomUUID(), name };
    this.engine.world.innerHTML = '';
    this.cards.clear();
    this.history.clear();
    store.saveCanvas(this.currentCanvas);
  }

  async deleteSelected() {
    const selected = this.dragManager.getSelected();
    if (!selected.length) return;
    const confirmed = confirm(`Delete ${selected.length} card(s)?`);
    if (!confirmed) return;

    for (const el of selected) {
      const id = el.dataset.id;
      const card = this.cards.get(id);
      if (!card) continue;

      // If deleting a group, ungroup children first
      if (card.item.type === ITEM_TYPES.GROUP) {
        const childIds = this.groupManager.getChildIds(id);
        for (const childId of childIds) {
          const childCard = this.cards.get(childId);
          if (childCard) {
            childCard.item.meta.group_id = null;
            await store.upsertItem(childCard.item);
          }
        }
        this.groupManager.groups.delete(id);
      }

      card.destroy();
      this.cards.delete(id);
      await store.deleteItem(id);
      this.currentCanvas.items = this.currentCanvas.items.filter(i => i.id !== id);
      this.history.push(new DeleteItemCommand(card.item, this.currentCanvas));
    }
    this.dragManager.clearSelection();
    await store.saveCanvas(this.currentCanvas);
    this.updateSearchIndex();
  }

  // ── Search ──────────────────────────────
  updateSearchIndex() {
    this.searchEngine.index(this.currentCanvas.items);
  }

  performSearch(query) {
    const result = this.searchEngine.search(query);
    this.applySearchHighlight(result.ids);
    return result;
  }

  clearSearch() {
    this.searchEngine.clear();
    this.applySearchHighlight(null);
  }

  applySearchHighlight(matchingIds) {
    this.cards.forEach((card, id) => {
      if (!card.el) return;
      if (matchingIds === null) {
        card.el.classList.remove('search-dimmed', 'search-match');
      } else if (matchingIds.has(id)) {
        card.el.classList.add('search-match');
        card.el.classList.remove('search-dimmed');
      } else {
        card.el.classList.add('search-dimmed');
        card.el.classList.remove('search-match');
      }
    });
  }

  // ── Undo/Redo ──────────────────────────
  undo() {
    const entry = this.history.undo();
    if (!entry) return;

    const { command, result } = entry;
    this.applyUndoRedo(command, result, true);
  }

  redo() {
    const entry = this.history.redo();
    if (!entry) return;

    const { command, result } = entry;
    this.applyUndoRedo(command, result, false);
  }

  async applyUndoRedo(command, result, isUndo) {
    switch (command.type) {
      case 'add': {
        // Undo add = remove; Redo add = re-add
        if (isUndo) {
          this.currentCanvas.items = this.currentCanvas.items.filter(i => i.id !== command.item.id);
          const card = this.cards.get(command.item.id);
          if (card) { card.destroy(); this.cards.delete(command.item.id); }
          await store.deleteItem(command.item.id);
        } else {
          this.currentCanvas.items.push(command.item);
          await store.upsertItem(command.item);
          this.renderCard(command.item);
        }
        break;
      }
      case 'delete': {
        // Undo delete = re-add; Redo delete = remove
        if (isUndo) {
          this.currentCanvas.items.push(command.item);
          await store.upsertItem(command.item);
          this.renderCard(command.item);
        } else {
          this.currentCanvas.items = this.currentCanvas.items.filter(i => i.id !== command.item.id);
          const card = this.cards.get(command.item.id);
          if (card) { card.destroy(); this.cards.delete(command.item.id); }
          await store.deleteItem(command.item.id);
        }
        break;
      }
      case 'move': {
        const item = this.currentCanvas.items.find(i => i.id === command.itemId);
        if (item) {
          if (isUndo) {
            item.x = result.x;
            item.y = result.y;
          } else {
            item.x = command.newX;
            item.y = command.newY;
          }
          const card = this.cards.get(command.itemId);
          if (card) {
            card.item = item;
            card.el.style.left = `${item.x}px`;
            card.el.style.top = `${item.y}px`;
            card.el.dataset.x = item.x;
            card.el.dataset.y = item.y;
          }
          await store.upsertItem(item);
        }
        break;
      }
      case 'group': {
        if (isUndo) {
          // Remove group, restore children
          this.currentCanvas.items = this.currentCanvas.items.filter(i => i.id !== command.groupId);
          const groupCard = this.cards.get(command.groupId);
          if (groupCard) { groupCard.destroy(); this.cards.delete(command.groupId); }
          await store.deleteItem(command.groupId);
          for (const childId of result.childIds) {
            const item = this.currentCanvas.items.find(i => i.id === childId);
            if (item) { item.meta.group_id = null; await store.upsertItem(item); }
          }
        } else {
          this.currentCanvas.items.push(command.group);
          await store.upsertItem(command.group);
          this.renderCard(command.group);
          for (const update of command.childUpdates) {
            const idx = this.currentCanvas.items.findIndex(i => i.id === update.id);
            if (idx !== -1) { this.currentCanvas.items[idx] = update; await store.upsertItem(update); }
          }
        }
        break;
      }
    }

    await store.saveCanvas(this.currentCanvas);
    this.updateSearchIndex();

    // Update toolbar undo/redo button states
    const toolbar = document.querySelector('.toolbar');
    if (toolbar) {
      const undoBtn = toolbar.querySelector('[data-action="undo"]');
      const redoBtn = toolbar.querySelector('[data-action="redo"]');
      if (undoBtn) undoBtn.classList.toggle('toolbar-btn-disabled', !this.history.canUndo());
      if (redoBtn) redoBtn.classList.toggle('toolbar-btn-disabled', !this.history.canRedo());
    }
  }

  // ── Filters ────────────────────────────
  toggleFilter(filter, checked) {
    if (checked) {
      this.activeFilters.add(filter);
    } else {
      this.activeFilters.delete(filter);
    }
    this.applyFilters();
  }

  applyFilters() {
    this.cards.forEach((card) => {
      if (!card.el) return;
      const type = card.item.type;
      const visible = this.activeFilters.has(type);
      card.el.style.display = visible ? '' : 'none';
    });
  }

  // ── Import/Export ───────────────────────
  async exportData() {
    const dialog = new ExportDialog(this);
    dialog.open({
      canvas: this.currentCanvas,
      allCanvases: [this.currentCanvas],
      worldEl: this.engine.world,
      viewportEl: this.engine.viewport,
    });
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
        this.history.clear();
        await store.saveCanvas(this.currentCanvas);
        for (const item of data.items) {
          await store.upsertItem(item);
          this.renderCard(item);
        }
        this.updateSearchIndex();
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
