/**
 * LOOKING GLASS — Export Dialog
 *
 * BUG FIX: Markdown export now strips HTML tags from note text before writing
 * to the .md file. Previously, raw Tiptap HTML tags were written into markdown.
 */
import React, { useState } from 'react';
import { useStore } from '../../store/useStore.js';

function stripHtml(html) {
  if (!html) return '';
  const div     = document.createElement('div');
  div.innerHTML = html;
  return div.textContent || '';
}

export function ExportDialog({ onClose }) {
  const [exporting, setExporting] = useState(false);
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
      alert('Export failed: ' + err.message);
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
          </div>
        </div>
      </div>
    </div>
  );
}