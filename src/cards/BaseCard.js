/**
 * LOOKING GLASS — Base Card
 * Base class for all card types.
 */
export class BaseCard {
  constructor(item) {
    this.item = item;
    this.el = null;
  }

  render() {
    const el = document.createElement('div');
    el.className = 'canvas-item';
    el.dataset.id = this.item.id;
    el.dataset.type = this.item.type;
    el.dataset.x = this.item.x;
    el.dataset.y = this.item.y;
    el.dataset.zIndex = this.item.z_index;
    el.style.cssText = `
      position: absolute;
      left: ${this.item.x}px;
      top: ${this.item.y}px;
      width: ${this.item.width}px;
      z-index: ${this.item.z_index};
      cursor: grab;
    `;

    el.innerHTML = `
      <div class="card-header">
        <span class="card-handle">⠿</span>
        <span class="card-title">${this.escapeHtml(this.item.content.title || 'Untitled')}</span>
      </div>
      <div class="card-body">
        ${this.item.content.image_url ? `<img src="${this.escapeHtml(this.item.content.image_url)}" alt="" loading="lazy">` : ''}
        ${this.item.content.description ? `<p class="card-desc">${this.escapeHtml(this.item.content.description)}</p>` : ''}
      </div>
      <div class="card-footer">
        ${this.item.meta.domain ? `<span class="card-domain">${this.escapeHtml(this.item.meta.domain)}</span>` : ''}
        ${this.item.content.url ? `<a href="${this.escapeHtml(this.item.content.url)}" target="_blank" rel="noopener" class="card-link">↗</a>` : ''}
      </div>
    `;

    this.el = el;
    return el;
  }

  escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  update(item) {
    this.item = item;
    if (this.el) {
      const newEl = this.render();
      this.el.replaceWith(newEl);
    }
  }

  destroy() {
    if (this.el) this.el.remove();
  }
}
