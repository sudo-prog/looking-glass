export class Sidebar {
  constructor(container, actions = {}) {
    this.container = container;
    this.actions = actions;
    this.el = null;
  }

  render() {
    const el = document.createElement('div');
    el.className = 'sidebar';
    el.innerHTML = `
      <div class="sidebar-header">
        <h1 class="sidebar-title">Looking Glass</h1>
      </div>
      <div class="sidebar-spaces">
        <h2>Spaces</h2>
        <div class="spaces-list"></div>
        <button class="add-space-btn">+ New Space</button>
      </div>
      <div class="sidebar-filters">
        <h2>Filters</h2>
        <div class="filter-group">
          <label><input type="checkbox" data-filter="bookmark" checked> Bookmarks</label>
          <label><input type="checkbox" data-filter="web_clip" checked> Web Clips</label>
          <label><input type="checkbox" data-filter="note" checked> Notes</label>
        </div>
      </div>
    `;

    const addBtn = el.querySelector('.add-space-btn');
    addBtn.addEventListener('click', () => {
      if (this.actions.addSpace) this.actions.addSpace();
    });

    this.el = el;
    return el;
  }
}
