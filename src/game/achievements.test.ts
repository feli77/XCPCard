import { describe, expect, it } from 'vitest';
import { achievementDefinitions } from '../content/achievements';
import { cards, events } from '../content/data';
import { acknowledgeAchievementNotifications, evaluateAchievements, getAchievementView, processMatchAchievements, restoreAchievements } from './achievements';
import { advanceJudging, collectCard, createProfile, nextSeason, settleMatch, startMatch } from './engine';
import { recycleCard } from './economy';
import type { Attempt, Match, Profile, Verdict } from './types';

const sorting = ['quick-sort', 'insertion-sort', 'bubble-sort', 'selection-sort', 'counting-sort', 'merge-sort'];
const ac = (time = 100, score = 5000): Attempt => ({ time, score, result: 'AC', verdict: 'AC' });
const failed = (verdict: Verdict = 'WA', time = 20): Attempt => ({ time, score: 0, result: 'WA', verdict });
function gameWith(attempts: Attempt[], profile = createProfile()) {
  const match = startMatch(profile, 'school', 42);
  match.problems[0].attempts = attempts;
  match.problems[0].acTime = attempts.find(attempt => attempt.result === 'AC')?.time ?? null;
  return match;
}
function process(attempts: Attempt[]) {
  return processMatchAchievements(createProfile(), gameWith(attempts));
}
function finish(match: Match, profile = createProfile()) {
  match.status = 'finished';
  match.time = 300;
  return settleMatch(profile, match).profile;
}
function gold(profile: Profile, eventId: string) {
  const match = startMatch(profile, eventId, 42);
  match.problems[0].attempts = [ac()];
  match.problems[0].acTime = 100;
  match.opponents.forEach(opponent => opponent.results.forEach(problem => { problem.acTime = null; }));
  return finish(match, profile);
}

