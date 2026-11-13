import { test, expect, type Page } from '@playwright/test';
import { createProfile, startMatch } from '../src/game/engine';

const storageKey = 'xcpcard-save';
async function state(page: Page) { return page.evaluate(key => JSON.parse(localStorage.getItem(key)!), storageKey); }
async function start(page: Page) {
  await page.clock.install();
  await page.goto('/');
  await page.getByRole('button', { name: '参加比赛' }).click();
  await expect(page.locator('.hand-cards .game-card')).toHaveCount(8);
}
async function elapsed(page: Page, seconds: number) { await page.clock.runFor(seconds * 1000); }

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

test('lobby and deck edits obey owned copies and 24-card entry', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /下一站，校赛/ })).toBeVisible();
  await page.screenshot({ path: 'test-results/lobby.png', fullPage: true });
  await page.getByRole('button', { name: '我的卡组', exact: true }).click();
  await page.locator('.deck-slots button').filter({ hasText: '枚举' }).click();
  await expect(page.locator('.deck-count')).toHaveText('23 / 24');
  await page.getByRole('button', { name: '赛事大厅', exact: true }).click();
  await expect(page.getByRole('button', { name: '参加比赛' })).toBeDisabled();
  await page.getByRole('button', { name: '我的卡组', exact: true }).click();
  await page.locator('.collection-cards').getByRole('button', { name: /^枚举，/ }).click();
  await expect(page.locator('.deck-count')).toHaveText('24 / 24');
  await expect(page.locator('.collection-item').filter({ hasText: '枚举' })).toContainText('已带 2 / 2');
  await page.locator('.collection-cards').getByRole('button', { name: /^枚举，/ }).click();
  expect((await state(page)).profile.deck).toHaveLength(24);
  await page.reload();
  expect((await state(page)).profile.deck).toHaveLength(24);
  expect(errors).toEqual([]);
});

test('collection drag and drop moves one copy in either direction and persists the deck', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '我的卡组', exact: true }).click();
  const before = await state(page);
  const deckCard = page.locator('.deck-slots button').filter({ hasText: '枚举' });
  const collectionCard = page.locator('.collection-cards').getByRole('button', { name: /^枚举，/ });
  await deckCard.dragTo(page.locator('.collection-library'), { targetPosition: { x: 10, y: 10 } });
  await expect(page.locator('.deck-count')).toHaveText('23 / 24');
  await expect(deckCard.locator('b')).toHaveText('×1');
  await expect(collectionCard.locator('.card-count')).toHaveText('×2');
  expect((await state(page)).profile.collection).toEqual(before.profile.collection);
  await collectionCard.dragTo(page.locator('.deck-editor .section-heading'));
  await expect(page.locator('.deck-count')).toHaveText('24 / 24');
  await expect(deckCard.locator('b')).toHaveText('×2');
  await expect(page.locator('.collection-item').filter({ hasText: '枚举' })).toContainText('已带 2 / 2');
  const after = await state(page);
  expect(after.profile.collection).toEqual(before.profile.collection);
  await page.reload();
  expect((await state(page)).profile.deck).toEqual(after.profile.deck);
});

test('collection drag and drop respects deck capacity and owned copies', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '我的卡组', exact: true }).click();
  const before = await state(page);
  const deck = page.locator('.deck-editor .section-heading');
  const collectionCard = page.locator('.collection-cards').getByRole('button', { name: /^枚举，/ });
  await collectionCard.dragTo(deck);
  await expect(page.getByRole('status')).toHaveText('卡组已满，先移出一张。');
  expect((await state(page)).profile.deck).toEqual(before.profile.deck);
  await page.locator('.deck-slots button').filter({ hasText: '枚举' }).dragTo(page.locator('.collection-library'), { targetPosition: { x: 10, y: 10 } });
  await expect(page.locator('.deck-count')).toHaveText('23 / 24');
  const reducedDeck = (await state(page)).profile.deck;
  await page.locator('.collection-cards').getByRole('button', { name: /^快速排序，/ }).dragTo(deck);
  await expect(page.getByRole('status')).toHaveText('这张卡已经全部带上了。');
  expect((await state(page)).profile.deck).toEqual(reducedDeck);
  await collectionCard.dragTo(deck);
  await expect(page.locator('.deck-count')).toHaveText('24 / 24');
});

test('collection drags within the same area or outside both areas leave the deck unchanged', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '我的卡组', exact: true }).click();
  const before = await state(page);
  const deckCard = page.locator('.deck-slots button').filter({ hasText: '枚举' });
  await page.locator('.collection-cards').getByRole('button', { name: /^枚举，/ }).dragTo(page.locator('.collection-toolbar h3'));
  expect((await state(page)).profile.deck).toEqual(before.profile.deck);
  await deckCard.dragTo(page.locator('.deck-editor .section-heading'));
  expect((await state(page)).profile.deck).toEqual(before.profile.deck);
  await deckCard.dragTo(page.locator('.header-meta'));
  expect((await state(page)).profile.deck).toEqual(before.profile.deck);
  await expect(page.locator('.deck-count')).toHaveText('24 / 24');
});

