/**
 * LOOKING GLASS — SQLite Store (sql.js)
 * Replaces IndexedDB with client-side SQLite
 */

import initSqlJs from 'sql.js';

let db = null;
let dbName = 'looking-glass';

async function getSQL() {
  return await initSqlJs({
    locateFile: (file) => `https://sql.js.org/dist/${file}`,
  });
}

export async function initDB() {
  const SQL = await getSQL();

  // Try to load from localStorage backup
  const saved = localStorage.getItem(`sqlite_${dbName}`);
  if (saved) {
    const bytes = Uint8Array.from(atob(saved), (c) => c.charCodeAt(0));
    db = new SQL.Database(bytes);
  } else {
    db = new SQL.Database();
    createTables();
  }

  return db;
}

function createTables() {
  db.run(`
    CREATE TABLE IF NOT EXISTS canvases (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL DEFAULT 'My Canvas',
      viewport_x REAL DEFAULT 0,
      viewport_y REAL DEFAULT 0,
      viewport_scale REAL DEFAULT 1,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS items (
      id TEXT PRIMARY KEY,
      canvas_id TEXT NOT NULL,
      type TEXT NOT NULL,
      x REAL DEFAULT 0,
      y REAL DEFAULT 0,
      width REAL DEFAULT 320,
      height REAL,
      rotation REAL DEFAULT 0,
      z_index INTEGER DEFAULT 0,
      title TEXT DEFAULT '',
      description TEXT DEFAULT '',
      url TEXT,
      image_url TEXT,
      text_content TEXT,
      file_path TEXT,
      embed_html TEXT,
      source TEXT DEFAULT 'manual',
      tags TEXT DEFAULT '[]',
      color TEXT,
      pinned INTEGER DEFAULT 0,
      archived INTEGER DEFAULT 0,
      group_id TEXT,
      twitter_id TEXT,
      domain TEXT,
      read_at INTEGER,
      fetch_status TEXT DEFAULT 'pending',
      bg_color TEXT,
      text_color TEXT,
      font_size REAL,
      opacity REAL DEFAULT 1,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (canvas_id) REFERENCES canvases(id)
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS blobs (
      id TEXT PRIMARY KEY,
      data BLOB NOT NULL,
      created_at INTEGER NOT NULL
    );
  `);

  db.run(`
    CREATE INDEX IF NOT EXISTS idx_items_canvas ON items(canvas_id);
  `);
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_items_type ON items(type);
  `);
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_items_group ON items(group_id);
  `);
}

function saveToLocalStorage() {
  if (!db) return;
  const data = db.export();
  const binary = btoa(String.fromCharCode(...data));
  localStorage.setItem(`sqlite_${dbName}`, binary);
}

function rowToItem(row) {
  if (!row) return null;
  return {
    id: row[0],
    canvas_id: row[1],
    type: row[2],
    x: row[3],
    y: row[4],
    width: row[5],
    height: row[6],
    rotation: row[7],
    z_index: row[8],
    content: {
      title: row[9] || '',
      description: row[10] || '',
      url: row[11] || null,
      image_url: row[12] || null,
      text: row[13] || null,
      file_path: row[14] || null,
      embed_html: row[15] || null,
    },
    meta: {
      source: row[16] || 'manual',
      tags: JSON.parse(row[17] || '[]'),
      color: row[18] || null,
      pinned: !!row[19],
      archived: !!row[20],
      group_id: row[21] || null,
      twitter_id: row[22] || null,
      domain: row[23] || null,
      read_at: row[24] || null,
      fetch_status: row[25] || 'pending',
    },
    style: {
      background: row[26] || null,
      text_color: row[27] || null,
      font_size: row[28] || null,
      opacity: row[29] ?? 1,
    },
    created_at: row[30],
    updated_at: row[31],
  };
}

function itemToParams(item) {
  return [
    item.id,
    item.canvas_id || '',
    item.type,
    item.x || 0,
    item.y || 0,
    item.width || 320,
    item.height || null,
    item.rotation || 0,
    item.z_index || 0,
    item.content?.title || '',
    item.content?.description || '',
    item.content?.url || null,
    item.content?.image_url || null,
    item.content?.text || null,
    item.content?.file_path || null,
    item.content?.embed_html || null,
    item.meta?.source || 'manual',
    JSON.stringify(item.meta?.tags || []),
    item.meta?.color || null,
    item.meta?.pinned ? 1 : 0,
    item.meta?.archived ? 1 : 0,
    item.meta?.group_id || null,
    item.meta?.twitter_id || null,
    item.meta?.domain || null,
    item.meta?.read_at || null,
    item.meta?.fetch_status || 'pending',
    item.style?.background || null,
    item.style?.text_color || null,
    item.style?.font_size || null,
    item.style?.opacity ?? 1,
    item.created_at || Date.now(),
    item.updated_at || Date.now(),
  ];
}

