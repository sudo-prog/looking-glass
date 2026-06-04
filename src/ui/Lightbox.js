export class Lightbox {
  constructor() {
    this.el = null;
    this.isOpen = false;
  }

  open(item) {
    if (this.isOpen) this.close();
    this.isOpen = true;

    const el = document.createElement('div');
    el.className = 'lightbox-overlay';
    el.innerHTML = `
      <div class="lightbox-content">
        <button class="lightbox-close">✕</button>
        ${item.content.image_url ? `<img src="${item.content.image_url}" alt="">` : ''}
        <h2>${item.content.title || 'Untitled'}</h2>
        <p>${item.content.description || ''}</p>
        ${item.content.url ? `<a href="${item.content.url}" target="_blank" rel="noopener">${item.content.url}</a>` : ''}
      </div>
    `;

    el.addEventListener('click', (e) => {
      if (e.target === el || e.target.classList.contains('lightbox-close')) {
        this.close();
      }
    });

    document.addEventListener('keydown', this._onKey = (e) => {
      if (e.key === 'Escape') this.close();
    });

    document.body.appendChild(el);
    this.el = el;
  }

  close() {
    if (!this.isOpen) return;
    this.isOpen = false;
    if (this.el) this.el.remove();
    this.el = null;
    document.removeEventListener('keydown', this._onKey);
  }
}
