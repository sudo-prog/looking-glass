/**
 * LOOKING GLASS — Export Dialog
 *
 * BUG FIX: Markdown export now strips HTML tags from note text before writing
 * to the .md file. Previously, raw Tiptap HTML tags were written into markdown.
 *
 * C6: Ported PNG/PDF export buttons from vanilla ExportDialog.js.
 */
import React, { useState, useRef } from 'react';
import { toast } from 'react-hot-toast';
import { useStore } from '../../store/useStore.js';
import { exportToPNG, downloadPNG } from './pngExport.js';
import { exportToPDF, downloadPDF } from './pdfExport.js';

function stripHtml(html) {
  if (!html) return '';
  const div     = document.createElement('div');
  div.innerHTML = html;
  return div.textContent || '';
}

export function ExportDialog({ onClose }) {
  const [exporting, setExporting] = useState(false);
  const [pngScale, setPngScale] = useState(2);
  const [pdfOrientation, setPdfOrientation] = useState('landscape');
  const worldRef = useRef(null);
  const exportData = useStore((s) => s.exportData);

  const handleExport = async (format) => {
    setExporting(true);
    try {
      const data     = await exportData();
      const allItems = data.canvases?.[0]?.items || data.items || [];
      let content, filename, mimeType;

      if (format === 'json') {
        content  = JSON.stringify(data, null, 2);
        filename = `looking-glass-export-${Date.now()}.json`;
        mimeType = 'application/json';
      } else if (format === 'markdown') {
        const lines = ['# Looking Glass Export\n'];
        for (const item of allItems) {
          lines.push(`## ${item.content?.title || 'Untitled'} (${item.type})`);
          if (item.content?.url)         lines.push(`URL: ${item.content.url}`);
          // BUG FIX: strip HTML before writing to markdown
          if (item.content?.text)        lines.push(stripHtml(item.content.text));
          if (item.content?.description) lines.push(item.content.description);
          lines.push('');
        }
        content  = lines.join('\n');
        filename = `looking-glass-export-${Date.now()}.md`;
        mimeType = 'text/markdown';
      } else if (format === 'png') {
        const worldEl = document.querySelector('[data-glass-surface="canvas-world"]') || document.querySelector('.canvas-world');
        if (!worldEl) {
          toast.error('PNG export: canvas element not found');
          setExporting(false);
          return;
        }
        const result = await exportToPNG({
          worldEl,
          scale: pngScale,
          filename: `looking-glass-canvas-${Date.now()}.png`,
        });
        if (result.ok && result.blob) {
          downloadPNG(result.blob, `looking-glass-canvas-${Date.now()}.png`);
        } else {
          toast.error('PNG export failed: ' + (result.error || 'Unknown error'));
        }
        onClose();
        setExporting(false);
        return;
      } else if (format === 'pdf') {
        const canvasId = useStore.getState().canvasId;
        const canvasName = useStore.getState().canvasName || 'Canvas';
        const canvases = [{ name: canvasName, items: allItems }];
        const result = await exportToPDF({
          canvases,
          orientation: pdfOrientation,
          filename: `looking-glass-export-${Date.now()}.pdf`,
        });
        if (result.ok && result.blob) {
          downloadPDF(result.blob, `looking-glass-export-${Date.now()}.pdf`);
        } else {
          toast.error('PDF export failed: ' + (result.error || 'Unknown error'));
        }
        onClose();
        setExporting(false);
        return;
      } else {
        return;
      }

      const blob = new Blob([content], { type: mimeType });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      onClose();
    } catch (err) {
      console.error('[LG] Export failed:', err);
      toast.error('Export failed: ' + err.message);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Export Data</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <p>Choose export format:</p>
          <div className="export-options">
            <button
              className="export-btn"
              onClick={() => handleExport('json')}
              disabled={exporting}
            >
              📄 JSON (full backup)
            </button>
            <button
              className="export-btn"
              onClick={() => handleExport('markdown')}
              disabled={exporting}
            >
              📝 Markdown (notes)
            </button>
            <button
              className="export-btn"
              onClick={() => handleExport('png')}
              disabled={exporting}
            >
              🖼️ PNG (canvas image)
            </button>
            <button
              className="export-btn"
              onClick={() => handleExport('pdf')}
              disabled={exporting}
            >
              📕 PDF (document)
            </button>
          </div>

          {/* PNG/PDF options */}
          <div style={{ marginTop: '16px', borderTop: '1px solid var(--color-border)', paddingTop: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <label style={{ fontFamily: 'var(--font-ui)', fontSize: '10px', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
                PNG Scale:
              </label>
              <select
                value={pngScale}
                onChange={(e) => setPngScale(Number(e.target.value))}
                style={{ background: 'var(--color-bg-raised)', color: 'var(--text-primary)', border: '1px solid var(--color-border)', borderRadius: '4px', padding: '2px 8px', fontSize: '12px' }}
              >
                <option value={1}>1×</option>
                <option value={2}>2×</option>
                <option value={3}>3×</option>
              </select>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <label style={{ fontFamily: 'var(--font-ui)', fontSize: '10px', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
                PDF Orientation:
              </label>
              <select
                value={pdfOrientation}
                onChange={(e) => setPdfOrientation(e.target.value)}
                style={{ background: 'var(--color-bg-raised)', color: 'var(--text-primary)', border: '1px solid var(--color-border)', borderRadius: '4px', padding: '2px 8px', fontSize: '12px' }}
              >
                <option value="landscape">Landscape</option>
                <option value="portrait">Portrait</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
