import { test, expect, type Page } from '@playwright/test';
import { cards, events } from '../src/content/data';
import { processMatchAchievements } from '../src/game/achievements';
import { createProfile, startMatch } from '../src/game/engine';
import type { Match, Profile } from '../src/game/types';
import type { OpenedPack } from '../src/ui/Packs';
import { createTestProfile } from './fixtures';

async function state(page: Page): Promise<{ profile: Profile; match: Match | null }> {
  return page.evaluate(() => JSON.parse(localStorage.getItem('xcpcard-save')!));
}
async function load(page: Page, profile: Profile, match: Match | null = null, openedPack: OpenedPack | null = null) {
  await page.goto('/');
  await page.evaluate(session => localStorage.setItem('xcpcard-save', JSON.stringify(session)), { profile, match, result: null, openedPack });
  await page.reload();
}
async function fixedClock(page: Page) {
  await page.clock.install({ time: new Date('2026-01-01T00:00:00Z') });
  await page.clock.pauseAt(new Date('2026-01-01T00:00:01Z'));
}
const sorting = ['quick-sort', 'insertion-sort', 'bubble-sort', 'selection-sort', 'counting-sort', 'merge-sort'];

test('翻牌后入藏，重复点击只收一次；卡牌奖励与通知刷新持久化', async ({ page }) => {
  const profile = createProfile();
  profile.collection = Object.fromEntries(sorting.slice(0, 5).map(id => [id, 1]));
  profile.achievements.collected = Object.keys(profile.collection);
  profile.packs = [];
  await load(page, profile, null, { eventId: 'starter', cards: ['merge-sort', 'enumerate', 'enumerate', 'enumerate', 'enumerate'], revealed: [] });
  expect((await state(page)).profile.achievements.unlocked).toEqual([]);
  expect((await state(page)).profile.collection['merge-sort']).toBeUndefined();
  await page.getByRole('button', { name: '翻开第 1 张卡', exact: true }).evaluate(button => {
    (button as HTMLButtonElement).click();
    (button as HTMLButtonElement).click();
  });
  let updated = (await state(page)).profile;
  expect(updated.collection['merge-sort']).toBe(1);
  expect(updated.collection['binary-heap']).toBe(1);
  expect(updated.deck).toEqual([]);
  expect(updated.achievements.rewarded).toEqual(['sorting:1']);
  expect(updated.achievements.notifications).toEqual(['sorting:1']);
  await expect(page.getByRole('region', { name: '成就解锁' })).toHaveCount(0);
  await page.reload();
  expect((await state(page)).profile).toEqual(updated);
  await page.getByRole('button', { name: '一键全开 →', exact: true }).click();
  await page.getByRole('button', { name: '收好，下一包。 →', exact: true }).click();
  const unlocks = page.getByRole('region', { name: '成就解锁' });
  await expect(unlocks).toContainText('排序全家桶');
  await expect(unlocks).toContainText('二叉堆 ×1');
  await page.reload();
  await expect(unlocks).toBeVisible();
  await unlocks.getByRole('button', { name: '收下这份荣誉 →' }).click();
  updated = (await state(page)).profile;
  expect(updated.achievements.notifications).toEqual([]);
  await page.reload();
  await expect(unlocks).toHaveCount(0);
  expect((await state(page)).profile).toEqual(updated);
  await page.getByRole('button', { name: '成就', exact: true }).click();
  await expect(page.locator('[data-achievement="sorting"] .achievement-card')).toHaveClass(/is-unlocked/);
  await page.locator('[data-achievement="sorting"] .achievement-card').focus();
  await expect(page.getByRole('tooltip')).toContainText('已到账');
  await expect(page.getByRole('tooltip')).toContainText(`${profile.season} 赛季 · 校赛`);
});

