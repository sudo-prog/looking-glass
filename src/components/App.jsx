/**
 * LOOKING GLASS — Main App Component
 * V0.6: React 18 + SQLite + Rich Text + Spaces + Tags + AI + ScratchPad
 *       + Selection toolbar + Folder modal + rich Lightbox
 */
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Toaster, toast } from 'react-hot-toast';
import { useStore } from '../store/useStore.js';
import { HistoryManager, AddItemCommand, DeleteItemCommand, MoveItemCommand, UpdateItemCommand, StackCommand, FolderCommand } from '../history/HistoryManager.js';
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
import LiquidOrb from '../ui/LiquidOrb.jsx';

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
    removeFromStack,
    dissolveStack,
    dissolveFolder,
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

  const [lightboxItem, setLightboxItem] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);
  const [aiSummarise, setAiSummarise] = useState(null);
  const [spacesOpen, setSpacesOpen] = useState(false);
  const [showTags, setShowTags] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [openFolderId, setOpenFolderId] = useState(null);

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
        setCommandPaletteOpen((v) => !v);
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

  const handleUndo = useCallback(async () => {
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
      case 'stack': {
        // Undo: remove the stack, restore original items
        const restored = data.restoredItems.map((item, i) => ({
          ...item,
          z_index: (command.stackItem.z_index || 0) + i,
          updated_at: Date.now(),
        }));
        for (const item of restored) {
          await useStore.getState().addItem(item);
        }
        await useStore.getState().deleteItem(data.stackToRemove);
        break;
      }
      case 'folder': {
        // Undo: remove the folder, restore original items
        const restored = data.restoredItems.map((item, i) => ({
          ...item,
          z_index: (command.folderItem.z_index || 0) + i,
          updated_at: Date.now(),
        }));
        for (const item of restored) {
          await useStore.getState().addItem(item);
        }
        await useStore.getState().deleteItem(data.folderToRemove);
        break;
      }
    }
    useStore.setState({ undoCounts: history.current.getCounts() });
  }, []);

  const handleRedo = useCallback(async () => {
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
      case 'stack': {
        // Redo: re-create the stack from stored source items
        const sourceItems = command.sourceItems;
        await useStore.getState().createStack(sourceItems.map(i => i.id));
        break;
      }
      case 'folder': {
        // Redo: re-create the folder from stored source items
        const sourceItems = command.sourceItems;
        await useStore.getState().createFolder(sourceItems.map(i => i.id), command.folderItem.content?.title || 'Folder name', command.folderItem.content?.description || '');
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
    const newScale = Math.min(3, viewport.scale * 1.2);
    setViewport({ ...viewport, scale: newScale });
  }, [viewport, setViewport]);

  const handleZoomOut = useCallback(() => {
    const newScale = Math.max(0.1, viewport.scale / 1.2);
    setViewport({ ...viewport, scale: newScale });
  }, [viewport, setViewport]);

  const handleFit = useCallback(() => {
    // Fit all visible items into view with padding
    const items = getFilteredItems();
    if (items.length === 0) {
      setViewport({ x: 0, y: 0, scale: 1 });
      return;
    }
    const padding = 80;
    const xs = items.map((i) => i.x);
    const ys = items.map((i) => i.y);
    const minX = Math.min(...xs);
    const minY = Math.min(...ys);
    const maxX = Math.max(...xs.map((x, i) => x + (items[i].width || 280)));
    const maxY = Math.max(...ys.map((y, i) => y + (items[i].height || 180)));
    const contentW = maxX - minX;
    const contentH = maxY - minY;
    // Use a sensible default viewport size based on window
    const vpW = window.innerWidth - 320; // subtract sidebar
    const vpH = window.innerHeight - 80;
    const scale = Math.min(2, Math.max(0.1, Math.min(vpW / (contentW + padding * 2), vpH / (contentH + padding * 2))));
    const cx = minX + contentW / 2;
    const cy = minY + contentH / 2;
    setViewport({
      x: vpW / 2 - cx * scale,
      y: vpH / 2 - cy * scale,
      scale,
    });
  }, [viewport, setViewport, getFilteredItems]);

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
        toast.error('Import failed: ' + err.message);
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
  const handleContextAction = useCallback(async (action, item) => {
    switch (action) {
      case 'open':
        window.open(item.content?.url, '_blank');
        break;
      case 'copy-link':
        navigator.clipboard.writeText(item.content?.url || '');
        break;
      case 'stack': {
        const state = useStore.getState();
        const sourceItems = [...selectedIds].map((id) => state.items.find((i) => i.id === id)).filter(Boolean);
        const stackItem = await createStack([...selectedIds]);
        if (stackItem) {
          history.current.push(new StackCommand(stackItem, sourceItems));
          useStore.setState({ undoCounts: history.current.getCounts() });
        }
        break;
      }
      case 'folder': {
        const state = useStore.getState();
        const sourceItems = [...selectedIds].map((id) => state.items.find((i) => i.id === id)).filter(Boolean);
        const folderItem = await createFolder([...selectedIds], 'Folder name', '');
        if (folderItem) {
          history.current.push(new FolderCommand(folderItem, sourceItems));
          useStore.setState({ undoCounts: history.current.getCounts() });
        }
        break;
      }
      case 'open-folder':
        setOpenFolderId(item.id);
        break;
      case 'unstack':
        unstackToCanvas(item.id);
        break;
      case 'remove-from-folder':
        // Used inside FolderViewModal — remove this specific child from its parent folder
        if (openFolderId) {
          removeFromFolder(openFolderId, item.id);
        }
        break;
      case 'remove-from-stack':
        // Used inside a stack view — remove this specific child from its parent stack
        // When triggered from the stack card itself (no child context), dissolve
        dissolveStack(item.id);
        break;
      case 'dissolve':
        if (item.type === 'folder') {
          dissolveFolder(item.id);
        } else if (item.type === 'stack') {
          dissolveStack(item.id);
        }
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
  }, [selectedIds, createStack, createFolder, unstackToCanvas, removeFromFolder, removeFromStack, dissolveStack, dissolveFolder, updateItem, deleteItem, openFolderId]);

  // ── Stack/Folder history wrappers ──────────────────────────────────

  const handleAddToStack = useCallback(async (newItemId, stackItemId) => {
    const state = useStore.getState();
    const newItem = state.items.find((i) => i.id === newItemId);
    const stackItem = state.items.find((i) => i.id === stackItemId);
    if (!newItem || !stackItem) return;
    await addToStack(newItemId, stackItemId);
    // Push a command that can undo the addition
    const updatedStack = useStore.getState().items.find((i) => i.id === stackItemId);
    if (updatedStack) {
      history.current.push(new StackCommand(updatedStack, [newItem]));
      useStore.setState({ undoCounts: history.current.getCounts() });
    }
  }, [addToStack]);

  const handleAddToFolder = useCallback(async (newItemId, folderItemId) => {
    const state = useStore.getState();
    const newItem = state.items.find((i) => i.id === newItemId);
    const folderItem = state.items.find((i) => i.id === folderItemId);
    if (!newItem || !folderItem) return;
    await addToFolder(newItemId, folderItemId);
    // Push a command that can undo the addition
    const updatedFolder = useStore.getState().items.find((i) => i.id === folderItemId);
    if (updatedFolder) {
      history.current.push(new FolderCommand(updatedFolder, [newItem]));
      useStore.setState({ undoCounts: history.current.getCounts() });
    }
  }, [addToFolder]);

  // filteredItems must be computed before any useCallback that references it
  // (temporal dead zone fix - this was causing ReferenceError)
  const filteredItems = getFilteredItems();
  
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

  // AI summarise handler for sidebar - requires a selected card
  const handleAISummarise = useCallback(() => {
    const sel = filteredItems.filter(i => selectedIds.has(i.id));
    if (sel.length === 1) {
      setAiSummarise({ mode: 'card', item: sel[0] });
    } else if (sel.length > 1) {
      setAiSummarise({ mode: 'cluster', selectedItems: sel });
    } else {
      toast('Select a card first to summarise, or multiple cards for cluster insights');
    }
  }, [filteredItems, selectedIds]);

  return (
    <div style={{ display: 'flex', width: '100%', height: '100vh', overflow: 'hidden' }}>
      <Toaster
        position="bottom-center"
        toastOptions={{
          style: {
            background: 'rgba(20,20,20,0.95)',
            color: '#fff',
            borderRadius: '12px',
            border: '1px solid rgba(255,255,255,0.10)',
            backdropFilter: 'blur(16px)',
            fontFamily: 'var(--font-ui)',
            fontSize: '12px',
          },
        }}
      />
      <LiquidGlassSidebar
        onSpacesOpen={() => setSpacesOpen(true)}
        onTagsOpen={() => setShowTags(true)}
        onAIOrganise={handleAIOrganise}
        onAISummarise={handleAISummarise}
      />
      <div data-main-content style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
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
            onAddToStack={handleAddToStack}
            onCreateFolder={createFolder}
            onAddToFolder={handleAddToFolder}
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
          zoom={viewport.scale}
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
        <SmartContextMenu
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

      {/* Tags Panel slide-over */}
      {showTags && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 'calc(var(--z-toolbar) + 1)', display: 'flex' }}>
          <div onClick={() => setShowTags(false)} style={{ flex: 1, background: 'rgba(0,0,0,0.25)' }} />
          <aside style={{
            width: '280px',
            height: '100%',
            background: 'var(--glass-frost)',
            backdropFilter: 'blur(var(--glass-blur-xl)) saturate(120%)',
            WebkitBackdropFilter: 'blur(var(--glass-blur-xl)) saturate(120%)',
            borderLeft: '1px solid var(--color-border)',
            boxShadow: '-4px 0 32px rgba(0,0,0,0.50)',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
          }}>
            <div style={{ padding: '12px 12px 8px', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontFamily: 'var(--font-ui)', fontSize: '10px', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>TAGS</span>
              <button onClick={() => setShowTags(false)} style={{ border: 'none', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px' }}>✕</button>
            </div>
            <TagsPanel
              items={items}
              activeTagFilters={activeTagFilters}
              onToggleTag={toggleTagFilter}
              onClearTags={clearTagFilters}
            />
          </aside>
        </div>
      )}

      {/* Command Palette */}
      {commandPaletteOpen && (
        <CommandPalette
          isOpen={commandPaletteOpen}
          onClose={() => setCommandPaletteOpen(false)}
          onSearch={search}
          onAddNote={addNote}
          onAddUrl={addUrl}
          onClearSearch={clearSearch}
        />
      )}
      {/* AI Orb — bottom center */}
      <LiquidOrb />
    </div>
  );
}