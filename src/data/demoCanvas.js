// LOOKING GLASS — Demo Canvas Seed Data
// Pre-populated onboarding canvas shown when user opens an empty canvas.
// Provides a rich, beautiful first-run experience demonstrating all card types.

import { ITEM_TYPES } from './schema.js';

export const DEMO_CANVAS_NAME = 'Welcome to Looking Glass';

// Cards are positioned in world space; viewport starts at {x:0, y:0, scale:1}
// Cards near the center (0,0) will be immediately visible.
export const DEMO_ITEMS = [
  {
    id: 'demo-note-1',
    type: ITEM_TYPES.NOTE,
    x: -300,
    y: -200,
    width: 300,
    content: {
      title: 'Getting Started',
      text: 'Welcome to Looking Glass! ✨\n\nThis is your infinite visual canvas. Drag cards, resize them, and organize your ideas visually.\n\nTry the sidebar → to add notes, bookmarks, images, and more.',
    },
    tags: [],
  },
  {
    id: 'demo-bookmark-1',
    type: ITEM_TYPES.BOOKMARK,
    x: 100,
    y: -200,
    width: 340,
    content: {
      title: 'Looking Glass on GitHub',
      url: 'https://github.com/sudo-prog/looking-glass',
    },
    meta: { domain: 'github.com' },
    tags: ['featured'],
  },
  {
    id: 'demo-image-1',
    type: ITEM_TYPES.IMAGE,
    x: -300,
    y: 150,
    width: 280,
    content: {
      title: 'Sample Image',
      image_url: 'https://picsum.photos/seed/looking-glass/560/320',
    },
    tags: [],
  },
  {
    id: 'demo-note-2',
    type: ITEM_TYPES.NOTE,
    x: 100,
    y: 150,
    width: 340,
    content: {
      title: 'Tips & Tricks',
      text: '• Ctrl+K → Command Palette\n• Drag files/URLs here to add cards\n• Long-press on mobile to open actions\n• Stars (★) for favorites\n• Tags for filtering\n• Spaces for multi-canvas projects',
    },
    tags: ['tips'],
  },
];