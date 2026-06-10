/**
 * LOOKING GLASS — Settings Panel
 * Slides in from the right as a glass overlay.
 * Controls: AI provider config, theme, display density, data management.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { X, GearSix, Moon, Sun, Trash, Download, Upload, Sparkle } from '@phosphor-icons/react';
import { toggleTheme, isDark } from '../utils/theme';

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
  const [density, setDensity] = useState('normal');
  const [saved, setSaved] = useState(false);

  // Load saved settings
  useEffect(() => {
    if (!isOpen) return;
    try {
      const cfg = JSON.parse(localStorage.getItem('lg-ai-config') || '{}');
      if (cfg.provider) setAiProvider(cfg.provider);
      if (cfg.key) setAiKey(cfg.key);
      if (cfg.endpoint) setAiEndpoint(cfg.endpoint);
    } catch {}
    const d = localStorage.getItem('lg-density');
    if (d) setDensity(d);
    setDark(isDark());
    setSaved(false);
  }, [isOpen]);

  const handleSave = useCallback(() => {
    // Save AI config
    const aiConfig = { provider: aiProvider, key: aiKey, endpoint: aiEndpoint };
    localStorage.setItem('lg-ai-config', JSON.stringify(aiConfig));
    // Save density
    localStorage.setItem('lg-density', density);
    document.documentElement.dataset.density = density;
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }, [aiProvider, aiKey, aiEndpoint, density]);

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
    // Trigger the export dialog
    window.dispatchEvent(new CustomEvent('lg-export'));
    onClose();
  }, [onClose]);

  if (!isOpen) return null;

  const provider = AI_PROVIDERS.find(p => p.id === aiProvider);

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0,
          zIndex: 'calc(var(--z-dropdown) - 1)',
          background: 'rgba(0,0,0,0.40)',
          animation: 'ctx-appear 0.15s ease both',
        }}
      />

      {/* Panel */}
      <div
        role="dialog"
        aria-label="Settings"
        style={{
          position: 'fixed',
          top: 0, right: 0, bottom: 0,
          width: 'min(380px, 90vw)',
          zIndex: 'var(--z-dropdown)',
          background: 'rgba(16,16,16,0.97)',
          backdropFilter: 'blur(32px) saturate(120%)',
          WebkitBackdropFilter: 'blur(32px) saturate(120%)',
          borderLeft: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '-8px 0 48px rgba(0,0,0,0.60)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          animation: 'settings-slide 0.25s cubic-bezier(0.32,0.72,0,1) both',
        }}
      >
        <style>{`
          @keyframes settings-slide {
            from { transform: translateX(100%); }
            to   { transform: translateX(0); }
          }
        `}</style>

        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
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
                  display: 'flex', alignItems: 'center', gap: '8px',
                  padding: '6px 12px', borderRadius: '8px',
                  border: '1px solid rgba(255,255,255,0.10)',
                  background: 'rgba(255,255,255,0.04)',
                  color: 'var(--text-primary)', cursor: 'pointer',
                  fontFamily: 'var(--font-ui)', fontSize: '12px',
                }}
              >
                {dark ? <Moon size={14} /> : <Sun size={14} />}
                {dark ? 'Dark' : 'Light'}
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
                        : '1px solid rgba(255,255,255,0.10)',
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
            <div>
              <span style={labelStyle}>Provider</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '6px' }}>
                {AI_PROVIDERS.map(p => (
                  <button
                    key={p.id}
                    onClick={() => setAiProvider(p.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '10px',
                      padding: '8px 12px', borderRadius: '8px',
                      border: aiProvider === p.id
                        ? '1px solid var(--color-accent, #8B5CF6)'
                        : '1px solid rgba(255,255,255,0.06)',
                      background: aiProvider === p.id ? 'rgba(139,92,246,0.10)' : 'transparent',
                      color: aiProvider === p.id ? 'var(--text-primary)' : 'var(--text-secondary)',
                      cursor: 'pointer', textAlign: 'left',
                      fontFamily: 'var(--font-ui)', fontSize: '12px',
                    }}
                  >
                    <Sparkle size={12} weight={aiProvider === p.id ? 'fill' : 'regular'} />
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {aiProvider !== 'ollama' && (
              <div style={{ marginTop: '12px' }}>
                <span style={labelStyle}>API Key</span>
                <input
                  type="password"
                  value={aiKey}
                  onChange={e => setAiKey(e.target.value)}
                  placeholder={provider?.placeholder || 'Enter API key'}
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
          borderTop: '1px solid rgba(255,255,255,0.06)',
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
        border: '1px solid rgba(255,255,255,0.06)',
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
  border: '1px solid rgba(255,255,255,0.10)',
  background: 'rgba(255,255,255,0.04)',
  color: 'var(--text-primary)',
  fontFamily: 'var(--font-mono, monospace)', fontSize: '12px',
  outline: 'none', marginTop: '4px',
  boxSizing: 'border-box',
};

const actionBtnStyle = {
  display: 'flex', alignItems: 'center', gap: '8px',
  padding: '8px 12px', borderRadius: '8px',
  border: '1px solid rgba(255,255,255,0.06)',
  background: 'transparent',
  color: 'var(--text-secondary)',
  cursor: 'pointer',
  fontFamily: 'var(--font-ui)', fontSize: '12px',
  textAlign: 'left',
};