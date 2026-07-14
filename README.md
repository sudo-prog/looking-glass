# Looking Glass

A spatial visual memory system — infinite canvas workspace with cards, stacks, folders, tags, and AI assistance.

## 🚀 Live Demo

**https://looking-glass-eta.vercel.app/**

## Tech Stack

- **React 19** + **TypeScript** + **Vite 5**
- **Zustand** for state management
- **pnpm** package manager
- **Tiptap** rich text editor
- **Phosphor Icons**
- **html2canvas** + **jsPDF** for PNG/PDF export
- **react-hot-toast** for notifications
- **IndexedDB** (via idb) for local persistence

## Quick Start

```bash
pnpm install && pnpm run dev
```

## Features

- Infinite pan/zoom canvas
- Cards: notes, bookmarks, images, video, audio, PDF, web clips
- Stacks (fan animation) and Folders (tab/thumbnail browser)
- Tags with auto-extraction from #hashtags
- AI summarisation and organisation
- Command Palette (Ctrl+K)
- Scratch Pad (Ctrl+Shift+N)
- Spaces (multi-canvas workspaces)
- Dark/light theme with glass aesthetic
- PWA with service worker
