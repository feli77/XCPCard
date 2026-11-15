import { test, expect, type Page } from '@playwright/test';
import { cardById, startMatch } from '../src/game/engine';

import { createTestProfile } from './fixtures';

const storageKey = 'xcpcard-save';
test.beforeEach(async ({ page }) => {
  await page.addInitScript(({ key, profile }) => {
    if (!localStorage.getItem(key)) {
      localStorage.setItem(key, JSON.stringify({ profile, match: null, result: null, openedPack: null }));
    }
  }, { key: storageKey, profile: createTestProfile() });
});

async function state(page: Page) { return page.evaluate(key => JSON.parse(localStorage.getItem(key)!), storageKey); }
async function start(page: Page) {
  await page.clock.install();
  await page.goto('/');
  await page.getByRole('button', { name: '参加比赛' }).click();
  await expect(page.locator('.hand-cards .game-card')).toHaveCount(8);
}
async function elapsed(page: Page, seconds: number) { await page.clock.runFor(seconds * 1000); }

test('contest speed switches between 1x, 2x and 4x and respects pause', async ({ page }) => {
  await start(page);
  const slider = page.getByRole('slider', { name: '比赛速度' });
  await expect(slider).toHaveAttribute('aria-valuetext', '1x');
  await elapsed(page, 2);
  expect((await state(page)).match.time).toBe(2);

  await slider.click();
  await elapsed(page, 2);
  expect((await state(page)).match.time).toBe(6);
  const problem = (await state(page)).match.problems[0];
  expect(problem.readProgress).toBe(Math.min(6, problem.readTime));

  const bounds = (await slider.boundingBox())!;
  await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
  await page.mouse.down();
  await page.mouse.move(bounds.x + bounds.width * 5 / 6, bounds.y + bounds.height / 2, { steps: 5 });
  await page.mouse.up();
  await expect(slider).toHaveAttribute('aria-valuetext', '4x');
  await elapsed(page, 2);
  expect((await state(page)).match.time).toBe(14);
  await expect(page.locator('.score-strip')).toBeVisible();
  await page.screenshot({ path: 'test-results/match-speed.png', fullPage: true });

  await page.getByRole('button', { name: 'Ⅱ 暂停', exact: true }).click();
  const paused = (await state(page)).match;
  await slider.press('ArrowLeft');
  await elapsed(page, 2);
  expect((await state(page)).match).toEqual(paused);
  await page.getByRole('button', { name: '▶ 继续比赛', exact: true }).click();
  await elapsed(page, 2);
  expect((await state(page)).match.time).toBe(18);

  await slider.press('Home');
  await elapsed(page, 2);
  expect((await state(page)).match.time).toBe(20);
  await slider.press('End');
  await elapsed(page, 70);
  await expect(page.locator('.result-modal')).toBeVisible();
  expect((await state(page)).match.time).toBe(300);
  await expect(slider).toBeDisabled();
  await page.getByRole('button', { name: '领取卡包 →', exact: true }).click();
  await page.getByRole('button', { name: '大厅', exact: true }).click();
  await page.getByRole('button', { name: '开启下一季' }).click();
  await page.getByRole('button', { name: '参加比赛' }).click();
  await expect(slider).toHaveAttribute('aria-valuetext', '1x');
});

