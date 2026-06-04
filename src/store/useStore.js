/**
 * LOOKING GLASS — Zustand Store
 * Global React state for the canvas app
 */
import { create } from 'zustand';
import { store as idbStore } from '../data/store.js';
import { createItem, ITEM_TYPES } from '../data/schema.js';

export const useStore = create((set, get) => ({
  // Canvas state
  canvasId: null,
  canvasName: 'My Canvas',
  viewport: { x: 0, y: 0, scale: 1 },
  items: [],
  selectedIds: new Set(),
  activeFilters: new Set(['bookmark', 'web_clip', 'note', 'image', 'group']),
  searchQuery: '',
  searchResults: null,

  // UI state
  sidebarOpen: true,
  exportDialogOpen: false,
  importDialogOpen: false,

  // History (managed by HistoryManager, not Zustand)
  undoCounts: { undo: 0, redo: 0 },

  // Initialize
  init: async () => {
    await idbStore.init();
    let canvases = await idbStore.listCanvases();
    let canvas;
    if (canvases.length === 0) {
      const id = crypto.randomUUID();
      const now = Date.now();
      canvas = { id, name: 'My Canvas', viewport: { x: 0, y: 0, scale: 1 }, created_at: now, updated_at: now };
      await idbStore.saveCanvas(canvas);
    } else {
      canvas = canvases[0];
    }
    // Load items for this canvas
    const items = await idbStore.exportCanvas(canvas.id);
    set({
      canvasId: canvas.id,
      canvasName: canvas.name,
      viewport: canvas.viewport || { x: 0, y: 0, scale: 1 },
      items: items || [],
    });
  },

  // Items
  addItem: async (overrides = {}) => {
    const state = get();
    const item = createItem({
      ...overrides,
      canvas_id: state.canvasId,
    });
    await idbStore.upsertItem(item);
    set((s) => ({ items: [...s.items, item] }));
    return item;
  },

  addNote: async () => {
    const state = get();
    const vp = state.viewport;
    const x = (-vp.x + 400) / vp.scale;
    const y = (-vp.y + 300) / vp.scale;
    return get().addItem({
      type: ITEM_TYPES.NOTE,
      x,
      y,
      content: { title: 'Note', text: '' },
      width: 280,
    });
  },

  addUrl: async (url = '') => {
    const state = get();
    const vp = state.viewport;
    const x = (-vp.x + 400) / vp.scale;
    const y = (-vp.y + 300) / vp.scale;
    const domain = url ? (() => { try { return new URL(url).hostname; } catch { return null; } })() : null;
    return get().addItem({
      type: ITEM_TYPES.BOOKMARK,
      x,
      y,
      content: { title: 'Bookmark', url },
      meta: { domain },
      width: 320,
    });
  },

  addImage: async (imageUrl = '') => {
    const state = get();
    const vp = state.viewport;
    const x = (-vp.x + 400) / vp.scale;
    const y = (-vp.y + 300) / vp.scale;
    return get().addItem({
      type: ITEM_TYPES.IMAGE,
      x,
      y,
      content: { title: 'Image', image_url: imageUrl },
      width: 320,
    });
  },

  updateItem: async (id, updates) => {
    const state = get();
    const item = state.items.find((i) => i.id === id);
    if (!item) return;
    const updated = {
      ...item,
      ...updates,
      content: { ...item.content, ...(updates.content || {}) },
      meta: { ...item.meta, ...(updates.meta || {}) },
      style: { ...item.style, ...(updates.style || {}) },
      updated_at: Date.now(),
    };
    await idbStore.upsertItem(updated);
    set((s) => ({
      items: s.items.map((i) => (i.id === id ? updated : i)),
    }));
  },

  deleteItem: async (id) => {
    await idbStore.deleteItem(id);
    set((s) => ({
      items: s.items.filter((i) => i.id !== id),
      selectedIds: new Set([...s.selectedIds].filter((sid) => sid !== id)),
    }));
  },

  deleteSelected: async () => {
    const state = get();
    for (const id of state.selectedIds) {
      await idbStore.deleteItem(id);
    }
    set((s) => ({
      items: s.items.filter((i) => !s.selectedIds.has(i.id)),
      selectedIds: new Set(),
    }));
  },

  // Selection
  selectItem: (id, multi = false) => {
    set((s) => {
      const newSelected = new Set(multi ? s.selectedIds : []);
      if (newSelected.has(id)) {
        newSelected.delete(id);
      } else {
        newSelected.add(id);
      }
      return { selectedIds: newSelected };
    });
  },

  clearSelection: () => set({ selectedIds: new Set() }),

  // Viewport
  setViewport: (viewport) => {
    set({ viewport });
    const state = get();
    if (state.canvasId) {
      idbStore.saveCanvas({ id: state.canvasId, name: state.canvasName, viewport });
    }
  },

  // Filtering
  toggleFilter: (filter) => {
    set((s) => {
      const newFilters = new Set(s.activeFilters);
      if (newFilters.has(filter)) {
        newFilters.delete(filter);
      } else {
        newFilters.add(filter);
      }
      return { activeFilters: newFilters };
    });
  },

  getFilteredItems: () => {
    const state = get();
    let items = state.items;
    if (state.searchResults !== null) {
      items = state.searchResults;
    }
    return items.filter((item) => state.activeFilters.has(item.type));
  },

  // Search
  search: async (query) => {
    if (!query.trim()) {
      set({ searchQuery: '', searchResults: null });
      return;
    }
    const q = query.toLowerCase();
    const state = get();
    const results = state.items.filter((item) =>
      (item.content?.title || '').toLowerCase().includes(q) ||
      (item.content?.description || '').toLowerCase().includes(q) ||
      (item.content?.text || '').toLowerCase().includes(q) ||
      (item.content?.url || '').toLowerCase().includes(q)
    );
    set({ searchQuery: query, searchResults: results });
  },

  clearSearch: () => set({ searchQuery: '', searchResults: null }),

  // Export / Import
  exportData: async () => {
    const state = get();
    const items = await idbStore.exportCanvas(state.canvasId);
    return { canvases: [{ id: state.canvasId, name: state.canvasName }], items, exported_at: Date.now() };
  },

  importData: async (data) => {
    if (data.items) {
      const state = get();
      const canvasId = state.canvasId;
      const itemsWithCanvas = data.items.map((item) => ({ ...item, canvas_id: canvasId }));
      await idbStore.bulkImport(itemsWithCanvas);
      const items = await idbStore.exportCanvas(canvasId);
      set({ items: items || [] });
    }
  },

  // Stats
  getStats: () => {
    const state = get();
    return {
      total: state.items.length,
      bookmarks: state.items.filter((i) => i.type === ITEM_TYPES.BOOKMARK).length,
      notes: state.items.filter((i) => i.type === ITEM_TYPES.NOTE).length,
      images: state.items.filter((i) => i.type === ITEM_TYPES.IMAGE).length,
      groups: state.items.filter((i) => i.type === ITEM_TYPES.GROUP).length,
    };
  },
}));
