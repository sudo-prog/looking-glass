/**
 * LOOKING GLASS — CANONICAL ITEM SCHEMA v0.4
 * Single source of truth. The root src/schema.js is a stale duplicate — delete it.
 * All canvas items conform to this shape.
 * Extend via `meta` and `style` — never break base fields.
 */

export const ITEM_TYPES = {
  BOOKMARK: 'bookmark',
  WEB_CLIP: 'web_clip',
  NOTE:     'note',
  IMAGE:    'image',
  VIDEO:    'video',
  AUDIO:    'audio',
  PDF:      'pdf',
  WEB_CLIP_SCREENSHOT: 'web_clip_screenshot',
  GROUP:    'group',
  STACK:    'stack',
  FOLDER:   'folder',
};

export const createItem = (overrides = {}) => {
  // Deep-merge content / meta / style so partial overrides don't lose base keys
  const base = {
    id:         crypto.randomUUID(),
    type:       ITEM_TYPES.WEB_CLIP,
    canvas_id:  null,
    created_at: Date.now(),
    updated_at: Date.now(),
    x:          0,
    y:          0,
    width:      320,
    height:     null,
    rotation:   0,
    z_index:    0,
    content: {
      title:       '',
      description: '',
      url:         null,
      image_url:   null,
      text:        null,
      file_path:   null,
      embed_html:  null,
    },
    meta: {
      source:       'manual',
      tags:         [],
      color:        null,
      pinned:       false,
      archived:     false,
      group_id:     null,
      twitter_id:   null,
      domain:       null,
      read_at:      null,
      fetch_status: 'pending',
    },
    style: {
      background:  null,
      text_color:  null,
      font_size:   null,
      opacity:     1,
    },
  };

  const { content: oc, meta: om, style: os, ...rest } = overrides;
  return {
    ...base,
    ...rest,
    content: { ...base.content, ...(oc || {}) },
    meta:    { ...base.meta,    ...(om || {}) },
    style:   { ...base.style,   ...(os || {}) },
  };
};

export const CANVAS_STATE_SCHEMA = {
  version:    '0.4.0',
  id:         '',
  name:       'My Canvas',
  created_at: Date.now(),
  updated_at: Date.now(),
  viewport:   { x: 0, y: 0, scale: 1 },
  items:      [],
};