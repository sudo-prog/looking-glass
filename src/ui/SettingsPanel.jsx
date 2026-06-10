/**
 * LOOKING GLASS — Settings Panel
 * Slides in from the left as a liquid glass overlay.
 * Controls: Theme customization (colors, glass opacity/thickness/blur),
 * icon pool management, AI provider config, data management.
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { X, GearSix, Sun, Moon, Trash, Download, Sparkle, Palette, Sliders, Eye } from '@phosphor-icons/react';
import { toggleTheme, isDark } from '../utils/theme';
import { PROVIDERS, loadAIConfig, saveAIConfig, getProviderDef } from '../utils/aiConfig.js';
import { loadThemeConfig, saveThemeConfig, applyThemeConfig, THEME_DEFAULTS, getThicknessRadius } from '../utils/themeConfig.js';

const ICON_POOL = [
  { id: 'canvas',   label: 'Canvas',   icon: '◈' },
  { id: 'search',   label: 'Search',   icon: '⌕' },
  { id: 'library',  label: 'Library',  icon: '▤' },
  { id: 'spaces',   label: 'Spaces',   icon: '◉' },
  { id: 'tags',     label: 'Tags',     icon: '♯' },
  { id: 'saved',    label: 'Bookmarks', icon: '✦' },
  { id: 'starred',  label: 'Starred',  icon: '★' },
  { id: 'archive',  label: 'Archive',  icon: '▣' },
  { id: 'home',     label: 'Home',     icon: '⌂' },
  { id: 'export',   label: 'Export',   icon: '⇧' },
  { id: 'note',     label: 'New Note', icon: '✎' },
  { id: 'bookmark', label: 'New Bookmark', icon: '✦' },
  { id: 'url',      label: 'Add URL',  icon: '◎' },
];

export function SettingsPanel({ isOpen, onClose, onMenuIconsChange }) {
  const [dark, setDark] = useState(isDark());
  const [aiProvider, setAiProvider] = useState('openai');
  const [aiKey, setAiKey] = useState('');
  const [aiEndpoint, setAiEndpoint] = useState('');
  const [aiModel, setAiModel] = useState('');
  const [customModel, setCustomModel] = useState('');
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState('theme'); // 'theme' | 'ai' | 'icons' | 'data'

  // Theme state
  const [glassOpacity, setGlassOpacity] = useState(THEME_DEFAULTS.glassOpacity);
  const [glassThickness, setGlassThickness] = useState(THEME_DEFAULTS.glassThickness);
  const [glassBlur, setGlassBlur] = useState(THEME_DEFAULTS.glassBlur);
  const [accentColor, setAccentColor] = useState(THEME_DEFAULTS.accentColor);
  const [textPrimary, setTextPrimary] = useState(THEME_DEFAULTS.textPrimary);
  const [textSecondary, setTextSecondary] = useState(THEME_DEFAULTS.textSecondary);
  const [glassBgColor, setGlassBgColor] = useState(THEME_DEFAULTS.glassBgColor);
  const [tempAccentColor, setTempAccentColor] = useState(THEME_DEFAULTS.accentColor);
  const [tempTextPrimary, setTempTextPrimary] = useState(THEME_DEFAULTS.textPrimary);

  // Icon pool state
  const [menuIcons, setMenuIcons] = useState([]);
  const [removedIcons, setRemovedIcons] = useState([]);
  const dragIconRef = useRef(null);
  const [draggingPoolId, setDraggingPoolId] = useState(null);

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

    // Load theme config
    const tc = loadThemeConfig();
    setGlassOpacity(tc.glassOpacity);
    setGlassThickness(tc.glassThickness);
    setGlassBlur(tc.glassBlur);
    setAccentColor(tc.accentColor);
    setTextPrimary(tc.textPrimary);
    setTextSecondary(tc.textSecondary);
    setGlassBgColor(tc.glassBgColor || '');
    setTempAccentColor(tc.accentColor);
    setTempTextPrimary(tc.textPrimary);
    setMenuIcons(tc.menuIconOrder || []);
    setRemovedIcons(tc.removedIcons || []);

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

    // Save theme config
    const tc = loadThemeConfig();
    tc.glassOpacity = glassOpacity;
    tc.glassThickness = glassThickness;
    tc.glassBlur = glassBlur;
    tc.accentColor = accentColor;
    tc.textPrimary = textPrimary;
    tc.textSecondary = textSecondary;
    tc.glassBgColor = glassBgColor;
    tc.menuIconOrder = menuIcons;
    tc.removedIcons = removedIcons;
    saveThemeConfig(tc);
    applyThemeConfig(tc);

    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    if (onMenuIconsChange) onMenuIconsChange(menuIcons);
  }, [aiProvider, aiKey, aiEndpoint, aiModel, customModel,
      glassOpacity, glassThickness, glassBlur,
      accentColor, textPrimary, textSecondary, glassBgColor,
      menuIcons, removedIcons, onMenuIconsChange]);

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

  // ── Icon pool drag and drop ──
  const handlePoolDragStart = useCallback((e, id) => {
    setDraggingPoolId(id);
    e.dataTransfer.effectAllowed = 'copy';
    e.dataTransfer.setData('text/plain', id);
  }, []);

  const handlePoolDragEnd = useCallback(() => {
    setDraggingPoolId(null);
  }, []);

  const handlePoolDrop = useCallback((e) => {
    e.preventDefault();
    const iconId = e.dataTransfer.getData('text/plain');
    if (!iconId) return;
    // Add icon to menu
    if (!menuIcons.includes(iconId)) {
      const newMenu = [...menuIcons, iconId];
      setMenuIcons(newMenu);
    }
    // Remove from removed list
    setRemovedIcons(prev => prev.filter(i => i !== iconId));
    setDraggingPoolId(null);
  }, [menuIcons]);

  const handlePoolDragOver = useCallback((e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }, []);

  // Restore icon to menu
  const handleRestoreIcon = useCallback((id) => {
    if (!menuIcons.includes(id)) {
      setMenuIcons(prev => [...prev, id]);
    }
    setRemovedIcons(prev => prev.filter(i => i !== id));
  }, [menuIcons]);

  // Theme live preview helpers
  const handleAccentColorChange = useCallback((val) => {
    setAccentColor(val);
    setTempAccentColor(val);
    // Live preview
    document.documentElement.style.setProperty('--color-accent', val);
  }, []);

  const handleTextPrimaryChange = useCallback((val) => {
    setTextPrimary(val);
    setTempTextPrimary(val);
    document.documentElement.style.setProperty('--text-primary', val);
  }, []);

  if (!isOpen) return null;

  const providerDef = getProviderDef(aiProvider);

  const tabBtn = (id, label, Icon) => ({
    display: 'flex', alignItems: 'center', gap: '6px',
    padding: '6px 12px', borderRadius: '10px',
    border: 'none',
    background: activeTab === id ? 'rgba(255,255,255,0.10)' : 'transparent',
    color: activeTab === id ? 'var(--text-primary)' : 'var(--text-secondary)',
    cursor: 'pointer',
    fontFamily: 'var(--font-ui)', fontSize: '11px', fontWeight: activeTab === id ? 600 : 400,
    letterSpacing: '0.04em',
    transition: 'all 0.15s',
  });

  return (
    <>
      <div onClick={onClose} className="lg-settings-overlay"
        style={{ position: 'fixed', inset: 0, zIndex: 'var(--z-dropdown)', background: 'rgba(0,0,0,0.40)' }} />

      <div role="dialog" aria-label="Settings" className="lg-settings-panel"
        style={{
          position: 'fixed', top: 0, left: 0, bottom: 0,
          width: 'min(420px, 92vw)',
          zIndex: 'var(--z-dropdown)',
          background: 'var(--glass-frost)',
          backdropFilter: 'blur(32px) saturate(120%)',
          WebkitBackdropFilter: 'blur(32px) saturate(120%)',
          borderRight: '1px solid var(--color-border)',
          boxShadow: '8px 0 48px var(--glass-cast-shadow)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
          animation: 'lg-settings-slide 0.25s cubic-bezier(0.32,0.72,0,1) both',
        }}
      >
        <style>{`
          @keyframes lg-settings-slide { from { transform: translateX(-100%); } to { transform: translateX(0); } }
          input[type="range"] { -webkit-appearance: none; appearance: none; height: 4px; border-radius: 2px; background: var(--color-border); outline: none; cursor: pointer; }
          input[type="range"]::-webkit-slider-thumb { -webkit-appearance: none; width: 16px; height: 16px; border-radius: 50%; background: var(--color-accent, #8B5CF6); border: 2px solid var(--glass-frost); box-shadow: 0 2px 8px var(--glass-cast-shadow); cursor: pointer; }
        `}</style>

        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px', borderBottom: '1px solid var(--color-border)', flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <GearSix size={18} weight="regular" style={{ color: 'var(--text-primary)' }} />
            <span style={{ fontFamily: 'var(--font-ui)', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '0.08em' }}>SETTINGS</span>
          </div>
          <button onClick={onClose} aria-label="Close settings" style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: '28px', height: '28px', borderRadius: '8px',
            border: 'none', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer',
          }}><X size={16} weight="regular" /></button>
        </div>

        {/* Tab bar */}
        <div style={{
          display: 'flex', gap: '4px', padding: '10px 16px',
          borderBottom: '1px solid var(--color-border)', overflowX: 'auto', flexShrink: 0,
        }}>
          <button style={tabBtn('theme', 'Theme', Palette)} onClick={() => setActiveTab('theme')}>
            <Palette size={12} /> <span>Theme</span>
          </button>
          <button style={tabBtn('icons', 'Icons', Eye)} onClick={() => setActiveTab('icons')}>
            <Eye size={12} /> <span>Icons</span>
          </button>
          <button style={tabBtn('ai', 'AI', Sparkle)} onClick={() => setActiveTab('ai')}>
            <Sparkle size={12} /> <span>AI</span>
          </button>
          <button style={tabBtn('data', 'Data', Download)} onClick={() => setActiveTab('data')}>
            <Download size={12} /> <span>Data</span>
          </button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {activeTab === 'theme' && (
            <>
              {/* Dark/Light toggle */}
              <Section title="MODE">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={labelStyle}>{dark ? 'Dark Mode' : 'Light Mode'}</span>
                  <button onClick={handleThemeToggle} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    width: '36px', height: '36px', borderRadius: '10px',
                    border: '1px solid var(--color-border)', background: 'transparent',
                    color: 'var(--text-primary)', cursor: 'pointer',
                  }} aria-label={dark ? 'Switch to light' : 'Switch to dark'}>
                    {dark ? <Sun size={16} /> : <Moon size={16} />}
                  </button>
                </div>
              </Section>

              {/* Glass properties */}
              <Section title="GLASS">
                <div style={{ marginBottom: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                    <span style={labelStyle}>Opacity</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-disabled)' }}>
                      {Math.round(glassOpacity * 100)}%
                    </span>
                  </div>
                  <input type="range" min="0.1" max="1" step="0.05" value={glassOpacity}
                    onChange={e => setGlassOpacity(parseFloat(e.target.value))}
                    style={{ width: '100%' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: 'var(--text-disabled)' }}>
                    <span>Transparent</span>
                    <span>Frosted</span>
                    <span>Solid</span>
                  </div>
                </div>

                <div style={{ marginBottom: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                    <span style={labelStyle}>Thickness (roundness)</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-disabled)' }}>
                      {glassThickness}/5 · {getThicknessRadius(glassThickness)}px
                    </span>
                  </div>
                  <input type="range" min="1" max="5" step="1" value={glassThickness}
                    onChange={e => setGlassThickness(parseInt(e.target.value))}
                    style={{ width: '100%' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: 'var(--text-disabled)' }}>
                    <span>Sharp</span>
                    <span>Medium</span>
                    <span>Pill</span>
                  </div>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                    <span style={labelStyle}>Blur</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-disabled)' }}>
                      {glassBlur}px
                    </span>
                  </div>
                  <input type="range" min="4" max="60" step="2" value={glassBlur}
                    onChange={e => setGlassBlur(parseInt(e.target.value))}
                    style={{ width: '100%' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: 'var(--text-disabled)' }}>
                    <span>Sharp</span>
                    <span>Frosted</span>
                    <span>Cloudy</span>
                  </div>
                </div>
              </Section>

              {/* Colors */}
              <Section title="COLORS">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={labelStyle}>Accent Color</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input type="color" value={accentColor}
                        onChange={e => handleAccentColorChange(e.target.value)}
                        style={{ width: '32px', height: '32px', border: 'none', padding: 0, cursor: 'pointer', borderRadius: '8px', background: 'none' }} />
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-disabled)' }}>{accentColor}</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={labelStyle}>Text Primary</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input type="color" value={textPrimary}
                        onChange={e => handleTextPrimaryChange(e.target.value)}
                        style={{ width: '32px', height: '32px', border: 'none', padding: 0, cursor: 'pointer', borderRadius: '8px', background: 'none' }} />
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-disabled)' }}>{textPrimary}</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={labelStyle}>Text Secondary</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input type="color" value={textSecondary}
                        onChange={e => setTextSecondary(e.target.value)}
                        style={{ width: '32px', height: '32px', border: 'none', padding: 0, cursor: 'pointer', borderRadius: '8px', background: 'none' }} />
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-disabled)' }}>{textSecondary}</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={labelStyle}>Glass BG Color</span>
                    <input type="color" value={glassBgColor || '#0A0A0A'}
                      onChange={e => setGlassBgColor(e.target.value)}
                      style={{ width: '32px', height: '32px', border: 'none', padding: 0, cursor: 'pointer', borderRadius: '8px', background: 'none' }} />
                  </div>
                </div>
              </Section>
            </>
          )}

          {activeTab === 'icons' && (
            <>
              <Section title="MENU ICONS">
                <div style={{ fontSize: '10px', color: 'var(--text-disabled)', marginBottom: '8px', lineHeight: 1.5 }}>
                  Drag icons to reorder in menu. Long-press any icon to remove it. Drag icons from the pool below back into the menu.
                </div>

                {/* Active menu icons (mini preview) */}
                <div style={{
                  display: 'flex', flexWrap: 'wrap', gap: '4px',
                  padding: '10px', borderRadius: '10px',
                  border: '1px solid var(--color-border)', minHeight: '48px',
                  background: 'rgba(255,255,255,0.02)',
                }}
                  onDrop={handlePoolDrop}
                  onDragOver={handlePoolDragOver}
                >
                  {menuIcons.map((id, i) => {
                    const info = ICON_POOL.find(p => p.id === id);
                    if (!info) return null;
                    return (
                      <div key={id} draggable
                        onDragStart={e => {
                          e.dataTransfer.setData('text/plain', id);
                          e.dataTransfer.effectAllowed = 'move';
                        }}
                        onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }}
                        onDrop={e => {
                          e.preventDefault();
                          const fromId = e.dataTransfer.getData('text/plain');
                          if (!fromId || fromId === id) return;
                          const newOrder = menuIcons.filter(x => x !== fromId);
                          const idx = newOrder.indexOf(id);
                          newOrder.splice(idx + (newOrder.indexOf(fromId) < idx ? 1 : 0), 0, fromId);
                          setMenuIcons(newOrder);
                        }}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '4px',
                          padding: '4px 8px', borderRadius: '8px',
                          border: '1px solid var(--color-border)',
                          background: 'rgba(255,255,255,0.04)',
                          cursor: 'grab', fontSize: '11px',
                          color: 'var(--text-secondary)',
                          transition: 'all 0.1s',
                        }}
                      >
                        <span>{info.icon}</span>
                        <span>{info.label}</span>
                        <span style={{ cursor: 'pointer', opacity: 0.4, marginLeft: '2px' }}
                          onClick={() => {
                            setMenuIcons(prev => prev.filter(x => x !== id));
                            setRemovedIcons(prev => [...prev, id]);
                          }}>✕</span>
                      </div>
                    );
                  })}
                  {menuIcons.length === 0 && (
                    <div style={{ fontSize: '10px', color: 'var(--text-disabled)', width: '100%', textAlign: 'center', padding: '8px' }}>
                      No icons in menu. Drag from pool below.
                    </div>
                  )}
                </div>
              </Section>

              {/* Icon pool */}
              <Section title="ICON POOL">
                <div style={{ fontSize: '10px', color: 'var(--text-disabled)', marginBottom: '6px' }}>
                  Available icons — drag any into the menu above
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                  {ICON_POOL.map(info => {
                    const inMenu = menuIcons.includes(info.id);
                    const inRemoved = removedIcons.includes(info.id);
                    return (
                      <div key={info.id}
                        draggable
                        onDragStart={e => handlePoolDragStart(e, info.id)}
                        onDragEnd={handlePoolDragEnd}
                        onClick={() => inRemoved ? handleRestoreIcon(info.id) : null}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '4px',
                          padding: '4px 8px', borderRadius: '8px',
                          border: `1px solid ${inRemoved ? 'var(--color-border)' : 'rgba(255,255,255,0.04)'}`,
                          background: inRemoved
                            ? 'rgba(255,255,255,0.03)'
                            : inMenu
                              ? 'rgba(34,197,94,0.08)'
                              : 'rgba(255,255,255,0.04)',
                          cursor: inRemoved ? 'pointer' : 'grab',
                          fontSize: '11px',
                          color: inRemoved
                            ? 'var(--text-disabled)'
                            : inMenu
                              ? 'var(--text-primary)'
                              : 'var(--text-secondary)',
                          opacity: inMenu ? 0.6 : 1,
                          transition: 'all 0.1s',
                        }}
                        title={inRemoved ? 'Click to restore' : inMenu ? 'In menu (drag to reorder)' : 'Drag into menu'}
                      >
                        <span>{info.icon}</span>
                        <span>{info.label}</span>
                        {inRemoved && <span style={{ fontSize: '9px', opacity: 0.5 }}>↩</span>}
                      </div>
                    );
                  })}
                </div>
              </Section>
            </>
          )}

          {activeTab === 'ai' && (
            <Section title="AI ASSISTANT">
              {/* Provider tabs */}
              <div style={{ display: 'flex', gap: '4px', marginBottom: '12px', padding: '3px',
                background: 'rgba(255,255,255,0.04)', borderRadius: '12px', flexWrap: 'wrap' }}>
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
                    }} onClick={() => { setAiProvider(pid); setAiModel(PROVIDERS[pid].models[0]); setCustomModel(''); }}>
                      {p.icon}{p.name}
                    </button>
                  );
                })}
              </div>

              <div style={{ marginTop: '8px' }}>
                <span style={labelStyle}>Model</span>
                <select value={aiModel}
                  onChange={e => { setAiModel(e.target.value); if (e.target.value === 'custom') setCustomModel(''); }}
                  style={selectStyle}>
                  {(providerDef?.models || []).map(m => <option key={m} value={m}>{m}</option>)}
                  <option value="custom">Custom model ID…</option>
                </select>
              </div>

              {(aiModel === 'custom' || (providerDef && !providerDef.models.includes(aiModel))) && (
                <div style={{ marginTop: '8px' }}>
                  <span style={labelStyle}>Custom model ID</span>
                  <input type="text" placeholder="e.g. llama-3.3-70b-versatile" value={customModel}
                    onChange={e => setCustomModel(e.target.value)} style={inputStyle} />
                </div>
              )}

              {providerDef?.needsKey !== false && (
                <div style={{ marginTop: '10px' }}>
                  <span style={labelStyle}>{providerDef?.keyLabel || 'API Key'}</span>
                  <input type="password" value={aiKey} onChange={e => setAiKey(e.target.value)}
                    placeholder={providerDef?.keyPlaceholder || 'Enter API key'} style={inputStyle} />
                </div>
              )}

              {aiProvider === 'ollama' && (
                <div style={{ marginTop: '10px' }}>
                  <span style={labelStyle}>Endpoint</span>
                  <input type="text" value={aiEndpoint} onChange={e => setAiEndpoint(e.target.value)}
                    placeholder="http://localhost:11434" style={inputStyle} />
                </div>
              )}
            </Section>
          )}

          {activeTab === 'data' && (
            <Section title="DATA">
              <button onClick={handleExportAll} style={actionBtnStyle}>
                <Download size={14} /> Export All Data
              </button>
              <button onClick={handleClearData} style={{ ...actionBtnStyle, color: '#ef4444' }}>
                <Trash size={14} /> Clear All Data
              </button>
            </Section>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '12px 20px', borderTop: '1px solid var(--color-border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
        }}>
          <span style={{ fontFamily: 'var(--font-ui)', fontSize: '10px', color: 'var(--text-disabled)', letterSpacing: '0.06em' }}>
            V0.1 · LOOKING GLASS
          </span>
          <button onClick={handleSave} style={{
            padding: '8px 20px', borderRadius: '8px', border: 'none',
            background: saved ? 'rgba(34,197,94,0.2)' : 'var(--color-accent, #8B5CF6)',
            color: saved ? '#22c55e' : '#fff', cursor: 'pointer',
            fontFamily: 'var(--font-ui)', fontSize: '12px', fontWeight: 600,
            letterSpacing: '0.06em', transition: 'all 0.2s ease',
          }}>{saved ? '✓ SAVED' : 'SAVE'}</button>
        </div>
      </div>
    </>
  );
}

