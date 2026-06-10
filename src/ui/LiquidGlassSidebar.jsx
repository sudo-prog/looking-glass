import { useState, useRef, useEffect, useCallback } from 'react';
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
  MagnifyingGlass as SearchIcon,
  ListChecks,
  NotePencil,
  Plus,
  Download,
  Globe,
  Sliders,
} from '@phosphor-icons/react';
import AIModal     from './AIModal.jsx';
import { ModeToggle } from './ModeToggle.jsx';
import { SettingsPanel } from './SettingsPanel.jsx';
import { BookmarksPanel } from './BookmarksPanel.jsx';
import { toggleTheme, isDark } from '../utils/theme';
import './LiquidGlassSidebar.css';

const NAV_ITEMS = [
  { id: 'canvas',    label: 'CANVAS',    Icon: SquaresFour },
  { id: 'search',    label: 'SEARCH',    Icon: MagnifyingGlass },
  { id: 'library',   label: 'LIBRARY',   Icon: FolderOpen },
  { id: 'spaces',    label: 'SPACES',    Icon: Compass },
  { id: 'tags',      label: 'TAGS',      Icon: Tag },
  { id: 'saved',     label: 'BOOKMARKS', Icon: BookmarkSimple },
];

const FULL_MENU_SECTIONS = [
  {
    title: 'NAVIGATE',
    items: [
      { id: 'home',      label: 'HOME',      Icon: House },
      { id: 'explore',   label: 'EXPLORE',   Icon: Compass },
      { id: 'all-tags',  label: 'ALL TAGS',  Icon: Hash },
      { id: 'starred',   label: 'STARRED',   Icon: Star },
      { id: 'archive',   label: 'ARCHIVE',   Icon: Archive },
    ],
  },
  {
    title: 'CREATE',
    items: [
      { id: 'add-note',    label: 'NEW NOTE',    Icon: NotePencil },
      { id: 'add-bookmark', label: 'NEW BOOKMARK', Icon: BookmarkSimple },
      { id: 'add-url',     label: 'ADD URL',     Icon: Globe },
    ],
  },
];

const AI_QUICK_ACTIONS = [
  { id: 'ai-tag',        label: 'TAG',        Icon: Tag },
  { id: 'ai-search',     label: 'SEARCH',     Icon: SearchIcon },
  { id: 'ai-organize',   label: 'ORGANIZE',   Icon: ListChecks },
  { id: 'ai-summarize',  label: 'SUMMARIZE',  Icon: NotePencil },
];

const QUICK_ACTIONS = [
  { id: 'export',   label: 'EXPORT',   Icon: Download },
  { id: 'settings', label: 'SETTINGS', Icon: Sliders },
];

