/**
 * LOOKING GLASS — Zustand Store
 * Global React state for the canvas app
 *
 * Note: spacesSlice is inlined here (not imported from SpacesManager.jsx) to
 * avoid a circular import. SpacesManager.jsx imports from useStore.js for
 * its standalone useSpacesStore, so importing back from it would create
 * a cycle that crashes with "Cannot access 'X' before initialization" at
 * module load time in the minified bundle.
 */
import { create } from 'zustand';
import { store as idbStore } from '../data/store.js';
import { createItem, ITEM_TYPES } from '../data/schema.js';
import { debounce } from '../utils/helpers.js';

// ── exportData — re-exported for ExportDialog ──────────────
// This is set by the store below to allow external access
let _exportDataFn = null;
export function getExportDataFn() { return _exportDataFn; }


// Debounced viewport save to avoid thrashing IDB on every pan/zoom frame
const saveViewportDebounced = debounce(
  (canvasId, canvasName, viewport) => {
    if (!canvasId) return;
    idbStore.saveCanvas({ id: canvasId, name: canvasName, viewport });
  },
  400
);

// ── spacesSlice (inlined to break circular import) ────────────────
function spacesSlice(set, get) {
  return {
    spaces: [],
    activeSpaceId: null,

    initSpaces: async () => {
      const canvases = await idbStore.listCanvases();
      const spaces = canvases.map((c) => ({
        id:         c.id,
        name:       c.name || 'Untitled Space',
        created_at: c.created_at || Date.now(),
        viewport:   c.viewport || { x: 0, y: 0, scale: 1 },
        item_count: 0,
      }));

      if (spaces.length === 0) {
        const defaultCanvas = {
          id:         crypto.randomUUID(),
          name:       'My Canvas',
          viewport:   { x: 0, y: 0, scale: 1 },
          created_at: Date.now(),
          updated_at: Date.now(),
        };
        await idbStore.saveCanvas(defaultCanvas);
        spaces.push({
          id:         defaultCanvas.id,
          name:       defaultCanvas.name,
          created_at: defaultCanvas.created_at,
          viewport:   defaultCanvas.viewport,
          item_count: 0,
        });
      }

      for (const space of spaces) {
        const items = await idbStore.exportCanvas(space.id);
        space.item_count = items.length;
      }

      const firstId = spaces[0].id;
      set({
        spaces,
        activeSpaceId: firstId,
        canvasId:      firstId,
        canvasName:    spaces[0].name,
      });

      const items = await idbStore.exportCanvas(firstId);
      set({ items: items || [] });
    },

    switchSpace: async (spaceId) => {
      const state = get();
      if (spaceId === state.activeSpaceId) return;

      await idbStore.saveCanvas({
        id:       state.activeSpaceId,
        name:     state.canvasName,
        viewport: state.viewport,
        updated_at: Date.now(),
      });

      const canvas = await idbStore.getCanvas(spaceId);
      const items  = await idbStore.exportCanvas(spaceId);
      const spaces = state.spaces.map((s) =>
        s.id === spaceId ? { ...s, item_count: items.length } : s
      );

      set({
        spaces,
        activeSpaceId: spaceId,
        canvasId:      spaceId,
        canvasName:    canvas?.name || 'Untitled Space',
        viewport:      canvas?.viewport || { x: 0, y: 0, scale: 1 },
        items:         items || [],
        selectedIds:   new Set(),
      });
    },

    createSpace: async (name = 'New Space') => {
      const id  = crypto.randomUUID();
      const now = Date.now();
      const canvas = {
        id,
        name,
        viewport:   { x: 0, y: 0, scale: 1 },
        created_at: now,
        updated_at: now,
      };
      await idbStore.saveCanvas(canvas);
      const newSpace = { id, name, created_at: now, viewport: canvas.viewport, item_count: 0 };
      set((s) => ({ spaces: [...s.spaces, newSpace] }));
      await get().switchSpace(id);
      return id;
    },

    renameSpace: async (spaceId, newName) => {
      if (!newName.trim()) return;
      const canvas = await idbStore.getCanvas(spaceId);
      await idbStore.saveCanvas({ ...canvas, name: newName.trim(), updated_at: Date.now() });
      set((s) => ({
        spaces: s.spaces.map((sp) =>
          sp.id === spaceId ? { ...sp, name: newName.trim() } : sp
        ),
        canvasName: s.activeSpaceId === spaceId ? newName.trim() : s.canvasName,
      }));
    },

    deleteSpace: async (spaceId) => {
      const state = get();
      if (state.spaces.length <= 1) return;

      const items = await idbStore.exportCanvas(spaceId);
      for (const item of items) {
        await idbStore.deleteItem(item.id);
      }

      const canvas = await idbStore.getCanvas(spaceId);
      if (canvas) {
        await idbStore.saveCanvas({ ...canvas, _deleted: true, updated_at: Date.now() });
      }

      const newSpaces   = state.spaces.filter((s) => s.id !== spaceId);
      const nextSpaceId = newSpaces[0]?.id || null;

      set({ spaces: newSpaces });
      if (state.activeSpaceId === spaceId && nextSpaceId) {
        await get().switchSpace(nextSpaceId);
      }
    },

    refreshSpaceCount: (spaceId) => {
      const state = get();
      const count = state.items.filter((i) => i.canvas_id === spaceId).length;
      set((s) => ({
        spaces: s.spaces.map((sp) =>
          sp.id === spaceId ? { ...sp, item_count: count } : sp
        ),
      }));
    },
  };
}

