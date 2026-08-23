/**
 * LOOKING GLASS — Fichário (Binder) Card
 * Rebuilt from a real frame-by-frame audit of the source demo (not just
 * the derived text spec). Matches, as closely as the app's stack allows:
 *
 *  - Monospace, markdown-literal page content (**bold**, [x]/[ ] with
 *    real strikethrough on checked items, `code` spans).
 *  - The WHOLE card recolors per page (green → dark → navy → red …),
 *    not just a tab accent.
 *  - Tab rail is hidden entirely while a binder holds exactly one page —
 *    it only appears once a second page is docked in.
 *  - Extraction is two-stage: pops out as a small collapsed preview,
 *    then grows into a full card a beat later.
 *  - A freshly-added page "types itself in" as raw markdown before
 *    settling into its rendered form (matches the AI-authored feel
 *    of the source demo).
 *  - Corner-bracket focus indicator instead of a full ring.
 *  - Dragging one Fichário onto another docks its pages in as new tabs
 *    (see Canvas.jsx onAddToFichario / useStore.ficharioMergeInto).
 *
 * Deliberate deviation: canvas/app background stays Looking Glass's own
 * dark theme — only the binder cards themselves match the source video.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Plus, ArrowUpRight, NotePencil, NoteBlank, CheckSquare, Image as ImageIcon, X } from '@phosphor-icons/react';
import { useStore } from '../store/useStore.js';
import { store as idbStore } from '../data/store.js';
import { getFicharioStyle, getFicharioPageColors, FICHARIO_PAGE_KINDS } from '../data/schema.js';

// ── Tiny markdown-lite renderer ─────────────────────────────────────
// Escapes HTML first, then supports **bold**, `code`, and literal
// [x]/[ ] checklist markers — enough to match the source demo's
// markdown-literal look without pulling in a markdown dependency.

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function renderInline(raw) {
  let html = escapeHtml(raw);
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/`(.+?)`/g, '<code class="fichario-code">$1</code>');
  return html;
}

// ── Typing-in effect for freshly created page content ───────────────
// Reveals `text` character by character — mirrors the source demo's
// "content is being typed by an agent" moment on a new page's title.

function useTypeIn(text, active, speed = 18) {
  const [shown, setShown] = useState(active ? '' : text);
  useEffect(() => {
    if (!active) { setShown(text); return; }
    let i = 0;
    setShown('');
    const id = setInterval(() => {
      i += 1;
      setShown(text.slice(0, i));
      if (i >= text.length) clearInterval(id);
    }, speed);
    return () => clearInterval(id);
  }, [active, text, speed]);
  return shown;
}

// ── Image blob resolver ─────────────────────────────────────────────
// Mirrors VideoCard/PDFViewerCard's pattern: resolve an idb blob id to
// an object URL for display, revoking it on unmount/change.

function useBlobUrl(blobId) {
  const [url, setUrl] = useState(null);
  useEffect(() => {
    if (!blobId) { setUrl(null); return; }
    let objectUrl = null;
    let cancelled = false;
    idbStore.getBlob(blobId).then((blob) => {
      if (cancelled || !blob) return;
      objectUrl = URL.createObjectURL(blob);
      setUrl(objectUrl);
    });
    return () => { cancelled = true; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [blobId]);
  return url;
}

// ── Page content body ────────────────────────────────────────────────

function PageBody({ page, editable, onUpdate, typing }) {
  const kind = page.kind || FICHARIO_PAGE_KINDS.REPORT;
  if (kind === FICHARIO_PAGE_KINDS.STICKY) return <StickyBody page={page} editable={editable} onUpdate={onUpdate} />;
  if (kind === FICHARIO_PAGE_KINDS.TODO)   return <TodoBody page={page} editable={editable} onUpdate={onUpdate} />;
  if (kind === FICHARIO_PAGE_KINDS.IMAGE)  return <ImageBody page={page} editable={editable} onUpdate={onUpdate} />;
  return <ReportBody page={page} editable={editable} onUpdate={onUpdate} typing={typing} />;
}

// ── Sticky note: title + big freeform text, nothing else ────────────

function StickyBody({ page, editable, onUpdate }) {
  const [text, setText] = useState(page.description);
  useEffect(() => { setText(page.description); }, [page.id]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="fichario-page-body fichario-sticky">
      <textarea
        className="fichario-sticky-textarea"
        value={text}
        placeholder="Write a note…"
        readOnly={!editable}
        onChange={(e) => setText(e.target.value)}
        onBlur={() => { if (text !== page.description) onUpdate?.({ description: text }); }}
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
      />
    </div>
  );
}

// ── Todo list: title + checklist, add/remove items inline ───────────

function TodoBody({ page, editable, onUpdate }) {
  const [draft, setDraft] = useState('');

  const toggle = (idx) => {
    const delivered = page.delivered.map((d, i) => (i === idx ? { ...d, checked: !d.checked } : d));
    onUpdate?.({ delivered });
  };
  const removeItem = (idx) => {
    onUpdate?.({ delivered: page.delivered.filter((_, i) => i !== idx) });
  };
  const addItem = () => {
    const t = draft.trim();
    if (!t) return;
    onUpdate?.({ delivered: [...(page.delivered || []), { text: t, checked: false }] });
    setDraft('');
  };

  return (
    <div className="fichario-page-body fichario-todo">
      <div className="fichario-title">{page.title || 'Untitled list'}</div>
      <ul className="fichario-checklist fichario-todo-list">
        {(page.delivered || []).map((d, i) => (
          <li key={i} className={d.checked ? 'checked' : ''}>
            <span className="fichario-check-marker" onClick={() => toggle(i)}>{d.checked ? '[x]' : '[ ]'}</span>
            <span onClick={() => toggle(i)}>{d.text}</span>
            {editable && (
              <button className="fichario-todo-remove" onClick={(e) => { e.stopPropagation(); removeItem(i); }} title="Remove">
                <X size={11} weight="bold" />
              </button>
            )}
          </li>
        ))}
      </ul>
      {editable && (
        <div className="fichario-todo-add" onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
          <span className="fichario-check-marker">[ ]</span>
          <input
            value={draft}
            placeholder="Add item…"
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') addItem(); }}
          />
        </div>
      )}
    </div>
  );
}

// ── Image page: uploaded/pasted image + optional caption ────────────

function ImageBody({ page, editable, onUpdate }) {
  const url = useBlobUrl(page.imageBlobId);
  return (
    <div className="fichario-page-body fichario-image-page">
      {url ? (
        <img className="fichario-image" src={url} alt={page.title || 'Image'} draggable={false} />
      ) : (
        <div className="fichario-image-placeholder">Loading…</div>
      )}
      <div
        className="fichario-image-caption"
        contentEditable={editable}
        suppressContentEditableWarning
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
        onBlur={(e) => {
          const t = e.currentTarget.textContent.trim();
          if (t !== page.title) onUpdate?.({ title: t || 'Image' });
        }}
      >
        {page.title || 'Image'}
      </div>
    </div>
  );
}

// ── Report: the original demo format — Lane/Priority/Owner/Delivered/Result/Log ─

function ReportBody({ page, editable, onUpdate, typing }) {
  const [titleDraft, setTitleDraft] = useState(page.title);
  const [renamingTitle, setRenamingTitle] = useState(false);
  const shownTitle = useTypeIn(page.title, typing);

  const commitTitle = () => {
    setRenamingTitle(false);
    const t = titleDraft.trim() || 'Untitled page';
    if (t !== page.title) onUpdate?.({ title: t });
  };

  const toggleDelivered = (idx) => {
    if (!editable) return;
    const delivered = page.delivered.map((d, i) => (i === idx ? { ...d, checked: !d.checked } : d));
    onUpdate?.({ delivered });
  };

  return (
    <div className="fichario-page-body">
      <div className="fichario-title-row">
        <span className="fichario-title-cursor" aria-hidden="true" />
        {renamingTitle ? (
          <input
            className="fichario-title-input"
            value={titleDraft}
            autoFocus
            onChange={(e) => setTitleDraft(e.target.value)}
            onBlur={commitTitle}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { e.preventDefault(); commitTitle(); }
              if (e.key === 'Escape') { setTitleDraft(page.title); setRenamingTitle(false); }
            }}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <div
            className="fichario-title"
            onDoubleClick={(e) => { if (!editable) return; e.stopPropagation(); setTitleDraft(page.title); setRenamingTitle(true); }}
          >
            {shownTitle || 'Untitled page'}
          </div>
        )}
      </div>

      <div className="fichario-meta">
        <span><strong>Lane:</strong> {page.lane || 'Backlog'}</span>
        <span className="fichario-meta-dot">·</span>
        <span><strong>Priority:</strong> {page.priority || 'P2'}</span>
        {page.owner && (
          <>
            <span className="fichario-meta-dot">·</span>
            <span><strong>Owner:</strong> {page.owner}</span>
          </>
        )}
      </div>

      {page.description && (
        <div className="fichario-description" dangerouslySetInnerHTML={{ __html: renderInline(page.description) }} />
      )}

      {page.delivered?.length > 0 && (
        <div className="fichario-section">
          <div className="fichario-section-label">Delivered</div>
          <ul className="fichario-checklist">
            {page.delivered.map((d, i) => (
              <li key={i} onClick={() => toggleDelivered(i)} className={d.checked ? 'checked' : ''}>
                <span className="fichario-check-marker">{d.checked ? '[x]' : '[ ]'}</span>
                <span dangerouslySetInnerHTML={{ __html: renderInline(d.text) }} />
              </li>
            ))}
          </ul>
        </div>
      )}

      {page.result && (
        <div className="fichario-section">
          <div className="fichario-section-label">Result</div>
          <div className="fichario-description" dangerouslySetInnerHTML={{ __html: renderInline(page.result) }} />
        </div>
      )}

      {page.log?.length > 0 && (
        <div className="fichario-section">
          <div className="fichario-section-label">Log</div>
          <ul className="fichario-log">
            {page.log.map((entry, i) => (
              <li key={i}>
                <span>– </span>
                <strong>{entry.timestamp}</strong>
                <span>&nbsp;{entry.text}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ── Fichário card ────────────────────────────────────────────────────

export function FicharioCard({ item, isSelected, onSelect, onDragStart }) {
  const pages = item.content.pages || [];
  const activePageId = item.content.activePageId || pages[0]?.id;
  const activePage = pages.find((p) => p.id === activePageId) || pages[0];
  const [flipping, setFlipping] = useState(false);
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const fileInputRef = useRef(null);

  // Two-stage extraction: a page arriving with justExtracted starts
  // collapsed, then grows into full size a beat later.
  const [collapsed, setCollapsed] = useState(!!activePage?.justExtracted);
  useEffect(() => {
    if (activePage?.justExtracted) {
      setCollapsed(true);
      const id = setTimeout(() => {
        setCollapsed(false);
        useStore.getState().ficharioUpdatePage(item.id, activePage.id, { justExtracted: false });
      }, 260);
      return () => clearTimeout(id);
    }
  }, [activePage?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const typing = !!activePage?.justCreated;
  useEffect(() => {
    if (activePage?.justCreated) {
      const id = setTimeout(() => {
        useStore.getState().ficharioUpdatePage(item.id, activePage.id, { justCreated: false });
      }, 900);
      return () => clearTimeout(id);
    }
  }, [activePage?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const fs = getFicharioStyle(item);
  const colors = getFicharioPageColors(activePage);

  const setActivePage = useCallback((pageId) => {
    if (pageId === activePageId) return;
    setFlipping(true);
    useStore.getState().ficharioSetActivePage(item.id, pageId);
    window.setTimeout(() => setFlipping(false), 320);
  }, [item.id, activePageId]);

  const addPage = useCallback((e) => {
    e.stopPropagation();
    setAddMenuOpen((v) => !v);
  }, []);

  const chooseKind = useCallback((e, kind) => {
    e.stopPropagation();
    setAddMenuOpen(false);
    if (kind === FICHARIO_PAGE_KINDS.IMAGE) {
      fileInputRef.current?.click();
      return;
    }
    if (kind === FICHARIO_PAGE_KINDS.TODO) {
      useStore.getState().ficharioAddPage(item.id, { kind, title: 'To-do', delivered: [] });
      return;
    }
    if (kind === FICHARIO_PAGE_KINDS.STICKY) {
      useStore.getState().ficharioAddPage(item.id, { kind, title: 'Note', description: '' });
      return;
    }
    useStore.getState().ficharioAddPage(item.id, { kind });
  }, [item.id]);

  const onFileChosen = useCallback((e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) useStore.getState().ficharioAddImagePage(item.id, file);
  }, [item.id]);

  const extractPage = useCallback((e, pageId) => {
    e.stopPropagation();
    useStore.getState().ficharioExtractPage(item.id, pageId);
  }, [item.id]);

  const updateActivePage = useCallback((updates) => {
    if (!activePage) return;
    useStore.getState().ficharioUpdatePage(item.id, activePage.id, updates);
  }, [item.id, activePage]);

  if (!activePage) return null;

  const showTabRail = pages.length > 1;

  const styleVars = {
    left: item.x,
    top: item.y,
    width: collapsed ? Math.round((item.width || 360) * 0.42) : (item.width || 360),
    height: collapsed ? 96 : undefined,
    '--fichario-radius': `${fs.cornerRadius}px`,
    '--fichario-bg': fs.background || colors.bg,
    '--fichario-fg': fs.body.color || colors.text,
    '--fichario-muted': colors.muted,
    '--fichario-tab-accent-default': fs.tabAccent,
    '--fichario-heading-size': `${fs.heading.size}px`,
    '--fichario-heading-color': fs.heading.color || colors.text,
    '--fichario-heading-weight': fs.heading.weight,
    '--fichario-heading-transform': fs.heading.uppercase ? 'uppercase' : 'none',
    '--fichario-heading-style': fs.heading.italic ? 'italic' : 'normal',
    '--fichario-body-size': `${fs.body.size}px`,
    '--fichario-body-color': fs.body.color || colors.text,
    '--fichario-body-style': fs.body.italic ? 'italic' : 'normal',
    '--fichario-tab-size': `${fs.tab.size}px`,
    '--fichario-tab-color': fs.tab.color || colors.text,
    '--fichario-tab-weight': fs.tab.weight,
    '--fichario-tab-transform': fs.tab.uppercase ? 'uppercase' : 'none',
  };

  return (
    <div
      className={`canvas-card card-fichario ${isSelected ? 'selected' : ''} ${collapsed ? 'collapsed' : ''}`}
      data-id={item.id}
      data-type={item.type}
      style={styleVars}
      onPointerDown={onDragStart}
      onClick={(e) => onSelect(e.ctrlKey || e.metaKey)}
    >
      <span className="fichario-corner fichario-corner-tl" />
      <span className="fichario-corner fichario-corner-tr" />
      <span className="fichario-corner fichario-corner-bl" />
      <span className="fichario-corner fichario-corner-br" />
      {collapsed ? (
        <div className="fichario-collapsed-preview">
          <div className="fichario-collapsed-title">{activePage.title}</div>
          <div className="fichario-collapsed-meta">{activePage.lane} · {activePage.priority}</div>
        </div>
      ) : (
        <div className={`fichario-stack ${flipping ? 'flipping' : ''}`}>
          <PageBody page={activePage} editable onUpdate={updateActivePage} typing={typing} />
        </div>
      )}

      {showTabRail && !collapsed && (
        <div className="fichario-tab-rail">
          {pages.map((page) => {
            const active = page.id === activePageId;
            const pc = getFicharioPageColors(page);
            return (
              <div
                key={page.id}
                className={`fichario-tab ${active ? 'active' : ''}`}
                style={{ '--tab-bg': pc.bg, '--tab-fg': pc.text }}
                onClick={(e) => { e.stopPropagation(); setActivePage(page.id); }}
                title={page.title}
              >
                <span className="fichario-tab-label">{page.title}</span>
                <button
                  className="fichario-tab-extract"
                  title="Extract page"
                  onClick={(e) => extractPage(e, page.id)}
                >
                  <ArrowUpRight size={11} weight="bold" />
                </button>
              </div>
            );
          })}
          <button className="fichario-tab fichario-tab-add" onClick={addPage} title="Add page" style={{ '--tab-bg': 'var(--fichario-tab-accent-default)', '--tab-fg': '#141414' }}>
            <Plus size={13} weight="bold" />
          </button>
        </div>
      )}

      {!showTabRail && !collapsed && (
        <button className="fichario-add-page-fab" onClick={addPage} title="Add page">
          <Plus size={13} weight="bold" />
        </button>
      )}

      {addMenuOpen && (
        <>
          <div className="fichario-add-menu-overlay" onClick={(e) => { e.stopPropagation(); setAddMenuOpen(false); }} />
          <div className="fichario-add-menu" onClick={(e) => e.stopPropagation()}>
            <button onClick={(e) => chooseKind(e, FICHARIO_PAGE_KINDS.REPORT)}>
              <NotePencil size={14} weight="regular" /> Report page
            </button>
            <button onClick={(e) => chooseKind(e, FICHARIO_PAGE_KINDS.STICKY)}>
              <NoteBlank size={14} weight="regular" /> Sticky note
            </button>
            <button onClick={(e) => chooseKind(e, FICHARIO_PAGE_KINDS.TODO)}>
              <CheckSquare size={14} weight="regular" /> To-do list
            </button>
            <button onClick={(e) => chooseKind(e, FICHARIO_PAGE_KINDS.IMAGE)}>
              <ImageIcon size={14} weight="regular" /> Image
            </button>
          </div>
        </>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onClick={(e) => e.stopPropagation()}
        onChange={onFileChosen}
      />
    </div>
  );
}
