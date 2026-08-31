/**
 * LOOKING GLASS — Shared AI Configuration
 * Single source of truth for provider, model, and API key.
 * Stored in localStorage as `lg-ai-config`.
 * Used by AIModal, LiquidOrb, AISummarisePanel, and any other AI consumer.
 */

const STORAGE_KEY = 'lg-ai-config';
const CUSTOM_PROVIDERS_KEY = 'lg-custom-providers';

// ── Built-in provider definitions ──────────────────────────────────────────────
const BUILTIN_PROVIDERS = {
  omniroute: {
    name: 'OmniRoute',
    icon: '⚡',
    keyPlaceholder: 'omniroute',
    keyLabel: 'OmniRoute API Key',
    baseURL: 'http://127.0.0.1:20128/v1/chat/completions',
    models: [
      'openrouter/free',
      'auto/best-free',
      'auto/coding:free',
      'auto/best-chat',
      'auto/best-coding-fast',
    ],
    needsKey: true,
    showBaseURL: true,
    builtin: true,
  },
  openrouter: {
    name: 'OpenRouter (free)',
    icon: '⇄',
    keyPlaceholder: 'sk-or-v1-…',
    keyLabel: 'OpenRouter API Key',
    baseURL: 'https://openrouter.ai/api/v1/chat/completions',
    models: [
      'z-ai/glm-5.2:free',
      'minimax/minimax-m3:free',
      'poolside/laguna-s-2.1:free',
      'nvidia/nemotron-3-super-120b-a12b:free',
      'google/gemma-4-31b-it:free',
      'thinkingmachines/inkling:free',
    ],
    needsKey: true,
    showBaseURL: false,
    builtin: true,
  },
};

// ── Custom providers (stored in localStorage) ─────────────────────────────────
let _customProviders = {};

function loadCustomProviders() {
  try {
    const raw = localStorage.getItem(CUSTOM_PROVIDERS_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function saveCustomProviders(cps) {
  _customProviders = cps;
  localStorage.setItem(CUSTOM_PROVIDERS_KEY, JSON.stringify(cps));
}

function initCustomProviders() {
  _customProviders = loadCustomProviders();
}

// Initialize on module load
initCustomProviders();

/**
 * All providers = built-in + custom.
 * Returns a fresh object on each call — safe for React renders.
 */
export function getProviders() {
  return { ...BUILTIN_PROVIDERS, ..._customProviders };
}

/**
 * Legacy export — kept for backward compatibility with modules that import it.
 * Prefer getProviders() for a fresh snapshot each render.
 * @deprecated Use getProviders() instead.
 */
export const PROVIDERS = { ...BUILTIN_PROVIDERS, ..._customProviders };

/**
 * Re-sync PROVIDERS from localStorage (for live updates across tabs).
 * Also mutates the legacy PROVIDERS export for backward compat.
 */
export function refreshProviders() {
  _customProviders = loadCustomProviders();
  Object.keys(PROVIDERS).forEach(k => { if (!BUILTIN_PROVIDERS[k]) delete PROVIDERS[k]; });
  Object.assign(PROVIDERS, _customProviders);
}

/**
 * Add a custom provider. Returns the generated id.
 */
export function addCustomProvider({ name, icon, baseURL, models, needsKey, showBaseURL }) {
  const id = 'custom_' + Date.now();
  const provider = {
    name,
    icon: icon || '⊕',
    keyPlaceholder: 'Enter API key…',
    keyLabel: `${name} API Key`,
    baseURL: baseURL || '',
    models: models || ['custom-model'],
    needsKey: needsKey !== false,
    showBaseURL: showBaseURL !== false,
    builtin: false,
  };
  PROVIDERS[id] = provider;
  _customProviders[id] = provider;
  saveCustomProviders(_customProviders);
  return id;
}

/**
 * Remove a custom provider by id. Cannot remove built-in providers.
 */
export function removeCustomProvider(id) {
  if (BUILTIN_PROVIDERS[id]) return false;
  delete PROVIDERS[id];
  delete _customProviders[id];
  saveCustomProviders(_customProviders);
  return true;
}

// ── Minimal obfuscation (NOT real encryption) ───────────────────────────────
const obfuscate = (key) => btoa(key.split('').reverse().join(''));
const deobfuscate = (enc) => { try { return atob(enc).split('').reverse().join(''); } catch { return ''; } };

// ── Config accessors ────────────────────────────────────────────────────────
const DEFAULT_CONFIG = { provider: 'omniroute', model: 'openrouter/free', key: 'omniroute', endpoint: '' };

export function loadAIConfig() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_CONFIG };
    const parsed = JSON.parse(raw);
    const storedProvider = parsed.provider;
    // Migrate any stored provider that is not one of the two remaining builtins.
    // Unknown/deleted providers (not in the current builtins) fall
    // back to the omniroute default. Keep the user's key only if the provider still matches.
    const isValid = storedProvider === 'omniroute' || storedProvider === 'openrouter';
    if (!isValid) return { ...DEFAULT_CONFIG };
    return {
      provider: storedProvider,
      model:    parsed.model    || 'openrouter/free',
      key:      parsed.key ? deobfuscate(parsed.key) : 'omniroute',
      endpoint: parsed.endpoint || '',
    };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

export function saveAIConfig({ provider, model, key, endpoint }) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    provider,
    model,
    key: key ? obfuscate(key) : '',
    endpoint: endpoint || '',
  }));
}

