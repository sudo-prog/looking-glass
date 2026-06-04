import { BaseCard } from '../cards/BaseCard.js';

export class GroupCard extends BaseCard {
  constructor(item) {
    super(item);
    this.collapsed = item.meta?.collapsed || false;
  }

  render() {
    const el = super.render();
    el.classList.add('card-group');
    if (this.collapsed) el.classList.add('group-collapsed');

    // Header with toggle
    const header = el.querySelector('.card-header');
    if (header) {
      header.innerHTML = `
        <span class="group-toggle">${this.collapsed ? '▸' : '▾'}</span>
        <span class="group-icon">⊞</span>
        <span class="group-title">${this.escapeHtml(this.item.content.title || 'Group')}</span>
        <span class="group-count">(${this.item.meta?.child_count || 0})</span>
      `;

      header.querySelector('.group-toggle').addEventListener('click', (e) => {
        e.stopPropagation();
        el.dispatchEvent(new CustomEvent('group-toggle', { detail: { item: this.item }, bubbles: true }));
      });

      // Double-click to rename
      header.addEventListener('dblclick', (e) => {
        e.stopPropagation();
        const name = prompt('Group name:', this.item.content.title || 'Group');
        if (name !== null) {
          this.item.content.title = name;
          header.querySelector('.group-title').textContent = name;
          el.dispatchEvent(new CustomEvent('group-rename', { detail: { item: this.item }, bubbles: true }));
        }
      });
    }

    // Body
    const body = el.querySelector('.card-body');
    if (body) {
      body.className = 'card-body group-body';
      body.innerHTML = '';
      if (this.collapsed) {
        body.innerHTML = '<div class="group-collapsed-hint">Click ▸ to expand</div>';
      }
    }

    this.el = el;
    return el;
  }

  setCollapsed(collapsed) {
    this.collapsed = collapsed;
    if (this.el) {
      this.el.classList.toggle('group-collapsed', collapsed);
      const toggle = this.el.querySelector('.group-toggle');
      if (toggle) toggle.textContent = collapsed ? '▸' : '▾';
      const body = this.el.querySelector('.group-body');
      if (body) {
        body.innerHTML = collapsed ? '<div class="group-collapsed-hint">Click ▸ to expand</div>' : '';
      }
    }
  }
}
