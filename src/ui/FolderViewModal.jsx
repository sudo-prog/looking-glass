/**
 * LOOKING GLASS — Folder View Modal
 * Recreates the folder-expand overlay from FOLDER_GROUPING_.mp4:
 * clicking a folder opens a clean grid preview of its contents with a
 * "View all · N items" affordance, and each item can be dragged/clicked
 * back out onto the canvas (removeFromFolder) or the whole folder can be
 * emptied at once (unfolderToCanvas).
 *
 * Mount once near the top of App.jsx:
 *   {openFolderId && (
 *     <FolderViewModal
 *       folder={items.find(i => i.id === openFolderId)}
 *       onClose={() => setOpenFolderId(null)}
 *       onRemoveItem={(childId) => removeFromFolder(openFolderId, childId)}
 *       onEmptyAll={() => { unfolderToCanvas(openFolderId); setOpenFolderId(null); }}
 *       onRename={(name) => renameFolder(openFolderId, name)}
 *       onDescription={(desc) => updateFolderDescription(openFolderId, desc)}
 *     />
 *   )}
 */
import React, { useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  FolderOpen,
  X,
  ArrowUpRight,
  Bookmark as BookmarkIcon,
  NotePencil,
  Image as ImageIcon,
  FilmStrip,
  File as FileIcon,
  LinkSimple,
} from '@phosphor-icons/react';

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function TypeIcon({ type, size = 22 }) {
  switch (type) {
    case 'bookmark': return <BookmarkIcon size={size} weight="regular" />;
    case 'note': return <NotePencil size={size} weight="regular" />;
    case 'image': return <ImageIcon size={size} weight="regular" />;
    case 'video': return <FilmStrip size={size} weight="regular" />;
    case 'pdf': return <FileIcon size={size} weight="regular" />;
    case 'web_clip':
    case 'web_clip_screenshot': return <LinkSimple size={size} weight="regular" />;
    default: return <FileIcon size={size} weight="regular" />;
  }
}

function FolderPreviewTile({ child, onRemove }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'relative',
        borderRadius: '12px',
        overflow: 'hidden',
        background: 'var(--color-bg-card)',
        border: '1px solid var(--color-border)',
        minHeight: '160px',
        display: 'flex',
        flexDirection: 'column',
        cursor: 'grab',
        transition: 'border-color 0.15s ease, transform 0.15s ease',
        transform: hovered ? 'translateY(-2px)' : 'none',
      }}
    >
      {child.content?.image_url ? (
        <img
          src={escapeHtml(child.content.image_url)}
          alt=""
          loading="lazy"
          style={{ width: '100%', height: '120px', objectFit: 'cover', display: 'block' }}
        />
      ) : (
        <div
          style={{
            height: '120px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-disabled)',
            background: 'var(--state-hover)',
          }}
        >
          <TypeIcon type={child.type} />
        </div>
      )}

      <div style={{ padding: '10px 12px', flex: 1 }}>
        <div
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: '12px',
            fontWeight: 500,
            color: 'var(--text-primary)',
            overflow: 'hidden',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
          }}
        >
          {escapeHtml(child.content?.title || child.content?.url || 'Untitled')}
        </div>
      </div>

      {/* Pull back to canvas */}
      <button
        onClick={() => onRemove(child.id)}
        title="Move to canvas"
        aria-label="Move to canvas"
        style={{
          position: 'absolute',
          top: '8px',
          right: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '26px',
          height: '26px',
          borderRadius: '7px',
          border: '1px solid rgba(255,255,255,0.15)',
          background: 'rgba(0,0,0,0.55)',
          color: 'rgba(255,255,255,0.85)',
          cursor: 'pointer',
          opacity: hovered ? 1 : 0,
          transition: 'opacity 0.12s ease',
          backdropFilter: 'blur(8px)',
        }}
      >
        <ArrowUpRight size={13} weight="regular" />
      </button>
    </div>
  );
}

