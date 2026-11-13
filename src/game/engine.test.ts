import { describe, expect, it } from 'vitest';
import { cards, events } from '../content/data';
import { acceptanceChance, act, advanceMatch, availableEvents, canSubmit, cardById, collectCard, createProfile, nextSeason, openPack, rollPack, setDeck, setPaused, settleMatch, standings, startMatch, tableScore } from './engine';
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
      expect(game.problems.every(p => p.difficulty >= event.minDifficulty && p.difficulty <= event.maxDifficulty && p.readTime >= 3 && p.readTime <= 8)).toBe(true);
      expect(game.problems.map(p => p.difficulty)).not.toEqual(game.problems.map(p => p.difficulty).sort((a, b) => a - b));
    }
  });
  it('读题前不能打牌；切题仅暂停当前题局部时间', () => {
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
  it('算法与技巧严格串行，完成后才计分，暂停题目队列保留进度', () => {
    let game = withHand(match(), ['enumerate', 'template', 'binary-search']);
    ready(game);
    game.problems[0].categories = ['基础算法'];
    game = act(game, { type: 'play', uids: game.hand.map(c => c.uid) });
    game = advanceMatch(game, 3);
    expect(tableScore(game)).toBe(0);
    expect(game.problems[0].table[1].progress).toBe(0);
    game = act(game, { type: 'switch', problem: 1 });
    game = advanceMatch(game, 20);
    expect(game.problems[0].table[0].progress).toBe(3);
    game = act(game, { type: 'switch', problem: 0 });
    game = advanceMatch(game, 1);
    expect(tableScore(game)).toBe(300);
    game = advanceMatch(game, 3);
    expect(tableScore(game)).toBe(360);
    game = advanceMatch(game, 5);
    expect(tableScore(game)).toBe(840);
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
  it('暂停预排在恢复执行时也遵守牌桌上限', () => {
    let game = withHand(match(), Array(7).fill('enumerate'));
    ready(game);
    const uids = game.hand.map(card => card.uid);
    game = setPaused(game, true);
    game = act(game, { type: 'play', uids: uids.slice(0, 5) });
    game = act(game, { type: 'play', uids: [uids[5]] });
    game = act(game, { type: 'discard-table', uids: [uids[0]] });
    game = act(game, { type: 'play', uids: [uids[6]] });
    game = setPaused(game, false);
    expect(game.problems[0].table.map(card => card.uid)).toEqual([...uids.slice(1, 5), uids[6]]);
    expect(game.hand.map(card => card.uid)).toEqual([uids[5]]);
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
    game = advanceMatch(game, 70);
    expect(game.globalEffects.coffee).toBeUndefined();
    game = act(game, { type: 'switch', problem: 0 });
    game = advanceMatch(game, 2);
    expect(game.problems[0].table[1].active).toBe(true);
    game = advanceMatch(game, 2);
    expect(game.globalEffects.coffee?.expiresAt).toBe(137);
    game = advanceMatch(game, 0.5);
    expect(game.problems[0].table[3].duration).toBe(3.75);
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
  it('暂停冻结所有计时和动作，恢复依次执行；提交预约等待当前题准备好仅执行一次', () => {
    let game = withHand(match(), ['enumerate']);
    ready(game);
    game.problems[0].difficulty = 100000;
    game = setPaused(game, true);
    game = act(game, { type: 'play', uids: ['test-0'] });
    game = act(game, { type: 'submit' });
    expect(advanceMatch(game, 20)).toBe(game);
    expect(game.hand).toHaveLength(1);
    expect(game.pendingActions).toHaveLength(2);
    game = setPaused(game, false);
    expect(game.problems[0].submitQueued).toBe(true);
    game = advanceMatch(game, 4);
    expect(game.problems[0].attempts).toHaveLength(1);
    expect(game.problems[0].submitQueued).toBe(false);
    game = advanceMatch(game, 20);
    expect(game.problems[0].attempts).toHaveLength(1);
  });
  it('预约随题保存，题目非当前不提交；恢复队列顺序执行', () => {
    let game = withHand(match(), ['enumerate']);
    ready(game);
    game.problems[0].difficulty = 100000;
    game = setPaused(game, true);
    game = act(game, { type: 'play', uids: ['test-0'] });
    game = act(game, { type: 'submit' });
    game = act(game, { type: 'switch', problem: 1 });
    game = setPaused(game, false);
    game = advanceMatch(game, 20);
    expect(game.problems[0].attempts).toHaveLength(0);
    game = act(game, { type: 'switch', problem: 0 });
    game = advanceMatch(game, 4);
    expect(game.problems[0].attempts).toHaveLength(1);
  });
  it('已就绪的预排提交在后续弃牌前执行', () => {
    let game = match();
    ready(game);
    game.problems[0].table = [table('enumerate')];
    game.problems[0].difficulty = 100000;
    game = setPaused(game, true);
    game = act(game, { type: 'submit' });
    game = act(game, { type: 'discard-table', uids: ['enumerate'] });
    game = setPaused(game, false);
    expect(game.problems[0].attempts).toHaveLength(1);
    expect(game.problems[0].table).toHaveLength(0);
  });
  it('WA后仅修改牌桌能再次提交，切题/等待/弃手牌无效', () => {
    let game = match();
    ready(game);
    game.problems[0].table = [table('enumerate'), table('binary-search')];
    game.problems[0].difficulty = 100000;
    game = act(game, { type: 'submit' });
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
    expect(profile.collection).toEqual({});
    expect(profile.deck).toEqual([]);
    expect(profile.packs).toHaveLength(8);
    expect(new Set(profile.packs.map(pack => pack.id)).size).toBe(8);
    expect(profile.packs.every(pack => pack.eventId === 'starter' && pack.guarantee === 0)).toBe(true);
    expect(nextSeason(profile)).toBe(profile);
  });
  it('组卡不超过收藏或24张，允许实际持有的同名复数', () => {
    const profile = profileWithDeck();
    expect(setDeck(profile, ['enumerate', 'enumerate']).deck).toHaveLength(2);
    expect(setDeck(profile, ['enumerate', 'enumerate', 'enumerate'])).toBe(profile);
    expect(setDeck(profile, [...profile.deck, 'enumerate'])).toBe(profile);
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
    expect(next.season).toBe(2);
    expect(next.collection).toEqual(profile.collection);
    expect(next.deck).toEqual(profile.deck);
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
    expect(settled.result.packs).toBe(4);
    profile = settled.profile;
    expect(availableEvents(profile).map(e => e.id)).toEqual(['online', 'provincial', 'invitational']);
    const side = startMatch(profile, 'provincial', 1);
    side.status = 'finished';
    profile = settleMatch(profile, side).profile;
    expect(profile.mainIndex).toBe(1);
    expect(profile.seasonEnded).toBe(false);
    expect(availableEvents(profile).map(e => e.id)).toEqual(['online', 'invitational']);
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
    const collected = collectCard(opened.profile, opened.cards[0]);
    expect(collected.collection[opened.cards[0]]).toBe((profile.collection[opened.cards[0]] ?? 0) + 1);
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
    expect(profile.packs).toHaveLength(28);
    profile = nextSeason(profile);
    expect(profile.playedEvents).toEqual([]);
    expect(availableEvents(profile).map(event => event.id)).toEqual(['school']);
    expect(profile.packs).toHaveLength(28);
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
    const purpleGuarantee = rollPack(4, rngSequence([...Array(12).fill(0), 0.6]));
    expect(cardById[purpleGuarantee[4]].rarity).toBe(5);
  });
  it('算法8个档位均有卡池，四种技巧固定稀有度', () => {
    for (let rarity = 0; rarity < 8; rarity++) expect(cards.some(card => card.type === 'algorithm' && card.rarity === rarity)).toBe(true);
    expect(cards.filter(card => card.type === 'technique').map(card => card.rarity)).toEqual([0, 1, 2, 3]);
  });
});