test('leaderboard highlights first blood and preserves tied winners after reload', async ({ page }) => {
  const profile = createTestProfile();
  const match = startMatch(profile, 'school', 7);
  match.time = 90;
  match.problems[0].acTime = 30;
  match.problems[0].attempts = [{ time: 30, result: 'AC', score: 1000 }];
  match.problems[1].acTime = 90;
  match.problems[1].attempts = [{ time: 90, result: 'AC', score: 1000 }];
  for (const opponent of match.opponents.slice(0, 2)) {
    opponent.results[0] = { acTime: 30, attempts: 1 };
    opponent.results[1] = { acTime: 60, attempts: 1 };
  }
  await page.goto('/');
  await page.evaluate(([key, value]) => localStorage.setItem(key, value), [storageKey, JSON.stringify({ profile, match, result: null, openedPack: null })]);
  await page.reload();
  const firstBloods = page.locator('.team-problems button.first-blood');
  await expect(firstBloods).toHaveCount(2);
  const playerFirst = page.locator('.rank-table .you .team-problems button').nth(0);
  await expect(playerFirst).toHaveAttribute('title', /一血/);
  await expect(playerFirst).toHaveCSS('background-color', 'rgb(79, 112, 61)');
  await expect(page.locator('.rank-table .you .team-problems button').nth(1)).toHaveCSS('background-color', 'rgb(153, 170, 125)');
  const winner = await firstBloods.evaluateAll(buttons => buttons.map(button => button.closest('tr')!.textContent));
  await page.screenshot({ path: 'test-results/first-blood.png', fullPage: true });
  await page.reload();
  await expect(firstBloods).toHaveCount(2);
  expect(await firstBloods.evaluateAll(buttons => buttons.map(button => button.closest('tr')!.textContent))).toEqual(winner);
});

test('screen-edge countdown follows contest time, pause, warning thresholds and viewport size', async ({ page }) => {
  await start(page);
  const frame = page.locator('.contest-countdown');
  const path = frame.locator('path');
  await expect(frame).toHaveCSS('color', 'rgb(105, 126, 85)');
  await expect(path).toHaveAttribute('stroke-dasharray', '1000 1000');
  await expect(frame).toHaveCSS('pointer-events', 'none');

  await elapsed(page, 150);
  await expect(path).toHaveAttribute('stroke-dasharray', '500 1000');
  await expect(path).toHaveAttribute('stroke-dashoffset', '-500');
  await page.getByRole('button', { name: 'Ⅱ 暂停', exact: true }).click();
  await elapsed(page, 10);
  await expect(path).toHaveAttribute('stroke-dashoffset', '-500');
  await page.setViewportSize({ width: 1366, height: 768 });
  await expect(frame).toHaveJSProperty('clientWidth', 1366);
  await expect(frame).toHaveJSProperty('clientHeight', 768);
  await expect.poll(() => path.evaluate(element => (element as SVGPathElement).getBBox().width)).toBe(1356);
  await page.screenshot({ path: 'test-results/countdown-half.png', animations: 'disabled' });
  await page.getByRole('button', { name: '▶ 继续比赛', exact: true }).click();

  await elapsed(page, 89);
  await expect(frame).toHaveCSS('color', 'rgb(105, 126, 85)');
  await elapsed(page, 1);
  await expect(frame).toHaveCSS('color', 'rgb(179, 154, 75)');
  await elapsed(page, 29);
  await expect(frame).toHaveCSS('color', 'rgb(179, 154, 75)');
  await elapsed(page, 1);
  await expect(frame).toHaveCSS('color', 'rgb(176, 103, 93)');
  await page.screenshot({ path: 'test-results/countdown-critical.png', animations: 'disabled' });
  await elapsed(page, 30);
  await expect(path).toHaveAttribute('stroke-dasharray', '0 1000');
  await expect(page.locator('.result-modal')).toBeVisible();
});

