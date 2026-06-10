/**
 * LOOKING GLASS — Bookmarks Panel
 * Displays saved bookmarks and provides Import Bookmarks feature.
 * Import sources: Twitter/X bookmarks (via URL), Browser bookmarks (HTML export).
 */
import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  BookmarkSimple,
  X,
  Upload,
  FileHtml,
  LinkSimple,
  Trash,
  ArrowSquareOut,
  MagnifyingGlass,
  Globe,
  FolderOpen,
} from '@phosphor-icons/react';
import { useStore } from '../store/useStore.js';
import { ITEM_TYPES } from '../data/schema.js';

/**
 * Parse Netscape Bookmark File Format (browser bookmark HTML export).
 * Works with exports from Chrome, Firefox, Safari, Edge.
 */
function parseBrowserBookmarksHTML(html) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const bookmarks = [];

  function walk(element) {
    for (const child of element.children) {
      if (child.tagName === 'A' && child.hasAttribute('href')) {
        const href = child.getAttribute('href');
        if (href && (href.startsWith('http://') || href.startsWith('https://'))) {
          bookmarks.push({
            url: href,
            title: child.textContent?.trim() || href,
            addedDate: child.getAttribute('add_date')
              ? parseInt(child.getAttribute('add_date')) * 1000
              : Date.now(),
          });
        }
      }
      if (child.children.length > 0) {
        walk(child);
      }
    }
  }

  const dlElements = doc.querySelectorAll('dl');
  dlElements.forEach(dl => walk(dl));

  // Fallback: also check all <a> tags if no <dl> found
  if (bookmarks.length === 0) {
    const allLinks = doc.querySelectorAll('a[href]');
    allLinks.forEach(a => {
      const href = a.getAttribute('href');
      if (href && (href.startsWith('http://') || href.startsWith('https://'))) {
        bookmarks.push({
          url: href,
          title: a.textContent?.trim() || href,
          addedDate: Date.now(),
        });
      }
    });
  }

  return bookmarks;
}