test('collection drag and drop supports adding to and removing the last card from an empty deck', async ({ page }) => {
  const profile = createProfile();
  profile.deck = [];
  await page.goto('/');
  await page.evaluate(([key, value]) => localStorage.setItem(key, value), [storageKey, JSON.stringify({ profile, match: null, result: null, openedPack: null })]);
  await page.reload();
  await page.getByRole('button', { name: '我的卡组', exact: true }).click();
  await page.locator('.collection-cards').getByRole('button', { name: /^枚举，/ }).dragTo(page.locator('.deck-editor .empty-copy'));
  await expect(page.locator('.deck-count')).toHaveText('1 / 24');
  await expect(page.locator('.deck-slots button')).toHaveCount(1);
  await page.locator('.deck-slots button').dragTo(page.locator('.collection-library'), { targetPosition: { x: 10, y: 10 } });
  await expect(page.locator('.deck-count')).toHaveText('0 / 24');
  await expect(page.locator('.deck-editor .empty-copy')).toBeVisible();
  expect((await state(page)).profile.collection).toEqual(profile.collection);
});

test('read, multi-select, paused planned play and submission execute on resume', async ({ page }) => {
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
  await page.getByRole('button', { name: '预排出牌 →', exact: true }).click();
  expect((await state(page)).match.hand).toHaveLength(8);
  expect((await state(page)).match.pendingActions).toHaveLength(1);
  await page.getByRole('button', { name: '预约提交 ↵', exact: true }).click();
  await expect(page.locator('.pending-strip')).toContainText('预约 A 提交');
  await page.getByRole('button', { name: '▶ 继续比赛', exact: true }).click();
  await expect(page.locator('.table-cards .game-card')).toHaveCount(4);
  await elapsed(page, 28);
  const after = await state(page);
  expect(after.match.problems[0].attempts).toHaveLength(1);
  expect(after.match.problems[0].submitQueued).toBe(false);
  await page.screenshot({ path: 'test-results/match.png', fullPage: true });
});

test('switching keeps independent reading progress and opponents keep moving', async ({ page }) => {
  await start(page);
  await elapsed(page, 2);
  await page.locator('.problem-button').nth(1).click();
  await elapsed(page, 2);
  const b = await state(page);
  expect(b.match.problems[0].readProgress).toBe(2);
  expect(b.match.problems[1].readProgress).toBe(2);
  await page.locator('.problem-button').nth(0).click();
  await elapsed(page, 9);
  expect((await state(page)).match.problems[1].readProgress).toBe(2);
  await page.locator('.problem-button').nth(1).click();
  await elapsed(page, 9);
  expect((await state(page)).match.problems[1].readProgress).toBeGreaterThan(2);
  await elapsed(page, 40);
  expect((await state(page)).match.opponents.some((team: any) => team.results.some((p: any) => p.attempts > 0))).toBe(true);
});

test('drag hand card to table and table card to discard', async ({ page }) => {
  await start(page);
  await elapsed(page, 9);
  await page.locator('.hand-cards .game-card').first().dragTo(page.locator('.table-panel'));
  await expect(page.locator('.table-cards .game-card')).toHaveCount(1);
  const initialDiscard = (await state(page)).match.discard.length;
  await page.locator('.table-cards .game-card').first().dragTo(page.locator('.discard-pile'));
  await expect(page.locator('.table-cards .game-card')).toHaveCount(0);
  expect((await state(page)).match.discard.length).toBe(initialDiscard + 1);
  await page.locator('.hand-cards .game-card').first().dragTo(page.locator('.discard-pile'));
  expect((await state(page)).match.discard.length).toBe(initialDiscard + 2);
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
  await page.getByRole('button', { name: '赛事大厅', exact: true }).click();
  await page.getByRole('button', { name: '开启下一季' }).click();
  const next = await state(page);
  expect(next.profile.season).toBe(2);
  expect(count(next.profile)).toBe(29);
  expect(next.profile.mainIndex).toBe(0);
  await expect(page.getByRole('button', { name: '参加比赛' })).toBeEnabled();
});

test('settled result survives reload without duplicating rewards', async ({ page }) => {
  const profile = createProfile();
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
  const profile = createProfile();
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
  expect((await state(page)).match.problems[0].attempts[0].result).toBe('WA');
  await expect(page.getByRole('button', { name: '提交 ↵', exact: true })).toBeDisabled();
  await page.locator('.problem-button').nth(1).click();
  await elapsed(page, 10);
  await page.locator('.problem-button').first().click();
  await expect(page.getByRole('button', { name: '提交 ↵', exact: true })).toBeDisabled();
  await page.locator('.hand-cards .game-card').first().click();
  await page.getByRole('button', { name: '出牌 →', exact: true }).click();
  await elapsed(page, 7);
  await expect(page.getByRole('button', { name: '提交 ↵', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: '提交 ↵', exact: true }).click();
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

test('paused hand reservations cannot queue the same physical card twice', async ({ page }) => {
  await start(page);
  await elapsed(page, 9);
  await page.getByRole('button', { name: 'Ⅱ 暂停', exact: true }).click();
  const first = page.locator('.hand-cards .game-card').first();
  await first.click();
  await page.getByRole('button', { name: '预排出牌 →', exact: true }).click();
  await expect(page.locator('.reserved-label')).toHaveText('已预排');
  await expect(first).not.toHaveAttribute('data-draggable', 'true');
  await first.click();
  await expect(page.getByRole('button', { name: '预排出牌 →', exact: true })).toBeDisabled();
  expect((await state(page)).match.pendingActions).toHaveLength(1);
  await page.getByRole('button', { name: '▶ 继续比赛', exact: true }).click();
  await expect(page.locator('.table-cards .game-card')).toHaveCount(1);
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
