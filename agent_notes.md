# Agent Notes — Looking Glass

Architecture decisions, file structure, API patterns, and known issues.

---

## Project Path
`/home/thinkpad/Data/20_Projects/20.05_LOOKING_GLASS/looking-glass/`

## Repository
- GitHub: `sudo-prog/looking-glass` (private)
- Main branch: `main`

## Project Structure
- Frontend: React 18, Vite 5, Tailwind, Zustand
- Backend: API folder with server.js (Express-like)
- Features: Infinite canvas, visual bookmarks, web clipper, PWA support

## Key Technologies
- React 18, Vite 5, Tailwind CSS
- Zustand for state management
- html2canvas for screenshots
- jsdom/jspdf for export
- TipTap for rich text editing
- PWA with service worker
- WebGPU detection for glass tier support

## Vercel Deployment Configuration
- Deployed via Vercel with `vercel.json` configuration
- Output directory: `dist`
- API served from `api/` folder

## AI Integration
- No AI features currently implemented
- Could integrate with gemini-web2api or OpenRouter

## Known Issues
- No backend AI endpoints
- Requires `EXPO_PUBLIC_DOMAIN` for mobile features if any
- Service worker needs proper scope configuration for Vercel

---

## Deployment Checklist
- [ ] Set `VITE_API_BASE_URL` if separate backend needed
- [ ] Verify service worker scope matches Vercel deployment
- [ ] Configure Web Push notifications if using