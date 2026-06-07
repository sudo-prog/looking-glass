/**
 * LOOKING GLASS — FolderCard Component
 * Folder entity with expand/collapse, thumbnail previews, inline rename.
 */
import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { Folder as FolderIcon, FolderOpen, CaretDown, CaretUp, Bookmark as BookmarkIcon, NotePencil, Image, FilmStrip, File, LinkSimple } from '@phosphor-icons/react';

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function TypeIcon({ type, size = 14 }) {
  switch (type) {
    case 'bookmark': return <BookmarkIcon size={size} weight="regular" />;
    case 'note': return <NotePencil size={size} weight="regular" />;
    case 'image': return <Image size={size} weight="regular" />;
    case 'video': return <FilmStrip size={size} weight="regular" />;
    case 'pdf': return <File size={size} weight="regular" />;
    case 'web_clip': return <LinkSimple size={size} weight="regular" />;
    default: return <File size={size} weight="regular" />;
  }
}

export function FolderCard({ item, isSelected, onSelect, onDragStart, onToggleOpen, onRename, allItems = [] }) {
  const [collapsed, setCollapsed] = useState(item.meta?.collapsed !== false);
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(item.content?.title || 'Folder');
  const renameInputRef = useRef(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(`folder_open_${item.id}`);
      if (stored !== null) setCollapsed(stored === 'false' ? false : true);
    } catch { /* ignore */ }
  }, [item.id]);

  const childIds = item.content?.itemIds || [];
  const childItems = useMemo(() => {
    return childIds.map((id) => allItems.find((i) => i.id === id)).filter(Boolean);
  }, [childIds, allItems]);

  const thumbnails = childItems.slice(0, 4);

  const handleToggleCollapse = useCallback((e) => {
    e.stopPropagation();
    const newCollapsed = !collapsed;
    setCollapsed(newCollapsed);
    try { localStorage.setItem(`folder_open_${item.id}`, String(!newCollapsed)); } catch { /* */ }
    onToggleOpen?.(item.id);
  }, [collapsed, item.id, onToggleOpen]);

  const handleDoubleClick = useCallback((e) => {
    e.stopPropagation();
    setRenaming(true);
    setRenameValue(item.content?.title || 'Folder');
  }, [item.content?.title]);

  useEffect(() => {
    if (renaming && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [renaming]);

  const commitRename = useCallback(() => {
    const trimmed = renameValue.trim();
    if (trimmed && trimmed !== item.content?.title) {
      onRename?.(item.id, trimmed);
    }
    setRenaming(false);
  }, [renameValue, item.id, item.content?.title, onRename]);

  const handleRenameKeyDown = useCallback((e) => {
    if (e.key === 'Enter') commitRename();
    else if (e.key === 'Escape') setRenaming(false);
  }, [commitRename]);

  return (
    <div
      className={`canvas-card card-folder ${isSelected ? 'selected' : ''}`}
      data-id={item.id}
      data-type={item.type}
      style={{
        left: item.x,
        top: item.y,
        width: item.width || 340,
        minHeight: collapsed ? 120 : 200,
      }}
      onPointerDown={onDragStart}
      onClick={(e) => { e.stopPropagation(); onSelect(e.ctrlKey || e.metaKey); }}
    >
      {/* Folder tab */}
      <div className="folder-tab" onClick={handleToggleCollapse} role="button"
        aria-expanded={!collapsed}
        style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          padding: '8px 12px', cursor: 'pointer',
          background: 'rgba(215,25,33,0.08)',
          borderBottom: '1px solid var(--color-border)',
        }}>
        {collapsed
          ? <FolderIcon size={14} weight="regular" style={{ color: 'var(--color-accent)', flexShrink: 0 }} />
          : <FolderOpen size={14} weight="regular" style={{ color: 'var(--color-accent)', flexShrink: 0 }} />
        }
        {renaming ? (
          <input ref={renameInputRef} value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onBlur={commitRename} onKeyDown={handleRenameKeyDown}
            onClick={(e) => e.stopPropagation()}
            style={{
              fontFamily: "'Space Grotesk', sans-serif", fontSize: '13px',
              color: 'var(--text-primary)', fontWeight: 600,
              background: 'transparent', border: 'none',
              borderBottom: '1px solid var(--color-border-active)',
              outline: 'none', padding: '2px 0', width: '100%',
            }}
          />
        ) : (
          <span className="card-title" onDoubleClick={handleDoubleClick}
            style={{
              fontFamily: "'Space Grotesk', sans-serif", fontSize: '13px',
              color: 'var(--text-primary)', fontWeight: 600,
              flex: 1, overflow: 'hidden', textOverflow: 'ellipsis',
              whiteSpace: 'nowrap', cursor: 'text',
            }}>
            {escapeHtml(item.content?.title || 'Folder')}
          </span>
        )}
        <span style={{
          fontFamily: "'Space Mono', monospace", fontSize: '10px',
          color: 'var(--text-secondary)', flexShrink: 0,
        }}>{childIds.length}</span>
        <span style={{ color: 'var(--text-secondary)', flexShrink: 0, display: 'flex' }}>
          {collapsed ? <CaretDown size={12} weight="regular" /> : <CaretUp size={12} weight="regular" />}
        </span>
      </div>

      {/* Folder body */}
      <div className="folder-body" style={{ padding: '10px 12px', minHeight: collapsed ? 60 : 40 }}>
        {collapsed ? (
          <div className="folder-thumbnails" style={{ display: 'flex', alignItems: 'center', minHeight: 48 }}>
            {thumbnails.length > 0 ? (
              thumbnails.map((child, idx) => (
                <div key={child.id} className="folder-thumb"
                  style={{
                    width: 56, height: 48, borderRadius: 6,
                    background: 'var(--color-bg-overlay, #222)',
                    border: '1px solid var(--color-border)',
                    transform: `rotate(${(idx % 2 === 0 ? 1 : -1) * (2 + idx)}deg)`,
                    overflow: 'hidden', flexShrink: 0,
                    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                    marginLeft: idx > 0 ? -18 : 0,
                  }}>
                  {child.content?.image_url ? (
                    <img src={escapeHtml(child.content.image_url)} alt="" loading="lazy"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      width: '100%', height: '100%', color: 'var(--text-disabled)',
                    }}>
                      <TypeIcon type={child.type} size={16} />
                    </div>
                  )}
                </div>
              ))
            ) : (
              <span style={{
                fontFamily: "'Space Mono', monospace", fontSize: 10,
                color: 'var(--text-disabled)', letterSpacing: '0.12em',
              }}>Empty folder</span>
            )}
          </div>
        ) : (
          <div className="folder-contents" style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {childItems.length > 0 ? (
              childItems.map((child) => (
                <div key={child.id} className="folder-content-item" role="button" tabIndex={0}
                  onClick={(e) => { e.stopPropagation(); onSelect(false); }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '6px 8px', borderRadius: 6, cursor: 'pointer',
                    transition: 'background 120ms',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--state-hover)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}>
                  <span style={{ color: 'var(--text-secondary)', flexShrink: 0, display: 'flex' }}>
                    <TypeIcon type={child.type} size={14} />
                  </span>
                  <span style={{
                    fontFamily: "'Space Grotesk', sans-serif", fontSize: 12,
                    color: 'var(--text-primary)', overflow: 'hidden',
                    textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1,
                  }}>{escapeHtml(child.content?.title || 'Untitled')}</span>
                </div>
              ))
            ) : (
              <span style={{
                fontFamily: "'Space Mono', monospace", fontSize: 10,
                color: 'var(--text-disabled)', letterSpacing: '0.12em', padding: '8px 0',
              }}>Folder is empty</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default FolderCard;
