import { describe, expect, it } from 'vitest';
import { cards, events } from '../content/data';
import { acceptanceChance, act, advanceJudging, advanceMatch, availableEvents, canSubmit, cardById, collectCard, createProfile, nextSeason, openPack, rollPack, setDeck, setPaused, settleMatch, standings, startMatch, tableScore } from './engine';
import type { Match, TableCard } from './types';

const testDeck = [
  'enumerate', 'binary-search', 'quick-sort', 'two-pointers', 'prefix-sum',
  'gcd', 'sieve', 'bfs', 'dfs', 'knapsack', 'template', 'coffee',
].flatMap(id => [id, id]);
function profileWithDeck() {
  const profile = createProfile();
  profile.deck = [...testDeck];
  for (const id of testDeck) profile.collection[id] = (profile.collection[id] ?? 0) + 1;
  return profile;
}

function match(): Match {
  const game = startMatch(profileWithDeck(), 'school', 1234);
  game.opponents = [];
  return game;
}
function ready(game: Match, index = game.currentProblem) {
  game.problems[index].readProgress = game.problems[index].readTime;
}
function table(cardId: string, uid = cardId, active = true): TableCard {
  return { uid, cardId, progress: active ? cardById[cardId].time : 0, duration: active ? cardById[cardId].time : null, active };
}
function withHand(game: Match, ids: string[]) {
  game.hand = ids.map((cardId, i) => ({ cardId, uid: `test-${i}` }));
  return game;
}
function rngSequence(values: number[]) {
  let i = 0;
  return () => values[i++ % values.length];
}

