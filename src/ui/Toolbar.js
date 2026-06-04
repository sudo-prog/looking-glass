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
      <button class="toolbar-btn" data-action="delete" title="Delete Selected (Del)">🗑</button>
      <div class="toolbar-separator"></div>
      <button class="toolbar-btn" data-action="zoom-in" title="Zoom In (+)">+</button>
      <button class="toolbar-btn" data-action="zoom-out" title="Zoom Out (−)">−</button>
      <button class="toolbar-btn" data-action="fit" title="Fit to Content">⊡</button>
      <div class="toolbar-separator"></div>
      <button class="toolbar-btn" data-action="export" title="Export JSON">↓</button>
      <button class="toolbar-btn" data-action="import" title="Import JSON">↑</button>
    `;

    el.addEventListener('click', (e) => {
      const btn = e.target.closest('.toolbar-btn');
      if (!btn) return;
      const action = btn.dataset.action;
      if (this.actions[action]) this.actions[action]();
    });

    this.el = el;
    return el;
  }
}
