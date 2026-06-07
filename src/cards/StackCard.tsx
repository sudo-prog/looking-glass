/**
 * LOOKING GLASS — StackCard Component
 * Renders a stack of cards with fan-out spring animation.
 */
import { useState, useMemo } from 'react';

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

export function StackCard({ item, isSelected, onSelect, onDragStart, allItems = [] }) {
  const [isFanned, setIsFanned] = useState(false);

  const stackedCards = useMemo(() => {
    const items = item.meta?.stack_items || [];
    return items;
  }, [item.meta?.stack_items]);

  const count = stackedCards.length;

  const handleClick = (e) => {
    e.stopPropagation();
    setIsFanned((prev) => !prev);
    onSelect(e.ctrlKey || e.metaKey);
  };

  const stackClass = [
    'card-stack',
    isFanned ? 'card-stack--fanned' : '',
    isSelected ? 'selected' : '',
  ].filter(Boolean).join(' ');

  return (
    <div
      className={stackClass}
      data-id={item.id}
      data-type={item.type}
      style={{
        left: item.x,
        top: item.y,
        width: item.width || 320,
        minHeight: 180,
      }}
      onPointerDown={onDragStart}
      onClick={handleClick}
    >
      {count > 0 && (
        <span className="stack-count-badge">{count}</span>
      )}
      <div className="stack-layers">
        {stackedCards.map((card, i) => {
          const isTop = i === stackedCards.length - 1;
          const isGhost = i < stackedCards.length - 3;
          const layerClass = [
            'stack-layer',
            isFanned ? 'stack-layer-fanned' : 'stack-layer-stacked',
            isTop && !isFanned ? 'stack-layer-top' : '',
            isGhost && !isFanned ? 'stack-ghost' : '',
          ].filter(Boolean).join(' ');
          const title = card.content?.title || card.content?.url || 'Card';
          return (
            <div key={card.id} className={layerClass}
              style={{ width: card.width || 320, minHeight: 100, zIndex: i + 1 }}>
              <div style={{
                padding: '8px 12px',
                fontFamily: "'Space Mono', monospace",
                fontSize: '10px',
                letterSpacing: '0.06em',
                color: 'var(--text-secondary)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>{escapeHtml(title)}</div>
            </div>
          );
        })}
      </div>
      <span className="stack-hint">{isFanned ? 'Click to stack' : 'Click to fan'}</span>
    </div>
  );
}

export default StackCard;
