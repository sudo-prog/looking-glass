import { useState, useRef, useEffect } from 'react';
import { SquaresFour, Plus, MagnifyingGlass, BookmarkSimple, FolderOpen, Tag, Sparkle, GearSix, CaretLeft, CaretRight, X } from '@phosphor-icons/react';
import { useStore } from '../store/useStore.js';
import AIModal from './AIModal.jsx';
import './LiquidGlassSidebar.css';

const NAV_ITEMS = [
  { id: 'canvas', label: 'CANVAS', Icon: SquaresFour },
  { id: 'search', label: 'SEARCH', Icon: MagnifyingGlass },
  { id: 'library', label: 'LIBRARY', Icon: FolderOpen },
  { id: 'tags', label: 'TAGS', Icon: Tag },
  { id: 'saved', label: 'BOOKMARKS', Icon: BookmarkSimple },
];

export default function LiquidGlassSidebar() {
  const [isExpanded, setIsExpanded] = useState(true);
  const [activeItem, setActiveItem] = useState('canvas');
  const [showAIModal, setShowAIModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const sidebarRef = useRef(null);

  useEffect(() => {
    if (!sidebarRef.current) return;
    window.dispatchEvent(new CustomEvent('glass-surface-mount', {
      detail: {
        id: 'sidebar',
        element: sidebarRef.current,
        uniforms: {
          dark: { refractionStrength: 0.22, blurRadius: 20, specularIntensity: 0.30, shadowIntensity: 0.15 },
          light: { refractionStrength: 0.18, blurRadius: 20, specularIntensity: 0.50, shadowIntensity: 0.10 }
        }
      }
    }));
    return () => {
      window.dispatchEvent(new CustomEvent('glass-surface-unmount', { detail: { id: 'sidebar' } }));
    };
  }, []);

  return (
    <>
      <aside
        ref={sidebarRef}
        className={`lg-sidebar ${isExpanded ? 'lg-sidebar--expanded' : 'lg-sidebar--collapsed'}`}
        aria-label="Looking Glass navigation"
      >
        {/* Header */}
        <div className="lg-sidebar__header">
          <div className="lg-sidebar__brand">
            <div className="lg-sidebar__mark">LG</div>
            {isExpanded && <span className="lg-sidebar__brand-name">LOOKING GLASS</span>}
          </div>
          <button
            className="lg-sidebar__toggle"
            onClick={() => setIsExpanded(!isExpanded)}
            aria-label={isExpanded ? 'Collapse sidebar' : 'Expand sidebar'}
          >
            {isExpanded ? <CaretLeft size={14} weight="bold" /> : <CaretRight size={14} weight="bold" />}
          </button>
        </div>

        {/* Nav items */}
        <nav className="lg-sidebar__nav" role="navigation" aria-label="Main navigation">
          {NAV_ITEMS.map(({ id, label, Icon }) => (
            <button
              key={id}
              className={`lg-sidebar__nav-item ${activeItem === id ? 'lg-sidebar__nav-item--active' : ''}`}
              onClick={() => setActiveItem(id)}
              aria-label={label}
              title={!isExpanded ? label : undefined}
            >
              <Icon size={20} weight={activeItem === id ? 'fill' : 'regular'} />
              {isExpanded && <span className="lg-sidebar__nav-label">{label}</span>}
            </button>
          ))}
        </nav>

        {/* Spacer */}
        <div className="lg-sidebar__spacer" />

        {/* AI Assistant button */}
        <div className="lg-sidebar__ai-section">
          <button
            className="lg-sidebar__ai-btn"
            onClick={() => setShowAIModal(true)}
            aria-label="Open AI Assistant"
          >
            <div className="lg-sidebar__ai-icon-wrap">
              <Sparkle size={18} weight="fill" />
            </div>
            {isExpanded && (
              <div className="lg-sidebar__ai-text">
                <span className="lg-sidebar__ai-title">AI ASSISTANT</span>
                <span className="lg-sidebar__ai-subtitle">Powered by AI</span>
              </div>
            )}
          </button>
        </div>

        {/* Footer */}
        <div className="lg-sidebar__footer">
          {isExpanded && (
            <div className="lg-sidebar__version">
              <span>V0.1 · LIQUID GLASS</span>
            </div>
          )}
          <button
            className="lg-sidebar__settings"
            onClick={() => setShowSettings(!showSettings)}
            aria-label="Settings"
          >
            <GearSix size={18} weight="regular" />
          </button>
        </div>
      </aside>

      <AIModal isOpen={showAIModal} onClose={() => setShowAIModal(false)} />
    </>
  );
}