describe('成就条件和奖励', () => {
  it('排序使用六个明确 ID，重复卡、拓扑排序和相似 art 不计数，奖励卡不加入卡组', () => {
    let profile = createProfile();
    for (const id of [...sorting.slice(0, -1), 'quick-sort', 'topological-sort', 'greedy']) profile = collectCard(profile, id);
    expect(profile.achievements.unlocked).not.toContain('sorting:1');
    const view = getAchievementView(profile).find(item => item.id === 'sorting')!;
    if (!view.hidden) expect(view.levels[0]).toMatchObject({ progress: 5, target: 6, unlocked: false });
    profile = collectCard(profile, 'merge-sort');
    expect(profile.achievements.unlocked).toContain('sorting:1');
    expect(profile.collection['binary-heap']).toBe(1);
    expect(profile.achievements.collected).toContain('binary-heap');
    expect(profile.deck).toEqual([]);
  });
  it('计算几何按不同 ID 累计，分解不回退，达标只发一包', () => {
    const ids = cards.filter(card => card.categories.includes('计算几何')).slice(0, 5).map(card => card.id);
    let profile = ids.slice(0, 4).reduce(collectCard, createProfile());
    profile = collectCard(profile, ids[0]);
    expect(profile.achievements.unlocked).not.toContain('geometry:1');
    profile = recycleCard(profile, ids[1]);
    profile = collectCard(profile, ids[4]);
    expect(profile.achievements.unlocked).toContain('geometry:1');
    expect(profile.packs.filter(pack => pack.eventId === 'achievement')).toEqual([
      { id: 'achievement:geometry:1', eventId: 'achievement', achievementId: 'geometry', levelId: '1', guarantee: 0 },
    ]);
    expect(evaluateAchievements(profile)).toBe(profile);
  });
  it.each([0, 1, 2, 3, 4, 5])('%i 次失败后 AC 按门槛解锁，包含 TLE、MLE、RE', count => {
    const profile = process([...Array.from({ length: count }, (_, i) => failed((['WA', 'TLE', 'MLE', 'RE'] as Verdict[])[i % 4])), ac()]);
    expect(profile.achievements.unlocked.filter(id => id.startsWith('retry:'))).toEqual([1, 3, 5].filter(target => count >= target).map(target => `retry:${target}`));
    expect(profile.trainingPoints).toBe(count === 0 ? 50 : (count >= 1 ? 50 : 0) + (count >= 3 ? 100 : 0));
    if (count >= 5) expect(profile.packs.some(pack => pack.achievementId === 'retry')).toBe(true);
  });
  it('失败未 AC 不解锁重试成就；首交 AC 仅限没有失败的题目', () => {
    expect(process([failed(), failed(), failed()]).achievements.unlocked).toEqual([]);
    expect(process([failed(), ac()]).achievements.unlocked).not.toContain('sample:1');
    expect(process([ac()]).achievements.unlocked).toContain('sample:1');
  });
  it.each([294, 295, 299, 300])('压线 AC 按提交时间 %i 判定', time => {
    expect(process([ac(time)]).achievements.unlocked.includes('last-minute:1')).toBe(time >= 295 && time < 300);
  });
  it.each([239, 240, 299])('四小时热身首 AC 时间边界 %i', time => {
    const match = gameWith([ac(time)]);
    expect(processMatchAchievements(createProfile(), match).achievements.unlocked).not.toContain('warmup:1');
    expect(finish(match).achievements.unlocked.includes('warmup:1')).toBe(time >= 240);
  });
  it('较早的 AC 会阻止热身成就，未通过提交不影响首 AC 时间', () => {
    const match = gameWith([ac(239)]);
    match.problems[1].attempts = [ac(250)];
    match.problems[1].acTime = 250;
    expect(finish(match).achievements.unlocked).not.toContain('warmup:1');
    expect(finish(gameWith([failed(), ac(240)])).achievements.unlocked).toContain('warmup:1');
    expect(finish(gameWith([])).achievements.unlocked).not.toContain('warmup:1');
  });
  it.each(['AC', 'WA'] as const)('四小时热身等待跨题较早提交公布 %s 后结算，不因公布顺序误发奖', result => {
    let profile = createProfile();
    let match = gameWith([], profile);
    match.problems[0].judging = { duration: 2000, remaining: 2000, attempt: result === 'AC' ? ac(239) : failed('WA', 239), text: result };
    match.problems[1].judging = { duration: 1000, remaining: 1000, attempt: ac(240), text: 'AC' };
    match = advanceJudging(match, 1000);
    profile = processMatchAchievements(profile, match);
    expect(match.problems[1].acTime).toBe(240);
    expect(match.problems[0].judging).toBeDefined();
    expect(profile.achievements.unlocked).not.toContain('warmup:1');
    expect(profile.collection.coffee).toBeUndefined();
    expect(profile.achievements.notifications).not.toContain('warmup:1');
    match = advanceJudging(match, 1000);
    profile = processMatchAchievements(profile, match);
    expect(profile.achievements.unlocked).not.toContain('warmup:1');
    profile = finish(match, profile);
    expect(profile.achievements.unlocked.includes('warmup:1')).toBe(result === 'WA');
    expect(profile.collection.coffee ?? 0).toBe(result === 'WA' ? 1 : 0);
    expect(profile.achievements.notifications.filter(id => id === 'warmup:1')).toHaveLength(result === 'WA' ? 1 : 0);
    expect(settleMatch(profile, match).profile).toBe(profile);
  });
  it('证明略只接受严格低于难度的已公布 AC', () => {
    const profile = createProfile();
    const match = gameWith([ac()], profile);
    match.problems[0].attempts[0].score = match.problems[0].difficulty;
    expect(processMatchAchievements(profile, match).achievements.unlocked).not.toContain('proof:1');
    match.problems[0].attempts[0].score--;
    expect(processMatchAchievements(profile, match).collection.template).toBe(1);
    match.problems[0].attempts = [failed()];
    match.problems[0].acTime = null;
    expect(processMatchAchievements(profile, match).achievements.unlocked).not.toContain('proof:1');
  });
  it('四种失败必须来自同题的明确 verdict，旧版无 verdict 不充当 WA', () => {
    expect(process(['WA', 'TLE', 'MLE', 'RE'].map(value => failed(value as Verdict)).concat(ac())).achievements.unlocked).toContain('verdicts:1');
    expect(process([failed('WA'), failed('TLE'), failed('MLE'), ac()]).achievements.unlocked).not.toContain('verdicts:1');
    expect(process([{ time: 1, score: 0, result: 'WA' }, failed('TLE'), failed('MLE'), failed('RE'), ac()]).achievements.unlocked).not.toContain('verdicts:1');
    const match = gameWith([failed('WA'), failed('TLE'), ac()]);
    match.problems[1].attempts = [failed('MLE'), failed('RE'), ac()];
    match.problems[1].acTime = 100;
    expect(processMatchAchievements(createProfile(), match).achievements.unlocked).not.toContain('verdicts:1');
  });
  it('来都来了仅在至少一次提交且零 AC 完赛后奖励训练点', () => {
    const match = gameWith([failed()]);
    expect(processMatchAchievements(createProfile(), match).achievements.unlocked).not.toContain('attendance:1');
    const profile = finish(match);
    expect(profile.achievements.unlocked).toContain('attendance:1');
    expect(profile.trainingPoints).toBe(150);
    expect(finish(gameWith([])).achievements.unlocked).not.toContain('attendance:1');
    expect(finish(gameWith([ac()])).achievements.unlocked).not.toContain('attendance:1');
  });
  it.each([2, 3])('罚时管理大师至少 3 AC，%i AC 边界', count => {
    const match = gameWith([]);
    for (const problem of match.problems.slice(0, count)) { problem.attempts = [ac()]; problem.acTime = 100; }
    expect(finish(match).achievements.unlocked.includes('penalty:1')).toBe(count >= 3);
    match.problems[0].attempts.unshift(failed());
    expect(finish(match).achievements.unlocked).not.toContain('penalty:1');
  });
  it.each(['regional', 'ecf', 'wf'])('%s 金牌独立记录进度和发奖', eventId => {
    const profile = gold(createProfile(), eventId);
    expect(profile.achievements.unlocked.filter(id => id.startsWith('gold:'))).toEqual([`gold:${eventId}`]);
    expect(profile.achievements.progress[`gold:${eventId}`]).toBe(1);
    expect(profile.packs.filter(pack => pack.achievementId === 'gold')).toEqual([
      { id: `achievement:gold:${eventId}`, eventId: 'achievement', achievementId: 'gold', levelId: eventId, guarantee: ['regional', 'ecf', 'wf'].indexOf(eventId) + 2 },
    ]);
  });
  it('金牌不限制获得顺序，各赛事重复获金只发一次奖', () => {
    let profile = gold(createProfile(), 'wf');
    profile = gold(profile, 'ecf');
    profile = gold(profile, 'regional');
    for (const eventId of ['regional', 'ecf', 'wf']) profile = gold(profile, eventId);
    for (const ids of [profile.achievements.unlocked, profile.achievements.rewarded, profile.achievements.notifications]) {
      expect(ids.filter(id => id.startsWith('gold:'))).toEqual(['gold:wf', 'gold:ecf', 'gold:regional']);
    }
    expect(profile.packs.filter(pack => pack.achievementId === 'gold').map(pack => pack.guarantee)).toEqual([4, 3, 2]);
  });
  it('区域赛银牌不解锁金牌成就，随后 EC-Final 和 WF 金牌独立解锁', () => {
    const match = startMatch(createProfile(), 'regional', 42);
    match.problems[0].attempts = [ac()]; match.problems[0].acTime = 100;
    match.opponents.forEach((opponent, index) => { if (index < Math.ceil(match.opponents.length * .15)) { opponent.results[0].acTime = 50; opponent.results[0].attempts = 1; } });
    let profile = finish(match);
    expect(profile.history[0].medal).toBe('silver');
    expect(profile.achievements.unlocked).not.toContain('gold:regional');
    profile = gold(profile, 'ecf');
    profile = gold(profile, 'wf');
    expect(profile.achievements.unlocked.filter(id => id.startsWith('gold:'))).toEqual(['gold:ecf', 'gold:wf']);
  });
});

