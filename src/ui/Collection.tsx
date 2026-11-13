import type { CSSProperties } from "react";
import { cards, rarities } from "../content/data";
import { uiText } from "../content/text";
import { cardById, DECK_SIZE } from "../game/engine";
import type { Profile } from "../game/types";
import { Card } from "./Card";
import { PixelArt } from "./PixelArt";
import { useCardDrag } from "./useCardDrag";

interface CollectionProps {
  profile: Profile;
  playing: boolean;
  category: string;
  onCategory: (category: string) => void;
  rarity: number | null;
  onRarity: (rarity: number | null) => void;
  onRemove: (cardId: string) => void;
  onAdd: (cardId: string) => void;
}

type CardZone = "collection" | "deck";

export function Collection({
  profile,
  playing,
  category,
  onCategory,
  rarity,
  onRarity,
  onRemove,
  onAdd,
}: CollectionProps) {
  const { dragged: draggedCard, startDrag, onClickCapture, onPointerDownCapture } = useCardDrag<{ from: CardZone; id: string }>((item, target) => {
    if (item.from === target) return;
    if (target === "deck") onAdd(item.id);
    else if (target === "collection") onRemove(item.id);
  });
  const collectionCount = Object.values(profile.collection).reduce(
    (a, b) => a + b,
    0,
  );
  const deckCount = (id: string) =>
    profile.deck.filter((cardId) => cardId === id).length;
  const visibleCards = cards.filter(
    (card) =>
      profile.collection[card.id] &&
      (rarity === null || card.rarity === rarity) &&
      (category === "全部" ||
        (category === "技巧" && card.type === "technique") ||
        card.categories.some((c) => c === category)),
  );

  return (
    <main className="collection-page" onClickCapture={onClickCapture} onPointerDownCapture={onPointerDownCapture}>
      {playing && (
        <div className="inline-notice">{uiText.collection.inMatch}</div>
      )}
      <div className="collection-layout">
        <section
          className={`collection-library ${draggedCard?.from === "deck" ? "drop-target" : ""}`}
          data-card-drop="collection"
        >
          <div className="collection-toolbar">
            <h3>
              全部收藏 <small>{collectionCount} 张</small>
            </h3>
            <div className="filters" role="group" aria-label="类别筛选">
              {[
                "全部",
                "基础算法",
                "图论",
                "数学",
                "DP",
                "数据结构",
                "字符串",
                "计算几何",
                "技巧",
              ].map((name) => (
                <button
                  key={name}
                  className={category === name ? "active" : ""}
                  aria-pressed={category === name}
                  onClick={() => onCategory(name)}
                >
                  {name}
                </button>
              ))}
            </div>
            <div className="filters rarity-filters" role="group" aria-label="稀有度筛选">
              <span className="filter-label">稀有度</span>
              <button
                className={rarity === null ? "active" : ""}
                aria-pressed={rarity === null}
                onClick={() => onRarity(null)}
              >
                全部
              </button>
              {rarities.map((definition, index) => (
                <button
                  key={definition.name}
                  className={rarity === index ? "active" : ""}
                  style={{ "--rarity": definition.color } as CSSProperties}
                  aria-pressed={rarity === index}
                  onClick={() => onRarity(index)}
                >
                  <span className="rarity-dot" aria-hidden="true" />
                  {definition.name}
                </button>
              ))}
            </div>
          </div>
          {visibleCards.length === 0 && (
            <p className="empty-copy">没有符合筛选条件的卡牌。</p>
          )}
          <div className="collection-cards">
            {visibleCards.map((card) => (
              <div className="collection-item" key={card.id}>
                <Card
                  card={card}
                  count={profile.collection[card.id]}
                  onClick={() => onAdd(card.id)}
                  draggable
                  dragging={draggedCard?.from === "collection" && draggedCard.id === card.id}
                  onPointerDown={(event) => startDrag(event, { from: "collection", id: card.id })}
                />
                <span>
                  已带 {deckCount(card.id)} / {profile.collection[card.id]}
                </span>
              </div>
            ))}
          </div>
        </section>
        <section
          className={`deck-editor panel ${draggedCard?.from === "collection" ? "drop-target" : ""}`}
          data-card-drop="deck"
        >
          <div className="section-heading">
            <h3>
              参赛卡组 <small className="deck-count">{profile.deck.length} / {DECK_SIZE}</small>
            </h3>
            <span>点击或拖出</span>
          </div>
          <span
            className={`deck-state ${profile.deck.length <= DECK_SIZE ? "valid" : ""}`}
          >
            {profile.deck.length <= DECK_SIZE ? "■ 可以参赛" : `□ 最多携带 ${DECK_SIZE} 张`}
          </span>
          <div className="deck-slots">
            {[...new Set(profile.deck)].map((id) => (
              <button
                key={id}
                className={`deck-entry ${draggedCard?.from === "deck" && draggedCard.id === id ? "is-dragging" : ""}`}
                style={
                  {
                    "--rarity": rarities[cardById[id].rarity].color,
                  } as CSSProperties
                }
                onClick={() => onRemove(id)}
                draggable={false}
                data-draggable
                onDragStart={(event) => event.preventDefault()}
                onPointerDown={(event) => startDrag(event, { from: "deck", id }, { width: 125, height: 183 })}
              >
                {draggedCard?.from === "deck" && draggedCard.id === id ? <Card card={cardById[id]} /> : <>
                  <PixelArt kind={cardById[id].art} />
                  <span>{cardById[id].name}</span>
                  <b>×{deckCount(id)}</b>
                  <i>−</i>
                </>}
              </button>
            ))}
            {profile.deck.length === 0 && (
              <p className="empty-copy">{uiText.collection.empty}</p>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
