/**
 * LOOKING GLASS — Settings Panel
 * Slides in from the left as a liquid glass overlay.
 * Controls: Full theme (glass/colors/background/font), icons, AI, data.
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { X, GearSix, Sun, Moon, Trash, Download, Sparkle, Palette, Eye, Image, TextT, Upload } from '@phosphor-icons/react';
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
  const [activeTab, setActiveTab] = useState('theme');

  // ── Theme state — glass ──
  const [glassOpacity, setGlassOpacity] = useState(THEME_DEFAULTS.glassOpacity);
  const [glassThickness, setGlassThickness] = useState(THEME_DEFAULTS.glassThickness);
  const [glassBlur, setGlassBlur] = useState(THEME_DEFAULTS.glassBlur);
  const [glassColor, setGlassColor] = useState(THEME_DEFAULTS.glassColor);
  const [bgColor, setBgColor] = useState(THEME_DEFAULTS.bgColor);
  const [accentColor, setAccentColor] = useState(THEME_DEFAULTS.accentColor);
  const [textPrimary, setTextPrimary] = useState(THEME_DEFAULTS.textPrimary);
  const [textSecondary, setTextSecondary] = useState(THEME_DEFAULTS.textSecondary);

  // ── Theme state — background image ──
  const [bgImage, setBgImage] = useState(THEME_DEFAULTS.bgImage);
  const [bgImageMode, setBgImageMode] = useState(THEME_DEFAULTS.bgImageMode);
  const [bgImageOpacity, setBgImageOpacity] = useState(THEME_DEFAULTS.bgImageOpacity);
  const [bgOverlay1, setBgOverlay1] = useState(THEME_DEFAULTS.bgOverlay1);
  const [bgOverlay1Opacity, setBgOverlay1Opacity] = useState(THEME_DEFAULTS.bgOverlay1Opacity);
  const [bgOverlay2, setBgOverlay2] = useState(THEME_DEFAULTS.bgOverlay2);
  const [bgOverlay2Opacity, setBgOverlay2Opacity] = useState(THEME_DEFAULTS.bgOverlay2Opacity);
  const fileInputRef = useRef(null);

  // ── Theme state — fonts ──
  const [fontFamily, setFontFamily] = useState(THEME_DEFAULTS.fontFamily);
  const [fontImport, setFontImport] = useState(THEME_DEFAULTS.fontImport);
  const [fontSize, setFontSize] = useState(THEME_DEFAULTS.fontSize);
  const [fontDropShadow, setFontDropShadow] = useState(THEME_DEFAULTS.fontDropShadow);
  const [fontShadowColor, setFontShadowColor] = useState(THEME_DEFAULTS.fontShadowColor);
  const [fontShadowOffsetX, setFontShadowOffsetX] = useState(THEME_DEFAULTS.fontShadowOffsetX);
  const [fontShadowOffsetY, setFontShadowOffsetY] = useState(THEME_DEFAULTS.fontShadowOffsetY);
  const [fontShadowBlur, setFontShadowBlur] = useState(THEME_DEFAULTS.fontShadowBlur);
  const [fontStroke, setFontStroke] = useState(THEME_DEFAULTS.fontStroke);
  const [fontStrokeColor, setFontStrokeColor] = useState(THEME_DEFAULTS.fontStrokeColor);
  const [fontStrokeWidth, setFontStrokeWidth] = useState(THEME_DEFAULTS.fontStrokeWidth);
  const fontFileInputRef = useRef(null);

  // Icon pool state
  const [menuIcons, setMenuIcons] = useState([]);
  const [removedIcons, setRemovedIcons] = useState([]);
  const [draggingPoolId, setDraggingPoolId] = useState(null);

  // ── Live preview helper ──
  const preview = useCallback((partial) => {
    const tc = loadThemeConfig();
    Object.assign(tc, partial);
    applyThemeConfig(tc);
  }, []);

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
    const tc = loadThemeConfig();
    setGlassOpacity(tc.glassOpacity);
    setGlassThickness(tc.glassThickness);
    setGlassBlur(tc.glassBlur);
    setGlassColor(tc.glassColor || '');
    setBgColor(tc.bgColor || '');
    setAccentColor(tc.accentColor);
    setTextPrimary(tc.textPrimary);
    setTextSecondary(tc.textSecondary);
    setBgImage(tc.bgImage || '');
    setBgImageMode(tc.bgImageMode);
    setBgImageOpacity(tc.bgImageOpacity);
    setBgOverlay1(tc.bgOverlay1 || '');
    setBgOverlay1Opacity(tc.bgOverlay1Opacity);
    setBgOverlay2(tc.bgOverlay2 || '');
    setBgOverlay2Opacity(tc.bgOverlay2Opacity);
    setFontFamily(tc.fontFamily || '');
    setFontImport(tc.fontImport || '');
    setFontSize(tc.fontSize);
    setFontDropShadow(tc.fontDropShadow);
    setFontShadowColor(tc.fontShadowColor);
    setFontShadowOffsetX(tc.fontShadowOffsetX);
    setFontShadowOffsetY(tc.fontShadowOffsetY);
    setFontShadowBlur(tc.fontShadowBlur);
    setFontStroke(tc.fontStroke);
    setFontStrokeColor(tc.fontStrokeColor);
    setFontStrokeWidth(tc.fontStrokeWidth);
    setMenuIcons(tc.menuIconOrder || []);
    setRemovedIcons(tc.removedIcons || []);
    setDark(isDark());
    setSaved(false);
  }, [isOpen]);

  // ── Save all ──
  const handleSave = useCallback(() => {
    const p = getProviderDef(aiProvider);
    const modelToSave = aiModel === 'custom' || (!p.models.includes(aiModel)) ? customModel : aiModel;
    saveAIConfig({ provider: aiProvider, model: modelToSave || p.models[0], key: aiKey, endpoint: aiEndpoint });
    const tc = loadThemeConfig();
    tc.glassOpacity = glassOpacity;
    tc.glassThickness = glassThickness;
    tc.glassBlur = glassBlur;
    tc.glassColor = glassColor;
    tc.bgColor = bgColor;
    tc.accentColor = accentColor;
    tc.textPrimary = textPrimary;
    tc.textSecondary = textSecondary;
    tc.bgImage = bgImage;
    tc.bgImageMode = bgImageMode;
    tc.bgImageOpacity = bgImageOpacity;
    tc.bgOverlay1 = bgOverlay1;
    tc.bgOverlay1Opacity = bgOverlay1Opacity;
    tc.bgOverlay2 = bgOverlay2;
    tc.bgOverlay2Opacity = bgOverlay2Opacity;
    tc.fontFamily = fontFamily;
    tc.fontImport = fontImport;
    tc.fontSize = fontSize;
    tc.fontDropShadow = fontDropShadow;
    tc.fontShadowColor = fontShadowColor;
    tc.fontShadowOffsetX = fontShadowOffsetX;
    tc.fontShadowOffsetY = fontShadowOffsetY;
    tc.fontShadowBlur = fontShadowBlur;
    tc.fontStroke = fontStroke;
    tc.fontStrokeColor = fontStrokeColor;
    tc.fontStrokeWidth = fontStrokeWidth;
    tc.menuIconOrder = menuIcons;
    tc.removedIcons = removedIcons;
    saveThemeConfig(tc);
    applyThemeConfig(tc);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    if (onMenuIconsChange) onMenuIconsChange(menuIcons);
  }, [aiProvider, aiKey, aiEndpoint, aiModel, customModel, glassOpacity, glassThickness, glassBlur, glassColor, bgColor, accentColor, textPrimary, textSecondary, bgImage, bgImageMode, bgImageOpacity, bgOverlay1, bgOverlay1Opacity, bgOverlay2, bgOverlay2Opacity, fontFamily, fontImport, fontSize, fontDropShadow, fontShadowColor, fontShadowOffsetX, fontShadowOffsetY, fontShadowBlur, fontStroke, fontStrokeColor, fontStrokeWidth, menuIcons, removedIcons, onMenuIconsChange]);

  // ── Background image upload ──
  const handleImageUpload = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result;
      if (typeof dataUrl === 'string') {
        setBgImage(dataUrl);
        preview({ bgImage: dataUrl, bgImageOpacity, bgImageMode });
      }
    };
    reader.readAsDataURL(file);
  }, [preview, bgImageOpacity, bgImageMode]);

  // ── Font file upload ──
  const handleFontUpload = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result;
      if (typeof dataUrl === 'string') {
        const fontName = file.name.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9]/g, '');
        const css = `@font-face { font-family: '${fontName}'; src: url('${dataUrl}') format('truetype'); } body * { font-family: '${fontName}', sans-serif !important; }`;
        setFontImport(css);
        setFontFamily(`'${fontName}', sans-serif`);
        preview({ fontImport: css, fontFamily: `'${fontName}', sans-serif` });
      }
    };
    reader.readAsDataURL(file);
  }, [preview]);

  const handleThemeToggle = useCallback(() => {
    toggleTheme(!dark ? 'dark' : 'light');
    setDark(!dark);
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

  // ── Icon drag/drop ──
  const handlePoolDrop = useCallback((e) => {
    e.preventDefault();
    const iconId = e.dataTransfer.getData('text/plain');
    if (!iconId || menuIcons.includes(iconId)) return;
    setMenuIcons(prev => [...prev, iconId]);
    setRemovedIcons(prev => prev.filter(i => i !== iconId));
    setDraggingPoolId(null);
  }, [menuIcons]);

  const handlePoolDragOver = useCallback((e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; }, []);

  if (!isOpen) return null;

  const providerDef = getProviderDef(aiProvider);

  const tabBtn = (id, label, Icon) => ({
    display: 'flex', alignItems: 'center', gap: '6px',
    padding: '6px 12px', borderRadius: '10px', border: 'none',
    background: activeTab === id ? 'rgba(255,255,255,0.10)' : 'transparent',
    color: activeTab === id ? 'var(--text-primary)' : 'var(--text-secondary)',
    cursor: 'pointer', fontFamily: 'var(--font-ui)', fontSize: '11px',
    fontWeight: activeTab === id ? 600 : 400, letterSpacing: '0.04em',
    transition: 'all 0.15s',
  });

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 'var(--z-dropdown)', background: 'rgba(0,0,0,0.40)' }} />
      <div role="dialog" aria-label="Settings" style={{
        position: 'fixed', top: 0, left: 0, bottom: 0,
        width: 'min(440px, 92vw)', zIndex: 'var(--z-dropdown)',
        background: 'var(--glass-frost)', backdropFilter: 'blur(32px) saturate(120%)',
        WebkitBackdropFilter: 'blur(32px) saturate(120%)',
        borderRight: '1px solid var(--color-border)',
        boxShadow: '8px 0 48px var(--glass-cast-shadow)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        animation: 'lg-settings-slide 0.25s cubic-bezier(0.32,0.72,0,1) both',
      }}>
        <style>{`
          @keyframes lg-settings-slide { from { transform: translateX(-100%); } to { transform: translateX(0); } }
          input[type="range"] { -webkit-appearance: none; appearance: none; height: 4px; border-radius: 2px; background: var(--color-border); outline: none; cursor: pointer; width: 100%; }
          input[type="range"]::-webkit-slider-thumb { -webkit-appearance: none; width: 16px; height: 16px; border-radius: 50%; background: var(--color-accent, #8B5CF6); border: 2px solid var(--glass-frost); box-shadow: 0 2px 8px var(--glass-cast-shadow); cursor: pointer; }
          .lg-settings-section + .lg-settings-section { margin-top: 16px; }
        `}</style>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--color-border)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <GearSix size={18} weight="regular" style={{ color: 'var(--text-primary)' }} />
            <span style={{ fontFamily: 'var(--font-ui)', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '0.08em' }}>SETTINGS</span>
          </div>
          <button onClick={onClose} aria-label="Close settings" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', borderRadius: '8px', border: 'none', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer' }}>
            <X size={16} weight="regular" />
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '4px', padding: '10px 16px', borderBottom: '1px solid var(--color-border)', overflowX: 'auto', flexShrink: 0 }}>
          <button style={tabBtn('theme', 'Theme', Palette)} onClick={() => setActiveTab('theme')}><Palette size={12} /><span>Theme</span></button>
          <button style={tabBtn('icons', 'Icons', Eye)} onClick={() => setActiveTab('icons')}><Eye size={12} /><span>Icons</span></button>
          <button style={tabBtn('ai', 'AI', Sparkle)} onClick={() => setActiveTab('ai')}><Sparkle size={12} /><span>AI</span></button>
          <button style={tabBtn('data', 'Data', Download)} onClick={() => setActiveTab('data')}><Download size={12} /><span>Data</span></button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {activeTab === 'theme' && (
            <>
              {/* ── MODE ── */}
              <SettingsSection title="MODE">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={sLabel}>{dark ? 'Dark Mode' : 'Light Mode'}</span>
                  <button onClick={handleThemeToggle} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px', borderRadius: '10px', border: '1px solid var(--color-border)', background: 'transparent', color: 'var(--text-primary)', cursor: 'pointer' }}>
                    {dark ? <Sun size={16} /> : <Moon size={16} />}
                  </button>
                </div>
              </SettingsSection>

              {/* ── GLASS ── */}
              <SettingsSection title="GLASS">
                <SliderRow label="Opacity" value={`${Math.round(glassOpacity * 100)}%`}>
                  <input type="range" min="0.05" max="1" step="0.05" value={glassOpacity} onChange={e => { const v = parseFloat(e.target.value); setGlassOpacity(v); preview({ glassOpacity: v }); }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: 'var(--text-disabled)' }}><span>Transparent</span><span>Frosted</span><span>Solid</span></div>
                </SliderRow>
                <SliderRow label="Thickness" value={`${glassThickness}/5 · ${getThicknessRadius(glassThickness)}px`}>
                  <input type="range" min="1" max="5" step="1" value={glassThickness} onChange={e => { const v = parseInt(e.target.value); setGlassThickness(v); preview({ glassThickness: v }); }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: 'var(--text-disabled)' }}><span>Sharp</span><span>Medium</span><span>Pill</span></div>
                </SliderRow>
                <SliderRow label="Blur" value={`${glassBlur}px`}>
                  <input type="range" min="4" max="60" step="2" value={glassBlur} onChange={e => { const v = parseInt(e.target.value); setGlassBlur(v); preview({ glassBlur: v }); }} />
                </SliderRow>
                <div style={{ marginTop: '4px' }}>
                  <ColorRow label="Glass Color" value={glassColor} onChange={v => { setGlassColor(v); preview({ glassColor: v }); }} placeholder="#0A0A0A" />
                  <ColorRow label="Background" value={bgColor} onChange={v => { setBgColor(v); preview({ bgColor: v }); }} placeholder="Default" />
                </div>
              </SettingsSection>

              {/* ── COLORS ── */}
              <SettingsSection title="COLORS">
                <ColorRow label="Accent Color" value={accentColor} onChange={v => { setAccentColor(v); preview({ accentColor: v }); }} />
                <ColorRow label="Text Primary" value={textPrimary} onChange={v => { setTextPrimary(v); preview({ textPrimary: v }); }} />
                <ColorRow label="Text Secondary" value={textSecondary} onChange={v => { setTextSecondary(v); preview({ textSecondary: v }); }} />
              </SettingsSection>

              {/* ── BACKGROUND IMAGE ── */}
              <SettingsSection title="BACKGROUND">
                <div style={{ marginBottom: '8px' }}>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <button onClick={() => fileInputRef.current?.click()} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 14px', borderRadius: '10px', border: '1px dashed var(--color-border)', background: 'rgba(255,255,255,0.03)', color: 'var(--text-secondary)', cursor: 'pointer', fontFamily: 'var(--font-ui)', fontSize: '11px', flex: 1 }}>
                      <Upload size={14} /> {bgImage ? 'Change Image' : 'Upload Image'}
                    </button>
                    {bgImage && <button onClick={() => { setBgImage(''); preview({ bgImage: '' }); }} style={{ padding: '8px 12px', borderRadius: '10px', border: '1px solid var(--color-border)', background: 'transparent', color: '#ef4444', cursor: 'pointer', fontSize: '11px', fontFamily: 'var(--font-ui)' }}>Clear</button>}
                  </div>
                  <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} />
                </div>

                {bgImage && (
                  <>
                    {/* Mode selector */}
                    <div style={{ display: 'flex', gap: '4px', marginBottom: '8px', padding: '3px', background: 'rgba(255,255,255,0.04)', borderRadius: '10px' }}>
                      {['cover', 'center', 'tile', 'stretch'].map(m => (
                        <button key={m} onClick={() => { setBgImageMode(m); preview({ bgImageMode: m }); }}
                          style={{ flex: 1, padding: '4px 6px', borderRadius: '8px', border: 'none', background: bgImageMode === m ? 'rgba(255,255,255,0.10)' : 'transparent', color: bgImageMode === m ? 'var(--text-primary)' : 'var(--text-secondary)', cursor: 'pointer', fontFamily: 'var(--font-ui)', fontSize: '9px', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                          {m}
                        </button>
                      ))}
                    </div>

                    <SliderRow label="Opacity" value={`${Math.round(bgImageOpacity * 100)}%`}>
                      <input type="range" min="0.1" max="1" step="0.05" value={bgImageOpacity} onChange={e => { const v = parseFloat(e.target.value); setBgImageOpacity(v); preview({ bgImageOpacity: v }); }} />
                    </SliderRow>

                    <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '10px', marginTop: '6px' }}>
                      <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-disabled)', letterSpacing: '0.08em', marginBottom: '8px' }}>OVERLAYS</div>
                      <OverlayRow label="Overlay 1" color={bgOverlay1} opacity={bgOverlay1Opacity}
                        onColorChange={v => { setBgOverlay1(v); preview({ bgOverlay1: v }); }}
                        onOpacityChange={v => { setBgOverlay1Opacity(v); preview({ bgOverlay1Opacity: v }); }} />
                      <OverlayRow label="Overlay 2" color={bgOverlay2} opacity={bgOverlay2Opacity}
                        onColorChange={v => { setBgOverlay2(v); preview({ bgOverlay2: v }); }}
                        onOpacityChange={v => { setBgOverlay2Opacity(v); preview({ bgOverlay2Opacity: v }); }} />
                    </div>
                  </>
                )}
                {!bgImage && <div style={{ fontSize: '10px', color: 'var(--text-disabled)' }}>Upload an image to use as a full-screen background.</div>}
              </SettingsSection>

              {/* ── TYPOGRAPHY ── */}
              <SettingsSection title="TYPOGRAPHY">
                {/* Font upload */}
                <div style={{ marginBottom: '10px' }}>
                  <div style={sLabel}>Upload Font</div>
                  <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                    <button onClick={() => fontFileInputRef.current?.click()} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 12px', borderRadius: '8px', border: '1px dashed var(--color-border)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', fontFamily: 'var(--font-ui)', fontSize: '10px', flex: 1 }}>
                      <Upload size={12} /> Upload .ttf / .otf / .woff
                    </button>
                    {fontImport && <button onClick={() => { setFontImport(''); setFontFamily(''); preview({ fontImport: '', fontFamily: '' }); }} style={{ padding: '7px 10px', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'transparent', color: '#ef4444', cursor: 'pointer', fontSize: '10px', fontFamily: 'var(--font-ui)' }}>Reset</button>}
                  </div>
                  <input ref={fontFileInputRef} type="file" accept=".ttf,.otf,.woff,.woff2" onChange={handleFontUpload} style={{ display: 'none' }} />
                </div>

                {/* Google Fonts / custom import */}
                <div style={{ marginBottom: '10px' }}>
                  <div style={sLabel}>Google Fonts Import URL</div>
                  <input type="text" value={fontImport} onChange={e => setFontImport(e.target.value)} placeholder='@import url("https://fonts.googleapis.com/css2?family=Inter:opsz@14..32&display=swap");' style={{
                    width: '100%', padding: '7px 10px', borderRadius: '8px', border: '1px solid var(--color-border)',
                    background: 'rgba(255,255,255,0.04)', color: 'var(--text-primary)',
                    fontFamily: 'var(--font-mono)', fontSize: '10px', outline: 'none', marginTop: '4px', boxSizing: 'border-box', resize: 'vertical', minHeight: '40px',
                  }} />
                </div>

                {/* Font family override */}
                <div style={{ marginBottom: '10px' }}>
                  <div style={sLabel}>Font Family (CSS value)</div>
                  <input type="text" value={fontFamily} onChange={e => { setFontFamily(e.target.value); preview({ fontFamily: e.target.value }); }} placeholder="'Inter', sans-serif" style={textInputStyle} />
                  <div style={{ fontSize: '9px', color: 'var(--text-disabled)', marginTop: '2px' }}>After setting @import above, paste the font-family name here.</div>
                </div>

                <SliderRow label="Base Font Size" value={`${fontSize}px`}>
                  <input type="range" min="10" max="24" step="1" value={fontSize} onChange={e => { const v = parseInt(e.target.value); setFontSize(v); preview({ fontSize: v }); }} />
                </SliderRow>

                {/* Drop shadow */}
                <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid var(--color-border)' }}>
                  <ToggleRow label="Text Drop Shadow" enabled={fontDropShadow} onChange={v => { setFontDropShadow(v); preview({ fontDropShadow: v }); }} />
                  {fontDropShadow && (
                    <div style={{ marginTop: '6px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <ColorRow label="Shadow Color" value={fontShadowColor} onChange={v => { setFontShadowColor(v); preview({ fontShadowColor: v }); }} />
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <div style={{ flex: 1 }}><SliderRow label="Offset X" value={`${fontShadowOffsetX}px`}><input type="range" min="0" max="6" step="1" value={fontShadowOffsetX} onChange={e => { const v = parseInt(e.target.value); setFontShadowOffsetX(v); preview({ fontShadowOffsetX: v }); }} /></SliderRow></div>
                        <div style={{ flex: 1 }}><SliderRow label="Offset Y" value={`${fontShadowOffsetY}px`}><input type="range" min="0" max="6" step="1" value={fontShadowOffsetY} onChange={e => { const v = parseInt(e.target.value); setFontShadowOffsetY(v); preview({ fontShadowOffsetY: v }); }} /></SliderRow></div>
                      </div>
                      <SliderRow label="Blur" value={`${fontShadowBlur}px`}><input type="range" min="0" max="12" step="1" value={fontShadowBlur} onChange={e => { const v = parseInt(e.target.value); setFontShadowBlur(v); preview({ fontShadowBlur: v }); }} /></SliderRow>
                    </div>
                  )}
                </div>

                {/* Stroke */}
                <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid var(--color-border)' }}>
                  <ToggleRow label="Text Stroke (outline)" enabled={fontStroke} onChange={v => { setFontStroke(v); preview({ fontStroke: v }); }} />
                  {fontStroke && (
                    <div style={{ marginTop: '6px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <ColorRow label="Stroke Color" value={fontStrokeColor} onChange={v => { setFontStrokeColor(v); preview({ fontStrokeColor: v }); }} />
                      <SliderRow label="Stroke Width" value={`${fontStrokeWidth}px`}><input type="range" min="0.5" max="4" step="0.5" value={fontStrokeWidth} onChange={e => { const v = parseFloat(e.target.value); setFontStrokeWidth(v); preview({ fontStrokeWidth: v }); }} /></SliderRow>
                    </div>
                  )}
                </div>
              </SettingsSection>
            </>
          )}

          {activeTab === 'icons' && (
            <>
              {/* ── ICONS ── */}
              <SettingsSection title="MENU ICONS">
                <div style={{ fontSize: '10px', color: 'var(--text-disabled)', marginBottom: '8px', lineHeight: 1.5 }}>
                  Drag to reorder. Long-press in menu to remove. Drag from pool below to add back.
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', padding: '10px', borderRadius: '10px', border: '1px solid var(--color-border)', minHeight: '48px', background: 'rgba(255,255,255,0.02)' }}
                  onDrop={handlePoolDrop} onDragOver={handlePoolDragOver}>
                  {menuIcons.map((id) => {
                    const info = ICON_POOL.find(p => p.id === id);
                    if (!info) return null;
                    return (
                      <div key={id} draggable
                        onDragStart={e => { e.dataTransfer.setData('text/plain', id); e.dataTransfer.effectAllowed = 'move'; }}
                        onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }}
                        onDrop={e => { e.preventDefault(); const fromId = e.dataTransfer.getData('text/plain'); if (!fromId || fromId === id) return; const newOrder = menuIcons.filter(x => x !== fromId); const idx = newOrder.indexOf(id); newOrder.splice(idx + (newOrder.indexOf(fromId) < idx ? 1 : 0), 0, fromId); setMenuIcons(newOrder); }}
                        style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 8px', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'rgba(255,255,255,0.04)', cursor: 'grab', fontSize: '11px', color: 'var(--text-secondary)' }}>
                        <span>{info.icon}</span><span>{info.label}</span>
                        <span style={{ cursor: 'pointer', opacity: 0.4, marginLeft: '2px' }} onClick={() => { setMenuIcons(prev => prev.filter(x => x !== id)); setRemovedIcons(prev => [...prev, id]); }}>✕</span>
                      </div>
                    );
                  })}
                  {menuIcons.length === 0 && <div style={{ fontSize: '10px', color: 'var(--text-disabled)', width: '100%', textAlign: 'center', padding: '8px' }}>No icons. Drag from pool below.</div>}
                </div>
              </SettingsSection>
              <SettingsSection title="ICON POOL">
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                  {ICON_POOL.map(info => {
                    const inMenu = menuIcons.includes(info.id);
                    const inRemoved = removedIcons.includes(info.id);
                    return (
                      <div key={info.id} draggable
                        onDragStart={e => { setDraggingPoolId(info.id); e.dataTransfer.setData('text/plain', info.id); e.dataTransfer.effectAllowed = 'copy'; }}
                        onDragEnd={() => setDraggingPoolId(null)}
                        onClick={() => inRemoved ? (setMenuIcons(prev => prev.includes(info.id) ? prev : [...prev, info.id]), setRemovedIcons(prev => prev.filter(i => i !== info.id))) : null}
                        style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 8px', borderRadius: '8px', border: `1px solid ${inRemoved ? 'var(--color-border)' : 'rgba(255,255,255,0.04)'}`, background: inRemoved ? 'rgba(255,255,255,0.03)' : inMenu ? 'rgba(34,197,94,0.08)' : 'rgba(255,255,255,0.04)', cursor: inRemoved ? 'pointer' : 'grab', fontSize: '11px', color: inRemoved ? 'var(--text-disabled)' : inMenu ? 'var(--text-primary)' : 'var(--text-secondary)', opacity: inMenu ? 0.6 : 1 }}>
                        <span>{info.icon}</span><span>{info.label}</span>
                        {inRemoved && <span style={{ fontSize: '9px', opacity: 0.5 }}>↩</span>}
                      </div>
                    );
                  })}
                </div>
              </SettingsSection>
            </>
          )}

          {activeTab === 'ai' && (
            <SettingsSection title="AI ASSISTANT">
              <div style={{ display: 'flex', gap: '4px', marginBottom: '12px', padding: '3px', background: 'rgba(255,255,255,0.04)', borderRadius: '12px', flexWrap: 'wrap' }}>
                {Object.entries(PROVIDERS).map(([pid, p]) => (
                  <button key={pid} onClick={() => { setAiProvider(pid); setAiModel(PROVIDERS[pid].models[0]); setCustomModel(''); }}
                    style={{ flex: '1 0 auto', background: pid === aiProvider ? 'rgba(255,255,255,0.10)' : 'none', border: 'none', borderRadius: '9px', padding: '5px 6px', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif", fontSize: '10px', fontWeight: pid === aiProvider ? 600 : 400, color: pid === aiProvider ? 'rgba(238,238,248,0.90)' : 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    {p.icon}{p.name}
                  </button>
                ))}
              </div>
              <div style={{ marginTop: '8px' }}><span style={sLabel}>Model</span>
                <select value={aiModel} onChange={e => { setAiModel(e.target.value); if (e.target.value === 'custom') setCustomModel(''); }} style={selStyle}>
                  {(providerDef?.models || []).map(m => <option key={m} value={m}>{m}</option>)}
                  <option value="custom">Custom model ID…</option>
                </select>
              </div>
              {(aiModel === 'custom' || (providerDef && !providerDef.models.includes(aiModel))) && (
                <div style={{ marginTop: '8px' }}><span style={sLabel}>Custom model ID</span>
                  <input type="text" placeholder="e.g. llama-3.3-70b-versatile" value={customModel} onChange={e => setCustomModel(e.target.value)} style={textInputStyle} />
                </div>
              )}
              {providerDef?.needsKey !== false && (
                <div style={{ marginTop: '10px' }}><span style={sLabel}>{providerDef?.keyLabel || 'API Key'}</span>
                  <input type="password" value={aiKey} onChange={e => setAiKey(e.target.value)} placeholder={providerDef?.keyPlaceholder || 'Enter API key'} style={textInputStyle} />
                </div>
              )}
              {aiProvider === 'ollama' && (
                <div style={{ marginTop: '10px' }}><span style={sLabel}>Endpoint</span>
                  <input type="text" value={aiEndpoint} onChange={e => setAiEndpoint(e.target.value)} placeholder="http://localhost:11434" style={textInputStyle} />
                </div>
              )}
            </SettingsSection>
          )}

          {activeTab === 'data' && (
            <SettingsSection title="DATA">
              <button onClick={handleExportAll} style={actBtnStyle}><Download size={14} /> Export All Data</button>
              <button onClick={handleClearData} style={{ ...actBtnStyle, color: '#ef4444' }}><Trash size={14} /> Clear All Data</button>
            </SettingsSection>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '12px 20px', borderTop: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <span style={{ fontFamily: 'var(--font-ui)', fontSize: '10px', color: 'var(--text-disabled)', letterSpacing: '0.06em' }}>V0.1 · LOOKING GLASS</span>
          <button onClick={handleSave} style={{ padding: '8px 20px', borderRadius: '8px', border: 'none', background: saved ? 'rgba(34,197,94,0.2)' : 'var(--color-accent, #8B5CF6)', color: saved ? '#22c55e' : '#fff', cursor: 'pointer', fontFamily: 'var(--font-ui)', fontSize: '12px', fontWeight: 600, letterSpacing: '0.06em', transition: 'all 0.2s ease' }}>
            {saved ? '✓ SAVED' : 'SAVE'}
          </button>
        </div>
      </div>
    </>
  );
}

// ── Sub-components ──

function SettingsSection({ title, children }) {
  return (
    <div className="lg-settings-section">
      <div style={{ fontFamily: 'var(--font-ui)', fontSize: '10px', fontWeight: 600, color: 'var(--text-disabled)', letterSpacing: '0.12em', marginBottom: '10px' }}>{title}</div>
      <div style={{ padding: '14px', borderRadius: '14px', border: '1px solid var(--color-border)', background: 'rgba(255,255,255,0.02)', display: 'flex', flexDirection: 'column', gap: '8px' }}>{children}</div>
    </div>
  );
}

function SliderRow({ label, value, children }) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
        <span style={sLabel}>{label}</span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-disabled)' }}>{value}</span>
      </div>
      {children}
    </div>
  );
}

