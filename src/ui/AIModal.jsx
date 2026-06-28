import { useState, useEffect, useRef } from 'react';
import { X, Sparkle, Eye, EyeSlash, Warning } from '@phosphor-icons/react';
import { getProviders, loadAIConfig, saveAIConfig } from '../utils/aiConfig.js';
import './AIModal.css';

export default function AIModal({ isOpen, onClose }) {
  const [provider, setProvider] = useState('gemini-web2api');
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('');
  const [customModel, setCustomModel] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [status, setStatus] = useState('idle'); // 'idle' | 'testing' | 'ok' | 'error'
  const [errorMsg, setErrorMsg] = useState('');
  const modalRef = useRef(null);
  const inputRef = useRef(null);

  // Load saved settings on open
  useEffect(() => {
    if (!isOpen) return;
    try {
      const cfg = loadAIConfig();
      if (cfg.provider) setProvider(cfg.provider);
      if (cfg.model) setModel(cfg.model);
      if (cfg.model) setCustomModel(cfg.model);
      if (cfg.key) setApiKey(cfg.key);
    } catch {}
    // Focus first input
    setTimeout(() => inputRef.current?.focus(), 50);
  }, [isOpen]);

  // Update model default when provider changes
  useEffect(() => {
    const p = getProviders()[provider];
    if (p && p.models.length > 0) {
      setModel(p.models[0]);
      setCustomModel('');
    }
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
    if (!apiKey.trim() && getProviders()[provider]?.needsKey) {
      setStatus('error');
      setErrorMsg('[ERROR: API KEY REQUIRED]');
      return;
    }
    const finalModel = model === 'custom' ? customModel : model;
    saveAIConfig({ provider, model: finalModel || getProviders()[provider]?.models[0], key: apiKey.trim() });
    setStatus('ok');
    setTimeout(onClose, 600);
  };

  const handleTest = async () => {
    const p = getProviders()[provider];
    if (!apiKey.trim() && p.needsKey) {
      setStatus('error');
      setErrorMsg('[ERROR: ENTER API KEY FIRST]');
      return;
    }
    setStatus('testing');
    setErrorMsg('');
    try {
      const testUrl = p.baseURL?.includes('{model}')
        ? p.baseURL.replace('{model}', p.models[0]) + `?key=${apiKey.trim()}`
        : p.baseURL;
      const res = await fetch(
        provider === 'openrouter' ? 'https://openrouter.ai/api/v1/models' :
        provider === 'anthropic'  ? 'https://api.anthropic.com/v1/models' :
        provider === 'openai'     ? 'https://api.openai.com/v1/models' :
        provider === 'google'     ? 'https://generativelanguage.googleapis.com/v1beta/models' :
        `${(p.baseURL || 'http://localhost:4000').replace(/\/chat\/completions.*$/, '')}/models`,
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

  const currentProvider = getProviders()[provider];

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
              {Object.entries(getProviders()).map(([pid, p]) => (
                <option key={pid} value={pid}>{p.name}</option>
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
              onChange={(e) => { setModel(e.target.value); if (e.target.value !== 'custom') setCustomModel(''); }}
            >
              {(getProviders()[provider]?.models || []).map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
              <option value="custom">Custom model ID…</option>
            </select>
          </div>

          {/* Custom model input */}
          {(model === 'custom' || (!getProviders()[provider]?.models || !getProviders()[provider].models.includes(model))) && (
            <div className="lg-ai-modal__field">
              <label className="lg-ai-modal__label" htmlFor="ai-custom-model">CUSTOM MODEL ID</label>
              <input
                id="ai-custom-model"
                type="text"
                className="lg-ai-modal__input"
                placeholder="e.g. llama-3.3-70b-versatile"
                value={customModel}
                onChange={(e) => setCustomModel(e.target.value)}
                autoComplete="off"
                spellCheck={false}
              />
            </div>
          )}

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
                placeholder={currentProvider?.keyPlaceholder || 'Enter API key'}
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
              STORED CLIENT-SIDE ONLY · SHARED WITH ORB & ALL AI FEATURES
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
            SAVE & CONNECT
          </button>
        </div>
      </div>
    </div>
  );
}