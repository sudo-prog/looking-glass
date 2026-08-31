# AI SINGLE-PATH SPEC — Looking Glass (liquid glass app)

**Authoritative contract.** Both agents build to THIS document. Do not invent
requirements. Do not touch files outside your assigned ownership list.

Repo (worktree): `/home/thinkpad/orca/workspaces/looking-glass/lg-ai-single-path`
Branch: `sudo-prog/lg-ai-single-path`

---

## 1. GOAL (user's words)

> "Right now it has 2 ways of setting the ai — one in the side panel and one in
> the orb, both don't work and return error when trying to connect. I want to
> only have ONE way through the side panel, leaving the orb for chat only.
> Remove all the pre-filled options leaving only omniroute and openrouter:free
> and test to make sure it's fully working."

So:
1. **ONE config surface** = the side panel (`src/ui/SettingsPanel.jsx`, "AI Assistant" section).
2. **Orb = chat only.** All provider/model/key/add-custom-provider UI is REMOVED
   from `src/ui/LiquidOrb.jsx`. The orb keeps chat + its existing canvas-ops.
3. **Exactly TWO providers** in `src/utils/aiConfig.js`: `omniroute` and
   `openrouter`. Every other built-in provider is DELETED (anthropic, openai,
   google, groq, ollama, litellm, gemini-web2api, nous, opencode).
4. **Connection actually works** — see §4 root causes; these are the real bugs.

---

## 2. ROOT-CAUSE ANALYSIS (already diagnosed by the supervisor — trust this)

These are verified facts, not guesses. Fix these, do not re-litigate them.

**BUG 1 — orb "Add custom provider" + duplicate config UI.**
`LiquidOrb.jsx` carries its own full settings stack: `showSetup` centred dialog
(~line 974–1218), `settingsOpen` floating panel (~line 1220–1382), provider tab
grid, model `<select>`, key input, add/remove custom provider forms, and the
handlers `handleSaveSetup`, `handleSaveSettings`, `handleAddProvider`,
`handleRemoveProvider`. This is the second (duplicate) config path and must go.

**BUG 2 — the browser cannot reach OmniRoute over HTTPS (mixed content).**
`aiConfig.js` sets omniroute `baseURL: 'http://127.0.0.1:20128/v1/chat/completions'`.
On the deployed HTTPS site (`https://looking-glass-eta.vercel.app`) a plain
`http://` fetch is **blocked by the browser as mixed content** → generic
"Failed to fetch" / connect error. This is the #1 reason the user sees an error.
**FIX:** browser-side omniroute calls MUST go through the same-origin serverless
proxy `/api/chat` (which already exists and already maps models to `auto/*`).
Direct `http://127.0.0.1:20128` is acceptable ONLY when
`location.protocol === 'http:'` (local dev). Implement exactly that switch.

**BUG 3 — `api/chat.js` has a fatal ReferenceError on the OpenRouter path.**
In `api/chat.js` line ~99 the OpenRouter branch references
`OPENROUTER_MODEL_MAP` and `DEFAULT_FREE_MODEL` — **neither is defined anywhere
in the file**. Any request that falls to the OpenRouter branch throws
`ReferenceError`, caught by the outer try → HTTP 500/502. Verified live:
`POST https://looking-glass-eta.vercel.app/api/chat` → **HTTP 502
`{"error":"Upstream error"}`**. Must be fixed (define the map + default, or
drop the map and pass the model through when it is already a valid `:free` slug).

**BUG 4 — invalid/paid model IDs in the provider lists.**
`aiConfig.js` openrouter list contains IDs that are NOT real OpenRouter slugs
(`openrouter:free`) and several PAID models. The omniroute list contains
non-existent IDs (`gemini-3.5-flash`, `hy3`, `claude-sonnet-4-5`) that are not
in `curl http://127.0.0.1:20128/v1/models`. Selecting one → 404 from the
gateway. Only verified IDs may ship (§3).

