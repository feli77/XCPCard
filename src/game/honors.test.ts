import { describe, expect, it } from 'vitest';
import { createProfile } from './engine';
import { contestAwards, highestHonor, restoreHistory } from './honors';
import type { MatchResult } from './types';

function result(eventId: string, rank: number, season = 1): MatchResult {
  return { matchId: `${eventId}-${season}-${rank}`, eventId, season, rank, teams: 50,
    solved: 5, penalty: 500, packs: 3, promoted: false, seasonEnded: false,
    ...contestAwards(eventId, rank, 50) };
}

describe('荣誉收藏和历史记录', () => {
  it('最高荣誉先比较赛事级别，再比较名次，同名次保留最近赛季', () => {
    const history = [result('regional', 1), result('ecf', 1), result('wf', 25), result('wf', 20), result('wf', 20, 2)];
    const before = structuredClone(history);
    expect(highestHonor(history)).toBe(history[4]);
    expect(history).toEqual(before);
    expect(highestHonor([result('wf', 50), result('school', 1), result('online', 1)])).toBeUndefined();
    expect(highestHonor([])).toBeUndefined();
  });

  it('省赛与邀请赛同级，按名次比较', () => {
    const history = [result('provincial', 10), result('invitational', 5)];
    expect(highestHonor(history)).toBe(history[1]);
  });

  it.each([true, false])('旧记录补全赛季和奖项，赛季已结束：%s', ended => {
    const profile = createProfile();
    profile.season = 3;
    profile.seasonEnded = ended;
    const oldResults = [result('regional', 10), { ...result('ecf', 3), seasonEnded: true }, { ...result('school', 1), seasonEnded: true }];
    profile.history = oldResults.map(entry => {
      const { season, medal, title, ...old } = entry;
      return old as MatchResult;
    });
    const restored = restoreHistory(profile);
    expect(restored.history.map(entry => entry.season)).toEqual(ended ? [2, 2, 3] : [1, 1, 2]);
    expect(restored.history.map(entry => entry.medal)).toEqual(['silver', 'gold', null]);
    expect(restored.history.map(entry => entry.title)).toEqual([null, 'third-place', null]);
    expect(restored.history.map(entry => entry.teams)).toEqual([50, 50, 50]);
    expect(restoreHistory(restored)).toEqual(restored);
    expect(profile.history[0].season).toBeUndefined();
  });

  it('已有赛季记录在跨季后保持不变', () => {
    const profile = createProfile();
    profile.season = 3;
    profile.history = [result('regional', 1, 1), result('regional', 10, 2)];
    expect(restoreHistory(profile).history).toEqual(profile.history);
  });
});