describe('比赛时间、读题与队列', () => {
  it('24张卡组开场8手牌和16牌库，不减收藏', () => {
    const profile = profileWithDeck();
    const game = startMatch(profile, 'school', 1);
    expect(profile.deck).toEqual(testDeck);
    expect(game.hand).toHaveLength(8);
    expect(game.deck).toHaveLength(16);
    expect(new Set([...game.hand, ...game.deck].map(card => card.uid)).size).toBe(24);
    expect(Object.values(profile.collection).reduce((a, b) => a + b)).toBe(24);
  });
  it('每站题数、难度范围和读题时间符合赛事配置，题号不按难度排序', () => {
    for (const event of events) {
      const game = startMatch(createProfile(), event.id, 777);
      expect(game.problems).toHaveLength(event.problems);
      expect(game.opponents).toHaveLength(event.teams - 1);
      expect(new Set(game.opponents.map(team => team.name)).size).toBe(event.teams - 1);
      expect(game.problems.every(p => p.difficulty >= event.minDifficulty && p.difficulty <= event.maxDifficulty && Number.isInteger(p.readTime) && p.readTime >= 2 && p.readTime <= 5)).toBe(true);
      expect(game.problems.map(p => p.difficulty)).not.toEqual(game.problems.map(p => p.difficulty).sort((a, b) => a - b));
    }
  });
  it('难题平均读题更久，各难度仍能抽到全部时长，并可出现难题读得更快', () => {
    const easy: number[] = [];
    const hard: number[] = [];
    let hasInversion = false;
    for (let seed = 0; seed < 500; seed++) {
      for (const eventId of ['school', 'wf']) {
        const game = startMatch(createProfile(), eventId, seed);
        for (const problem of game.problems) {
          if (problem.difficulty <= 1200) easy.push(problem.readTime);
          if (problem.difficulty >= 3000) hard.push(problem.readTime);
          if (game.problems.some(other => other.difficulty < problem.difficulty && other.readTime > problem.readTime)) hasInversion = true;
        }
      }
    }
    const mean = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / values.length;
    expect(mean(hard) - mean(easy)).toBeGreaterThan(1);
    expect([...new Set(easy)].sort()).toEqual([2, 3, 4, 5]);
    expect([...new Set(hard)].sort()).toEqual([2, 3, 4, 5]);
    expect(hasInversion).toBe(true);
    expect(startMatch(createProfile(), 'school', 1234).problems).toEqual(startMatch(createProfile(), 'school', 1234).problems);
  });
  it('读题前不能打牌；切题暂停原题读题进度', () => {
    let game = match();
    const hand = game.hand.map(card => card.uid);
    game = act(game, { type: 'play', uids: hand });
    expect(game.hand.map(card => card.uid)).toEqual(hand);
    game = advanceMatch(game, 1);
    game = act(game, { type: 'switch', problem: 1 });
    game = advanceMatch(game, 2);
    expect(game.problems[0].readProgress).toBe(1);
    expect(game.problems[1].readProgress).toBe(2);
    game = act(game, { type: 'switch', problem: 0 });
    game = advanceMatch(game, 20);
    expect(game.problems[0].readProgress).toBe(game.problems[0].readTime);
  });
  it('算法与技巧严格串行，完成后才计分，切题后继续生效', () => {
    let game = withHand(match(), ['enumerate', 'template', 'binary-search']);
    ready(game);
    game.problems[0].categories = ['基础算法'];
    game = act(game, { type: 'play', uids: game.hand.map(c => c.uid) });
    game = advanceMatch(game, 3);
    expect(tableScore(game)).toBe(0);
    expect(game.problems[0].table[1].progress).toBe(0);
    game = act(game, { type: 'switch', problem: 1 });
    game = advanceMatch(game, 1);
    expect(game.problems[0].table[0].active).toBe(true);
    game = act(game, { type: 'switch', problem: 0 });
    expect(tableScore(game)).toBe(300);
    game = advanceMatch(game, 3);
    expect(tableScore(game)).toBe(360);
    game = advanceMatch(game, 5);
    expect(tableScore(game)).toBe(840);
  });
  it('各题队列独立推进，后台技巧生效后影响后续卡牌，暂停冻结所有题目', () => {
    let game = withHand(match(), ['coffee', 'enumerate', 'enumerate', 'binary-search']);
    ready(game);
    ready(game, 1);
    game = act(game, { type: 'play', uids: ['test-0', 'test-1'] });
    game = act(game, { type: 'switch', problem: 1 });
    game = act(game, { type: 'play', uids: ['test-2', 'test-3'] });
    game = advanceMatch(game, 2);
    expect(game.problems[0].table[0].active).toBe(true);
    expect(game.globalEffects.coffee).toBeDefined();
    game = setPaused(game, true);
    expect(advanceMatch(game, 20)).toBe(game);
    game = setPaused(game, false);
    expect(game.problems[0].table[1].duration).toBe(3);
    expect(game.problems[1].table[0].duration).toBe(4);
    const whole = advanceMatch(game, 12);
    for (let i = 0; i < 12; i++) game = advanceMatch(game, 1);
    expect(game).toEqual(whole);
    expect(game.problems.slice(0, 2).every(problem => problem.table.every(card => card.active))).toBe(true);
  });
  it('每题牌桌最多5张，超额出牌整批保留在手牌，弃牌后释放空位', () => {
    let game = withHand(match(), Array(8).fill('enumerate'));
    ready(game);
    ready(game, 1);
    const uids = game.hand.map(card => card.uid);
    game = act(game, { type: 'play', uids: uids.slice(0, 6) });
    expect(game.problems[0].table).toHaveLength(0);
    expect(game.hand).toHaveLength(8);
    game = act(game, { type: 'play', uids: uids.slice(0, 5) });
    game = act(game, { type: 'play', uids: [uids[5]] });
    expect(game.problems[0].table).toHaveLength(5);
    expect(game.hand).toHaveLength(3);
    game = act(game, { type: 'discard-table', uids: [uids[0]] });
    game = act(game, { type: 'play', uids: [uids[5], uids[5]] });
    expect(game.problems[0].table).toHaveLength(5);
    expect(game.hand).toHaveLength(2);
    game = act(game, { type: 'switch', problem: 1 });
    game = act(game, { type: 'play', uids: [uids[6]] });
    expect(game.problems[1].table).toHaveLength(1);
    expect(game.problems[0].table).toHaveLength(5);
  });
  it('重排后处理最左侧未生效的牌，保留已生效状态与被移后卡牌的进度', () => {
    let game = withHand(match(), ['enumerate', 'template', 'binary-search']);
    ready(game);
    game.problems[0].categories = ['基础算法'];
    game = act(game, { type: 'play', uids: game.hand.map(card => card.uid) });
    game = advanceMatch(game, 6);
    const [active, processing] = structuredClone(game.problems[0].table);
    const revision = game.problems[0].revision;
    game = act(game, { type: 'reorder-table', uid: 'test-2', toIndex: 0 });
    expect(game.problems[0].table.map(card => card.uid)).toEqual(['test-2', 'test-0', 'test-1']);
    expect(game.problems[0].table[1]).toEqual(active);
    expect(game.problems[0].table[2]).toEqual(processing);
    expect(game.problems[0].revision).toBe(revision);
    expect(tableScore(game)).toBe(300);
    game = advanceMatch(game, 1);
    expect(game.problems[0].table.map(card => card.progress)).toEqual([1, 4, 2]);
    game = advanceMatch(game, 4);
    expect(game.problems[0].table.map(card => card.active)).toEqual([true, true, false]);
    game = advanceMatch(game, 1);
    expect(game.problems[0].table.every(card => card.active)).toBe(true);
    expect(tableScore(game)).toBe(840);
  });
  it('暂停时立即重排指定题目，恢复后按新顺序生效且不重复排序', () => {
    let game = withHand(match(), ['enumerate', 'binary-search']);
    ready(game, 1);
    game = setPaused(game, true);
    game = act(game, { type: 'switch', problem: 1 });
    game = act(game, { type: 'play', uids: ['test-0', 'test-1'] });
    game = act(game, { type: 'reorder-table', uid: 'test-1', toIndex: 0, problem: 1 });
    expect(game.problems[1].table.map(card => card.uid)).toEqual(['test-1', 'test-0']);
    expect(game.problems[1].table.map(card => card.duration)).toEqual([null, null]);
    expect(game.pendingActions).toEqual([{ type: 'switch', problem: 1 }]);
    game = setPaused(game, false);
    game = advanceMatch(game, 5);
    expect(game.problems[1].table.map(card => card.uid)).toEqual(['test-1', 'test-0']);
    expect(game.problems[1].table.map(card => card.active)).toEqual([true, false]);
  });
  it('无效的排序目标保持牌桌完整，纯排序不能绕过 WA 后的构成要求', () => {
    let game = match();
    ready(game);
    game.problems[0].table = [table('enumerate'), table('binary-search')];
    game.problems[0].waRevision = game.problems[0].revision;
    const before = structuredClone(game.problems[0]);
    for (const toIndex of [-1, 2, 0.5]) {
      game = act(game, { type: 'reorder-table', uid: 'enumerate', toIndex });
      expect(game.problems[0]).toEqual(before);
    }
    game = act(game, { type: 'reorder-table', uid: 'missing', toIndex: 0 });
    expect(game.problems[0]).toEqual(before);
    game = act(game, { type: 'reorder-table', uid: 'enumerate', toIndex: 1 });
    expect(game.problems[0].table.map(card => card.uid)).toEqual(['binary-search', 'enumerate']);
    expect(canSubmit(game)).toBe(false);
  });
  it('暂停出牌立即占用牌桌空位，弃牌立即释放空位，恢复不重复执行', () => {
    let game = withHand(match(), Array(7).fill('enumerate'));
    ready(game);
    const uids = game.hand.map(card => card.uid);
    game = setPaused(game, true);
    game = act(game, { type: 'play', uids: uids.slice(0, 5) });
    expect(game.problems[0].table.map(card => card.uid)).toEqual(uids.slice(0, 5));
    expect(game.hand.map(card => card.uid)).toEqual(uids.slice(5));
    game = act(game, { type: 'play', uids: [uids[5]] });
    expect(game.problems[0].table).toHaveLength(5);
    expect(game.hand.map(card => card.uid)).toEqual(uids.slice(5));
    game = act(game, { type: 'discard-table', uids: [uids[0]] });
    expect(game.problems[0].table).toHaveLength(4);
    expect(game.discard.map(card => card.uid)).toEqual([uids[0]]);
    game = act(game, { type: 'play', uids: [uids[6]] });
    expect(game.problems[0].table.map(card => card.uid)).toEqual([...uids.slice(1, 5), uids[6]]);
    expect(game.pendingActions).toEqual([]);
    game = setPaused(game, false);
    expect(game.problems[0].table.map(card => card.uid)).toEqual([...uids.slice(1, 5), uids[6]]);
    expect(game.hand.map(card => card.uid)).toEqual([uids[5]]);
    expect(game.discard.map(card => card.uid)).toEqual([uids[0]]);
  });
  it('满手不积累抽牌次数，弃牌后满4分钟才抽', () => {
    let game = advanceMatch(match(), 30);
    expect(game.hand).toHaveLength(8);
    game = act(game, { type: 'discard-hand', uids: [game.hand[0].uid] });
    game = advanceMatch(game, 3);
    expect(game.hand).toHaveLength(7);
    game = advanceMatch(game, 1);
    expect(game.hand).toHaveLength(8);
  });
  it('仅回收弃牌堆，卡片再次使用重新处理，不动收藏', () => {
    let game = withHand(match(), ['enumerate']);
    game.deck = [];
    game.discard = [{ uid: 'recycled', cardId: 'coffee' }];
    ready(game);
    game = act(game, { type: 'play', uids: ['test-0'] });
    game = advanceMatch(game, 4);
    expect(game.hand.some(c => c.uid === 'recycled')).toBe(true);
    expect(game.problems[0].table).toHaveLength(1);
    game = act(game, { type: 'discard-table', uids: ['test-0'] });
    game = advanceMatch(game, 4);
    game = act(game, { type: 'play', uids: ['test-0'] });
    expect(game.problems[0].table[0].active).toBe(false);
    expect(game.problems[0].table[0].progress).toBe(0);
  });
  it('弃掉处理中的牌丢弃其进度，下一张从0开始', () => {
    let game = withHand(match(), ['enumerate', 'binary-search']);
    ready(game);
    game = act(game, { type: 'play', uids: game.hand.map(c => c.uid) });
    game = advanceMatch(game, 3);
    game = act(game, { type: 'discard-table', uids: ['test-0'] });
    expect(game.problems[0].table[0]).toMatchObject({ progress: 0, duration: 5, active: false });
  });
  it('300分钟结束，不再推进或接受动作；整段推进与逐分钟推进一致', () => {
    const game = startMatch(profileWithDeck(), 'school', 123);
    const whole = advanceMatch(game, 300);
    let stepped = game;
    for (let i = 0; i < 300; i++) stepped = advanceMatch(stepped);
    expect(whole.time).toBe(300);
    expect(whole.status).toBe('finished');
    expect(standings(whole)).toEqual(standings(stepped));
    expect(advanceMatch(whole, 100)).toBe(whole);
    expect(act(whole, { type: 'discard-hand', uids: [whole.hand[0].uid] })).toBe(whole);
  });
});

