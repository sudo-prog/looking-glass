/**
 * LOOKING GLASS — Canvas Card Component (React)
 * Renders different card types. Notes use Tiptap rich text editor.
 */
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import { ITEM_TYPES } from '../data/schema.js';
import { VideoCard } from './VideoCard.jsx';
import { AudioMemoCard } from './AudioMemoCard.jsx';
import { PDFViewerCard } from './PDFViewerCard.jsx';
import { WebClipScreenshotCard } from './WebClipScreenshotCard.jsx';

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

// ── Note Card (Rich Text with Tiptap) ──────────────────────

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
      if (saveTimeout.current) {
        clearTimeout(saveTimeout.current);
        saveTimeout.current = null;
      }
    };
  }, [editing, editor, onSave]);

  // BUG FIX: destroy editor and clear timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
      editor?.destroy();
    };
  }, [editor]);

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
      <div className={`card-note-editor ${editing ? 'focused' : ''}`}>
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

function GroupCard({ item, isSelected, onSelect, onDragStart }) {
  const children = item.meta?.child_items || [];
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
      {children.length > 0 && (
        <div className="group-children" style={{ fontSize: 11, padding: '4px 8px', opacity: 0.6 }}>
          {children.length} item{children.length !== 1 ? 's' : ''}
        </div>
      )}
    </div>
  );
}

// ── Stack Card ─────────────────────────────────────────────

