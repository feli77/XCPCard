import type { CSSProperties } from "react";
import { cards, rarities } from "../content/data";
import { uiText } from "../content/text";
import { cardById } from "../game/engine";
import type { Profile } from "../game/types";
import { Card } from "./Card";
import { PixelArt } from "./PixelArt";

interface CollectionProps {
  profile: Profile;
  playing: boolean;
  category: string;
  onCategory: (category: string) => void;
  onRemove: (cardId: string) => void;
  onAdd: (cardId: string) => void;
}

export function Collection({
  profile,
  playing,
  category,
  onCategory,
  onRemove,
  onAdd,
}: CollectionProps) {
  const collectionCount = Object.values(profile.collection).reduce(
    (a, b) => a + b,
    0,
  );
  const deckCount = (id: string) =>
    profile.deck.filter((cardId) => cardId === id).length;
  const visibleCards = cards.filter(
    (card) =>
      profile.collection[card.id] &&
      (category === "全部" ||
        (category === "技巧" && card.type === "technique") ||
        card.categories.some((c) => c === category)),
  );

  return (
    <main className="collection-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">BUILD YOUR THINKING</span>
          <h1>
            我的卡组 <small>{profile.deck.length} / 24</small>
          </h1>
          <p>{uiText.collection.description}</p>
        </div>
        <span
          className={`deck-state ${profile.deck.length === 24 ? "valid" : ""}`}
        >
          {profile.deck.length === 24 ? "■ 可以参赛" : "□ 凑齐 24 张出发"}
        </span>
      </div>
      {playing && (
        <div className="inline-notice">{uiText.collection.inMatch}</div>
      )}
      <section className="deck-editor panel">
        <div className="section-heading">
          <h3>参赛卡组</h3>
          <span>点击移出</span>
        </div>
        <div className="deck-slots">
          {[...new Set(profile.deck)].map((id) => (
            <button
              key={id}
              style={
                {
                  "--rarity": rarities[cardById[id].rarity].color,
                } as CSSProperties
              }
              onClick={() => onRemove(id)}
            >
              <PixelArt kind={cardById[id].art} />
              <span>{cardById[id].name}</span>
              <b>×{deckCount(id)}</b>
              <i>−</i>
            </button>
          ))}
          {profile.deck.length === 0 && (
            <p className="empty-copy">{uiText.collection.empty}</p>
          )}
        </div>
      </section>
      <div className="collection-toolbar">
        <h3>
          全部收藏 <small>{collectionCount} 张</small>
        </h3>
        <div className="filters">
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
              onClick={() => onCategory(name)}
            >
              {name}
            </button>
          ))}
        </div>
      </div>
      <div className="collection-cards">
        {visibleCards.map((card) => (
          <div className="collection-item" key={card.id}>
            <Card
              card={card}
              count={profile.collection[card.id]}
              onClick={() => onAdd(card.id)}
            />
            <span>
              已带 {deckCount(card.id)} / {profile.collection[card.id]}
            </span>
          </div>
        ))}
      </div>
    </main>
  );
}
