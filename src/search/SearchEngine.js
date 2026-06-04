/**
 * LOOKING GLASS — Search Engine
 * Full-text search across all canvas items using Fuse.js.
 */
import Fuse from 'fuse.js';

export class SearchEngine {
  constructor() {
    this.fuse = null;
    this.items = [];
    this.lastQuery = '';
    this.lastResults = [];
  }

  /**
   * Index items for searching.
   * @param {Array} items
   */
  index(items) {
    this.items = items;
    this.fuse = new Fuse(items, {
      threshold: 0.3,
      distance: 100,
      includeScore: true,
      includeMatches: true,
      keys: [
        { name: 'content.title', weight: 0.3 },
        { name: 'content.description', weight: 0.2 },
        { name: 'content.url', weight: 0.15 },
        { name: 'content.text', weight: 0.2 },
        { name: 'meta.tags', weight: 0.1 },
        { name: 'meta.domain', weight: 0.05 },
      ],
    });
  }

  /**
   * Search items.
   * @param {string} query
   * @returns {{ results: Array, ids: Set, count: number }}
   */
  search(query) {
    this.lastQuery = query;
    if (!query || !this.fuse) {
      this.lastResults = [];
      return { results: [], ids: new Set(), count: 0 };
    }

    const fuseResults = this.fuse.search(query);
    this.lastResults = fuseResults;
    const ids = new Set(fuseResults.map(r => r.item.id));

    return {
      results: fuseResults,
      ids,
      count: fuseResults.length,
    };
  }

  /**
   * Check if an item matches the last search.
   */
  isMatch(itemId) {
    if (!this.lastQuery) return true;
    return this.lastResults.some(r => r.item.id === itemId);
  }

  /**
   * Clear search.
   */
  clear() {
    this.lastQuery = '';
    this.lastResults = [];
  }
}
