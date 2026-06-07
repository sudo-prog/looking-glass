/**
 * LOOKING GLASS — DropModePicker Component
 * Popup that appears above a drop target to choose Stack or Folder.
 */
import { useEffect, useRef } from 'react';
import { Stack as StackIcon, Folder as FolderIcon } from '@phosphor-icons/react';

export function DropModePicker({ position, onChooseStack, onChooseFolder, onCancel }) {
  const pickerRef = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onCancel(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onCancel]);

  useEffect(() => {
    const handler = (e) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) onCancel();
    };
    setTimeout(() => { window.addEventListener('mousedown', handler); }, 50);
    return () => window.removeEventListener('mousedown', handler);
  }, [onCancel]);

  return (
    <div ref={pickerRef} className="drop-mode-picker" role="dialog" aria-label="Choose drop mode"
      style={{
        position: 'fixed', left: position.x, top: position.y, zIndex: 9999,
        display: 'flex', gap: 4, padding: 4, borderRadius: 12,
        background: 'rgba(16,16,18,0.92)',
        backdropFilter: 'blur(16px) saturate(1.4)',
        WebkitBackdropFilter: 'blur(16px) saturate(1.4)',
        border: '1px solid var(--color-border-active, rgba(215,25,33,0.25))',
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        animation: 'dmp-appear 0.15s cubic-bezier(0.34, 1.56, 0.64, 1)',
      }}>
      <button className="dmp-btn" onClick={(e) => { e.stopPropagation(); onChooseStack(); }}
        aria-label="Create stack"
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '8px 14px', borderRadius: '8px 4px 4px 8px',
          border: 'none', background: 'transparent',
          color: 'var(--text-primary)',
          fontFamily: "'Space Mono', monospace", fontSize: 10,
          fontWeight: 700, letterSpacing: '0.06em', cursor: 'pointer',
          transition: 'background 0.15s',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--state-hover)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}>
        <StackIcon size={16} weight="regular" className="dmp-btn-icon" />
        STACK
      </button>
      <div aria-hidden="true" style={{
        width: 1, background: 'var(--color-border)', margin: '6px 0',
      }} />
      <button className="dmp-btn" onClick={(e) => { e.stopPropagation(); onChooseFolder(); }}
        aria-label="Create folder"
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '8px 14px', borderRadius: '4px 8px 8px 4px',
          border: 'none', background: 'transparent',
          color: 'var(--text-primary)',
          fontFamily: "'Space Mono', monospace", fontSize: 10,
          fontWeight: 700, letterSpacing: '0.06em', cursor: 'pointer',
          transition: 'background 0.15s',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--state-hover)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}>
        <FolderIcon size={16} weight="regular" className="dmp-btn-icon" />
        FOLDER
      </button>
    </div>
  );
}

export default DropModePicker;
