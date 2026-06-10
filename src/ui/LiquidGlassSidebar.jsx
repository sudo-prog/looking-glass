import { useState, useRef, useEffect, useCallback } from 'react';
import {
  SquaresFour,
  MagnifyingGlass,
  FolderOpen,
  Tag,
  BookmarkSimple,
  Compass,
  Sparkle,
  GearSix,
  X,
  House,
  Archive,
  Hash,
  Star,
  NotePencil,
  Globe,
  Download,
  Sun,
  Moon,
  List,
} from '@phosphor-icons/react';
import { SettingsPanel } from './SettingsPanel.jsx';
import { BookmarksPanel } from './BookmarksPanel.jsx';
import { toggleTheme, isDark } from '../utils/theme';
import './LiquidGlassSidebar.css';

const NAV_ITEMS = [
  { id: 'canvas',    label: 'Canvas',    Icon: SquaresFour },
  { id: 'search',    label: 'Search',    Icon: MagnifyingGlass },
  { id: 'library',   label: 'Library',   Icon: FolderOpen },
  { id: 'spaces',    label: 'Spaces',    Icon: Compass },
  { id: 'tags',      label: 'Tags',      Icon: Tag },
  { id: 'saved',     label: 'Bookmarks', Icon: BookmarkSimple },
];

const SECTION_FLYOUTS = {
  canvas: {
    title: 'Canvas',
    icon: SquaresFour,
    sections: [
      {
        title: 'VIEW',
        items: [
          { id: 'home',     label: 'Home',      Icon: House },
          { id: 'starred',  label: 'Starred',   Icon: Star },
          { id: 'archive',  label: 'Archive',   Icon: Archive },
        ],
      },
      {
        title: 'CREATE',
        items: [
          { id: 'add-note',    label: 'New Note',    Icon: NotePencil },
          { id: 'add-bookmark', label: 'New Bookmark', Icon: BookmarkSimple },
          { id: 'add-url',     label: 'Add URL',     Icon: Globe },
        ],
      },
      {
        title: 'ACTIONS',
        items: [
          { id: 'export', label: 'Export', Icon: Download },
        ],
      },
    ],
  },
  spaces: {
    title: 'Spaces',
    icon: Compass,
    sections: [
      {
        items: [
          { id: 'explore',   label: 'Explore',   Icon: Compass },
          { id: 'all-tags',  label: 'All Tags',  Icon: Hash },
        ],
      },
    ],
  },
  tags: {
    title: 'Tags',
    icon: Tag,
    sections: [
      {
        items: [
          { id: 'all-tags',  label: 'Manage Tags', Icon: Hash },
          { id: 'ai-tag',    label: 'AI Auto-Tag', Icon: Sparkle },
        ],
      },
    ],
  },
  saved: {
    title: 'Bookmarks',
    icon: BookmarkSimple,
    sections: [
      {
        items: [
          { id: 'open-bookmarks', label: 'Open Bookmarks', Icon: BookmarkSimple },
        ],
      },
    ],
  },
  search: {
    title: 'Search',
    icon: MagnifyingGlass,
    sections: [
      {
        items: [
          { id: 'open-search', label: 'Open Search', Icon: MagnifyingGlass },
          { id: 'ai-search',  label: 'AI Search',  Icon: Sparkle },
        ],
      },
    ],
  },
  library: {
    title: 'Library',
    icon: FolderOpen,
    sections: [
      {
        items: [
          { id: 'open-library', label: 'Browse Library', Icon: FolderOpen },
        ],
      },
    ],
  },
};