function StackCard({ item, isSelected, onSelect, onDragStart }) {
  const [fanned, setFanned] = React.useState(item.meta?.fanned || false);
  const stackItems = item.meta?.stack_items || [];
  // Sort: widest at index 0 (bottom), narrowest at end (top)
  const sorted = [...stackItems].sort((a, b) => (b.width || 320) - (a.width || 320));
  const count = sorted.length;
  const topItem = sorted[count - 1] || {};
  const baseW = Math.min(topItem.width || 280, 280);
  const baseH = 180;

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
        width: baseW + 24,
        height: baseH + 32,
        position: 'absolute',
        overflow: 'visible',
      }}
      onPointerDown={onDragStart}
      onClick={(e) => { onSelect(e.ctrlKey || e.metaKey); }}
    >
      {sorted.map((child, i) => {
        const isTop = i === count - 1;
        const depthFactor = (count - 1 - i) / Math.max(count - 1, 1);

        let layerStyle;
        if (fanned) {
          const offset = (i - (count - 1)) * 192;
          const rot = (i - (count - 1)) * 5;
          layerStyle = {
            transform: `translateX(${offset}px) rotate(${rot}deg)`,
            transition: 'transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)',
            zIndex: i + 1,
            pointerEvents: 'auto',
          };
        } else {
          const scale = 1 + depthFactor * 0.08;
          const rot = (i % 2 === 0 ? 1 : -1) * depthFactor * 4;
          const ox = (i % 2 === 0 ? -1 : 1) * depthFactor * 6;
          const oy = depthFactor * 4;
          layerStyle = isTop
            ? { transform: 'none', zIndex: count, pointerEvents: 'auto', transition: 'transform 0.3s ease' }
            : {
                transform: `translate(${ox}px, ${oy}px) rotate(${rot}deg) scale(${scale})`,
                zIndex: i,
                pointerEvents: 'none',
                transition: 'transform 0.3s ease',
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
              ...(child.content?.image_url && isTop
                ? { backgroundImage: `url(${child.content.image_url})`, backgroundSize: 'cover', backgroundPosition: 'center' }
                : {}),
              ...layerStyle,
            }}
            onClick={fanned ? toggleFan : undefined}
          >
            {!isTop && (
              <div
                className="stack-ghost-thumb"
                style={child.content?.image_url
                  ? { backgroundImage: `url(${child.content.image_url})`, backgroundSize: 'cover', backgroundPosition: 'center', width: '100%', height: '100%' }
                  : {}}
              >
                {!child.content?.image_url && (
                  <span style={{ padding: '8px', fontSize: '10px', color: 'rgba(255,255,255,0.35)', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {(child.content?.title || '').substring(0, 30)}
                  </span>
                )}
              </div>
            )}
            {isTop && (
              <>
                <div className="stack-count-badge">{count}</div>
                <div className="stack-top-title">{topItem.content?.title || 'Stack'}</div>
                <div className="stack-hint" onClick={toggleFan} onPointerDown={(e) => e.stopPropagation()}>
                  {fanned ? 'Click to stack' : 'Click to fan'}
                </div>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Folder Card ────────────────────────────────────────────

function FolderCard({ item, isSelected, onSelect, onDragStart, onSave }) {
  const [open, setOpen] = React.useState(item.meta?.folder_open || false);
  const [renaming, setRenaming] = React.useState(false);
  const [renameValue, setRenameValue] = React.useState(item.content?.title || 'Folder');
  const childItems = item.meta?.child_items || [];
  const count = childItems.length;

  const toggleOpen = (e) => {
    e.stopPropagation();
    const newOpen = !open;
    setOpen(newOpen);
    onSave?.({ meta: { ...item.meta, folder_open: newOpen } });
  };

  const handleRenameStart = (e) => {
    e.stopPropagation();
    setRenameValue(item.content?.title || 'Folder');
    setRenaming(true);
  };

  const handleRenameSubmit = () => {
    const name = renameValue.trim() || 'Folder';
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

  const typeIcon = (type) => ({
    bookmark: '🔖', web_clip: '🔗', note: '📝', image: '🖼',
    group: '⊞', stack: '🗂', folder: '📁',
  }[type] || '•');

  // Thumbnail stack (up to 4)
  const thumbs = childItems.slice(0, 4);

  return (
    <div
      className={`canvas-card card-folder ${isSelected ? 'selected' : ''} ${open ? 'folder-open' : ''}`}
      data-id={item.id}
      data-type={item.type}
      style={{ left: item.x, top: item.y, width: item.width || 220, position: 'absolute' }}
      onPointerDown={onDragStart}
      onClick={(e) => onSelect(e.ctrlKey || e.metaKey)}
    >
      <div className="folder-shell">
        {/* Tab row */}
        <div className="folder-tab" onClick={toggleOpen}>
          <span className="folder-icon">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M1 3.5C1 2.67 1.67 2 2.5 2H5.5L7 3.5H11.5C12.33 3.5 13 4.17 13 5V10.5C13 11.33 12.33 12 11.5 12H2.5C1.67 12 1 11.33 1 10.5V3.5Z" fill="currentColor" opacity="0.7"/>
            </svg>
          </span>
          <span className="folder-name" onDoubleClick={handleRenameStart}>
            {renaming ? (
              <input
                className="folder-rename-input"
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onBlur={handleRenameSubmit}
                onKeyDown={handleRenameKeyDown}
                autoFocus
                onClick={(e) => e.stopPropagation()}
                style={{ fontSize: 'inherit', background: 'transparent', border: '1px solid rgba(128,128,128,0.5)', borderRadius: 3, padding: '0 2px', color: 'inherit', width: '80%', boxSizing: 'border-box' }}
              />
            ) : (
              item.content?.title || 'Folder'
            )}
          </span>
          <span className="folder-count">{count}</span>
          <span className="folder-chevron">{open ? '▾' : '▸'}</span>
        </div>

        {/* Collapsed: thumbnail stack */}
        {!open && (
          <div className="folder-preview">
            {count === 0 ? (
              <div className="folder-empty">Drop cards here</div>
            ) : (
              thumbs.map((child, i) => {
                const offset = i * 4;
                const rot = (i % 2 === 0 ? 1 : -1) * (i * 1.5);
                return (
                  <div
                    key={i}
                    className="folder-thumb"
                    style={{
                      transform: `translate(${-offset}px, ${-offset * 0.5}px) rotate(${rot}deg)`,
                      zIndex: thumbs.length - i,
                      ...(child.content?.image_url
                        ? { backgroundImage: `url(${child.content.image_url})`, backgroundSize: 'cover', backgroundPosition: 'center' }
                        : {}),
                    }}
                  >
                    {!child.content?.image_url && (
                      <span className="folder-thumb-label">
                        {(child.content?.title || '').substring(0, 20)}
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Expanded: contents list */}
        {open && (
          <div className="folder-contents">
            {count === 0 ? (
              <p className="folder-empty-msg">Empty folder</p>
            ) : (
              <div className="folder-items-list">
                {childItems.map((child) => (
                  <div key={child.id} className="folder-item-row">
                    <span className="folder-item-icon">{typeIcon(child.type)}</span>
                    <span className="folder-item-title">{child.content?.title || 'Untitled'}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main CanvasCard ────────────────────────────────────────

export function CanvasCard({ item, isSelected, scale, onSelect, onDragStart, onSave, onDelete, onLightbox, onContextMenu }) {
  const handleContextMenu = useCallback((e) => {
    if (!onContextMenu) return;
    e.preventDefault();
    e.stopPropagation();
    onContextMenu(item, e.clientX, e.clientY);
  }, [item, onContextMenu]);

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
      card = <FolderCard item={item} isSelected={isSelected} onSelect={onSelect} onDragStart={onDragStart} onSave={onSave} />; break;
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

  return (
    <div onContextMenu={handleContextMenu} style={{ display: 'contents' }}>
      {card}
    </div>
  );
}
