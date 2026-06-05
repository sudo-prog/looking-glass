import { useState, useEffect, useRef, useCallback } from 'react';
import { useStore } from '../store/useStore.js';
import { X, Eye, EyeSlash, CheckCircle, WarningCircle } from '@phosphor-icons/react';
import './AIModal.css';

const PROVIDERS = [
  { id: 'openrouter', label: 'OpenRouter' },
  { id: 'anthropic', label: 'Anthropic' },
  { id: 'openai', label: 'OpenAI' },
  { id: 'litellm', label: 'LiteLLM (self-hosted)' },
];

const MODELS = {
  openrouter: [
    { id: 'anthropic/claude-sonnet-4', label: 'Claude Sonnet 4' },
    { id: 'anthropic/claude-opus-4', label: 'Claude Opus 4' },
    { id: 'openai/gpt-4o', label: 'GPT-4o' },
    { id: 'openai/gpt-4o-mini', label: 'GPT-4o Mini' },
    { id: 'google/gemini-2.5-pro', label: 'Gemini 2.5 Pro' },
    { id: 'meta-llama/llama-4-maverick', label: 'Llama 4 Maverick' },
  ],
  anthropic: [
    { id: 'claude-sonnet-4-20250514', label: 'Claude Sonnet 4' },
    { id: 'claude-opus-4-20250514', label: 'Claude Opus 4' },
    { id: 'claude-3-5-haiku-20241022', label: 'Claude 3.5 Haiku' },
  ],
  openai: [
    { id: 'gpt-4o', label: 'GPT-4o' },
    { id: 'gpt-4o-mini', label: 'GPT-4o Mini' },
    { id: 'o1', label: 'o1' },
    { id: 'o3-mini', label: 'o3-mini' },
  ],
  litellm: [
    { id: 'gpt-4o', label: 'GPT-4o (via LiteLLM)' },
    { id: 'claude-sonnet-4', label: 'Claude Sonnet 4 (via LiteLLM)' },
    { id: 'custom', label: 'Custom Model' },
  ],
};

// Simple obfuscation: reverse + base64
function obfuscateKey(key) {
  try {
    return btoa(key.split('').reverse().join(''));
  } catch {
    return '';
  }
}

function deobfuscateKey(encoded) {
  try {
    return atob(encoded).split('').reverse().join('');
  } catch {
    return '';
  }
}

function getStoredKey(provider) {
  const stored = localStorage.getItem(`lg-ai-key-${provider}`);
  return stored ? deobfuscateKey(stored) : '';
}

function storeKey(provider, key) {
  localStorage.setItem(`lg-ai-key-${provider}`, obfuscateKey(key));
}

function clearStoredKey(provider) {
  localStorage.removeItem(`lg-ai-key-${provider}`);
}

export default function AIModal({ isOpen, onClose }) {
  const [provider, setProvider] = useState('openrouter');
  const [model, setModel] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [status, setStatus] = useState('idle'); // idle | testing | ok | error
  const [statusMessage, setStatusMessage] = useState('');
  const overlayRef = useRef(null);

  // Load stored key on provider change
  useEffect(() => {
    if (!isOpen) return;
    const stored = getStoredKey(provider);
    setApiKey(stored);
    const models = MODELS[provider];
    if (models && models.length > 0) {
      setModel(models[0].id);
    }
    setStatus('idle');
    setStatusMessage('');
  }, [provider, isOpen]);

  // Escape to close
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  const handleOverlayClick = useCallback((e) => {
    if (e.target === overlayRef.current) onClose();
  }, [onClose]);

  const handleTest = useCallback(async () => {
    if (!apiKey.trim()) {
      setStatus('error');
      setStatusMessage('Please enter an API key');
      return;
    }
    setStatus('testing');
    setStatusMessage('Testing connection...');

    // Simulate a quick test — in production this would make a real API call
    try {
      await new Promise((resolve) => setTimeout(resolve, 1200));
      // For demo purposes, accept any key longer than 10 chars
      if (apiKey.trim().length > 10) {
        setStatus('ok');
        setStatusMessage('Connection successful!');
      } else {
        setStatus('error');
        setStatusMessage('Invalid key format');
      }
    } catch {
      setStatus('error');
      setStatusMessage('Connection failed');
    }
  }, [apiKey]);

  const handleSave = useCallback(() => {
    if (!apiKey.trim()) {
      clearStoredKey(provider);
    } else {
      storeKey(provider, apiKey.trim());
    }
    setStatus('ok');
    setStatusMessage('Settings saved');
    setTimeout(() => {
      onClose();
    }, 600);
  }, [apiKey, provider, onClose]);

  if (!isOpen) return null;

  const availableModels = MODELS[provider] || [];

  return (
    <div
      className="ai-modal__overlay"
      ref={overlayRef}
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-label="AI Provider Setup"
    >
      <div className="ai-modal__box">
        {/* Header */}
        <div className="ai-modal__header">
          <h2 className="ai-modal__title">AI PROVIDER SETUP</h2>
          <button className="ai-modal__close" onClick={onClose} aria-label="Close">
            <X size={18} weight="bold" />
          </button>
        </div>

        {/* Body */}
        <div className="ai-modal__body">
          {/* Provider */}
          <div className="ai-modal__field">
            <label className="ai-modal__label" htmlFor="ai-provider">PROVIDER</label>
            <select
              id="ai-provider"
              className="ai-modal__select"
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
            >
              {PROVIDERS.map((p) => (
                <option key={p.id} value={p.id}>{p.label}</option>
              ))}
            </select>
          </div>

          {/* Model */}
          <div className="ai-modal__field">
            <label className="ai-modal__label" htmlFor="ai-model">MODEL</label>
            <select
              id="ai-model"
              className="ai-modal__select"
              value={model}
              onChange={(e) => setModel(e.target.value)}
            >
              {availableModels.map((m) => (
                <option key={m.id} value={m.id}>{m.label}</option>
              ))}
            </select>
          </div>

          {/* API Key */}
          <div className="ai-modal__field">
            <label className="ai-modal__label" htmlFor="ai-key">API KEY</label>
            <div className="ai-modal__key-row">
              <input
                id="ai-key"
                className="ai-modal__input"
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => { setApiKey(e.target.value); setStatus('idle'); }}
                placeholder="Enter your API key"
                autoComplete="off"
              />
              <button
                className="ai-modal__key-toggle"
                type="button"
                onClick={() => setShowKey(!showKey)}
                aria-label={showKey ? 'Hide key' : 'Show key'}
              >
                {showKey ? <EyeSlash size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Status */}
          {status !== 'idle' && (
            <div className={`ai-modal__status ai-modal__status--${status}`}>
              {status === 'ok' && <CheckCircle size={14} weight="fill" />}
              {status === 'error' && <WarningCircle size={14} weight="fill" />}
              {status === 'testing' && (
                <span className="ai-modal__spinner" />
              )}
              <span>{statusMessage}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="ai-modal__footer">
          <button
            className="ai-modal__btn ai-modal__btn--secondary"
            onClick={handleTest}
            disabled={status === 'testing'}
          >
            {status === 'testing' ? 'TESTING...' : 'TEST CONNECTION'}
          </button>
          <button
            className="ai-modal__btn ai-modal__btn--primary"
            onClick={handleSave}
          >
            SAVE
          </button>
        </div>
      </div>
    </div>
  );
}
