/**
 * LOOKING GLASS — Export Dialog Component (React)
 */
import React, { useState } from 'react';
import { useStore } from '../../store/useStore.js';

export function ExportDialog({ onClose }) {
  const [exporting, setExporting] = useState(false);
  const exportData = useStore((s) => s.exportData);

  const handleExport = async (format) => {
    setExporting(true);
    try {
      const data = await exportData();
      let content, filename, mimeType;

      switch (format) {
        case 'json':
          content = JSON.stringify(data, null, 2);
          filename = `looking-glass-export-${Date.now()}.json`;
          mimeType = 'application/json';
          break;
        case 'markdown': {
          const lines = ['# Looking Glass Export\n'];
          for (const item of data.items) {
            lines.push(`## ${item.content?.title || 'Untitled'} (${item.type})`);
            if (item.content?.url) lines.push(`URL: ${item.content.url}`);
            if (item.content?.text) lines.push(item.content.text);
            if (item.content?.description) lines.push(item.content.description);
            lines.push('');
          }
          content = lines.join('\n');
          filename = `looking-glass-export-${Date.now()}.md`;
          mimeType = 'text/markdown';
          break;
        }
        default:
          return;
      }

      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('Export failed: ' + err.message);
    }
    setExporting(false);
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
            <button className="export-btn" onClick={() => handleExport('json')} disabled={exporting}>
              📄 JSON (full backup)
            </button>
            <button className="export-btn" onClick={() => handleExport('markdown')} disabled={exporting}>
              📝 Markdown (notes)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