describe('成就持久化和重复调用', () => {
  it('已全部解锁的成就排在最前，部分解锁的系列仍在进行中，隐藏成就排在最后', () => {
    const profile = createProfile();
    profile.achievements.unlocked = ['geometry:1', 'sample:1', 'gold:regional', 'gold:ecf', 'gold:wf', 'retry:1'];
    expect(getAchievementView(profile).map(achievement => achievement.id)).toEqual([
      'geometry', 'gold', 'sample', 'sorting', 'retry', 'penalty',
      'last-minute', 'warmup', 'proof', 'verdicts', 'attendance',
    ]);
  });
  it('隐藏条目未解锁时只投影 ID 和隐藏状态，解锁后提供完整条件奖励', () => {
    const profile = createProfile();
    const hidden = getAchievementView(profile).find(item => item.id === 'proof');
    expect(hidden).toEqual({ id: 'proof', hidden: true });
    const unlocked = process([ac(100, 0)]);
    const view = getAchievementView(unlocked).find(item => item.id === 'proof');
    expect(view).toMatchObject({ hidden: false, title: '证明略', levels: [{ unlocked: true, rewardText: '祖传模板 ×1' }] });
  });
  it('奖励卡继续触发先前遍历过的收集成就，循环只发奖一次', () => {
    const geometry = achievementDefinitions.find(item => item.id === 'geometry')!.levels[0];
    const oldCondition = geometry.condition;
    geometry.condition = { kind: 'cards', cardIds: ['template'] };
    try {
      const profile = process([ac(100, 0)]);
      expect(profile.achievements.unlocked).toEqual(expect.arrayContaining(['proof:1', 'geometry:1']));
      expect(profile.collection.template).toBe(1);
      expect(profile.packs.filter(pack => pack.achievementId === 'geometry')).toHaveLength(1);
      expect(evaluateAchievements(profile)).toBe(profile);
    } finally { geometry.condition = oldCondition; }
  });
  it('预生成的 judging 不计入，公布一次同时检查所有题，不读取最后 feedback', () => {
    const profile = createProfile();
    const match = gameWith([], profile);
    match.problems[0].judging = { duration: 1000, remaining: 1000, attempt: ac(299, 0), text: 'AC' };
    match.problems[1].attempts = [failed(), failed(), failed()];
    match.problems[1].judging = { duration: 1000, remaining: 1000, attempt: ac(200), text: 'AC' };
    const before = processMatchAchievements(profile, match);
    expect(before.achievements.unlocked).toEqual([]);
    const published = advanceJudging(match, 1000);
    expect(published.feedback?.problem).toBe(1);
    const after = processMatchAchievements(before, published);
    expect(after.achievements.unlocked).toEqual(expect.arrayContaining(['last-minute:1', 'proof:1', 'retry:1', 'retry:3', 'sample:1']));
    expect(processMatchAchievements(after, published)).toEqual(after);
  });
  it('旧档载入立即判定当前收藏并发奖，已公布提交只建立基线', () => {
    const profile = createProfile();
    profile.collection = Object.fromEntries(sorting.map(id => [id, 1]));
    const match = gameWith([ac(299, 0)], profile);
    const { achievements: _, ...legacy } = profile;
    const restored = restoreAchievements(legacy as Profile, match);
    expect(restored.achievements.collected).toEqual([...sorting, 'binary-heap']);
    expect(restored.achievements.unlocked).toEqual(['sorting:1']);
    expect(restored.achievements.rewarded).toEqual(['sorting:1']);
    expect(restored.achievements.notifications).toEqual(['sorting:1']);
    expect(restored.collection).toEqual({ ...profile.collection, 'binary-heap': 1 });
    expect(profile.collection['binary-heap']).toBeUndefined();
    const reloaded = restoreAchievements(JSON.parse(JSON.stringify(restored)), match);
    expect(evaluateAchievements(reloaded)).toEqual(restored);
    const processed = processMatchAchievements(reloaded, match);
    expect(processed).toEqual(restored);
    expect(processed.achievements.unlocked).not.toContain('last-minute:1');
    match.problems[1].attempts = [ac(299, 0)]; match.problems[1].acTime = 299;
    expect(processMatchAchievements(processed, match).achievements.unlocked).toContain('last-minute:1');
  });
  it('旧档几何收集达标立即获得卡包，零数量卡不计入，未达标继续累计', () => {
    const ids = cards.filter(card => card.categories.includes('计算几何')).slice(0, 5).map(card => card.id);
    const { achievements: _, ...legacy } = createProfile();
    legacy.collection = Object.fromEntries(ids.map((id, i) => [id, i === 4 ? 0 : 1]));
    const restored = restoreAchievements(legacy as Profile);
    expect(restored.achievements.collected).toEqual(ids.slice(0, 4));
    expect(restored.achievements.unlocked).toEqual([]);
    const collected = collectCard(restored, ids[4]);
    legacy.collection[ids[4]] = 1;
    const migrated = restoreAchievements(legacy as Profile);
    expect(migrated.achievements).toEqual(collected.achievements);
    expect(migrated.packs.filter(pack => pack.achievementId === 'geometry')).toEqual([
      { id: 'achievement:geometry:1', eventId: 'achievement', achievementId: 'geometry', levelId: '1', guarantee: 0 },
    ]);
    expect(restoreAchievements(JSON.parse(JSON.stringify(migrated)))).toEqual(migrated);
  });
  it('输入不可变，通知、发奖记录和已解锁等级可序列化；确认仅移除指定通知，换季保留', () => {
    const profile = createProfile();
    const match = gameWith([failed(), failed(), failed(), ac(299, 0)]);
    const snapshot = structuredClone({ profile, match });
    const unlocked = processMatchAchievements(profile, match);
    expect({ profile, match }).toEqual(snapshot);
    const restored = restoreAchievements(JSON.parse(JSON.stringify(unlocked)));
    expect(restored).toEqual(unlocked);
    expect(processMatchAchievements(restored, match)).toEqual(unlocked);
    const acknowledged = acknowledgeAchievementNotifications(restored, ['proof:1']);
    expect(acknowledged.achievements.notifications).not.toContain('proof:1');
    expect(acknowledged.achievements.notifications).toContain('last-minute:1');
    expect(acknowledged.achievements.rewarded).toEqual(unlocked.achievements.rewarded);
    const next = nextSeason({ ...acknowledged, seasonEnded: true });
    expect(next.achievements).toEqual(acknowledged.achievements);
    expect(evaluateAchievements(next)).toEqual(next);
  });
  it('失败进度跨比赛取最高值，旧档历史金牌不用于补齐新等级', () => {
    const profile = process([failed(), failed(), failed(), ac()]);
    const nextMatch = gameWith([failed(), ac()]);
    const updated = processMatchAchievements(profile, nextMatch);
    expect(updated.achievements.progress.retries).toBe(3);
    expect(updated.trainingPoints).toBe(profile.trainingPoints);
    expect(updated.achievements.unlocked).toEqual(profile.achievements.unlocked);
    const old = gold(createProfile(), 'regional');
    const { achievements: _, ...legacy } = old;
    const restored = restoreAchievements(legacy as Profile);
    const ecf = gold(restored, 'ecf');
    expect(restored.achievements.unlocked.filter(id => id.startsWith('gold:'))).toEqual([]);
    expect(ecf.achievements.unlocked.filter(id => id.startsWith('gold:'))).toEqual(['gold:ecf']);
  });
  it('存在待公布结果时不触发完赛成就，压线结果在结束后公布仍可解锁', () => {
    const profile = createProfile();
    const match = gameWith([failed()], profile);
    match.status = 'finished'; match.time = 300;
    match.problems[0].judging = { duration: 1000, remaining: 1000, attempt: ac(299), text: 'AC' };
    const result = { matchId: match.id, eventId: match.eventId, season: profile.season, rank: 50, teams: 50, solved: 0, penalty: 0, packs: 1, promoted: false, seasonEnded: true, medal: null, title: null };
    expect(processMatchAchievements(profile, match, result).achievements.unlocked).not.toContain('attendance:1');
    const published = advanceJudging(match, 1000);
    const unlocked = processMatchAchievements(profile, published);
    expect(unlocked.achievements.unlocked).toContain('last-minute:1');
    expect(unlocked.achievements.unlocked).not.toContain('attendance:1');
  });
  it('正式结算可重复调用且不重复发放成就资产和通知', () => {
    const profile = createProfile();
    const match = gameWith([failed(), failed(), failed(), ac(299, 0)], profile);
    match.status = 'finished'; match.time = 300;
    const settled = settleMatch(profile, match);
    const second = settleMatch(settled.profile, match);
    expect(second.profile).toBe(settled.profile);
    expect(second.result).toEqual(settled.result);
    expect(new Set(second.profile.achievements.rewarded).size).toBe(second.profile.achievements.rewarded.length);
  });
});