test('lobby and deck edits allow fewer cards and obey owned copies and the 32-card limit', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /下一站，校赛/ })).toBeVisible();
  await page.screenshot({ path: 'test-results/lobby.png', fullPage: true });
  await page.getByRole('button', { name: '收藏', exact: true }).click();
  await page.locator('.deck-slots button').filter({ hasText: '枚举' }).click();
  await expect(page.locator('.deck-count')).toHaveText('23 / 32');
  await expect(page.locator('.deck-state')).toHaveText('■ 可以参赛');
  await page.getByRole('button', { name: '大厅', exact: true }).click();
  await expect(page.getByRole('button', { name: '参加比赛' })).toBeEnabled();
  await page.getByRole('button', { name: '收藏', exact: true }).click();
  await page.locator('.collection-cards').getByRole('button', { name: /^枚举，/ }).click();
  await expect(page.locator('.deck-count')).toHaveText('24 / 32');
  await expect(page.locator('.collection-item').filter({ hasText: '枚举' })).toContainText('已带 2 / 2');
  await page.locator('.collection-cards').getByRole('button', { name: /^枚举，/ }).click();
  expect((await state(page)).profile.deck).toHaveLength(24);
  await page.reload();
  expect((await state(page)).profile.deck).toHaveLength(24);
  expect(errors).toEqual([]);
});

for (const count of [0, 1, 23]) {
  for (const eventId of ['school', 'provincial']) {
    test(`${count}-card decks can enter ${eventId}`, async ({ page }) => {
      const profile = createTestProfile();
      profile.deck = profile.deck.slice(0, count);
      if (eventId === 'provincial') profile.mainIndex = 1;
      await page.clock.install();
      await page.goto('/');
      await page.evaluate(([key, value]) => localStorage.setItem(key, value), [storageKey, JSON.stringify({ profile, match: null, result: null, openedPack: null })]);
      await page.reload();
      const entry = eventId === 'school'
        ? page.getByRole('button', { name: '参加比赛' })
        : page.locator('.side-ticket').filter({ hasText: '省赛' });
      await expect(entry).toBeEnabled();
      await entry.click();
      await expect(page.locator('.match-page')).toBeVisible();
      const match = (await state(page)).match;
      expect(match.eventId).toBe(eventId);
      expect([...match.hand, ...match.deck].map(card => card.cardId).sort()).toEqual([...profile.deck].sort());
    });
  }
}

test('collection drag and drop moves one copy in either direction and persists the deck', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '收藏', exact: true }).click();
  const before = await state(page);
  const deckCard = page.locator('.deck-slots button').filter({ hasText: '枚举' });
  const collectionCard = page.locator('.collection-cards').getByRole('button', { name: /^枚举，/ });
  await deckCard.dragTo(page.locator('.collection-library'), { targetPosition: { x: 10, y: 10 } });
  await expect(page.locator('.deck-count')).toHaveText('23 / 32');
  await expect(deckCard.locator('b')).toHaveText('×1');
  await expect(collectionCard.locator('.card-count')).toHaveText('×2');
  expect((await state(page)).profile.collection).toEqual(before.profile.collection);
  await collectionCard.dragTo(page.locator('.deck-editor .section-heading'));
  await expect(page.locator('.deck-count')).toHaveText('24 / 32');
  await expect(deckCard.locator('b')).toHaveText('×2');
  await expect(page.locator('.collection-item').filter({ hasText: '枚举' })).toContainText('已带 2 / 2');
  const after = await state(page);
  expect(after.profile.collection).toEqual(before.profile.collection);
  await page.reload();
  expect((await state(page)).profile.deck).toEqual(after.profile.deck);
});

test('collection drag and drop respects deck capacity and owned copies', async ({ page }) => {
  const profile = createTestProfile();
  profile.deck.push(...Array(8).fill('enumerate'));
  profile.collection.enumerate += 8;
  await page.goto('/');
  await page.evaluate(([key, value]) => localStorage.setItem(key, value), [storageKey, JSON.stringify({ profile, match: null, result: null, openedPack: null })]);
  await page.reload();
  await page.getByRole('button', { name: '收藏', exact: true }).click();
  const before = await state(page);
  const deck = page.locator('.deck-editor .section-heading');
  const collectionCard = page.locator('.collection-cards').getByRole('button', { name: /^枚举，/ });
  await collectionCard.dragTo(deck);
  await expect(page.getByRole('status')).toHaveText('卡组已满，先移出一张。');
  expect((await state(page)).profile.deck).toEqual(before.profile.deck);
  await page.locator('.deck-slots button').filter({ hasText: '枚举' }).dragTo(page.locator('.collection-library'), { targetPosition: { x: 10, y: 10 } });
  await expect(page.locator('.deck-count')).toHaveText('31 / 32');
  const reducedDeck = (await state(page)).profile.deck;
  await page.locator('.collection-cards').getByRole('button', { name: /^快速排序，/ }).dragTo(deck);
  await expect(page.getByRole('status')).toHaveText('这张卡已经全部带上了。');
  expect((await state(page)).profile.deck).toEqual(reducedDeck);
  await collectionCard.dragTo(deck);
  await expect(page.locator('.deck-count')).toHaveText('32 / 32');
});

