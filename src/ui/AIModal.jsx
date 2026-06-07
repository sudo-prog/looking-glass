import { useState, useEffect, useRef } from 'react';
import { X, Sparkle, Eye, EyeSlash, Warning } from '@phosphor-icons/react';
import './AIModal.css';

const PROVIDERS = [
  { id: 'openrouter', label: 'OPENROUTER',             placeholder: 'sk-or-...' },
  { id: 'anthropic',  label: 'ANTHROPIC',              placeholder: 'sk-ant-...' },
  { id: 'openai',     label: 'OPENAI',                 placeholder: 'sk-...' },
  { id: 'litellm',    label: 'LITELLM (SELF-HOSTED)',  placeholder: 'http://localhost:4000' },
];

const MODELS = {
  openrouter: [
    'anthropic/claude-sonnet-4-5',
    'anthropic/claude-3.5-sonnet',
    'openai/gpt-4o',
  ],
  anthropic: [
    'claude-sonnet-4-5',
    'claude-3-5-sonnet-20241022',
    'claude-3-haiku-20240307',
  ],
  openai: [
    'gpt-4o',
    'gpt-4o-mini',
    'gpt-4-turbo',
  ],
  litellm: [
    'claude-3-5-sonnet-20241022',
    'gpt-4o',
    'gemini/gemini-2.0-flash',
  ],
};

// Minimal obfuscation — NOT real encryption.
// Note: replace with Web Crypto API (AES-GCM) for production.
const obfuscate = (key) => btoa(key.split('').reverse().join(''));
const deobfuscate = (enc) => atob(enc).split('').reverse().join('');