**BUG 5 — default provider/model mismatch + stale localStorage.**
`SettingsPanel.jsx` line 30 initialises `useState('openai')` — a provider that
will no longer exist → `getProviderDef()` falls through to
`PROVIDERS['gemini-web2api']` (also being deleted) → `undefined` → crash/error.
Also: users have a saved `lg-ai-config` naming a now-deleted provider (e.g.
`anthropic`). `loadAIConfig()` MUST migrate any unknown provider to `omniroute`
and `getProviderDef()` MUST fall back to `omniroute`, never to a deleted key.

---

## 3. VERIFIED MODEL IDs (use EXACTLY these — do not add others)

**omniroute** — confirmed present in `curl http://127.0.0.1:20128/v1/models`
and confirmed HTTP 200 on a live chat call by the supervisor:
```
auto/best-free        <- DEFAULT (free pool)
auto/coding:free
auto/best-chat
auto/best-coding-fast
```
Key: the literal string `omniroute`. `needsKey: true`, `showBaseURL: true`.

**openrouter** — confirmed `:free` slugs live from
`https://openrouter.ai/api/v1/models` (2026-08-31):
```
z-ai/glm-5.2:free                  <- DEFAULT
minimax/minimax-m3:free
poolside/laguna-s-2.1:free
nvidia/nemotron-3-super-120b-a12b:free
google/gemma-4-31b-it:free
thinkingmachines/inkling:free
```
`needsKey: true`, `showBaseURL: false`, keyPlaceholder `sk-or-v1-…`.
**Free-tier only — no paid slug may appear in the list.**

Delete `MODEL_ALIASES['openrouter:free']` handling of fake slugs; keep
`resolveModelAlias` as an identity-safe passthrough (other files import it).

---

## 4. REQUIRED BEHAVIOUR

### 4.1 `src/utils/aiConfig.js`
- `BUILTIN_PROVIDERS` contains ONLY `omniroute` and `openrouter` (§3).
- Custom-provider machinery: `addCustomProvider`, `removeCustomProvider`,
  `getProviders`, `refreshProviders`, `PROVIDERS` **must still be exported**
  (other files import them — do not break the build). Custom providers are no
  longer surfaced in any UI; `getProviders()` may simply return the two builtins.
- `loadAIConfig()` default = `{ provider:'omniroute', model:'auto/best-free', key:'omniroute' }`.
- `loadAIConfig()` MUST migrate: if the stored provider is not `omniroute` or
  `openrouter`, return the omniroute default instead (and keep the user's key
  only if the provider still matches).
- `getProviderDef(pid)` fallback = `BUILTIN_PROVIDERS.omniroute` (never a deleted key).
- **NEW export** `resolveEndpoint(pid, providerDef)`:
  - `openrouter` → its absolute `baseURL`.
  - `omniroute` → `'/api/chat'` when `typeof location !== 'undefined' && location.protocol === 'https:'`;
    otherwise the configured/local `http://127.0.0.1:20128/v1/chat/completions`.
  - Honour a user-entered custom Base URL when one is saved (omniroute shows the field).
- **NEW export** `testConnection({ provider, model, key, endpoint })` → resolves
  `{ ok:true, model }` or `{ ok:false, status, message }`. Sends a 1-token
  "ping" chat request. Used by the side-panel Test button. Must surface the real
  upstream status code and a readable message (mixed-content, 401, 404, 429).

### 4.2 `src/ui/SettingsPanel.jsx` — the ONE config surface
- Initial provider state must be `'omniroute'`, never `'openai'`.
- Provider selector shows exactly two options: OmniRoute, OpenRouter (free).
- Model `<select>` lists only that provider's §3 models. Keep the "Custom model
  ID…" escape hatch.
- Key field, Base URL row (omniroute only), Save — as today.
- **ADD a "Test connection" button** with a live status line: pending →
  `✓ Connected · <model>` (green) or `✗ <status> <message>` (red). Wire it to
  `testConnection()`. Minimum 44px tap targets (MOBILE-UI-STANDARD.md).
- All AI calls in the app must route through `resolveEndpoint()` — no component
  may read `provider.baseURL` directly any more.

