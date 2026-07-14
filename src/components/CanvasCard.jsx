/**
 * LOOKING GLASS — Canvas Card Component (React)
 * Renders different card types. Notes use Tiptap rich text editor.
 *
 * V2 additions (recreated from reference captures):
 *   - StackCard: diagonal big-to-small corner-peek cascade (STACK_BIG_TO_SMALL.mp4),
 *     fan reveals a clean grid instead of a horizontal row (Stacks.mp4).
 *   - FolderCard: literal folder-shaped icon with editable Name + Description
 *     printed on the face (FOLDER_GROUPING_.mp4); opens FolderViewModal via onOpenFolder.
 *   - NoteCard: BlockTypeMenu ("turn into" handle) + Task list support (Paragraphs.mp4, Notes.mp4).
 */
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import { FolderOpen } from '@phosphor-icons/react';
import { ITEM_TYPES } from '../data/schema.js';
import { VideoCard } from './VideoCard.jsx';
import { AudioMemoCard } from './AudioMemoCard.jsx';
import { PDFViewerCard } from './PDFViewerCard.jsx';
import { WebClipScreenshotCard } from './WebClipScreenshotCard.jsx';
import { BlockTypeMenu } from '../ui/BlockTypeMenu.jsx';
import { TagEditor } from '../ui/TagsSystem.jsx';

// ── Utils ──────────────────────────────────────────────────

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function getDomain(url) {
  try { return new URL(url).hostname; } catch { return null; }
}

// ── Bookmark Card ──────────────────────────────────────────

function BookmarkCard({ item, isSelected, onSelect, onDragStart, onLightbox }) {
  return (
    <div
      className={`canvas-card card-bookmark ${isSelected ? 'selected' : ''}`}
      data-id={item.id}
      data-type={item.type}
      style={{ left: item.x, top: item.y, width: item.width }}
      onPointerDown={onDragStart}
      onClick={(e) => onSelect(e.ctrlKey || e.metaKey)}
    >
      <div className="card-header">
        <span className="card-handle">⠿</span>
        <span className="card-title">{escapeHtml(item.content.title || 'Bookmark')}</span>
      </div>
      {item.content.image_url && (
        <div className="card-body">
          <img src={escapeHtml(item.content.image_url)} alt="" loading="lazy" onClick={(e) => { e.stopPropagation(); onLightbox(); }} />
        </div>
      )}
      {item.content.description && (
        <div className="card-body">
          <p className="card-desc">{escapeHtml(item.content.description)}</p>
        </div>
      )}
      <div className="card-footer">
        {item.meta?.domain && <span className="card-domain">{escapeHtml(item.meta.domain)}</span>}
        {item.content.url && (
          <a href={escapeHtml(item.content.url)} target="_blank" rel="noopener" className="card-link" onClick={(e) => e.stopPropagation()}>↗</a>
        )}
      </div>
    </div>
  );
}

// ── Image Card ─────────────────────────────────────────────

function ImageCard({ item, isSelected, onSelect, onDragStart, onLightbox }) {
  return (
    <div
      className={`canvas-card card-image ${isSelected ? 'selected' : ''}`}
      data-id={item.id}
      data-type={item.type}
      style={{ left: item.x, top: item.y, width: item.width }}
      onPointerDown={onDragStart}
      onClick={(e) => onSelect(e.ctrlKey || e.metaKey)}
    >
      <div className="card-header">
        <span className="card-handle">⠿</span>
        <span className="card-title">{escapeHtml(item.content.title || 'Image')}</span>
      </div>
      {item.content.image_url && (
        <div className="card-body" onClick={(e) => { e.stopPropagation(); onLightbox(); }}>
          <img src={escapeHtml(item.content.image_url)} alt="" loading="lazy" style={{ cursor: 'zoom-in' }} />
        </div>
      )}
    </div>
  );
}

// ── Note Card (Rich Text with Tiptap + Block Type Menu) ────