export function FolderViewModal({ folder, onClose, onRemoveItem, onEmptyAll, onRename, onDescription }) {
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(folder?.content?.title || 'Folder name');
  const [editingDesc, setEditingDesc] = useState(false);
  const [descValue, setDescValue] = useState(folder?.content?.description || '');

  const commitName = useCallback(() => {
    const trimmed = nameValue.trim() || 'Folder name';
    onRename?.(trimmed);
    setEditingName(false);
  }, [nameValue, onRename]);

  const commitDesc = useCallback(() => {
    onDescription?.(descValue.trim());
    setEditingDesc(false);
  }, [descValue, onDescription]);

  if (!folder) return null;
  const children = folder.meta?.child_items || [];

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Folder: ${folder.content?.title || 'Folder'}`}
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 'var(--z-modal)',
        background: 'rgba(0,0,0,0.55)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 'min(820px, 100%)',
          maxHeight: '84vh',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: '20px',
          background: 'rgba(16,16,16,0.97)',
          backdropFilter: 'blur(40px) saturate(120%)',
          WebkitBackdropFilter: 'blur(40px) saturate(120%)',
          border: '1px solid rgba(255,255,255,0.10)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.10), 0 32px 80px rgba(0,0,0,0.70)',
          overflow: 'hidden',
          animation: 'folder-modal-in 0.20s cubic-bezier(0.34,1.2,0.64,1) both',
        }}
      >
        <style>{`
          @keyframes folder-modal-in {
            from { opacity: 0; transform: scale(0.96) translateY(10px); }
            to   { opacity: 1; transform: scale(1)    translateY(0); }
          }
        `}</style>

        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: '16px',
            padding: '20px 24px',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', flex: 1, minWidth: 0 }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '9px',
                background: 'rgba(215,25,33,0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--color-accent)',
                flexShrink: 0,
              }}
            >
              <FolderOpen size={18} weight="regular" />
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              {editingName ? (
                <input
                  autoFocus
                  value={nameValue}
                  onChange={(e) => setNameValue(e.target.value)}
                  onBlur={commitName}
                  onKeyDown={(e) => { if (e.key === 'Enter') commitName(); if (e.key === 'Escape') setEditingName(false); }}
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: '16px',
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                    background: 'transparent',
                    border: 'none',
                    borderBottom: '1px solid var(--color-border-active)',
                    outline: 'none',
                    width: '100%',
                    padding: '2px 0',
                  }}
                />
              ) : (
                <div
                  onDoubleClick={() => setEditingName(true)}
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: '16px',
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                    cursor: 'text',
                  }}
                >
                  {folder.content?.title || 'Folder name'}
                </div>
              )}

              {editingDesc ? (
                <input
                  autoFocus
                  value={descValue}
                  onChange={(e) => setDescValue(e.target.value)}
                  onBlur={commitDesc}
                  onKeyDown={(e) => { if (e.key === 'Enter') commitDesc(); if (e.key === 'Escape') setEditingDesc(false); }}
                  placeholder="Add a description…"
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: '12px',
                    color: 'var(--text-secondary)',
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    width: '100%',
                    marginTop: '4px',
                  }}
                />
              ) : (
                <div
                  onDoubleClick={() => setEditingDesc(true)}
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: '12px',
                    color: folder.content?.description ? 'var(--text-secondary)' : 'var(--text-disabled)',
                    marginTop: '4px',
                    cursor: 'text',
                  }}
                >
                  {folder.content?.description || 'Add a description…'}
                </div>
              )}
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Close folder"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '30px',
              height: '30px',
              borderRadius: '8px',
              border: 'none',
              background: 'transparent',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            <X size={16} weight="regular" />
          </button>
        </div>

        {/* Grid */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
          {children.length === 0 ? (
            <div
              style={{
                padding: '48px 0',
                textAlign: 'center',
                fontFamily: 'var(--font-ui)',
                fontSize: '11px',
                letterSpacing: '0.08em',
                color: 'var(--text-disabled)',
                textTransform: 'uppercase',
              }}
            >
              Empty folder
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
                gap: '12px',
              }}
            >
              {children.map((child) => (
                <FolderPreviewTile key={child.id} child={child} onRemove={onRemoveItem} />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 24px',
            borderTop: '1px solid rgba(255,255,255,0.08)',
            flexShrink: 0,
          }}
        >
          <span
            style={{
              fontFamily: 'var(--font-ui)',
              fontSize: '10px',
              letterSpacing: '0.10em',
              color: 'var(--text-disabled)',
              textTransform: 'uppercase',
            }}
          >
            View all · {children.length} item{children.length !== 1 ? 's' : ''}
          </span>

          <button
            onClick={onEmptyAll}
            disabled={children.length === 0}
            style={{
              height: '32px',
              padding: '0 14px',
              borderRadius: '8px',
              border: '1px solid var(--color-border)',
              background: 'transparent',
              color: children.length === 0 ? 'var(--text-disabled)' : 'var(--text-secondary)',
              fontFamily: 'var(--font-ui)',
              fontSize: '10px',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              cursor: children.length === 0 ? 'default' : 'pointer',
            }}
          >
            Empty onto canvas
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export default FolderViewModal;
