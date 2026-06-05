/**
 * LOOKING GLASS — Main App Component
 * V0.4: React 18 + SQLite + Rich Text
 */
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useStore } from '../store/useStore.js';
import { HistoryManager, AddItemCommand, DeleteItemCommand, MoveItemCommand, UpdateItemCommand } from '../history/HistoryManager.js';
import { Toolbar } from '../ui/Toolbar.jsx';
import { Sidebar } from '../ui/Sidebar.jsx';
import { Canvas } from '../canvas/Canvas.jsx';
import { ExportDialog } from '../utils/export/ExportDialog.jsx';
import { Lightbox } from '../ui/Lightbox.jsx';
import { CommandPalette } from '../ui/CommandPalette.jsx';
import { ContextMenu } from '../ui/ContextMenu.jsx';
import { Minimap } from '../ui/Minimap.jsx';
import { ModeToggle } from '../ui/ModeToggle.jsx';
import { BottomSheet } from '../ui/BottomSheet.jsx';
import { SpacesSidebar } from '../ui/SpacesSidebar.jsx';

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
    activeFilters,
    toggleFilter,
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
    canvasName,
    undoCounts,
    getStats,
  } = useStore();

  const [zoom, setZoom] = useState(1);
  const [lightboxItem, setLightboxItem] = useState(null);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [contextMenu, setContextMenu] = useState(null);
  const [minimapOpen, setMinimapOpen] = useState(true);
  const [spacesOpen, setSpacesOpen] = useState(false);
  const [bottomSheet, setBottomSheet] = useState(null);

  const isDarkMode = document.documentElement.getAttribute('data-theme') === 'dark' || (!('lg-theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches);

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

  const handleZoomIn = useCallback(() => {
    const newScale = Math.min(3, zoom * 1.2);
    setZoom(newScale);
    setViewport({ ...viewport, scale: newScale });
  }, [zoom, viewport, setViewport]);

  const handleZoomOut = useCallback(() => {
    const newScale = Math.max(0.1, zoom / 1.2);
    setZoom(newScale);
    setViewport({ ...viewport, scale: newScale });
  }, [zoom, viewport, setViewport]);

  const handleFit = useCallback(() => {
    // Fit to content logic handled by Canvas
    setZoom(1);
  }, []);

  const handleExport = useCallback(() => {
    useStore.setState({ exportDialogOpen: true });
  }, []);

  const handleImport = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const text = await file.text();
      try {
        const data = JSON.parse(text);
        const state = useStore.getState();
        await state.importData(data);
      } catch (err) {
        alert('Import failed: ' + err.message);
      }
    };
    input.click();
  }, []);

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
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <Sidebar
        activeFilters={activeFilters}
        onToggleFilter={toggleFilter}
        stats={useStore.getState().getStats()}
      />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Toolbar
          zoom={zoom}
          searchQuery={searchQuery}
          onAddNote={addNote}
          onAddUrl={() => {
            const url = prompt('Enter URL:');
            if (url) addUrl(url);
          }}
          onAddImage={() => {
            const url = prompt('Enter image URL:');
            if (url) addImage(url);
          }}
          onDelete={handleDeleteSelected}
          onUndo={handleUndo}
          onRedo={handleRedo}
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onFit={handleFit}
          onSearch={search}
          onSearchClear={clearSearch}
          onExport={handleExport}
          onImport={handleImport}
          onToggleCommandPalette={() => setCommandPaletteOpen((v) => !v)}
          onToggleSpaces={() => setSpacesOpen((v) => !v)}
          canUndo={undoCounts.undo > 0}
          canRedo={undoCounts.redo > 0}
          selectedCount={selectedIds.size}
        />

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

      {exportDialogOpen && (
        <ExportDialog
          onClose={() => useStore.setState({ exportDialogOpen: false })}
        />
      )}

      {lightboxItem && (
        <Lightbox
          item={lightboxItem}
          onClose={() => setLightboxItem(null)}
        />
      )}

      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        onAction={(action) => {
          if (action === 'new-note') addNote();
          setCommandPaletteOpen(false);
        }}
        onSearch={() => {}}
      />

      {contextMenu && (
        <ContextMenu
          isOpen={!!contextMenu}
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
          onAction={(actionId) => {
            if (actionId === 'delete') handleDeleteSelected();
            setContextMenu(null);
          }}
        />
      )}

      {minimapOpen && (
        <Minimap
          items={filteredItems}
          viewport={viewport}
          onPan={(x, y) => setViewport({ ...viewport, x: -x * viewport.scale + window.innerWidth / 2, y: -y * viewport.scale + window.innerHeight / 2 })}
        />
      )}

      <ModeToggle
        isDark={isDarkMode}
        onToggle={() => {
          const next = isDarkMode ? 'light' : 'dark';
          localStorage.setItem('lg-theme', next);
          document.documentElement.setAttribute('data-theme', next);
        }}
      />

      <SpacesSidebar
        isOpen={spacesOpen}
        spaces={[{ id: 'default', name: 'My Canvas', count: filteredItems.length }]}
        activeSpaceId="default"
        onClose={() => setSpacesOpen(false)}
        onSelectSpace={() => {}}
        onNewSpace={() => {}}
      />

      {bottomSheet && (
        <BottomSheet
          isOpen={!!bottomSheet}
          onClose={() => setBottomSheet(null)}
          snap={bottomSheet.snap}
        >
          {bottomSheet.content}
        </BottomSheet>
      )}
    </div>
  );
}
