/**
 * LOOKING GLASS — SpacesManager
 * Full multi-canvas Spaces feature.
 *
 * ▸ SpacesStore  – Zustand slice (merge into useStore.js)
 * ▸ SpacesSidebar – updated sidebar with live CRUD
 * ▸ useSpaces     – convenience hook
 *
 * INTEGRATION:
 *   1. Copy the `spacesSlice` fields into your useStore create() call.
 *   2. Replace <SpacesSidebar> import with this file.
 *   3. Call initSpaces() inside your App useEffect after init().
 *
 * The store persists spaces to the same IndexedDB `canvases` object store
 * that already exists in data/store.js. No schema changes needed.
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  Plus,
  DotsSixVertical,
  PencilSimple,
  Trash,
  Check,
  X,
} from '@phosphor-icons/react';
import { create } from 'zustand';
import { store as idbStore } from '../data/store.js';
import { createItem, ITEM_TYPES } from '../data/schema.js';

// ─────────────────────────────────────────────────────────────
// SPACES STORE SLICE
// Paste these fields + actions into the main useStore.js create()
// ─────────────────────────────────────────────────────────────

/**
 * Returns the spaces slice to spread into useStore's create():
 *
 *   export const useStore = create((set, get) => ({
 *     ...coreFields,
 *     ...spacesSlice(set, get),   // ← add this
 *   }));
 */
