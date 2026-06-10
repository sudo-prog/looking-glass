/**
 * LOOKING GLASS — Shared AI Configuration
 * Single source of truth for provider, model, and API key.
 * Stored in localStorage as `lg-ai-config`.
 * Used by AIModal, LiquidOrb, AISummarisePanel, and any other AI consumer.
 */

const STORAGE_KEY = 'lg-ai-config';

// ── Provider definitions ────────────────────────────────────────────────────
export const PROVIDERS = {
  openrouter: {
    name: 'OpenRouter',
    icon: '⇄',
    keyPlaceholder: 'sk-or-v1-…',
    keyLabel: 'OpenRouter API Key',
    baseURL: 'https://openrouter.ai/api/v1/chat/completions',
    models: [
      'anthropic/claude-sonnet-4-5',
      'anthropic/claude-3.5-sonnet',
      'openai/gpt-4o',
      'openai/gpt-4o-mini',
      'google/gemini-2.5-flash',
      'meta-llama/llama-3.3-70b-instruct',
      'mistralai/mistral-large',
    ],
    needsKey: true,
    showBaseURL: false,
  },
  anthropic: {
    name: 'Anthropic',
    icon: '◆',
    keyPlaceholder: 'sk-ant-api03-…',
    keyLabel: 'Anthropic API Key',
    baseURL: 'https://api.anthropic.com/v1/messages',
    models: [
      'claude-sonnet-4-5',
      'claude-sonnet-4-20250514',
      'claude-3-5-sonnet-20241022',
      'claude-3-haiku-20240307',
    ],
    needsKey: true,
    showBaseURL: false,
  },
  openai: {
    name: 'OpenAI',
    icon: '◎',
    keyPlaceholder: 'sk-proj-…',
    keyLabel: 'OpenAI API Key',
    baseURL: 'https://api.openai.com/v1/chat/completions',
    models: [
      'gpt-4o',
      'gpt-4o-mini',
      'gpt-4.1',
      'gpt-4-turbo',
      'o3',
      'o4-mini',
    ],
    needsKey: true,
    showBaseURL: false,
  },
  google: {
    name: 'Gemini',
    icon: '✦',
    keyPlaceholder: 'AIza…',
    keyLabel: 'Google AI API Key',
    baseURL: 'https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent',
    models: [
      'gemini-2.5-flash-preview-05-20',
      'gemini-2.5-pro-preview-06-05',
      'gemini-2.0-flash',
    ],
    needsKey: true,
    showBaseURL: false,
  },
  groq: {
    name: 'Groq',
    icon: '⚡',
    keyPlaceholder: 'gsk_…',
    keyLabel: 'Groq API Key',
    baseURL: 'https://api.groq.com/openai/v1/chat/completions',
    models: [
      'llama-3.3-70b-versatile',
      'llama-3.1-8b-instant',
      'mixtral-8x7b-32768',
      'gemma2-9b-it',
    ],
    needsKey: true,
    showBaseURL: false,
  },
  ollama: {
    name: 'Ollama',
    icon: '🦙',
    keyPlaceholder: '(no key needed)',
    keyLabel: 'API Key (optional)',
    baseURL: 'http://localhost:11434/v1/chat/completions',
    models: [
      'llama3.2',
      'mistral',
      'qwen2.5',
      'phi4',
      'gemma3',
    ],
    needsKey: false,
    showBaseURL: true,
  },
  litellm: {
    name: 'LiteLLM',
    icon: '⚗',
    keyPlaceholder: 'Bearer …',
    keyLabel: 'Bearer Token (optional)',
    baseURL: 'http://localhost:4000/v1/chat/completions',
    models: [
      'claude-3-5-sonnet-20241022',
      'gpt-4o',
      'gemini/gemini-2.0-flash',
    ],
    needsKey: false,
    showBaseURL: true,
  },
};

// ── Minimal obfuscation (NOT real encryption) ───────────────────────────────
const obfuscate = (key) => btoa(key.split('').reverse().join(''));
const deobfuscate = (enc) => { try { return atob(enc).split('').reverse().join(''); } catch { return ''; } };

// ── Config accessors ────────────────────────────────────────────────────────
export function loadAIConfig() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { provider: 'openrouter', model: '', key: '' };
    const parsed = JSON.parse(raw);
    return {
      provider: parsed.provider || 'openrouter',
      model:    parsed.model    || '',
      key:      parsed.key ? deobfuscate(parsed.key) : '',
    };
  } catch {
    return { provider: 'openrouter', model: '', key: '' };
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
  return PROVIDERS[pid] || PROVIDERS.openrouter;
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
  if (pid === 'anthropic') {
    return localStorage.getItem('lg-api-key') || localStorage.getItem('lg-key-anthropic') || '';
  }
  return localStorage.getItem(`lg-key-${pid}`) || '';
}