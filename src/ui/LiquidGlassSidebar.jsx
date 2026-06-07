import { useState, useRef, useEffect } from 'react';
import {
  SquaresFour,
  MagnifyingGlass,
  FolderOpen,
  Tag,
  BookmarkSimple,
  Sparkle,
  GearSix,
  CaretLeft,
  CaretRight,
  X,
  House,
  Compass,
  Archive,
  Hash,
  Star,
} from '@phosphor-icons/react';
import AIModal from './AIModal';
import './LiquidGlassSidebar.css';

const NAV_ITEMS = [
  { id: 'canvas',    label: 'CANVAS',    Icon: SquaresFour },
  { id: 'search',    label: 'SEARCH',    Icon: MagnifyingGlass },
  { id: 'library',   label: 'LIBRARY',   Icon: FolderOpen },
  { id: 'tags',      label: 'TAGS',      Icon: Tag },
  { id: 'saved',     label: 'BOOKMARKS', Icon: BookmarkSimple },
];

const FULL_MENU_SECTIONS = [
  {
    title: 'SPACES',
    items: [
      { id: 'home',    label: 'HOME',    Icon: House },
      { id: 'explore', label: 'EXPLORE', Icon: Compass },
    ],
  },
  {
    title: 'LIBRARY',
    items: [
      { id: 'archive', label: 'ARCHIVE', Icon: Archive },
      { id: 'tags',    label: 'ALL TAGS', Icon: Hash },
      { id: 'starred', label: 'STARRED',  Icon: Star },
    ],
  },
];

export default function LiquidGlassSidebar() {
  // State 0 = collapsed (icon buttons only)
  // State 1 = expanded (standard sidebar with labels)
  // State 2 = full menu (wide drawer with sections)
  const [sidebarState, setSidebarState] = useState(0);
  const [activeItem, setActiveItem] = useState('canvas');
  const [showAIModal, setShowAIModal] = useState(false);
  const sidebarRef = useRef(null);

  const isCollapsed = sidebarState === 0;
  const isExpanded  = sidebarState === 1;
  const isFullMenu  = sidebarState === 2;

  // Cycle: collapsed(0) → expanded(1) → fullmenu(2) → collapsed(0) → ...
  const handleToggle = () => {
    setSidebarState(prev => (prev + 1) % 3);
  };

  const handleExpandFromCollapsed = () => {
    if (isCollapsed) setSidebarState(1);
  };

  // Wire to WebGPU glass renderer on mount
  useEffect(() => {
    if (!sidebarRef.current) return;
    window.dispatchEvent(new CustomEvent('glass-surface-mount', {
      detail: {
        id: 'sidebar',
        element: sidebarRef.current,
        uniforms: {
          dark:  { refractionStrength: 0.22, blurRadius: 20, specularIntensity: 0.30, shadowIntensity: 0.15 },
          light: { refractionStrength: 0.18, blurRadius: 20, specularIntensity: 0.50, shadowIntensity: 0.10 },
        },
      },
    }));
    return () => {
      window.dispatchEvent(new CustomEvent('glass-surface-unmount', { detail: { id: 'sidebar' } }));
    };
  }, []);

  const classNames = [
    'lg-sidebar',
    isCollapsed ? 'lg-sidebar--collapsed' : '',
    isExpanded  ? 'lg-sidebar--expanded'  : '',
    isFullMenu  ? 'lg-sidebar--fullmenu'  : '',
  ].filter(Boolean).join(' ');

  return (
    <>
      <aside
        ref={sidebarRef}
        className={classNames}
        aria-label="Looking Glass navigation"
      >
        {/* ── Header ──────────────────────── */}
        <div className="lg-sidebar__header">
          <div className="lg-sidebar__brand" aria-hidden="true">
            <div className="lg-sidebar__brand-mark">LG</div>
            {!isCollapsed && (
              <span className="lg-sidebar__brand-name">LOOKING GLASS</span>
            )}
          </div>
          <button
            className="lg-sidebar__toggle"
            onClick={handleToggle}
            aria-label={isFullMenu ? 'Collapse menu' : isExpanded ? 'Collapse sidebar' : 'Expand sidebar'}
            aria-expanded={!isCollapsed}
          >
            {isFullMenu ? <CaretLeft size={16} weight="regular" /> :
             isExpanded ? <CaretLeft size={16} weight="regular" /> :
                          <CaretRight size={16} weight="regular" />}
          </button>
        </div>

        {/* ── Navigation ──────────────────── */}
        <nav className="lg-sidebar__nav" aria-label="Main navigation">
          {NAV_ITEMS.map(({ id, label, Icon }) => (
            <button
              key={id}
              className={`lg-sidebar__nav-item${activeItem === id ? ' lg-sidebar__nav-item--active' : ''}`}
              onClick={() => { setActiveItem(id); if (isCollapsed) handleExpandFromCollapsed(); }}
              aria-current={activeItem === id ? 'page' : undefined}
              title={isCollapsed ? label : undefined}
            >
              <Icon size={20} weight="regular" className="lg-sidebar__nav-icon" />
              {!isCollapsed && (
                <span className="lg-sidebar__nav-label">{label}</span>
              )}
              {isCollapsed && (
                <span className="lg-sidebar__tooltip" role="tooltip">{label}</span>
              )}
            </button>
          ))}
        </nav>

        {/* ── Full Menu Section (only in state 2) ── */}
        {isFullMenu && (
          <div className="lg-sidebar__fullmenu">
            {FULL_MENU_SECTIONS.map((section) => (
              <div key={section.title} className="lg-sidebar__fullmenu-section">
                <span className="lg-sidebar__fullmenu-title">{section.title}</span>
                {section.items.map(({ id, label, Icon }) => (
                  <button
                    key={id}
                    className="lg-sidebar__fullmenu-item"
                    onClick={() => setActiveItem(id)}
                  >
                    <Icon size={16} weight="regular" />
                    <span>{label}</span>
                  </button>
                ))}
              </div>
            ))}
          </div>
        )}

        {/* ── Spacer ──────────────────────── */}
        <div className="lg-sidebar__spacer" />

        {/* ── AI Assistant ────────────────── */}
        <button
          className="lg-sidebar__ai-btn"
          onClick={() => setShowAIModal(true)}
          aria-label="Open AI assistant setup"
          title={isCollapsed ? 'AI ASSISTANT' : undefined}
        >
          <div className="lg-sidebar__ai-icon-wrap">
            <Sparkle size={20} weight="regular" />
          </div>
          {!isCollapsed && (
            <div className="lg-sidebar__ai-text">
              <span className="lg-sidebar__ai-title">AI ASSISTANT</span>
              <span className="lg-sidebar__ai-sub">TAG · SEARCH · ORGANIZE</span>
            </div>
          )}
        </button>

        {/* ── Footer ──────────────────────── */}
        <div className="lg-sidebar__footer">
          {isExpanded && (
            <span className="lg-sidebar__version">V0.1 · LIQUID GLASS</span>
          )}
          {isFullMenu && (
            <span className="lg-sidebar__version">V0.1 · LIQUID GLASS</span>
          )}
          <button
            className="lg-sidebar__settings-btn"
            aria-label="Open settings"
            title="SETTINGS"
          >
            <GearSix size={16} weight="regular" />
          </button>
        </div>
      </aside>

      {/* ── AI Modal ────────────────────── */}
      <AIModal isOpen={showAIModal} onClose={() => setShowAIModal(false)} />
    </>
  );
}
