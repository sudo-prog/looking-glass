import { BaseCard } from './BaseCard.js';

export class WebClipCard extends BaseCard {
  render() {
    const el = super.render();
    el.classList.add('card-web-clip');
    return el;
  }
}