export function spacesSlice(set, get) {
  return {
    // ── State ────────────────────────────────────────────
    spaces: [],           // [{ id, name, item_count, created_at, viewport }]
    activeSpaceId: null,  // currently open canvas id (= canvasId)

    // ── Init ─────────────────────────────────────────────
    initSpaces: async () => {
      const canvases = await idbStore.listCanvases();
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

      // TODO: idbStore.deleteCanvas(spaceId) — add this to store.js:
      //   async deleteCanvas(id) {
      //     const s = await tx('canvases', 'readwrite');
      //     return reqPromise(s.delete(id));
      //   }
      // For now, overwrite with a tombstone flag
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

// ─────────────────────────────────────────────────────────────
// SPACES SIDEBAR COMPONENT
// Drop-in replacement for the existing SpacesSidebar.jsx
// Requires the spacesSlice to be merged into useStore.
// ─────────────────────────────────────────────────────────────

/**
 * Props:
 *   isOpen        {boolean}
 *   onClose       {() => void}
 *
 * Reads spaces, activeSpaceId, switchSpace, createSpace,
 * renameSpace, deleteSpace from the Zustand store.
 */
export function SpacesManager({ isOpen, onClose }) {
  // Uses main useStore (spacesSlice merged in useStore.js)
  const { spaces, activeSpaceId, switchSpace, createSpace, renameSpace, deleteSpace } =
    useStore();

  const [editingId,   setEditingId]   = useState(null);
  const [editingName, setEditingName] = useState('');
  const [hoveredId,   setHoveredId]   = useState(null);
  const [creating,    setCreating]    = useState(false);
  const [newName,     setNewName]     = useState('');

  const editInputRef  = useRef(null);
  const newInputRef   = useRef(null);

  useEffect(() => {
    if (editingId) setTimeout(() => editInputRef.current?.focus(), 40);
  }, [editingId]);

  useEffect(() => {
    if (creating) setTimeout(() => newInputRef.current?.focus(), 40);
  }, [creating]);

  const handleSelect = useCallback(
    async (id) => {
      if (id !== activeSpaceId) {
        await switchSpace(id);
      }
      onClose?.();
    },
    [activeSpaceId, switchSpace, onClose],
  );

  const startEdit = useCallback((space, e) => {
    e.stopPropagation();
    setEditingId(space.id);
    setEditingName(space.name);
  }, []);

  const commitEdit = useCallback(async () => {
    if (editingId && editingName.trim()) {
      await renameSpace(editingId, editingName.trim());
    }
    setEditingId(null);
    setEditingName('');
  }, [editingId, editingName, renameSpace]);

  const handleDelete = useCallback(
    async (id, e) => {
      e.stopPropagation();
      if (spaces.length <= 1) return;
      if (window.confirm('Delete this space and all its cards?')) {
        await deleteSpace(id);
      }
    },
    [spaces.length, deleteSpace],
  );

  const commitNew = useCallback(async () => {
    const name = newName.trim() || 'New Space';
    await createSpace(name);
    setCreating(false);
    setNewName('');
    onClose?.();
  }, [newName, createSpace, onClose]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 'calc(var(--z-toolbar) - 1)',
          background: 'rgba(0,0,0,0.25)',
        }}
      />

      {/* Panel */}
      <aside
        role="navigation"
        aria-label="Spaces"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          bottom: 0,
          width: '260px',
          zIndex: 'var(--z-toolbar)',
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--glass-frost)',
          backdropFilter: 'blur(var(--glass-blur-xl)) saturate(120%)',
          WebkitBackdropFilter: 'blur(var(--glass-blur-xl)) saturate(120%)',
          borderRight: '1px solid var(--color-border)',
          boxShadow: '4px 0 32px rgba(0,0,0,0.50)',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 16px 12px',
            borderBottom: '1px solid var(--color-border)',
          }}
        >
          <span
            style={{
              fontFamily: 'var(--font-ui)',
              fontSize: '10px',
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              color: 'var(--text-secondary)',
            }}
          >
            SPACES
          </span>
          <button
            onClick={onClose}
            style={iconBtnStyle}
            aria-label="Close spaces"
          >
            <X size={14} weight="regular" />
          </button>
        </div>

        {/* Space list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 8px' }}>
          {spaces.map((space) => {
            const isActive  = space.id === activeSpaceId;
            const isEditing = space.id === editingId;
            const isHovered = space.id === hoveredId;

            return (
              <div
                key={space.id}
                onMouseEnter={() => setHoveredId(space.id)}
                onMouseLeave={() => setHoveredId(null)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  borderRadius: '8px',
                  padding: '0 4px',
                  marginBottom: '2px',
                  background: isActive ? 'var(--state-active)' : 'transparent',
                  transition: 'background 0.1s ease',
                }}
              >
                {/* Active dot */}
                <div
                  style={{
                    width: '5px',
                    height: '5px',
                    borderRadius: '50%',
                    background: isActive ? 'var(--text-primary)' : 'transparent',
                    border: isActive ? 'none' : '1px solid var(--text-disabled)',
                    flexShrink: 0,
                    marginLeft: '4px',
                    transition: 'all 0.15s ease',
                  }}
                />

                {/* Name / edit input */}
                {isEditing ? (
                  <input
                    ref={editInputRef}
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    onBlur={commitEdit}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') commitEdit();
                      if (e.key === 'Escape') { setEditingId(null); setEditingName(''); }
                    }}
                    style={{
                      flex: 1,
                      height: '32px',
                      border: '1px solid var(--color-border-active)',
                      borderRadius: '6px',
                      background: 'var(--color-bg-raised)',
                      color: 'var(--text-primary)',
                      fontFamily: 'var(--font-body)',
                      fontSize: '13px',
                      padding: '0 8px',
                      outline: 'none',
                    }}
                  />
                ) : (
                  <button
                    onClick={() => handleSelect(space.id)}
                    style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      height: '36px',
                      padding: '0 4px',
                      border: 'none',
                      background: 'transparent',
                      color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                      fontFamily: 'var(--font-body)',
                      fontSize: '13px',
                      fontWeight: isActive ? 600 : 400,
                      cursor: 'pointer',
                      textAlign: 'left',
                      borderRadius: '6px',
                    }}
                  >
                    <span
                      style={{
                        flex: 1,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {space.name}
                    </span>
                    <span
                      style={{
                        fontFamily: 'var(--font-ui)',
                        fontSize: '10px',
                        color: 'var(--text-disabled)',
                        flexShrink: 0,
                        marginLeft: '4px',
                      }}
                    >
                      {space.item_count}
                    </span>
                  </button>
                )}

                {/* Action buttons (on hover) */}
                {isHovered && !isEditing && (
                  <div style={{ display: 'flex', gap: '2px', flexShrink: 0 }}>
                    <button
                      onClick={(e) => startEdit(space, e)}
                      title="Rename"
                      style={iconBtnStyle}
                      aria-label={`Rename ${space.name}`}
                    >
                      <PencilSimple size={12} weight="regular" />
                    </button>
                    {spaces.length > 1 && (
                      <button
                        onClick={(e) => handleDelete(space.id, e)}
                        title="Delete"
                        style={{ ...iconBtnStyle, color: 'var(--color-accent)' }}
                        aria-label={`Delete ${space.name}`}
                      >
                        <Trash size={12} weight="regular" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {/* New space inline input */}
          {creating && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 4px',
              }}
            >
              <div style={{ width: '5px', height: '5px', flexShrink: 0 }} />
              <input
                ref={newInputRef}
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onBlur={commitNew}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commitNew();
                  if (e.key === 'Escape') { setCreating(false); setNewName(''); }
                }}
                placeholder="Space name…"
                style={{
                  flex: 1,
                  height: '32px',
                  border: '1px solid var(--color-border-active)',
                  borderRadius: '6px',
                  background: 'var(--color-bg-raised)',
                  color: 'var(--text-primary)',
                  fontFamily: 'var(--font-body)',
                  fontSize: '13px',
                  padding: '0 8px',
                  outline: 'none',
                }}
              />
              <button onClick={commitNew} style={iconBtnStyle} aria-label="Create">
                <Check size={12} weight="bold" />
              </button>
            </div>
          )}
        </div>

        {/* Divider */}
        <div style={{ height: '1px', background: 'var(--color-border)', margin: '0 8px' }} />

        {/* Footer: New Space */}
        <button
          onClick={() => setCreating(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '14px 16px',
            border: 'none',
            background: 'transparent',
            color: 'var(--text-secondary)',
            fontFamily: 'var(--font-ui)',
            fontSize: '10px',
            letterSpacing: '0.10em',
            textTransform: 'uppercase',
            cursor: 'pointer',
            borderRadius: '0 0 0 0',
            transition: 'color 0.1s ease',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-primary)')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-secondary)')}
        >
          <Plus size={14} weight="regular" />
          NEW SPACE
        </button>
      </aside>
    </>
  );
}

// ── Shared icon button style ───────────────────────────────
const iconBtnStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '24px',
  height: '24px',
  border: 'none',
  background: 'transparent',
  color: 'var(--text-secondary)',
  cursor: 'pointer',
  borderRadius: '4px',
  padding: 0,
  flexShrink: 0,
};

// Standalone store for SpacesManager (avoids circular dependency with useStore.js)
const useSpacesStore = create((set, get) => ({
  spaces: [],
  activeSpaceId: null,
  ...spacesSlice(set, get),
}));

export { useSpacesStore };
