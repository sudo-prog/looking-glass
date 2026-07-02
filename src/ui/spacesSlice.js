/**
 * LOOKING GLASS — Spaces Store Slice
 *
 * Extracted from SpacesManager.jsx to break circular dependency:
 *   useStore.js → spacesSlice → SpacesManager.jsx → useStore.js
 *
 * Import this in both useStore.js and SpacesManager.jsx.
 */

import { store as idbStore } from '../data/store.js';
import { createItem, ITEM_TYPES } from '../data/schema.js';

export function spacesSlice(set, get) {
  return {
    // ── State ────────────────────────────────────────────
    spaces: [],           // [{ id, name, item_count, created_at, viewport }]
    activeSpaceId: null,  // currently open canvas id (= canvasId)

    // ── Init ─────────────────────────────────────────────
    initSpaces: async () => {
      const canvases = (await idbStore.listCanvases()).filter((c) => !c._deleted);
      const spaces = canvases.map((c) => ({
        id:         c.id,
        name:       c.name || 'Untitled Space',
        created_at: c.created_at || Date.now(),
        viewport:   c.viewport || { x: 0, y: 0, scale: 1 },
        item_count: 0,
      }));

      // If no canvases exist, create a default one
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

      // Enrich with item counts
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

      // Load items for the active space
      const items = await idbStore.exportCanvas(firstId);
      set({ items: items || [] });
    },

    // ── Switch Space ─────────────────────────────────────
    switchSpace: async (spaceId) => {
      const state = get();
      if (spaceId === state.activeSpaceId) return;

      // Save current viewport
      await idbStore.saveCanvas({
        id:       state.activeSpaceId,
        name:     state.canvasName,
        viewport: state.viewport,
        updated_at: Date.now(),
      });

      // Load new space
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

    // ── Create Space ─────────────────────────────────────
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

    // ── Rename Space ─────────────────────────────────────
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

    // ── Delete Space ─────────────────────────────────────
    deleteSpace: async (spaceId) => {
      const state = get();
      if (state.spaces.length <= 1) return; // can't delete last space

      // Delete all items in that space
      const items = await idbStore.exportCanvas(spaceId);
      for (const item of items) {
        await idbStore.deleteItem(item.id);
      }

      // Actually delete the canvas from IndexedDB
      await idbStore.deleteCanvas(spaceId);

      const newSpaces   = state.spaces.filter((s) => s.id !== spaceId);
      const nextSpaceId = newSpaces[0]?.id || null;

      set({ spaces: newSpaces });
      if (state.activeSpaceId === spaceId && nextSpaceId) {
        await get().switchSpace(nextSpaceId);
      }
    },

    // ── Refresh Item Count ────────────────────────────────
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
