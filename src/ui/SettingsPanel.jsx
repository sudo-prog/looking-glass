/**
 * LOOKING GLASS — Settings Panel
 * Slides in from the left as a liquid glass overlay matching the sidebar theme.
 * Controls: AI provider config, theme, display density, data management.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { X, GearSix, Sun, Moon, Trash, Download, Upload, Sparkle } from '@phosphor-icons/react';
import { toggleTheme, isDark } from '../utils/theme';
import { PROVIDERS, loadAIConfig, saveAIConfig, getProviderDef } from '../utils/aiConfig.js';

const AI_PROVIDERS = [
  { id: 'openai',  label: 'OpenAI',    placeholder: 'sk-...' },
  { id: 'anthropic', label: 'Anthropic', placeholder: 'sk-ant-...' },
  { id: 'gemini',  label: 'Google Gemini', placeholder: 'AIza...' },
  { id: 'ollama',  label: 'Ollama (Local)', placeholder: 'http://localhost:11434' },
];

export function SettingsPanel({ isOpen, onClose }) {
  const [dark, setDark] = useState(isDark());
  const [aiProvider, setAiProvider] = useState('openai');
  const [aiKey, setAiKey] = useState('');
  const [aiEndpoint, setAiEndpoint] = useState('');
  const [aiModel, setAiModel] = useState('');
  const [density, setDensity] = useState('normal');
  const [saved, setSaved] = useState(false);
  const [customModel, setCustomModel] = useState('');

  // Load saved settings
  useEffect(() => {
    if (!isOpen) return;
    try {
      const cfg = loadAIConfig();
      setAiProvider(cfg.provider);
      setAiKey(cfg.key);
      setAiEndpoint(cfg.endpoint || '');
      setAiModel(cfg.model);
      setCustomModel(cfg.model);
    } catch {}
    const d = localStorage.getItem('lg-density');
    if (d) setDensity(d);
    setDark(isDark());
    setSaved(false);
  }, [isOpen]);

  const handleSave = useCallback(() => {
    // Save AI config
    const p = getProviderDef(aiProvider);
    const modelToSave = aiModel === 'custom' || (!p.models.includes(aiModel) && aiModel !== p.models[0])
      ? customModel
      : aiModel;
    const finalModel = modelToSave || p.models[0];
    saveAIConfig({ provider: aiProvider, model: finalModel, key: aiKey, endpoint: aiEndpoint });
    // Save density
    localStorage.setItem('lg-density', density);
    document.documentElement.dataset.density = density;
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }, [aiProvider, aiKey, aiEndpoint, aiModel, customModel, density]);

  const handleThemeToggle = useCallback(() => {
    const newDark = !dark;
    toggleTheme(newDark ? 'dark' : 'light');
    setDark(newDark);
  }, [dark]);

  const handleClearData = useCallback(() => {
    if (confirm('Clear all local data? This cannot be undone.')) {
      localStorage.clear();
      indexedDB.deleteDatabase('looking-glass');
      location.reload();
    }
  }, []);

  const handleExportAll = useCallback(() => {
    window.dispatchEvent(new CustomEvent('lg-export'));
    onClose();
  }, [onClose]);

  if (!isOpen) return null;

  const providerDef = getProviderDef(aiProvider);
  const modelOptions = providerDef ? [...providerDef.models, 'custom'] : ['custom'];

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        className="lg-settings-overlay"
        style={{
          position: 'fixed', inset: 0,
          zIndex: 'var(--z-dropdown)',
          background: 'rgba(0,0,0,0.40)',
          animation: 'ctx-appear 0.15s ease both',
        }}
      />

      {/* Panel - slides from left */}
      <div
        role="dialog"
        aria-label="Settings"
        className="lg-settings-panel"
        style={{
          position: 'fixed',
          top: 0, left: 0, bottom: 0,
          width: 'min(380px, 90vw)',
          zIndex: 'var(--z-dropdown)',
          background: 'var(--glass-frost)',
          backdropFilter: 'blur(32px) saturate(120%)',
          WebkitBackdropFilter: 'blur(32px) saturate(120%)',
          borderRight: '1px solid var(--color-border)',
          boxShadow: '8px 0 48px var(--glass-cast-shadow)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          animation: 'lg-settings-slide 0.25s cubic-bezier(0.32,0.72,0,1) both',
        }}
      >
        <style>{`
          @keyframes lg-settings-slide {
            from { transform: translateX(-100%); }
            to   { transform: translateX(0); }
          }
        `}</style>

        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px',
          borderBottom: '1px solid var(--color-border)',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <GearSix size={18} weight="regular" style={{ color: 'var(--text-primary)' }} />
            <span style={{
              fontFamily: 'var(--font-ui)', fontSize: '13px', fontWeight: 600,
              color: 'var(--text-primary)', letterSpacing: '0.08em',
            }}>SETTINGS</span>
          </div>
          <button
            onClick={onClose}
            aria-label="Close settings"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: '28px', height: '28px', borderRadius: '8px',
              border: 'none', background: 'transparent',
              color: 'var(--text-secondary)', cursor: 'pointer',
            }}
          >
            <X size={16} weight="regular" />
          </button>
        </div>

        {/* Content */}
        <div style={{
          flex: 1, overflowY: 'auto', padding: '16px 20px',
          display: 'flex', flexDirection: 'column', gap: '24px',
        }}>
          {/* ── Appearance ── */}
          <Section title="APPEARANCE">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={labelStyle}>Theme</span>
              <button
                onClick={handleThemeToggle}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: '36px', height: '36px', borderRadius: '10px',
                  border: '1px solid var(--color-border)',
                  background: 'transparent',
                  color: 'var(--text-primary)', cursor: 'pointer',
                }}
                aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {dark ? <Sun size={16} weight="regular" /> : <Moon size={16} weight="regular" />}
              </button>
            </div>

            <div style={{ marginTop: '12px' }}>
              <span style={labelStyle}>Density</span>
              <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
                {['compact', 'normal', 'spacious'].map(d => (
                  <button
                    key={d}
                    onClick={() => setDensity(d)}
                    style={{
                      flex: 1, padding: '6px', borderRadius: '8px',
                      border: density === d
                        ? '1px solid var(--color-accent, #8B5CF6)'
                        : '1px solid var(--color-border)',
                      background: density === d ? 'rgba(139,92,246,0.15)' : 'transparent',
                      color: density === d ? 'var(--text-primary)' : 'var(--text-secondary)',
                      cursor: 'pointer',
                      fontFamily: 'var(--font-ui)', fontSize: '11px',
                      textTransform: 'uppercase', letterSpacing: '0.06em',
                    }}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
          </Section>

          {/* ── AI Provider ── */}
          <Section title="AI ASSISTANT">
            {/* Provider tabs */}
            <div style={{
              display: 'flex', gap: '4px', marginBottom: '12px', padding: '3px',
              background: 'rgba(255,255,255,0.04)', borderRadius: '12px', flexWrap: 'wrap',
            }}>
              {Object.entries(PROVIDERS).map(([pid, p]) => {
                const active = pid === aiProvider;
                return (
                  <button key={pid} style={{
                    flex: '1 0 auto', background: active ? 'rgba(255,255,255,0.10)' : 'none',
                    border: 'none', borderRadius: '9px', padding: '5px 6px', cursor: 'pointer',
                    fontFamily: "'DM Sans',sans-serif", fontSize: '10px', fontWeight: active ? 600 : 400,
                    color: active ? 'rgba(238,238,248,0.90)' : 'var(--text-secondary)',
                    transition: 'all 0.15s', whiteSpace: 'nowrap',
                    textTransform: 'uppercase', letterSpacing: '0.04em',
                  }} onClick={() => {
                    setAiProvider(pid);
                    setAiModel(PROVIDERS[pid].models[0]);
                    setCustomModel('');
                  }}>
                    {p.icon}{p.name}
                  </button>
                );
              })}
            </div>

            {/* Model select */}
            <div style={{ marginTop: '12px' }}>
              <span style={labelStyle}>Model</span>
              <select
                value={aiModel}
                onChange={(e) => {
                  setAiModel(e.target.value);
                  if (e.target.value === 'custom') setCustomModel('');
                }}
                style={selectStyle}
              >
                {(providerDef?.models || []).map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
                <option value="custom">Custom model ID…</option>
              </select>
            </div>

            {/* Custom model input */}
            {(aiModel === 'custom' || (providerDef && !providerDef.models.includes(aiModel))) && (
              <div style={{ marginTop: '8px' }}>
                <span style={labelStyle}>Custom model ID</span>
                <input
                  type="text"
                  placeholder="e.g. llama-3.3-70b-versatile"
                  value={customModel}
                  onChange={(e) => setCustomModel(e.target.value)}
                  style={inputStyle}
                />
              </div>
            )}

            {/* API Key */}
            {providerDef?.needsKey !== false && (
              <div style={{ marginTop: '12px' }}>
                <span style={labelStyle}>{providerDef?.keyLabel || 'API Key'}</span>
                <input
                  type="password"
                  value={aiKey}
                  onChange={e => setAiKey(e.target.value)}
                  placeholder={providerDef?.keyPlaceholder || 'Enter API key'}
                  style={inputStyle}
                />
              </div>
            )}

            {aiProvider === 'ollama' && (
              <div style={{ marginTop: '12px' }}>
                <span style={labelStyle}>Endpoint</span>
                <input
                  type="text"
                  value={aiEndpoint}
                  onChange={e => setAiEndpoint(e.target.value)}
                  placeholder="http://localhost:11434"
                  style={inputStyle}
                />
              </div>
            )}
          </Section>

          {/* ── Data ── */}
          <Section title="DATA">
            <button onClick={handleExportAll} style={actionBtnStyle}>
              <Download size={14} />
              Export All Data
            </button>
            <button onClick={handleClearData} style={{ ...actionBtnStyle, color: '#ef4444' }}>
              <Trash size={14} />
              Clear All Data
            </button>
          </Section>
        </div>

        {/* Footer */}
        <div style={{
          padding: '12px 20px',
          borderTop: '1px solid var(--color-border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexShrink: 0,
        }}>
          <span style={{
            fontFamily: 'var(--font-ui)', fontSize: '10px',
            color: 'var(--text-disabled)', letterSpacing: '0.06em',
          }}>V0.1 · LOOKING GLASS</span>
          <button
            onClick={handleSave}
            style={{
              padding: '8px 20px', borderRadius: '8px',
              border: 'none',
              background: saved ? 'rgba(34,197,94,0.2)' : 'var(--color-accent, #8B5CF6)',
              color: saved ? '#22c55e' : '#fff',
              cursor: 'pointer',
              fontFamily: 'var(--font-ui)', fontSize: '12px', fontWeight: 600,
              letterSpacing: '0.06em',
              transition: 'all 0.2s ease',
            }}
          >
            {saved ? '✓ SAVED' : 'SAVE'}
          </button>
        </div>
      </div>
    </>
  );
}

/* ── Sub-components ── */

function Section({ title, children }) {
  return (
    <div>
      <div style={{
        fontFamily: 'var(--font-ui)', fontSize: '10px', fontWeight: 600,
        color: 'var(--text-disabled)', letterSpacing: '0.12em',
        marginBottom: '10px',
      }}>{title}</div>
      <div style={{
        padding: '12px',
        borderRadius: '12px',
        border: '1px solid var(--color-border)',
        background: 'rgba(255,255,255,0.02)',
        display: 'flex', flexDirection: 'column', gap: '4px',
      }}>
        {children}
      </div>
    </div>
  );
}

/* ── Styles ── */

const labelStyle = {
  fontFamily: 'var(--font-ui)', fontSize: '11px',
  color: 'var(--text-secondary)', letterSpacing: '0.04em',
  display: 'block', marginBottom: '2px',
};

const inputStyle = {
  width: '100%', padding: '8px 12px', borderRadius: '8px',
  border: '1px solid var(--color-border)',
  background: 'rgba(255,255,255,0.04)',
  color: 'var(--text-primary)',
  fontFamily: 'var(--font-mono, monospace)', fontSize: '12px',
  outline: 'none', marginTop: '4px',
  boxSizing: 'border-box',
};

const selectStyle = {
  width: '100%', padding: '8px 12px', borderRadius: '10px',
  border: '1px solid var(--color-border)',
  background: 'rgba(255,255,255,0.05)',
  color: 'var(--text-primary)',
  fontFamily: 'var(--font-ui)', fontSize: '12px',
  outline: 'none', marginTop: '4px',
  cursor: 'pointer',
  appearance: 'none',
};

const actionBtnStyle = {
  display: 'flex', alignItems: 'center', gap: '8px',
  padding: '8px 12px', borderRadius: '8px',
  border: '1px solid var(--color-border)',
  background: 'transparent',
  color: 'var(--text-secondary)',
  cursor: 'pointer',
  fontFamily: 'var(--font-ui)', fontSize: '12px',
  textAlign: 'left',
};