function NoteCard({ item, isSelected, onSelect, onDragStart, onSave }) {
  const [editing, setEditing] = useState(false);
  const saveTimeout = useRef(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Underline,
      Link.configure({ openOnClick: false }),
      Placeholder.configure({ placeholder: 'Type your note…' }),
      TaskList,
      TaskItem.configure({ nested: true }),
    ],
    content: item.content.text || '',
    editable: editing,
    onUpdate: ({ editor }) => {
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
      saveTimeout.current = setTimeout(() => {
        const html = editor.getHTML();
        onSave({ content: { text: html } });
      }, 500);
    },
  });

  // Sync editable state
  useEffect(() => {
    if (editor) editor.setEditable(editing);
  }, [editing, editor]);

  // Sync content from store
  useEffect(() => {
    if (editor && item.content.text && !editing) {
      const current = editor.getHTML();
      if (current !== item.content.text) {
        editor.commands.setContent(item.content.text, false);
      }
    }
  }, [item.content.text, editor, editing]);

  const handleDoubleClick = useCallback((e) => {
    e.stopPropagation();
    setEditing(true);
  }, []);

  useEffect(() => {
    if (!editing || !editor) return;
    const handleBlur = () => {
      setEditing(false);
      const html = editor.getHTML();
      onSave({ content: { text: html } });
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        editor.commands.blur();
        setEditing(false);
      }
    };
    editor.on('blur', handleBlur);
    editor.on('keydown', handleKeyDown);
    // Focus after render
    setTimeout(() => editor.commands.focus(), 50);
    return () => {
      editor.off('blur', handleBlur);
      editor.off('keydown', handleKeyDown);
      editor.destroy();
      if (saveTimeout.current) {
        clearTimeout(saveTimeout.current);
        saveTimeout.current = null;
      }
    };
  }, [editing, editor, onSave]);

  // Clear save timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeout.current) {
        clearTimeout(saveTimeout.current);
        saveTimeout.current = null;
      }
    };
  }, []);

  const firstLine = (() => {
    if (!item.content.text) return 'Note';
    const tmp = document.createElement('div');
    tmp.innerHTML = item.content.text;
    return tmp.textContent.split('\n')[0].trim() || 'Note';
  })();

  return (
    <div
      className={`canvas-card card-note ${isSelected ? 'selected' : ''} ${editing ? 'editing' : ''}`}
      data-id={item.id}
      data-type={item.type}
      style={{ left: item.x, top: item.y, width: item.width || 280 }}
      onPointerDown={onDragStart}
      onClick={(e) => onSelect(e.ctrlKey || e.metaKey)}
      onDoubleClick={handleDoubleClick}
    >
      <div className="card-header">
        <span className="card-handle">⠿</span>
        <span className="card-note-icon">📝</span>
        <span className="card-title">{escapeHtml(firstLine)}</span>
      </div>
      <div
        className={`card-note-editor ${editing ? 'focused' : ''}`}
        style={{ position: 'relative', paddingLeft: editing ? '14px' : undefined }}
      >
        {editing && <BlockTypeMenu editor={editor} />}
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}

// ── Web Clip Card ──────────────────────────────────────────

function WebClipCard({ item, isSelected, onSelect, onDragStart }) {
  return (
    <div
      className={`canvas-card card-webclip ${isSelected ? 'selected' : ''}`}
      data-id={item.id}
      data-type={item.type}
      style={{ left: item.x, top: item.y, width: item.width }}
      onPointerDown={onDragStart}
      onClick={(e) => onSelect(e.ctrlKey || e.metaKey)}
    >
      <div className="card-header">
        <span className="card-handle">⠿</span>
        <span className="card-title">{escapeHtml(item.content.title || 'Web Clip')}</span>
      </div>
      {item.content.embed_html && (
        <div className="card-body" dangerouslySetInnerHTML={{ __html: item.content.embed_html }} />
      )}
      {item.content.url && (
        <div className="card-footer">
          <a href={escapeHtml(item.content.url)} target="_blank" rel="noopener" className="card-link" onClick={(e) => e.stopPropagation()}>↗</a>
        </div>
      )}
    </div>
  );
}

// ── Group Card ─────────────────────────────────────────────

