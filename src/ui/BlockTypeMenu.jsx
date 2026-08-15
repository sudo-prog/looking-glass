/**
 * LOOKING GLASS — Block Type Menu
 * Recreates the "turn into" block switcher from Paragraphs.mp4:
 * a small ⋮⋮ handle sits to the left of the block the cursor is in;
 * clicking it opens a menu (Display #, Headline ##, Subheader ###,
 * Body ⌘4, List ⌘L, Task ⌘T) that converts the current block.
 *
 * Usage — render as a sibling of <EditorContent> inside a
 * position:relative wrapper:
 *
 *   <div style={{ position: 'relative' }}>
 *     <BlockTypeMenu editor={editor} />
 *     <EditorContent editor={editor} />
 *   </div>
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  DotsSixVertical,
  TextAa,
  TextHOne,
  TextHTwo,
  TextHThree,
  ListBullets,
  CheckSquare,
} from '@phosphor-icons/react';

const BLOCK_TYPES = [
  { id: 'display', num: '01', label: 'Display', kbd: '#', icon: TextHOne },
  { id: 'headline', num: '02', label: 'Headline', kbd: '##', icon: TextHTwo },
  { id: 'subheader', num: '03', label: 'Subheader', kbd: '###', icon: TextHThree, disabled: true },
  { id: 'body', num: '04', label: 'Body', kbd: '⌘4', icon: TextAa },
  { id: 'list', label: 'List', kbd: '⌘L', icon: ListBullets, divider: true },
  { id: 'task', label: 'Task', kbd: '⌘T', icon: CheckSquare },
];

function applyBlockType(editor, id) {
  const chain = editor.chain().focus();
  switch (id) {
    case 'display':
      chain.setNode('heading', { level: 1 }).run();
      break;
    case 'headline':
      chain.setNode('heading', { level: 2 }).run();
      break;
    case 'subheader':
      // Reserved — not yet supported by the schema, no-op.
      break;
    case 'body':
      chain.setNode('paragraph').run();
      break;
    case 'list':
      chain.toggleBulletList().run();
      break;
    case 'task':
      if (editor.can().toggleTaskList?.()) {
        chain.toggleTaskList().run();
      } else {
        // Fallback if the TaskList extension isn't installed in this build.
        chain.toggleBulletList().run();
      }
      break;
    default:
      break;
  }
}

function activeBlockId(editor) {
  if (!editor) return 'body';
  if (editor.isActive('heading', { level: 1 })) return 'display';
  if (editor.isActive('heading', { level: 2 })) return 'headline';
  if (editor.isActive('heading', { level: 3 })) return 'subheader';
  if (editor.isActive('taskList')) return 'task';
  if (editor.isActive('bulletList')) return 'list';
  return 'body';
}

export function BlockTypeMenu({ editor }) {
  const [open, setOpen] = useState(false);
  const [handleTop, setHandleTop] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  const menuRef = useRef(null);

  // Track the vertical position of the block the cursor currently sits in,
  // relative to the editor's scroll container, so the handle tracks it.
  useEffect(() => {
    if (!editor) return;

    const reposition = () => {
      try {
        const { from } = editor.state.selection;
        const dom = editor.view.domAtPos(from).node;
        const blockEl = dom.nodeType === 3 ? dom.parentElement : dom;
        const container = editor.view.dom.closest('.card-note-editor') || editor.view.dom.parentElement;
        if (!blockEl || !container) return;
        const blockRect = blockEl.getBoundingClientRect?.();
        const containerRect = container.getBoundingClientRect?.();
        if (!blockRect || !containerRect) return;
        setHandleTop(blockRect.top - containerRect.top + blockRect.height / 2 - 9);
      } catch {
        /* selection mid-update; ignore */
      }
    };

    reposition();
    editor.on('selectionUpdate', reposition);
    editor.on('transaction', reposition);
    return () => {
      editor.off('selectionUpdate', reposition);
      editor.off('transaction', reposition);
    };
  }, [editor]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Track viewport width so the menu can switch to a bottom sheet on mobile
  // (MOBILE-UI-STANDARD S-3 / S-1: mobile menus dock as a full-width sheet
  // with safe-area padding instead of an inline popup that can overflow).
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  const handleSelect = useCallback(
    (id) => {
      if (!editor) return;
      applyBlockType(editor, id);
      setOpen(false);
    },
    [editor],
  );

  if (!editor || handleTop === null) return null;

  const current = activeBlockId(editor);

  // Responsive menu container: inline popup on desktop, full-width bottom
  // sheet (safe-area aware, above the toolbar) on mobile (<=767px).
  const menuStyle = isMobile
    ? {
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 0,
        width: 'auto',
        maxHeight: '70dvh',
        borderRadius: '16px 16px 0 0',
        background: 'rgba(18,18,18,0.98)',
        backdropFilter: 'blur(24px) saturate(120%)',
        WebkitBackdropFilter: 'blur(24px) saturate(120%)',
        border: '1px solid rgba(255,255,255,0.10)',
        borderBottom: 'none',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.10), 0 -16px 40px rgba(0,0,0,0.60)',
        padding: '8px 8px calc(8px + env(safe-area-inset-bottom))',
        display: 'flex',
        flexDirection: 'column',
        gap: '1px',
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch',
        zIndex: 1000,
        animation: 'btm-in 0.14s ease both',
      }
    : {
        position: 'absolute',
        top: '22px',
        left: 0,
        width: '208px',
        borderRadius: '12px',
        background: 'rgba(18,18,18,0.97)',
        backdropFilter: 'blur(24px) saturate(120%)',
        WebkitBackdropFilter: 'blur(24px) saturate(120%)',
        border: '1px solid rgba(255,255,255,0.10)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.10), 0 16px 40px rgba(0,0,0,0.60)',
        padding: '6px',
        display: 'flex',
        flexDirection: 'column',
        gap: '1px',
        overflowX: 'auto',
        WebkitOverflowScrolling: 'touch',
        animation: 'btm-in 0.14s ease both',
      };

  return (
    <div
      ref={menuRef}
      contentEditable={false}
      style={{ position: 'absolute', left: isMobile ? '14px' : '-26px', top: `${handleTop}px`, zIndex: isMobile ? 1000 : 5 }}
      onMouseDown={(e) => e.preventDefault()}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Turn block into…"
        title="Turn into…"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '18px',
          height: '18px',
          minWidth: '48px',
          minHeight: '48px',
          marginLeft: '-13px',
          marginTop: '-13px',
          borderRadius: '50%',
          border: 'none',
          background: open ? 'var(--state-active)' : 'var(--state-hover)',
          color: 'var(--text-secondary)',
          cursor: 'pointer',
          padding: 0,
          opacity: 0.85,
        }}
      >
        <DotsSixVertical size={11} weight="bold" />
      </button>

      {open && (
        <>
          {isMobile && (
            <div
              onClick={() => setOpen(false)}
              style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0,0,0,0.45)',
                zIndex: 999,
              }}
            />
          )}
          <div style={menuStyle}>
          <style>{`@keyframes btm-in { from { opacity:0; transform: translateY(-4px); } to { opacity:1; transform: translateY(0); } }`}</style>

          {BLOCK_TYPES.map((bt) => (
            <React.Fragment key={bt.id}>
              {bt.divider && (
                <div style={{ height: '1px', background: 'var(--color-border)', margin: '4px 2px' }} />
              )}
              <button
                type="button"
                disabled={bt.disabled}
                onClick={() => handleSelect(bt.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  flexWrap: 'wrap',
                  height: '32px',
                  minHeight: '48px',
                  padding: '0 8px',
                  borderRadius: '7px',
                  border: 'none',
                  background: current === bt.id ? 'var(--state-active)' : 'transparent',
                  color: bt.disabled ? 'var(--text-disabled)' : 'var(--text-primary)',
                  cursor: bt.disabled ? 'default' : 'pointer',
                  textAlign: 'left',
                  width: '100%',
                  opacity: bt.disabled ? 0.45 : 1,
                }}
                onMouseEnter={(e) => { if (!bt.disabled) e.currentTarget.style.background = 'var(--state-hover)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = current === bt.id ? 'var(--state-active)' : 'transparent'; }}
              >
                {bt.num && (
                  <span style={{ fontFamily: 'var(--font-ui)', fontSize: '10px', color: 'var(--text-disabled)', width: '14px', flexShrink: 0 }}>
                    {bt.num}
                  </span>
                )}
                {!bt.num && <span style={{ width: '14px', flexShrink: 0 }} />}
                <bt.icon size={14} weight="regular" style={{ flexShrink: 0 }} />
                <span style={{ flex: 1, fontFamily: 'var(--font-body)', fontSize: '13px' }}>{bt.label}</span>
                <span style={{ fontFamily: 'var(--font-ui)', fontSize: '10px', color: 'var(--text-disabled)' }}>{bt.kbd}</span>
              </button>
            </React.Fragment>
          ))}
        </div>
      </>)}
    </div>
  );
}

export default BlockTypeMenu;