test('collection drags within the same area or outside both areas leave the deck unchanged', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '收藏', exact: true }).click();
  const before = await state(page);
  const deckCard = page.locator('.deck-slots button').filter({ hasText: '枚举' });
  await page.locator('.collection-cards').getByRole('button', { name: /^枚举，/ }).dragTo(page.locator('.collection-toolbar h3'));
  expect((await state(page)).profile.deck).toEqual(before.profile.deck);
  await deckCard.dragTo(page.locator('.deck-editor .section-heading'));
  expect((await state(page)).profile.deck).toEqual(before.profile.deck);
  await deckCard.dragTo(page.locator('.header-meta'));
  expect((await state(page)).profile.deck).toEqual(before.profile.deck);
  await expect(page.locator('.deck-count')).toHaveText('24 / 32');
});

test('collection drag and drop supports adding to and removing the last card from an empty deck', async ({ page }) => {
  const profile = createTestProfile();
  profile.deck = [];
  await page.goto('/');
  await page.evaluate(([key, value]) => localStorage.setItem(key, value), [storageKey, JSON.stringify({ profile, match: null, result: null, openedPack: null })]);
  await page.reload();
  await page.getByRole('button', { name: '收藏', exact: true }).click();
  await page.locator('.collection-cards').getByRole('button', { name: /^枚举，/ }).dragTo(page.locator('.deck-editor .empty-copy'));
  await expect(page.locator('.deck-count')).toHaveText('1 / 32');
  await expect(page.locator('.deck-slots button')).toHaveCount(1);
  await page.locator('.deck-slots button').dragTo(page.locator('.collection-library'), { targetPosition: { x: 10, y: 10 } });
  await expect(page.locator('.deck-count')).toHaveText('0 / 32');
  await expect(page.locator('.deck-editor .empty-copy')).toBeVisible();
  expect((await state(page)).profile.collection).toEqual(profile.collection);
});

test('paused play moves cards immediately, freezes their timers and submits after resume', async ({ page }) => {
  await start(page);
  expect((await state(page)).match.problems[0].readProgress).toBe(0);
  await elapsed(page, 9);
  await expect(page.locator('.score-strip')).toBeVisible();
  await page.getByRole('button', { name: 'Ⅱ 暂停', exact: true }).click();
  const paused = await state(page);
  await elapsed(page, 12);
  expect((await state(page)).match.time).toBe(paused.match.time);
  for (let i = 0; i < 4; i++) await page.locator('.hand-cards .game-card').nth(i).click();
  await expect(page.locator('.hand-selection')).toHaveText('已选 4 张');
  await page.getByRole('button', { name: '出牌 →', exact: true }).click();
  const played = (await state(page)).match;
  expect(played.hand).toHaveLength(4);
  expect(played.pendingActions).toEqual([]);
  await expect(page.locator('.table-cards .game-card')).toHaveCount(4);
  await elapsed(page, 12);
  expect((await state(page)).match).toEqual(played);
  await page.getByRole('button', { name: '自动提交 ↵', exact: true }).click();
  await expect(page.locator('.pending-strip')).toContainText('预约 A 提交');
  await page.getByRole('button', { name: '▶ 继续比赛', exact: true }).click();
  await expect(page.locator('.table-cards .game-card')).toHaveCount(4);
  await elapsed(page, 28);
  const after = await state(page);
  expect(after.match.problems[0].attempts).toHaveLength(1);
  expect(after.match.problems[0].submitQueued).toBe(false);
  await page.screenshot({ path: 'test-results/match.png', fullPage: true });
});

