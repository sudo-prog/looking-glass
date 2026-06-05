import { BaseCard } from './BaseCard.js';
import { store } from '../data/store.js';

export class ImageCard extends BaseCard {
  constructor(item) {
    super(item);
    this.blobId = item.meta?.blob_id || null;
  }

  render() {
    const el = super.render();
    el.classList.add('card-image');

    // Update header
    const header = el.querySelector('.card-header');
    if (header) {
      const icon = document.createElement('span');
      icon.className = 'card-image-icon';
      icon.textContent = '🖼';
      header.insertBefore(icon, header.firstChild);
    }

    // Update title
    const titleEl = el.querySelector('.card-title');
    if (titleEl) {
      titleEl.textContent = this.item.content.title || this.item.content.file_path || 'Image';
    }

    // Replace body with image
    const body = el.querySelector('.card-body');
    if (body) {
      body.innerHTML = '';
      body.className = 'card-body card-image-body';

      if (this.item.content.image_url) {
        const img = document.createElement('img');
        img.src = this.item.content.image_url;
        img.alt = this.item.content.title || 'Image';
        img.loading = 'lazy';
        body.appendChild(img);
      } else {
        body.innerHTML = '<div class="card-image-placeholder">No image</div>';
      }
    }

    this.el = el;
    return el;
  }

  /**
   * Store an image blob and create an ImageCard item.
   * @param {File} file
   * @param {number} x
   * @param {number} y
   * @returns {Promise<object>} item
   */
  static async fromFile(file, x = 0, y = 0) {
    const blobId = crypto.randomUUID();
    const blob = new Blob([await file.arrayBuffer()], { type: file.type });
    const url = URL.createObjectURL(blob);

    // Store blob in IndexedDB
    const db = await store.init();
    const tx = db.transaction('blobs', 'readwrite');
    tx.objectStore('blobs').put({ id: blobId, blob, type: file.type });
    await new Promise((res, rej) => { tx.oncomplete = res; tx.onerror = rej; });

    const item = {
      id: crypto.randomUUID(),
      type: 'image',
      created_at: Date.now(),
      updated_at: Date.now(),
      x,
      y,
      width: 320,
      height: null,
      rotation: 0,
      z_index: 0,
      content: {
        title: file.name,
        description: '',
        url: null,
        image_url: url,
        text: null,
        file_path: file.name,
        embed_html: null,
      },
      meta: {
        source: 'file_upload',
        tags: [],
        color: null,
        pinned: false,
        archived: false,
        group_id: null,
        blob_id: blobId,
        mime_type: file.type,
        file_size: file.size,
      },
      style: { background: null, text_color: null, font_size: null, opacity: 1 },
    };

    return item;
  }
}
