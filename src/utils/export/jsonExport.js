/**
 * LOOKING GLASS — JSON Export
 * Full project state export/import. Produces pretty-printed, re-importable JSON.
 */

export const JSON_EXPORT_VERSION = '0.3.0';

/**
 * Build a complete export payload from the current app state.
 * @param {object} canvas      - Current canvas state (from CANVAS_STATE_SCHEMA)
 * @param {Array}  allCanvases - All canvases (for multi-canvas spaces)
 * @param {object} [options]
 * @param {string} [options.name]   - Export file name hint
 * @param {boolean} [options.pretty=true] - Pretty-print JSON
 * @returns {string} JSON string
 */
export function exportToJSON(canvas, allCanvases, options = {}) {
  const { name = 'looking-glass-export', pretty = true } = options;

  const payload = {
    version: JSON_EXPORT_VERSION,
    exported_at: new Date().toISOString(),
    name,
    active_canvas_id: canvas.id,
    canvases: (allCanvases || [canvas]).map(c => ({
      id: c.id,
      name: c.name,
      created_at: c.created_at,
      updated_at: c.updated_at,
      viewport: c.viewport,
      items: (c.items || []).map(item => ({
        id: item.id,
        type: item.type,
        created_at: item.created_at,
        updated_at: item.updated_at,
        x: item.x,
        y: item.y,
        width: item.width,
        height: item.height,
        rotation: item.rotation || 0,
        z_index: item.z_index || 0,
        content: { ...item.content },
        meta: { ...item.meta },
        style: item.style ? { ...item.style } : null,
      })),
    })),
  };

  return pretty ? JSON.stringify(payload, null, 2) : JSON.stringify(payload);
}

/**
 * Validate and normalize an imported JSON payload.
 * @param {string} jsonString
 * @returns {{ ok: boolean, data?: object, error?: string }}
 */
export function validateImportJSON(jsonString) {
  let data;
  try {
    data = JSON.parse(jsonString);
  } catch {
    return { ok: false, error: 'Invalid JSON' };
  }

  if (!data || typeof data !== 'object') {
    return { ok: false, error: 'Not a JSON object' };
  }

  // Accept both v0.1 single-canvas and v0.3 multi-canvas formats
  const isV01 = data.version && data.version.startsWith('0.1') && data.items;
  const isV03 = data.version && data.version.startsWith('0.3') && data.canvases;

  if (!isV01 && !isV03) {
    return { ok: false, error: `Unsupported export version: ${data.version || 'unknown'}` };
  }

  return { ok: true, data };
}

/**
 * Convert a v0.1 single-canvas export to v0.3 multi-canvas format.
 * @param {object} v01Data
 * @returns {object} v0.3 payload
 */
export function migrateV01ToV03(v01Data) {
  return {
    version: JSON_EXPORT_VERSION,
    exported_at: new Date().toISOString(),
    name: v01Data.name || 'migrated-export',
    active_canvas_id: v01Data.id,
    canvases: [{
      id: v01Data.id,
      name: v01Data.name || 'My Canvas',
      created_at: v01Data.created_at || Date.now(),
      updated_at: Date.now(),
      viewport: v01Data.viewport || { x: 0, y: 0, scale: 1 },
      items: v01Data.items || [],
    }],
  };
}

/**
 * Download a JSON string as a file.
 * @param {string} jsonString
 * @param {string} [filename]
 */
export function downloadJSON(jsonString, filename) {
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename || 'looking-glass-export'}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
