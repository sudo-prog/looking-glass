/**
 * LOOKING GLASS — Group Card Component
 * Stack container for grouped cards using BaseCard.
 */

import React, { useState, useCallback } from 'react';
import { BaseCard, BaseCardProps } from './BaseCard';
import { BracketsCurly as GroupIcon, CaretUp, CaretDown } from '@phosphor-icons/react';

interface GroupCardProps extends Omit<BaseCardProps, 'children'> {
  childCount?: number;
  onToggle?: () => void;
}

function escapeHtml(str: string | null | undefined): string {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

export const GroupCard: React.FC<GroupCardProps> = (props) => {
  const { item, childCount = 0, onToggle } = props;
  const [collapsed, setCollapsed] = useState(item.meta?.collapsed || false);

  const handleToggle = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setCollapsed(prev => !prev);
    onToggle?.();
  }, [onToggle]);

  return (
    <BaseCard {...props} accentColor="var(--color-accent)">
      {/* Group header */}
      <div
        className="card-header"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '12px 16px',
        }}
      >
        <button
          onClick={handleToggle}
          aria-label={collapsed ? 'Expand group' : 'Collapse group'}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '20px',
            height: '20px',
            borderRadius: '4px',
            background: 'none',
            border: 'none',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            padding: 0,
          }}
        >
          {collapsed
            ? <CaretDown size={12} weight="regular" />
            : <CaretUp size={12} weight="regular" />
          }
        </button>

        <GroupIcon size={14} weight="regular" style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />

        <div
          className="card-title"
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 'var(--text-base)',
            color: 'var(--text-primary)',
            fontWeight: 600,
            lineHeight: 'var(--leading-snug)',
            flex: 1,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {escapeHtml(item.content.title || 'Group')}
        </div>

        <span
          style={{
            fontFamily: 'var(--font-ui)',
            fontSize: 'var(--text-xs)',
            color: 'var(--text-secondary)',
          }}
        >
          {childCount}
        </span>
      </div>

      {/* 1px separator */}
      <div
        className="card-separator"
        aria-hidden="true"
        style={{ height: '1px', background: 'var(--color-border)' }}
      />

      {/* Group body */}
      <div
        className="group-body"
        style={{
          padding: collapsed ? '12px 16px' : '0',
          minHeight: collapsed ? 'auto' : '40px',
          fontFamily: 'var(--font-ui)',
          fontSize: 'var(--text-xs)',
          color: 'var(--text-disabled)',
          textTransform: 'uppercase',
          letterSpacing: '0.12em',
        }}
      >
        {collapsed ? (
          <span style={{ fontFamily: 'var(--font-ui)', fontSize: '10px', color: 'var(--text-disabled)' }}>
            {childCount} ITEMS — CLICK TO EXPAND
          </span>
        ) : (
          <div className="group-children" />
        )}
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
        <span>GROUP</span>
        <span>{new Date(item.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
      </div>
    </BaseCard>
  );
};

export default GroupCard;
