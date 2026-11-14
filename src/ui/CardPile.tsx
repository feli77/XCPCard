import type { CSSProperties } from 'react';
import type { CardInstance } from '../game/types';

export function CardBack() {
  return <span className="pile-card-back" aria-hidden="true">
    <span>XCP</span><b>{'{ }'}</b><small>CARD</small>
  </span>;
}

export function CardPile({ cards, kind, onClick }: {
  cards: CardInstance[];
  kind: 'deck' | 'discard';
  onClick?: () => void;
}) {
  const label = kind === 'deck' ? '牌库' : '弃牌堆';
  const Container = onClick ? 'button' : 'div';
  return <Container
    type={onClick ? 'button' : undefined}
    className={`card-pile ${kind}-pile`}
    data-card-drop={kind === 'discard' ? 'discard' : undefined}
    aria-label={`${label}，${cards.length} 张`}
    aria-haspopup={onClick ? 'dialog' : undefined}
    onClick={onClick}
  >
    <span className="pile-stack">
      <span className="pile-empty">{cards.length ? '' : '空'}</span>
      {cards.map((card, index) => <span
        className="pile-layer"
        data-pile-uid={card.uid}
        key={card.uid}
        style={{
          '--pile-offset': `${(kind === 'deck' ? cards.length - index - 1 : index) * 1.25}px`,
          zIndex: kind === 'deck' ? cards.length - index : index,
        } as CSSProperties}
      ><CardBack/></span>)}
    </span>
    <span className="pile-caption"><span>{label}</span><b>{cards.length}<small> 张</small></b></span>
    <small className="pile-hint">{kind === 'deck' ? '点击查看剩余牌' : '拖到这里弃牌'}</small>
  </Container>;
}
