# Dev Roadmap — Looking Glass

## 📱 Mobile UI / UX Polish
- [x] **LEDGER FIXED**: Scrolling anchoring resolved — Canvas.jsx now locks to full-screen edges (left:0%, bottom:100vh)
- [x] **Spelling Correction**: Fixed `fill-horicontal` → `fill-horizonta` in className typo
- [x] **Responsive Padding**: RightPanel.jsx now uses `env(safe-area-inset-top)` for safe area spacing  
- [x] **Mobile Heading Sizes**: Reduced `MobileOpeningSection` title from 36px → 32px article level to prevent overflow
- [x] **Footer Version**: Updated `Footer.jsx` background-image to `desktop-dark-1.0.webp` for cache busting
- [x] **Block Spacing**: Adjusted `.tagsPanel` height to `calc(70vh - 4px)` to prevent mobile overflow
- [ ] **Complete Bookmarks Drag & Drop**: Implement dnd-kit for folder/item reordering with DB persistence
- [ ] **Build X/Twitter Bookmarks Import**: Parse `bookmarks.js`/`bookmarks.json` exports, deduplicate, store in DB
- [ ] **Touch Target Audit**: Verify ALL interactive elements meet ≥44px width/height minimum
- [ ] **Auto-Scan Missing Routes**: Add missing routes to mobile UI scan coverage beyond root scan
- [ ] **Playwright Mobile Verification**: All new changes must pass 390x844 @ 0.5s settle test with no removals

## 🔖 Bookmarks Management
- [ ] **Drag & Drop State Persistence**: Ensure reorders saved to DB immediately
- [ ] **Drop Zone Targeting**: Clear glucose-level visual targets for bookmarking interactions
- [ ] **Metadata Extraction**: Parse title/author/URL from imported social links

## 🐦 X/Twitter Integration
- [ ] **Archive Parser**: Build binary/file upload → bookmarks.js/JSON extraction
- [ ] **Auto-Import Flow**: Button-triggered import with progress spinner and confirmation
- [ ] **Deduplication Logic**: Prevent duplicate bookmark imports using hash matching

## 🛠️ Tech Debt / Infrastructure
- [ ] **Performance Monitoring**: Add self-monitoring metrics to Canvas.render loop
- [ ] **Versioned CSS Assets**: Enforce cache-busting on all static assets
- [ ] **Graceful Degradation**: Ensure non-JS fallback paths remain functional

--- 
*Updated 2026-08-13 after git diff analysis of Looking Glass mobile UI changes*