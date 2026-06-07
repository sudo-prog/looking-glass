/**
 * LOOKING GLASS — Zustand Store
 * Global React state for the canvas app
 */
import { create } from 'zustand';
import { store as idbStore } from '../data/store.js';
import { createItem, ITEM_TYPES } from '../data/schema.js';
import { spacesSlice } from '../ui/SpacesManager.jsx';

export const useStore = create((set, get) => ({
  // Spread spacesSlice — provides spaces, activeSpaceId, initSpaces, switchSpace, createSpace, renameSpace, deleteSpace, refreshSpaceCount
  ...spacesSlice(set, get),

  // Canvas state
  canvasId: null,
  canvasName: 'My Canvas',
  viewport: { x: 0, y: 0, scale: 1 },
  items: [],
  selectedIds: new Set(),
  activeFilters: new Set(['bookmark', 'web_clip', 'note', 'image', 'video', 'audio', 'pdf', 'web_clip_screenshot', 'group', 'stack', 'folder']),
  searchQuery: '',
  searchResults: null,

  // UI state
  sidebarOpen: true,
  exportDialogOpen: false,
  importDialogOpen: false,

  // History (managed by HistoryManager, not Zustand)
  undoCounts: { undo: 0, redo: 0 },

  // Initialize — sets up DB, then loads spaces
  init: async () => {
    await idbStore.init();
    await get().initSpaces();
  },

  // Load items for a specific canvas (called after init or on space switch)
  loadCanvas: async (canvasId) => {
    const items = await idbStore.exportCanvas(canvasId);
    set({ items: items || [] });
  },

  // Switch to a different canvas (Space)
  switchCanvas: async (canvasId) => {
    const canvas = await idbStore.getCanvas(canvasId);
    if (!canvas) return;
    const items = await idbStore.exportCanvas(canvas.id);
    set({
      canvasId: canvas.id,
      canvasName: canvas.name,
      viewport: canvas.viewport || { x: 0, y: 0, scale: 1 },
      items: items || [],
      selectedIds: new Set(),
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

  addAudio: async () => {
    const state = get();
    const vp = state.viewport;
    return get().addItem({
      type: ITEM_TYPES.AUDIO,
      x: (-vp.x + 400) / vp.scale,
      y: (-vp.y + 300) / vp.scale,
      width: 300,
      content: { title: `Memo ${new Date().toLocaleTimeString()}`, audio_blob_id: null, duration_ms: 0 },
    });
  },

  addVideo: async (file, objectUrl) => {
    const state = get();
    const vp = state.viewport;
    const blobId = `video-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    await idbStore.saveBlob(blobId, file);
    return get().addItem({
      type: ITEM_TYPES.VIDEO,
      x: (-vp.x + 400) / vp.scale,
      y: (-vp.y + 300) / vp.scale,
      width: 320,
      content: { title: file.name.replace(/\.[^.]+$/, ''), video_blob_id: blobId, object_url: objectUrl },
    });
  },

  addPDF: async (file) => {
    const state = get();
    const vp = state.viewport;
    const blobId = `pdf-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    await idbStore.saveBlob(blobId, file);
    return get().addItem({
      type: ITEM_TYPES.PDF,
      x: (-vp.x + 300) / vp.scale,
      y: (-vp.y + 200) / vp.scale,
      width: 220,
      content: { title: file.name.replace(/\.pdf$/i, ''), pdf_blob_id: blobId, page_count: 0 },
    });
  },

  addWebClipScreenshot: async (url, meta = {}) => {
    const state = get();
    const vp = state.viewport;
    return get().addItem({
      type: ITEM_TYPES.WEB_CLIP_SCREENSHOT,
      x: (-vp.x + 400) / vp.scale,
      y: (-vp.y + 300) / vp.scale,
      width: 320,
      content: { title: meta.title || url, description: meta.description || '', url, image_url: meta.image_url || null, screenshot_blob_id: null },
      meta: { domain: (() => { try { return new URL(url).hostname; } catch { return null; } })() },
    });
  },

  updateItem: async (id, updates) => {
    const state = get();
    const item = state.items.find((i) => i.id === id);
    if (!item) return;
    const updated = {
      ...item,
      ...updates,
      content: updates.hasOwnProperty('content')
        ? { ...item.content, ...(updates.content !== null ? updates.content : {}) }
        : item.content,
      meta: updates.hasOwnProperty('meta')
        ? { ...item.meta, ...(updates.meta !== null ? updates.meta : {}) }
        : item.meta,
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

  // Tag filter state
  activeTagFilters: new Set(),
  toggleTagFilter: (tag) => {
    set((s) => {
      const next = new Set(s.activeTagFilters);
      next.has(tag) ? next.delete(tag) : next.add(tag);
      return { activeTagFilters: next };
    });
  },
  clearTagFilters: () => set({ activeTagFilters: new Set() }),

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
    if (state.searchResults !== null) items = state.searchResults;

    items = items.filter((item) => state.activeFilters.has(item.type));

    // Tag filtering
    if (state.activeTagFilters.size > 0) {
      items = items.filter((item) => {
        const itemTags = [
          ...(item.meta?.tags || []),
          // auto-extract from note text
          ...((item.content?.text || '').match(/#([a-zA-Z0-9_\-]+)/g) || []).map(t => t.slice(1).toLowerCase()),
        ];
        return [...state.activeTagFilters].every((tf) => itemTags.includes(tf));
      });
    }

    return items;
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


  // ── Stack ──────────────────────────────────────────────────────────────

  /** Collapse two (or more) items into a new STACK item */
  createStack: async (itemIds) => {
    const state = get();
    const sourceItems = itemIds.map((id) => state.items.find((i) => i.id === id)).filter(Boolean);
    if (sourceItems.length < 2) return;

    // Sort: widest (largest) at index 0 (bottom layer), narrowest at end (top)
    const sorted = [...sourceItems].sort((a, b) => (b.width || 320) - (a.width || 320));
    const topItem = sorted[sorted.length - 1];
    const anchor = sorted[0]; // position from biggest card

    const stackItem = createItem({
      canvas_id: state.canvasId,
      type: ITEM_TYPES.STACK,
      x: anchor.x,
      y: anchor.y,
      width: (topItem.width || 280) + 24,
      content: {
        title: topItem.content?.title || 'Stack',
        image_url: topItem.content?.image_url || null,
      },
      meta: {
        stack_items: sorted,
        fanned: false,
      },
      z_index: Math.max(...sourceItems.map((i) => i.z_index || 0)) + 1,
    });

    // Remove originals, add stack
    for (const item of sourceItems) {
      await idbStore.deleteItem(item.id);
    }
    await idbStore.upsertItem(stackItem);

    set((s) => ({
      items: [
        ...s.items.filter((i) => !itemIds.includes(i.id)),
        stackItem,
      ],
      selectedIds: new Set([stackItem.id]),
    }));
    return stackItem;
  },

  /** Add an existing item into a STACK */
  addToStack: async (newItemId, stackItemId) => {
    const state = get();
    const newItem = state.items.find((i) => i.id === newItemId);
    const stackItem = state.items.find((i) => i.id === stackItemId);
    if (!newItem || !stackItem) return;

    const existing = stackItem.meta?.stack_items || [];
    const merged = [...existing, newItem].sort((a, b) => (b.width || 320) - (a.width || 320));

    const updated = {
      ...stackItem,
      meta: { ...stackItem.meta, stack_items: merged },
      updated_at: Date.now(),
    };

    await idbStore.deleteItem(newItemId);
    await idbStore.upsertItem(updated);

    set((s) => ({
      items: [
        ...s.items.filter((i) => i.id !== newItemId && i.id !== stackItemId),
        updated,
      ],
      selectedIds: new Set([stackItemId]),
    }));
  },

  // ── Folder ─────────────────────────────────────────────────────────────

  /** Collapse two (or more) items into a new FOLDER item */
  createFolder: async (itemIds, name = 'Folder') => {
    const state = get();
    const sourceItems = itemIds.map((id) => state.items.find((i) => i.id === id)).filter(Boolean);
    if (sourceItems.length < 2) return;

    const anchor = sourceItems[0];

    const folderItem = createItem({
      canvas_id: state.canvasId,
      type: ITEM_TYPES.FOLDER,
      x: anchor.x,
      y: anchor.y,
      width: 220,
      content: { title: name },
      meta: {
        child_items: sourceItems,
        folder_open: false,
      },
      z_index: Math.max(...sourceItems.map((i) => i.z_index || 0)) + 1,
    });

    for (const item of sourceItems) {
      await idbStore.deleteItem(item.id);
    }
    await idbStore.upsertItem(folderItem);

    set((s) => ({
      items: [
        ...s.items.filter((i) => !itemIds.includes(i.id)),
        folderItem,
      ],
      selectedIds: new Set([folderItem.id]),
    }));
    return folderItem;
  },

  /** Add an existing item into a FOLDER */
  addToFolder: async (newItemId, folderItemId) => {
    const state = get();
    const newItem = state.items.find((i) => i.id === newItemId);
    const folderItem = state.items.find((i) => i.id === folderItemId);
    if (!newItem || !folderItem) return;

    const existing = folderItem.meta?.child_items || [];
    const updated = {
      ...folderItem,
      meta: {
        ...folderItem.meta,
        child_items: [...existing, newItem],
      },
      updated_at: Date.now(),
    };

    await idbStore.deleteItem(newItemId);
    await idbStore.upsertItem(updated);

    set((s) => ({
      items: [
        ...s.items.filter((i) => i.id !== newItemId && i.id !== folderItemId),
        updated,
      ],
      selectedIds: new Set([folderItemId]),
    }));
  },

  /** Rename a folder */
  renameFolder: async (folderId, name) => {
    const state = get();
    const item = state.items.find((i) => i.id === folderId);
    if (!item) return;
    const updated = {
      ...item,
      content: { ...item.content, title: name },
      updated_at: Date.now(),
    };
    await idbStore.upsertItem(updated);
    set((s) => ({
      items: s.items.map((i) => (i.id === folderId ? updated : i)),
    }));
  },

  /** Toggle folder open/closed */
  toggleFolderOpen: async (folderId) => {
    const state = get();
    const item = state.items.find((i) => i.id === folderId);
    if (!item) return;
    const updated = {
      ...item,
      meta: { ...item.meta, folder_open: !item.meta?.folder_open },
      updated_at: Date.now(),
    };
    await idbStore.upsertItem(updated);
    set((s) => ({
      items: s.items.map((i) => (i.id === folderId ? updated : i)),
    }));
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
