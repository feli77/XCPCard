import { test, expect, type Locator, type Page } from '@playwright/test';
import { createProfile, startMatch } from '../src/game/engine';
import type { Match, Profile } from '../src/game/types';

const storageKey = 'xcpcard-save';

async function state(page: Page): Promise<{ profile: Profile; match: Match }> {
  return page.evaluate(key => JSON.parse(localStorage.getItem(key)!), storageKey);
}

async function load(page: Page, profile = createProfile(), match: Match | null = null) {
  await page.addInitScript(({ key, session }) => {
    localStorage.setItem(key, JSON.stringify(session));
  }, { key: storageKey, session: { profile, match, result: null, openedPack: null } });
  await page.goto('/');
}

async function matchFixture(page: Page, tableCount = 0) {
  const profile = createProfile();
  const match = startMatch(profile, 'school', 492);
  match.paused = true;
  match.problems[0].readProgress = match.problems[0].readTime;
  match.problems[0].table = match.hand.splice(0, tableCount).map(card => ({
    ...card, progress: 0, duration: 20, active: false,
  }));
  await load(page, profile, match);
  await expect(page.getByRole('button', { name: '▶ 继续比赛', exact: true })).toBeVisible();
  return match;
}

async function center(locator: Locator) {
  const bounds = await locator.boundingBox();
  expect(bounds).not.toBeNull();
  return { x: bounds!.x + bounds!.width / 2, y: bounds!.y + bounds!.height / 2 };
}

async function lift(page: Page, source: Locator, dx = 90, dy = -55) {
  const origin = await center(source);
  await page.mouse.move(origin.x, origin.y);
  await page.mouse.down();
  await page.mouse.move(origin.x + dx, origin.y + dy);
  await expect(source).toHaveClass(/is-dragging/);
  return origin;
}

async function releaseOn(page: Page, target: Locator) {
  const point = await center(target);
  await page.mouse.move(point.x, point.y);
  await page.mouse.up();
  await expect(page.locator('.is-dragging')).toHaveCount(0);
  await expect(page.locator('.card-drag-placeholder')).toHaveCount(0);
  await expect(page.locator('body')).not.toHaveClass(/card-dragging/);
}

async function expectPosition(locator: Locator, expected: { x: number; y: number }) {
  const actual = (await locator.boundingBox())!;
  expect(actual.x).toBeCloseTo(expected.x, 0);
  expect(actual.y).toBeCloseTo(expected.y, 0);
}

test('collection lifts the original card while keeping its grid position and restores it on cancel', async ({ page }) => {
  await load(page);
  await page.getByRole('button', { name: '我的卡组', exact: true }).click();
  const slots = page.locator('.collection-item');
  const source = slots.nth(0).locator('.game-card');
  const original = await source.elementHandle();
  const initialSlot = (await slots.nth(0).boundingBox())!;
  const next = slots.nth(1);
  const nextBounds = (await next.boundingBox())!;
  const total = await page.locator('.collection-cards .game-card').count();
  const before = await state(page);

  await lift(page, source);
  expect(await original!.evaluate(element => element.classList.contains('is-dragging'))).toBe(true);
  await expect(source).toHaveCSS('position', 'fixed');
  await expect(page.locator('.collection-cards .game-card')).toHaveCount(total);
  await expectPosition(next, nextBounds);
  await expect(page.getByRole('tooltip')).toHaveCount(0);

  await page.keyboard.press('Escape');
  await page.mouse.up();
  await expect(page.locator('.is-dragging')).toHaveCount(0);
  await expect(page.locator('.card-drag-placeholder')).toHaveCount(0);
  await expectPosition(slots.nth(0), initialSlot);
  await expectPosition(next, nextBounds);
  expect((await state(page)).profile).toEqual(before.profile);
});

test('deck entry becomes a full card and the next entry fills its position after the final copy is removed', async ({ page }) => {
  const profile = createProfile();
  profile.deck = ['enumerate', 'quick-sort', 'two-pointers'];
  await load(page, profile);
  await page.getByRole('button', { name: '我的卡组', exact: true }).click();
  const source = page.locator('.deck-entry').filter({ hasText: '枚举' });
  const next = page.locator('.deck-entry').filter({ hasText: '快速排序' });
  const initialTop = (await source.boundingBox())!.y;
  const nextBounds = (await next.boundingBox())!;
  const original = await source.elementHandle();

  await lift(page, source, -100, 30);
  expect(await original!.evaluate(element => element.classList.contains('is-dragging'))).toBe(true);
  await expect(source.locator('.card-art')).toBeVisible();
  await expect(source.locator('.card-stats')).toBeVisible();
  await expect(source.locator('.card-name')).toHaveText('枚举');
  expect((await source.boundingBox())!.height).toBeGreaterThan(160);
  await expectPosition(next, nextBounds);

  await releaseOn(page, page.locator('.collection-toolbar h3'));
  await expect(source).toHaveCount(0);
  await expect(page.locator('.deck-count')).toHaveText('2 / 24');
  expect((await next.boundingBox())!.y).toBeCloseTo(initialTop, 0);
  expect((await state(page)).profile.deck).toEqual(['quick-sort', 'two-pointers']);
  expect((await state(page)).profile.collection).toEqual(profile.collection);
});

