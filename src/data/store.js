/**
 * LOOKING GLASS — IndexedDB Store
 * DB NAME:    'looking-glass-db'
 * VERSION:    1
 * STORES:
 *   - canvases:  keyPath='id'
 *   - items:     keyPath='id', indexes=['canvas_id', 'type', 'meta.tags']
 *   - blobs:     keyPath='id'
 */

const DB_NAME = 'looking-glass-db';
const DB_VERSION = 1;

let db = null;

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('canvases')) {
        db.createObjectStore('canvases', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('items')) {
        const itemStore = db.createObjectStore('items', { keyPath: 'id' });
        itemStore.createIndex('canvas_id', 'canvas_id', { unique: false });
        itemStore.createIndex('type', 'type', { unique: false });
      }
      if (!db.objectStoreNames.contains('blobs')) {
        db.createObjectStore('blobs', { keyPath: 'id' });
      }
    };
    request.onsuccess = (e) => { db = e.target.result; resolve(db); };
    request.onerror = (e) => reject(e.target.error);
  });
}

async function getDB() {
  if (db) return db;
  return openDB();
}

function tx(storeName, mode = 'readonly') {
  return getDB().then(db => db.transaction(storeName, mode).objectStore(storeName));
}

function reqPromise(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export const store = {
  async init() { return openDB(); },

  async getCanvas(id) {
    const s = await tx('canvases');
    return reqPromise(s.get(id));
  },

  async saveCanvas(state) {
    const s = await tx('canvases', 'readwrite');
    return reqPromise(s.put(state));
  },

  async listCanvases() {
    const s = await tx('canvases');
    return reqPromise(s.getAll());
  },

  async getItem(id) {
    const s = await tx('items');
    return reqPromise(s.get(id));
  },

  async upsertItem(item) {
    const s = await tx('items', 'readwrite');
    return reqPromise(s.put(item));
  },

  async deleteItem(id) {
    const s = await tx('items', 'readwrite');
    return reqPromise(s.delete(id));
  },

  async bulkImport(items) {
    const s = await tx('items', 'readwrite');
    return Promise.all(items.map(item => reqPromise(s.put(item))));
  },

  async exportCanvas(canvasId) {
    const s = await tx('items');
    const index = s.index('canvas_id');
    const items = reqPromise(index.getAll(canvasId));
    return items;
  },
};
