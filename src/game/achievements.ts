import { achievementDefinitions } from '../content/achievements';
import { cards, events, rarities } from '../content/data';
import type { AchievementCondition, AchievementLevel, AchievementReward } from '../content/types';
import type { AchievementState, AchievementUnlock, Match, MatchResult, Profile } from './types';
import { addToCollection } from './collection';

export const achievementKey = (achievementId: string, levelId: string) => `${achievementId}:${levelId}`;
export function createAchievementState(): AchievementState {
  return { collected: [], unlocked: [], unlockedAt: {}, rewarded: [], notifications: [], progress: {}, match: null };
}
export function restoreAchievements(profile: Profile, match: Match | null = null): Profile {
  if (profile.achievements) return profile.achievements.unlockedAt ? profile : { ...profile, achievements: { ...profile.achievements, unlockedAt: {} } };
  return evaluateAchievements({ ...profile, achievements: { ...createAchievementState(),
    collected: Object.keys(profile.collection).filter(id => profile.collection[id] > 0),
    match: match ? { id: match.id, attempts: Object.fromEntries(match.problems.map(problem => [problem.id, problem.attempts.length])) } : null } }, true,
    match ? { season: profile.season, eventId: match.eventId } : undefined);
}
function conditionProgress(profile: Profile, condition: AchievementCondition): { progress: number; target: number } {
  const state = profile.achievements;
  switch (condition.kind) {
    case 'cards': return { progress: condition.cardIds.filter(id => state.collected.includes(id)).length, target: condition.cardIds.length };
    case 'category': return { progress: cards.filter(card => card.categories.includes(condition.category) && state.collected.includes(card.id)).length, target: condition.count };
    case 'gold': return { progress: state.progress[`gold:${condition.eventId}`] ?? 0, target: 1 };
    case 'match': return { progress: state.progress[condition.metric] ?? 0, target: condition.target };
  }
}
export function formatAchievementReward(reward: AchievementReward): string {
  switch (reward.kind) {
    case 'points': return `${reward.amount} 训练点`;
    case 'card': return `${cards.find(card => card.id === reward.cardId)!.name} ×${reward.count}`;
    case 'pack': return `${reward.guarantee ? `${rarities[reward.guarantee].name}保底包` : '普通包'} ×1`;
  }
}
export function grantAchievementReward(profile: Profile, reward: AchievementReward, achievementId: string, levelId: string): Profile {
  switch (reward.kind) {
    case 'points': return { ...profile, trainingPoints: profile.trainingPoints + reward.amount };
    case 'card': return addToCollection(profile, reward.cardId, reward.count);
    case 'pack': return { ...profile, packs: [...profile.packs, { id: `achievement:${achievementKey(achievementId, levelId)}`, eventId: 'achievement', achievementId, levelId, guarantee: reward.guarantee }] };
  }
}
export function evaluateAchievements(profile: Profile, includeCollection = true, unlockedAt: AchievementUnlock = {
  season: profile.season + (profile.seasonEnded ? 1 : 0),
  eventId: events.filter(event => event.kind === 'main')[profile.seasonEnded ? 0 : profile.mainIndex].id,
}): Profile {
  let next = profile;
  let changed: boolean;
  do {
    changed = false;
    for (const definition of achievementDefinitions) {
      for (const level of definition.levels) {
        const key = achievementKey(definition.id, level.id);
        if (next.achievements.rewarded.includes(key)) continue;
        if (!includeCollection && (level.condition.kind === 'cards' || level.condition.kind === 'category')) continue;
        const { progress, target } = conditionProgress(next, level.condition);
        if (progress < target) continue;
        const state = next.achievements;
        next = grantAchievementReward({ ...next, achievements: { ...state,
          unlockedAt: { ...state.unlockedAt, [key]: state.unlockedAt?.[key] ?? unlockedAt },
          unlocked: [...new Set([...state.unlocked, key])], rewarded: [...state.rewarded, key], notifications: [...new Set([...state.notifications, key])] } }, level.reward, definition.id, level.id);
        if (level.reward.kind === 'card') includeCollection = true;
        changed = true;
      }
    }
  } while (changed);
  return next;
}
export type AchievementView = { id: string; hidden: true } | {
  id: string; hidden: false; title: string;
  levels: (AchievementLevel & { unlocked: boolean; unlockedAt: AchievementUnlock | undefined; progress: number; target: number; rewardText: string })[];
};
export function getAchievementView(profile: Profile): AchievementView[] {
  const order = (achievement: AchievementView) => achievement.hidden ? 2 : achievement.levels.every(level => level.unlocked) ? 0 : 1;
  return achievementDefinitions.map<AchievementView>(definition => {
    if (definition.hidden && !definition.levels.some(level => profile.achievements.unlocked.includes(achievementKey(definition.id, level.id)))) return { id: definition.id, hidden: true };
    return { ...definition, hidden: false, levels: definition.levels.map(level => ({ ...level,
      unlockedAt: profile.achievements.unlockedAt?.[achievementKey(definition.id, level.id)],
      ...conditionProgress(profile, level.condition), unlocked: profile.achievements.unlocked.includes(achievementKey(definition.id, level.id)), rewardText: formatAchievementReward(level.reward) })) };
  }).sort((a, b) => order(a) - order(b));
}
export function acknowledgeAchievementNotifications(profile: Profile, ids: string[]): Profile {
  return { ...profile, achievements: { ...profile.achievements, notifications: profile.achievements.notifications.filter(id => !ids.includes(id)) } };
}
export function processMatchAchievements(profile: Profile, match: Match, result?: MatchResult): Profile {
  const state = profile.achievements;
  const previous = state.match?.id === match.id ? state.match.attempts : {};
  if (!result && match.problems.every(problem => (previous[problem.id] ?? 0) === problem.attempts.length)) return profile;
  const progress = { ...state.progress };
  const record = (key: string, value = 1) => { progress[key] = Math.max(progress[key] ?? 0, value); };
  for (const problem of match.problems) {
    for (let i = previous[problem.id] ?? 0; i < problem.attempts.length; i++) {
      const attempt = problem.attempts[i];
      if (attempt.result !== 'AC') continue;
      const failures = problem.attempts.slice(0, i).filter(item => item.result !== 'AC');
      record('retries', failures.length);
      if (i === 0) record('first-try');
      if (attempt.time >= 295 && attempt.time < 300) record('late-ac');
      if (attempt.score < problem.difficulty) record('under-score');
      if (['WA', 'TLE', 'MLE', 'RE'].every(verdict => failures.some(item => item.verdict === verdict))) record('all-verdicts');
    }
  }
  if (result && !match.problems.some(problem => problem.judging) && !profile.history.some(item => item.matchId === match.id)) {
    const solved = match.problems.filter(problem => problem.acTime !== null);
    if (solved.length && Math.min(...solved.map(problem => problem.acTime!)) >= 240) record('late-start');
    if (!solved.length && match.problems.some(problem => problem.attempts.length)) record('zero-ac');
    if (solved.length >= 3 && solved.every(problem => problem.attempts.length === 1 && problem.attempts[0].result === 'AC')) record('clean-sweep');
    if (result.medal === 'gold') {
      const gold = achievementDefinitions.find(item => item.id === 'gold')!;
      if (gold.levels.some(level => level.id === result.eventId)) record(`gold:${result.eventId}`);
    }
  }
  return evaluateAchievements({ ...profile, achievements: { ...state, progress,
    match: { id: match.id, attempts: Object.fromEntries(match.problems.map(problem => [problem.id, problem.attempts.length])) } } }, false,
    { season: result?.season ?? profile.season, eventId: match.eventId });
}