export function BookmarksPanel({ isOpen, onClose }) {
  const { items, addItem, canvasId, viewport } = useStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [twitterUrl, setTwitterUrl] = useState('');
  const fileInputRef = useRef(null);

  // Get all bookmark items
  const bookmarks = items.filter(
    i => i.type === ITEM_TYPES.BOOKMARK || i.type === ITEM_TYPES.WEB_CLIP || i.type === ITEM_TYPES.WEB_CLIP_SCREENSHOT
  );

  // Filter by search
  const filtered = searchQuery
    ? bookmarks.filter(b =>
        (b.content?.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (b.content?.url || '').toLowerCase().includes(searchQuery.toLowerCase())
      )
    : bookmarks;

  // Import from browser HTML file
  const handleBrowserImport = useCallback(async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setImportResult(null);

    try {
      const text = await file.text();
      const parsed = parseBrowserBookmarksHTML(text);

      if (parsed.length === 0) {
        setImportResult({ success: false, message: 'No bookmarks found in file. Make sure it\'s a browser bookmark export (HTML format).' });
        setImporting(false);
        return;
      }

      let imported = 0;
      const vp = useStore.getState().viewport;
      const existingUrls = new Set(
        useStore.getState().items.map(i => i.content?.url).filter(Boolean)
      );

      for (const bm of parsed) {
        if (existingUrls.has(bm.url)) continue; // Skip duplicates

        await addItem({
          type: ITEM_TYPES.BOOKMARK,
          x: (-vp.x + 200 + Math.random() * 600) / vp.scale,
          y: (-vp.y + 200 + Math.random() * 400) / vp.scale,
          width: 280,
          content: {
            title: bm.title,
            url: bm.url,
            description: '',
            image_url: null,
          },
          meta: {
            source: 'browser_import',
            tags: [],
            imported_at: Date.now(),
          },
        });
        imported++;
      }

      setImportResult({
        success: true,
        message: `Imported ${imported} bookmarks from ${parsed.length} found (${parsed.length - imported} duplicates skipped).`,
      });
    } catch (err) {
      setImportResult({ success: false, message: `Import failed: ${err.message}` });
    }

    setImporting(false);
    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [addItem]);

  // Import Twitter/X bookmark URL
  const handleTwitterImport = useCallback(async () => {
    if (!twitterUrl.trim()) return;

    setImporting(true);
    setImportResult(null);

    try {
      // Normalize Twitter URL
      let url = twitterUrl.trim();
      if (!url.startsWith('http')) {
        url = 'https://x.com' + (url.startsWith('/') ? url : '/' + url);
      }

      // Add it as a web clip / bookmark card
      const vp = useStore.getState().viewport;
      await addItem({
        type: ITEM_TYPES.BOOKMARK,
        x: (-vp.x + 400) / vp.scale,
        y: (-vp.y + 300) / vp.scale,
        width: 280,
        content: {
          title: url.includes('x.com') ? 'X/Twitter Bookmark' : 'Twitter Bookmark',
          url: url,
          description: 'Imported from Twitter/X',
          image_url: null,
        },
        meta: {
          source: 'twitter_import',
          tags: ['twitter'],
          imported_at: Date.now(),
        },
      });

      setImportResult({ success: true, message: 'Twitter bookmark link added. Open it in browser to view and save individual tweets.' });
      setTwitterUrl('');
    } catch (err) {
      setImportResult({ success: false, message: `Import failed: ${err.message}` });
    }

    setImporting(false);
  }, [twitterUrl, addItem]);

  // Add bookmark manually (paste URL)
  const handleAddManual = useCallback(async (url) => {
    if (!url.trim()) return;
    let finalUrl = url.trim();
    if (!finalUrl.startsWith('http')) finalUrl = 'https://' + finalUrl;

    const vp = useStore.getState().viewport;
    await addItem({
      type: ITEM_TYPES.BOOKMARK,
      x: (-vp.x + 400 + Math.random() * 200) / vp.scale,
      y: (-vp.y + 300 + Math.random() * 200) / vp.scale,
      width: 280,
      content: {
        title: finalUrl,
        url: finalUrl,
        description: '',
        image_url: null,
      },
      meta: { source: 'manual', tags: [] },
    });
  }, [addItem]);

  // Delete a bookmark
  const handleDelete = useCallback(async (id) => {
    await useStore.getState().deleteItem(id);
  }, []);

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0,
          zIndex: 'calc(var(--z-dropdown) - 1)',
          background: 'rgba(0,0,0,0.40)',
          animation: 'ctx-appear 0.15s ease both',
        }}
      />

      <style>{`@keyframes lg-bookmarks-slide { from { transform: translateX(-100%); } to { transform: translateX(0); } }`}</style>

      {/* Panel */}
      <div
        role="dialog"
        aria-label="Bookmarks"
        style={{
          position: 'fixed',
          top: 0, left: 0, bottom: 0,
          width: 'min(420px, 90vw)',
          zIndex: 'var(--z-dropdown)',
          background: 'var(--glass-frost)',
          backdropFilter: 'blur(32px) saturate(120%)',
          WebkitBackdropFilter: 'blur(32px) saturate(120%)',
          borderRight: '1px solid var(--color-border)',
          boxShadow: '8px 0 48px var(--glass-cast-shadow)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          animation: 'lg-bookmarks-slide 0.25s cubic-bezier(0.32,0.72,0,1) both',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <BookmarkSimple size={18} weight="regular" style={{ color: 'var(--text-primary)' }} />
            <span style={{
              fontFamily: 'var(--font-ui)', fontSize: '13px', fontWeight: 600,
              color: 'var(--text-primary)', letterSpacing: '0.08em',
            }}>BOOKMARKS</span>
            <span style={{
              fontFamily: 'var(--font-ui)', fontSize: '11px',
              color: 'var(--text-disabled)',
              background: 'rgba(255,255,255,0.06)',
              padding: '2px 8px', borderRadius: '10px',
            }}>{bookmarks.length}</span>
          </div>
          <button
            onClick={onClose}
            aria-label="Close bookmarks"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: '28px', height: '28px', borderRadius: '8px',
              border: 'none', background: 'transparent',
              color: 'var(--text-secondary)', cursor: 'pointer',
            }}
          >
            <X size={16} weight="regular" />
          </button>
        </div>

        {/* Import Section */}
        <div style={{
          padding: '12px 20px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          flexShrink: 0,
        }}>
          <div style={{
            fontFamily: 'var(--font-ui)', fontSize: '10px', fontWeight: 600,
            color: 'var(--text-disabled)', letterSpacing: '0.12em',
            marginBottom: '8px',
          }}>IMPORT BOOKMARKS</div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {/* Browser bookmarks import */}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={importing}
              style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '10px 14px', borderRadius: '10px',
                border: '1px dashed rgba(139,92,246,0.30)',
                background: 'rgba(139,92,246,0.06)',
                color: 'var(--text-primary)',
                cursor: importing ? 'wait' : 'pointer',
                fontFamily: 'var(--font-ui)', fontSize: '12px',
                textAlign: 'left',
                transition: 'all 0.15s ease',
              }}
            >
              <FolderOpen size={18} weight="regular" style={{ color: '#8B5CF6', flexShrink: 0 }} />
              <div>
                <div style={{ fontWeight: 500 }}>Browser Bookmarks</div>
                <div style={{ fontSize: '10px', color: 'var(--text-disabled)', marginTop: '2px' }}>
                  Import from Chrome, Firefox, Safari, Edge (HTML export)
                </div>
              </div>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".html,.htm"
              onChange={handleBrowserImport}
              style={{ display: 'none' }}
            />

            {/* Twitter bookmark import */}
            <div style={{ display: 'flex', gap: '6px' }}>
              <div style={{
                flex: 1, display: 'flex', alignItems: 'center', gap: '8px',
                padding: '8px 12px', borderRadius: '10px',
                border: '1px solid rgba(255,255,255,0.08)',
                background: 'rgba(255,255,255,0.03)',
              }}>
                <Globe size={14} style={{ color: '#1DA1F2', flexShrink: 0 }} />
                <input
                  type="text"
                  value={twitterUrl}
                  onChange={e => setTwitterUrl(e.target.value)}
                  placeholder="Paste X/Twitter bookmark URL..."
                  onKeyDown={e => e.key === 'Enter' && handleTwitterImport()}
                  style={{
                    flex: 1, border: 'none', background: 'transparent',
                    color: 'var(--text-primary)',
                    fontFamily: 'var(--font-ui)', fontSize: '12px',
                    outline: 'none',
                  }}
                />
              </div>
              <button
                onClick={handleTwitterImport}
                disabled={importing || !twitterUrl.trim()}
                style={{
                  padding: '8px 14px', borderRadius: '10px',
                  border: 'none',
                  background: twitterUrl.trim() ? 'var(--color-accent, #8B5CF6)' : 'rgba(255,255,255,0.06)',
                  color: twitterUrl.trim() ? '#fff' : 'var(--text-disabled)',
                  cursor: twitterUrl.trim() ? 'pointer' : 'default',
                  fontFamily: 'var(--font-ui)', fontSize: '11px', fontWeight: 600,
                  letterSpacing: '0.04em',
                }}
              >
                ADD
              </button>
            </div>

            {/* Import result message */}
            {importResult && (
              <div style={{
                padding: '8px 12px', borderRadius: '8px',
                background: importResult.success ? 'rgba(34,197,94,0.10)' : 'rgba(239,68,68,0.10)',
                border: `1px solid ${importResult.success ? 'rgba(34,197,94,0.20)' : 'rgba(239,68,68,0.20)'}`,
                fontFamily: 'var(--font-ui)', fontSize: '11px',
                color: importResult.success ? '#22c55e' : '#ef4444',
              }}>
                {importResult.message}
              </div>
            )}

            {importing && (
              <div style={{
                fontFamily: 'var(--font-ui)', fontSize: '11px',
                color: 'var(--text-disabled)', textAlign: 'center',
                padding: '4px',
              }}>
                Importing...
              </div>
            )}
          </div>
        </div>

        {/* Search */}
        <div style={{
          padding: '10px 20px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          flexShrink: 0,
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '8px 12px', borderRadius: '10px',
            border: '1px solid rgba(255,255,255,0.08)',
            background: 'rgba(255,255,255,0.03)',
          }}>
            <MagnifyingGlass size={14} style={{ color: 'var(--text-disabled)', flexShrink: 0 }} />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search bookmarks..."
              style={{
                flex: 1, border: 'none', background: 'transparent',
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-ui)', fontSize: '12px',
                outline: 'none',
              }}
            />
          </div>
        </div>

        {/* Bookmarks List */}
        <div style={{
          flex: 1, overflowY: 'auto', padding: '8px 12px',
        }}>
          {filtered.length === 0 ? (
            <div style={{
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              padding: '40px 20px', textAlign: 'center',
            }}>
              <BookmarkSimple size={32} style={{ color: 'var(--text-disabled)', marginBottom: '12px' }} />
              <div style={{
                fontFamily: 'var(--font-ui)', fontSize: '13px',
                color: 'var(--text-secondary)', marginBottom: '4px',
              }}>
                {searchQuery ? 'No matching bookmarks' : 'No bookmarks yet'}
              </div>
              <div style={{
                fontFamily: 'var(--font-ui)', fontSize: '11px',
                color: 'var(--text-disabled)',
              }}>
                {searchQuery ? 'Try a different search' : 'Import bookmarks or paste a URL above'}
              </div>
            </div>
          ) : (
            filtered.map(bm => (
              <div
                key={bm.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  padding: '10px 12px', borderRadius: '10px',
                  marginBottom: '4px',
                  transition: 'background 0.1s ease',
                  cursor: 'default',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <BookmarkSimple size={14} style={{ color: '#8B5CF6', flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontFamily: 'var(--font-ui)', fontSize: '12px',
                    color: 'var(--text-primary)',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {bm.content?.title || 'Untitled'}
                  </div>
                  <div style={{
                    fontFamily: 'var(--font-ui)', fontSize: '10px',
                    color: 'var(--text-disabled)',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {bm.content?.url || ''}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                  {bm.content?.url && (
                    <button
                      onClick={() => window.open(bm.content.url, '_blank')}
                      title="Open link"
                      style={{
                        width: '26px', height: '26px', borderRadius: '6px',
                        border: 'none', background: 'transparent',
                        color: 'var(--text-secondary)', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}
                    >
                      <ArrowSquareOut size={12} />
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(bm.id)}
                    title="Remove bookmark"
                    style={{
                      width: '26px', height: '26px', borderRadius: '6px',
                      border: 'none', background: 'transparent',
                      color: 'var(--text-disabled)', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    <Trash size={12} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}