test('兑换触发几何成就，奖励卡包显示成就来源并可正常翻开', async ({ page }) => {
  const geometry = cards.filter(card => card.categories.includes('计算几何')).slice(0, 5);
  const profile = createProfile();
  profile.collection = Object.fromEntries(geometry.slice(0, 4).map(card => [card.id, 1]));
  profile.achievements.collected = Object.keys(profile.collection);
  profile.packs = [];
  profile.trainingPoints = 100;
  profile.trainingOffers = [{ id: 'geometry-offer', kind: 'card', cardId: geometry[4].id, price: 100, purchased: false }];
  await load(page, profile);
  await page.getByRole('button', { name: '加训', exact: true }).click();
  await page.locator('.training-cards .training-item button').click();
  const updated = (await state(page)).profile;
  expect(updated.trainingPoints).toBe(0);
  expect(updated.collection[geometry[4].id]).toBe(1);
  expect(updated.packs).toHaveLength(1);
  expect(updated.packs[0]).toMatchObject({ eventId: 'achievement', achievementId: 'geometry', levelId: '1' });
  await expect(page.locator('.training-cards .training-item button')).toBeDisabled();
  await page.getByRole('region', { name: '成就解锁' }).getByRole('button', { name: '收下这份荣誉 →', exact: true }).click();
  await page.getByRole('button', { name: /^卡包/ }).click();
  await expect(page.locator('.pack-item')).toContainText('成就奖励 · 几何不会就是不会');
  await page.locator('.pack-item').click();
  await expect(page.locator('.pack-open-heading')).toContainText('成就奖励 · 几何不会就是不会');
  expect((await state(page)).profile.collection).toEqual(updated.collection);
  await page.getByRole('button', { name: '一键全开 →', exact: true }).click();
  await expect(page.locator('.reveal-rarity')).toHaveCount(5);
  expect(Object.values((await state(page)).profile.collection).reduce((a, b) => a + b, 0)).toBe(10);
  await page.getByRole('button', { name: '收好，下一包。 →', exact: true }).click();
  expect((await state(page)).profile.packs).toHaveLength(0);
});

test('公布多题结果才解锁，原生对话框排队，三类奖励和隐藏内容一致', async ({ page }) => {
  await fixedClock(page);
  const profile = createTestProfile();
  const match = startMatch(profile, 'school', 42);
  match.time = 295;
  const first = match.problems[0];
  first.attempts = (['WA', 'TLE', 'MLE', 'RE'] as const).map((verdict, i) => ({ time: 240 + i, result: 'WA', verdict, score: 0 }));
  for (const problem of match.problems.slice(0, 2)) {
    problem.judging = { duration: 1000, remaining: 1000, attempt: { time: 295, result: 'AC', verdict: 'AC', score: 0 }, text: '过了，别碰它。' };
  }
  await load(page, profile, match);
  expect((await state(page)).profile.achievements.unlocked).toEqual([]);
  await page.getByRole('button', { name: '▶ 继续比赛', exact: true }).click();
  await page.getByRole('button', { name: /^牌库，/ }).click();
  await page.clock.runFor(900);
  expect((await state(page)).profile.achievements.unlocked).toEqual([]);
  await page.clock.runFor(100);
  await expect.poll(async () => (await state(page)).profile.achievements.unlocked).toEqual(expect.arrayContaining(['retry:1', 'retry:3', 'sample:1', 'last-minute:1', 'proof:1', 'verdicts:1']));
  let updated = (await state(page)).profile;
  expect(updated.achievements.unlocked).not.toContain('retry:5');
  expect(updated.trainingPoints).toBe(200);
  expect(updated.achievements.unlocked).not.toContain('warmup:1');
  expect(updated.collection.coffee).toBe(profile.collection.coffee);
  expect(updated.collection.template).toBe(profile.collection.template + 1);
  expect(updated.deck).toEqual(profile.deck);
  expect(updated.packs).toHaveLength(2);
  expect((await state(page)).match!.problems.slice(0, 2).map(problem => problem.acTime)).toEqual([295, 295]);
  await expect(page.getByRole('region', { name: '成就解锁' })).toHaveCount(0);
  await page.getByRole('button', { name: '关闭牌库', exact: true }).click();
  const unlocks = page.getByRole('region', { name: '成就解锁' });
  await expect(unlocks.locator('.achievement-unlock')).toHaveCount(6);
  await page.getByRole('button', { name: 'Ⅱ 暂停', exact: true }).click();
  updated = (await state(page)).profile;
  await page.reload();
  await expect(unlocks.locator('.achievement-unlock')).toHaveCount(6);
  expect((await state(page)).profile).toEqual(updated);
  await page.setViewportSize({ width: 1040, height: 844 });
  await page.screenshot({ path: 'test-results/achievement-unlocks-compact.png', animations: 'disabled' });
  await unlocks.getByRole('button', { name: '收下这份荣誉 →', exact: true }).click();
  await page.getByRole('button', { name: '保存并离场 ↗' }).click();
  await page.getByRole('button', { name: '成就', exact: true }).click();
  await page.locator('[data-achievement="last-minute"] .achievement-card').focus();
  await expect(page.getByRole('tooltip')).toContainText('已到账');
  await expect(page.getByRole('tooltip')).toContainText(`${profile.season} 赛季 · 校赛`);
  await expect(page.locator('.achievement-card.is-hidden')).toHaveCount(8);
  await expect(page.locator('.achievements')).not.toContainText('来都来了');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(1040);
  await page.screenshot({ path: 'test-results/achievements-compact.png', fullPage: true, animations: 'disabled' });
});

