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
- **Cloud sync (Supabase)** — sign in to access your canvases across desktop, tablet, and mobile from one source (IndexedDB local-first, mirrored to Supabase with row-level security)
- Dark/light theme with glass aesthetic
- PWA with service worker

## AI Provider (OmniRoute)

AI features route through the **OmniRoute gateway** (OpenAI-compatible, local on port `20128`). Configure via `.env.local`:

```bash
LLM_BASE_URL=http://127.0.0.1:20128/v1   # tailnet: http://100.125.198.47:20128/v1
LLM_API_KEY=omniroute                      # literal string, no real key required
LLM_MODEL=auto/best-coding-fast            # also: auto/best-coding, auto/best-reasoning
```

OmniRoute is the only AI backend — no Anthropic/OpenAI/Groq/Gemini keys are used. Note: the gateway is local-only, so Vercel production needs a tunnel or hosted endpoint to use AI.
