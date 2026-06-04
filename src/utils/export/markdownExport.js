/**
 * LOOKING GLASS — Markdown Export
 * Extract text elements and image references from canvases into Markdown.
 */

/**
 * Export canvases as Markdown.
 *
 * @param {object} options
 * @param {Array}  options.canvases       - Array of canvas state objects
 * @param {string} [options.filename='looking-glass.md']
 * @param {object} [options.format]
 * @param {boolean} [options.format.includeMetadata=true] - Include frontmatter
 * @param {boolean} [options.format.includeImages=true]   - Include image references
 * @param {boolean} [options.format.includeLinks=true]    - Include URLs
 * @param {boolean} [options.format.groupByCanvas=true]   - Group items under canvas headings
 * @param {function} [options.onProgress] - Callback(phase, progress)
 * @returns {Promise<{ ok: boolean, markdown?: string, error?: string }>}
 */
export async function exportToMarkdown(options) {
  const {
    canvases,
    filename = 'looking-glass.md',
    format = {},
    onProgress,
  } = options;

  const {
    includeMetadata = true,
    includeImages = true,
    includeLinks = true,
    groupByCanvas = true,
  } = format;

  if (!canvases || !canvases.length) {
    return { ok: false, error: 'No canvases to export' };
  }

  onProgress?.('building', 0);

  const lines = [];

  // Frontmatter
  if (includeMetadata) {
    lines.push('---');
    lines.push(`title: "${_escapeYaml(canvases[0]?.name || 'Looking Glass Export')}"`);
    lines.push(`exported: "${new Date().toISOString()}"`);
    lines.push(`canvases: ${canvases.length}`);
    lines.push(`total_items: ${canvases.reduce((sum, c) => sum + (c.items?.length || 0), 0)}`);
    lines.push('---');
    lines.push('');
  }

  canvases.forEach((canvas, idx) => {
    onProgress?.('canvas', Math.round((idx / canvases.length) * 80));

    if (groupByCanvas) {
      lines.push(`# ${_escapeMd(canvas.name || `Canvas ${idx + 1}`)}`);
      lines.push('');
    }

    const items = canvas.items || [];
    if (!items.length) {
      lines.push('_No items on this canvas._');
      lines.push('');
      return;
    }

    items.forEach(item => {
      const title = item.content?.title || 'Untitled';
      const type = item.type || 'item';

      // Item heading
      lines.push(`## ${_escapeMd(title)}`);
      lines.push('');

      // Type badge
      lines.push(`**Type:** \`${type}\``);
      lines.push('');

      // Description
      if (item.content?.description) {
        lines.push(_escapeMd(item.content.description));
        lines.push('');
      }

      // Text content
      if (item.content?.text) {
        lines.push(_escapeMd(item.content.text));
        lines.push('');
      }

      // Image reference
      if (includeImages && item.content?.image_url) {
        lines.push(`![${_escapeMd(title)}](${item.content.image_url})`);
        lines.push('');
      }

      // URL / link
      if (includeLinks && item.content?.url) {
        lines.push(`**Link:** [${_escapeMd(item.content.url)}](${item.content.url})`);
        lines.push('');
      }

      // Metadata
      const metaParts = [];
      if (item.meta?.domain) metaParts.push(`domain: ${item.meta.domain}`);
      if (item.meta?.source) metaParts.push(`source: ${item.meta.source}`);
      if (item.meta?.tags?.length) metaParts.push(`tags: ${item.meta.tags.join(', ')}`);
      if (item.created_at) metaParts.push(`created: ${new Date(item.created_at).toISOString()}`);

      if (metaParts.length) {
        lines.push(`> ${metaParts.join(' | ')}`);
        lines.push('');
      }

      lines.push('---');
      lines.push('');
    });
  });

  onProgress?.('finalizing', 100);

  const markdown = lines.join('\n');
  return { ok: true, markdown };
}

/**
 * Download a Markdown string as a file.
 * @param {string} markdown
 * @param {string} filename
 */
export function downloadMarkdown(markdown, filename) {
  const blob = new Blob([markdown], { type: 'text/markdown' });
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

function _escapeMd(str) {
  if (!str) return '';
  // Escape markdown special chars in headings
  return str.replace(/[#*`[\]]/g, '\\$&');
}

function _escapeYaml(str) {
  if (!str) return '';
  return str.replace(/"/g, '\\"');
}