### 4.3 `src/ui/LiquidOrb.jsx` — chat only
- **DELETE**: the `showSetup` setup dialog, the `settingsOpen` floating settings
  panel, provider tab grid, model select, key input, add/remove-custom-provider
  forms, and handlers `handleSaveSetup`, `handleSaveSettings`,
  `handleAddProvider`, `handleRemoveProvider`, plus the now-unused state
  (`cfgProvider`, `cfgKey`, `cfgModel`, `showAddProvider`, `newProviderName`, …)
  and the `⚙` button that opened them.
- **KEEP**: the orb, chat input/transcript, canvas-ops execution, debug log.
- `callAI()` keeps only two branches — omniroute and openrouter — and gets its
  endpoint from `resolveEndpoint()`. Delete the anthropic + google branches.
- **When AI is unconfigured** (no key / unknown provider) the orb must NOT open
  any settings UI. It shows an inline chat message:
  `"AI not configured — open Settings → AI Assistant."` (No dialog, no ⚙.)
- Imports of `addCustomProvider` / `removeCustomProvider` / `saveAIConfig` must
  be dropped from this file (it no longer writes config).

### 4.4 `src/ui/AISummarisePanel.jsx`
- Delete the `anthropic` and `google` request branches; keep the
  OpenAI-compatible path for both remaining providers; use `resolveEndpoint()`.

### 4.5 `api/chat.js` (serverless proxy — also the omniroute HTTPS path)
- **Fix BUG 3**: define `OPENROUTER_MODEL_MAP` + `DEFAULT_FREE_MODEL`
  (default `z-ai/glm-5.2:free`), or pass a valid `:free` slug straight through.
  No undefined identifier may remain — grep the file to prove it.
- Model map must only ever resolve to `auto/*` (omniroute) or `:free`
  (openrouter). Never a paid model.
- Accept an optional `provider` field in the body so the client can force the
  openrouter upstream; default remains omniroute-first.
- Return the upstream status + a readable `error` string (no silent 502s), and
  keep echoing `x-request-id`.

### 4.6 `src/ui/AIModal.jsx`
Dead code — imported by nothing (only referenced in comments). **Do not edit and
do not delete it** (deletion needs explicit user approval). Leave as-is.

---

## 5. FILE OWNERSHIP (STRICT — never edit another agent's files)

**AGENT A — "core"**
- `src/utils/aiConfig.js`
- `api/chat.js`
- `src/ui/AISummarisePanel.jsx`

**AGENT B — "ui"**
- `src/ui/LiquidOrb.jsx`
- `src/ui/SettingsPanel.jsx`

Shared read-only: this spec. If you believe you need a file you do not own,
STOP and report it — do not edit it.

Agent A must land `resolveEndpoint` + `testConnection` with the exact signatures
in §4.1 because Agent B imports them.

---

## 6. HARD RULES

- **NEVER delete a file.** No `rm`, no `git rm`. Removing code *inside* an owned
  file is fine and expected.
- Free-tier models only. No paid slug anywhere.
- No secrets in code or logs. Keys stay in localStorage / server env.
- Do not touch `.env.local`, `.vercel/`, `vercel.json`, `package.json`, lockfiles.
- Do not run `git commit`, `git push`, or `vercel deploy` — the supervisor does that.
- Keep 44px minimum tap targets on anything you touch (MOBILE-UI-STANDARD.md).

## 7. DEFINITION OF DONE (your own gate before reporting)

1. `pnpm build` succeeds from the worktree root.
2. `grep -n "OPENROUTER_MODEL_MAP\|DEFAULT_FREE_MODEL" api/chat.js` shows both DEFINED.
3. `grep -c "anthropic\|groq\|ollama\|litellm\|gemini-web2api" src/utils/aiConfig.js` → 0.
4. `grep -n "settingsOpen\|showSetup\|handleAddProvider" src/ui/LiquidOrb.jsx` → no matches.
5. `git diff --stat` is NON-EMPTY and touches ONLY your owned files.

Report: the `git diff --stat` output verbatim, the build result, and anything
you could not do. Do not claim success without the real command output.