for (const verdict of ['AC', 'WA'] as const) {
  test(`跨题公布顺序颠倒，较早提交最终 ${verdict}，热身奖励在结算时正确判定`, async ({ page }) => {
    await fixedClock(page);
    const profile = createTestProfile();
    const match = startMatch(profile, 'school', 42);
    match.time = 300;
    match.status = 'finished';
    match.problems[0].judging = { duration: 2000, remaining: 2000, attempt: { time: 239, result: verdict, verdict, score: 5000 }, text: verdict };
    match.problems[1].judging = { duration: 1000, remaining: 1000, attempt: { time: 240, result: 'AC', verdict: 'AC', score: 5000 }, text: 'AC' };
    await load(page, profile, match);
    await page.clock.runFor(1000);
    let saved = await state(page);
    expect(saved.match!.problems[1].acTime).toBe(240);
    expect(saved.match!.problems[0].judging).toBeDefined();
    expect(saved.profile.achievements.unlocked).not.toContain('warmup:1');
    expect(saved.profile.achievements.notifications).not.toContain('warmup:1');
    expect(saved.profile.collection.coffee).toBe(profile.collection.coffee);
    await expect(page.locator('.result-modal')).toHaveCount(0);
    await page.reload();
    await page.clock.runFor(1000);
    await expect(page.locator('.result-modal')).toBeVisible();
    saved = await state(page);
    expect(saved.profile.achievements.unlocked.includes('warmup:1')).toBe(verdict === 'WA');
    expect(saved.profile.achievements.rewarded.filter(id => id === 'warmup:1')).toHaveLength(verdict === 'WA' ? 1 : 0);
    expect(saved.profile.achievements.notifications.filter(id => id === 'warmup:1')).toHaveLength(verdict === 'WA' ? 1 : 0);
    expect(saved.profile.collection.coffee).toBe(profile.collection.coffee + (verdict === 'WA' ? 1 : 0));
    await page.reload();
    expect((await state(page)).profile).toEqual(saved.profile);
  });
}