describe('得分与技巧效果', () => {
  it('类别任意命中全分，否则半分；百分比相加后统一乘，骰子不折半', () => {
    const game = match();
    game.problems[0].categories = ['图论'];
    game.problems[0].table = [table('enumerate'), table('bfs'), table('template', 't1'), table('template', 't2'), { ...table('dice'), dice: 500 }];
    expect(tableScore(game)).toBe(Math.floor((150 + cardById.bfs.score + 500) * 1.4));
    game.problems[0].table.splice(2, 1);
    expect(tableScore(game)).toBe(Math.floor((150 + cardById.bfs.score + 500) * 1.2));
  });
  it('叠加百分比不会因浮点误差少算一分', () => {
    const game = match();
    game.problems[0].categories = ['基础算法'];
    game.problems[0].table = [table('enumerate'), table('binary-search'), table('template', 't1'), table('template', 't2')];
    expect(tableScore(game)).toBe(980);
  });
  it('咖啡影响开始处理时的耗时，跨题保留且不叠加；到期不改变已开始的卡', () => {
    let game = withHand(match(), ['coffee', 'enumerate', 'coffee', 'binary-search']);
    ready(game);
    game = act(game, { type: 'play', uids: game.hand.map(c => c.uid) });
    game = advanceMatch(game, 2);
    expect(game.globalEffects.coffee?.expiresAt).toBe(62);
    game = advanceMatch(game, 1);
    expect(game.problems[0].table[1]).toMatchObject({ duration: 3, progress: 1 });
    game = act(game, { type: 'switch', problem: 1 });
    game = advanceMatch(game, 3.5);
    expect(game.problems[0].table[1].active).toBe(true);
    expect(game.globalEffects.coffee?.expiresAt).toBe(66.5);
    game = advanceMatch(game, 0.5);
    expect(game.problems[0].table[3].duration).toBe(3.75);
    game = advanceMatch(game, 58.5);
    game = act(game, { type: 'switch', problem: 0 });
    game.hand = [{ uid: 'late-card', cardId: 'binary-search' }];
    game = act(game, { type: 'play', uids: ['late-card'] });
    game = advanceMatch(game, 2);
    expect(game.globalEffects.coffee).toBeUndefined();
    expect(game.problems[0].table[4]).toMatchObject({ duration: 3.75, progress: 2, active: false });
  });
  it('咖啡生效后留桌，同名刷新不叠加，移出牌桌不影响持续效果', () => {
    let game = withHand(match(), ['coffee', 'coffee']);
    ready(game);
    game = act(game, { type: 'play', uids: game.hand.map(c => c.uid) });
    game = advanceMatch(game, 3.5);
    expect(game.globalEffects.coffee).toEqual({ expiresAt: 63.5, factor: 0.75 });
    expect(game.problems[0].table).toHaveLength(2);
    expect(game.problems[0].table.every(card => card.active)).toBe(true);
    game = act(game, { type: 'discard-table', uids: ['test-0', 'test-1'] });
    expect(game.discard).toHaveLength(0);
    expect(game.globalEffects.coffee?.expiresAt).toBe(63.5);
  });
  it.each(['coffee', 'maimai', 'template', 'dice'])('%s生效后仍占空位，生效前后从牌桌移除均不回收，算法正常回收', cardId => {
    for (const active of [false, true]) {
      const profile = createProfile();
      let game = withHand(startMatch(profile, 'school', 1234), [cardId, ...Array(5).fill('enumerate')]);
      game.opponents = [];
      game.deck = [];
      ready(game);
      game = act(game, { type: 'play', uids: game.hand.slice(0, 5).map(card => card.uid) });
      if (active) game = advanceMatch(game, 25);
      expect(game.problems[0].table[0].active).toBe(active);
      game = act(game, { type: 'play', uids: ['test-5'] });
      expect(game.problems[0].table).toHaveLength(5);
      expect(game.hand.map(card => card.uid)).toContain('test-5');
      const effects = structuredClone(game.globalEffects);
      game = act(game, { type: 'discard-table', uids: ['test-0', 'test-1'] });
      expect(game.discard.map(card => card.uid)).toEqual(['test-1']);
      expect(game.globalEffects).toEqual(effects);
      game = act(game, { type: 'play', uids: ['test-5'] });
      game = advanceMatch(game, 70);
      const remainingCards = [...game.hand, ...game.deck, ...game.discard, ...game.problems.flatMap(problem => problem.table)];
      expect(remainingCards.some(card => card.uid === 'test-0')).toBe(false);
      expect(game.hand.some(card => card.uid === 'test-1')).toBe(true);
      expect(profile.collection).toEqual(createProfile().collection);
    }
  });
  it.each(['coffee', 'maimai', 'template', 'dice'])('%s从手牌弃掉后正常洗回牌库并抽取', cardId => {
    let game = withHand(match(), [cardId]);
    game.deck = [];
    game = act(game, { type: 'discard-hand', uids: ['test-0'] });
    expect(game.discard).toEqual([{ uid: 'test-0', cardId }]);
    game = advanceMatch(game, 4);
    expect(game.hand).toEqual([{ uid: 'test-0', cardId }]);
  });
  it.each(['AC', 'WA'])('所有技巧参与%s判分后，AC销毁且不回收，WA留桌保留效果', result => {
    let game = withHand(match(), ['enumerate', 'coffee', 'maimai', 'template', 'dice']);
    ready(game);
    game.problems[0].categories = ['基础算法'];
    game.problems[0].difficulty = result === 'AC' ? -100000 : 100000;
    game.deck = [];
    game = act(game, { type: 'play', uids: game.hand.map(card => card.uid) });
    game = advanceMatch(game, 20);
    expect(game.problems[0].table).toHaveLength(5);
    const tableBefore = structuredClone(game.problems[0].table);
    const score = tableScore(game);
    expect(score).toBe((300 + game.problems[0].table[4].dice!) * 1.2);
    game = act(game, { type: 'submit' });
    game = advanceJudging(game, 5000);
    expect(game.problems[0].attempts[0]).toMatchObject({ result, score });
    expect(game.problems[0].table).toEqual(result === 'AC' ? [] : tableBefore);
    expect(game.discard.map(card => card.cardId)).toEqual(result === 'AC' ? ['enumerate'] : []);
    game = advanceMatch(game, 20);
    expect([...game.hand, ...game.deck, ...game.discard].every(card => card.cardId === 'enumerate')).toBe(true);
    if (result === 'WA') {
      expect(tableScore(game)).toBe(score);
      expect(canSubmit(game)).toBe(false);
    }
  });
  it('舞萌生效后抽牌间隔3分钟，过期后恢复4分钟', () => {
    let game = withHand(match(), ['maimai']);
    ready(game);
    game = act(game, { type: 'play', uids: ['test-0'] });
    game = advanceMatch(game, 4);
    expect(game.globalEffects.draw?.expiresAt).toBe(49);
    const count = game.hand.length;
    game = advanceMatch(game, 2);
    expect(game.hand).toHaveLength(count);
    game = advanceMatch(game, 1);
    expect(game.hand).toHaveLength(count + 1);
    game = advanceMatch(game, 42);
    expect(game.globalEffects.draw).toBeUndefined();
  });
  it('骰子生效才揭晓结果，切题和等待不重新投骰', () => {
    let game = withHand(match(), ['dice']);
    ready(game);
    game = act(game, { type: 'play', uids: ['test-0'] });
    expect(game.problems[0].table[0].dice).toBeUndefined();
    game = advanceMatch(game, 2);
    const result = game.problems[0].table[0].dice;
    expect([100, 200, 300, 400, 500, 600]).toContain(result);
    game = act(game, { type: 'switch', problem: 1 });
    game = advanceMatch(game, 20);
    expect(game.problems[0].table[0].dice).toBe(result);
  });
});

