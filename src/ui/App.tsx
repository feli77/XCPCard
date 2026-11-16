import { acknowledgeAchievementNotifications, processMatchAchievements, restoreAchievements } from '../game/achievements';
import { AchievementUnlocks } from './AchievementUnlocks';
import { AchievementDetailsProvider } from './AchievementCard';
import { TrainingBalance, TrainingPoints } from './TrainingPoints';
import { purchaseOffer, recycleCard, restoreEconomy } from '../game/economy';
import { Training } from './Training';
import { useEffect, useRef, useState } from "react";
import { events } from "../content/data";
import { uiText } from "../content/text";
import {
  act,
  advanceMatch,
  advanceJudging,
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
import { contestAwards, restoreHistory } from "../game/honors";
import { seasonYear } from "../game/season";
import { AwardBadges } from "./AwardBadges";
import { TrophyRoom } from "./TrophyRoom";
import { MatchView } from "./MatchView";
import { PixelArt } from "./PixelArt";
import { sound } from "./audio";
import { Lobby } from "./Lobby";
import { Collection } from "./Collection";
import { Packs, PackReveal } from "./Packs";
import type { OpenedPack } from "./Packs";

type Screen = "lobby" | "deck" | "packs" | "honors" | "training" | "match";
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
  session.profile = restoreAchievements(restoreEconomy(restoreHistory(session.profile)), session.match);
  if (session.result) session.result = session.profile.history.find(result => result.matchId === session.result!.matchId)
    ?? { ...session.result, season: seasonYear(session.result.season ?? session.profile.season), ...contestAwards(session.result.eventId, session.result.rank, session.result.teams) };
  if (session.match?.status === "playing") session.match.paused = true;
  return session;
}
export function App() {
  const [session, setSession] = useState<Session>(load);
  const [screen, setScreen] = useState<Screen>(() =>
    session.match ? "match" : "lobby",
  );
  const [selected, setSelected] = useState<string[]>([]);
  const [speed, setSpeed] = useState<1 | 2 | 4>(1);
  const [viewProblem, setViewProblem] = useState(
    session.match?.currentProblem || 0,
  );
  const [category, setCategory] = useState("全部");
  const [rarity, setRarity] = useState<number | null>(null);
  const [notice, setNotice] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const previousFeedback = useRef(session.match?.feedback?.id);
  const judgingClock = useRef(0);
  const { profile, match, result, openedPack } = session;
  const playing = match?.status === "playing";
  const judging = !!match?.problems.some(problem => problem.judging);
  const ticking = playing || judging;
  useEffect(() => {
    localStorage.setItem(SAVE_KEY, JSON.stringify(session));
  }, [session]);
  useEffect(() => {
    if (!match || match.paused || !ticking) return;
    let last = performance.now();
    const tickDuration = 1000 / speed;
    judgingClock.current = last;
    const timer = window.setInterval(() => {
      const now = performance.now();
      const elapsed = Math.floor((now - last) / tickDuration);
      const judgingElapsed = now - judgingClock.current;
      judgingClock.current = now;
      last += elapsed * tickDuration;
      setSession((s) => {
        if (!s.match) return s;
        const next = advanceMatch(advanceJudging(s.match, judgingElapsed), elapsed);
        return next === s.match ? s : { ...s, match: next, profile: processMatchAchievements(s.profile, next) };
      });
    }, 100);
    return () => clearInterval(timer);
  }, [match?.id, match?.paused, ticking, speed]);
  useEffect(() => {
    if (match?.status !== "finished" || judging || result?.matchId === match.id) return;
    setSession((s) => {
      const settled = settleMatch(s.profile, s.match!);
      return { ...s, ...settled };
    });
  }, [match?.status, match?.id, result?.matchId, judging]);
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
    const now = performance.now();
    const elapsed = now - judgingClock.current;
    judgingClock.current = now;
    setSession((s) => {
      const next = act(advanceJudging(s.match!, elapsed), action);
      return { ...s, match: next, profile: processMatchAchievements(s.profile, next) };
    });
    if (action.type === "play" || action.type === "discard-hand")
      setSelected([]);
  }
  function navigate(next: Screen) {
    if (screen === "match" && match?.status === "playing") {
      const elapsed = performance.now() - judgingClock.current;
      setSession((s) => {
        const next = setPaused(advanceJudging(s.match!, elapsed), true);
        return { ...s, match: next, profile: processMatchAchievements(s.profile, next) };
      });
    }
    setScreen(next);
    setSelected([]);
  }
  function begin(eventId: string) {
    previousFeedback.current = undefined;
    const next = startMatch(profile, eventId);
    setSession((s) => ({ ...s, match: next, result: null }));
    setViewProblem(0);
    setSelected([]);
    setSpeed(1);
    setScreen("match");
  }
  function chooseProblem(index: number) {
    setViewProblem(index);
    command({ type: "switch", problem: index });
    setSelected([]);
  }
  function togglePause() {
    const elapsed = performance.now() - judgingClock.current;
    const next = setPaused(advanceJudging(match!, elapsed), !match!.paused);
    setSession(s => ({ ...s, match: next, profile: processMatchAchievements(s.profile, next) }));
    setViewProblem(next.currentProblem);
  }
  function buyPack(index: number) {
    const { eventId, category, achievementId, levelId } = profile.packs[index];
    const opened = openPack(profile, index);
    setSession((s) => ({
      ...s,
      profile: opened.profile,
      openedPack: { cards: opened.cards, revealed: [], eventId, category, achievementId, levelId },
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
      if (!s.openedPack) return s;
      const fresh = [...new Set(indices)].filter(i => i >= 0 && i < s.openedPack!.cards.length && !s.openedPack!.revealed.includes(i));
      if (!fresh.length) return s;
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
    <AchievementDetailsProvider>
    <div className={`app ${screen === "match" ? "in-match" : ""}`}>
      <header className="app-header">
        <div className="header-brand">
          <button
            className="brand"
            onClick={() => navigate("lobby")}
            aria-label="返回大厅"
          >
            <span className="brand-icon">X</span>
            <strong>
              XCP<span>Card</span>
            </strong>
            <span className="brand-sub">ALGORITHM CARD CLUB</span>
          </button>
          <div className="header-season"><span className="tiny-label">SEASON</span><b>{profile.season}</b></div>
        </div>
        {screen !== "match" ? (
          <nav>
            {(
              [
                ["lobby", "大厅"],
                ["deck", "收藏"],
                ["packs", "卡包"],
                ["training", "加训"],
                ["honors", "成就"],
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
          </div>
        )}
        <div className="header-meta">
          <TrainingBalance amount={profile.trainingPoints} />
          {screen === "match" && (
            <button className="text-button" onClick={() => navigate("lobby")}>
              保存并离场 ↗
            </button>
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
              onDialogChange={setDialogOpen}
              onRecycle={(id) => setSession(s => ({ ...s, profile: recycleCard(s.profile, id) }))}
            />
          )}

          {screen === "packs" && (
            <Packs
              profile={profile}
              onOpen={buyPack}
              onContest={() => navigate("lobby")}
            />
          )}
          {screen === "training" && <Training profile={profile} onPurchase={(id) => setSession(s => ({ ...s, profile: purchaseOffer(s.profile, id) }))} />}
          {screen === "honors" && <TrophyRoom profile={profile} />}
        </div>
      )}

      {screen === "match" && match && (
        <MatchView
          match={match}
          speed={speed}
          onDialogChange={setDialogOpen}
          viewProblem={viewProblem}
          selected={selected}
          onCommand={command}
          onChooseProblem={chooseProblem}
          onToggleSelected={uid => setSelected(ids => ids.includes(uid) ? ids.filter(id => id !== uid) : [...ids, uid])}
          onTogglePause={togglePause}
          onChangeSpeed={setSpeed}
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
            {(result.medal || result.title) && <div className="result-awards"><AwardBadges medal={result.medal} title={result.title} /></div>}
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
                带回 <b>{result.packs} 包</b> 比赛奖励 · <b><TrainingPoints amount={`+${result.trainingPoints ?? 0}`} /></b>
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
      {!openedPack && !(result && screen === "match") && !dialogOpen && (
        <AchievementUnlocks profile={profile} onAcknowledge={ids => setSession(s => ({ ...s, profile: acknowledgeAchievementNotifications(s.profile, ids) }))} />
      )}
      {notice && (
        <div className="notice" role="status">
          {notice}
        </div>
      )}
    </div>
    </AchievementDetailsProvider>
  );
}
