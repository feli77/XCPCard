import type { CSSProperties } from "react";
import { events, rarities } from "../content/data";
import { uiText } from "../content/text";
import { availableEvents, cardById } from "../game/engine";
import type { Match, Profile } from "../game/types";
import { Card } from "./Card";
import { PixelArt } from "./PixelArt";

interface LobbyProps {
  profile: Profile;
  match: Match | null;
  onBegin: (eventId: string) => void;
  onResume: () => void;
  onNextSeason: () => void;
  onEditDeck: () => void;
}

export function Lobby({
  profile,
  match,
  onBegin,
  onResume,
  onNextSeason,
  onEditDeck,
}: LobbyProps) {
  const playing = match?.status === "playing";
  const permitted = availableEvents(profile);
  const mainEvent = permitted.find((event) => event.kind === "main");
  const eventById = Object.fromEntries(
    events.map((event) => [event.id, event]),
  );
  const collectionCount = Object.values(profile.collection).reduce(
    (a, b) => a + b,
    0,
  );
  const lastResult = profile.history.at(-1);
  const text = uiText.lobby;

  return (
    <main className="lobby">
      <div className="lobby-title">
        <div>
          <span className="eyebrow">THE ROAD TO WORLD FINALS</span>
          <h1>
            下一站，
            {profile.seasonEnded ? "新的赛季" : mainEvent?.name || "世界舞台"}
            <span className="cursor">_</span>
          </h1>
          <p>{text.subtitle}</p>
        </div>
        <div className="edition-stamp">
          XCPC
          <br />
          <strong>300′</strong>
          <br />
          CARD CONTEST
        </div>
      </div>
      <section className="season-route">
        {events
          .filter((event) => event.kind === "main")
          .map((event, i) => (
            <div
              key={event.id}
              className={`route-stop ${i === profile.mainIndex && !profile.seasonEnded ? "current" : ""} ${profile.playedEvents.includes(event.id) ? "visited" : ""}`}
            >
              <span className="route-number">
                {profile.playedEvents.includes(event.id) ? "✓" : `0${i + 1}`}
              </span>
              <div>
                <strong>{event.name}</strong>
                <small>
                  {i < 4 ? `前 ${[50, 40, 25, 20][i]}% 晋级` : "最后一站"}
                </small>
              </div>
            </div>
          ))}
      </section>
      <div className="lobby-grid">
        <section className="contest-ticket">
          <div className="ticket-top">
            <span>
              ENTRY TICKET / {String(profile.season).padStart(2, "0")}
            </span>
            <span>● READY TO CODE</span>
          </div>
          <div className="ticket-content">
            <div className="ticket-copy">
              <span className="eyebrow">
                {playing ? "比赛存档" : "主线赛事"}
              </span>
              <h2>
                {playing
                  ? eventById[match.eventId].name
                  : profile.seasonEnded
                    ? text.seasonEndTitle
                    : mainEvent?.name}
              </h2>
              <p>
                {playing
                  ? `比赛进行至 ${Math.floor(match.time)} 分钟。回来时，时钟会等你。`
                  : profile.seasonEnded
                    ? text.seasonEndDescription
                    : mainEvent?.description}
              </p>
              <div className="ticket-facts">
                <span>
                  <b>
                    {playing
                      ? match.problems.length
                      : mainEvent?.problems || 10}
                  </b>{" "}
                  道题
                </span>
                <span>
                  <b>5</b> 分钟一场
                </span>
                <span>
                  <b>24</b> 张卡牌
                </span>
              </div>
            </div>
            <div className="ticket-illustration">
              <PixelArt kind="trophy" />
              <span>ACCEPTED</span>
              <i>★ ★ ★</i>
            </div>
          </div>
          <div className="ticket-bottom">
            <span>
              {profile.deck.length === 24
                ? "■ 卡组已就绪"
                : `□ 卡组 ${profile.deck.length}/24，请先组卡`}
            </span>
            {playing ? (
              <button className="primary" onClick={onResume}>
                继续比赛 <span>→</span>
              </button>
            ) : profile.seasonEnded ? (
              <button className="primary" onClick={onNextSeason}>
                开启下一季 <span>→</span>
              </button>
            ) : (
              <button
                className="primary"
                disabled={profile.deck.length !== 24 || !mainEvent}
                onClick={() => onBegin(mainEvent!.id)}
              >
                参加比赛 <span>→</span>
              </button>
            )}
          </div>
        </section>
        <section className="deck-preview panel">
          <div className="section-heading">
            <h3>这次带这些</h3>
            <span>{profile.deck.length} / 24</span>
          </div>
          <div className="mini-deck">
            {[...new Set(profile.deck)].slice(0, 4).map((id, i) => (
              <div
                key={id}
                style={{ "--tilt": `${(i - 1.5) * 7}deg` } as CSSProperties}
              >
                <Card card={cardById[id]} compact />
              </div>
            ))}
          </div>
          <div className="deck-preview-bottom">
            <span>
              {Object.keys(profile.collection).length} 种卡牌 ·{" "}
              {collectionCount} 张收藏
            </span>
            <button className="text-button" onClick={onEditDeck}>
              调整卡组 ↗
            </button>
          </div>
        </section>
      </div>
      <div className="lobby-bottom">
        <section className="side-contests">
          <div className="section-heading">
            <h3>顺路打一场</h3>
            <span>支线赛事 · 每季各一次</span>
          </div>
          <div className="side-row">
            {events
              .filter((event) => event.kind === "side")
              .map((event) => (
                <button
                  key={event.id}
                  className="side-ticket"
                  disabled={
                    !permitted.some((e) => e.id === event.id) ||
                    !!playing ||
                    profile.deck.length !== 24
                  }
                  onClick={() => onBegin(event.id)}
                >
                  <span className="side-icon">↗</span>
                  <span>
                    <strong>{event.name}</strong>
                    <small>
                      {profile.playedEvents.includes(event.id)
                        ? "本季已参加"
                        : profile.mainIndex === 0
                          ? "校赛后开放"
                          : `保底${rarities[event.guarantee].name}卡 · 不影响主线资格`}
                    </small>
                  </span>
                  <b>→</b>
                </button>
              ))}
          </div>
        </section>
        <aside className="daily-note">
          <span>来自机房的一句话</span>
          <p>{text.note}</p>
          <small>{text.noteReply}</small>
        </aside>
      </div>
      {lastResult && (
        <div className="last-result">
          上一场 · {eventById[lastResult.eventId].name}　{lastResult.solved}{" "}
          AC　排名 #{lastResult.rank}　奖励 {lastResult.packs} 包
        </div>
      )}
      <footer>
        {text.footer}
        <span>XCPCard / INSERT ALGORITHM</span>
      </footer>
    </main>
  );
}