test('automatic submission survives reload and switching and waits for all cards', async ({ page }) => {
  const profile = createTestProfile();
  const match = startMatch(profile, 'school', 222);
  match.hand = [{ uid: 'auto-first', cardId: 'enumerate' }, { uid: 'auto-last', cardId: 'binary-search' }];
  match.problems[0].readProgress = match.problems[0].readTime;
  match.problems[0].difficulty = 3500;
  await page.clock.install();
  await page.goto('/');
  await page.evaluate(([key, value]) => localStorage.setItem(key, value), [storageKey, JSON.stringify({ profile, match, result: null, openedPack: null })]);
  await page.reload();
  await page.getByRole('button', { name: '▶ 继续比赛', exact: true }).click();
  for (const card of match.hand) await page.locator(`.hand-cards [data-card-uid="${card.uid}"]`).click();
  await page.getByRole('button', { name: '出牌 →', exact: true }).click();
  const autoSubmit = page.getByRole('button', { name: '自动提交 ↵', exact: true });
  await expect(autoSubmit).toBeEnabled();
  await elapsed(page, 3);
  await autoSubmit.click();
  await expect(autoSubmit).toBeDisabled();
  expect((await state(page)).match.problems[0].submitQueued).toBe(true);
  await expect(page.locator('.table-bottom')).toContainText('已设为自动提交');
  await page.reload();
  await expect(autoSubmit).toBeDisabled();
  await page.locator('.problem-button').nth(1).click();
  await page.getByRole('button', { name: '▶ 继续比赛', exact: true }).click();
  await elapsed(page, 5);
  expect((await state(page)).match.problems[0].attempts).toHaveLength(0);
  await elapsed(page, 1);
  const judging = (await state(page)).match;
  expect(judging.currentProblem).toBe(1);
  expect(judging.problems[0].judging?.attempt.time).toBe(9);
  expect(judging.problems[0].attempts).toHaveLength(0);
  expect(judging.problems[0].submitQueued).toBe(false);
  await elapsed(page, 5);
  const after = (await state(page)).match;
  expect(after.currentProblem).toBe(1);
  expect(after.problems[0].attempts).toHaveLength(1);
  expect(after.problems[0].attempts[0].time).toBe(9);
  expect(after.problems[0].submitQueued).toBe(false);
  await elapsed(page, 20);
  expect((await state(page)).match.problems[0].attempts).toHaveLength(1);
});

test('switching keeps independent reading progress and opponents keep moving', async ({ page }) => {
  await start(page);
  await elapsed(page, 1);
  await page.locator('.problem-button').nth(1).click();
  await elapsed(page, 1);
  const b = await state(page);
  expect(b.match.problems[0].readProgress).toBe(1);
  expect(b.match.problems[1].readProgress).toBe(1);
  await page.locator('.problem-button').nth(0).click();
  await elapsed(page, 9);
  expect((await state(page)).match.problems[1].readProgress).toBe(1);
  await page.locator('.problem-button').nth(1).click();
  await elapsed(page, 9);
  expect((await state(page)).match.problems[1].readProgress).toBeGreaterThan(1);
  await elapsed(page, 40);
  expect((await state(page)).match.opponents.some((team: any) => team.results.some((p: any) => p.attempts > 0))).toBe(true);
});

