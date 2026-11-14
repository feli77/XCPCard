import { useEffect, useRef } from 'react';
import { cardById } from '../game/engine';
import type { CardInstance } from '../game/types';
import { Card } from './Card';

export function DeckDialog({ cards, onClose }: { cards: CardInstance[]; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { dialog.current!.showModal(); }, []);
  function close() {
    dialog.current!.close();
    onClose();
  }

  return <dialog
    ref={dialog}
    className="deck-modal"
    aria-labelledby="deck-modal-title"
    onCancel={event => { event.preventDefault(); close(); }}
    onClick={event => {
      if (event.target === event.currentTarget) close();
    }}
  >
    <div className="deck-modal-heading">
      <h2 id="deck-modal-title">牌库剩余 <span>{cards.length} 张</span></h2>
      <button className="secondary" autoFocus onClick={close} aria-label="关闭牌库">关闭 ×</button>
    </div>
    <div className="deck-modal-cards">
      {cards.map(instance => <Card key={instance.uid} card={cardById[instance.cardId]}/>)}
      {!cards.length && <p className="deck-modal-empty">牌库已空</p>}
    </div>
  </dialog>;
}