export default function AIModal({ isOpen, onClose }) {
  const [provider, setProvider] = useState('openrouter');
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState(MODELS.openrouter[0]);
  const [showKey, setShowKey] = useState(false);
  const [status, setStatus] = useState('idle'); // 'idle' | 'testing' | 'ok' | 'error'
  const [errorMsg, setErrorMsg] = useState('');
  const modalRef = useRef(null);
  const inputRef = useRef(null);

  // Load saved settings on open
  useEffect(() => {
    if (!isOpen) return;
    try {
      const saved = JSON.parse(localStorage.getItem('lg-ai-config') || '{}');
      if (saved.provider) setProvider(saved.provider);
      if (saved.model) setModel(saved.model);
      if (saved.key) setApiKey(deobfuscate(saved.key));
    } catch {}
    // Focus first input
    setTimeout(() => inputRef.current?.focus(), 50);
  }, [isOpen]);

  // Update model default when provider changes
  useEffect(() => {
    setModel(MODELS[provider]?.[0] || '');
    setStatus('idle');
    setErrorMsg('');
  }, [provider]);

  // Keyboard: Escape closes
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  const handleSave = () => {
    if (!apiKey.trim()) {
      setStatus('error');
      setErrorMsg('[ERROR: API KEY REQUIRED]');
      return;
    }
    // Store obfuscated — client-side only
    localStorage.setItem('lg-ai-config', JSON.stringify({
      provider,
      model,
      key: obfuscate(apiKey.trim()),
    }));
    setStatus('ok');
    setTimeout(onClose, 600);
  };

  const handleTest = async () => {
    if (!apiKey.trim()) {
      setStatus('error');
      setErrorMsg('[ERROR: ENTER API KEY FIRST]');
      return;
    }
    setStatus('testing');
    setErrorMsg('');
    try {
      const res = await fetch(
        provider === 'openrouter' ? 'https://openrouter.ai/api/v1/models' :
        provider === 'anthropic'  ? 'https://api.anthropic.com/v1/models' :
        provider === 'openai'     ? 'https://api.openai.com/v1/models' :
        `${apiKey.includes('http') ? apiKey : 'http://localhost:4000'}/models`,
        {
          headers: {
            'Authorization': `Bearer ${apiKey.trim()}`,
            ...(provider === 'anthropic' ? { 'x-api-key': apiKey.trim(), 'anthropic-version': '2023-06-01' } : {}),
          },
        }
      );
      if (res.ok) {
        setStatus('ok');
      } else {
        setStatus('error');
        setErrorMsg(`[ERROR: ${res.status} — CHECK KEY]`);
      }
    } catch (e) {
      setStatus('error');
      setErrorMsg('[ERROR: NETWORK — CHECK PROVIDER URL]');
    }
  };

  if (!isOpen) return null;

  const currentProvider = PROVIDERS.find(p => p.id === provider);

  return (
    <div className="lg-ai-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div
        className="lg-ai-modal"
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="ai-modal-title"
      >
        {/* Header */}
        <div className="lg-ai-modal__header">
          <div className="lg-ai-modal__title-row">
            <Sparkle size={16} weight="regular" className="lg-ai-modal__title-icon" />
            <h2 id="ai-modal-title" className="lg-ai-modal__title">AI ASSISTANT</h2>
          </div>
          <button className="lg-ai-modal__close" onClick={onClose} aria-label="Close AI assistant">
            <X size={16} weight="regular" />
          </button>
        </div>

        {/* Divider */}
        <div className="lg-ai-modal__divider" />

        {/* Body */}
        <div className="lg-ai-modal__body">
          {/* Provider select */}
          <div className="lg-ai-modal__field">
            <label className="lg-ai-modal__label" htmlFor="ai-provider">PROVIDER</label>
            <select
              id="ai-provider"
              className="lg-ai-modal__select"
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
            >
              {PROVIDERS.map(p => (
                <option key={p.id} value={p.id}>{p.label}</option>
              ))}
            </select>
          </div>

          {/* Model select */}
          <div className="lg-ai-modal__field">
            <label className="lg-ai-modal__label" htmlFor="ai-model">MODEL</label>
            <select
              id="ai-model"
              className="lg-ai-modal__select"
              value={model}
              onChange={(e) => setModel(e.target.value)}
            >
              {(MODELS[provider] || []).map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          {/* API key input */}
          <div className="lg-ai-modal__field">
            <label className="lg-ai-modal__label" htmlFor="ai-key">API KEY</label>
            <div className="lg-ai-modal__key-wrap">
              <input
                ref={inputRef}
                id="ai-key"
                type={showKey ? 'text' : 'password'}
                className={`lg-ai-modal__input ${status === 'error' ? 'lg-ai-modal__input--error' : ''}`}
                value={apiKey}
                onChange={(e) => { setApiKey(e.target.value); setStatus('idle'); setErrorMsg(''); }}
                placeholder={currentProvider?.placeholder || 'Enter API key'}
                autoComplete="off"
                spellCheck={false}
              />
              <button
                className="lg-ai-modal__key-toggle"
                onClick={() => setShowKey(v => !v)}
                aria-label={showKey ? 'Hide API key' : 'Show API key'}
                type="button"
              >
                {showKey
                  ? <EyeSlash size={16} weight="regular" />
                  : <Eye size={16} weight="regular" />}
              </button>
            </div>
            {/* Security notice */}
            <p className="lg-ai-modal__notice">
              <Warning size={12} weight="regular" />
              STORED CLIENT-SIDE ONLY · NEVER TRANSMITTED TO OUR SERVERS
            </p>
          </div>

          {/* Status display */}
          {status === 'error' && (
            <p className="lg-ai-modal__error">{errorMsg}</p>
          )}
          {status === 'ok' && (
            <p className="lg-ai-modal__success">[CONNECTED]</p>
          )}
          {status === 'testing' && (
            <p className="lg-ai-modal__testing">[TESTING...]</p>
          )}
        </div>

        {/* Divider */}
        <div className="lg-ai-modal__divider" />

        {/* Footer actions */}
        <div className="lg-ai-modal__footer">
          <button className="lg-ai-modal__btn-secondary" onClick={handleTest} disabled={status === 'testing'}>
            TEST CONNECTION
          </button>
          <button className="lg-ai-modal__btn-primary" onClick={handleSave}>
            SAVE &amp; CONNECT
          </button>
        </div>
      </div>
    </div>
  );
}