export const useStore = create((set, get) => ({
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
    const defaults = {
      id: crypto.randomUUID(),
      type: ITEM_TYPES.NOTE,
      x: 0,
      y: 0,
      width: 280,
      content: { title: '', text: '' },
      meta: { tags: [], color: null },
      created_at: Date.now(),
      canvas_id: state.canvasId,
    };
    const item = { ...defaults, ...overrides };
    await idbStore.upsertItem(item);
    set((s) => ({ items: [...s.items, item] }));
    return item;
  },

  /**
   * BUG FIX: deep-merge only the keys that are actually provided.
   * Passing `{ content: null }` no longer silently becomes `{}`.
   */
  updateItem: async (id, updates) => {
    const state = get();
    const item  = state.items.find((i) => i.id === id);
    if (!item) return;

    const updated = {
      ...item,
      ...updates,
      content:    updates.content  != null ? { ...item.content,  ...updates.content  } : item.content,
      meta:       updates.meta     != null ? { ...item.meta,     ...updates.meta     } : item.meta,
      style:      updates.style    != null ? { ...item.style,    ...updates.style    } : item.style,
      updated_at: Date.now(),
    };

    await idbStore.upsertItem(updated);
    set((s) => ({ items: s.items.map((i) => (i.id === id ? updated : i)) }));
  },

  deleteItem: async (id) => {
    await idbStore.deleteItem(id);
    set((s) => ({ items: s.items.filter((i) => i.id !== id) }));
  },

  // Selection
  selectItem: (id, multi = false) => {
    set((s) => {
      const next = new Set(multi ? s.selectedIds : []);
      if (id) {
        if (next.has(id)) next.delete(id);
        else next.add(id);
      }
      return { selectedIds: next };
    });
  },

  clearSelection: () => set({ selectedIds: new Set() }),

  // Filters
  toggleFilter: (type) => {
    set((s) => {
      const next = new Set(s.activeFilters);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return { activeFilters: next };
    });
  },

  getFilteredItems: () => {
    const state = get();
    let items = state.items;
    if (state.searchResults !== null) items = state.searchResults;
    return items.filter((item) => state.activeFilters.has(item.type));
  },

  // Viewport
  /**
   * BUG FIX: debounce IDB write to avoid thrashing on every pan/zoom frame.
   */
  setViewport: (viewport) => {
    const { canvasId, canvasName } = get();
    set({ viewport });
    saveViewportDebounced(canvasId, canvasName, viewport);
  },

  // Search
  /**
   * BUG FIX: strip HTML tags before searching note text content.
   */
  search: (query) => {
    if (!query.trim()) {
      set({ searchQuery: '', searchResults: null });
      return;
    }
    const q = query.toLowerCase();

    const stripHtml = (html) => {
      if (!html) return '';
      const d = document.createElement('div');
      d.innerHTML = html;
      return d.textContent || '';
    };

    const results = get().items.filter((item) =>
      (item.content?.title       || '').toLowerCase().includes(q) ||
      (item.content?.description || '').toLowerCase().includes(q) ||
      stripHtml(item.content?.text || '').toLowerCase().includes(q) ||
      (item.content?.url         || '').toLowerCase().includes(q) ||
      (item.meta?.domain         || '').toLowerCase().includes(q) ||
      (item.meta?.tags           || []).some((t) => t.toLowerCase().includes(q))
    );
    set({ searchQuery: query, searchResults: results });
  },

  clearSearch: () => set({ searchQuery: '', searchResults: null }),

  // Card-type adders
  addNote: async (text = '') => {
    const state = get();
    const vp = state.viewport;
    return get().addItem({
      type:    ITEM_TYPES.NOTE,
      x:       (-vp.x + 400) / vp.scale,
      y:       (-vp.y + 300) / vp.scale,
      width:   280,
      content: { title: '', text },
    });
  },

  addUrl: async (url) => {
    const state = get();
    const vp = state.viewport;
    return get().addItem({
      type:    ITEM_TYPES.WEB_CLIP,
      x:       (-vp.x + 400) / vp.scale,
      y:       (-vp.y + 300) / vp.scale,
      width:   280,
      content: { title: url, url },
    });
  },

  addImage: async (objectUrl) => {
    const state = get();
    const vp = state.viewport;
    return get().addItem({
      type:    ITEM_TYPES.IMAGE,
      x:       (-vp.x + 400) / vp.scale,
      y:       (-vp.y + 300) / vp.scale,
      width:   280,
      content: { title: 'Image', image_url: objectUrl },
    });
  },

  addAudio: async (file) => {
    const state = get();
    const vp = state.viewport;
    const blobId = `audio-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    if (file) {
      await idbStore.saveBlob(blobId, file);
    }
    return get().addItem({
      type:    ITEM_TYPES.AUDIO,
      x:       (-vp.x + 400) / vp.scale,
      y:       (-vp.y + 300) / vp.scale,
      width:   300,
      content: {
        title:         `Memo ${new Date().toLocaleTimeString()}`,
        audio_blob_id: file ? blobId : null,
        duration_ms:   0,
      },
    });
  },

  addVideo: async (file, objectUrl) => {
    const state = get();
    const vp = state.viewport;
    const blobId = `video-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    if (file) {
      await idbStore.saveBlob(blobId, file);
    }
    return get().addItem({
      type:    ITEM_TYPES.VIDEO,
      x:       (-vp.x + 400) / vp.scale,
      y:       (-vp.y + 300) / vp.scale,
      width:   320,
      content: {
        title:         file?.name?.replace(/\.[^.]+$/, '') || 'Video',
        video_blob_id: file ? blobId : null,
        object_url:    objectUrl,
      },
    });
  },

  addPDF: async (file) => {
    const state = get();
    const vp = state.viewport;
    const blobId = `pdf-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    if (file) {
      await idbStore.saveBlob(blobId, file);
    }
    return get().addItem({
      type:    ITEM_TYPES.PDF,
      x:       (-vp.x + 300) / vp.scale,
      y:       (-vp.y + 200) / vp.scale,
      width:   220,
      content: {
        title:        file?.name?.replace(/\.pdf$/i, '') || 'Document',
        pdf_blob_id:  file ? blobId : null,
        page_count:   0,
      },
    });
  },

  addWebClipScreenshot: async (url, meta = {}) => {
    const state = get();
    const vp = state.viewport;
    return get().addItem({
      type:    ITEM_TYPES.WEB_CLIP_SCREENSHOT,
      x:       (-vp.x + 400) / vp.scale,
      y:       (-vp.y + 300) / vp.scale,
      width:   320,
      content: {
        title:        meta.title || url,
        description:  meta.description || '',
        url,
        image_url:    meta.image_url || null,
        screenshot_blob_id: null,
      },
      meta: {
        domain: (() => { try { return new URL(url).hostname; } catch { return null; } })(),
      },
    });
  },

  // Stack / Folder actions
  createStack: async (itemIds) => {
    const state = get();
    if (!itemIds || itemIds.length < 2) return;
    const items = state.items.filter((i) => itemIds.includes(i.id));
    if (items.length < 2) return;
    const stack = createItem({
      type: ITEM_TYPES.STACK,
      x: items[0].x,
      y: items[0].y,
      width: 280,
      content: {
        title: 'Stack',
        child_ids: items.map((i) => i.id),
      },
    });
    await idbStore.upsertItem(stack);
    set((s) => ({ items: [...s.items, stack] }));
  },

  addToStack: async (stackId, itemId) => {
    const state = get();
    const stack = state.items.find((i) => i.id === stackId);
    if (!stack || stack.type !== ITEM_TYPES.STACK) return;
    const childIds = stack.content?.child_ids || [];
    if (childIds.includes(itemId)) return;
    await get().updateItem(stackId, {
      content: { child_ids: [...childIds, itemId] },
    });
  },

  createFolder: async (itemIds) => {
    const state = get();
    if (!itemIds || itemIds.length < 2) return;
    const items = state.items.filter((i) => itemIds.includes(i.id));
    if (items.length < 2) return;
    const folder = createItem({
      type: ITEM_TYPES.FOLDER,
      x: items[0].x,
      y: items[0].y,
      width: 320,
      content: {
        title: 'New Folder',
        child_ids: items.map((i) => i.id),
      },
    });
    await idbStore.upsertItem(folder);
    set((s) => ({ items: [...s.items, folder] }));
  },

  addToFolder: async (folderId, itemId) => {
    const state = get();
    const folder = state.items.find((i) => i.id === folderId);
    if (!folder || folder.type !== ITEM_TYPES.FOLDER) return;
    const childIds = folder.content?.child_ids || [];
    if (childIds.includes(itemId)) return;
    await get().updateItem(folderId, {
      content: { child_ids: [...childIds, itemId] },
    });
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

  // Bulk actions
  /**
   * BUG FIX: batch into a single setState call to avoid N re-renders.
   */
  deleteSelected: async () => {
    const { selectedIds, items } = get();
    if (selectedIds.size === 0) return;
    await Promise.all([...selectedIds].map((id) => idbStore.deleteItem(id)));
    set({
      items:       items.filter((i) => !selectedIds.has(i.id)),
      selectedIds: new Set(),
    });
  },

  // Import/Export dialogs
  setExportDialogOpen: (v) => set({ exportDialogOpen: v }),
  setImportDialogOpen: (v) => set({ importDialogOpen: v }),

  // Import data from JSON (used by App.jsx handleImport)
  importData: async (data) => {
    if (!data || !data.canvases) throw new Error('Invalid import data');

    for (const canvas of data.canvases) {
      await idbStore.saveCanvas(canvas);
    }
    for (const item of data.items || []) {
      await idbStore.upsertItem(item);
    }

    await get().initSpaces();
  },

  // Expose idbStore so App can trigger export
  idbStore,
}));

