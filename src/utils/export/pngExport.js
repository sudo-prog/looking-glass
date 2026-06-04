/**
 * LOOKING GLASS — PNG Export
 * Raster snapshot of the canvas using html2canvas.
 * Falls back to manual canvas rendering if html2canvas is unavailable.
 */

/**
 * Export the current canvas as a PNG image.
 *
 * @param {object}  options
 * @param {HTMLElement} options.worldEl    - The #canvas-world element
 * @param {HTMLElement} [options.viewportEl] - The viewport element (for bounds)
 * @param {string}  [options.filename='looking-glass-canvas.png']
 * @param {number}  [options.scale=2]      - Resolution multiplier
 * @param {string}  [options.backgroundColor=null] - Background color (null = transparent)
 * @param {function} [options.onProgress]  - Callback(phase, progress)
 * @returns {Promise<{ ok: boolean, blob?: Blob, error?: string }>}
 */
export async function exportToPNG(options) {
  const {
    worldEl,
    viewportEl,
    filename = 'looking-glass-canvas.png',
    scale = 2,
    backgroundColor = null,
    onProgress,
  } = options;

  if (!worldEl) {
    return { ok: false, error: 'No canvas world element provided' };
  }

  onProgress?.('preparing', 0);

  // Try html2canvas first
  try {
    // Dynamic import — html2canvas may not be installed
    let html2canvas;
    try {
      const mod = await import('html2canvas');
      html2canvas = mod.default || mod;
    } catch {
      // Fallback: manual canvas rendering
      return fallbackPNGExport(worldEl, viewportEl, filename, scale, backgroundColor, onProgress);
    }

    onProgress?.('capturing', 20);

    // Compute bounds - use content bounds or viewport bounds
    const bounds = _computeExportBounds(worldEl, viewportEl);
    onProgress?.('capturing', 40);

    // Clone the world for export (to avoid modifying the live DOM)
    const clone = worldEl.cloneNode(true);
    // Position clone so content starts at 0,0
    const items = clone.querySelectorAll('.canvas-item');
    const offsetX = bounds.minX;
    const offsetY = bounds.minY;
    items.forEach(item => {
      const x = parseFloat(item.style.left) - offsetX;
      const y = parseFloat(item.style.top) - offsetY;
      item.style.left = `${x}px`;
      item.style.top = `${y}px`;
    });

    // Append clone off-screen for rendering
    const container = document.createElement('div');
    container.style.cssText = `position:fixed;left:-9999px;top:${-offsetY}px;width:${bounds.width}px;height:${bounds.height}px;overflow:hidden;`;
    container.appendChild(clone);
    document.body.appendChild(container);

    onProgress?.('rendering', 60);

    const canvas = await html2canvas(container, {
      scale,
      backgroundColor,
      width: bounds.width,
      height: bounds.height,
      useCORS: true,
      logging: false,
    });

    document.body.removeChild(container);
    onProgress?.('encoding', 85);

    const blob = await _canvasToBlob(canvas, 'image/png');
    onProgress?.('done', 100);

    return { ok: true, blob };
  } catch (err) {
    return { ok: false, error: `PNG export failed: ${err.message}` };
  }
}

/**
 * Fallback PNG export using native canvas API.
 * Draws cards as simple rectangles with text — no html2canvas needed.
 */
function fallbackPNGExport(worldEl, viewportEl, filename, scale, backgroundColor, onProgress) {
  return new Promise((resolve) => {
    onProgress?.('fallback', 10);

    const bounds = _computeExportBounds(worldEl, viewportEl);
    const canvas = document.createElement('canvas');
    canvas.width = bounds.width * scale;
    canvas.height = bounds.height * scale;
    const ctx = canvas.getContext('2d');
    ctx.scale(scale, scale);

    // Background
    if (backgroundColor) {
      ctx.fillStyle = backgroundColor;
      ctx.fillRect(0, 0, bounds.width, bounds.height);
    }

    onProgress?.('fallback', 40);

    // Draw each card
    const items = worldEl.querySelectorAll('.canvas-item');
    items.forEach((el, i) => {
      const x = parseFloat(el.dataset.x) - bounds.minX;
      const y = parseFloat(el.dataset.y) - bounds.minY;
      const w = el.offsetWidth || parseFloat(el.dataset.width) || 320;
      const h = el.offsetHeight || parseFloat(el.dataset.height) || 200;

      // Card background
      ctx.fillStyle = '#1a1a2e';
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 1;
      _roundRect(ctx, x, y, w, h, 8);
      ctx.fill();
      ctx.stroke();

      // Card title
      const title = el.querySelector('.card-title');
      const titleText = title ? title.textContent : '';
      ctx.fillStyle = '#eee';
      ctx.font = '14px system-ui, sans-serif';
      ctx.fillText(_truncate(titleText, 35), x + 12, y + 24);

      // Domain badge
      const domain = el.querySelector('.card-domain');
      if (domain) {
        ctx.fillStyle = '#888';
        ctx.font = '10px system-ui, sans-serif';
        ctx.fillText(domain.textContent, x + 12, y + h - 12);
      }

      onProgress?.('fallback', 40 + (i / items.length) * 40);
    });

    onProgress?.('encoding', 90);

    canvas.toBlob((blob) => {
      onProgress?.('done', 100);
      resolve({ ok: !!blob, blob: blob || undefined });
    }, 'image/png');
  });
}

/**
 * Download a PNG blob.
 * @param {Blob} blob
 * @param {string} filename
 */
export function downloadPNG(blob, filename) {
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

function _computeExportBounds(worldEl, viewportEl) {
  const items = worldEl.querySelectorAll('.canvas-item');
  if (!items.length) {
    return { minX: 0, minY: 0, maxX: 800, maxY: 600, width: 800, height: 600 };
  }

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  const PADDING = 40;

  items.forEach(el => {
    const x = parseFloat(el.dataset.x) || 0;
    const y = parseFloat(el.dataset.y) || 0;
    const w = el.offsetWidth || parseFloat(el.dataset.width) || 320;
    const h = el.offsetHeight || parseFloat(el.dataset.height) || 200;
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x + w);
    maxY = Math.max(maxY, y + h);
  });

  minX -= PADDING;
  minY -= PADDING;
  maxX += PADDING;
  maxY += PADDING;

  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

function _canvasToBlob(canvas, type = 'image/png', quality = 0.95) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Canvas toBlob returned null'));
      },
      type,
      quality
    );
  });
}

function _roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function _truncate(str, maxLen) {
  if (!str) return '';
  return str.length > maxLen ? str.slice(0, maxLen - 1) + '…' : str;
}