test('drag hand card to table and table card to discard', async ({ page }) => {
  await start(page);
  await elapsed(page, 9);
  await page.locator('.hand-cards .game-card').first().dragTo(page.locator('.table-panel'));
  await expect(page.locator('.table-cards .game-card')).toHaveCount(1);
  const before = (await state(page)).match;
  const expectedDiscard = before.discard.length + (cardById[before.problems[0].table[0].cardId].type === 'algorithm' ? 1 : 0);
  await page.locator('.table-cards .game-card').first().dragTo(page.locator('.discard-pile'));
  await expect(page.locator('.table-cards .game-card')).toHaveCount(0);
  expect((await state(page)).match.discard.length).toBe(expectedDiscard);
  await page.locator('.hand-cards .game-card').first().dragTo(page.locator('.discard-pile'));
  expect((await state(page)).match.discard.length).toBe(expectedDiscard + 1);
});

test('cards keep resolving in order after switching problems and freeze while paused', async ({ page }) => {
  await start(page);
  await elapsed(page, 9);
  const game = (await state(page)).match;
  const cards = game.hand.filter((card: { cardId: string }) => cardById[card.cardId].type === 'algorithm').slice(0, 2);
  for (const card of cards) await page.locator(`.hand-cards [data-card-uid="${card.uid}"]`).click();
  await page.getByRole('button', { name: '出牌 →', exact: true }).click();
  await elapsed(page, 1);
  await page.locator('.problem-button').nth(1).click();
  await elapsed(page, 1);
  expect((await state(page)).match.problems[0].table.map((card: { progress: number }) => card.progress)).toEqual([2, 0]);
  await page.getByRole('button', { name: 'Ⅱ 暂停', exact: true }).click();
  const paused = (await state(page)).match;
  await elapsed(page, 10);
  expect((await state(page)).match).toEqual(paused);
  await page.getByRole('button', { name: '▶ 继续比赛', exact: true }).click();
  await elapsed(page, cards.reduce((sum: number, card: { cardId: string }) => sum + cardById[card.cardId].time, 0));
  const resolved = (await state(page)).match.problems[0];
  expect(resolved.table.every((card: { active: boolean }) => card.active)).toBe(true);
  expect(resolved.attempts).toHaveLength(0);
  await page.locator('.problem-button').first().click();
  await expect(page.locator('.score-note')).toHaveText('2 / 2 张已生效');
});

test('reload freezes saved match and preserves cards, queue and per-problem progress', async ({ page }) => {
  await start(page);
  await elapsed(page, 9);
  await page.locator('.hand-cards .game-card').first().click();
  await page.getByRole('button', { name: '出牌 →', exact: true }).click();
  await elapsed(page, 2);
  const before = await state(page);
  await page.reload();
  await expect(page.getByRole('button', { name: '▶ 继续比赛', exact: true })).toBeVisible();
  const after = await state(page);
  expect(after.match.paused).toBe(true);
  expect(after.match.time).toBe(before.match.time);
  expect(after.match.hand).toEqual(before.match.hand);
  expect(after.match.problems).toEqual(before.match.problems);
  await elapsed(page, 20);
  expect((await state(page)).match.time).toBe(before.match.time);
  await page.getByRole('button', { name: '▶ 继续比赛', exact: true }).click();
  await elapsed(page, 2);
  expect((await state(page)).match.time).toBe(before.match.time + 2);
});