export const sqliteStore = {
  async init() {
    return initDB();
  },

  // Canvases
  async createCanvas(name = 'My Canvas') {
    const id = crypto.randomUUID();
    const now = Date.now();
    db.run(
      `INSERT INTO canvases (id, name, created_at, updated_at) VALUES (?, ?, ?, ?)`,
      [id, name, now, now]
    );
    saveToLocalStorage();
    return { id, name, viewport: { x: 0, y: 0, scale: 1 }, created_at: now, updated_at: now };
  },

  async getCanvas(id) {
    const stmt = db.prepare('SELECT * FROM canvases WHERE id = ?');
    stmt.bind([id]);
    if (stmt.step()) {
      const row = stmt.getAsObject();
      stmt.free();
      return {
        id: row.id,
        name: row.name,
        viewport: { x: row.viewport_x, y: row.viewport_y, scale: row.viewport_scale },
        created_at: row.created_at,
        updated_at: row.updated_at,
      };
    }
    stmt.free();
    return null;
  },

  async saveCanvas(canvas) {
    db.run(
      `UPDATE canvases SET name=?, viewport_x=?, viewport_y=?, viewport_scale=?, updated_at=? WHERE id=?`,
      [canvas.name, canvas.viewport?.x || 0, canvas.viewport?.y || 0, canvas.viewport?.scale || 1, Date.now(), canvas.id]
    );
    saveToLocalStorage();
  },

  async listCanvases() {
    const res = db.exec('SELECT * FROM canvases ORDER BY updated_at DESC');
    if (!res.length) return [];
    const cols = res[0].columns;
    return res[0].values.map((row) => {
      const obj = {};
      cols.forEach((c, i) => (obj[c] = row[i]));
      return {
        id: obj.id,
        name: obj.name,
        viewport: { x: obj.viewport_x, y: obj.viewport_y, scale: obj.viewport_scale },
        created_at: obj.created_at,
        updated_at: obj.updated_at,
      };
    });
  },

  // Items
  async addItem(item) {
    const params = itemToParams(item);
    db.run(
      `INSERT INTO items (id, canvas_id, type, x, y, width, height, rotation, z_index,
        title, description, url, image_url, text_content, file_path, embed_html,
        source, tags, color, pinned, archived, group_id, twitter_id, domain, read_at, fetch_status,
        bg_color, text_color, font_size, opacity, created_at, updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      params
    );
    saveToLocalStorage();
    return item;
  },

  async updateItem(item) {
    const params = itemToParams(item);
    db.run(
      `UPDATE items SET
        canvas_id=?, type=?, x=?, y=?, width=?, height=?, rotation=?, z_index=?,
        title=?, description=?, url=?, image_url=?, text_content=?, file_path=?, embed_html=?,
        source=?, tags=?, color=?, pinned=?, archived=?, group_id=?, twitter_id=?, domain=?, read_at=?, fetch_status=?,
        bg_color=?, text_color=?, font_size=?, opacity=?, updated_at=?
       WHERE id=?`,
      [...params.slice(1), item.id]
    );
    saveToLocalStorage();
    return item;
  },

  async deleteItem(id) {
    db.run('DELETE FROM items WHERE id = ?', [id]);
    saveToLocalStorage();
  },

  async getItems(canvasId) {
    const stmt = db.prepare('SELECT * FROM items WHERE canvas_id = ? AND archived = 0');
    stmt.bind([canvasId]);
    const items = [];
    while (stmt.step()) {
      items.push(rowToItem(stmt.getAsObject()));
    }
    stmt.free();
    return items;
  },

  async getAllItems() {
    const res = db.exec('SELECT * FROM items WHERE archived = 0');
    if (!res.length) return [];
    return res[0].values.map((row) => rowToItem(row));
  },

  async bulkImport(items) {
    const stmt = db.prepare(
      `INSERT OR REPLACE INTO items (id, canvas_id, type, x, y, width, height, rotation, z_index,
        title, description, url, image_url, text_content, file_path, embed_html,
        source, tags, color, pinned, archived, group_id, twitter_id, domain, read_at, fetch_status,
        bg_color, text_color, font_size, opacity, created_at, updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
    );
    for (const item of items) {
      stmt.run(itemToParams(item));
    }
    stmt.free();
    saveToLocalStorage();
  },

  // Blobs
  async saveBlob(id, dataUrl) {
    db.run('INSERT OR REPLACE INTO blobs (id, data, created_at) VALUES (?, ?, ?)', [id, dataUrl, Date.now()]);
    saveToLocalStorage();
  },

  async getBlob(id) {
    const stmt = db.prepare('SELECT data FROM blobs WHERE id = ?');
    stmt.bind([id]);
    if (stmt.step()) {
      const data = stmt.getAsObject().data;
      stmt.free();
      return data;
    }
    stmt.free();
    return null;
  },

  // Export
  async exportAll() {
    const canvases = await this.listCanvases();
    const items = await this.getAllItems();
    return { canvases, items, exported_at: Date.now() };
  },

  // Search
  async search(query) {
    const q = `%${query.toLowerCase()}%`;
    const res = db.exec(
      `SELECT * FROM items WHERE archived = 0 AND (
        LOWER(title) LIKE ? OR LOWER(description) LIKE ? OR LOWER(text_content) LIKE ? OR LOWER(url) LIKE ?
      )`,
      [q, q, q, q]
    );
    if (!res.length) return [];
    return res[0].values.map((row) => rowToItem(row));
  },
};
