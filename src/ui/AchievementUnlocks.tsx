import { achievementDefinitions } from '../content/achievements';
import { achievementKey, formatAchievementReward } from '../game/achievements';
import type { Profile } from '../game/types';

export function AchievementUnlocks({ profile, onAcknowledge }: { profile: Profile; onAcknowledge: (ids: string[]) => void }) {
  const notifications = achievementDefinitions.flatMap(achievement => achievement.levels
    .filter(level => profile.achievements.notifications.includes(achievementKey(achievement.id, level.id)))
    .map(level => ({ achievement, level, id: achievementKey(achievement.id, level.id) })));
  if (!notifications.length) return null;
  return <aside className="achievement-unlocks" role="region" aria-label="成就解锁" aria-live="polite">
    <div className="achievement-unlocks-heading"><span className="eyebrow">ACHIEVEMENT UNLOCKED</span><h2>成就解锁 · {notifications.length} 项</h2></div>
    <div className="achievement-unlocks-list">{notifications.map(({ achievement, level, id }) => <section className="achievement-unlock" key={id}>
      <h3>{achievement.title}</h3>
      <p>{achievement.description}</p>
      <small>{level.title}</small>
      <span className="achievement-reward">奖励：{formatAchievementReward(level.reward)} · 已到账</span>
    </section>)}</div>
    <button className="primary" onClick={() => onAcknowledge(notifications.map(item => item.id))}>收下这份荣誉 →</button>
  </aside>;
}
