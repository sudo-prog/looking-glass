/**
 * LOOKING GLASS — Zustand Store
 * Global React state for the canvas app
 */
import { create } from 'zustand';
import { store as idbStore } from '../data/store.js';
import { createItem, ITEM_TYPES } from '../data/schema.js';
import { spacesSlice } from '../ui/spacesSlice.js';

let viewportSaveTimer = null;

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
    // Small random jitter so consecutive notes don't stack exactly on top of each other
    const jitter = () => (Math.random() - 0.5) * 40;
    const x = (-vp.x + 400) / vp.scale + jitter();
    const y = (-vp.y + 300) / vp.scale + jitter();
    return get().addItem({
      type: ITEM_TYPES.NOTE,
      x,
      y,
      content: { title: 'Note', text: '' },
      width: 280,
    });
  },

  addUrl: async (url = '', meta = null) => {
    const state = get();
    const vp = state.viewport;
    const x = (-vp.x + 400) / vp.scale;
    const y = (-vp.y + 300) / vp.scale;
    const domain = url ? (() => { try { return new URL(url).hostname; } catch { return null; } })() : null;
    return get().addItem({
      type: ITEM_TYPES.BOOKMARK,
      x,
      y,
      content: { title: meta?.title || 'Bookmark', url },
      meta: { domain, ...(meta?.description ? { description: meta.description } : {}), ...(meta?.image_url ? { image_url: meta.image_url } : {}) },
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

  /** Replace the entire selection set at once (used by drag-box select). */
  setSelection: (ids) => {
    set({ selectedIds: new Set(ids) });
  },

  /** Merge additional ids into the current selection (used by drag-box select with shift/cmd held). */
  addToSelection: (ids) => {
    set((s) => {
      const next = new Set(s.selectedIds);
      ids.forEach((id) => next.add(id));
      return { selectedIds: next };
    });
  },

  clearSelection: () => set({ selectedIds: new Set() }),

  // Viewport
  setViewport: (viewport) => {
    set({ viewport });
    const state = get();
    if (state.canvasId) {
      // Debounce IDB writes — pan/zoom fires at 60fps and we don't need every frame persisted
      if (viewportSaveTimer) clearTimeout(viewportSaveTimer);
      viewportSaveTimer = setTimeout(() => {
        idbStore.saveCanvas({ id: state.canvasId, name: state.canvasName, viewport: get().viewport });
      }, 400);
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
    const results = state.items.filter((item) => {
      const title = (item.content?.title || '').toLowerCase();
      const desc = (item.content?.description || '').toLowerCase();
      // Note text is stored as Tiptap HTML — strip tags before matching
      const rawText = (item.content?.text || '').toLowerCase();
      const text = rawText.replace(/<[^>]*>/g, '');
      const url = (item.content?.url || '').toLowerCase();
      return title.includes(q) || desc.includes(q) || text.includes(q) || url.includes(q);
    });
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

  /** Pull a single child out of a stack and back onto the canvas as a
   *  standalone item, positioned just to the right of the stack. */
  removeFromStack: async (stackItemId, childId) => {
    const state = get();
    const stackItem = state.items.find((i) => i.id === stackItemId);
    if (!stackItem || stackItem.type !== ITEM_TYPES.STACK) return;

    const existing = stackItem.meta?.stack_items || [];
    const child = existing.find((c) => c.id === childId);
    if (!child) return;

    const remaining = existing.filter((c) => c.id !== childId);

    const restoredChild = {
      ...child,
      x: stackItem.x + (stackItem.width || 280) + 32,
      y: stackItem.y,
      z_index: (stackItem.z_index || 0) + 1,
      updated_at: Date.now(),
    };

    if (remaining.length < 2) {
      // Not enough items left to remain a stack — dissolve it
      const allChildren = [...remaining, restoredChild];
      await idbStore.deleteItem(stackItemId);
      for (const item of allChildren) {
        await idbStore.upsertItem(item);
      }
      set((s) => ({
        items: [...s.items.filter((i) => i.id !== stackItemId), ...allChildren],
        selectedIds: new Set(allChildren.map((r) => r.id)),
      }));
    } else {
      const updatedStack = {
        ...stackItem,
        meta: { ...stackItem.meta, stack_items: remaining },
        updated_at: Date.now(),
      };
      await idbStore.upsertItem(restoredChild);
      await idbStore.upsertItem(updatedStack);
      set((s) => ({
        items: [
          ...s.items.filter((i) => i.id !== stackItemId),
          updatedStack,
          restoredChild,
        ],
        selectedIds: new Set([restoredChild.id]),
      }));
    }
  },

  /** Dissolve a stack entirely — restore all children to the canvas. */
  dissolveStack: async (stackItemId) => {
    return get().unstackToCanvas(stackItemId);
  },

  /** Dissolve a folder entirely — restore all children to the canvas. */
  dissolveFolder: async (folderItemId) => {
    return get().unfolderToCanvas(folderItemId);
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

  /** Break a stack apart, returning its children to individual canvas items
   *  arranged in a tidy grid anchored at the stack's position. */
  unstackToCanvas: async (stackItemId) => {
    const state = get();
    const stackItem = state.items.find((i) => i.id === stackItemId);
    if (!stackItem || stackItem.type !== ITEM_TYPES.STACK) return;

    const children = stackItem.meta?.stack_items || [];
    if (!children.length) return;

    const cols = Math.min(2, children.length);
    const gapX = 24;
    const gapY = 24;

    const restored = children.map((child, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const w = child.width || 280;
      return {
        ...child,
        x: stackItem.x + col * (w + gapX),
        y: stackItem.y + row * ((child.height || 200) + gapY),
        z_index: (stackItem.z_index || 0) + i,
        updated_at: Date.now(),
      };
    });

    await idbStore.deleteItem(stackItemId);
    for (const item of restored) {
      await idbStore.upsertItem(item);
    }

    set((s) => ({
      items: [...s.items.filter((i) => i.id !== stackItemId), ...restored],
      selectedIds: new Set(restored.map((r) => r.id)),
    }));
  },

  // ── Folder ─────────────────────────────────────────────────────────────

  /** Collapse two (or more) items into a new FOLDER item */
  createFolder: async (itemIds, name = 'Folder name', description = '') => {
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
      content: { title: name, description },
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

  /** Pull a single child out of a folder and back onto the canvas as a
   *  standalone item, positioned just to the right of the folder. */
  removeFromFolder: async (folderItemId, childId) => {
    const state = get();
    const folderItem = state.items.find((i) => i.id === folderItemId);
    if (!folderItem) return;

    const existing = folderItem.meta?.child_items || [];
    const child = existing.find((c) => c.id === childId);
    if (!child) return;

    const remaining = existing.filter((c) => c.id !== childId);

    const restoredChild = {
      ...child,
      x: folderItem.x + (folderItem.width || 220) + 32,
      y: folderItem.y,
      z_index: (folderItem.z_index || 0) + 1,
      updated_at: Date.now(),
    };

    const updatedFolder = {
      ...folderItem,
      meta: { ...folderItem.meta, child_items: remaining },
      updated_at: Date.now(),
    };

    await idbStore.upsertItem(restoredChild);
    await idbStore.upsertItem(updatedFolder);

    set((s) => ({
      items: [
        ...s.items.filter((i) => i.id !== folderItemId),
        updatedFolder,
        restoredChild,
      ],
      selectedIds: new Set([restoredChild.id]),
    }));
  },

  /** Empty an entire folder back onto the canvas in a tidy grid, removing the folder. */
  unfolderToCanvas: async (folderItemId) => {
    const state = get();
    const folderItem = state.items.find((i) => i.id === folderItemId);
    if (!folderItem || folderItem.type !== ITEM_TYPES.FOLDER) return;

    const children = folderItem.meta?.child_items || [];
    if (!children.length) {
      await idbStore.deleteItem(folderItemId);
      set((s) => ({ items: s.items.filter((i) => i.id !== folderItemId) }));
      return;
    }

    const cols = Math.min(3, children.length);
    const gapX = 24;
    const gapY = 24;

    const restored = children.map((child, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const w = child.width || 280;
      return {
        ...child,
        x: folderItem.x + col * (w + gapX),
        y: folderItem.y + row * ((child.height || 200) + gapY),
        z_index: (folderItem.z_index || 0) + i,
        updated_at: Date.now(),
      };
    });

    await idbStore.deleteItem(folderItemId);
    for (const item of restored) {
      await idbStore.upsertItem(item);
    }

    set((s) => ({
      items: [...s.items.filter((i) => i.id !== folderItemId), ...restored],
      selectedIds: new Set(restored.map((r) => r.id)),
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

  /** Update a folder's description blurb */
  updateFolderDescription: async (folderId, description) => {
    const state = get();
    const item = state.items.find((i) => i.id === folderId);
    if (!item) return;
    const updated = {
      ...item,
      content: { ...item.content, description },
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

  // ── Layout ─────────────────────────────────────────────────────────────

  /** Tidy a set of items into a masonry-style grid (Visuals.mp4): each
   *  card keeps its own natural width/height, columns sized to the widest
   *  member, anchored at the first selected item's current position. */
  arrangeMasonry: async (itemIds, cols = 2) => {
    const state = get();
    const sourceItems = itemIds.map((id) => state.items.find((i) => i.id === id)).filter(Boolean);
    if (sourceItems.length < 2) return;

    const gap = 20;
    const anchor = sourceItems[0];
    const colCount = Math.max(1, Math.min(cols, sourceItems.length));
    const colWidths = new Array(colCount).fill(0);
    sourceItems.forEach((item, i) => {
      const col = i % colCount;
      colWidths[col] = Math.max(colWidths[col], item.width || 280);
    });
    const colHeights = new Array(colCount).fill(0);

    const updates = sourceItems.map((item, i) => {
      const col = i % colCount;
      const colX = colWidths.slice(0, col).reduce((sum, w) => sum + w + gap, 0);
      const y = colHeights[col];
      const h = item.height || Math.round((item.width || 280) * 0.75);
      colHeights[col] += h + gap;
      return {
        ...item,
        x: anchor.x + colX,
        y: anchor.y + y,
        updated_at: Date.now(),
      };
    });

    for (const item of updates) {
      await idbStore.upsertItem(item);
    }

    set((s) => ({
      items: s.items.map((i) => updates.find((u) => u.id === i.id) || i),
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
