# LG-8 Implementation Spec (mobile input bugs + design-system consolidation)

Repo: looking-glass (React/Vite SPA, single page `/`, no router). Branch: `wt/lg8-mobile-design`.
Worktree: `/home/thinkpad/Data/20_Projects/20.05_LOOKING_GLASS/looking-glass/.worktrees/t_dab6994e`

## Hard rules for the subagent
- Edit only the files listed. Match existing style (inline `style={{}}` objects + a few CSS files).
- Do NOT commit, build, deploy, or run git. Just edit files. Report a terse summary of what changed.
- Keep `pnpm build` compiling (valid JSX/JS). No new dependencies.
- After edits, the harness must pass at 390x844 (no per-element overflow, all tap targets >=44px, no console errors).

## 1) LiquidOrb.jsx
File: `src/ui/LiquidOrb.jsx`

### 1a CRITICAL send-twice (line ~923)
Current: `<button className="lg-orb-send" disabled={!taRef.current?.value?.trim()} onClick={handleSend}>`
Problem: uncontrolled textarea; `taRef.current.value` is read at render time -> stale `disabled`, first tap swallowed.
Fix: remove the `disabled={...}` attribute entirely (handleSend already early-returns on empty/whitespace). Leave `onClick={handleSend}`.

### 1b Setup dialog centering (lines ~933-959)
Current overlay uses inline `position:'fixed', inset:0, display:'flex', alignItems:'center', justifyContent:'center'` and dialog uses `borderRadius:'24px'`, `fontFamily:"'DM Sans',system-ui,sans-serif"`.
Fix:
- Overlay: change `alignItems:'center'` to `alignItems:'flex-start'` AND add `paddingTop:'12vh'` (desktop keeps near-center; on mobile keyboard it stays visible). Keep `position:'fixed', inset:0, display:'flex', justifyContent:'center'`, keep background/blur.
- Dialog `width:'min(420px, 92vw)'` -> `width:'min(420px, calc(100vw - 24px))'` (safe gutter).
- Dialog `borderRadius:'24px'` -> `borderRadius:'var(--radius-2xl)'` (20px token).
- Dialog `fontFamily:"'DM Sans',system-ui,sans-serif"` -> `fontFamily:'var(--font-body)'`.
- Add to the dialog style: `maxHeight:'calc(100dvh - 24px)', maxHeight:'calc(100vh - 24px)', overflowY:'auto'`.

### 1c Font + radius tokenization (entire file)
Replace ALL hardcoded font/radius inside this file's inline styles:
- `"'DM Sans',system-ui,sans-serif"`, `"'DM Sans',sans-serif"` -> `'var(--font-body)'`
- `"'DM Mono',monospace"` -> `'var(--font-ui)'`
- `borderRadius:'8px'` -> `'var(--radius-md)'`
- `borderRadius:'9px'` -> `'var(--radius-md)'` (9 is non-token; 8 is closest standard)
- `borderRadius:'10px'` -> `'var(--radius-lg)'`
- `borderRadius:'12px'` -> `'var(--radius-lg)'`
- `borderRadius:'20px'` -> `'var(--radius-2xl)'`
- `borderRadius:'24px'` (dialog) -> `'var(--radius-2xl)'` (already done in 1b; ensure consistency)
- `borderRadius:'50%'` stays (circular avatar/close buttons are intentional).
Use exact string replace; tokens exist in `src/styles/tokens.css` (--font-body, --font-ui, --radius-md=8px, --radius-lg=12px, --radius-2xl=20px).

## 2) ScratchPad.jsx
File: `src/ui/ScratchPad.jsx` (Panel at lines ~162-192)