test('旧档载入立即发放收藏成就奖励，刷新不重复且不回溯旧比赛', async ({ page }) => {
  await fixedClock(page);
  const profile = createProfile();
  profile.collection = Object.fromEntries(sorting.map(id => [id, 1]));
  profile.packs = [];
  const match = startMatch(profile, 'school', 42);
  match.problems[0].attempts = [{ time: 250, result: 'AC', verdict: 'AC', score: 0 }];
  match.problems[0].acTime = 250;
  const { achievements, ...legacy } = profile;
  await load(page, legacy as Profile, match);
  const restored = (await state(page)).profile;
  expect(restored.achievements.collected).toEqual([...sorting, 'binary-heap']);
  expect(restored.achievements.unlocked).toEqual(['sorting:1']);
  expect(restored.achievements.rewarded).toEqual(['sorting:1']);
  expect(restored.achievements.notifications).toEqual(['sorting:1']);
  expect(restored.collection['binary-heap']).toBe(1);
  expect(restored.trainingPoints).toBe(0);
  const unlocks = page.getByRole('region', { name: '成就解锁' });
  await expect(unlocks).toContainText('排序全家桶');
  await expect(unlocks).toContainText('二叉堆 ×1');
  await page.reload();
  expect((await state(page)).profile).toEqual(restored);
  await unlocks.getByRole('button', { name: '收下这份荣誉 →', exact: true }).click();
  await page.getByRole('button', { name: '▶ 继续比赛', exact: true }).click();
  await page.clock.runFor(1000);
  expect((await state(page)).profile.achievements.unlocked).toEqual(['sorting:1']);
  await page.getByRole('button', { name: '保存并离场 ↗' }).click();
  await page.getByRole('button', { name: '成就', exact: true }).click();
  await page.locator('[data-achievement="sorting"] .achievement-card').focus();
  await expect(page.getByRole('tooltip')).toContainText('已到账');
  await expect(page.getByRole('tooltip')).toContainText(`${profile.season} 赛季 · 校赛`);
  await page.reload();
  await expect(unlocks).toHaveCount(0);
  expect((await state(page)).profile.achievements.unlocked).toEqual(['sorting:1']);
  expect((await state(page)).profile.achievements.rewarded).toEqual(['sorting:1']);
  expect((await state(page)).profile.collection['binary-heap']).toBe(1);
  expect((await state(page)).profile.trainingPoints).toBe(0);
});

for (const [eventId, title, guarantee] of [['ecf', 'EC-Final', 3], ['wf', 'World Finals', 4]] as const) {
  test(`没有前级金牌时，${title} 金牌独立解锁并持久化奖励`, async ({ page }) => {
    const profile = createTestProfile();
    const match = startMatch(profile, eventId, 42);
    match.status = 'finished';
    match.time = 300;
    match.problems[0].attempts = [{ time: 100, result: 'AC', verdict: 'AC', score: 5000 }];
    match.problems[0].acTime = 100;
    match.opponents.forEach(opponent => opponent.results.forEach(problem => { problem.acTime = null; }));
    await load(page, profile, match);
    await expect(page.locator('.result-modal')).toBeVisible();
    const settled = (await state(page)).profile;
    expect(settled.history[0].medal).toBe('gold');
    expect(settled.achievements.progress[`gold:${eventId}`]).toBe(1);
    expect(settled.achievements.unlocked.filter(id => id.startsWith('gold:'))).toEqual([`gold:${eventId}`]);
    expect(settled.packs.filter(pack => pack.achievementId === 'gold')).toEqual([
      { id: `achievement:gold:${eventId}`, eventId: 'achievement', achievementId: 'gold', levelId: eventId, guarantee },
    ]);
    await page.reload();
    expect((await state(page)).profile).toEqual(settled);
    await page.getByRole('button', { name: '领取卡包 →', exact: true }).click();
    const unlocks = page.getByRole('region', { name: '成就解锁' });
    await expect(unlocks).toContainText('金牌只是起点');
    await expect(unlocks).toContainText(title);
    await unlocks.getByRole('button', { name: '收下这份荣誉 →', exact: true }).click();
    await page.getByRole('button', { name: '成就', exact: true }).click();
    const gold = page.locator('[data-achievement="gold"]');
    const card = gold.locator('.achievement-card');
    await expect(card).toHaveCount(1);
    await expect(gold.locator('.achievement-stack-edge')).toHaveCount(2);
    await expect(card).toHaveAttribute('data-level', eventId);
    await expect(card).toHaveClass(/is-unlocked/);
    await card.focus();
    await expect(page.getByRole('tooltip')).toContainText(`获得${title}金牌`);
    await expect(page.getByRole('tooltip')).toContainText(`${profile.season} 赛季 · ${events.find(event => event.id === eventId)!.name}`);
    const ids = ['regional', 'ecf', 'wf'];
    for (let step = 1; step <= ids.length; step++) {
      await card.click();
      const id = ids[(ids.indexOf(eventId) + step) % ids.length];
      await expect(card).toHaveAttribute('data-level', id);
      await expect(card).toHaveClass(id === eventId ? /is-unlocked/ : /is-locked/);
      await expect(page.getByRole('tooltip')).toContainText(`获得${['区域赛', 'EC-Final', 'World Finals'][ids.indexOf(id)]}金牌`);
    }
  });
}

