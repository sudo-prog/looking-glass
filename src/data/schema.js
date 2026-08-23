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
  FICHARIO: 'fichario',
};

/**
 * FICHÁRIO — multi-page binder with a colored side-tab rail, recreated
 * 1:1 from the source demo (32.4s capture): monospace/markdown-literal
 * page content, the WHOLE card recolors per page (not just the tab),
 * and a page popped out of a binder is just a one-page Fichário —
 * drop it onto another Fichário and it docks in as a new tab. The tab
 * rail itself only appears once a binder holds 2+ pages.
 *
 * Palette + cycle order matches the four pages seen in the source
 * video exactly: Hooks (green) → Auth (dark) → LCP (navy) → Quota (red).
 */
export const FICHARIO_COLORS = {
  green:  { bg: '#B8D9BA', text: '#17281A', muted: '#3E5C42' },
  dark:   { bg: '#1E1E1E', text: '#F2F2F2', muted: '#9A9A9A' },
  navy:   { bg: '#151B4D', text: '#F2F2F5', muted: '#9AA0C8' },
  red:    { bg: '#D71921', text: '#FFFFFF', muted: '#F3B8BB' },
  cream:  { bg: '#EFE3B8', text: '#2A2410', muted: '#6B5E33' },
  purple: { bg: '#C7ACDE', text: '#241633', muted: '#5E4A73' },
  teal:   { bg: '#8FD0C4', text: '#0D2624', muted: '#33564F' },
  orange: { bg: '#EAB07E', text: '#2E1A05', muted: '#6B4420' },
};
export const FICHARIO_COLOR_ORDER = ['green', 'dark', 'navy', 'red', 'cream', 'purple', 'teal', 'orange'];

export const FICHARIO_PAGE_KINDS = {
  REPORT: 'report', // Lane/Priority/Owner/Delivered/Result/Log — the default demo format
  STICKY: 'sticky',  // freeform note, sticky-note style
  TODO:   'todo',    // title + checklist only
  IMAGE:  'image',   // pasted/uploaded image + optional caption
};

export const createFicharioPage = (overrides = {}) => ({
  id:          crypto.randomUUID(),
  kind:        FICHARIO_PAGE_KINDS.REPORT,
  title:       'Untitled page',
  lane:        'Backlog',
  priority:    'P2',
  owner:       '',
  description: '',
  delivered:   [],
  result:      '',
  log:         [],
  color:       FICHARIO_COLOR_ORDER[0],
  imageBlobId: null,
  ...overrides,
});

export const getFicharioPageColors = (page) => FICHARIO_COLORS[page?.color] || FICHARIO_COLORS[FICHARIO_COLOR_ORDER[0]];

/**
 * Per-binder appearance overrides, stored under item.style.fichario.
 * Deep-merged with FICHARIO_STYLE_DEFAULTS via getFicharioStyle() so
 * every consumer (card, style editor) always sees a complete shape.
 * `null` on a color field means "derive from the active page's color"
 * (see FICHARIO_COLORS) rather than a fixed override.
 */
export const FICHARIO_STYLE_DEFAULTS = {
  background:  null,   // null = derive from active page.color
  cornerRadius: 14,    // px, 0–32 — matches source demo
  tabAccent:   '#E8C468', // fallback accent for the "+ add page" tab
  heading: {
    size:      18,      // px, 13–28
    color:     null,    // null = derive from page color
    weight:    700,
    uppercase: false,
    italic:    false,
  },
  body: {
    size:      13,      // px, 11–18
    color:     null,    // null = derive from page color
    italic:    false,
  },
  tab: {
    size:      10,      // px, 7–13
    color:     null,    // null = derive from page color
    weight:    600,
    uppercase: false,
  },
};

export const getFicharioStyle = (item) => {
  const s = item?.style?.fichario || {};
  return {
    ...FICHARIO_STYLE_DEFAULTS,
    ...s,
    heading: { ...FICHARIO_STYLE_DEFAULTS.heading, ...(s.heading || {}) },
    body:    { ...FICHARIO_STYLE_DEFAULTS.body,    ...(s.body    || {}) },
    tab:     { ...FICHARIO_STYLE_DEFAULTS.tab,     ...(s.tab     || {}) },
  };
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