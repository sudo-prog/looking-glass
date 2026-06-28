/**
 * LOOKING GLASS — Main App Component
 * V0.6: React 18 + SQLite + Rich Text + Spaces + Tags + AI + ScratchPad
 *       + Selection toolbar + Folder modal + rich Lightbox
 */
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useStore } from '../store/useStore.js';
import { HistoryManager, AddItemCommand, DeleteItemCommand, MoveItemCommand, UpdateItemCommand } from '../history/HistoryManager.js';
import LiquidGlassSidebar from '../ui/LiquidGlassSidebar.jsx';
import { Canvas } from '../canvas/Canvas.jsx';
import { ExportDialog } from '../utils/export/ExportDialog.jsx';
import { Lightbox } from '../ui/Lightbox.jsx';
import { ScratchPad } from '../ui/ScratchPad.jsx';
import { DropZoneHandler } from '../ui/DropZoneHandler.jsx';
import { Toolbar } from '../ui/Toolbar.jsx';
import { AISummarisePanel } from '../ui/AISummarisePanel.jsx';
import { fetchMetadata } from '../utils/meta-fetcher.js';
import { SmartContextMenu } from '../components/ContextMenu.jsx';
import { TagFilterBar, TagsPanel } from '../ui/TagsSystem.jsx';
import { CommandPalette } from '../ui/CommandPalette.jsx';
import { SpacesManager } from '../ui/SpacesManager.jsx';
import { FolderViewModal } from '../ui/FolderViewModal.jsx';