test('a collection drop adds exactly one copy and an ordinary click still adds another', async ({ page }) => {
  const profile = createProfile();
  profile.deck = [];
  await load(page, profile);
  await page.getByRole('button', { name: '我的卡组', exact: true }).click();
  const source = page.locator('.collection-cards').getByRole('button', { name: /^枚举，/ });
  await lift(page, source);
  await releaseOn(page, page.locator('.deck-editor .section-heading'));
  await expect(page.locator('.deck-count')).toHaveText('1 / 24');
  expect((await state(page)).profile.deck).toEqual(['enumerate']);
  await source.click();
  await expect(page.locator('.deck-count')).toHaveText('2 / 24');
  await page.locator('.deck-entry').click();
  await expect(page.locator('.deck-count')).toHaveText('1 / 24');
});

test('hovering a fanned hand reveals the card, makes room on both sides and keeps details above it', async ({ page }) => {
  await matchFixture(page);
  const cards = page.locator('.hand-cards .game-card');
  const source = cards.nth(3);
  const left = cards.nth(1);
  const right = cards.nth(5);
  const initial = {
    source: (await source.boundingBox())!,
    left: (await left.boundingBox())!,
    right: (await right.boundingBox())!,
  };

  await source.hover();
  await expect(page.getByRole('tooltip')).toHaveCount(0);
  await expect(source).toHaveCSS('scale', '1.4');
  await expect.poll(async () => (await left.boundingBox())!.x).toBeLessThan(initial.left.x - 25);
  await expect.poll(async () => (await right.boundingBox())!.x).toBeGreaterThan(initial.right.x + 25);
  const enlarged = (await source.boundingBox())!;
  expect(enlarged.width).toBeGreaterThan(initial.source.width * 1.3);
  expect(enlarged.y).toBeLessThan(initial.source.y - 25);
  const point = await center(source);
  expect(await source.evaluate((element, position) => element.contains(document.elementFromPoint(position.x, position.y)), point)).toBe(true);
  await expect(page.getByRole('tooltip')).toBeVisible();
  await expect.poll(async () => {
    const tooltip = (await page.getByRole('tooltip').boundingBox())!;
    return tooltip.y + tooltip.height - (await source.boundingBox())!.y;
  }).toBeLessThan(0);

  await page.mouse.move(10, 100);
  await expect(source).toHaveCSS('scale', '1');
  await expect.poll(async () => Math.abs((await left.boundingBox())!.x - initial.left.x)).toBeLessThan(1);
  await expect.poll(async () => Math.abs((await right.boundingBox())!.x - initial.right.x)).toBeLessThan(1);
  await expect(page.getByRole('tooltip')).toHaveCount(0);
});

test('hand card follows the pointer, tilts with movement and reserves one card when dropped while paused', async ({ page }) => {
  const initial = await matchFixture(page);
  const slots = page.locator('.hand-card-slot');
  const source = slots.nth(0).locator('.game-card');
  const next = slots.nth(1);
  const nextBounds = (await next.boundingBox())!;
  const original = await source.elementHandle();
  const origin = await lift(page, source);

  expect(await original!.evaluate(element => element.classList.contains('is-dragging'))).toBe(true);
  await expect(source).toHaveCSS('position', 'fixed');
  await expect(page.getByRole('tooltip')).toHaveCount(0);
  await expectPosition(next, nextBounds);
  const left = await source.evaluate(element => parseFloat(element.style.getPropertyValue('--drag-left')));
  await page.mouse.move(origin.x + 190, origin.y - 105);
  const moved = await source.evaluate(element => ({
    left: parseFloat(element.style.getPropertyValue('--drag-left')),
    tiltX: parseFloat(element.style.getPropertyValue('--tilt-x')),
    tiltY: parseFloat(element.style.getPropertyValue('--tilt-y')),
    rotation: parseFloat(element.style.getPropertyValue('--drag-rotation')),
  }));
  expect(moved.left - left).toBeCloseTo(100, 0);
  expect(moved.tiltX).toBeGreaterThan(0);
  expect(moved.tiltY).toBeGreaterThan(0);
  expect(moved.rotation).toBeGreaterThan(0);
  await page.mouse.move(origin.x + 90, origin.y - 55);
  expect(await source.evaluate(element => parseFloat(element.style.getPropertyValue('--tilt-y')))).toBeLessThan(0);

  await releaseOn(page, page.locator('.table-panel .problem-heading'));
  const after = (await state(page)).match;
  expect(after.hand).toEqual(initial.hand);
  expect(after.pendingActions).toEqual([{ type: 'play', uids: [initial.hand[0].uid], problem: 0 }]);
  await expect(page.locator('.reserved-label')).toHaveCount(1);
  await expect(page.locator('.hand-selection')).toHaveText('点击多选 · 拖放出牌');
  await expectPosition(next, nextBounds);
  await page.getByRole('button', { name: '▶ 继续比赛', exact: true }).click();
  await expect(page.locator('.table-cards .game-card')).toHaveCount(1);
  expect((await state(page)).match.hand).toHaveLength(7);
  const fan = (await page.locator('.hand-fan').boundingBox())!;
  const panel = (await page.locator('.hand-cards').boundingBox())!;
  expect(fan.x + fan.width / 2).toBeCloseTo(panel.x + panel.width / 2, 0);
});