describe('成就解锁时间', () => {
  it('收藏解锁记录当时赛季和待参加主线比赛，刷新和换季后保持原记录', () => {
    const initial = { ...createProfile(), season: 2029, mainIndex: 2 };
    const profile = sorting.reduce(collectCard, initial);
    expect(profile.achievements.unlockedAt['sorting:1']).toEqual({ season: 2029, eventId: 'regional' });
    const view = getAchievementView(profile).find(item => item.id === 'sorting')!;
    if (!view.hidden) expect(view.levels[0].unlockedAt).toEqual({ season: 2029, eventId: 'regional' });
    const reloaded = restoreAchievements(JSON.parse(JSON.stringify(profile)));
    const next = nextSeason({ ...reloaded, seasonEnded: true });
    expect(evaluateAchievements(next).achievements.unlockedAt).toEqual(profile.achievements.unlockedAt);
  });

  it.each([2, events.filter(event => event.kind === 'main').length])('赛季结束后的收藏解锁归入下一赛季校赛，主线索引 %i', mainIndex => {
    const initial = { ...createProfile(), season: 2029, seasonEnded: true, mainIndex };
    const profile = sorting.reduce(collectCard, initial);
    expect(profile.achievements.unlockedAt['sorting:1']).toEqual({ season: 2030, eventId: 'school' });
    expect(profile.season).toBe(2029);
    expect(evaluateAchievements(nextSeason(profile)).achievements.unlockedAt).toEqual(profile.achievements.unlockedAt);
  });

  it('比赛内解锁和奖励卡连锁解锁均记录本场比赛，而非待参加主线比赛', () => {
    const geometry = achievementDefinitions.find(item => item.id === 'geometry')!.levels[0];
    const oldCondition = geometry.condition;
    geometry.condition = { kind: 'cards', cardIds: ['template'] };
    try {
      const profile = { ...createProfile(), season: 2030, mainIndex: 2 };
      const match = startMatch(profile, 'provincial', 42);
      match.problems[0].attempts = [ac(100, 0)];
      match.problems[0].acTime = 100;
      const unlocked = processMatchAchievements(profile, match);
      for (const key of ['sample:1', 'proof:1', 'geometry:1']) {
        expect(unlocked.achievements.unlockedAt[key]).toEqual({ season: 2030, eventId: 'provincial' });
      }
    } finally { geometry.condition = oldCondition; }
  });

  it('系列各级保留各自的解锁时间，重复达成不覆盖旧记录', () => {
    let profile = { ...createProfile(), season: 2031 };
    profile = processMatchAchievements(profile, gameWith([failed(), ac()], profile));
    expect(profile.achievements.unlockedAt['retry:1']).toEqual({ season: 2031, eventId: 'school' });
    profile = { ...profile, season: 2032 };
    profile = processMatchAchievements(profile, gameWith([failed(), failed(), failed(), ac()], profile));
    expect(profile.achievements.unlockedAt['retry:1']).toEqual({ season: 2031, eventId: 'school' });
    expect(profile.achievements.unlockedAt['retry:3']).toEqual({ season: 2032, eventId: 'school' });
  });

  it('完赛成就记录比赛所在赛季和赛事', () => {
    const profile = gold({ ...createProfile(), season: 2033 }, 'wf');
    expect(profile.achievements.unlockedAt['gold:wf']).toEqual({ season: 2033, eventId: 'wf' });
    expect(profile.seasonEnded).toBe(true);
  });

  it('已有结算结果时使用比赛结果所记录的赛季', () => {
    const profile = { ...createProfile(), season: 2033 };
    const match = gameWith([failed()], profile);
    const result = settleMatch(profile, match).result;
    const unlocked = processMatchAchievements({ ...profile, season: 2034 }, match, result);
    expect(unlocked.achievements.unlockedAt['attendance:1']).toEqual({ season: 2033, eventId: 'school' });
  });

  it('旧档已有成就但无解锁时间时保留未知，并继续记录新解锁', () => {
    const profile = sorting.reduce(collectCard, createProfile());
    const { unlockedAt: _, ...legacy } = profile.achievements;
    const restored = restoreAchievements({ ...profile, achievements: legacy } as Profile);
    expect(restored.achievements.unlocked).toEqual(['sorting:1']);
    expect(restored.achievements.unlockedAt).toEqual({});
    const view = getAchievementView(restored).find(item => item.id === 'sorting')!;
    if (!view.hidden) expect(view.levels[0].unlockedAt).toBeUndefined();
    const updated = processMatchAchievements(restored, gameWith([ac()], restored));
    expect(updated.achievements.unlockedAt['sorting:1']).toBeUndefined();
    expect(updated.achievements.unlockedAt['sample:1']).toEqual({ season: restored.season, eventId: 'school' });
    expect(restoreAchievements(JSON.parse(JSON.stringify(updated)))).toEqual(updated);
  });
});
