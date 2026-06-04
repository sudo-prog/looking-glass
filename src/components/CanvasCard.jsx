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
    };
  }, [editing, editor, onSave]);

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

// ── Main CanvasCard ────────────────────────────────────────

export function CanvasCard({ item, isSelected, scale, onSelect, onDragStart, onSave, onDelete, onLightbox }) {
  switch (item.type) {
    case ITEM_TYPES.BOOKMARK:
      return <BookmarkCard item={item} isSelected={isSelected} onSelect={onSelect} onDragStart={onDragStart} onLightbox={onLightbox} />;
    case ITEM_TYPES.IMAGE:
      return <ImageCard item={item} isSelected={isSelected} onSelect={onSelect} onDragStart={onDragStart} onLightbox={onLightbox} />;
    case ITEM_TYPES.NOTE:
      return <NoteCard item={item} isSelected={isSelected} onSelect={onSelect} onDragStart={onDragStart} onSave={onSave} />;
    case ITEM_TYPES.WEB_CLIP:
      return <WebClipCard item={item} isSelected={isSelected} onSelect={onSelect} onDragStart={onDragStart} />;
    case ITEM_TYPES.GROUP:
      return <GroupCard item={item} isSelected={isSelected} onSelect={onSelect} onDragStart={onDragStart} />;
    default:
      return <BookmarkCard item={item} isSelected={isSelected} onSelect={onSelect} onDragStart={onDragStart} onLightbox={onLightbox} />;
  }
}
