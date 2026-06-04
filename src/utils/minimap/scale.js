/**
 * LOOKING GLASS — Minimap Scale Utilities
 * Coordinate transforms between world space and minimap space.
 */

/**
 * Compute the bounding box of all canvas items.
 * @param {HTMLElement} worldEl - The #canvas-world element
 * @returns {{ minX, minY, maxX, maxY, width, height }}
 */
export function computeContentBounds(worldEl) {
  const items = worldEl.querySelectorAll('.canvas-item');
  if (!items.length) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 };
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

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

  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

/**
 * Compute the scale factor to fit content bounds into a minimap of given size.
 * @param {{ width, height }} contentBounds
 * @param {number} minimapWidth
 * @param {number} minimapHeight
 * @param {number} padding - px padding around the content
 * @returns {number} scale factor
 */
export function computeMinimapScale(contentBounds, minimapWidth, minimapHeight, padding = 10) {
  if (contentBounds.width === 0 || contentBounds.height === 0) return 1;
  const availW = minimapWidth - padding * 2;
  const availH = minimapHeight - padding * 2;
  return Math.min(availW / contentBounds.width, availH / contentBounds.height);
}

/**
 * Convert a world-space rectangle to minimap-space pixel coordinates.
 */
export function worldToMinimap(wx, wy, contentBounds, minimapScale, padding = 10) {
  return {
    x: (wx - contentBounds.minX) * minimapScale + padding,
    y: (wy - contentBounds.minY) * minimapScale + padding,
  };
}

/**
 * Convert a minimap pixel position back to world coordinates.
 */
export function minimapToWorld(mx, my, contentBounds, minimapScale, padding = 10) {
  return {
    x: (mx - padding) / minimapScale + contentBounds.minX,
    y: (my - padding) / minimapScale + contentBounds.minY,
  };
}

/**
 * Compute viewport coverage ratio (how much of the total content area
 * the current viewport covers). Returns 0..1.
 * @param {{ left, top, right, bottom }} viewportBounds - in world coords
 * @param {{ width, height }} contentBounds
 * @returns {number} 0..1 coverage ratio
 */
export function viewportCoverage(viewportBounds, contentBounds) {
  if (contentBounds.width === 0 || contentBounds.height === 0) return 1;

  const vpWidth = viewportBounds.right - viewportBounds.left;
  const vpHeight = viewportBounds.bottom - viewportBounds.top;

  const coverX = Math.min(vpWidth / contentBounds.width, 1);
  const coverY = Math.min(vpHeight / contentBounds.height, 1);

  return coverX * coverY;
}
