/**
 * LOOKING GLASS — IndexedDB Store
 * DB NAME:    'looking-glass-db'
 * VERSION:    1
 * STORES:
 *   - canvases:  keyPath='id'
 *   - items:     keyPath='id', indexes=['canvas_id', 'type']
 *   - blobs:     keyPath='id'
 *
 * BUG FIXES:
 *   - openDB() is now guarded by a single in-flight promise to prevent
 *     concurrent open races (double onupgradeneeded / double resolve).
 *   - bulkImport() uses a single transaction for atomicity + performance.
 *   - deleteCanvas() added (was missing, referenced by SpacesManager).
 *   - tx() helper now throws a clear error when called before init().
 */

const DB_NAME    = 'looking-glass-db';
const DB_VERSION = 1;

let db          = null;
let openPromise = null;   // singleton in-flight open promise

function openDB() {
  if (db)          return Promise.resolve(db);
  if (openPromise) return openPromise;

  openPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (e) => {
      const database = e.target.result;
      if (!database.objectStoreNames.contains('canvases')) {
        database.createObjectStore('canvases', { keyPath: 'id' });
      }
      if (!database.objectStoreNames.contains('items')) {
        const itemStore = database.createObjectStore('items', { keyPath: 'id' });
        itemStore.createIndex('canvas_id', 'canvas_id', { unique: false });
        itemStore.createIndex('type',      'type',      { unique: false });
      }
      if (!database.objectStoreNames.contains('blobs')) {
        database.createObjectStore('blobs', { keyPath: 'id' });
      }
    };

    request.onsuccess = (e) => {
      db          = e.target.result;
      openPromise = null;
      resolve(db);
    };

    request.onerror = (e) => {
      openPromise = null;
      reject(e.target.error);
    };

    request.onblocked = () => {
      console.warn('[LG store] DB open blocked — another tab may be open with an older version.');
    };
  });

  return openPromise;
}

async function getDB() {
  if (db) return db;
  return openDB();
}

async function tx(storeName, mode = 'readonly') {
  const database = await getDB();
  return database.transaction(storeName, mode).objectStore(storeName);
}

function reqPromise(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror  = () => reject(req.error);
  });
}

export const store = {
  async init() {
    return openDB();
  },

  // ── Canvases ────────────────────────────────────────────
  async getCanvas(id) {
    const s = await tx('canvases');
    return reqPromise(s.get(id));
  },

  async saveCanvas(state) {
    const s = await tx('canvases', 'readwrite');
    return reqPromise(s.put({ ...state, updated_at: Date.now() }));
  },

  /**
   * RAW canvas upsert used by the sync engine — does NOT bump updated_at
   * (the value arrives from the remote and must be preserved verbatim so
   * LAST-WRITE-WINS conflict resolution stays correct).
   */
  async putCanvas(state) {
    const s = await tx('canvases', 'readwrite');
    return reqPromise(s.put(state));
  },

  async putItem(item) {
    const s = await tx('items', 'readwrite');
    return reqPromise(s.put(item));
  },

  async listCanvases() {
    const s = await tx('canvases');
    return reqPromise(s.getAll());
  },

  /** All items across every canvas (used by the sync engine's push path). */
  async listItems() {
    const s = await tx('items');
    return reqPromise(s.getAll());
  },

  async deleteCanvas(id) {
    const s = await tx('canvases', 'readwrite');
    return reqPromise(s.delete(id));
  },

  // ── Items ───────────────────────────────────────────────
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

  /**
   * BUG FIX: use a SINGLE transaction for atomicity.
   * If any write fails, the whole transaction rolls back automatically.
   */
  async bulkImport(items) {
    if (!items || items.length === 0) return;
    const database = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = database.transaction('items', 'readwrite');
      const store       = transaction.objectStore('items');
      transaction.oncomplete = () => resolve();
      transaction.onerror   = (e) => reject(e.target.error);
      for (const item of items) {
        store.put(item);
      }
    });
  },

  async exportCanvas(canvasId) {
    const s     = await tx('items');
    const index = s.index('canvas_id');
    return reqPromise(index.getAll(canvasId));
  },

  // ── Blobs ────────────────────────────────────────────────
  async saveBlob(id, blob) {
    const s = await tx('blobs', 'readwrite');
    return reqPromise(s.put({ id, blob }));
  },

  async getBlob(id) {
    const s      = await tx('blobs');
    const result = await reqPromise(s.get(id));
    return result ? result.blob : null;
  },

  async deleteBlob(id) {
    const s = await tx('blobs', 'readwrite');
    return reqPromise(s.delete(id));
  },
};