function ColorRow({ label, value, onChange, placeholder }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2px' }}>
      <span style={sLabel}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <input type="color" value={value || '#000000'} onChange={e => onChange(e.target.value)}
          style={{ width: '30px', height: '30px', border: 'none', padding: 0, cursor: 'pointer', borderRadius: '6px', background: 'none' }} />
        <input type="text" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder || '#000000'}
          style={{ width: '80px', padding: '4px 6px', borderRadius: '6px', border: '1px solid var(--color-border)', background: 'rgba(255,255,255,0.04)', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', fontSize: '10px', outline: 'none' }} />
      </div>
    </div>
  );
}

function OverlayRow({ label, color, opacity, onColorChange, onOpacityChange }) {
  return (
    <div style={{ marginBottom: '4px' }}>
      <ColorRow label={label} value={color} onChange={onColorChange} placeholder="#000000" />
      <div style={{ marginTop: '2px', paddingLeft: '0' }}>
        <input type="range" min="0" max="1" step="0.05" value={opacity} onChange={e => onOpacityChange(parseFloat(e.target.value))} style={{ width: '100%' }} />
      </div>
    </div>
  );
}

function ToggleRow({ label, enabled, onChange }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <span style={sLabel}>{label}</span>
      <button onClick={() => onChange(!enabled)} style={{
        width: '36px', height: '22px', borderRadius: '11px', border: 'none',
        background: enabled ? 'var(--color-accent, #8B5CF6)' : 'rgba(255,255,255,0.10)',
        cursor: 'pointer', position: 'relative', transition: 'background 0.15s',
      }}>
        <span style={{
          position: 'absolute', top: '2px', left: enabled ? '18px' : '2px',
          width: '18px', height: '18px', borderRadius: '50%',
          background: '#fff', transition: 'left 0.15s',
        }} />
      </button>
    </div>
  );
}

// Styles
const sLabel = { fontFamily: 'var(--font-ui)', fontSize: '11px', color: 'var(--text-secondary)', letterSpacing: '0.04em' };
const textInputStyle = { width: '100%', padding: '7px 10px', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'rgba(255,255,255,0.04)', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', fontSize: '11px', outline: 'none', marginTop: '4px', boxSizing: 'border-box' };
const selStyle = { width: '100%', padding: '7px 10px', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'rgba(255,255,255,0.05)', color: 'var(--text-primary)', fontFamily: 'var(--font-ui)', fontSize: '11px', outline: 'none', marginTop: '4px', cursor: 'pointer', appearance: 'none' };
const actBtnStyle = { display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', borderRadius: '10px', border: '1px solid var(--color-border)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', fontFamily: 'var(--font-ui)', fontSize: '12px', textAlign: 'left' };