test('cancelled and outside hand drags restore the card without selecting it, then normal clicks work', async ({ page }) => {
  const initial = await matchFixture(page);
  const slots = page.locator('.hand-card-slot');
  const source = slots.nth(0).locator('.game-card');
  const initialBounds = (await slots.nth(0).boundingBox())!;
  const next = slots.nth(1);
  const nextBounds = (await next.boundingBox())!;
  await lift(page, source);
  await expectPosition(next, nextBounds);
  await page.keyboard.press('Escape');
  await page.mouse.up();
  await expect(page.locator('.is-dragging')).toHaveCount(0);
  await expect(page.locator('.card-drag-placeholder')).toHaveCount(0);
  await expectPosition(slots.nth(0), initialBounds);
  await expectPosition(next, nextBounds);
  await expect(source).not.toHaveClass(/selected/);

  await lift(page, source);
  await expectPosition(next, nextBounds);
  await releaseOn(page, page.locator('.header-meta'));
  await expectPosition(slots.nth(0), initialBounds);
  await expectPosition(next, nextBounds);
  expect((await state(page)).match.hand).toEqual(initial.hand);
  expect((await state(page)).match.pendingActions).toEqual([]);
  await expect(source).not.toHaveClass(/selected/);
  await source.click();
  await expect(source).toHaveClass(/selected/);
  await source.click();
  await expect(source).not.toHaveClass(/selected/);
});

test('dragging selected cards queues them once and reserved cards cannot be dragged again', async ({ page }) => {
  const initial = await matchFixture(page);
  const hand = page.locator('.hand-cards .game-card');
  await hand.nth(0).click();
  await hand.nth(1).click();
  await hand.nth(2).click();
  const first = hand.nth(0);
  const remainingSlot = page.locator('.hand-card-slot').nth(3);
  const remainingBounds = (await remainingSlot.boundingBox())!;
  await lift(page, first);
  await expect(page.locator('.drag-companion')).toHaveCount(2);
  await expect(page.locator('.drag-companion').first()).toBeHidden();
  await expectPosition(remainingSlot, remainingBounds);
  await releaseOn(page, page.locator('.table-panel .problem-heading'));
  const queued = (await state(page)).match;
  expect(queued.pendingActions).toEqual([{ type: 'play', uids: initial.hand.slice(0, 3).map(card => card.uid), problem: 0 }]);
  await expect(page.locator('.reserved-label')).toHaveCount(3);
  await expectPosition(remainingSlot, remainingBounds);
  await expect(first).not.toHaveAttribute('data-draggable');
  const point = await center(first);
  await page.mouse.move(point.x, point.y);
  await page.mouse.down();
  await page.mouse.move(point.x + 90, point.y - 60);
  await expect(page.locator('.is-dragging')).toHaveCount(0);
  await page.mouse.up();
  expect((await state(page)).match.pendingActions).toEqual(queued.pendingActions);
  await page.getByRole('button', { name: '▶ 继续比赛', exact: true }).click();
  await expect(page.locator('.table-cards .game-card')).toHaveCount(3);
  expect((await state(page)).match.hand).toHaveLength(5);
});

