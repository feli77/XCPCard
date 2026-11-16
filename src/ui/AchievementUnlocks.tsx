import { achievementKey, getAchievementView } from '../game/achievements';
import type { Profile } from '../game/types';
import { AchievementCard } from './AchievementCard';

export function AchievementUnlocks({ profile, onAcknowledge }: { profile: Profile; onAcknowledge: (ids: string[]) => void }) {
  const notifications = getAchievementView(profile).flatMap(achievement => achievement.hidden ? [] : achievement.levels
    .filter(level => profile.achievements.notifications.includes(achievementKey(achievement.id, level.id)))
    .map(level => ({ achievement, level, id: achievementKey(achievement.id, level.id) })));
  if (!notifications.length) return null;
  return <aside className="achievement-unlocks" role="region" aria-label="成就解锁" aria-live="polite">
    <div className="achievement-unlocks-heading"><span className="eyebrow">ACHIEVEMENT UNLOCKED</span><h2>成就解锁 · {notifications.length} 项</h2></div>
    <div className="achievement-unlocks-list">{notifications.map(({ achievement, level, id }) => <section className="achievement-unlock" key={id}>
      <div className="achievement-stack"><AchievementCard achievement={achievement} level={level} stacked={achievement.levels.length > 1} /></div>
      <span className="achievement-reward">奖励：{level.rewardText} · 已到账</span>
    </section>)}</div>
    <button className="primary" onClick={() => onAcknowledge(notifications.map(item => item.id))}>收下这份荣誉 →</button>
  </aside>;
}