function Section({ title, children }) {
  return (
    <div>
      <div style={{
        fontFamily: 'var(--font-ui)', fontSize: '10px', fontWeight: 600,
        color: 'var(--text-disabled)', letterSpacing: '0.12em', marginBottom: '10px',
      }}>{title}</div>
      <div style={{
        padding: '14px', borderRadius: '14px',
        border: '1px solid var(--color-border)',
        background: 'rgba(255,255,255,0.02)',
        display: 'flex', flexDirection: 'column', gap: '6px',
      }}>{children}</div>
    </div>
  );
}

const labelStyle = {
  fontFamily: 'var(--font-ui)', fontSize: '11px',
  color: 'var(--text-secondary)', letterSpacing: '0.04em',
};

const inputStyle = {
  width: '100%', padding: '8px 12px', borderRadius: '10px',
  border: '1px solid var(--color-border)',
  background: 'rgba(255,255,255,0.04)',
  color: 'var(--text-primary)',
  fontFamily: 'var(--font-mono)', fontSize: '12px',
  outline: 'none', marginTop: '4px', boxSizing: 'border-box',
};

const selectStyle = {
  width: '100%', padding: '8px 12px', borderRadius: '10px',
  border: '1px solid var(--color-border)',
  background: 'rgba(255,255,255,0.05)',
  color: 'var(--text-primary)', fontFamily: 'var(--font-ui)', fontSize: '12px',
  outline: 'none', marginTop: '4px', cursor: 'pointer', appearance: 'none',
};

const actionBtnStyle = {
  display: 'flex', alignItems: 'center', gap: '8px',
  padding: '8px 12px', borderRadius: '10px',
  border: '1px solid var(--color-border)',
  background: 'transparent', color: 'var(--text-secondary)',
  cursor: 'pointer', fontFamily: 'var(--font-ui)', fontSize: '12px', textAlign: 'left',
};