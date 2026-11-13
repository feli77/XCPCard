import type { CSSProperties } from 'react';
import type { CardInstance } from '../game/types';

export function CardBack() {
  return <div className="pile-card-back" aria-hidden="true">
    <span>XCP</span><b>{'{ }'}</b><small>CARD</small>
  </div>;
}

export function CardPile({ cards, kind }: { cards: CardInstance[]; kind: 'deck' | 'discard' }) {
  const label = kind === 'deck' ? '牌库' : '弃牌堆';
  return <div
    className={`card-pile ${kind}-pile`}
    data-card-drop={kind === 'discard' ? 'discard' : undefined}
    aria-label={`${label}，${cards.length} 张`}
  >
    <div className="pile-stack">
      <span className="pile-empty">{cards.length ? '' : '空'}</span>
      {cards.map((card, index) => <div
        className="pile-layer"
        data-pile-uid={card.uid}
        key={card.uid}
        style={{
          '--pile-offset': `${(kind === 'deck' ? cards.length - index - 1 : index) * 1.25}px`,
          zIndex: kind === 'deck' ? cards.length - index : index,
        } as CSSProperties}
      ><CardBack/></div>)}
    </div>
    <div className="pile-caption"><span>{label}</span><b>{cards.length}<small> 张</small></b></div>
    <small className="pile-hint">{kind === 'deck' ? '思路正在路上' : '拖到这里弃牌'}</small>
  </div>;
}
