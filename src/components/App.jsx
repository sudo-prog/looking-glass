/**
 * LOOKING GLASS — Main App Component
 * V0.5: 3-state sidebar, audit #4 fixes
 */
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useStore } from '../store/useStore.js';
import { HistoryManager, AddItemCommand, DeleteItemCommand, MoveItemCommand, UpdateItemCommand } from '../history/HistoryManager.js';
import LiquidGlassSidebar from '../ui/LiquidGlassSidebar.jsx';
import { Canvas } from '../canvas/Canvas.jsx';
import { ExportDialog } from '../utils/export/ExportDialog.jsx';
import { Lightbox } from '../ui/Lightbox.jsx';
import { CommandPalette } from '../ui/CommandPalette.jsx';

export function App() {
  const initialized = useRef(false);
  const history = useRef(new HistoryManager(100));

  const {
    init,
    viewport,
    setViewport,
    items,
    selectedIds,
    selectItem,
    clearSelection,
    getFilteredItems,
    addNote,
    addUrl,
    addImage,
    deleteSelected,
    updateItem,
    deleteItem,
    search,
    clearSearch,
    searchQuery,
    exportDialogOpen,
    undoCounts,
  } = useStore();

  const [zoom, setZoom] = useState(1);
  const [lightboxItem, setLightboxItem] = useState(null);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

  // Initialize
  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      init();
    }
  }, [init]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e) => {
      const tag = e.target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || e.target.isContentEditable) return;

      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        const query = prompt('Search...');
        if (query !== null) search(query);
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        handleRedo();
        return;
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedIds.size > 0) {
          e.preventDefault();
          handleDeleteSelected();
        }
        return;
      }
      if (e.key === 'n') {
        addNote();
        return;
      }
      if (e.key === 'Escape') {
        clearSelection();
        clearSearch();
        return;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [selectedIds, search, clearSearch, clearSelection, addNote]);

  const handleUndo = useCallback(() => {
    const result = history.current.undo();
    if (!result) return;
    const { command, result: data } = result;
    const items = useStore.getState().items;

    switch (command.type) {
      case 'add': {
        const idx = items.findIndex((i) => i.id === command.item.id);
        if (idx !== -1) {
          items.splice(idx, 1);
          useStore.setState({ items: [...items] });
        }
        break;
      }
      case 'delete': {
        items.push(command.item);
        useStore.setState({ items: [...items] });
        break;
      }
      case 'move': {
        const item = items.find((i) => i.id === command.itemId);
        if (item) {
          item.x = data.x;
          item.y = data.y;
          useStore.setState({ items: [...items] });
        }
        break;
      }
      case 'update': {
        const item = items.find((i) => i.id === command.itemId);
        if (item) {
          Object.assign(item, data);
          useStore.setState({ items: [...items] });
        }
        break;
      }
    }
    useStore.setState({ undoCounts: history.current.getCounts() });
  }, []);

  const handleRedo = useCallback(() => {
    const result = history.current.redo();
    if (!result) return;
    const { command } = result;
    const items = useStore.getState().items;

    switch (command.type) {
      case 'add': {
        items.push(command.item);
        useStore.setState({ items: [...items] });
        break;
      }
      case 'delete': {
        const idx = items.findIndex((i) => i.id === command.item.id);
        if (idx !== -1) {
          items.splice(idx, 1);
          useStore.setState({ items: [...items] });
        }
        break;
      }
    }
    useStore.setState({ undoCounts: history.current.getCounts() });
  }, []);

  const handleDeleteSelected = useCallback(async () => {
    const state = useStore.getState();
    for (const id of state.selectedIds) {
      const item = state.items.find((i) => i.id === id);
      if (item) {
        history.current.push(new DeleteItemCommand(item, state.items));
      }
      await deleteItem(id);
    }
    useStore.setState({ undoCounts: history.current.getCounts() });
  }, [deleteItem]);

  const handleItemMove = useCallback((id, x, y) => {
    const item = useStore.getState().items.find((i) => i.id === id);
    if (item) {
      history.current.push(new MoveItemCommand(id, item.x, item.y, x, y));
      updateItem(id, { x, y });
      useStore.setState({ undoCounts: history.current.getCounts() });
    }
  }, [updateItem]);

  const handleItemSave = useCallback((id, updates) => {
    const item = useStore.getState().items.find((i) => i.id === id);
    if (item) {
      history.current.push(new UpdateItemCommand(id, { ...item }, { ...item, ...updates }));
      updateItem(id, updates);
      useStore.setState({ undoCounts: history.current.getCounts() });
    }
  }, [updateItem]);

  const filteredItems = getFilteredItems();

  return (
    <div style={{
      display: 'flex',
      height: '100vh',
      width: '100vw',
      overflow: 'hidden',
      background: 'var(--canvas-bg)',
    }}>
      {/* Left rail — 3-state sidebar (collapsed / expanded / full menu) */}
      <LiquidGlassSidebar />

      {/* Main canvas area fills remaining space */}
      <main style={{ flex: 1, position: 'relative', overflow: 'hidden' }} aria-label="Infinite canvas">
        <div id="canvas-viewport" style={{ width: '100%', height: '100%' }}>
          <Canvas
            items={filteredItems}
            viewport={viewport}
            selectedIds={selectedIds}
            onViewportChange={setViewport}
            onSelectItem={selectItem}
            onClearSelection={clearSelection}
            onItemMove={handleItemMove}
            onItemSave={handleItemSave}
            onItemDelete={deleteItem}
            onLightbox={setLightboxItem}
          />
        </div>

        {/* Persistent overlays */}
        <CommandPalette
          isOpen={commandPaletteOpen}
          onClose={() => setCommandPaletteOpen(false)}
          onAction={(action) => { if (action === 'new-note') addNote(); setCommandPaletteOpen(false); }}
          onSearch={() => {}}
        />
      </main>

      {exportDialogOpen && (
        <ExportDialog onClose={() => useStore.setState({ exportDialogOpen: false })} />
      )}

      {lightboxItem && (
        <Lightbox item={lightboxItem} onClose={() => setLightboxItem(null)} />
      )}
    </div>
  );
}