test('最后一发公布后结算，通知等待领取，刷新和换季保留奖励记录', async ({ page }) => {
  await fixedClock(page);
  const profile = createTestProfile();
  const match = startMatch(profile, 'wf', 42);
  match.time = 300;
  match.status = 'finished';
  match.problems[0].judging = { duration: 1000, remaining: 1000, attempt: { time: 299, result: 'AC', verdict: 'AC', score: 0 }, text: '过了，别碰它。' };
  await load(page, profile, match);
  await expect(page.locator('.result-modal')).toHaveCount(0);
  expect((await state(page)).profile.achievements.unlocked).toEqual([]);
  await page.clock.runFor(1000);
  await expect(page.locator('.result-modal')).toBeVisible();
  await expect.poll(async () => (await state(page)).profile.history.length).toBe(1);
  const settled = (await state(page)).profile;
  expect(settled.achievements.notifications).toEqual(expect.arrayContaining(['sample:1', 'last-minute:1', 'warmup:1', 'proof:1', 'gold:wf']));
  expect(settled.packs.filter(pack => pack.achievementId === 'gold')).toEqual([
    { id: 'achievement:gold:wf', eventId: 'achievement', achievementId: 'gold', levelId: 'wf', guarantee: 4 },
  ]);
  expect(settled.trainingPoints).toBe(150);
  expect(settled.seasonEnded).toBe(true);
  await expect(page.getByRole('region', { name: '成就解锁' })).toHaveCount(0);
  await page.reload();
  await expect(page.locator('.result-modal')).toBeVisible();
  expect((await state(page)).profile).toEqual(settled);
  await page.getByRole('button', { name: '领取卡包 →', exact: true }).click();
  const unlocks = page.getByRole('region', { name: '成就解锁' });
  await expect(unlocks.locator('.achievement-unlock')).toHaveCount(5);
  await unlocks.getByRole('button', { name: '收下这份荣誉 →', exact: true }).click();
  await page.getByRole('button', { name: '大厅', exact: true }).click();
  await page.getByRole('button', { name: '开启下一季 →', exact: true }).click();
  await expect.poll(async () => (await state(page)).profile.season).toBe(profile.season + 1);
  let updated = (await state(page)).profile;
  expect(updated.achievements.unlocked).toEqual(settled.achievements.unlocked);
  expect(updated.achievements.rewarded).toEqual(settled.achievements.rewarded);
  expect(updated.achievements.unlockedAt).toEqual(settled.achievements.unlockedAt);
  expect(updated.achievements.notifications).toEqual([]);
  expect(updated.trainingPoints).toBe(settled.trainingPoints);
  expect(updated.collection).toEqual(settled.collection);
  expect(updated.packs).toEqual(settled.packs);
  await page.reload();
  await expect(unlocks).toHaveCount(0);
  updated = (await state(page)).profile;
  expect(updated.achievements.rewarded).toEqual(settled.achievements.rewarded);
  expect(updated.trainingPoints).toBe(settled.trainingPoints);
});

