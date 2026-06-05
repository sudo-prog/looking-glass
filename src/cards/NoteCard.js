import { BaseCard } from './BaseCard.js';
import { debounce } from '../utils/helpers.js';

export class NoteCard extends BaseCard {
  render() {
    const el = super.render();
    el.classList.add('card-note');

    // Replace body with editable area
    const body = el.querySelector('.card-body');
    if (body) body.remove();

    // Update header title
    const titleEl = el.querySelector('.card-title');
    if (titleEl) {
      const firstLine = (this.item.content.text || '').split('\n')[0].trim() || 'Note';
      titleEl.textContent = firstLine;
    }

    // Add note icon to header
    const header = el.querySelector('.card-header');
    if (header) {
      const icon = document.createElement('span');
      icon.className = 'card-note-icon';
      icon.textContent = '📝';
      header.insertBefore(icon, header.firstChild);
    }

    // Editable content area
    const editor = document.createElement('div');
    editor.className = 'card-note-editor';
    editor.contentEditable = true;
    editor.textContent = this.item.content.text || '';
    editor.dataset.placeholder = 'Type your note...';

    const save = debounce(async () => {
      if (!this.item) return;
      this.item.content.text = editor.textContent;
      this.item.updated_at = Date.now();
      // Update title from first line
      const firstLine = editor.textContent.split('\n')[0].trim() || 'Note';
      if (titleEl) titleEl.textContent = firstLine;
      // Emit save event for history manager
      el.dispatchEvent(new CustomEvent('note-save', { detail: { item: this.item }, bubbles: true }));
    }, 500);

    editor.addEventListener('input', save);
    editor.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && e.ctrlKey) {
        e.preventDefault();
        editor.blur();
      }
    });

    // Insert editor after header
    header.parentNode.insertBefore(editor, header.nextSibling);

    this.el = el;
    return el;
  }
}