function GroupCard({ item, isSelected, onSelect, onDragStart, children }) {
  return (
    <div
      className={`canvas-card card-group ${isSelected ? 'selected' : ''}`}
      data-id={item.id}
      data-type={item.type}
      style={{ left: item.x, top: item.y, width: item.width, minHeight: 200 }}
      onPointerDown={onDragStart}
      onClick={(e) => onSelect(e.ctrlKey || e.metaKey)}
    >
      <div className="card-header">
        <span className="card-handle">⠿</span>
        <span className="card-title">{escapeHtml(item.content.title || 'Group')}</span>
      </div>
      <div className="group-children">
        {children}
      </div>
    </div>
  );
}

// ── Stack Card (diagonal big-to-small cascade) ──────────────
//
// Closed state: layers offset diagonally up-and-right, each one revealing
// a sliver of the layer beneath it (corner-peek), largest card on the
// bottom. Open state ("fanned"): settles into a clean small grid so every
// card is fully readable, matching Stacks.mp4 / STACK_BIG_TO_SMALL.mp4.

const STACK_PEEK_OFFSET = 14; // px shift per layer, up + right
const STACK_GRID_GAP = 14;

function StackCard({ item, isSelected, onSelect, onDragStart }) {
  const [fanned, setFanned] = React.useState(item.meta?.fanned || false);
  const stackItems = item.meta?.stack_items || [];
  // Sort: widest at index 0 (bottom), narrowest at end (top)
  const sorted = [...stackItems].sort((a, b) => (b.width || 320) - (a.width || 320));
  const count = sorted.length;
  const topItem = sorted[count - 1] || {};
  const baseW = Math.min(topItem.width || 280, 280);
  const baseH = 180;

  // Closed-stack footprint must accommodate the cascading offset.
  const closedW = baseW + STACK_PEEK_OFFSET * (count - 1) + 24;
  const closedH = baseH + STACK_PEEK_OFFSET * (count - 1) + 24;

  // Fanned grid footprint: 2 columns.
  const fanCols = Math.min(2, count);
  const fanRows = Math.ceil(count / fanCols);
  const fanW = fanCols * baseW + (fanCols - 1) * STACK_GRID_GAP;
  const fanH = fanRows * baseH + (fanRows - 1) * STACK_GRID_GAP;

  const toggleFan = (e) => {
    e.stopPropagation();
    setFanned((f) => !f);
  };

  return (
    <div
      className={`canvas-card card-stack ${isSelected ? 'selected' : ''} ${fanned ? 'stack-fanned' : ''}`}
      data-id={item.id}
      data-type={item.type}
      style={{
        left: item.x,
        top: item.y,
        width: fanned ? fanW : closedW,
        height: fanned ? fanH : closedH,
        position: 'absolute',
        overflow: 'visible',
        transition: 'width 0.32s cubic-bezier(0.34,1.1,0.64,1), height 0.32s cubic-bezier(0.34,1.1,0.64,1)',
      }}
      onPointerDown={onDragStart}
      onClick={(e) => { onSelect(e.ctrlKey || e.metaKey); }}
    >
      {sorted.map((child, i) => {
        const isTop = i === count - 1;

        let layerStyle;
        if (fanned) {
          const col = i % fanCols;
          const row = Math.floor(i / fanCols);
          // Tiny per-card rotation jitter for the "scattered notes" feel
          // seen when Stacks.mp4 settles into its grid.
          const jitter = (i % 2 === 0 ? 1 : -1) * (1 + (i % 3));
          layerStyle = {
            transform: `translate(${col * (baseW + STACK_GRID_GAP)}px, ${row * (baseH + STACK_GRID_GAP)}px) rotate(${jitter}deg)`,
            transition: 'transform 0.32s cubic-bezier(0.34,1.1,0.64,1)',
            zIndex: i + 1,
            pointerEvents: 'auto',
          };
        } else {
          // Diagonal corner-peek cascade: the widest card (i=0) anchors at
          // the bottom-left of the closed-stack footprint; each layer above
          // it (higher i = narrower card) shifts further up + right, so the
          // smallest card ends up fully visible at the top-right, peeking
          // a sliver of every card beneath it — matching STACK_BIG_TO_SMALL.mp4.
          const ox = i * STACK_PEEK_OFFSET;
          const oy = (closedH - baseH) - i * STACK_PEEK_OFFSET;
          layerStyle = {
            transform: `translate(${ox}px, ${oy}px)`,
            transition: 'transform 0.32s cubic-bezier(0.34,1.1,0.64,1)',
            zIndex: i,
            pointerEvents: isTop ? 'auto' : 'none',
          };
        }

        return (
          <div
            key={i}
            className={`stack-layer ${isTop ? 'stack-layer-top' : 'stack-ghost'}`}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: baseW,
              height: baseH,
              ...(child.content?.image_url
                ? { backgroundImage: `url(${child.content.image_url})`, backgroundSize: 'cover', backgroundPosition: 'center' }
                : {}),
              ...layerStyle,
            }}
            onClick={fanned ? toggleFan : undefined}
          >
            {(!isTop || fanned) && (
              <div
                className="stack-ghost-thumb"
                style={child.content?.image_url
                  ? { backgroundImage: `url(${child.content.image_url})`, backgroundSize: 'cover', backgroundPosition: 'center', width: '100%', height: '100%' }
                  : {}}
              >
                {!child.content?.image_url && (
                  <span style={{ padding: '8px', fontSize: '10px', color: fanned ? 'var(--text-primary)' : 'rgba(255,255,255,0.35)', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {(child.content?.title || '').substring(0, 30)}
                  </span>
                )}
              </div>
            )}
            {isTop && !fanned && (
              <>
                <div className="stack-count-badge">{count}</div>
                <div className="stack-top-title">{topItem.content?.title || 'Stack'}</div>
                <div className="stack-hint" onClick={toggleFan} onPointerDown={(e) => e.stopPropagation()}>
                  Click to fan
                </div>
              </>
            )}
          </div>
        );
      })}

      {fanned && (
        <button
          className="stack-collapse-hint"
          onClick={toggleFan}
          onPointerDown={(e) => e.stopPropagation()}
          style={{
            position: 'absolute',
            top: `${fanH + 8}px`,
            left: 0,
            border: 'none',
            background: 'transparent',
            color: 'var(--text-disabled)',
            fontFamily: 'var(--font-ui)',
            fontSize: '9px',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            cursor: 'pointer',
            padding: 0,
          }}
        >
          Click any card to re-stack
        </button>
      )}
    </div>
  );
}