describe('暂停预排、判题与罚时', () => {
  it('判题随机等待1～5秒，暂停冻结，完成前保留牌桌且不更新榜单', () => {
    let game = match();
    ready(game);
    game.time = 70;
    game.problems[0].table = [table('enumerate')];
    game.problems[0].difficulty = -100000;
    game = act(game, { type: 'submit' });
    const judging = game.problems[0].judging!;
    expect(judging.duration).toBeGreaterThanOrEqual(1000);
    expect(judging.duration).toBeLessThanOrEqual(5000);
    expect(game.problems[0].attempts).toHaveLength(0);
    expect(game.problems[0].acTime).toBeNull();
    expect(game.problems[0].table).toHaveLength(1);
    expect(game.feedback).toBeNull();
    expect(standings(game)[0].solved).toBe(0);
    expect(canSubmit(game)).toBe(false);
    expect(act(game, { type: 'submit' }).problems[0].judging).toEqual(judging);
    game = advanceJudging(game, 600);
    game = setPaused(game, true);
    expect(advanceJudging(game, 10000)).toBe(game);
    game = setPaused(game, false);
    game = advanceJudging(game, judging.duration - 601);
    expect(game.problems[0].attempts).toHaveLength(0);
    game = advanceJudging(game, 1);
    expect(game.problems[0].judging).toBeUndefined();
    expect(game.problems[0].acTime).toBe(70);
    expect(game.problems[0].attempts).toHaveLength(1);
    expect(game.problems[0].table).toHaveLength(0);
    expect(game.feedback?.verdict).toBe('AC');
  });
  it('切题和存档保留判题剩余时间，比赛结束后仍可完成已提交的判题', () => {
    let game = match();
    ready(game);
    game.time = 299;
    game.problems[0].table = [table('enumerate')];
    game.problems[0].difficulty = 100000;
    game = act(game, { type: 'submit' });
    game = advanceJudging(game, 300);
    const judging = structuredClone(game.problems[0].judging!);
    const randomState = game.randomState;
    game = act(game, { type: 'switch', problem: 1 });
    game = JSON.parse(JSON.stringify(game));
    expect(game.problems[0].judging).toEqual(judging);
    game = advanceMatch(game, 1);
    expect(game.status).toBe('finished');
    game = advanceJudging(game, judging.remaining);
    expect(game.problems[0].attempts[0]).toMatchObject({ result: 'WA', time: 299 });
    expect(game.problems[0].waRevision).toBe(game.problems[0].revision);
    expect(game.randomState).toBe(randomState);
  });
  it('判题只锁定提交题的牌桌，暂停时同样锁定，其他题仍可出牌', () => {
    let game = withHand(match(), ['binary-search']);
    ready(game);
    ready(game, 1);
    game.problems[0].table = [table('enumerate'), table('template')];
    game = act(game, { type: 'submit' });
    const submitted = structuredClone(game.problems[0]);
    for (const paused of [false, true]) {
      game = setPaused(game, paused);
      game = act(game, { type: 'play', uids: ['test-0'], problem: 0 });
      game = act(game, { type: 'discard-table', uids: ['enumerate'], problem: 0 });
      game = act(game, { type: 'reorder-table', uid: 'template', toIndex: 0, problem: 0 });
      expect(game.problems[0]).toEqual(submitted);
      expect(game.hand).toHaveLength(1);
    }
    game = setPaused(game, false);
    game = act(game, { type: 'switch', problem: 1 });
    game = act(game, { type: 'play', uids: ['test-0'] });
    expect(game.problems[1].table.map(card => card.uid)).toEqual(['test-0']);
    expect(game.problems[0]).toEqual(submitted);
  });
  it('自动提交等待各题全部卡牌生效，切题后按完成时间各提交一次', () => {
    let game = withHand(match(), ['enumerate', 'binary-search', 'enumerate']);
    ready(game);
    ready(game, 1);
    game.problems[0].difficulty = game.problems[1].difficulty = 100000;
    game = act(game, { type: 'play', uids: ['test-0', 'test-1'] });
    expect(canSubmit(game)).toBe(false);
    game = act(game, { type: 'submit' });
    expect(game.problems[0].submitQueued).toBe(true);
    expect(game.problems[0].attempts).toHaveLength(0);
    game = advanceMatch(game, 1);
    game = act(game, { type: 'switch', problem: 1 });
    game = act(game, { type: 'play', uids: ['test-2'] });
    game = act(game, { type: 'submit' });
    game = advanceMatch(game, 3);
    expect(game.problems.slice(0, 2).every(problem => !problem.attempts.length)).toBe(true);
    game = advanceMatch(game, 1);
    expect(game.problems[1].judging?.attempt).toMatchObject({ time: 5, result: 'WA' });
    expect(game.problems[1].attempts).toHaveLength(0);
    expect(game.problems[0].attempts).toHaveLength(0);
    game = advanceMatch(game, 4);
    expect(game.problems[0].judging?.attempt).toMatchObject({ time: 9, result: 'WA' });
    expect(game.problems[0].attempts).toHaveLength(0);
    expect(game.problems.slice(0, 2).every(problem => !problem.submitQueued)).toBe(true);
    game = act(game, { type: 'submit' });
    game = advanceJudging(game, 5000);
    expect(game.problems[0].attempts[0]).toMatchObject({ time: 9, result: 'WA' });
    expect(game.problems[1].attempts[0]).toMatchObject({ time: 5, result: 'WA' });
    game = advanceMatch(game, 20);
    game = advanceJudging(game, 5000);
    expect(game.problems.slice(0, 2).every(problem => problem.attempts.length === 1)).toBe(true);
  });
  it('自动提交按最新牌桌等待，追加卡牌延后提交，弃掉未生效卡后可立即提交', () => {
    let game = withHand(match(), ['enumerate', 'binary-search']);
    ready(game);
    game.problems[0].difficulty = 100000;
    game = act(game, { type: 'play', uids: ['test-0'] });
    game = act(game, { type: 'submit' });
    game = advanceMatch(game, 2);
    game = act(game, { type: 'play', uids: ['test-1'] });
    game = advanceMatch(game, 2);
    expect(game.problems[0].attempts).toHaveLength(0);
    expect(game.problems[0].submitQueued).toBe(true);
    game = act(game, { type: 'discard-table', uids: ['test-1'] });
    expect(game.problems[0].judging?.attempt).toMatchObject({ time: 4, result: 'WA' });
    expect(game.problems[0].attempts).toHaveLength(0);
    game = advanceJudging(game, 5000);
    expect(game.problems[0].attempts[0]).toMatchObject({ time: 4, result: 'WA' });
    expect(game.problems[0].submitQueued).toBe(false);
  });
  it('暂停立即出牌并冻结计时，恢复后提交预约等待当前题准备好仅执行一次', () => {
    let game = withHand(match(), ['enumerate']);
    ready(game);
    game.problems[0].difficulty = 100000;
    game = setPaused(game, true);
    game = act(game, { type: 'play', uids: ['test-0'] });
    game = act(game, { type: 'submit' });
    expect(advanceMatch(game, 20)).toBe(game);
    expect(game.hand).toHaveLength(0);
    expect(game.problems[0].table).toEqual([{ uid: 'test-0', cardId: 'enumerate', progress: 0, duration: null, active: false }]);
    expect(game.pendingActions).toEqual([{ type: 'submit', problem: 0 }]);
    game = setPaused(game, false);
    expect(game.problems[0].submitQueued).toBe(true);
    game = advanceMatch(game, 4);
    game = advanceJudging(game, 5000);
    expect(game.problems[0].attempts).toHaveLength(1);
    expect(game.problems[0].submitQueued).toBe(false);
    game = advanceMatch(game, 20);
    expect(game.problems[0].attempts).toHaveLength(1);
  });
  it('暂停保留已有生效进度，新出牌和弃牌立即移动，恢复后下一张从零计时', () => {
    let game = withHand(match(), ['enumerate', 'binary-search', 'quick-sort', 'bfs']);
    ready(game);
    game = act(game, { type: 'play', uids: ['test-0', 'test-1'] });
    game = advanceMatch(game, 2);
    game = setPaused(game, true);
    game = act(game, { type: 'play', uids: ['test-2'] });
    expect(game.problems[0].table.map(card => card.progress)).toEqual([2, 0, 0]);
    expect(game.problems[0].table.every(card => !card.active)).toBe(true);
    expect(advanceMatch(game, 20)).toBe(game);
    game = act(game, { type: 'discard-table', uids: ['test-0'] });
    game = act(game, { type: 'discard-hand', uids: ['test-3'] });
    expect(game.hand).toHaveLength(0);
    expect(game.problems[0].table.map(card => card.uid)).toEqual(['test-1', 'test-2']);
    expect(game.discard.map(card => card.uid)).toEqual(['test-0', 'test-3']);
    expect(game.pendingActions).toEqual([]);
    expect(advanceMatch(game, 20)).toBe(game);
    game = setPaused(game, false);
    game = advanceMatch(game, 2);
    expect(game.time).toBe(4);
    expect(game.problems[0].table.map(card => card.progress)).toEqual([2, 0]);
    expect(game.discard.map(card => card.uid)).toEqual(['test-0', 'test-3']);
  });
  it('暂停时不能重复打出或弃掉同一张实体牌', () => {
    let game = withHand(match(), ['enumerate', 'binary-search']);
    ready(game);
    game = setPaused(game, true);
    game = act(game, { type: 'play', uids: ['test-0'] });
    game = act(game, { type: 'play', uids: ['test-0'] });
    game = act(game, { type: 'discard-hand', uids: ['test-1'] });
    game = act(game, { type: 'discard-hand', uids: ['test-1'] });
    expect(game.hand).toHaveLength(0);
    expect(game.problems[0].table.map(card => card.uid)).toEqual(['test-0']);
    expect(game.discard.map(card => card.uid)).toEqual(['test-1']);
    game = act(game, { type: 'discard-table', uids: ['test-0'] });
    game = act(game, { type: 'discard-table', uids: ['test-0'] });
    game = setPaused(game, false);
    expect(game.problems[0].table).toHaveLength(0);
    expect(game.discard.map(card => card.uid)).toEqual(['test-1', 'test-0']);
  });
  it('暂停卡牌操作使用明确指定的题目或最后预排切题的目标', () => {
    let game = withHand(match(), ['enumerate', 'binary-search', 'quick-sort']);
    ready(game, 1);
    ready(game, 2);
    game = setPaused(game, true);
    game = act(game, { type: 'switch', problem: 1 });
    game = act(game, { type: 'play', uids: ['test-0'] });
    expect(game.problems[1].table.map(card => card.uid)).toEqual(['test-0']);
    game = act(game, { type: 'switch', problem: 2 });
    game = act(game, { type: 'play', uids: ['test-1'], problem: 1 });
    game = act(game, { type: 'discard-table', uids: ['test-0'], problem: 1 });
    game = act(game, { type: 'play', uids: ['test-2'] });
    expect(game.problems[2].table.map(card => card.uid)).toEqual(['test-2']);
    game = act(game, { type: 'discard-table', uids: ['test-2'] });
    expect(game.currentProblem).toBe(0);
    expect(game.problems[0].table).toHaveLength(0);
    expect(game.problems[1].table.map(card => card.uid)).toEqual(['test-1']);
    expect(game.problems[1].table[0].progress).toBe(0);
    expect(game.problems[2].table).toHaveLength(0);
    expect(game.discard.map(card => card.uid)).toEqual(['test-0', 'test-2']);
    expect(game.pendingActions).toEqual([{ type: 'switch', problem: 1 }, { type: 'switch', problem: 2 }]);
    game = setPaused(game, false);
    expect(game.currentProblem).toBe(2);
    expect(game.hand).toHaveLength(0);
    expect(game.problems[1].table.map(card => card.uid)).toEqual(['test-1']);
    expect(game.discard.map(card => card.uid)).toEqual(['test-0', 'test-2']);
  });
  it('预约随题保存，恢复后切到别题仍自动提交且只执行一次', () => {
    let game = withHand(match(), ['enumerate']);
    ready(game);
    game.problems[0].difficulty = 100000;
    game = setPaused(game, true);
    game = act(game, { type: 'play', uids: ['test-0'] });
    game = act(game, { type: 'submit' });
    game = act(game, { type: 'switch', problem: 1 });
    game = setPaused(game, false);
    game = advanceMatch(game, 3);
    expect(game.problems[0].attempts).toHaveLength(0);
    game = advanceMatch(game, 1);
    expect(game.problems[0].judging?.attempt.time).toBe(4);
    expect(game.problems[0].attempts).toHaveLength(0);
    game = advanceJudging(game, 5000);
    expect(game.problems[0].attempts).toHaveLength(1);
    expect(game.problems[0].attempts[0].time).toBe(4);
    expect(game.currentProblem).toBe(1);
    expect(game.problems[0].submitQueued).toBe(false);
    game = advanceMatch(game, 20);
    expect(game.problems[0].attempts).toHaveLength(1);
  });
  it('预约提交在恢复时重新检查即时弃牌后的牌桌', () => {
    let game = match();
    ready(game);
    game.problems[0].table = [table('enumerate')];
    game.problems[0].difficulty = 100000;
    game = setPaused(game, true);
    game = act(game, { type: 'submit' });
    game = act(game, { type: 'discard-table', uids: ['enumerate'] });
    expect(game.problems[0].table).toHaveLength(0);
    expect(game.discard.map(card => card.uid)).toEqual(['enumerate']);
    expect(game.problems[0].attempts).toHaveLength(0);
    game = setPaused(game, false);
    expect(game.problems[0].attempts).toHaveLength(0);
    expect(game.problems[0].submitQueued).toBe(true);
    expect(game.problems[0].table).toHaveLength(0);
  });
  it('WA后仅修改牌桌能再次提交，切题/等待/弃手牌无效', () => {
    let game = match();
    ready(game);
    game.problems[0].table = [table('enumerate'), table('binary-search')];
    game.problems[0].difficulty = 100000;
    game = act(game, { type: 'submit' });
    game = advanceJudging(game, 5000);
    expect(game.problems[0].attempts[0].result).toBe('WA');
    expect(canSubmit(game)).toBe(false);
    game = act(game, { type: 'discard-hand', uids: [game.hand[0].uid] });
    game = act(game, { type: 'switch', problem: 1 });
    game = advanceMatch(game, 20);
    game = act(game, { type: 'switch', problem: 0 });
    expect(canSubmit(game)).toBe(false);
    game = act(game, { type: 'discard-table', uids: ['binary-search'] });
    expect(canSubmit(game)).toBe(true);
    game = act(game, { type: 'submit' });
    game = advanceJudging(game, 5000);
    expect(game.problems[0].attempts).toHaveLength(2);
  });
  it('AC清桌回收；未AC不计罚时；排行按AC、罚时、最后AC排序', () => {
    let game = match();
    ready(game);
    game.time = 70;
    game.problems[0].table = [table('enumerate')];
    game.problems[0].difficulty = -100000;
    game.problems[0].attempts = [{ time: 10, result: 'WA', score: 1 }];
    game = act(game, { type: 'submit' });
    game = advanceJudging(game, 5000);
    expect(game.problems[0].acTime).toBe(70);
    expect(game.problems[0].table).toHaveLength(0);
    expect(game.discard.some(c => c.uid === 'enumerate')).toBe(true);
    game.problems[1].attempts = [{ time: 30, result: 'WA', score: 1 }];
    const player = standings(game)[0];
    expect(player.solved).toBe(1);
    expect(player.penalty).toBe(90);
    expect(player.lastAc).toBe(70);
  });
  it('通过概率同分80%、+400为95%，上限98%', () => {
    expect(acceptanceChance(1000, 1000)).toBeCloseTo(0.8);
    expect(acceptanceChance(1400, 1000)).toBeCloseTo(0.95);
    expect(acceptanceChance(10000, 1000)).toBe(0.98);
  });
});

