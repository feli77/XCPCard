import { createContext, useContext, useId, useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties, Dispatch, PointerEvent, PropsWithChildren, SetStateAction } from 'react';
import { createPortal } from 'react-dom';
import { events } from '../content/data';
import type { AchievementView } from '../game/achievements';
import { PixelArt } from './PixelArt';

type VisibleAchievement = Extract<AchievementView, { hidden: false }>;
type Level = VisibleAchievement['levels'][number];

const illustrations: Record<string, string> = {
  sorting: 'sort', geometry: 'geometry', gold: 'trophy', retry: 'bag',
  'last-minute': 'coffee', sample: 'search', warmup: 'coffee', proof: 'template',
  verdicts: 'dice', attendance: 'template', penalty: 'trophy',
};

const DetailsContext = createContext<{ active: string | null; setActive: Dispatch<SetStateAction<string | null>> } | null>(null);

export function AchievementDetailsProvider({ children }: PropsWithChildren) {
  const [active, setActive] = useState<string | null>(null);
  return <DetailsContext.Provider value={{ active, setActive }}>{children}</DetailsContext.Provider>;
}

export function AchievementCard({ achievement, level, stacked = false, style }: {
  achievement: AchievementView;
  level?: Level;
  stacked?: boolean;
  style?: CSSProperties;
}) {
  const root = useRef<HTMLButtonElement>(null);
  const details = useRef<HTMLDivElement>(null);
  const bounds = useRef<DOMRect | null>(null);
  const [position, setPosition] = useState<CSSProperties>({});
  const tooltipId = useId();
  const { active, setActive } = useContext(DetailsContext)!;
  const open = active === tooltipId;
  const setOpen = (show: boolean) => setActive(current => show ? tooltipId : current === tooltipId ? null : current);
  const hidden = achievement.hidden;
  const unlocked = !!level?.unlocked;
  const title = hidden ? '隐藏成就' : achievement.title;
  const name = stacked ? `${title} · ${level!.title}` : title;

  useLayoutEffect(() => {
    if (!open) return;
    function placeDetails() {
      if (!root.current || !details.current) return;
      const card = root.current.getBoundingClientRect();
      const tip = details.current.getBoundingClientRect();
      const top = card.top >= tip.height + 24 ? card.top - tip.height - 12 : card.bottom + 12;
      setPosition({
        left: Math.max(12, Math.min(window.innerWidth - tip.width - 12, card.left + (card.width - tip.width) / 2)),
        top: Math.max(12, Math.min(window.innerHeight - tip.height - 12, top)),
      });
    }
    placeDetails();
    window.addEventListener('scroll', placeDetails, true);
    window.addEventListener('resize', placeDetails);
    return () => {
      window.removeEventListener('scroll', placeDetails, true);
      window.removeEventListener('resize', placeDetails);
    };
  }, [open]);

  function tilt(event: PointerEvent<HTMLButtonElement>) {
    if (event.pointerType !== 'mouse' || event.buttons || !bounds.current) return;
    const { left, top, width, height } = bounds.current;
    const x = Math.max(-1, Math.min(1, (event.clientX - left) / width * 2 - 1));
    const y = Math.max(-1, Math.min(1, (event.clientY - top) / height * 2 - 1));
    event.currentTarget.style.setProperty('--tilt-x', `${-y * 7}deg`);
    event.currentTarget.style.setProperty('--tilt-y', `${x * 7}deg`);
    event.currentTarget.style.setProperty('--shine-x', `${(x + 1) * 50}%`);
    event.currentTarget.style.setProperty('--shine-y', `${(y + 1) * 50}%`);
  }
  function reset() {
    bounds.current = null;
    for (const key of ['--tilt-x', '--tilt-y', '--shine-x', '--shine-y']) root.current?.style.removeProperty(key);
  }

  return <>
    <button ref={root} type="button" style={style}
      className={`achievement-card ${hidden ? 'is-hidden' : unlocked ? 'is-unlocked' : 'is-locked'}`}
      data-level={level?.id}
      aria-label={`${name}${hidden ? '' : unlocked ? '，已解锁' : '，未解锁'}`}
      aria-describedby={open ? tooltipId : undefined}
      onPointerEnter={event => {
        if (event.pointerType !== 'mouse') return;
        bounds.current = event.currentTarget.getBoundingClientRect();
        tilt(event);
      }}
      onPointerMove={event => { tilt(event); if (event.pointerType === 'mouse') setOpen(true); }}
      onPointerLeave={event => { reset(); if (!event.currentTarget.matches(':focus-visible')) setOpen(false); }}
      onPointerCancel={() => { reset(); setOpen(false); }}
      onFocus={() => setOpen(true)}
      onBlur={() => { reset(); setOpen(false); }}
      onClick={() => setOpen(true)}
      onKeyDown={event => { if (event.key === 'Escape') setOpen(false); }}
    >
      {hidden ? <>
        <span className="achievement-question-pattern" aria-hidden="true">{'? '.repeat(180)}</span>
        <span className="achievement-mystery-seal" aria-hidden="true">?</span>
      </> : <>
        <span className="achievement-card-top"><span>{achievement.category}成就{stacked && <b> / {level!.title}</b>}</span><span>{unlocked ? '已解锁 ◆' : '未解锁 ◇'}</span></span>
        <span className="achievement-card-body">
          <span className="achievement-art" aria-hidden="true"><PixelArt kind={illustrations[achievement.id] ?? 'trophy'} /><span className="achievement-art-star">✦</span></span>
          <span className="achievement-card-copy">
            <span className="achievement-card-title">{achievement.title}</span>
            {unlocked ? <span className="achievement-completed"><span>✓</span> 成就达成</span> : <span className="achievement-progress">
              <span className="achievement-progress-heading"><span>解锁进度</span><b>{Math.min(level!.progress, level!.target)} / {level!.target}</b></span>
              <progress aria-label={`${name}进度`} value={Math.min(level!.progress, level!.target)} max={level!.target} />
            </span>}
          </span>
        </span>
      </>}
    </button>
    {open && createPortal(<div ref={details} id={tooltipId} className={`achievement-tooltip ${hidden ? 'is-hidden' : unlocked ? 'is-unlocked' : ''}`} style={position} role="tooltip">
      <strong>{name}</strong>
      {!hidden && <>
        <dl>
          <dt>解锁方式</dt><dd>{level!.conditionText}</dd>
          <dt>解锁时间</dt><dd>{unlocked ? level!.unlockedAt ? `${level!.unlockedAt.season} 赛季 · ${events.find(event => event.id === level!.unlockedAt!.eventId)!.name}` : '未记录' : '尚未解锁'}</dd>
        </dl>
        <div className="achievement-tooltip-reward">奖励：{level!.rewardText}{unlocked && ' · 已到账'}</div>
      </>}
    </div>, document.body)}
  </>;
}

export function AchievementStack({ achievement }: { achievement: AchievementView }) {
  if (achievement.hidden) return <article className="achievement-stack" data-achievement={achievement.id}><AchievementCard achievement={achievement} /></article>;
  const featured = achievement.levels.filter(level => level.unlocked).at(-1) ?? achievement.levels[0];
  const levels = [...achievement.levels.filter(level => level !== featured), featured];
  return <article className={`achievement-stack ${levels.length > 1 ? 'is-series' : ''}`} data-achievement={achievement.id}
    style={{ '--stack-count': levels.length } as CSSProperties} aria-label={levels.length > 1 ? `${achievement.title}，系列成就` : undefined}>
    {levels.map((level, index) => <AchievementCard key={level.id} achievement={achievement} level={level} stacked={levels.length > 1}
      style={{ '--stack-index': index } as CSSProperties} />)}
  </article>;
}