// ── Folder Card (literal folder-shaped icon) ────────────────
//
// Recreated from FOLDER_GROUPING_.mp4: a manila-folder silhouette (a
// rounded rect with a small notch cut from the top-right edge) with the
// editable Name + Description printed directly on its face. Clicking the
// face opens FolderViewModal (passed in as onOpen); dragging behaves like
// any other card.

function FolderCard({ item, isSelected, onSelect, onDragStart, onSave, onOpen }) {
  const [renaming, setRenaming] = React.useState(false);
  const [renameValue, setRenameValue] = React.useState(item.content?.title || 'Folder name');
  const childItems = item.meta?.child_items || [];
  const count = childItems.length;

  const handleRenameStart = (e) => {
    e.stopPropagation();
    setRenameValue(item.content?.title || 'Folder name');
    setRenaming(true);
  };

  const handleRenameSubmit = () => {
    const name = renameValue.trim() || 'Folder name';
    onSave?.({ content: { ...item.content, title: name } });
    setRenaming(false);
  };

  const handleRenameKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleRenameSubmit();
    } else if (e.key === 'Escape') {
      setRenaming(false);
    }
  };

  const handleOpen = (e) => {
    e.stopPropagation();
    onOpen?.(item.id);
  };

  // Visual "thickness" cue: a couple of stacked sheets peeking out behind
  // the folder body when it actually contains items (seen in the reference
  // capture — empty folders render perfectly flat).
  const thickness = Math.min(count, 3);

  return (
    <div
      className={`canvas-card card-folder-v2 ${isSelected ? 'selected' : ''}`}
      data-id={item.id}
      data-type={item.type}
      style={{
        left: item.x,
        top: item.y,
        width: item.width || 190,
        height: 240,
        position: 'absolute',
      }}
      onPointerDown={onDragStart}
      onClick={(e) => { onSelect(e.ctrlKey || e.metaKey); }}
      onDoubleClick={handleOpen}
    >
      {/* Sheets peeking out behind the folder, indicating contents */}
      {Array.from({ length: thickness }).map((_, i) => (
        <div
          key={i}
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '14px',
            background: 'var(--color-bg-raised)',
            border: '1px solid var(--color-border)',
            transform: `translate(${(i + 1) * 4}px, -${(i + 1) * 4}px)`,
            zIndex: -(i + 1),
          }}
        />
      ))}

      {/* Folder body — rounded rect with a notch cut from the top-right,
          mimicking a manila folder silhouette purely with CSS clip-path. */}
      <div
        onClick={handleOpen}
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          borderRadius: '14px',
          background: 'var(--color-bg-card)',
          border: isSelected ? '1px solid var(--color-border-focus)' : '1px solid var(--color-border)',
          boxShadow: isSelected
            ? '0 0 0 2px rgba(215,25,33,0.20), 0 8px 28px rgba(0,0,0,0.45)'
            : '0 6px 24px rgba(0,0,0,0.40)',
          clipPath: 'polygon(0 0, 72% 0, 80% 8%, 100% 8%, 100% 100%, 0 100%)',
          padding: '20px 18px',
          display: 'flex',
          flexDirection: 'column',
          cursor: 'pointer',
          transition: 'box-shadow 0.15s ease',
        }}
      >
        <FolderOpen size={18} weight="regular" style={{ color: 'var(--text-disabled)', flexShrink: 0, marginBottom: '14px' }} />

        {renaming ? (
          <input
            className="folder-rename-input"
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onBlur={handleRenameSubmit}
            onKeyDown={handleRenameKeyDown}
            autoFocus
            onClick={(e) => e.stopPropagation()}
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: '14px',
              fontWeight: 600,
              background: 'transparent',
              border: 'none',
              borderBottom: '1px solid var(--color-border-active)',
              outline: 'none',
              color: 'var(--text-primary)',
              padding: '0 0 2px',
              width: '100%',
              boxSizing: 'border-box',
            }}
          />
        ) : (
          <div
            onDoubleClick={handleRenameStart}
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: '14px',
              fontWeight: 600,
              color: 'var(--text-disabled)',
              marginBottom: '6px',
            }}
          >
            {item.content?.title || 'Folder name'}
          </div>
        )}

        <div
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: '12px',
            lineHeight: 1.5,
            color: 'var(--text-secondary)',
            flex: 1,
            overflow: 'hidden',
            display: '-webkit-box',
            WebkitLineClamp: 4,
            WebkitBoxOrient: 'vertical',
          }}
        >
          {item.content?.description || 'An archive of old notes to get out of view'}
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: '12px',
          }}
        >
          <span
            style={{
              fontFamily: 'var(--font-ui)',
              fontSize: '9px',
              letterSpacing: '0.08em',
              color: 'var(--text-disabled)',
              textTransform: 'uppercase',
            }}
          >
            Created {new Date(item.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </span>
          <span
            style={{
              fontFamily: 'var(--font-ui)',
              fontSize: '10px',
              color: 'var(--text-disabled)',
              background: 'var(--state-hover)',
              borderRadius: '8px',
              padding: '2px 7px',
              flexShrink: 0,
            }}
          >
            {count}
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Main CanvasCard ────────────────────────────────────────

export function CanvasCard({ item, isSelected, scale, onSelect, onDragStart, onSave, onDelete, onLightbox, onContextMenu, onOpenFolder }) {
  const handleContextMenu = useCallback((e) => {
    if (!onContextMenu) return;
    e.preventDefault();
    e.stopPropagation();
    onContextMenu(item, e.clientX, e.clientY);
  }, [item, onContextMenu]);

  // ── Long-press to open menu (mobile / touch) ──
  const longPressTimer = useRef(null);

  const clearLongPress = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const handleTouchStart = useCallback((e) => {
    if (!onContextMenu || e.touches.length !== 1) return;
    const touch = e.touches[0];
    clearLongPress();
    longPressTimer.current = setTimeout(() => {
      longPressTimer.current = null;
      onContextMenu(item, touch.clientX, touch.clientY);
      navigator.vibrate?.(10);
    }, 500);
  }, [item, onContextMenu, clearLongPress]);

  const handleKebab = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!onContextMenu) return;
    const r = e.currentTarget.getBoundingClientRect();
    onContextMenu(item, r.left + r.width / 2, r.top + r.height / 2);
  }, [item, onContextMenu]);

  // Clean up timer on unmount
  useEffect(() => clearLongPress, [clearLongPress]);

  let card;
  switch (item.type) {
    case ITEM_TYPES.BOOKMARK:
      card = <BookmarkCard item={item} isSelected={isSelected} onSelect={onSelect} onDragStart={onDragStart} onLightbox={onLightbox} />; break;
    case ITEM_TYPES.IMAGE:
      card = <ImageCard item={item} isSelected={isSelected} onSelect={onSelect} onDragStart={onDragStart} onLightbox={onLightbox} />; break;
    case ITEM_TYPES.NOTE:
      card = <NoteCard item={item} isSelected={isSelected} onSelect={onSelect} onDragStart={onDragStart} onSave={onSave} />; break;
    case ITEM_TYPES.WEB_CLIP:
      card = <WebClipCard item={item} isSelected={isSelected} onSelect={onSelect} onDragStart={onDragStart} />; break;
    case ITEM_TYPES.GROUP:
      card = <GroupCard item={item} isSelected={isSelected} onSelect={onSelect} onDragStart={onDragStart} />; break;
    case ITEM_TYPES.STACK:
      card = <StackCard item={item} isSelected={isSelected} onSelect={onSelect} onDragStart={onDragStart} />; break;
    case ITEM_TYPES.FOLDER:
      card = <FolderCard item={item} isSelected={isSelected} onSelect={onSelect} onDragStart={onDragStart} onSave={onSave} onOpen={onOpenFolder} />; break;
    case ITEM_TYPES.WEB_CLIP_SCREENSHOT:
      card = <WebClipScreenshotCard item={item} isSelected={isSelected} onSelect={onSelect} onDragStart={onDragStart} onSave={onSave} onDelete={onDelete} onLightbox={onLightbox} />; break;
    case ITEM_TYPES.AUDIO:
      card = <AudioMemoCard item={item} isSelected={isSelected} onSelect={onSelect} onDragStart={onDragStart} onSave={onSave} onDelete={onDelete} />; break;
    case ITEM_TYPES.PDF:
      card = <PDFViewerCard item={item} isSelected={isSelected} onSelect={onSelect} onDragStart={onDragStart} onSave={onSave} onDelete={onDelete} />; break;
    case ITEM_TYPES.VIDEO:
      card = <VideoCard item={item} isSelected={isSelected} onSelect={onSelect} onDragStart={onDragStart} onSave={onSave} onDelete={onDelete} onLightbox={onLightbox} />; break;
    default:
      card = <BookmarkCard item={item} isSelected={isSelected} onSelect={onSelect} onDragStart={onDragStart} onLightbox={onLightbox} />; break;
  }

  // Tags on this item
  const itemTags = item.meta?.tags || [];
  const handleTagsChange = useCallback((newTags) => {
    onSave?.({ meta: { tags: newTags } });
  }, [onSave]);

  return (
    <div
      onContextMenu={handleContextMenu}
      onTouchStart={handleTouchStart}
      onTouchMove={clearLongPress}
      onTouchEnd={clearLongPress}
      onTouchCancel={clearLongPress}
      style={{ display: 'contents' }}
    >
      {card}
      <TagEditor tags={itemTags} onChange={handleTagsChange} compact />

      {/* Kebab: opens the card menu on touch / always-visible-but-small.
          Positioned in the canvas coordinate space (the wrapper uses
          display:contents, so absolute children resolve against the
          canvas container — same space as the cards themselves). */}
      <button
        type="button"
        aria-label="Card actions"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={handleKebab}
        style={{
          position: 'absolute',
          left: (item.x + (item.width || 280)) - 34,
          top: item.y + 6,
          width: 44,
          height: 44,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: 'none',
          borderRadius: '50%',
          background: 'rgba(0,0,0,0.45)',
          color: '#fff',
          fontSize: '20px',
          lineHeight: 1,
          cursor: 'pointer',
          zIndex: 50,
          opacity: 0.55,
          backdropFilter: 'blur(6px)',
          WebkitBackdropFilter: 'blur(6px)',
          transition: 'opacity 0.15s ease',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; }}
        onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.55'; }}
      >⋯</button>
    </div>
  );
}
