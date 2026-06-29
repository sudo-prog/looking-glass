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
import { loadThemeConfig, saveThemeConfig } from '../utils/themeConfig';
import './LiquidGlassSidebar.css';

// Icon map — resolves icon ID string to Phosphor component
const ICON_MAP = {
  canvas:   SquaresFour,
  search:   MagnifyingGlass,
  library:  FolderOpen,
  spaces:   Compass,
  tags:     Tag,
  saved:    BookmarkSimple,
  starred:  Star,
  archive:  Archive,
  home:     House,
  export:   Download,
  note:     NotePencil,
  bookmark: BookmarkSimple,
  url:      Globe,
  settings: GearSix,
};

const ICON_LABELS = {
  canvas:   'Canvas',
  search:   'Search',
  library:  'Library',
  spaces:   'Spaces',
  tags:     'Tags',
  saved:    'Bookmarks',
  starred:  'Starred',
  archive:  'Archive',
  home:     'Home',
  export:   'Export',
  note:     'New Note',
  bookmark: 'New Bookmark',
  url:      'Add URL',
  settings: 'Settings',
};

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
          { id: 'note',     label: 'New Note',    Icon: NotePencil },
          { id: 'bookmark', label: 'New Bookmark', Icon: BookmarkSimple },
          { id: 'url',      label: 'Add URL',     Icon: Globe },
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
          { id: 'home',   label: 'Explore',   Icon: Compass },
          { id: 'tags',   label: 'All Tags',  Icon: Hash },
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
          { id: 'tags',   label: 'Manage Tags', Icon: Hash },
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
          { id: 'bookmark', label: 'Open Bookmarks', Icon: BookmarkSimple },
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
          { id: 'search', label: 'Open Search', Icon: MagnifyingGlass },
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
          { id: 'library', label: 'Browse Library', Icon: FolderOpen },
        ],
      },
    ],
  },
};