export default function LiquidGlassSidebar({ onSpacesOpen, onTagsOpen, onAIOrganise, onAISummarise, onSearch, onAddNote, onAddUrl, onExport }) {
  // State 0 = collapsed (FAB button only)
  // State 1 = expanded (standard sidebar with labels)
  // State 2 = full menu (wide drawer with sections)
  const [sidebarState, setSidebarState] = useState(0);
  const [activeItem, setActiveItem] = useState('canvas');
  const [showAIModal, setShowAIModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showBookmarks, setShowBookmarks] = useState(false);
  const [dark, setDark] = useState(isDark());
  const sidebarRef = useRef(null);
  const [mobileExpanded, setMobileExpanded] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const touchStartY = useRef(0);
  const touchEndY = useRef(0);

  const isCollapsed = sidebarState === 0;
  const isExpanded  = sidebarState === 1;
  const isFullMenu  = sidebarState === 2;

  // Listen for theme changes from other sources (e.g. ModeToggle elsewhere)
  useEffect(() => {
    const handler = () => setDark(isDark());
    window.addEventListener('theme-change', handler);
    return () => window.removeEventListener('theme-change', handler);
  }, []);

  // Mobile detection
  useEffect(() => {
    const mq = matchMedia('(max-width: 767px)');
    const handler = (e) => {
      setIsMobile(e.matches);
      if (!e.matches) setMobileExpanded(false);
    };
    setIsMobile(mq.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // Dispatch glass-surface-mount when mobile expanded
  useEffect(() => {
    if (!isMobile || !mobileExpanded || !sidebarRef.current) return;
    window.dispatchEvent(new CustomEvent('glass-surface-mount', {
      detail: {
        id: 'sidebar-mobile',
        element: sidebarRef.current,
        uniforms: {
          dark:  { refractionStrength: 0.22, blurRadius: 20, specularIntensity: 0.30, shadowIntensity: 0.15 },
          light: { refractionStrength: 0.18, blurRadius: 20, specularIntensity: 0.50, shadowIntensity: 0.10 },
        },
      },
    }));
    return () => {
      window.dispatchEvent(new CustomEvent('glass-surface-unmount', { detail: { id: 'sidebar-mobile' } }));
    };
  }, [isMobile, mobileExpanded]);

  const handleThemeToggle = useCallback((newIsDark) => {
    toggleTheme(newIsDark ? 'dark' : 'light');
    setDark(newIsDark);
  }, []);

  const handleNavClick = useCallback((id) => {
    setActiveItem(id);
    if (id === 'spaces')    onSpacesOpen?.();
    else if (id === 'tags')       onTagsOpen?.();
    else if (id === 'saved')      setShowBookmarks(true);
    else if (id === 'search')     onSearch?.();
    else if (id === 'library')    onSearch?.(); // Could be a library panel in future
    else if (id === 'canvas')     {} // Just sets active
  }, [onSpacesOpen, onTagsOpen, onSearch]);

  const handleFullMenuClick = useCallback((id) => {
    setActiveItem(id);
    if (id === 'home' || id === 'explore')   onSpacesOpen?.();
    else if (id === 'all-tags')              onTagsOpen?.();
    else if (id === 'starred' || id === 'archive') {} // Filter items
    else if (id === 'add-note')              onAddNote?.();
    else if (id === 'add-bookmark')          setShowBookmarks(true);
    else if (id === 'add-url')               onAddUrl?.('https://');
    else if (id === 'ai-tag' || id === 'ai-search') setShowAIModal(true);
    else if (id === 'ai-organize')           onAIOrganise?.();
    else if (id === 'ai-summarize')          onAISummarise?.();
    else if (id === 'export')                onExport?.();
    else if (id === 'settings')              setShowSettings(true);
  }, [onSpacesOpen, onTagsOpen, onAddNote, onAddUrl, onAIOrganise, onAISummarise, onExport]);

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

  // ── State 0: Floating Action Button ──
  if (isCollapsed) {
    return (
      <>
        <button
          ref={sidebarRef}
          className="lg-sidebar-fab"
          onClick={handleToggle}
          aria-label="Open sidebar"
          title="LOOKING GLASS"
        >
          <Sparkle size={22} weight="regular" />
        </button>
        <AIModal isOpen={showAIModal} onClose={() => setShowAIModal(false)} />
        <SettingsPanel isOpen={showSettings} onClose={() => setShowSettings(false)} />
        <BookmarksPanel isOpen={showBookmarks} onClose={() => setShowBookmarks(false)} />
      </>
    );
  }

  const classNames = [
    'lg-sidebar',
    isMobile ? 'lg-sidebar--mobile' : 'lg-sidebar--desktop',
    isExpanded  ? 'lg-sidebar--expanded'  : '',
    isFullMenu  ? 'lg-sidebar--fullmenu'  : '',
    (isMobile && mobileExpanded) ? 'lg-sidebar--expanded' : '',
  ].filter(Boolean).join(' ');

  const handleTouchStart = (e) => {
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e) => {
    touchEndY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = () => {
    if (!isMobile) return;
    const diff = touchStartY.current - touchEndY.current;
    if (mobileExpanded && diff < -80) {
      setMobileExpanded(false);
    }
  };

  const handleHandleClick = () => {
    if (isMobile) setMobileExpanded((v) => !v);
  };

  return (
    <>
      <aside
        ref={sidebarRef}
        className={classNames}
        aria-label="Looking Glass navigation"
        data-glass-surface="toolbar"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* ── Mobile drag handle ── */}
        {isMobile && (
          <div
            className="lg-sidebar__handle"
            onClick={handleHandleClick}
            role="button"
            aria-label={mobileExpanded ? 'Collapse sidebar' : 'Expand sidebar'}
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleHandleClick(); }}
          />
        )}
        {/* ── Header ──────────────────────── */}
        <div className="lg-sidebar__header">
          <div className="lg-sidebar__brand" aria-hidden="true">
            <div className="lg-sidebar__brand-mark">LG</div>
            <span className="lg-sidebar__brand-name">LOOKING GLASS</span>
          </div>
          <button
            className="lg-sidebar__toggle"
            onClick={handleToggle}
            aria-label={isFullMenu ? 'Show less' : isExpanded ? 'Show more' : 'Collapse'}
            aria-expanded={true}
          >
            {isFullMenu
              ? <CaretLeft  size={16} weight="regular" />
              : <CaretRight size={16} weight="regular" />}
          </button>
        </div>

        {/* ── Navigation ──────────────────── */}
        <nav className="lg-sidebar__nav" aria-label="Main navigation">
          {NAV_ITEMS.map(({ id, label, Icon }) => (
            <button
              key={id}
              className={`lg-sidebar__nav-item${activeItem === id ? ' lg-sidebar__nav-item--active' : ''}`}
              onClick={() => handleNavClick(id)}
              aria-current={activeItem === id ? 'page' : undefined}
            >
              <Icon size={20} weight="regular" className="lg-sidebar__nav-icon" />
              <span className="lg-sidebar__nav-label">{label}</span>
            </button>
          ))}
        </nav>

        {/* ── Full Menu Section (only in state 2) ── */}
        {isFullMenu && (
          <div className="lg-sidebar__fullmenu">
            {FULL_MENU_SECTIONS.map((section) => (
              <div key={section.title} className="lg-sidebar__fullmenu-section">
                <span className="lg-sidebar__fullmenu-title">{section.title}</span>
                <div className="lg-sidebar__fullmenu-grid">
                  {section.items.map(({ id, label, Icon }) => (
                    <button
                      key={id}
                      className="lg-sidebar__fullmenu-item"
                      onClick={() => handleFullMenuClick(id)}
                    >
                      <Icon size={16} weight="regular" />
                      <span>{label}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}

            {/* ── AI Quick Actions ────────── */}
            <div className="lg-sidebar__fullmenu-section">
              <span className="lg-sidebar__fullmenu-title">AI ACTIONS</span>
              <div className="lg-sidebar__fullmenu-grid">
                {AI_QUICK_ACTIONS.map(({ id, label, Icon }) => (
                  <button
                    key={id}
                    className="lg-sidebar__fullmenu-item lg-sidebar__fullmenu-item--ai"
                    onClick={() => handleFullMenuClick(id)}
                  >
                    <Icon size={16} weight="regular" />
                    <span>{label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* ── Quick Actions ────────── */}
            <div className="lg-sidebar__fullmenu-section">
              <div className="lg-sidebar__fullmenu-grid">
                {QUICK_ACTIONS.map(({ id, label, Icon }) => (
                  <button
                    key={id}
                    className="lg-sidebar__fullmenu-item"
                    onClick={() => handleFullMenuClick(id)}
                  >
                    <Icon size={16} weight="regular" />
                    <span>{label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Spacer (hidden in full menu) ── */}
        {!isFullMenu && <div className="lg-sidebar__spacer" />}

        {/* ── AI Assistant (hidden in full menu) ── */}
        {!isFullMenu && (
        <button
          className="lg-sidebar__ai-btn"
          onClick={() => setShowAIModal(true)}
          aria-label="Open AI assistant setup"
        >
          <div className="lg-sidebar__ai-icon-wrap">
            <Sparkle size={20} weight="regular" />
          </div>
          <div className="lg-sidebar__ai-text">
            <span className="lg-sidebar__ai-title">AI ASSISTANT</span>
            <span className="lg-sidebar__ai-sub">TAG · SEARCH · ORGANIZE</span>
          </div>
        </button>
        )}

        {/* ── Footer ──────────────────────── */}
        <div className="lg-sidebar__footer">
          <ModeToggle isDark={dark} onToggle={handleThemeToggle} />
          <span className="lg-sidebar__version">V0.1 · LIQUID GLASS</span>
          <button
            className="lg-sidebar__settings-btn"
            onClick={() => setShowSettings(true)}
            aria-label="Open settings"
            title="SETTINGS"
          >
            <GearSix size={16} weight="regular" />
          </button>
        </div>
      </aside>

      {/* ── Panels ────────────────────── */}
      <AIModal isOpen={showAIModal} onClose={() => setShowAIModal(false)} />
      <SettingsPanel isOpen={showSettings} onClose={() => setShowSettings(false)} />
      <BookmarksPanel isOpen={showBookmarks} onClose={() => setShowBookmarks(false)} />
    </>
  );
}