for (const width of [1440, 1040]) {
  test(`${width}px 成就卡三态、系列叠放、悬停详情和键盘操作`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    const profile = createTestProfile();
    profile.season = 2028;
    profile.mainIndex = 2;
    profile.collection = Object.fromEntries(sorting.slice(0, 5).map(id => [id, 1]));
    profile.achievements.collected = Object.keys(profile.collection);
    const match = startMatch(profile, 'invitational', 42);
    match.problems[0].attempts = [...[1, 2, 3].map(time => ({ time, result: 'WA' as const, verdict: 'WA' as const, score: 0 })),
      { time: 295, result: 'AC', verdict: 'AC', score: 5000 }];
    match.problems[0].acTime = 295;
    match.problems[1].attempts = [{ time: 100, result: 'AC', verdict: 'AC', score: 5000 }];
    match.problems[1].acTime = 100;
    const updated = processMatchAchievements(profile, match);
    updated.achievements.notifications = [];
    await load(page, updated);
    await page.getByRole('button', { name: '成就', exact: true }).click();
    expect(await page.locator('.achievement-list > .achievement-stack').evaluateAll(stacks => stacks.map(stack => stack.getAttribute('data-achievement')))).toEqual([
      'last-minute', 'sample', 'sorting', 'geometry', 'gold', 'retry', 'penalty', 'segment-tree', 'automaton', 'reader',
      'warmup', 'proof', 'verdicts', 'attendance', 'false-advertising', 'unlucky', 'brute-force', 'gambler', 'caffeine-rhythm', 'ancestor',
    ]);

    const locked = page.locator('[data-achievement="sorting"] .achievement-card');
    const unlocked = page.locator('[data-achievement="sample"] .achievement-card');
    await expect(locked).toHaveClass(/is-locked/);
    await expect(locked).toContainText('5 / 6');
    await expect(locked.getByRole('progressbar')).toHaveAttribute('value', '5');
    await expect(locked.getByRole('progressbar')).toHaveAttribute('max', '6');
    await expect(unlocked).toHaveClass(/is-unlocked/);
    await expect(unlocked.getByRole('progressbar')).toHaveCount(0);
    await expect(unlocked).toHaveText('样例居然没骗人2028 赛季 · 邀请赛');
    await expect(locked).toHaveText('排序全家桶5 / 6');
    expect(await unlocked.evaluate(card => getComputedStyle(card).backgroundColor))
      .not.toBe(await locked.evaluate(card => getComputedStyle(card).backgroundColor));
    const cardBox = await locked.boundingBox();
    expect(cardBox!.width / cardBox!.height).toBeCloseTo(183 / 125, 2);
    const frontCards = await page.locator('.achievement-list > .achievement-stack').evaluateAll(stacks => stacks.map(stack => {
      const rect = stack.lastElementChild!.getBoundingClientRect();
      return { top: rect.top, width: rect.width };
    }));
    expect(frontCards.slice(0, 5).every(card => Math.abs(card.top - frontCards[0].top) < 1)).toBe(true);
    expect(frontCards[5].top).toBeGreaterThan(frontCards[0].top);
    expect(frontCards.every(card => card.width < 260)).toBe(true);

    await locked.hover();
    const tooltip = page.getByRole('tooltip');
    await expect(tooltip).toContainText('排序全家桶');
    await expect(tooltip).toContainText('曾入藏快速、插入、冒泡、选择、计数和归并排序各一张');
    await expect(tooltip).toContainText('尚未解锁');
    await page.locator('[data-achievement="geometry"] .achievement-card').focus();
    await expect(tooltip).toHaveCount(1);
    await expect(tooltip).toContainText('几何不会就是不会');
    await unlocked.focus();
    await expect(unlocked).toBeFocused();
    await expect(tooltip).toHaveCount(1);
    await expect(tooltip).toContainText('2028 赛季 · 邀请赛');
    await locked.hover();
    await expect(tooltip).toHaveCount(1);
    await expect(tooltip).toContainText('排序全家桶');
    await page.mouse.move(0, 0);
    await expect(tooltip).toHaveCount(0);
    await unlocked.hover();
    await expect(tooltip).toContainText('某题首次提交即 AC');
    await expect(tooltip).toContainText('2028 赛季 · 邀请赛');
    await expect(tooltip).toContainText('50 训练点 · 已到账');
    await page.mouse.move(0, 0);

    const series = page.locator('[data-achievement="retry"]');
    await expect(series).toHaveClass(/is-series/);
    const seriesCard = series.locator('.achievement-card');
    await expect(seriesCard).toHaveCount(1);
    await expect(seriesCard).toHaveAttribute('data-level', '3');
    await expect(seriesCard).toHaveClass(/is-unlocked/);
    await expect(series.locator('.achievement-stack-edge')).toHaveCount(2);
    await series.scrollIntoViewIfNeeded();
    const edges = await series.evaluate(stack => {
      const card = stack.querySelector('.achievement-card')!.getBoundingClientRect();
      return [...stack.querySelectorAll('.achievement-stack-edge')].map(edge => {
        const rect = edge.getBoundingClientRect();
        return { down: rect.top - card.top, right: rect.right - card.right };
      });
    });
    for (const [index, edge] of edges.entries()) {
      expect(edge.down).toBeCloseTo((index + 1) * 4, 1);
      expect(edge.right).toBeCloseTo((index + 1) * 4, 1);
    }
    for (const [id, title, condition] of [['5', '第 3 级', '至少 5 次'], ['1', '第 1 级', '至少 1 次'], ['3', '第 2 级', '至少 3 次']]) {
      await seriesCard.click();
      await expect(seriesCard).toHaveAttribute('data-level', id);
      await expect(seriesCard).toHaveClass(id === '5' ? /is-locked/ : /is-unlocked/);
      await expect(tooltip).toContainText(`再交一发就过 · ${title}`);
      await expect(tooltip).toContainText(condition);
      if (id === '5') await expect(seriesCard).toContainText('3 / 5');
      else await expect(seriesCard).toContainText('2028 赛季 · 邀请赛');
    }
    await seriesCard.press('Enter');
    await expect(seriesCard).toHaveAttribute('data-level', '5');
    await expect(tooltip).toContainText('第 3 级');
    await seriesCard.press('Space');
    await expect(seriesCard).toHaveAttribute('data-level', '1');
    await expect(tooltip).toContainText('第 1 级');
    await seriesCard.press('Tab');
    await page.mouse.move(0, 0);

    const hidden = page.locator('[data-achievement="attendance"] .achievement-card');
    await expect(hidden).toHaveClass(/is-hidden/);
    await expect(hidden).toHaveAccessibleName('隐藏成就');
    await expect(hidden).not.toContainText('来都来了');
    await hidden.hover();
    await expect(tooltip).toHaveText('隐藏成就');
    const tipBox = await tooltip.boundingBox();
    expect(tipBox!.x).toBeGreaterThanOrEqual(0);
    expect(tipBox!.x + tipBox!.width).toBeLessThanOrEqual(width);
    expect(tipBox!.y).toBeGreaterThanOrEqual(0);
    expect(tipBox!.y + tipBox!.height).toBeLessThanOrEqual(844);
    await page.mouse.move(0, 0);
    await expect(tooltip).toHaveCount(0);

    await locked.focus();
    await expect(tooltip).toContainText('排序全家桶');
    await page.keyboard.press('Tab');
    await expect(page.locator('[data-achievement="geometry"] .achievement-card')).toBeFocused();
    await expect(tooltip).toContainText('几何不会就是不会');
    await page.keyboard.press('Escape');
    await expect(tooltip).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
    await page.screenshot({ path: `test-results/achievement-cards-${width}.png`, fullPage: true, animations: 'disabled' });

    await page.reload();
    await page.getByRole('button', { name: '成就', exact: true }).click();
    await unlocked.focus();
    await expect(tooltip).toHaveCount(1);
    await expect(tooltip).toContainText('2028 赛季 · 邀请赛');
    expect((await state(page)).profile.achievements.unlockedAt).toEqual(updated.achievements.unlockedAt);
  });
}

test('已有成就的旧档保留卡面与奖励，解锁时间显示未记录', async ({ page }) => {
  const profile = createProfile();
  profile.achievements.unlocked = ['sample:1'];
  profile.achievements.rewarded = ['sample:1'];
  profile.achievements.progress['first-try'] = 1;
  const { unlockedAt, ...legacyAchievements } = profile.achievements;
  const legacy = { ...profile, achievements: legacyAchievements } as Profile;
  await load(page, legacy);
  await page.getByRole('button', { name: '成就', exact: true }).click();
  const card = page.locator('[data-achievement="sample"] .achievement-card');
  await expect(card).toHaveClass(/is-unlocked/);
  await card.focus();
  await expect(page.getByRole('tooltip')).toContainText('未记录');
  await expect(page.getByRole('tooltip')).toContainText('50 训练点 · 已到账');
  expect((await state(page)).profile.trainingPoints).toBe(profile.trainingPoints);
  await page.reload();
  expect((await state(page)).profile.achievements.unlockedAt).toEqual({});
});
