import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, PointerEvent } from 'react';
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
  onPointerDown?: (event: PointerEvent<HTMLDivElement>) => void;
  dragging?: boolean;
  progress?: number;
  active?: boolean;
  dice?: number;
  scoreGain?: number;
  onDiscard?: () => void;
  compact?: boolean;
}
export function Card({ card, selected, count, onClick, draggable, onPointerDown, dragging, progress, active, dice, scoreGain, onDiscard, compact = false }: CardProps) {
  const rarity = rarities[card.rarity];
  const [tooltip, setTooltip] = useState<CSSProperties | null>(null);
  const tiltBounds = useRef<DOMRect | null>(null);
  const tooltipTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(tooltipTimer.current), []);
  useEffect(() => { if (dragging) hideDetails(); }, [dragging]);
  function tiltCard(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType !== 'mouse' || event.buttons || dragging || !tiltBounds.current) return;
    const { left, top, width, height } = tiltBounds.current;
    const x = Math.max(-1, Math.min(1, (event.clientX - left) / width * 2 - 1));
    const y = Math.max(-1, Math.min(1, (event.clientY - top) / height * 2 - 1));
    event.currentTarget.style.setProperty('--tilt-x', `${-y * 10}deg`);
    event.currentTarget.style.setProperty('--tilt-y', `${x * 10}deg`);
  }
  function resetTilt(element: HTMLDivElement) {
    tiltBounds.current = null;
    element.style.removeProperty('--tilt-x');
    element.style.removeProperty('--tilt-y');
  }
  function showDetails(element: HTMLDivElement) {
    clearTimeout(tooltipTimer.current);
    if (document.body.classList.contains('card-dragging')) return;
    const rect = element.getBoundingClientRect();
    setTooltip({ left: Math.max(12, Math.min(window.innerWidth - 250, rect.left - 25)), ...(rect.top > 190 ? { bottom: window.innerHeight - rect.top + 12 } : { top: rect.bottom + 12 }) });
  }
  function delayDetails(element: HTMLDivElement) {
    clearTimeout(tooltipTimer.current);
    tooltipTimer.current = setTimeout(() => showDetails(element), 500);
  }
  function hideDetails() {
    clearTimeout(tooltipTimer.current);
    setTooltip(null);
  }
  return <>
    <div
      className={`game-card rarity-${card.rarity} ${selected ? 'selected' : ''} ${active ? 'is-active' : ''} ${progress !== undefined && !active ? 'processing' : ''} ${compact ? 'compact' : ''} ${dragging ? 'is-dragging' : ''}`}
      style={{ '--rarity': rarity.color } as CSSProperties}
      onClick={onClick}
      draggable={false}
      data-draggable={draggable || undefined}
      onDragStart={event => event.preventDefault()}
      onPointerDown={event => { resetTilt(event.currentTarget); hideDetails(); onPointerDown?.(event); }}
      onPointerEnter={event => {
        if (event.pointerType !== 'mouse') return;
        tiltBounds.current = event.currentTarget.getBoundingClientRect();
        tiltCard(event);
      }}
      onPointerMove={tiltCard}
      onPointerLeave={event => { if (!dragging) resetTilt(event.currentTarget); }}
      onPointerCancel={event => { if (!dragging) resetTilt(event.currentTarget); }}
      onMouseEnter={event => delayDetails(event.currentTarget)}
      onMouseLeave={hideDetails}
      onTransitionEnd={event => {
        if (tooltip && event.target === event.currentTarget && event.currentTarget.matches(':hover, :focus-visible')) showDetails(event.currentTarget);
      }}
      onFocus={event => { if (event.currentTarget.matches(':focus-visible')) showDetails(event.currentTarget); }}
      onBlur={event => { resetTilt(event.currentTarget); hideDetails(); }}
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
    {tooltip && !dragging && createPortal(<div className="card-tooltip floating-tooltip" style={tooltip} role="tooltip">
      <strong>{card.name} · {rarity.name}</strong>
      {card.effectText && <p>{card.effectText}</p>}
      <p>「{card.joke}」</p>
      <small>{card.categories.length ? '命中任一题目类别计全分，否则计一半。' : '技巧加分不受题目类别影响。'}</small>
    </div>, document.body)}
  </>;
}
