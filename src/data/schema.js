/**
 * LOOKING GLASS — CANONICAL ITEM SCHEMA v0.1
 * All canvas items conform to this shape.
 * Extend via `meta` and `style` — never break base fields.
 */

export const ITEM_TYPES = {
  BOOKMARK: 'bookmark',
  WEB_CLIP: 'web_clip',
  NOTE: 'note',
  IMAGE: 'image',
  VIDEO: 'video',
  PDF: 'pdf',
  GROUP: 'group',
  STACK: 'stack',
  FOLDER: 'folder',
};

export const createItem = (overrides = {}) => ({
  id: crypto.randomUUID(),
  type: ITEM_TYPES.WEB_CLIP,
  created_at: Date.now(),
  updated_at: Date.now(),
  x: 0,
  y: 0,
  width: 320,
  height: null,
  rotation: 0,
  z_index: 0,
  content: {
    title: '',
    description: '',
    url: null,
    image_url: null,
    text: null,
    file_path: null,
    embed_html: null,
  },
  meta: {
    source: 'manual',
    tags: [],
    color: null,
    pinned: false,
    archived: false,
    group_id: null,
    twitter_id: null,
    domain: null,
    read_at: null,
    fetch_status: 'pending',
  },
  style: {
    background: null,
    text_color: null,
    font_size: null,
    opacity: 1,
  },
  ...overrides,
});

export const CANVAS_STATE_SCHEMA = {
  version: '0.1.0',
  id: '',
  name: 'My Canvas',
  created_at: Date.now(),
  updated_at: Date.now(),
  viewport: { x: 0, y: 0, scale: 1 },
  items: [],
};
