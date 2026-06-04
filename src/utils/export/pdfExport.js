/**
 * LOOKING GLASS — PDF Export
 * Multi-page PDF export — one page per canvas in a space.
 * Uses jsPDF for document generation.
 */

/**
 * Export canvases as a multi-page PDF.
 *
 * @param {object} options
 * @param {Array}  options.canvases       - Array of canvas state objects
 * @param {string} [options.filename='looking-glass.pdf']
 * @param {string} [options.orientation='landscape']
 * @param {function} [options.onProgress] - Callback(phase, canvasIndex, progress)
 * @returns {Promise<{ ok: boolean, blob?: Blob, error?: string }>}
 */
export async function exportToPDF(options) {
  const {
    canvases,
    filename = 'looking-glass.pdf',
    orientation = 'landscape',
    onProgress,
  } = options;

  if (!canvases || !canvases.length) {
    return { ok: false, error: 'No canvases to export' };
  }

  onProgress?.('loading', 0, 0);

  // Dynamic import jsPDF
  try {
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF({ orientation, unit: 'pt', format: 'a4' });

    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const MARGIN = 40;
    const contentW = pageW - MARGIN * 2;
    const contentH = pageH - MARGIN * 2;

    canvases.forEach((canvas, idx) => {
      if (idx > 0) doc.addPage();

      onProgress?.('canvas', idx, (idx / canvases.length) * 100);

      // Header
      doc.setFontSize(20);
      doc.setTextColor(30, 30, 50);
      doc.text(canvas.name || `Canvas ${idx + 1}`, MARGIN, MARGIN + 20);

      // Metadata line
      doc.setFontSize(9);
      doc.setTextColor(140, 140, 140);
      const dateStr = canvas.updated_at
        ? new Date(canvas.updated_at).toLocaleDateString()
        : '';
      doc.text(
        `${(canvas.items || []).length} items  ${dateStr}`,
        MARGIN,
        MARGIN + 38
      );

      // Separator line
      doc.setDrawColor(220, 220, 230);
      doc.line(MARGIN, MARGIN + 48, pageW - MARGIN, MARGIN + 48);

      // Items
      let y = MARGIN + 70;
      const items = canvas.items || [];

      // Group items by approximate Y position for a grid layout
      const rows = _groupItemsIntoRows(items, contentW, 140);

      rows.forEach(row => {
        // Check if we need a new page
        if (y + 160 > pageH - MARGIN) {
          doc.addPage();
          y = MARGIN + 20;
        }

        const cardW = contentW / Math.max(row.length, 1);
        row.forEach((item, col) => {
          const cardX = MARGIN + col * cardW + 8;
          const cW = cardW - 16;
          const cH = 120;

          // Card border
          doc.setDrawColor(60, 60, 80);
          doc.setFillColor(26, 26, 46);
          doc.roundedRect(cardX, y, cW, cH, 4, 4, 'FD');

          // Title
          doc.setFontSize(10);
          doc.setTextColor(230, 230, 230);
          const title = _truncate(item.content?.title || 'Untitled', 32);
          doc.text(title, cardX + 8, y + 18);

          // Type badge
          doc.setFontSize(7);
          doc.setTextColor(160, 160, 180);
          doc.text(item.type || '', cardX + 8, y + 34);

          // Description snippet
          if (item.content?.description) {
            doc.setFontSize(8);
            doc.setTextColor(180, 180, 180);
            const desc = _truncate(item.content.description, 60);
            const lines = doc.splitTextToSize(desc, cW - 16);
            doc.text(lines.slice(0, 2), cardX + 8, y + 50);
          }

          // Domain / source
          if (item.meta?.domain) {
            doc.setFontSize(7);
            doc.setTextColor(120, 120, 140);
            doc.text(item.meta.domain, cardX + 8, y + cH - 10);
          }

          // URL
          if (item.content?.url) {
            doc.setFontSize(6);
            doc.setTextColor(100, 130, 180);
            doc.text(_truncate(item.content.url, 50), cardX + 8, y + cH - 22);
          }
        });

        y += 140;
      });
    });

    onProgress?.('finalizing', canvases.length - 1, 100);
    const blob = doc.output('blob');
    return { ok: true, blob };
  } catch (err) {
    return { ok: false, error: `PDF export failed: ${err.message}` };
  }
}

/**
 * Download a PDF blob.
 * @param {Blob} blob
 * @param {string} filename
 */
export function downloadPDF(blob, filename) {
  if (!blob) return;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ── Internals ──────────────────────────────────────────────

/**
 * Group items into rows for grid layout on the PDF page.
 */
function _groupItemsIntoRows(items, pageWidth, cardWidth) {
  if (!items.length) return [];

  const perRow = Math.max(1, Math.floor(pageWidth / (cardWidth + 16)));
  const rows = [];
  for (let i = 0; i < items.length; i += perRow) {
    rows.push(items.slice(i, i + perRow));
  }
  return rows;
}

function _truncate(str, maxLen) {
  if (!str) return '';
  return str.length > maxLen ? str.slice(0, maxLen - 1) + '…' : str;
}
