import { describe, expect, it } from 'vitest';
import { createProfile, settleMatch, startMatch } from './engine';
import { contestAwards } from './honors';

describe('比赛奖牌与前三名称号', () => {
  it.each([
    [1, 'gold', 'champion'],
    [2, 'gold', 'runner-up'],
    [3, 'gold', 'third-place'],
    [4, 'gold', null],
    [5, 'gold', null],
    [6, 'silver', null],
    [15, 'silver', null],
    [16, 'bronze', null],
    [30, 'bronze', null],
    [31, null, null],
    [50, null, null],
  ])('50 队比赛第 %i 名获得 %s 和 %s', (rank, medal, title) => {
    expect(contestAwards('regional', rank as number, 50)).toEqual({ medal, title });
  });

  it.each(['regional', 'ecf', 'wf', 'provincial', 'invitational'])('%s 均颁发奖牌和称号', eventId => {
    expect(contestAwards(eventId, 1, 50)).toEqual({ medal: 'gold', title: 'champion' });
    expect(contestAwards(eventId, 10, 50)).toEqual({ medal: 'silver', title: null });
    expect(contestAwards(eventId, 20, 50)).toEqual({ medal: 'bronze', title: null });
  });

  it.each(['school', 'online'])('%s 不颁发奖牌或前三名称号', eventId => {
    for (const rank of [1, 2, 3, 5, 15, 30]) {
      expect(contestAwards(eventId, rank, 50)).toEqual({ medal: null, title: null });
    }
  });

  it('非整数比例按名次占总队数判断，不扩大获奖范围', () => {
    expect(contestAwards('regional', 2, 21).medal).toBe('gold');
    expect(contestAwards('regional', 3, 21).medal).toBe('silver');
    expect(contestAwards('regional', 6, 21).medal).toBe('silver');
    expect(contestAwards('regional', 7, 21).medal).toBe('bronze');
    expect(contestAwards('regional', 12, 21).medal).toBe('bronze');
    expect(contestAwards('regional', 13, 21).medal).toBeNull();
  });

  it.each([
    ['regional', 2, 'gold', 'runner-up'],
    ['provincial', 15, 'silver', null],
    ['invitational', 30, 'bronze', null],
    ['wf', 31, null, null],
    ['school', 1, null, null],
    ['online', 3, null, null],
  ])('%s 第 %i 名结算保存奖项且重复结算不重复发奖', (eventId, rank, medal, title) => {
    const profile = createProfile();
    const game = startMatch(profile, eventId as string, 42);
    game.status = 'finished';
    game.time = 300;
    game.problems[0].acTime = 100;
    game.problems[0].attempts = [{ time: 100, result: 'AC', score: 2000 }];
    const opponent = game.opponents[0];
    game.opponents = Array.from({ length: 49 }, (_, index) => ({
      ...structuredClone(opponent),
      id: `opponent-${index}`,
      results: game.problems.map((_, problemIndex) => ({
        attempts: problemIndex === 0 ? 1 : 0,
        acTime: problemIndex === 0 ? (index < (rank as number) - 1 ? 50 : 150) : null,
      })),
    }));

    const settled = settleMatch(profile, game);
    expect(settled.result).toMatchObject({ rank, teams: 50, medal, title });
    expect(settled.profile.history).toEqual([settled.result]);
    const repeated = settleMatch(settled.profile, game);
    expect(repeated.profile).toBe(settled.profile);
    expect(repeated.result).toBe(settled.result);
  });
});
