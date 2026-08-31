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

## AI Provider

AI is configured in **one place only**: the **side panel → Settings → AI Assistant**. The orb is chat-only and reads that same shared config — there is no second setup flow inside the orb.

Two providers are offered, both free-tier:

| Provider | Endpoint | Notes |
|---|---|---|
| **OmniRoute** (default) | `http://127.0.0.1:20128/v1/chat/completions` | Local gateway, OpenAI-compatible. Key is the literal string `omniroute`. |
| **OpenRouter (free)** | `https://openrouter.ai/api/v1/chat/completions` | Needs a real `sk-or-v1-…` key. Only `:free` models are listed. |

Default model is `openrouter/free` (OmniRoute resolves it across the free OpenRouter pool). Also available: `auto/best-free`, `auto/coding:free`, `auto/best-chat`, `auto/best-coding-fast`.

No paid models and no Anthropic/OpenAI/Groq/Gemini/Ollama/LiteLLM keys are used anywhere.

**Important — requests must be non-streaming.** The OmniRoute gateway streams by default and returns Server-Sent-Events (`data: {...}`), which breaks `response.json()`. Every client call therefore sends `"stream": false`. Do not remove it.

Server-side (`api/chat.js`) config via `.env.local`:

```bash
LLM_BASE_URL=http://127.0.0.1:20128/v1   # tailnet: http://100.125.198.47:20128/v1
LLM_API_KEY=omniroute                      # literal string, no real key required
LLM_MODEL=auto/best-coding-fast
```

Note: the gateway is local-only, so Vercel production needs a tunnel or hosted endpoint for AI to work in the deployed app.

## Orb debug mode

The orb has a built-in debug facility, useful for diagnosing AI problems:

- Type `/debug` in the orb to toggle debug mode (AI inspects the live DOM for real fixes).
- The **⚠ button** in the orb toolbar opens the **Debug Log** viewer, which records mutations, window errors, unhandled rejections, `console.error`, and AI call failures.
- The log can be copied or exported as markdown for bug reports.
