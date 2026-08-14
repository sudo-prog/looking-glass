# Looking Glass

Looking Glass is a sophisticated spatial visual memory system that transforms the way you capture and organize information. By utilizing an infinite canvas workspace, it allows you to map out ideas, research, and memories using a flexible arrangement of cards, stacks, and folders, all augmented by integrated AI assistance.

## Key Features

### 🌌 Spatial Workspace
- **Infinite Canvas** — Pan and zoom across a boundless workspace to visualize connections between disparate pieces of information.
- **Diverse Card Types** — Capture everything from simple notes and bookmarks to images, videos, audio files, PDFs, and rich web clips.
- **Organization Layers** — Use Stacks (with elegant fan animations) and Folders (with thumbnail browsing) to manage complexity without losing spatial context.
- **Smart Tagging** — Automatic tag extraction from #hashtags for rapid filtering and retrieval.
- **Spaces** — Create multiple distinct canvas workspaces for different projects or domains of knowledge.

### 🤖 AI Intelligence
- **Automated Summarization** — Quickly distill long-form content into concise summaries.
- **Intelligent Organization** — Leverage AI to help categorize and structure your spatial memory.

### 🛠️ Power User Tools
- **Command Palette (Ctrl+K)** — Rapidly navigate and execute actions without leaving the keyboard.
- **Scratch Pad (Alt+Space)** — A dedicated area for temporary notes and rapid capture.
- **Fuzzy Search** — Find any card or tag instantly using a powerful search interface.
- **Multi-Format Export** — Export your knowledge maps as JSON, PNG, PDF, or Markdown.

### 📱 Modern Experience
- **Glass Aesthetic** — A refined, modern UI with comprehensive dark and light theme support.
- **PWA Support** — Fully installable Progressive Web App with service worker integration for offline access.

## Tech Stack

- **Frontend:** React 18, JavaScript (JSX), Vite 5
- **State Management:** Zustand
- **Rich Text:** Tiptap
- **Icons:** Phosphor Icons
- **Utilities:** Fuse.js (Fuzzy Search), html2canvas & jsPDF (Exports)
- **Notifications:** react-hot-toast
- **Persistence:** IndexedDB for local-first data storage
- **Package Manager:** pnpm

## Getting Started

### Prerequisites
- Node.js (Latest LTS)
- pnpm (`npm install -g pnpm`)

### Installation
```bash
# Clone the repository
git clone https://github.com/sudo-prog/looking-glass.git
cd looking-glass

# Install dependencies
pnpm install --no-frozen-lockfile
```

### Development
```bash
# Run the development server
pnpm run dev
```

### Deployment
- **Platform:** Vercel
- **Build Command:** `pnpm build`
- **Output Directory:** `dist/`

## License

This project is licensed under the MIT License.