export default function LiquidGlassSidebar({ onSpacesOpen, onTagsOpen, onAIOrganise, onAISummarise, onSearch, onAddNote, onAddUrl, onExport }) {
  const [collapsed, setCollapsed] = useState(true); // true = just FAB, false = thin icon bar
  const [activeItem, setActiveItem] = useState('canvas');
  const [showSettings, setShowSettings] = useState(false);
  const [showBookmarks, setShowBookmarks] = useState(false);
  const [activeFlyout, setActiveFlyout] = useState(null);
  const [dark, setDark] = useState(isDark());
  const sidebarRef = useRef(null);
  const [mobileExpanded, setMobileExpanded] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Listen for theme changes from other sources
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
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, []);

  const handleThemeToggle = useCallback(() => {
    const newDark = !dark;
    toggleTheme(newDark ? 'dark' : 'light');
    setDark(newDark);
  }, [dark]);

  const handleHamburgerClick = useCallback(() => {
    setCollapsed(false);
  }, []);

  const handleNavClick = useCallback((id) => {
    setActiveItem(id);
    setActiveFlyout(id);

    if (id === 'spaces')    onSpacesOpen?.();
    else if (id === 'saved')      setShowBookmarks(true);
    else if (id === 'search')     onSearch?.();
    else if (id === 'library')    onSearch?.();
    else if (id === 'tags')       onTagsOpen?.();
  }, [onSpacesOpen, onTagsOpen, onSearch]);

  const handleFlyoutClick = useCallback((id) => {
    if (id === 'spaces' || id === 'explore' || id === 'home') {
      onSpacesOpen?.();
    }
    if (id === 'all-tags') {
      onTagsOpen?.();
    }
    if (id === 'open-bookmarks' || id === 'add-bookmark') {
      setShowBookmarks(true);
    }
    if (id === 'open-search') {
      onSearch?.();
    }
    if (id === 'add-note') {
      onAddNote?.();
    }
    if (id === 'add-url') {
      onAddUrl?.('https://');
    }
    if (id === 'export') {
      onExport?.();
    }
    setActiveFlyout(null);
  }, [onSpacesOpen, onTagsOpen, onSearch, onAddNote, onAddUrl, onExport]);

  const closeFlyout = useCallback(() => {
    setActiveFlyout(null);
  }, []);

  // ── Collapsed state: just the hamburger FAB ──
  if (collapsed) {
    return (
      <>
        <button
          ref={sidebarRef}
          className="lg-sidebar-fab"
          onClick={handleHamburgerClick}
          aria-label="Open sidebar menu"
          title="Menu"
        >
          <List size={22} weight="regular" />
        </button>
        <SettingsPanel isOpen={showSettings} onClose={() => setShowSettings(false)} />
        <BookmarksPanel isOpen={showBookmarks} onClose={() => setShowBookmarks(false)} />
      </>
    );
  }

  return (
    <>
      <aside
        ref={sidebarRef}
        className="lg-sidebar"
        aria-label="Looking Glass navigation"
        data-glass-surface="toolbar"
      >
        {/* ── Navigation icons ── */}
        <nav className="lg-sidebar__nav" aria-label="Main navigation">
          {NAV_ITEMS.map(({ id, label, Icon }) => (
            <button
              key={id}
              className={`lg-sidebar__nav-item${activeItem === id ? ' lg-sidebar__nav-item--active' : ''}`}
              onClick={() => handleNavClick(id)}
              aria-current={activeItem === id ? 'page' : undefined}
            >
              <Icon size={20} weight="regular" className="lg-sidebar__nav-icon" />
              <span className="lg-sidebar__nav-tooltip">{label}</span>
            </button>
          ))}
        </nav>

        {/* ── Flyout panel ── */}
        {activeFlyout && SECTION_FLYOUTS[activeFlyout] && (() => {
          const flyout = SECTION_FLYOUTS[activeFlyout];
          const FlyoutIcon = flyout.icon;
          return (
            <div className="lg-sidebar__flyout">
              <div className="lg-sidebar__flyout-header">
                <span className="lg-sidebar__flyout-title">
                  <FlyoutIcon size={16} weight="regular" />
                  {flyout.title}
                </span>
                <button
                  className="lg-sidebar__flyout-close"
                  onClick={closeFlyout}
                  aria-label="Close panel"
                >
                  <X size={14} weight="regular" />
                </button>
              </div>
              {flyout.sections.map((section, si) => (
                <div key={si} className="lg-sidebar__flyout-section">
                  {section.title && (
                    <div className="lg-sidebar__flyout-section-title">{section.title}</div>
                  )}
                  {section.items.map(({ id, label, Icon: ItemIcon }) => (
                    <button
                      key={id}
                      className="lg-sidebar__flyout-item"
                      onClick={() => handleFlyoutClick(id)}
                    >
                      <ItemIcon size={14} weight="regular" className="lg-sidebar__flyout-item-icon" />
                      <span>{label}</span>
                    </button>
                  ))}
                </div>
              ))}
            </div>
          );
        })()}

        {/* ── Spacer ── */}
        <div className="lg-sidebar__spacer" />

        {/* ── Footer (theme + settings) ── */}
        <div className="lg-sidebar__footer">
          <button
            className="lg-sidebar__theme-btn"
            onClick={handleThemeToggle}
            aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
            title={dark ? 'Light mode' : 'Dark mode'}
          >
            {dark ? <Sun size={18} weight="regular" /> : <Moon size={18} weight="regular" />}
          </button>
          <button
            className="lg-sidebar__settings-btn"
            onClick={() => setShowSettings(true)}
            aria-label="Open settings"
            title="Settings"
          >
            <GearSix size={18} weight="regular" />
          </button>
        </div>
      </aside>

      {/* ── Panels ── */}
      <SettingsPanel isOpen={showSettings} onClose={() => setShowSettings(false)} />
      <BookmarksPanel isOpen={showBookmarks} onClose={() => setShowBookmarks(false)} />
    </>
  );
}