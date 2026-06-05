export class Toolbar {
  constructor(container, actions = {}) {
    this.container = container;
    this.actions = actions;
    this.el = null;
  }

  render() {
    const el = document.createElement('div');
    el.className = 'toolbar';
    el.innerHTML = `
      <button class="toolbar-btn" data-action="add-url" title="Add URL">🔗</button>
      <button class="toolbar-btn" data-action="add-note" title="New Note (N)">📝</button>
      <button class="toolbar-btn" data-action="add-image" title="Add Image">🖼</button>
      <button class="toolbar-btn" data-action="delete" title="Delete Selected (Del)">🗑</button>
      <div class="toolbar-separator"></div>
      <div class="toolbar-search-wrap">
        <button class="toolbar-btn toolbar-search-toggle" data-action="search" title="Search (Ctrl+K)">🔍</button>
        <input type="text" class="toolbar-search-input" placeholder="Search..." data-action="search-input" />
        <button class="toolbar-btn toolbar-search-clear" data-action="search-clear" title="Clear search">✕</button>
      </div>
      <div class="toolbar-separator"></div>
      <button class="toolbar-btn" data-action="undo" title="Undo (Ctrl+Z)">↩</button>
      <button class="toolbar-btn" data-action="redo" title="Redo (Ctrl+Shift+Z)">↪</button>
      <div class="toolbar-separator"></div>
      <button class="toolbar-btn" data-action="group-selected" title="Group Selected (Ctrl+G)">⊞</button>
      <div class="toolbar-separator"></div>
      <button class="toolbar-btn" data-action="zoom-in" title="Zoom In (+)">+</button>
      <button class="toolbar-btn" data-action="zoom-out" title="Zoom Out (−)">−</button>
      <button class="toolbar-btn" data-action="fit" title="Fit to Content">⊡</button>
      <span class="toolbar-zoom-indicator" title="Zoom level">100%</span>
      <div class="toolbar-separator"></div>
      <button class="toolbar-btn" data-action="export" title="Export">↓</button>
      <button class="toolbar-btn" data-action="import" title="Import">↑</button>
    `;

    el.addEventListener('click', (e) => {
      const btn = e.target.closest('.toolbar-btn');
      if (!btn) return;
      const action = btn.dataset.action;
      if (action === 'search') {
        // Toggle search input visibility
        const wrap = el.querySelector('.toolbar-search-wrap');
        const input = el.querySelector('.toolbar-search-input');
        const toggle = el.querySelector('.toolbar-search-toggle');
        if (wrap && input && toggle) {
          wrap.classList.add('active');
          toggle.classList.add('hidden');
          input.focus();
        }
        return;
      }
      if (action === 'search-clear') {
        const input = el.querySelector('.toolbar-search-input');
        const wrap = el.querySelector('.toolbar-search-wrap');
        const toggle = el.querySelector('.toolbar-search-toggle');
        if (input) input.value = '';
        if (wrap) wrap.classList.remove('active');
        if (toggle) toggle.classList.remove('hidden');
        if (this.actions['search-clear']) this.actions['search-clear']();
        return;
      }
      if (this.actions[action]) this.actions[action]();
    });

    // Search input handler
    const searchInput = el.querySelector('.toolbar-search-input');
    if (searchInput) {
      let searchTimeout;
      searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
          if (this.actions['search']) this.actions['search'](e.target.value);
        }, 150);
      });
      searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          const wrap = el.querySelector('.toolbar-search-wrap');
          const toggle = el.querySelector('.toolbar-search-toggle');
          searchInput.value = '';
          if (wrap) wrap.classList.remove('active');
          if (toggle) toggle.classList.remove('hidden');
          if (this.actions['search-clear']) this.actions['search-clear']();
        }
      });
    }

    this.el = el;
    return el;
  }

  updateZoomIndicator(scale) {
    if (this.el) {
      const indicator = this.el.querySelector('.toolbar-zoom-indicator');
      if (indicator) {
        indicator.textContent = `${Math.round(scale * 100)}%`;
      }
    }
  }
}
