/**
 * LOOKING GLASS — PDFViewerCard
 * Drag a PDF onto the canvas → renders as a miniature preview card.
 * Click → opens inline multi-page reader.
 * Text highlight → drops a highlighted sticky note onto the canvas.
 *
 * Uses pdf.js (Mozilla, loaded from CDN). No npm install required.
 * PDF stored as Blob in IndexedDB blobs store.
 *
 * INTEGRATION:
 *   1. Add ITEM_TYPES.PDF = 'pdf' already exists in schema.js ✓
 *   2. Add `addPDF(file)` action to useStore.js (see bottom of file).
 *   3. Add case ITEM_TYPES.PDF → <PDFViewerCard> in CanvasCard.jsx
 *   4. Add PDF to the canvas drop zone handler in Canvas.jsx:
 *        if (file.type === 'application/pdf') { await addPDF(file); }
 *
 * Schema for PDF items:
 *   content.title        — file name
 *   content.pdf_blob_id  — blob ID in IndexedDB
 *   content.page_count   — total pages
 *   meta.current_page    — last viewed page
 */

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
} from 'react';
import {
  FilePdf,
  CaretLeft,
  CaretRight,
  X,
  ArrowsOut,
  Highlighter,
} from '@phosphor-icons/react';
import { store as idbStore } from '../data/store.js';
import { useStore } from '../store/useStore.js';
import { ITEM_TYPES } from '../data/schema.js';

// ── pdf.js loader ─────────────────────────────────────────
const PDFJS_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.min.mjs';
const PDFJS_WORKER_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs';

let pdfJsLib = null;

async function getPdfJs() {
  if (pdfJsLib) return pdfJsLib;
  const mod = await import(/* webpackIgnore: true */ PDFJS_CDN);
  mod.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_CDN;
  pdfJsLib = mod;
  return mod;
}

// ─────────────────────────────────────────────────────────────
// PDF PAGE RENDERER — renders one page to a canvas element
// ─────────────────────────────────────────────────────────────

