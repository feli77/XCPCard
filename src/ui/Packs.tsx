import type { CSSProperties } from "react";
import { events, rarities } from "../content/data";
import { uiText } from "../content/text";
import { cardById } from "../game/engine";
import type { Profile } from "../game/types";
import { Card } from "./Card";
import { PixelArt } from "./PixelArt";

export interface OpenedPack {
  cards: string[];
  revealed: number[];
  eventId: string;
}
interface PacksProps {
  profile: Profile;
  onOpen: (index: number) => void;
  onContest: () => void;
}
const eventById = Object.fromEntries(events.map((event) => [event.id, event]));

export function Packs({ profile, onOpen, onContest }: PacksProps) {
  return (
    <main className="packs-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">A LITTLE RANDOMNESS</span>
          <h1>
            卡包仓库 <small>{profile.packs.length} 包</small>
          </h1>
          <p>{uiText.packs.description}</p>
        </div>
      </div>
      {profile.packs.length ? (
        <div className="pack-grid">
          {profile.packs.map((pack, index) => (
            <button
              className="pack-item"
              key={pack.id}
              onClick={() => onOpen(index)}
              onPointerMove={(event) => {
                if (event.pointerType === "touch") return;
                const bounds = event.currentTarget.getBoundingClientRect();
                const x = (event.clientX - bounds.left) / bounds.width;
                const y = (event.clientY - bounds.top) / bounds.height;
                event.currentTarget.style.setProperty("--pack-x", `${x - 0.5}`);
                event.currentTarget.style.setProperty("--pack-y", `${y - 0.5}`);
                event.currentTarget.style.setProperty("--shine-x", `${x * 100}%`);
                event.currentTarget.style.setProperty("--shine-y", `${y * 100}%`);
              }}
              onPointerLeave={(event) => {
                for (const property of ["--pack-x", "--pack-y", "--shine-x", "--shine-y"]) {
                  event.currentTarget.style.removeProperty(property);
                }
              }}
            >
              <div
                className="pack-object"
                style={
                  {
                    "--rarity": rarities[pack.guarantee].color,
                  } as CSSProperties
                }
              >
                <div className={`sealed-pack rarity-${pack.guarantee}`}>
                  <i className="pack-seal pack-seal-top" aria-hidden="true" />
                  <i className="pack-seal pack-seal-bottom" aria-hidden="true" />
                  <span>XCPCard</span>
                  <PixelArt kind="trophy" />
                  <b>
                    ALGORITHM
                    <br />
                    BOOSTER PACK
                  </b>
                  <small>5 CARDS / ONE MORE AC</small>
                </div>
              </div>
              <h3>
                {pack.guarantee
                  ? `保底${rarities[pack.guarantee].name}卡包`
                  : "普通卡包"}
              </h3>
              <span>{eventById[pack.eventId].name}奖励</span>
              <strong>拆开看看 ↗</strong>
            </button>
          ))}
        </div>
      ) : (
        <div className="empty-packs">
          <div className="empty-pack-art">
            <PixelArt kind="template" />
          </div>
          <h2>{uiText.packs.emptyTitle}</h2>
          <p>{uiText.packs.emptyDescription}</p>
          <button className="primary" onClick={onContest}>
            去参加比赛 →
          </button>
        </div>
      )}
    </main>
  );
}

export function PackReveal({
  pack,
  onReveal,
  onClose,
}: {
  pack: OpenedPack;
  onReveal: (indices: number[]) => void;
  onClose: () => void;
}) {
  return (
    <div className="pack-overlay">
      <div className="pack-open-heading">
        <span className="eyebrow">
          {eventById[pack.eventId].name} · 比赛奖励
        </span>
        <h2>{uiText.packs.openingTitle}</h2>
        <p>点击翻开卡牌　{pack.revealed.length} / 5</p>
      </div>
      <div className="pack-reveal-cards">
        {pack.cards.map((id, i) => (
          <div
            className={`reveal-slot ${pack.revealed.includes(i) ? "revealed" : ""}`}
            key={i}
            style={{ "--delay": `${i * 70}ms` } as CSSProperties}
          >
            {pack.revealed.includes(i) ? (
              <Card card={cardById[id]} />
            ) : (
              <button
                className={`card-back rarity-${cardById[id].rarity}`}
                style={
                  {
                    "--rarity": rarities[cardById[id].rarity].color,
                  } as CSSProperties
                }
                onClick={() => onReveal([i])}
                aria-label={`翻开第 ${i + 1} 张卡`}
              >
                <span>XCP</span>
                <PixelArt kind="trophy" />
                <b>?</b>
                <small>CLICK TO REVEAL</small>
              </button>
            )}
            {pack.revealed.includes(i) && (
              <span
                className="reveal-rarity"
                style={{ color: rarities[cardById[id].rarity].color }}
              >
                {rarities[cardById[id].rarity].name} · 已加入收藏
              </span>
            )}
          </div>
        ))}
      </div>
      <button
        className="primary"
        onClick={() => {
          if (pack.revealed.length === 5) onClose();
          else onReveal([0, 1, 2, 3, 4]);
        }}
      >
        {pack.revealed.length === 5 ? "收好，下一包。 →" : "一键全开 →"}
      </button>
    </div>
  );
}