export default function LiquidGlassSidebar({ onSpacesOpen, onTagsOpen, onAIOrganise, onAISummarise, onSearch, onAddNote, onAddUrl, onExport }) {
  const [collapsed, setCollapsed] = useState(true);
  const [mobileExpanded, setMobileExpanded] = useState(false);
  const [activeItem, setActiveItem] = useState('canvas');
  const [showSettings, setShowSettings] = useState(false);
  const [showBookmarks, setShowBookmarks] = useState(false);
  const [activeFlyout, setActiveFlyout] = useState(null);
  const [dark, setDark] = useState(isDark());
  const [menuIcons, setMenuIcons] = useState([]);
  const [draggingIndex, setDraggingIndex] = useState(null);
  const [longPressItem, setLongPressItem] = useState(null);
  const [showRemove, setShowRemove] = useState({});
  const sidebarRef = useRef(null);
  const dragOverIndex = useRef(null);
  const longPressTimer = useRef(null);
  const [isMobile, setIsMobile] = useState(false);

  // Load menu icon order from theme config
  useEffect(() => {
    const cfg = loadThemeConfig();
    const order = cfg.menuIconOrder || [];
    setMenuIcons(order);
  }, []);

  // Listen for theme changes
  useEffect(() => {
    const handler = () => setDark(isDark());
    window.addEventListener('theme-change', handler);
    return () => window.removeEventListener('theme-change', handler);
  }, []);

  // Mobile detection
  useEffect(() => {
    const mq = matchMedia('(max-width: 767px)');
    const handler = (e) => setIsMobile(e.matches);
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
  }, []);

  const handleThemeToggle = useCallback(() => {
    const newDark = !dark;
    toggleTheme(newDark ? 'dark' : 'light');
    setDark(newDark);
  }, [dark]);

  const handleFabClick = useCallback(() => {
    if (isMobile) {
      // On mobile: do NOT open expanding panel — just trigger nav action directly
      // The FAB on mobile is a quick-access button, not a menu toggle
      setCollapsed(false);
      setMobileExpanded(false); // keep it as FAB-only on mobile
    } else {
      setCollapsed(false);
      setMobileExpanded(true);
    }
  }, [isMobile]);

  const handleNavClick = useCallback((id) => {
    setActiveItem(id);
    setActiveFlyout(id);

    if (id === 'spaces')            onSpacesOpen?.();
    else if (id === 'saved' || id === 'bookmark') setShowBookmarks(true);
    else if (id === 'search')       onSearch?.();
    else if (id === 'library')      onSearch?.();
    else if (id === 'tags')         onTagsOpen?.();
    else if (id === 'note')         onAddNote?.();
    else if (id === 'url')          onAddUrl?.('https://');
    else if (id === 'export')       onExport?.();
    else if (id === 'home')         onSpacesOpen?.();
    else if (id === 'settings')     setShowSettings(true);
  }, [onSpacesOpen, onTagsOpen, onSearch, onAddNote, onAddUrl, onExport]);

  const handleFlyoutClick = useCallback((id) => {
    handleNavClick(id);
    setActiveFlyout(null);
  }, [handleNavClick]);

  const closeFlyout = useCallback(() => {
    setActiveFlyout(null);
  }, []);

  // ── Long press for remove mode ──
  const handlePointerDown = useCallback((e, index, id) => {
    longPressTimer.current = setTimeout(() => {
      setShowRemove(prev => ({ ...prev, [id]: true }));
      setLongPressItem(id);
      navigator.vibrate?.(20);
    }, 600);
  }, []);

  const handlePointerUp = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    setShowRemove({});
    setLongPressItem(null);
  }, []);

  const handleRemoveIcon = useCallback((e, id) => {
    e.stopPropagation();
    const cfg = loadThemeConfig();
    const newOrder = menuIcons.filter(i => i !== id);
    const newRemoved = [...(cfg.removedIcons || []), id];
    cfg.menuIconOrder = newOrder;
    cfg.removedIcons = newRemoved;
    saveThemeConfig(cfg);
    setMenuIcons(newOrder);
    setShowRemove(prev => ({ ...prev, [id]: false }));
  }, [menuIcons]);

  // ── Drag to reorder ──
  const handleDragStart = useCallback((e, index) => {
    setDraggingIndex(index);
    setShowRemove({});   // clear any lingering X buttons
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(index));
  }, []);

  const handleDragOver = useCallback((e, index) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    dragOverIndex.current = index;
  }, []);

  const handleDrop = useCallback((e, dropIndex) => {
    e.preventDefault();
    if (draggingIndex === null || draggingIndex === dropIndex) {
      setDraggingIndex(null);
      return;
    }
    const newOrder = [...menuIcons];
    const [moved] = newOrder.splice(draggingIndex, 1);
    newOrder.splice(dropIndex, 0, moved);
    setMenuIcons(newOrder);
    setDraggingIndex(null);

    // Persist
    const cfg = loadThemeConfig();
    cfg.menuIconOrder = newOrder;
    saveThemeConfig(cfg);
  }, [draggingIndex, menuIcons]);

  const handleDragEnd = useCallback(() => {
    setDraggingIndex(null);
  }, []);

  // ── Collapsed: floating glass orb ──
  if (collapsed) {
    return (
      <>
        <button
          ref={sidebarRef}
          className="lg-sidebar-fab"
          onClick={handleFabClick}
          aria-label="Open menu"
          title="Menu"
        >
          <List size={22} weight="regular" />
        </button>
        <SettingsPanel isOpen={showSettings} onClose={() => setShowSettings(false)} />
        <BookmarksPanel isOpen={showBookmarks} onClose={() => setShowBookmarks(false)} />
      </>
    );
  }

  // On mobile: never show the expanding panel — just keep the FAB
  if (isMobile && !mobileExpanded) {
    return (
      <>
        <button
          ref={sidebarRef}
          className="lg-sidebar-fab"
          onClick={() => setCollapsed(true)}
          aria-label="Open menu"
          title="Menu"
        >
          <List size={22} weight="regular" />
        </button>
        <SettingsPanel isOpen={showSettings} onClose={() => setShowSettings(false)} />
        <BookmarksPanel isOpen={showBookmarks} onClose={() => setShowBookmarks(false)} />
      </>
    );
  }

  const isExpanded = !collapsed;
  const expandedClass = isMobile ? (mobileExpanded ? 'lg-sidebar--expanded' : '') : (isExpanded ? 'lg-sidebar--expanded' : '');

  return (
    <>
      {/* Click-outside backdrop */}
      <div className="lg-sidebar-backdrop" onClick={() => { setCollapsed(true); setMobileExpanded(false); }} />

      <aside
        ref={sidebarRef}
        className={`lg-sidebar ${expandedClass}`}
        aria-label="Looking Glass navigation"
        data-glass-surface="toolbar"
        style={{
          borderRadius: 'var(--glass-menu-radius, 24px)',
        }}
      >
        {/* ── Navigation icons ── */}
        <nav className="lg-sidebar__nav" aria-label="Main navigation">
          {menuIcons.map((id, index) => {
            const Icon = ICON_MAP[id];
            const label = ICON_LABELS[id] || id;
            if (!Icon) return null;
            return (
              <button
                key={id}
                className={[
                  'lg-sidebar__nav-item',
                  activeItem === id ? 'lg-sidebar__nav-item--active' : '',
                  draggingIndex === index ? 'lg-sidebar__nav-item--dragging' : '',
                  showRemove[id] ? 'lg-sidebar__nav-item--removing' : '',
                ].filter(Boolean).join(' ')}
                onClick={() => { if (!showRemove[id]) handleNavClick(id); }}
                onPointerDown={(e) => handlePointerDown(e, index, id)}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerUp}
                draggable={!showRemove[id]}
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDrop={(e) => handleDrop(e, index)}
                onDragEnd={handleDragEnd}
                aria-current={activeItem === id ? 'page' : undefined}
                title={label}
              >
                <Icon size={20} weight="regular" className="lg-sidebar__nav-icon" />
                <span className="lg-sidebar__nav-tooltip">{label}</span>
                {showRemove[id] && (
                  <span
                    className="lg-sidebar__nav-remove"
                    onClick={(e) => handleRemoveIcon(e, id)}
                    title="Remove from menu"
                  >
                    <X size={10} weight="bold" />
                  </span>
                )}
              </button>
            );
          })}
          {/* Drag handle indicator */}
          <div className="lg-sidebar__nav-drag-hint">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="9" cy="5" r="1.5" fill="currentColor" />
              <circle cx="15" cy="5" r="1.5" fill="currentColor" />
              <circle cx="9" cy="12" r="1.5" fill="currentColor" />
              <circle cx="15" cy="12" r="1.5" fill="currentColor" />
              <circle cx="9" cy="19" r="1.5" fill="currentColor" />
              <circle cx="15" cy="19" r="1.5" fill="currentColor" />
            </svg>
          </div>
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
                <button className="lg-sidebar__flyout-close" onClick={closeFlyout} aria-label="Close panel">
                  <X size={14} weight="regular" />
                </button>
              </div>
              {flyout.sections.map((section, si) => (
                <div key={si} className="lg-sidebar__flyout-section">
                  {section.title && <div className="lg-sidebar__flyout-section-title">{section.title}</div>}
                  {section.items.map(({ id, label, Icon: ItemIcon }) => (
                    <button key={id} className="lg-sidebar__flyout-item" onClick={() => handleFlyoutClick(id)}>
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

        {/* ── Footer ── */}
        <div className="lg-sidebar__footer">
          <button className="lg-sidebar__theme-btn" onClick={handleThemeToggle}
            aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'} title={dark ? 'Light mode' : 'Dark mode'}>
            {dark ? <Sun size={18} weight="regular" /> : <Moon size={18} weight="regular" />}
          </button>
          <button className="lg-sidebar__settings-btn" onClick={() => setShowSettings(true)}
            aria-label="Open settings" title="Settings">
            <GearSix size={18} weight="regular" />
          </button>
        </div>
      </aside>

      {/* ── Panels ── */}
      <SettingsPanel isOpen={showSettings} onClose={() => setShowSettings(false)}
        onMenuIconsChange={(order) => setMenuIcons(order)} />
      <BookmarksPanel isOpen={showBookmarks} onClose={() => setShowBookmarks(false)} />
    </>
  );
}