export function App() {
  const initialized = useRef(false);
  const history = useRef(new HistoryManager(100));

  const {
    init,
    loadCanvas,
    canvasId,
    viewport,
    setViewport,
    items,
    selectedIds,
    selectItem,
    setSelection,
    clearSelection,
    activeFilters,
    toggleFilter,
    getFilteredItems,
    addNote,
    addUrl,
    addImage,
    addAudio,
    addVideo,
    addPDF,
    addWebClipScreenshot,
    deleteSelected,
    updateItem,
    deleteItem,
    search,
    clearSearch,
    searchQuery,
    exportDialogOpen,
    canvasName,
    undoCounts,
    createStack,
    addToStack,
    unstackToCanvas,
    createFolder,
    addToFolder,
    removeFromFolder,
    unfolderToCanvas,
    renameFolder,
    updateFolderDescription,
    arrangeMasonry,
    activeTagFilters,
    toggleTagFilter,
    clearTagFilters,
    spaces,
    activeSpaceId,
  } = useStore();

  const [zoom, setZoom] = useState(1);
  const [lightboxItem, setLightboxItem] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);
  const [aiSummarise, setAiSummarise] = useState(null);
  const [spacesOpen, setSpacesOpen] = useState(false);
  const [showTags, setShowTags] = useState(false);
  const [openFolderId, setOpenFolderId] = useState(null);

  // Initialize
  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      init();
    }
  }, [init]);

  // Load canvas items after init completes
  useEffect(() => {
    if (canvasId) {
      useStore.getState().loadCanvas(canvasId);
    }
  }, [canvasId]);

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
    const state = useStore.getState();

    switch (command.type) {
      case 'add': {
        const newItems = state.items.filter((i) => i.id !== command.item.id);
        useStore.setState({ items: newItems });
        break;
      }
      case 'delete': {
        useStore.setState({ items: [...state.items, command.item] });
        break;
      }
      case 'move': {
        const newItems = state.items.map((i) =>
          i.id === command.itemId ? { ...i, x: data.x, y: data.y } : i
        );
        useStore.setState({ items: newItems });
        break;
      }
      case 'update': {
        const newItems = state.items.map((i) =>
          i.id === command.itemId ? { ...i, ...data } : i
        );
        useStore.setState({ items: newItems });
        break;
      }
    }
    useStore.setState({ undoCounts: history.current.getCounts() });
  }, []);

  const handleRedo = useCallback(() => {
    const result = history.current.redo();
    if (!result) return;
    const { command } = result;
    const state = useStore.getState();

    switch (command.type) {
      case 'add': {
        useStore.setState({ items: [...state.items, command.item] });
        break;
      }
      case 'delete': {
        const newItems = state.items.filter((i) => i.id !== command.item.id);
        useStore.setState({ items: newItems });
        break;
      }
      case 'move': {
        const newItems = state.items.map((i) =>
          i.id === command.itemId ? { ...i, x: command.newX, y: command.newY } : i
        );
        useStore.setState({ items: newItems });
        break;
      }
      case 'update': {
        const newItems = state.items.map((i) =>
          i.id === command.itemId ? { ...i, ...command.newData } : i
        );
        useStore.setState({ items: newItems });
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

  // ── Selection toolbar handlers ─────────────────────────────────────

  const handleColorSelected = useCallback((hex) => {
    const state = useStore.getState();
    state.selectedIds.forEach((id) => {
      updateItem(id, { meta: { color: hex } });
    });
  }, [updateItem]);

  const handleCopyLinkSelected = useCallback(() => {
    const state = useStore.getState();
    const links = [...state.selectedIds]
      .map((id) => state.items.find((i) => i.id === id))
      .filter((i) => i?.content?.url)
      .map((i) => i.content.url);
    if (links.length) {
      navigator.clipboard?.writeText(links.join('\n'));
    }
  }, []);

  // ── Folder modal handlers ──────────────────────────────────────────

  const openFolder = items.find((i) => i.id === openFolderId);

  const handleCloseFolderModal = useCallback(() => setOpenFolderId(null), []);

  const handleRemoveFromFolder = useCallback(
    (childId) => {
      if (!openFolderId) return;
      removeFromFolder(openFolderId, childId);
    },
    [openFolderId, removeFromFolder],
  );

  const handleEmptyFolder = useCallback(() => {
    if (!openFolderId) return;
    unfolderToCanvas(openFolderId);
    setOpenFolderId(null);
  }, [openFolderId, unfolderToCanvas]);

  // Context menu action handler
  const handleContextAction = useCallback((action, item) => {
    switch (action) {
      case 'open':
        window.open(item.content?.url, '_blank');
        break;
      case 'copy-link':
        navigator.clipboard.writeText(item.content?.url || '');
        break;
      case 'stack':
        createStack([...selectedIds]);
        break;
      case 'folder':
        createFolder([...selectedIds], 'Folder name', '');
        break;
      case 'open-folder':
        setOpenFolderId(item.id);
        break;
      case 'unstack':
        unstackToCanvas(item.id);
        break;
      case 'summarise':
        setAiSummarise({ mode: 'card', item });
        break;
      case 'archive':
        updateItem(item.id, { meta: { archived: true } });
        break;
      case 'delete':
        deleteItem(item.id);
        break;
      case 'edit-tags':
        // Tag editor is inline on card — no-op at app level
        break;
      case 'color-none':
        updateItem(item.id, { meta: { color: null } });
        break;
      default:
        if (action.startsWith('color-')) {
          const COLORS = ['#D71921', '#F59E0B', '#22C55E', '#3B82F6', '#8B5CF6'];
          updateItem(item.id, { meta: { color: COLORS[parseInt(action.split('-')[1])] } });
        }
    }
  }, [selectedIds, createStack, createFolder, unstackToCanvas, updateItem, deleteItem]);

  // Drop handler for DropZoneHandler
  const handleDrop = useCallback(async (drops) => {
    for (const drop of drops) {
      switch (drop.kind) {
        case 'image':
          await addImage(drop.objectUrl);
          break;
        case 'video':
          await addVideo(drop.file, drop.objectUrl);
          break;
        case 'pdf':
          await addPDF(drop.file);
          break;
        case 'audio':
          await addAudio();
          break;
        case 'url': {
          // Fetch metadata and add as web clip screenshot
          try {
            const meta = await fetchMetadata(drop.url);
            await addWebClipScreenshot(drop.url, meta);
          } catch {
            await addUrl(drop.url);
          }
          break;
        }
        case 'text':
          await addNote();
          break;
      }
    }
  }, [addImage, addVideo, addPDF, addAudio, addWebClipScreenshot, addUrl, addNote]);

  const filteredItems = getFilteredItems();

  // AI organise handler
  const handleAIOrganise = useCallback(() => {
    setAiSummarise({ mode: 'organise' });
  }, []);

  // AI cluster handler
  const handleAICluster = useCallback(() => {
    const selectedItems = filteredItems.filter(i => selectedIds.has(i.id));
    if (selectedItems.length > 1) {
      setAiSummarise({ mode: 'cluster', selectedItems });
    }
  }, [filteredItems, selectedIds]);

  return (
    <div style={{ display: 'flex', width: '100%', height: '100vh', overflow: 'hidden' }}>
      <LiquidGlassSidebar
        onSpacesOpen={() => setSpacesOpen(true)}
        onTagsOpen={() => setShowTags(true)}
        onAIOrganise={handleAIOrganise}
        onAISummarise={() => setAiSummarise({ mode: 'card' })}
      />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
        <DropZoneHandler viewport={viewport} onDrop={handleDrop}>
          <TagFilterBar
            activeTagFilters={activeTagFilters}
            onToggleTag={toggleTagFilter}
            onClearTags={clearTagFilters}
          />
          <Canvas
            items={filteredItems}
            viewport={viewport}
            selectedIds={selectedIds}
            onViewportChange={setViewport}
            onSelectItem={selectItem}
            onSetSelection={setSelection}
            onClearSelection={clearSelection}
            onItemMove={handleItemMove}
            onItemSave={handleItemSave}
            onItemDelete={deleteItem}
            onLightbox={setLightboxItem}
            onCreateStack={createStack}
            onAddToStack={addToStack}
            onCreateFolder={createFolder}
            onAddToFolder={addToFolder}
            onContextMenu={(item, x, y) => setContextMenu({ item, x, y })}
            onOpenFolder={setOpenFolderId}
            onColorSelected={handleColorSelected}
            onCopyLinkSelected={handleCopyLinkSelected}
            onDeleteSelected={handleDeleteSelected}
            onArrangeSelected={(ids) => arrangeMasonry(ids)}
          />
        </DropZoneHandler>

        {/* Floating Toolbar */}
        <Toolbar
          zoom={zoom}
          searchQuery={searchQuery}
          onAddNote={addNote}
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
          canUndo={undoCounts.undo > 0}
          canRedo={undoCounts.redo > 0}
          selectedCount={selectedIds.size}
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
          onColor={(hex) => updateItem(lightboxItem.id, { meta: { color: hex } })}
        />
      )}

      {/* Folder expand modal */}
      {openFolder && (
        <FolderViewModal
          folder={openFolder}
          onClose={handleCloseFolderModal}
          onRemoveItem={handleRemoveFromFolder}
          onEmptyAll={handleEmptyFolder}
          onRename={(name) => renameFolder(openFolder.id, name)}
          onDescription={(desc) => updateFolderDescription(openFolder.id, desc)}
        />
      )}

      {/* ScratchPad overlay */}
      <ScratchPad />

      {/* Context menu */}
      {contextMenu && (
        <ContextMenu
          isOpen
          x={contextMenu.x}
          y={contextMenu.y}
          item={contextMenu.item}
          selectedIds={selectedIds}
          onClose={() => setContextMenu(null)}
          onAction={handleContextAction}
        />
      )}

      {/* AI Summarise Panel */}
      {aiSummarise && (
        <AISummarisePanel
          mode={aiSummarise.mode}
          item={aiSummarise.item}
          selectedItems={aiSummarise.selectedItems || filteredItems.filter(i => selectedIds.has(i.id))}
          allItems={items}
          onClose={() => setAiSummarise(null)}
          onApplyOrganisation={(groups, tags) => {
            // Apply organisation — groups and tags
            console.log('Apply organisation:', groups, tags);
          }}
          onAddNote={(text) => addNote()}
        />
      )}

      {/* Spaces Manager */}
      <SpacesManager isOpen={spacesOpen} onClose={() => setSpacesOpen(false)} />
    </div>
  );
}
