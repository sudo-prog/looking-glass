/**
 * LOOKING GLASS — Export Dialog
 * Modal dialog for selecting export format and options.
 */

import { exportToJSON, downloadJSON } from './jsonExport.js';
import { exportToPNG, downloadPNG } from './pngExport.js';
import { exportToPDF, downloadPDF } from './pdfExport.js';
import { exportToMarkdown, downloadMarkdown } from './markdownExport.js';

export class ExportDialog {
  constructor(app, options = {}) {
    this.app = app;
    this.el = null;
    this.onClose = options.onClose || (() => {});
    this._exporting = false;
  }

  /**
   * Open the export dialog.
   * @param {object} [context]
   * @param {object}  [context.canvas]      - Current canvas
   * @param {Array}   [context.allCanvases] - All canvases
   * @param {HTMLElement} [context.worldEl] - Canvas world element
   * @param {HTMLElement} [context.viewportEl] - Viewport element
   */
  open(context = {}) {
    this._ctx = context;
    this._render();
  }

  close() {
    if (this.el) {
      this.el.remove();
      this.el = null;
    }
    this.onClose();
  }

  _render() {
    // Remove existing dialog
    if (this.el) this.el.remove();

    const overlay = document.createElement('div');
    overlay.className = 'export-dialog-overlay';
    overlay.innerHTML = `
      <div class="export-dialog">
        <div class="export-dialog-header">
          <h2>Export</h2>
          <button class="export-dialog-close" aria-label="Close">&times;</button>
        </div>
        <div class="export-dialog-body">
          <div class="export-formats">
            <label class="export-format-option">
              <input type="radio" name="export-format" value="json" checked>
              <div class="format-card">
                <span class="format-icon">{ }</span>
                <span class="format-name">JSON</span>
                <span class="format-desc">Full project state — re-importable</span>
              </div>
            </label>
            <label class="export-format-option">
              <input type="radio" name="export-format" value="png">
              <div class="format-card">
                <span class="format-icon">🖼</span>
                <span class="format-name">PNG</span>
                <span class="format-desc">Raster snapshot of canvas</span>
              </div>
            </label>
            <label class="export-format-option">
              <input type="radio" name="export-format" value="pdf">
              <div class="format-card">
                <span class="format-icon">📄</span>
                <span class="format-name">PDF</span>
                <span class="format-desc">Multi-page document (one per canvas)</span>
              </div>
            </label>
            <label class="export-format-option">
              <input type="radio" name="export-format" value="markdown">
              <div class="format-card">
                <span class="format-icon">M↓</span>
                <span class="format-name">Markdown</span>
                <span class="format-desc">Text content + image references</span>
              </div>
            </label>
          </div>
          <div class="export-options" id="export-options-panel"></div>
          <div class="export-progress-area" id="export-progress-area" style="display:none">
            <div class="export-progress-bar">
              <div class="export-progress-fill" id="export-progress-fill"></div>
            </div>
            <div class="export-progress-text" id="export-progress-text">Preparing...</div>
          </div>
        </div>
        <div class="export-dialog-footer">
          <button class="export-btn-cancel">Cancel</button>
          <button class="export-btn-export" id="export-btn-export">Export</button>
        </div>
      </div>
    `;

    this.el = overlay;
    document.body.appendChild(overlay);

    // Event listeners
    overlay.querySelector('.export-dialog-close').addEventListener('click', () => this.close());
    overlay.querySelector('.export-btn-cancel').addEventListener('click', () => this.close());
    overlay.querySelector('#export-btn-export').addEventListener('click', () => this._doExport());

    // Close on overlay click
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) this.close();
    });

    // Format selection changes options panel
    const formatInputs = overlay.querySelectorAll('input[name="export-format"]');
    formatInputs.forEach(input => {
      input.addEventListener('change', () => this._updateOptionsPanel());
    });

    this._updateOptionsPanel();
  }

  _updateOptionsPanel() {
    const panel = this.el.querySelector('#export-options-panel');
    const format = this.el.querySelector('input[name="export-format"]:checked')?.value;

    const options = {
      json: `
        <label><input type="checkbox" id="opt-pretty" checked> Pretty-print JSON</label>
        <label><input type="checkbox" id="opt-all-canvases" checked> Include all canvases</label>
      `,
      png: `
        <label>Resolution: <select id="opt-scale">
          <option value="1">1x (standard)</option>
          <option value="2" selected>2x (retina)</option>
          <option value="3">3x (high-res)</option>
        </select></label>
        <label><input type="checkbox" id="opt-bg"> Include background color</label>
      `,
      pdf: `
        <label>Orientation: <select id="opt-orientation">
          <option value="landscape" selected>Landscape</option>
          <option value="portrait">Portrait</option>
        </select></label>
        <label><input type="checkbox" id="opt-all-canvases-pdf" checked> All canvases</label>
      `,
      markdown: `
        <label><input type="checkbox" id="opt-md-meta" checked> Include metadata</label>
        <label><input type="checkbox" id="opt-md-images" checked> Include image references</label>
        <label><input type="checkbox" id="opt-md-links" checked> Include links</label>
        <label><input type="checkbox" id="opt-md-group" checked> Group by canvas</label>
      `,
    };

    panel.innerHTML = options[format] || '';
  }

  async _doExport() {
    if (this._exporting) return;
    this._exporting = true;

    const format = this.el.querySelector('input[name="export-format"]:checked')?.value;
    const btn = this.el.querySelector('#export-btn-export');
    const progressArea = this.el.querySelector('#export-progress-area');
    const progressFill = this.el.querySelector('#export-progress-fill');
    const progressText = this.el.querySelector('#export-progress-text');

    btn.disabled = true;
    btn.textContent = 'Exporting...';
    progressArea.style.display = 'block';

    const onProgress = (phase, value) => {
      const pct = typeof value === 'number' ? value : 0;
      progressFill.style.width = `${Math.min(100, pct)}%`;
      progressText.textContent = _phaseLabel(phase);
    };

    try {
      const canvas = this._ctx.canvas || this.app.currentCanvas;
      const allCanvases = this._ctx.allCanvases || [canvas];
      const name = canvas.name || 'looking-glass';

      switch (format) {
        case 'json': {
          const pretty = this.el.querySelector('#opt-pretty')?.checked ?? true;
          const all = this.el.querySelector('#opt-all-canvases')?.checked ?? true;
          const json = exportToJSON(canvas, all ? allCanvases : [canvas], { name, pretty });
          downloadJSON(json, name);
          break;
        }
        case 'png': {
          const scale = parseInt(this.el.querySelector('#opt-scale')?.value || '2', 10);
          const result = await exportToPNG({
            worldEl: this._ctx.worldEl || this.app.engine.world,
            viewportEl: this._ctx.viewportEl,
            filename: `${name}.png`,
            scale,
            onProgress,
          });
          if (result.ok && result.blob) {
            downloadPNG(result.blob, `${name}.png`);
          } else {
            throw new Error(result.error || 'PNG export failed');
          }
          break;
        }
        case 'pdf': {
          const orientation = this.el.querySelector('#opt-orientation')?.value || 'landscape';
          const all = this.el.querySelector('#opt-all-canvases-pdf')?.checked ?? true;
          const canvasesToExport = all ? allCanvases : [canvas];
          const result = await exportToPDF({
            canvases: canvasesToExport,
            filename: `${name}.pdf`,
            orientation,
            onProgress,
          });
          if (result.ok && result.blob) {
            downloadPDF(result.blob, `${name}.pdf`);
          } else {
            throw new Error(result.error || 'PDF export failed');
          }
          break;
        }
        case 'markdown': {
          const fmt = {
            includeMetadata: this.el.querySelector('#opt-md-meta')?.checked ?? true,
            includeImages: this.el.querySelector('#opt-md-images')?.checked ?? true,
            includeLinks: this.el.querySelector('#opt-md-links')?.checked ?? true,
            groupByCanvas: this.el.querySelector('#opt-md-group')?.checked ?? true,
          };
          const result = await exportToMarkdown({
            canvases: allCanvases,
            filename: `${name}.md`,
            format: fmt,
            onProgress,
          });
          if (result.ok && result.markdown) {
            downloadMarkdown(result.markdown, `${name}.md`);
          } else {
            throw new Error(result.error || 'Markdown export failed');
          }
          break;
        }
      }

      progressFill.style.width = '100%';
      progressText.textContent = 'Done!';
      setTimeout(() => this.close(), 600);
    } catch (err) {
      progressText.textContent = `Error: ${err.message}`;
      progressFill.style.width = '0%';
      btn.disabled = false;
      btn.textContent = 'Export';
      this._exporting = false;
    }
  }
}

function _phaseLabel(phase) {
  const labels = {
    preparing: 'Preparing...',
    capturing: 'Capturing canvas...',
    rendering: 'Rendering...',
    encoding: 'Encoding...',
    finalizing: 'Finalizing...',
    done: 'Done!',
    fallback: 'Using fallback renderer...',
    building: 'Building document...',
    canvas: 'Processing canvas...',
    loading: 'Loading libraries...',
  };
  return labels[phase] || phase;
}