describe('赛季、组卡与开包', () => {
  it('新玩家获得8个普通卡包，收藏和卡组为空', () => {
    const profile = createProfile();
    expect(profile.season).toBe(2026);
    expect(profile.collection).toEqual({});
    expect(profile.deck).toEqual([]);
    expect(profile.packs).toHaveLength(8);
    expect(new Set(profile.packs.map(pack => pack.id)).size).toBe(8);
    expect(profile.packs.every(pack => pack.eventId === 'starter' && pack.guarantee === 0)).toBe(true);
    expect(nextSeason(profile)).toBe(profile);
  });
  it('组卡不超过收藏或32张，允许实际持有的同名复数', () => {
    const profile = profileWithDeck();
    expect(setDeck(profile, ['enumerate', 'enumerate']).deck).toHaveLength(2);
    expect(setDeck(profile, ['enumerate', 'enumerate', 'enumerate'])).toBe(profile);
    expect(setDeck(profile, [...profile.deck, 'enumerate'])).toBe(profile);
    profile.collection.enumerate = 33;
    expect(setDeck(profile, Array(32).fill('enumerate')).deck).toHaveLength(32);
    expect(setDeck(profile, Array(33).fill('enumerate'))).toBe(profile);
  });
  it('零AC结束赛季，结算仅发一次奖励；新赛季保留收藏和卡组', () => {
    const profile = createProfile();
    const game = advanceMatch(startMatch(profile, 'school', 123), 300);
    const settled = settleMatch(profile, game);
    expect(settled.result.seasonEnded).toBe(true);
    expect(settled.result.packs).toBe(1);
    expect(settled.profile.packs).toHaveLength(profile.packs.length + 1);
    expect(settleMatch(settled.profile, game).profile).toBe(settled.profile);
    const next = nextSeason(settled.profile);
    expect(next.season).toBe(2027);
    expect(next.collection).toEqual(profile.collection);
    expect(next.deck).toEqual(profile.deck);
    expect(next.achievements).toEqual(settled.profile.achievements);
    expect(availableEvents(next).map(e => e.id)).toEqual(['school']);
  });
  it('主线晋级解锁下一站及支线；支线结果不改变资格，每季仅一次', () => {
    let profile = createProfile();
    const game = startMatch(profile, 'school', 7);
    game.status = 'finished';
    game.time = 300;
    game.problems[0].acTime = 30;
    game.problems[0].attempts = [{ time: 30, result: 'AC', score: 1000 }];
    const settled = settleMatch(profile, game);
    expect(settled.result.promoted).toBe(true);
    expect(settled.result.packs).toBe(5);
    profile = settled.profile;
    expect(availableEvents(profile).map(e => e.id)).toEqual(['online', 'provincial', 'invitational']);
    const side = startMatch(profile, 'provincial', 1);
    side.status = 'finished';
    profile = settleMatch(profile, side).profile;
    expect(profile.mainIndex).toBe(1);
    expect(profile.seasonEnded).toBe(false);
    expect(availableEvents(profile).map(e => e.id)).toEqual(['online', 'invitational']);
  });
  it.each([
    { times: [], bonus: 2 },
    { times: [[null, null, null]], bonus: 2 },
    { times: [[40, 70, 10]], bonus: 2 },
    { times: [[20, 70, null]], bonus: 1 },
    { times: [[30, 60, null]], bonus: 2 },
    { times: [[20, 70, null], [40, 50, null]], bonus: 0 },
  ])('每道一血额外发一包：对手 AC 时间 $times，奖励 $bonus 包', ({ times, bonus }) => {
    const profile = createProfile();
    const game = startMatch(profile, 'regional', 7);
    game.status = 'finished';
    game.problems[0].acTime = 30;
    game.problems[1].acTime = 60;
    game.opponents = times.map((acTimes, index) => ({
      ...game.opponents[index],
      results: game.problems.map((_, i) => ({ attempts: acTimes[i] == null ? 0 : 1, acTime: acTimes[i] ?? null })),
    }));
    const settled = settleMatch(profile, game);
    expect(settled.result.packs).toBe(2 + bonus);
    const rewards = settled.profile.packs.slice(profile.packs.length);
    expect(rewards).toHaveLength(2 + bonus);
    expect(rewards.every(pack => pack.eventId === 'regional' && pack.guarantee === 2)).toBe(true);
    expect(settleMatch(settled.profile, game).profile).toBe(settled.profile);
  });
  it.each([1, 3, 4, 6])('%i 道一血的额外卡包最多三包，排行榜保留全部一血', count => {
    const profile = createProfile();
    const game = startMatch(profile, 'school', 7);
    for (const problem of game.problems.slice(0, count)) {
      problem.acTime = 30;
      problem.attempts = [{ time: 30, result: 'AC', score: 1000 }];
    }
    expect(standings(game).find(row => row.player)!.problems.filter(problem => problem.firstBlood)).toHaveLength(count);
    const settled = settleMatch(profile, game);
    expect(settled.result.packs).toBe(4 + Math.min(count, 3));
    expect(settled.profile.packs.filter(pack => pack.eventId !== 'achievement')).toHaveLength(profile.packs.length + settled.result.packs);
    expect(settled.profile.packs.filter(pack => pack.eventId === 'achievement')).toHaveLength(count >= 3 ? 1 : 0);
  });
  it('并列最早 AC 优先玩家，较晚 AC 和未通过不获得一血', () => {
    const game = startMatch(createProfile(), 'school', 7);
    game.problems[0].acTime = 30;
    game.problems[1].acTime = 40;
    game.opponents[0].results[0].acTime = 30;
    game.opponents[0].results[1].acTime = 30;
    const rows = standings(game);
    expect(rows.find(row => row.player)!.problems.map(problem => problem.firstBlood)).toEqual([true, false, ...Array(8).fill(false)]);
    expect(rows.find(row => row.id === game.opponents[0].id)!.problems[1].firstBlood).toBe(true);
    for (let index = 0; index < game.problems.length; index++) {
      expect(rows.filter(row => row.problems[index].firstBlood)).toHaveLength(index < 2 ? 1 : 0);
    }
  });
  it('电脑队并列一血随机指定一队，刷新、读档和比赛推进保持归属', () => {
    const game = startMatch(createProfile(), 'school', 7);
    game.opponents[0].results[0].acTime = 30;
    game.opponents[1].results[0].acTime = 30;
    game.opponents[2].results[0].acTime = 40;
    const winners = new Set<string>();
    for (let i = 0; i < 24; i++) {
      game.id = `tie-${i}`;
      const before = JSON.stringify(game);
      const rows = standings(game);
      const awarded = rows.filter(row => row.problems[0].firstBlood);
      expect(awarded).toHaveLength(1);
      expect(game.opponents.slice(0, 2).map(team => team.id)).toContain(awarded[0].id);
      winners.add(awarded[0].id);
      expect(standings(game)).toEqual(rows);
      expect(standings(JSON.parse(before))).toEqual(rows);
      expect(JSON.stringify(game)).toBe(before);
      game.randomState++;
      game.time++;
      expect(standings(game)).toEqual(rows);
    }
    expect(winners.size).toBe(2);
  });
  it('开包每包5张、保底满足，技巧只取固定卡池，卡片逐张入藏', () => {
    for (const guarantee of [0, 2, 3, 4]) {
      const contents = rollPack(guarantee, rngSequence([0, 0, 0]));
      expect(contents).toHaveLength(5);
      expect(contents.some(id => cardById[id].rarity >= guarantee)).toBe(true);
    }
    const techniques = rollPack(0, rngSequence([0.9, 0.9]));
    expect(techniques.every(id => cardById[id].type === 'technique')).toBe(true);
    const profile = createProfile();
    profile.packs = [{ id: 'one', eventId: 'school', guarantee: 0 }];
    const opened = openPack(profile);
    expect(opened.profile.packs).toHaveLength(0);
    expect(opened.profile.collection).toEqual(profile.collection);
    expect(opened.profile.achievements).toEqual(profile.achievements);
    const collected = collectCard(opened.profile, opened.cards[0]);
    expect(collected.collection[opened.cards[0]]).toBe((profile.collection[opened.cards[0]] ?? 0) + 1);
    expect(collected.achievements.collected).toContain(opened.cards[0]);
  });
  it('所有主线赛事按门槛晋级，WF结束后下季重置资格', () => {
    let profile = createProfile();
    for (const event of events.filter(event => event.kind === 'main')) {
      expect(availableEvents(profile).some(item => item.id === event.id)).toBe(true);
      const game = startMatch(profile, event.id, 3);
      game.status = 'finished';
      game.time = 300;
      game.problems[0].acTime = 30;
      game.problems[0].attempts = [{ time: 30, result: 'AC', score: 2000 }];
      profile = settleMatch(profile, game).profile;
    }
    expect(profile.seasonEnded).toBe(true);
    expect(profile.playedEvents).toEqual(['school', 'online', 'regional', 'ecf', 'wf']);
    expect(profile.packs.filter(pack => pack.eventId !== 'achievement')).toHaveLength(33);
    expect(profile.packs.filter(pack => pack.eventId === 'achievement')).toHaveLength(3);
    profile = nextSeason(profile);
    expect(profile.playedEvents).toEqual([]);
    expect(availableEvents(profile).map(event => event.id)).toEqual(['school']);
    expect(profile.packs.filter(pack => pack.eventId !== 'achievement')).toHaveLength(33);
    expect(profile.packs.filter(pack => pack.eventId === 'achievement')).toHaveLength(3);
  });
  it('保底不会覆盖前四位已达标结果，算法普通档位遵循权重', () => {
    const upper = rollPack(4, rngSequence([0.1, 0.999, 0]));
    expect(upper.every(id => cardById[id].rarity === 7)).toBe(true);
    const lower = rollPack(4, rngSequence([0.1, 0, 0]));
    expect(lower.slice(0, 4).every(id => cardById[id].rarity === 0)).toBe(true);
    expect(cardById[lower[4]].rarity).toBe(4);
  });
  it('保底按普通卡位条件分布归一化，保留达标技巧的原权重', () => {
    const cyanGuarantee = rollPack(2, rngSequence([...Array(12).fill(0), 0.75]));
    expect(cyanGuarantee[4]).toBe('maimai');
    const cyanGuaranteeHigh = rollPack(2, rngSequence([...Array(12).fill(0), 0.9]));
    expect(cyanGuaranteeHigh[4]).toBe('dice');
    const purpleGuarantee = rollPack(4, rngSequence([...Array(12).fill(0), 0.99]));
    expect(cardById[purpleGuarantee[4]].rarity).toBe(7);
  });
  it('算法8个档位均有卡池，四种技巧固定稀有度', () => {
    for (let rarity = 0; rarity < 8; rarity++) expect(cards.some(card => card.type === 'algorithm' && card.rarity === rarity)).toBe(true);
    expect(cards.filter(card => card.type === 'technique').map(card => card.rarity)).toEqual([0, 1, 2, 3]);
  });
});
