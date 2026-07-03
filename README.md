# Looking Glass

A spatial visual memory system — infinite canvas workspace with cards, stacks, folders, tags, and AI assistance.

## Tech Stack

- **React 18** + **JavaScript (JSX)** + **Vite 5**
- **Zustand** for state management
- **pnpm** package manager (v9+)
- **Tiptap** rich text editor
- **Phosphor Icons**
- **html2canvas** + **jsPDF** for PNG/PDF export
- **Fuse.js** for fuzzy search
- **react-hot-toast** for notifications
- **IndexedDB** for local persistence

## Quick Start

```bash
pnpm install --no-frozen-lockfile && pnpm run dev
```

## Deploy

- **Platform:** Vercel
- **Branch:** `develop` (auto-deploys)
- **Build command:** `pnpm build`
- **Output:** `dist/`

## Features

- Infinite pan/zoom canvas
- Cards: notes, bookmarks, images, video, audio, PDF, web clips
- Stacks (fan animation) and Folders (tab/thumbnail browser)
- Tags with auto-extraction from #hashtags
- AI summarisation and organisation
- Command Palette (Ctrl+K)
- Scratch Pad (Alt+Space)
- Spaces (multi-canvas workspaces)
- Dark/light theme with glass aesthetic
- PWA with service worker offline support
- Export: JSON, PNG, PDF, Markdown formats