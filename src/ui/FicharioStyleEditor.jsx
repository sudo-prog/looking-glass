/**
 * LOOKING GLASS — Fichário Style Editor
 * Popup panel (opened via the binder's right-click "Style…" item) for
 * customizing one Fichário's appearance: binder + tab colors, corner
 * radius, and font size / color / weight for headings, body, and tabs.
 * Writes straight to item.style.fichario via ficharioSetStyle(), which
 * FicharioCard reads and applies live as CSS custom properties.
 */
import React, { useEffect, useRef } from 'react';
import { X, ArrowCounterClockwise } from '@phosphor-icons/react';
import { useStore } from '../store/useStore.js';
import { getFicharioStyle } from '../data/schema.js';

const BG_SWATCHES = [null, '#141414', '#1A1A1A', '#0F1B14', '#1B1420', '#1B1414'];
const ACCENT_SWATCHES = ['#E8C468', '#5B9BD5', '#B18CD9', '#4FB8A8', '#E0954D', '#D71921', '#5FBF7A', '#5C6FA8'];
const TEXT_COLOR_SWATCHES = [null, '#F5F5F5', '#999999', '#D71921', '#5FBF7A', '#5B9BD5'];
const WEIGHTS = [
  { value: 400, label: 'Regular' },
  { value: 500, label: 'Medium' },
  { value: 600, label: 'Semibold' },
  { value: 700, label: 'Bold' },
];

function Row({ label, children }) {
  return (
    <div className="fss-row">
      <div className="fss-row-label">{label}</div>
      {children}
    </div>
  );
}

function Swatch({ color, active, onClick, title }) {
  return (
    <button
      className={`fss-swatch ${active ? 'active' : ''}`}
      title={title || color || 'Default'}
      onClick={onClick}
      style={{ background: color || 'transparent' }}
    >
      {!color && <span className="fss-swatch-none" />}
    </button>
  );
}

function Slider({ value, min, max, step = 1, unit = 'px', onChange }) {
  return (
    <div className="fss-slider-wrap">
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="fss-slider"
      />
      <span className="fss-slider-value">{value}{unit}</span>
    </div>
  );
}

export function FicharioStyleEditor({ item, onClose }) {
  const live = useStore((s) => s.items.find((i) => i.id === item.id)) || item;
  const style = getFicharioStyle(live);
  const panelRef = useRef(null);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const set = (patch) => useStore.getState().ficharioSetStyle(item.id, patch);
  const reset = () => useStore.getState().ficharioResetStyle(item.id);

  return (
    <>
      <div className="fss-overlay" onClick={onClose} />
      <div className="fss-panel" ref={panelRef} onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Fichário style">
        <div className="fss-header">
          <span className="fss-title">Fichário Style</span>
          <div className="fss-header-actions">
            <button className="fss-icon-btn" title="Reset to defaults" onClick={reset}>
              <ArrowCounterClockwise size={14} weight="regular" />
            </button>
            <button className="fss-icon-btn" title="Close" onClick={onClose}>
              <X size={14} weight="regular" />
            </button>
          </div>
        </div>

        <div className="fss-body">
          {/* ── Binder ─────────────────────── */}
          <div className="fss-section-label">Binder</div>
          <Row label="Background">
            <div className="fss-swatch-row">
              {BG_SWATCHES.map((c) => (
                <Swatch key={c || 'default'} color={c} active={style.background === c} onClick={() => set({ background: c })} />
              ))}
              <input
                type="color"
                className="fss-color-input"
                value={style.background || '#141414'}
                onChange={(e) => set({ background: e.target.value })}
                title="Custom color"
              />
            </div>
          </Row>
          <Row label={`Corner radius`}>
            <Slider value={style.cornerRadius} min={0} max={32} onChange={(v) => set({ cornerRadius: v })} />
          </Row>

          {/* ── Tabs ───────────────────────── */}
          <div className="fss-section-label">Tabs</div>
          <Row label="Default tab color">
            <div className="fss-swatch-row">
              {ACCENT_SWATCHES.map((c) => (
                <Swatch key={c} color={c} active={style.tabAccent === c} onClick={() => set({ tabAccent: c })} />
              ))}
              <input
                type="color"
                className="fss-color-input"
                value={style.tabAccent}
                onChange={(e) => set({ tabAccent: e.target.value })}
                title="Custom color"
              />
            </div>
          </Row>
          <Row label="Tab label size">
            <Slider value={style.tab.size} min={7} max={13} onChange={(v) => set({ tab: { size: v } })} />
          </Row>
          <Row label="Tab label color">
            <div className="fss-swatch-row">
              {TEXT_COLOR_SWATCHES.map((c) => (
                <Swatch key={c || 'default'} color={c} active={style.tab.color === c} onClick={() => set({ tab: { color: c } })} />
              ))}
            </div>
          </Row>
          <Row label="Tab style">
            <button
              className={`fss-toggle ${style.tab.uppercase ? 'active' : ''}`}
              onClick={() => set({ tab: { uppercase: !style.tab.uppercase } })}
            >
              UPPERCASE
            </button>
          </Row>

          {/* ── Headings ───────────────────── */}
          <div className="fss-section-label">Headings</div>
          <Row label="Heading size">
            <Slider value={style.heading.size} min={13} max={28} onChange={(v) => set({ heading: { size: v } })} />
          </Row>
          <Row label="Heading color">
            <div className="fss-swatch-row">
              {TEXT_COLOR_SWATCHES.map((c) => (
                <Swatch key={c || 'default'} color={c} active={style.heading.color === c} onClick={() => set({ heading: { color: c } })} />
              ))}
            </div>
          </Row>
          <Row label="Heading weight">
            <div className="fss-weight-row">
              {WEIGHTS.map((w) => (
                <button
                  key={w.value}
                  className={`fss-weight-btn ${style.heading.weight === w.value ? 'active' : ''}`}
                  onClick={() => set({ heading: { weight: w.value } })}
                >
                  {w.label}
                </button>
              ))}
            </div>
          </Row>
          <Row label="Heading style">
            <div className="fss-toggle-row">
              <button className={`fss-toggle ${style.heading.uppercase ? 'active' : ''}`} onClick={() => set({ heading: { uppercase: !style.heading.uppercase } })}>
                UPPERCASE
              </button>
              <button className={`fss-toggle italic ${style.heading.italic ? 'active' : ''}`} onClick={() => set({ heading: { italic: !style.heading.italic } })}>
                Italic
              </button>
            </div>
          </Row>

          {/* ── Body ───────────────────────── */}
          <div className="fss-section-label">Body</div>
          <Row label="Body size">
            <Slider value={style.body.size} min={11} max={18} onChange={(v) => set({ body: { size: v } })} />
          </Row>
          <Row label="Body color">
            <div className="fss-swatch-row">
              {TEXT_COLOR_SWATCHES.map((c) => (
                <Swatch key={c || 'default'} color={c} active={style.body.color === c} onClick={() => set({ body: { color: c } })} />
              ))}
            </div>
          </Row>
          <Row label="Body style">
            <button className={`fss-toggle italic ${style.body.italic ? 'active' : ''}`} onClick={() => set({ body: { italic: !style.body.italic } })}>
              Italic
            </button>
          </Row>
        </div>
      </div>
    </>
  );
}
