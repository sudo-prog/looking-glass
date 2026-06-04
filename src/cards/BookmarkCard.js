import { BaseCard } from './BaseCard.js';

export class BookmarkCard extends BaseCard {
  render() {
    const el = super.render();
    el.classList.add('card-bookmark');
    // Add bookmark-specific rendering
    if (this.item.meta.twitter_id) {
      const badge = document.createElement('span');
      badge.className = 'card-badge bookmark-badge';
      badge.textContent = '𝕏';
      el.querySelector('.card-header').appendChild(badge);
    }
    return el;
  }
}