test('finish, claim reward, reveal one card, reload, reveal rest and start next season', async ({ page }) => {
  await start(page);
  await elapsed(page, 300);
  await expect(page.locator('.result-modal')).toBeVisible();
  const finished = await state(page);
  expect(finished.result.solved).toBe(0);
  expect(finished.profile.packs).toHaveLength(1);
  expect(finished.profile.seasonEnded).toBe(true);
  await page.getByRole('button', { name: '领取卡包 →' }).click();
  await page.locator('.pack-item').first().click();
  const count = (profile: any) => Object.values(profile.collection).reduce((a: number, b) => a + (b as number), 0);
  const before = await state(page);
  expect(count(before.profile)).toBe(24);
  await page.getByRole('button', { name: '翻开第 1 张卡', exact: true }).click();
  expect(count((await state(page)).profile)).toBe(25);
  await page.reload();
  expect((await state(page)).openedPack.revealed).toEqual([0]);
  expect(count((await state(page)).profile)).toBe(25);
  await page.getByRole('button', { name: '一键全开 →', exact: true }).click();
  expect(count((await state(page)).profile)).toBe(29);
  await page.screenshot({ path: 'test-results/opened-pack.png', fullPage: true, animations: 'disabled' });
  await page.getByRole('button', { name: '收好，下一包。 →', exact: true }).click();
  await page.getByRole('button', { name: '大厅', exact: true }).click();
  await page.getByRole('button', { name: '开启下一季' }).click();
  const next = await state(page);
  expect(next.profile.season).toBe(2027);
  expect(count(next.profile)).toBe(29);
  expect(next.profile.mainIndex).toBe(0);
  await expect(page.getByRole('button', { name: '参加比赛' })).toBeEnabled();
});

test('settled result survives reload without duplicating rewards', async ({ page }) => {
  const profile = createTestProfile();
  const match = startMatch(profile, 'school', 111);
  match.time = 299;
  match.paused = true;
  await page.goto('/');
  await page.evaluate(([key, value]) => localStorage.setItem(key, value), [storageKey, JSON.stringify({ profile, match, result: null, openedPack: null })]);
  await page.clock.install();
  await page.reload();
  await page.getByRole('button', { name: '▶ 继续比赛' }).click();
  await elapsed(page, 2);
  await expect(page.locator('.result-modal')).toBeVisible();
  const before = await state(page);
  await page.reload();
  await expect(page.locator('.result-modal')).toBeVisible();
  const after = await state(page);
  expect(after.profile.packs).toHaveLength(before.profile.packs.length);
  expect(after.profile.history).toHaveLength(1);
});

test('resume follows the last paused switch instead of displaying a different active desk', async ({ page }) => {
  await start(page);
  await elapsed(page, 2);
  await page.getByRole('button', { name: 'Ⅱ 暂停', exact: true }).click();
  await page.locator('.problem-button').nth(1).click();
  await expect(page.locator('.problem-letter')).toHaveText('B');
  await page.getByRole('button', { name: '▶ 继续比赛', exact: true }).click();
  await expect(page.locator('.problem-letter')).toHaveText('B');
  expect((await state(page)).match.currentProblem).toBe(1);
  await elapsed(page, 2);
  expect((await state(page)).match.problems[1].readProgress).toBe(2);
});

test('WA requires a changed table before another submission', async ({ page }) => {
  const profile = createTestProfile();
  const match = startMatch(profile, 'school', 222);
  const instance = match.hand.shift()!;
  match.problems[0].readProgress = match.problems[0].readTime;
  match.problems[0].difficulty = 3500;
  match.problems[0].table = [{ ...instance, progress: 6, duration: 6, active: true }];
  match.problems[0].revision = 1;
  match.paused = true;
  await page.goto('/');
  await page.evaluate(([key, value]) => localStorage.setItem(key, value), [storageKey, JSON.stringify({ profile, match, result: null, openedPack: null })]);
  await page.clock.install();
  await page.reload();
  await page.getByRole('button', { name: '▶ 继续比赛' }).click();
  await page.getByRole('button', { name: '提交 ↵', exact: true }).click();
  await elapsed(page, 5);
  expect((await state(page)).match.problems[0].attempts[0].result).toBe('WA');
  await expect(page.getByRole('button', { name: '提交 ↵', exact: true })).toBeDisabled();
  await page.locator('.problem-button').nth(1).click();
  await elapsed(page, 10);
  await page.locator('.problem-button').first().click();
  await expect(page.getByRole('button', { name: '提交 ↵', exact: true })).toBeDisabled();
  await page.locator('.hand-cards .game-card').first().click();
  await page.getByRole('button', { name: '出牌 →', exact: true }).click();
  await expect(page.getByRole('button', { name: '自动提交 ↵', exact: true })).toBeEnabled();
  await elapsed(page, 7);
  await expect(page.getByRole('button', { name: '提交 ↵', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: '提交 ↵', exact: true }).click();
  await elapsed(page, 5);
  expect((await state(page)).match.problems[0].attempts).toHaveLength(2);
});

test('PC laptop viewport keeps hand actions and card values accessible', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await start(page);
  await elapsed(page, 9);
  await page.locator('.hand-cards .game-card').first().click();
  await expect(page.getByRole('button', { name: '出牌 →', exact: true })).toBeInViewport();
  await page.evaluate(() => window.scrollTo(0, 0));
  const lastCard = page.locator('.hand-cards .game-card').last();
  await expect(lastCard.locator('.card-stats')).toBeInViewport();
  const stats = await lastCard.locator('.card-stats').boundingBox();
  expect(stats!.y + stats!.height).toBeLessThanOrEqual(768);
  await page.screenshot({ path: 'test-results/match-laptop.png', fullPage: true });
});

