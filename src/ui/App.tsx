import { useEffect, useRef, useState } from "react";
import { events } from "../content/data";
import { uiText } from "../content/text";
import {
  act,
  advanceMatch,
  cardById,
  collectCard,
  createProfile,
  DECK_SIZE,
  nextSeason,
  openPack,
  setDeck,
  setPaused,
  settleMatch,
  startMatch,
} from "../game/engine";
import type { Action, Match, MatchResult, Profile } from "../game/types";
import { MatchView } from "./MatchView";
import { PixelArt } from "./PixelArt";
import { sound } from "./audio";
import { Lobby } from "./Lobby";
import { Collection } from "./Collection";
import { Packs, PackReveal } from "./Packs";
import type { OpenedPack } from "./Packs";

type Screen = "lobby" | "deck" | "packs" | "match";
interface Session {
  profile: Profile;
  match: Match | null;
  result: MatchResult | null;
  openedPack: OpenedPack | null;
}
const SAVE_KEY = "xcpcard-save";
const eventById = Object.fromEntries(events.map((event) => [event.id, event]));
function load(): Session {
  const saved = localStorage.getItem(SAVE_KEY);
  if (!saved)
    return {
      profile: createProfile(),
      match: null,
      result: null,
      openedPack: null,
    };
  const session: Session = JSON.parse(saved);
  if (session.match?.status === "playing") session.match.paused = true;
  return session;
}
export function App() {
  const [session, setSession] = useState<Session>(load);
  const [screen, setScreen] = useState<Screen>(() =>
    session.match ? "match" : "lobby",
  );
  const [selected, setSelected] = useState<string[]>([]);
  const [viewProblem, setViewProblem] = useState(
    session.match?.currentProblem || 0,
  );
  const [category, setCategory] = useState("全部");
  const [rarity, setRarity] = useState<number | null>(null);
  const [notice, setNotice] = useState("");
  const previousFeedback = useRef(session.match?.feedback?.id);
  const { profile, match, result, openedPack } = session;
  const playing = match?.status === "playing";
  useEffect(() => {
    localStorage.setItem(SAVE_KEY, JSON.stringify(session));
  }, [session]);
  useEffect(() => {
    if (!match || match.paused || match.status !== "playing") return;
    let last = performance.now();
    const timer = window.setInterval(() => {
      const now = performance.now();
      const elapsed = Math.floor((now - last) / 1000);
      if (!elapsed) return;
      last += elapsed * 1000;
      setSession((s) =>
        s.match ? { ...s, match: advanceMatch(s.match, elapsed) } : s,
      );
    }, 200);
    return () => clearInterval(timer);
  }, [match?.id, match?.paused, match?.status]);
  useEffect(() => {
    if (match?.status !== "finished" || result?.matchId === match.id) return;
    setSession((s) => {
      const settled = settleMatch(s.profile, s.match!);
      return { ...s, ...settled };
    });
  }, [match?.status, match?.id, result?.matchId]);
  useEffect(() => {
    if (!match?.feedback || match.feedback.id === previousFeedback.current)
      return;
    previousFeedback.current = match.feedback.id;
    sound(match.feedback.result);
  }, [match?.feedback?.id]);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 2500);
    return () => clearTimeout(timer);
  }, [notice]);
  function command(action: Action) {
    setSession((s) => ({ ...s, match: act(s.match!, action) }));
    if (action.type === "play" || action.type === "discard-hand")
      setSelected([]);
  }
  function navigate(next: Screen) {
    if (screen === "match" && match?.status === "playing")
      setSession((s) => ({ ...s, match: setPaused(s.match!, true) }));
    setScreen(next);
    setSelected([]);
  }
  function begin(eventId: string) {
    previousFeedback.current = undefined;
    const next = startMatch(profile, eventId);
    setSession((s) => ({ ...s, match: next, result: null }));
    setViewProblem(0);
    setSelected([]);
    setScreen("match");
  }
  function chooseProblem(index: number) {
    setViewProblem(index);
    command({ type: "switch", problem: index });
    setSelected([]);
  }
  function togglePause() {
    const next = setPaused(match!, !match!.paused);
    setSession(s => ({ ...s, match: next }));
    setViewProblem(next.currentProblem);
  }
  function buyPack(index: number) {
    const eventId = profile.packs[index].eventId;
    const opened = openPack(profile, index);
    setSession((s) => ({
      ...s,
      profile: opened.profile,
      openedPack: { cards: opened.cards, revealed: [], eventId },
    }));
  }
  function reveal(indices: number[]) {
    if (!openedPack) return;
    const fresh = indices.filter((i) => !openedPack.revealed.includes(i));
    if (!fresh.length) return;
    sound(
      fresh.some((i) => cardById[openedPack.cards[i]].rarity >= 4)
        ? "rare"
        : "flip",
    );
    setSession((s) => {
      const updated = fresh.reduce(
        (profile, i) => collectCard(profile, s.openedPack!.cards[i]),
        s.profile,
      );
      return {
        ...s,
        profile: updated,
        openedPack: {
          ...s.openedPack!,
          revealed: [...s.openedPack!.revealed, ...fresh],
        },
      };
    });
  }
  function removeCard(cardId: string) {
    const deck = [...profile.deck];
    deck.splice(deck.indexOf(cardId), 1);
    setSession((s) => ({ ...s, profile: setDeck(s.profile, deck) }));
  }
  function addCard(cardId: string) {
    if (profile.deck.length >= DECK_SIZE) {
      setNotice(uiText.collection.full);
      return;
    }
    const count = profile.deck.filter((id) => id === cardId).length;
    if (count >= profile.collection[cardId]) {
      setNotice(uiText.collection.allIncluded);
      return;
    }
    setSession((s) => ({
      ...s,
      profile: setDeck(s.profile, [...s.profile.deck, cardId]),
    }));
  }
  return (
    <div className={`app ${screen === "match" ? "in-match" : ""}`}>
      <header className="app-header">
        <button
          className="brand"
          onClick={() => navigate("lobby")}
          aria-label="返回赛事大厅"
        >
          <span className="brand-icon">X</span>
          <strong>
            XCP<span>Card</span>
          </strong>
          <span className="brand-sub">ALGORITHM CARD CLUB</span>
        </button>
        {screen !== "match" ? (
          <nav>
            {(
              [
                ["lobby", "赛事大厅"],
                ["deck", "我的卡组"],
                ["packs", "卡包仓库"],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                className={screen === key ? "nav-active" : ""}
                onClick={() => navigate(key)}
              >
                {label}
                {key === "packs" && profile.packs.length > 0 && (
                  <i>{profile.packs.length}</i>
                )}
              </button>
            ))}
          </nav>
        ) : (
          <div className="match-title">
            <span className="live-dot" />
            {match && eventById[match.eventId].name}
            <span>第 {profile.season} 赛季</span>
          </div>
        )}
        <div className="header-meta">
          {screen === "match" ? (
            <button className="text-button" onClick={() => navigate("lobby")}>
              保存并离场 ↗
            </button>
          ) : (
            <>
              <span className="tiny-label">SEASON</span>
              <b>{String(profile.season).padStart(2, "0")}</b>
            </>
          )}
        </div>
      </header>

      {screen !== "match" && (
        <div key={screen} className="tab-content">
          {screen === "lobby" && (
            <Lobby
              profile={profile}
              match={match}
              onBegin={begin}
              onResume={() => {
                setViewProblem(match!.currentProblem);
                setScreen("match");
              }}
              onNextSeason={() =>
                setSession((s) => ({ ...s, profile: nextSeason(s.profile) }))
              }
              onEditDeck={() => navigate("deck")}
            />
          )}

          {screen === "deck" && (
            <Collection
              profile={profile}
              playing={!!playing}
              category={category}
              onCategory={setCategory}
              rarity={rarity}
              onRarity={setRarity}
              onRemove={removeCard}
              onAdd={addCard}
            />
          )}

          {screen === "packs" && (
            <Packs
              profile={profile}
              onOpen={buyPack}
              onContest={() => navigate("lobby")}
            />
          )}
        </div>
      )}

      {screen === "match" && match && (
        <MatchView
          match={match}
          viewProblem={viewProblem}
          selected={selected}
          onCommand={command}
          onChooseProblem={chooseProblem}
          onToggleSelected={uid => setSelected(ids => ids.includes(uid) ? ids.filter(id => id !== uid) : [...ids, uid])}
          onTogglePause={togglePause}
        />
      )}

      {result && screen === "match" && (
        <div className="modal-backdrop">
          <section className="result-modal">
            <span className="eyebrow">CONTEST FINISHED</span>
            <h2>
              停止敲键盘，
              <br />
              开始拍大腿。
            </h2>
            <div className="result-values">
              <div>
                <strong>{result.solved}</strong>
                <span>AC</span>
              </div>
              <div>
                <strong>#{result.rank}</strong>
                <span>共 {result.teams} 支队伍</span>
              </div>
              <div>
                <strong>{Math.floor(result.penalty)}</strong>
                <span>总罚时</span>
              </div>
            </div>
            <p>
              {eventById[result.eventId].kind === "side"
                ? "支线完赛，主线门票依然有效。"
                : result.seasonEnded
                  ? result.eventId ===
                    events.filter((e) => e.kind === "main").at(-1)!.id
                    ? "世界舞台打卡成功。下一季，再写一页。"
                    : "本季到站。收藏留下，下季再来。"
                  : result.promoted
                    ? "晋级！下一站的门票，拿好了。"
                    : "评测机今天有自己的想法。"}
            </p>
            <div className="reward-label">
              <PixelArt kind="trophy" />
              <span>
                带回 <b>{result.packs} 包</b> 比赛奖励
              </span>
            </div>
            <button
              className="primary"
              onClick={() => {
                setSession((s) => ({ ...s, match: null, result: null }));
                setScreen("packs");
              }}
            >
              领取卡包 →
            </button>
          </section>
        </div>
      )}
      {openedPack && (
        <PackReveal
          pack={openedPack}
          onReveal={reveal}
          onClose={() => setSession((s) => ({ ...s, openedPack: null }))}
        />
      )}
      {notice && (
        <div className="notice" role="status">
          {notice}
        </div>
      )}
    </div>
  );
}