test('hand selection and dragging respect the remaining table slots', async ({ page }) => {
  await page.clock.install();
  const initial = await matchFixture(page, 4);
  await page.getByRole('button', { name: '▶ 继续比赛', exact: true }).click();
  const hand = page.locator('.hand-cards .game-card');
  await hand.nth(0).click();
  await hand.nth(1).click();
  await expect(page.locator('.hand-selection')).toHaveText('已选 1 张');
  await expect(hand.nth(0)).toHaveClass(/selected/);
  await expect(hand.nth(1)).not.toHaveClass(/selected/);
  await hand.nth(0).click();
  await hand.nth(1).click();
  await page.getByRole('button', { name: '出牌 →', exact: true }).click();
  await expect(page.locator('.table-cards .game-card')).toHaveCount(5);
  await expect(page.locator('.hand-selection')).toHaveText('牌桌已满（最多 5 张）');
  await lift(page, hand.nth(0));
  await releaseOn(page, page.locator('.table-panel .problem-heading'));
  expect((await state(page)).match.hand).toHaveLength(initial.hand.length - 1);
  await expect(page.locator('.table-cards .game-card')).toHaveCount(5);
  await page.locator('.table-cards .card-discard').first().click();
  await hand.nth(0).click();
  await page.getByRole('button', { name: '出牌 →', exact: true }).click();
  await expect(page.locator('.table-cards .game-card')).toHaveCount(5);
});

test('paused planned plays reserve slots and planned table discards release them', async ({ page }) => {
  await page.clock.install();
  const initial = await matchFixture(page, 4);
  const hand = page.locator('.hand-cards .game-card');
  await hand.nth(0).click();
  await page.getByRole('button', { name: '预排出牌 →', exact: true }).click();
  await hand.nth(1).click();
  await expect(hand.nth(1)).not.toHaveClass(/selected/);
  await expect(page.getByRole('button', { name: '预排出牌 →', exact: true })).toBeDisabled();
  await lift(page, hand.nth(1));
  await releaseOn(page, page.locator('.table-panel .problem-heading'));
  expect((await state(page)).match.pendingActions).toHaveLength(1);
  await page.locator('.table-cards .card-discard').first().click();
  await hand.nth(1).click();
  await page.getByRole('button', { name: '预排出牌 →', exact: true }).click();
  expect((await state(page)).match.pendingActions).toHaveLength(3);
  await page.getByRole('button', { name: '▶ 继续比赛', exact: true }).click();
  await expect(page.locator('.table-cards .game-card')).toHaveCount(5);
  expect((await state(page)).match.hand).toHaveLength(initial.hand.length - 2);
});

test('table cards keep their positions during dragging and fill the gap only after a drop', async ({ page }) => {
  const initial = await matchFixture(page, 3);
  await page.getByRole('button', { name: '▶ 继续比赛', exact: true }).click();
  const table = page.locator('.table-cards .game-card');
  const source = table.nth(0);
  const next = table.nth(1);
  const bounds = (await source.boundingBox())!;
  const nextBounds = (await next.boundingBox())!;
  await lift(page, source, 80, -75);
  await expectPosition(next, nextBounds);
  await releaseOn(page, page.locator('.discard-pile'));
  await expect(table).toHaveCount(2);
  await expectPosition(table.first(), bounds);
  expect((await state(page)).match.discard.map(card => card.uid)).toContain(initial.problems[0].table[0].uid);
  await table.nth(0).locator('.card-discard').click();
  await expect(table).toHaveCount(1);
  expect((await state(page)).match.discard).toHaveLength(2);
  await expect(page.locator('.is-dragging')).toHaveCount(0);
});

test('automatic acceptance cancels a lifted table card immediately when its source is removed', async ({ page }) => {
  const profile = createProfile();
  const match = startMatch(profile, 'school', 492);
  match.paused = true;
  const problem = match.problems[0];
  problem.readProgress = problem.readTime;
  problem.difficulty = 1;
  problem.table = match.hand.splice(0, 1).map(card => ({
    ...card, cardId: 'enumerate', progress: 0, duration: 2, active: false,
  }));
  problem.submitQueued = true;
  await page.clock.install();
  await load(page, profile, match);
  await page.getByRole('button', { name: '▶ 继续比赛', exact: true }).click();
  await lift(page, page.locator('.table-cards .game-card'));
  await expect(page.locator('body')).toHaveClass(/card-dragging/);

  await page.clock.runFor(3000);
  await expect(page.locator('.solved-desk')).toBeVisible();
  await expect(page.locator('.is-dragging')).toHaveCount(0);
  await expect(page.locator('.card-drag-placeholder')).toHaveCount(0);
  await expect(page.locator('body')).not.toHaveClass(/card-dragging/);
  expect((await state(page)).match.problems[0].acTime).not.toBeNull();
  await page.mouse.up();
});