Current: panel uses `position:'fixed', top:'50%', left:'50%', transform:'translate(-50%,-50%)'` which breaks on iOS keyboard (layout viewport). Animation keyframes use `translate(-50%,-50%)`.
Fix (flexbox full-screen wrapper + capped panel):
- Replace the single fixed panel div with a wrapper + inner panel:
  Wrapper div: `style={{ position:'fixed', inset:0, zIndex:'calc(var(--z-modal) + 1)', display:'flex', alignItems:'center', justifyContent:'center', padding:'calc(env(safe-area-inset-top) + 8px) calc(env(safe-area-inset-right) + 8px) calc(env(safe-area-inset-bottom) + 8px) calc(env(safe-area-inset-left) + 8px)', background:'rgba(0,0,0,0.35)', backdropFilter:'blur(2px)' }}` (this is the existing line-155 scrim — keep it; the panel was previously NOT inside it. Move the panel INSIDE this scrim as a child.)
  Inner panel: remove `top/left/transform'; add `maxWidth:'min(500px, calc(100vw - 16px))'`, `maxHeight:'90dvh'`, `maxHeight:'90vh'`, `overflow:'hidden'`, keep `borderRadius:'20px'` -> `'var(--radius-2xl)'`.
- Update the `<style>{@keyframes scratch-appear}</style>` to animate `opacity` + `scale` only (drop the `translate(-50%,-50%)`). New keyframes: `from { opacity:0; transform: scale(0.90); } to { opacity:1; transform: scale(1); }`.
- IMPORTANT: there is a backdrop element at lines ~150-159 (`zIndex:'var(--z-modal)'`). Ensure the panel sits above it (panel wrapper zIndex = calc(var(--z-modal)+1)). Keep onClose wiring on the wrapper (click scrim closes).

## 3) FolderCard tap feedback (CanvasCard.jsx)
File: `src/components/CanvasCard.jsx`, `FolderCard` component (~line 508-527, the folder body div).

Add active press feedback: on the folder-body div (the one with `clipPath` + `cursor:'pointer'`), add `transition:'box-shadow 0.15s ease, transform 0.15s ease'` and an `onPointerDown`/`onPointerUp` (or CSS `:active`) that applies `transform:'scale(0.97)'`. Simplest robust approach: add to that div's style `transition:'... transform 150ms ease'`, and add `onPointerDown={(e)=>{e.currentTarget.style.transform='scale(0.97)'}}` and `onPointerUp={(e)=>{e.currentTarget.style.transform='scale(1)'}}` and `onPointerLeave={(e)=>{e.currentTarget.style.transform='scale(1)'}}`. Do NOT break the existing onClick/handleOpen. Keep clipPath.

## 4) Sidebar mobile reorder (LiquidGlassSidebar.jsx)
File: `src/ui/LiquidGlassSidebar.jsx` (~line 410).

`draggable={!showRemove[id]}` is HTML5 DnD (no touch). On touch devices reorder is impossible; the long-press already drives remove mode (pointer events). Fix: disable native drag on mobile so it doesn't interfere with touch. Change `draggable={!showRemove[id]}` -> `draggable={!showRemove[id] && !isMobile}`. (isMobile is already in scope in this render.) This is the minimal safe fix; do not reimplement pointer-based reorder.

## 5) Shared Modal primitive (src/ui/primitives/Modal.jsx + Modal.css) — STRENGTHEN
Files already exist (scaffolded). Wire the 5 modals to it where they currently inline-center. Priority: AIModal and FolderViewModal and ScratchPad and CommandPalette should render their overlay through `<Modal isOpen onClose>`. (LiquidOrb setup dialog is inline-styled; leave it but it is already fixed in 1b.)

Modify `src/ui/primitives/Modal.jsx`:
- Export default `Modal` already takes `isOpen, onClose, children, closeOnBackdrop, overlayClassName, labelledBy`. Keep.
- Add safe-area padding already present. Good.
- Ensure `.lg-modal-overlay > *` caps child to `max-height:90dvh; max-height:90vh; max-width:min(100%,92vw)` (already in Modal.css). Good.
- Add `labelledBy` wiring to `aria-labelledby` (already). Keep Escape + body scroll lock.

Refactor AIModal.jsx (lines ~102-125): replace the outer `<div className="lg-ai-overlay" onClick=...>` + its closing with `<Modal isOpen={isOpen} onClose={onClose} labelledBy="...">{...inner modal content...}</Modal>`. The inner content is the `.lg-ai-modal` div. Keep `.lg-ai-modal` styling (it already uses tokens). Remove now-redundant `lg-ai-overlay` usage (CSS can stay; harmless). Import Modal at top: `import Modal from './primitives/Modal';`

Refactor FolderViewModal.jsx (lines ~164-181): replace the outer inline `createPortal(<div role=dialog ... style={{position:fixed,inset:0,...flex center...}}>)` with `createPortal(<Modal isOpen={!!folder} onClose={onClose} labelledBy={...}>{inner panel}</Modal>, document.body)`. The inner panel (the div with `width:'min(820px,100%)'...`) is the child. Add `maxHeight:'90dvh'` capping to that inner panel style (Modal.css already caps via `.lg-modal-overlay > *` but the inner panel sets its own height:'min(84vh,100%)' — change to `height:'min(84dvh,100%)'` and add `maxHeight:'90dvh'`). Import Modal.

ScratchPad: already done in (2) via flexbox wrapper; it does NOT need the Modal primitive (its scrim differs). Leave as fixed in (2).

CommandPalette.jsx (~line 134): it uses CSS class `command-palette-overlay` which already centers + has mobile bottom-sheet media query. Leave as-is (it is correct). Do not refactor.

After AIModal + FolderViewModal refactor, run `grep -n "lg-ai-overlay\|role=\"dialog\"" src/ui/AIModal.jsx src/ui/FolderViewModal.jsx` to confirm no leftover duplicate overlays.

## 6) Stylelint (scaffolded)
- `package.json` already has `lint:css` script + devDeps (stylelint, stylelint-config-standard, stylelint-declaration-strict-value). `.stylelintrc.json` already exists.
- Leave as-is. Do NOT add a CI gate. Do NOT run stylelint (chief-of-staff will). Ensure no syntax errors in your edits that would break `pnpm build` (stylelint is separate from build; build must pass).

## Verification checklist (the subagent must self-check before reporting)
- `grep -n "DM Sans\|DM Mono" src/ui/LiquidOrb.jsx` returns nothing.
- `grep -n "taRef.current?.value?.trim()" src/ui/LiquidOrb.jsx` returns nothing.
- `grep -n "top: '50%'\|left: '50%'\|translate(-50%, -50%)" src/ui/ScratchPad.jsx` returns nothing.
- FolderViewModal + AIModal now import + use `./primitives/Modal` or `primitives/Modal`.
- Sidebar: `draggable={!showRemove[id] && !isMobile}` present.
- `pnpm build` is NOT run by subagent, but edits must be syntactically valid JSX.

Report (under 200 words): files changed + the grep-confirmation results above + any deviation.