export function getProviderDef(pid) {
  return PROVIDERS[pid] || BUILTIN_PROVIDERS.omniroute;
}

// ── Model aliases ──────────────────────────────────────────────────
// Maps user-friendly pseudo-model IDs to real provider model IDs.
// Kept as an identity-safe passthrough for backward compatibility — no
// fake slugs are aliased any more. Other files import this function.
export const MODEL_ALIASES = {
  'openrouter/auto': 'openrouter/auto',
};

export function resolveModelAlias(model) {
  if (!model) return model;
  return MODEL_ALIASES[model] || model;
}

/**
 * Returns the ordered list of providers to try when the preferred one fails.
 * Always starts with the preferred provider, then alternates through fallbacks.
 */
export function getProviderFallbackOrder(preferred) {
  const all = ['omniroute', 'openrouter'];
  if (!preferred) return all;
  // Put preferred first, then the rest in order
  const rest = all.filter(p => p !== preferred);
  return [preferred, ...rest];
}

/**
 * Resolve the actual API key to use.
 * Checks the shared lg-ai-config first, then falls back to
 * legacy per-provider keys (lg-key-{provider}, lg-api-key).
 */
export function resolveAPIKey(pid) {
  const cfg = loadAIConfig();
  if (cfg.provider === pid && cfg.key) return cfg.key;
  // Legacy fallbacks
  return localStorage.getItem(`lg-key-${pid}`) || '';
}

/**
 * Resolve the chat-completions endpoint for a provider.
 * - openrouter → its absolute baseURL.
 * - omniroute  → '/api/chat' (same-origin serverless proxy) when the page is
 *                served over HTTPS (avoids mixed-content blocking); otherwise
 *                the local gateway URL. A user-entered custom Base URL is
 *                honoured when saved. Endpoint is computed from the provider
 *                definition, never read straight from baseURL by callers.
 * Always returns a string.
 */
export function resolveEndpoint(pid, providerDef) {
  const def = providerDef || getProviderDef(pid);
  if (pid === 'openrouter') {
    return def?.baseURL || 'https://openrouter.ai/api/v1/chat/completions';
  }
  // omniroute (and any custom via saved endpoint)
  const cfg = loadAIConfig();
  if (cfg.endpoint) return cfg.endpoint;
  if (typeof location !== 'undefined' && location.protocol === 'https:') {
    return '/api/chat';
  }
  return def?.baseURL || 'http://127.0.0.1:20128/v1/chat/completions';
}

/**
 * Send a tiny 1-token "ping" chat request to verify the connection.
 * Never throws — always resolves { ok:true, model } or
 * { ok:false, status, message } with a readable message for the common
 * failure modes (mixed content, 401, 404, 429, network errors).
 */
export async function testConnection({ provider, model, key, endpoint }) {
  try {
    // Guard: browser-side calls from an HTTPS page must not hit a plain-http
    // absolute endpoint (mixed content) — surface a readable error instead.
    if (
      typeof location !== 'undefined' &&
      location.protocol === 'https:' &&
      endpoint &&
      endpoint.startsWith('http://')
    ) {
      return { ok: false, status: 0, message: 'Blocked by the browser as mixed content (HTTPS page cannot call http://). Use the built-in /api/chat proxy.' };
    }

    const url = endpoint || '/api/chat';
    const headers = { 'Content-Type': 'application/json' };
    if (key) headers['Authorization'] = `Bearer ${key}`;

    const resp = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model,
        provider,
        max_tokens: 1,
        temperature: 0,
        stream: false,
        messages: [{ role: 'user', content: 'ping' }],
      }),
    });

    if (resp.ok) {
      return { ok: true, model };
    }

    let detail = resp.statusText;
    try {
      const data = await resp.json();
      detail = data?.error?.message || data?.error || detail;
    } catch {
      /* keep statusText */
    }

    let message;
    const status = resp.status;
    if (status === 401 || status === 403) {
      message = 'Invalid or missing API key (401). Check the key and try again.';
    } else if (status === 404) {
      message = `Model or endpoint not found (404). Verify the model ID${detail ? `: ${detail}` : ''}.`;
    } else if (status === 429) {
      message = 'Rate limited (429). Retry shortly.';
    } else {
      message = `Upstream error ${status}${detail ? `: ${detail}` : ''}`;
    }

    return { ok: false, status, message };
  } catch (err) {
    return { ok: false, status: 0, message: err?.message || String(err) };
  }
}