function PDFPage({ pdfDoc, pageNum, scale = 1.0, onTextSelect }) {
  const canvasRef  = useRef(null);
  const layerRef   = useRef(null);
  const renderTask = useRef(null);

  useEffect(() => {
    if (!pdfDoc || !canvasRef.current) return;
    let cancelled = false;

    (async () => {
      const page     = await pdfDoc.getPage(pageNum);
      const viewport = page.getViewport({ scale });
      const canvas   = canvasRef.current;
      if (!canvas || cancelled) return;

      const ctx = canvas.getContext('2d');
      const dpr = window.devicePixelRatio || 1;
      canvas.width  = viewport.width  * dpr;
      canvas.height = viewport.height * dpr;
      canvas.style.width  = `${viewport.width}px`;
      canvas.style.height = `${viewport.height}px`;
      ctx.scale(dpr, dpr);

      if (renderTask.current) renderTask.current.cancel();
      renderTask.current = page.render({ canvasContext: ctx, viewport });
      try { await renderTask.current.promise; } catch { /* cancelled */ }
    })();

    return () => { cancelled = true; };
  }, [pdfDoc, pageNum, scale]);

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <canvas ref={canvasRef} style={{ display: 'block' }} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// PDF READER OVERLAY
// ─────────────────────────────────────────────────────────────

function PDFReaderOverlay({ pdfDoc, title, onClose, pageCount, onDropHighlight }) {
  const [page,  setPage]  = useState(1);
  const [scale, setScale] = useState(1.2);

  const prevPage = () => setPage((p) => Math.max(1, p - 1));
  const nextPage = () => setPage((p) => Math.min(pageCount, p + 1));

  const handleMouseUp = useCallback(() => {
    const sel = window.getSelection();
    const txt = sel?.toString().trim();
    if (txt && txt.length > 3) {
      onDropHighlight?.(txt, page);
      sel.removeAllRanges();
    }
  }, [onDropHighlight, page]);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 'var(--z-lightbox)',
        background: 'rgba(0,0,0,0.88)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Controls bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '12px 20px',
          width: '100%',
          boxSizing: 'border-box',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          background: 'rgba(10,10,10,0.80)',
          backdropFilter: 'blur(20px)',
          flexShrink: 0,
        }}
      >
        <FilePdf size={16} weight="regular" style={{ color: 'var(--text-secondary)' }} />
        <span
          style={{
            flex: 1,
            fontFamily: 'var(--font-body)',
            fontSize: '13px',
            fontWeight: 500,
            color: 'var(--text-primary)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {title}
        </span>

        {/* Page nav */}
        <button onClick={prevPage} disabled={page === 1} style={ctrlBtn} aria-label="Previous page">
          <CaretLeft size={14} weight="regular" />
        </button>
        <span style={{ fontFamily: 'var(--font-ui)', fontSize: '11px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
          {page} / {pageCount}
        </span>
        <button onClick={nextPage} disabled={page === pageCount} style={ctrlBtn} aria-label="Next page">
          <CaretRight size={14} weight="regular" />
        </button>

        {/* Zoom */}
        <button onClick={() => setScale((s) => Math.min(3, s + 0.25))} style={ctrlBtn} aria-label="Zoom in">+</button>
        <button onClick={() => setScale((s) => Math.max(0.5, s - 0.25))} style={ctrlBtn} aria-label="Zoom out">−</button>

        {/* Highlight hint */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--text-disabled)', fontFamily: 'var(--font-ui)', fontSize: '9px', letterSpacing: '0.08em' }}>
          <Highlighter size={12} weight="regular" />
          SELECT TEXT → STICKY NOTE
        </div>

        <button onClick={onClose} style={ctrlBtn} aria-label="Close PDF reader">
          <X size={14} weight="regular" />
        </button>
      </div>

      {/* Page viewport */}
      <div
        style={{ flex: 1, overflowY: 'auto', overflowX: 'auto', padding: '24px', width: '100%', boxSizing: 'border-box' }}
        onMouseUp={handleMouseUp}
      >
        <div style={{ margin: '0 auto', display: 'inline-block', boxShadow: '0 8px 40px rgba(0,0,0,0.60)', borderRadius: '4px', overflow: 'hidden' }}>
          {pdfDoc && (
            <PDFPage pdfDoc={pdfDoc} pageNum={page} scale={scale} />
          )}
        </div>
      </div>
    </div>
  );
}

const ctrlBtn = {
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  width: '28px', height: '28px', border: '1px solid rgba(255,255,255,0.10)',
  borderRadius: '6px', background: 'transparent', color: 'var(--text-secondary)',
  cursor: 'pointer', fontFamily: 'var(--font-ui)', fontSize: '13px',
  flexShrink: 0,
};

// ─────────────────────────────────────────────────────────────
// PDF VIEWER CARD (canvas card)
// ─────────────────────────────────────────────────────────────

export function PDFViewerCard({
  item,
  isSelected,
  onSelect,
  onDragStart,
  onSave,
  onDelete,
}) {
  const [pdfDoc,     setPdfDoc]     = useState(null);
  const [thumbUrl,   setThumbUrl]   = useState(null);
  const [loadStatus, setLoadStatus] = useState('loading');
  const [readerOpen, setReaderOpen] = useState(false);

  const pageCount = item.content?.page_count || 1;

  const addItem  = useStore((s) => s.addItem);
  const viewport = useStore((s) => s.viewport);

  // ── Load PDF blob ────────────────────────────────────
  useEffect(() => {
    const blobId = item.content?.pdf_blob_id;
    if (!blobId) { setLoadStatus('error'); return; }

    let url = null;
    (async () => {
      try {
        const blob = await idbStore.getBlob(blobId);
        if (!blob) { setLoadStatus('error'); return; }
        url = URL.createObjectURL(blob);

        const pdfjsLib = await getPdfJs();
        const doc      = await pdfjsLib.getDocument(url).promise;
        setPdfDoc(doc);

        // Render page 1 as thumbnail
        const page     = await doc.getPage(1);
        const vp       = page.getViewport({ scale: 0.7 });
        const canvas   = document.createElement('canvas');
        const ctx      = canvas.getContext('2d');
        const dpr      = window.devicePixelRatio || 1;
        canvas.width   = vp.width  * dpr;
        canvas.height  = vp.height * dpr;
        ctx.scale(dpr, dpr);
        await page.render({ canvasContext: ctx, viewport: vp }).promise;
        setThumbUrl(canvas.toDataURL('image/jpeg', 0.75));
        setLoadStatus('ok');

        // Persist page count
        if (doc.numPages !== pageCount) {
          await onSave?.({ content: { page_count: doc.numPages } });
        }
      } catch (err) {
        console.error('PDFViewerCard: load error', err);
        setLoadStatus('error');
      }
    })();

    return () => { if (url) URL.revokeObjectURL(url); };
  }, [item.content?.pdf_blob_id]);

  // ── Highlight → sticky note ──────────────────────────
  const handleDropHighlight = useCallback(
    async (text, page) => {
      const vp    = viewport;
      const x     = (-vp.x + 320 + Math.random() * 60) / vp.scale;
      const y     = (-vp.y + 200 + Math.random() * 60) / vp.scale;
      await addItem({
        type:    ITEM_TYPES.NOTE,
        x, y,
        width:   260,
        content: {
          title: text.substring(0, 50),
          text:  `> ${text}\n\n— from **${item.content?.title || 'PDF'}**, p.${page}`,
        },
        style: { background: '#1A1500', border: 'rgba(245,158,11,0.30)' },
      });
    },
    [addItem, viewport, item.content?.title],
  );

  return (
    <>
      <div
        className={`canvas-card card-pdf ${isSelected ? 'selected' : ''}`}
        data-id={item.id}
        data-type={item.type}
        style={{
          position: 'absolute',
          left: item.x,
          top: item.y,
          width: item.width || 220,
          borderRadius: '12px',
          background: 'rgba(14,14,14,0.78)',
          backdropFilter: 'blur(16px) saturate(108%)',
          WebkitBackdropFilter: 'blur(16px) saturate(108%)',
          border: isSelected
            ? '1px solid rgba(255,255,255,0.30)'
            : '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.55)',
          cursor: 'grab',
          userSelect: 'none',
          overflow: 'hidden',
          transition: 'border-color 0.15s ease',
        }}
        onPointerDown={onDragStart}
        onClick={(e) => onSelect(e.ctrlKey || e.metaKey)}
        onDoubleClick={(e) => { e.stopPropagation(); setReaderOpen(true); }}
      >
        {/* Thumbnail */}
        <div
          style={{
            width: '100%',
            aspectRatio: '1 / 1.414', // A4
            background: '#1A1A1A',
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          {thumbUrl && loadStatus === 'ok' ? (
            <img src={thumbUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }} />
          ) : loadStatus === 'loading' ? (
            <div style={placeholderStyle}>
              <FilePdf size={24} weight="regular" style={{ color: 'var(--text-disabled)' }} />
            </div>
          ) : (
            <div style={placeholderStyle}>
              <FilePdf size={24} weight="regular" style={{ color: 'var(--color-accent)' }} />
              <span style={{ fontFamily: 'var(--font-ui)', fontSize: '9px', color: 'var(--text-disabled)' }}>ERROR</span>
            </div>
          )}

          {/* Open overlay */}
          {loadStatus === 'ok' && (
            <button
              onClick={(e) => { e.stopPropagation(); setReaderOpen(true); }}
              style={{
                position: 'absolute', bottom: '8px', right: '8px',
                display: 'flex', alignItems: 'center', gap: '5px',
                padding: '4px 10px', borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.15)',
                background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)',
                color: 'rgba(255,255,255,0.80)',
                fontFamily: 'var(--font-ui)', fontSize: '9px',
                letterSpacing: '0.08em', cursor: 'pointer',
                opacity: 0, transition: 'opacity 0.15s ease',
              }}
              className="pdf-open-btn"
            >
              <ArrowsOut size={11} weight="regular" />
              OPEN
            </button>
          )}
          <style>{`.card-pdf:hover .pdf-open-btn { opacity: 1 !important; }`}</style>
        </div>

        {/* Separator */}
        <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)' }} />

        {/* Footer */}
        <div style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <FilePdf size={12} weight="regular" style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />
          <span style={{ flex: 1, fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {item.content?.title || 'Document.pdf'}
          </span>
          <span style={{ fontFamily: 'var(--font-ui)', fontSize: '9px', color: 'var(--text-disabled)', flexShrink: 0 }}>
            {pageCount}p
          </span>
        </div>
      </div>

      {/* Full reader */}
      {readerOpen && (
        <PDFReaderOverlay
          pdfDoc={pdfDoc}
          title={item.content?.title || 'Document.pdf'}
          pageCount={pdfDoc?.numPages || pageCount}
          onClose={() => setReaderOpen(false)}
          onDropHighlight={handleDropHighlight}
        />
      )}
    </>
  );
}

const placeholderStyle = {
  position: 'absolute', inset: 0,
  display: 'flex', flexDirection: 'column',
  alignItems: 'center', justifyContent: 'center', gap: '8px',
};

// ─────────────────────────────────────────────────────────────
// STORE ACTION — paste into useStore.js
// ─────────────────────────────────────────────────────────────

/**
 * Add this to the useStore create() body:
 *
 *   addPDF: async (file) => {
 *     const state  = get();
 *     const vp     = state.viewport;
 *     const x      = (-vp.x + 300) / vp.scale;
 *     const y      = (-vp.y + 200) / vp.scale;
 *     const blobId = `pdf-${Date.now()}-${Math.random().toString(36).slice(2)}`;
 *     await idbStore.saveBlob(blobId, file);
 *     return get().addItem({
 *       type:    ITEM_TYPES.PDF,
 *       x, y,
 *       width:   220,
 *       content: {
 *         title:        file.name.replace(/\.pdf$/i, ''),
 *         pdf_blob_id:  blobId,
 *         page_count:   0,  // updated on first render
 *       },
 *     });
 *   },
 */

export default PDFViewerCard;
