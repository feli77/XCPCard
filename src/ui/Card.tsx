import { useState } from 'react';
import type { CSSProperties, DragEvent } from 'react';
import { createPortal } from 'react-dom';
import type { CardDefinition } from '../content/types';
import { rarities } from '../content/data';
import { PixelArt } from './PixelArt';

interface CardProps {
  card: CardDefinition;
  selected?: boolean;
  count?: number;
  onClick?: () => void;
  draggable?: boolean;
  onDragStart?: (event: DragEvent) => void;
  progress?: number;
  active?: boolean;
  dice?: number;
  scoreGain?: number;
  onDiscard?: () => void;
  compact?: boolean;
}
export function Card({ card, selected, count, onClick, draggable, onDragStart, progress, active, dice, scoreGain, onDiscard, compact = false }: CardProps) {
  const rarity = rarities[card.rarity];
  const [tooltip, setTooltip] = useState<CSSProperties | null>(null);
  function showDetails(element: HTMLDivElement) {
    const rect = element.getBoundingClientRect();
    setTooltip({ left: Math.max(12, Math.min(window.innerWidth - 250, rect.left - 25)), ...(rect.top > 190 ? { bottom: window.innerHeight - rect.top + 12 } : { top: rect.bottom + 12 }) });
  }
  return <>
    <div
      className={`game-card rarity-${card.rarity} ${selected ? 'selected' : ''} ${active ? 'is-active' : ''} ${progress !== undefined && !active ? 'processing' : ''} ${compact ? 'compact' : ''}`}
      style={{ '--rarity': rarity.color } as CSSProperties}
      onClick={onClick}
      draggable={draggable}
      onDragStart={event => { setTooltip(null); onDragStart?.(event); }}
      onMouseEnter={event => showDetails(event.currentTarget)}
      onMouseLeave={() => setTooltip(null)}
      onFocus={event => showDetails(event.currentTarget)}
      onBlur={() => setTooltip(null)}
      role={onClick ? 'button' : undefined}
      tabIndex={0}
      onKeyDown={event => {
        if (onClick && (event.key === 'Enter' || event.key === ' ')) {
          event.preventDefault(); onClick();
        }
      }}
      aria-label={`${card.name}，${card.score} 分，${card.time} 分钟${selected ? '，已选中' : ''}`}
      aria-pressed={onClick ? !!selected : undefined}
    >
      <div className="card-top"><span>{card.type === 'algorithm' ? 'ALG' : 'TRICK'}</span><span>{rarity.name} ◆</span></div>
      <div className="card-art"><PixelArt kind={card.art}/><span className="art-corner">{String(card.rarity + 1).padStart(2, '0')}</span></div>
      <div className="card-name">{card.name}</div>
      <div className="card-categories">{card.categories.length ? card.categories.join(' / ') : '技巧卡'}</div>
      <div className="card-stats"><b>{card.score}<small> 分</small></b><span>◷ {card.time}′</span></div>
      {count !== undefined && <span className="card-count">×{count}</span>}
      {active && <span className="active-label">{dice ? `+${dice}` : 'READY'}</span>}
      {active && scoreGain !== undefined && scoreGain > 0 && <span className="score-pop">+{scoreGain}</span>}
      {progress !== undefined && !active && <div className="card-progress"><span style={{ width: `${progress * 100}%` }}/></div>}
      {onDiscard && <button className="card-discard" onClick={event => { event.stopPropagation(); onDiscard(); }} aria-label={`弃掉${card.name}`}>×</button>}
    </div>
    {tooltip && createPortal(<div className="card-tooltip floating-tooltip" style={tooltip} role="tooltip">
      <strong>{card.name} · {rarity.name}</strong>
      {card.effectText && <p>{card.effectText}</p>}
      <p>「{card.joke}」</p>
      <small>{card.categories.length ? '命中任一题目类别计全分，否则计一半。' : '技巧加分不受题目类别影响。'}</small>
    </div>, document.body)}
  </>;
}