test('paused played cards leave the hand and can be discarded before resuming', async ({ page }) => {
  await start(page);
  await elapsed(page, 9);
  await page.getByRole('button', { name: 'Ⅱ 暂停', exact: true }).click();
  const { uid } = (await state(page)).match.hand.find(card => cardById[card.cardId].type === 'algorithm');
  const first = page.locator(`.hand-cards [data-card-uid="${uid}"]`);
  await first.click();
  await page.getByRole('button', { name: '出牌 →', exact: true }).click();
  await expect(page.getByText('已预排', { exact: true })).toHaveCount(0);
  await expect(page.locator(`.hand-cards [data-card-uid="${uid}"]`)).toHaveCount(0);
  await expect(page.locator(`.table-cards [data-card-uid="${uid}"]`)).toHaveCount(1);
  await expect(page.getByRole('button', { name: '出牌 →', exact: true })).toBeDisabled();
  expect((await state(page)).match.pendingActions).toEqual([]);
  await page.locator('.table-cards .card-discard').click();
  await expect(page.locator('.table-cards .game-card')).toHaveCount(0);
  expect((await state(page)).match.discard.map(card => card.uid)).toContain(uid);
  await page.getByRole('button', { name: '▶ 继续比赛', exact: true }).click();
  await expect(page.locator('.table-cards .game-card')).toHaveCount(0);
  expect((await state(page)).match.hand).toHaveLength(7);
});

test('table card details escape the scrolling desk and stay inside the viewport', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await start(page);
  await elapsed(page, 9);
  await page.locator('.hand-cards .game-card').first().click();
  await page.getByRole('button', { name: '出牌 →', exact: true }).click();
  const tableCard = page.locator('.table-cards .game-card').first();
  await expect(tableCard).toBeVisible();
  await tableCard.hover();
  const tooltip = page.getByRole('tooltip');
  await expect(tooltip).toBeVisible();
  const bounds = await tooltip.boundingBox();
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.y).toBeGreaterThanOrEqual(0);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(1366);
  expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(768);
  await page.screenshot({ path: 'test-results/table-tooltip-laptop.png', fullPage: true, animations: 'disabled' });
  const discard = tableCard.locator('.card-discard');
  const discardBounds = await discard.boundingBox();
  const deskBounds = await page.locator('.table-cards').boundingBox();
  expect(discardBounds!.y).toBeGreaterThanOrEqual(deskBounds!.y);
  expect(discardBounds!.y + discardBounds!.height).toBeLessThanOrEqual(deskBounds!.y + deskBounds!.height);
  await discard.click();
  await expect(page.locator('.table-cards .game-card')).toHaveCount(0);
});
