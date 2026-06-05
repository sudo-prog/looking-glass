/**
 * LOOKING GLASS — Note Card Component
 * Tiptap editor card using BaseCard for shared glass/drag/selection.
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import { BaseCard, BaseCardProps } from './BaseCard';
import { Note as NoteIcon } from '@phosphor-icons/react';

interface NoteCardProps extends Omit<BaseCardProps, 'children'> {}

function escapeHtml(str: string | null | undefined): string {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function getFirstLine(html: string): string {
  if (!html) return 'Note';
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return tmp.textContent?.split('\n')[0]?.trim() || 'Note';
}

export const NoteCard: React.FC<NoteCardProps> = (props) => {
  const { item, onSave } = props;
  const [editing, setEditing] = useState(false);
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Underline,
      Link.configure({ openOnClick: false }),
    ],
    content: item.content.text || '',
    editable: editing,
    onUpdate: ({ editor }) => {
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
      saveTimeout.current = setTimeout(() => {
        const html = editor.getHTML();
        onSave?.({ content: { text: html } });
      }, 500);
    },
  });

  useEffect(() => {
    if (editor) editor.setEditable(editing);
  }, [editing, editor]);

  useEffect(() => {
    if (editor && item.content.text && !editing) {
      const current = editor.getHTML();
      if (current !== item.content.text) {
        editor.commands.setContent(item.content.text, false);
      }
    }
  }, [item.content.text, editor, editing]);

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setEditing(true);
  }, []);

  useEffect(() => {
    if (!editing || !editor) return;
    const handleBlur = () => {
      setEditing(false);
      const html = editor.getHTML();
      onSave?.({ content: { text: html } });
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        editor.commands.blur();
        setEditing(false);
      }
    };
    editor.on('blur', handleBlur);
    editor.on('keydown', handleKeyDown);
    setTimeout(() => editor.commands.focus(), 50);
    return () => {
      editor.off('blur', handleBlur);
      editor.off('keydown', handleKeyDown);
    };
  }, [editing, editor, onSave]);

  const firstLine = getFirstLine(item.content.text || '');

  return (
    <BaseCard {...props} accentColor="var(--color-warning)">
      {/* Note header */}
      <div
        className="card-header"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '12px 16px 0',
        }}
      >
        <NoteIcon size={16} weight="regular" style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />
        <div
          className="card-title"
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 'var(--text-base)',
            color: 'var(--text-primary)',
            fontWeight: 500,
            lineHeight: 'var(--leading-snug)',
            flex: 1,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {escapeHtml(firstLine)}
        </div>
      </div>

      {/* 1px separator */}
      <div
        className="card-separator"
        aria-hidden="true"
        style={{ height: '1px', background: 'var(--color-border)', margin: '8px 0' }}
      />

      {/* Tiptap editor area */}
      <div
        className={`card-note-editor ${editing ? 'focused' : ''}`}
        style={{
          padding: '0 16px 12px',
          fontFamily: 'var(--font-body)',
          fontSize: 'var(--text-sm)',
          color: 'var(--text-primary)',
          minHeight: '60px',
          cursor: editing ? 'text' : 'default',
        }}
        onDoubleClick={handleDoubleClick}
      >
        <EditorContent editor={editor} />
      </div>

      {/* Metadata row */}
      <div
        className="card-metadata"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '8px 16px',
          fontFamily: 'var(--font-ui)',
          fontSize: '10px',
          textTransform: 'uppercase',
          letterSpacing: '0.12em',
          color: 'var(--text-secondary)',
          borderTop: '1px solid var(--color-border)',
        }}
      >
        <span>NOTE</span>
        <span>{new Date(item.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
      </div>
    </BaseCard>
  );
};

export default NoteCard;
