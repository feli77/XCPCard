import { test, expect, type Page } from '@playwright/test';
import { startMatch } from '../src/game/engine';
import type { Match } from '../src/game/types';
import { createTestProfile } from './fixtures';

async function load(page: Page, prepare: (match: Match) => void = () => {}) {
  const profile = createTestProfile();
  const match = startMatch(profile, 'school', 492);
  match.paused = true;
  prepare(match);
  await page.addInitScript(session => {
    localStorage.setItem('xcpcard-save', JSON.stringify(session));
  }, { profile, match, result: null, openedPack: null });
  await page.goto('/');
  // Freeze imperative card transfers so their two phases can be inspected separately.
  await page.evaluate(() => {
    document.querySelector('.tab-content')?.getAnimations().forEach(animation => animation.finish());
    const animate = Element.prototype.animate;
    Element.prototype.animate = function (frames, options) {
      const animation = animate.call(this, frames, options);
      animation.pause();
      animation.currentTime = 0;
      return animation;
    };
  });
  return match;
}

async function seek(page: Page, progress: number) {
  await page.locator('.card-flight').evaluateAll((flights, value) => {
    for (const flight of flights) {
      for (const animation of flight.getAnimations({ subtree: true })) {
        const timing = animation.effect!.getTiming();
        animation.currentTime = Number(timing.delay) + Number(timing.duration) * value;
      }
    }
  }, progress);
}

async function finish(page: Page) {
  await page.locator('.card-flight, [data-card-slot]').evaluateAll(flights => {
    for (const flight of flights) {
      for (const animation of flight.getAnimations({ subtree: true })) animation.finish();
    }
  });
  await expect(page.locator('.card-flight')).toHaveCount(0);
  await expect(page.locator('.card-in-transit')).toHaveCount(0);
}

for (const { count, paused } of [{ count: 1, paused: false }, { count: 3, paused: true }]) {
  test(`${paused ? 'paused batch' : 'running single'} play smoothly moves face-up cards from the hand to their table slots`, async ({ page }) => {
    await page.clock.install();
    const match = await load(page, match => {
      match.problems[0].readProgress = match.problems[0].readTime;
      match.deck = [];
    });
    if (!paused) await page.getByRole('button', { name: '▶ 继续比赛', exact: true }).click();
    const uids = match.hand.slice(0, count).map(card => card.uid);
    for (const uid of uids) await page.locator(`.hand-cards [data-card-uid="${uid}"]`).click();
    await page.mouse.move(10, 100);
    const origins = await page.getByRole('button', { name: '出牌 →', exact: true }).evaluate((button, uids) => {
      const origins = uids.map(uid => document.querySelector(`.hand-cards [data-card-uid="${uid}"]`)!.getBoundingClientRect().toJSON());
      (button as HTMLButtonElement).click();
      return origins;
    }, uids);
    await expect(page.locator('.card-flight-play')).toHaveCount(count);
    await expect(page.locator('.hand-cards .game-card')).toHaveCount(match.hand.length - count);
    for (const [index, uid] of uids.entries()) {
      const flight = page.locator(`.card-flight-play[data-card-uid="${uid}"]`);
      const target = page.locator(`.table-cards [data-card-uid="${uid}"]`);
      const start = (await flight.boundingBox())!;
      expect(start.x).toBeCloseTo(origins[index].x, 0);
      expect(start.y).toBeCloseTo(origins[index].y, 0);
      await expect(target).toBeHidden();
      await expect(flight.locator('.card-flight-front')).toBeVisible();
      await expect(flight.locator('.card-flight-back')).toHaveCount(0);
    }
    await seek(page, 0.5);
    if (paused) await page.screenshot({ path: 'test-results/play-midway.png', fullPage: true });
    for (const [index, uid] of uids.entries()) {
      const flight = page.locator(`.card-flight-play[data-card-uid="${uid}"]`);
      const midway = (await flight.boundingBox())!;
      const end = (await page.locator(`.table-cards [data-card-uid="${uid}"]`).boundingBox())!;
      expect(midway.y).toBeLessThan(origins[index].y - 10);
      expect(midway.y).toBeGreaterThan(end.y);
      expect(midway.width).toBeLessThan(origins[index].width);
      expect(midway.width).toBeGreaterThan(end.width);
    }
    await seek(page, 1);
    for (const uid of uids) {
      const landed = (await page.locator(`.card-flight-play[data-card-uid="${uid}"]`).boundingBox())!;
      const end = (await page.locator(`.table-cards [data-card-uid="${uid}"]`).boundingBox())!;
      expect(landed.x).toBeCloseTo(end.x, 0);
      expect(landed.y).toBeCloseTo(end.y, 0);
      expect(landed.width).toBeCloseTo(end.width, 0);
      expect(landed.height).toBeCloseTo(end.height, 0);
    }
    await finish(page);
    for (const uid of uids) await expect(page.locator(`.table-cards [data-card-uid="${uid}"]`)).toBeVisible();
  });
}

test('reduced motion plays cards immediately without flights or hidden table cards', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await load(page, match => { match.problems[0].readProgress = match.problems[0].readTime; });
  await page.locator('.hand-card-slot .game-card').first().click();
  await page.getByRole('button', { name: '出牌 →', exact: true }).click();
  await expect(page.locator('.table-cards .game-card')).toBeVisible();
  await expect(page.locator('.card-flight, .card-in-transit')).toHaveCount(0);
});

test('physical card piles flank the hand and contain exactly their real card counts', async ({ page }) => {
  const match = await load(page, match => { match.discard = match.deck.splice(0, 3); });
  await expect(page.locator('.deck-pile .pile-layer')).toHaveCount(match.deck.length);
  await expect(page.locator('.discard-pile .pile-layer')).toHaveCount(3);
  await expect(page.locator('.deck-pile')).toHaveAccessibleName(`牌库，${match.deck.length} 张`);
  const discard = (await page.locator('.discard-pile').boundingBox())!;
  const hand = (await page.locator('.hand-fan').boundingBox())!;
  const deck = (await page.locator('.deck-pile').boundingBox())!;
  expect(discard.x + discard.width).toBeLessThan(hand.x);
  expect(deck.x).toBeGreaterThan(hand.x + hand.width);
  const panel = (await page.locator('.hand-panel').boundingBox())!;
  expect(deck.y + deck.height).toBeLessThan(panel.y + panel.height);
  for (const pile of ['.deck-pile', '.discard-pile']) {
    await page.locator(pile).hover();
    await expect(page.locator(`${pile} .pile-stack`)).toHaveCSS('outline-style', 'none');
  }
  await page.screenshot({ path: 'test-results/hand-piles.png', fullPage: true });
});

test('draw travels from the deck to the rightmost hand slot before revealing its face', async ({ page }) => {
  await page.clock.install();
  const match = await load(page, match => {
    match.discard = match.hand.splice(0, 1);
    match.drawProgress = 3;
  });
  const remaining = page.locator(`[data-card-slot="${match.hand[0].uid}"]`);
  const origin = (await remaining.boundingBox())!;
  await page.getByRole('button', { name: '▶ 继续比赛', exact: true }).click();
  await page.clock.runFor(1100);
  const flight = page.locator('.card-flight-draw');
  await expect(flight).toHaveCount(1);
  expect((await remaining.boundingBox())!.x).toBeCloseTo(origin.x, 0);
  expect((await remaining.boundingBox())!.y).toBeCloseTo(origin.y, 0);
  await remaining.evaluate(element => element.getAnimations().forEach(animation => { animation.currentTime = 180; }));
  const midway = (await remaining.boundingBox())!;
  await remaining.evaluate(element => element.getAnimations().forEach(animation => animation.finish()));
  const settled = (await remaining.boundingBox())!;
  expect(midway.x).toBeLessThan(origin.x);
  expect(midway.x).toBeGreaterThan(settled.x);
  expect(midway.y).toBeGreaterThan(origin.y);
  expect(midway.y).toBeLessThan(settled.y);
  await expect(page.locator('.hand-card-slot').last().locator('.game-card')).toBeHidden();
  await expect(page.locator('.deck-pile .pile-layer')).toHaveCount(match.deck.length - 1);
  const deck = (await page.locator('.deck-pile .pile-stack').boundingBox())!;
  expect((await flight.boundingBox())!.x).toBeGreaterThan(deck.x - 5);
  await expect(flight.locator('.card-flight-rotor')).toHaveCSS('transform', 'matrix3d(-1, 0, 0, 0, 0, 1, 0, 0, 0, 0, -1, 0, 0, 0, 0, 1)');
  await seek(page, 0.62);
  const end = (await page.locator('.hand-card-slot').last().locator('.game-card').boundingBox())!;
  const landed = (await flight.boundingBox())!;
  expect(landed.x).toBeCloseTo(end.x, 0);
  expect(landed.y).toBeCloseTo(end.y, 0);
  await expect(flight.locator('.card-flight-rotor')).toHaveCSS('transform', 'matrix3d(-1, 0, 0, 0, 0, 1, 0, 0, 0, 0, -1, 0, 0, 0, 0, 1)');
  await seek(page, 0.82);
  await expect(flight.locator('.card-flight-rotor')).not.toHaveCSS('transform', 'matrix3d(-1, 0, 0, 0, 0, 1, 0, 0, 0, 0, -1, 0, 0, 0, 0, 1)');
  await finish(page);
  await expect(page.locator('.hand-cards .game-card')).toHaveCount(8);
  await expect(page.locator('.hand-card-slot').last().locator('.game-card')).toBeVisible();
});

test('paused batch discard immediately flips in place before flying onto the left pile', async ({ page }) => {
  const match = await load(page);
  const remaining = page.locator(`[data-card-slot="${match.hand[2].uid}"]`);
  const origin = (await remaining.boundingBox())!;
  await page.locator('.hand-card-slot').nth(0).locator('.game-card').click();
  await page.locator('.hand-card-slot').nth(1).locator('.game-card').click();
  await page.getByRole('button', { name: '弃牌', exact: true }).click();
  await expect(page.getByRole('button', { name: '▶ 继续比赛', exact: true })).toBeVisible();
  await expect(page.locator('.card-flight-discard')).toHaveCount(2);
  expect((await remaining.boundingBox())!.x).toBeCloseTo(origin.x, 0);
  expect((await remaining.boundingBox())!.y).toBeCloseTo(origin.y, 0);
  await remaining.evaluate(element => element.getAnimations().forEach(animation => { animation.currentTime = 180; }));
  const midway = (await remaining.boundingBox())!;
  await remaining.evaluate(element => element.getAnimations().forEach(animation => animation.finish()));
  const settled = (await remaining.boundingBox())!;
  expect(midway.x).toBeLessThan(origin.x);
  expect(midway.x).toBeGreaterThan(settled.x);
  expect(midway.y).toBeGreaterThan(Math.min(origin.y, settled.y));
  expect(midway.y).toBeLessThan(Math.max(origin.y, settled.y));
  await expect(page.locator('.discard-pile .pile-layer')).toHaveCount(2);
  const flight = page.locator('.card-flight-discard').first();
  const flightOrigin = (await flight.boundingBox())!;
  await seek(page, 0.35);
  for (const back of await page.locator('.card-flight-discard .card-flight-back').all()) {
    await expect(back).toBeVisible();
  }
  const flipped = (await flight.boundingBox())!;
  expect(flipped.x).toBeCloseTo(flightOrigin.x, 0);
  expect(flipped.y).toBeCloseTo(flightOrigin.y - 12, 0);
  await expect(flight.locator('.card-flight-rotor')).toHaveCSS('transform', 'matrix3d(-1, 0, 0, 0, 0, 1, 0, 0, 0, 0, -1, 0, 0, 0, 0, 1)');
  await seek(page, 0.88);
  const pile = (await page.locator('.discard-pile .pile-stack').boundingBox())!;
  expect((await flight.boundingBox())!.x).toBeCloseTo(pile.x, 0);
  expect((await flight.boundingBox())!.y).toBeLessThan(pile.y - 10);
  await finish(page);
  await expect(page.locator('.hand-cards .game-card')).toHaveCount(6);
});

test('an empty deck reshuffles discard before drawing and reduced motion leaves no hidden cards', async ({ page }) => {
  await page.clock.install();
  const match = await load(page, match => {
    match.discard = match.deck.splice(0);
    match.discard.push(...match.hand.splice(0, 1));
    match.drawProgress = 3;
  });
  await page.getByRole('button', { name: '▶ 继续比赛', exact: true }).click();
  await page.clock.runFor(1100);
  await expect(page.locator('.card-flight-draw')).toHaveCount(1);
  await expect(page.locator('.discard-pile .pile-layer')).toHaveCount(0);
  await expect(page.locator('.deck-pile .pile-layer')).toHaveCount(match.discard.length - 1);
  await finish(page);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.locator('.hand-cards .game-card').first().click();
  await page.getByRole('button', { name: '弃牌', exact: true }).click();
  await expect(page.locator('.card-flight')).toHaveCount(0);
  await expect(page.locator('.card-in-transit')).toHaveCount(0);
  await expect(page.locator('.discard-pile .pile-layer')).toHaveCount(1);
  expect(await page.locator('[data-card-slot]').evaluateAll(slots => slots.flatMap(slot => slot.getAnimations()).length)).toBe(0);
});

test('table cards slide into the gap after a discard', async ({ page }) => {
  const match = await load(page, match => {
    const problem = match.problems[0];
    problem.readProgress = problem.readTime;
    problem.table = match.hand.splice(0, 3).map(card => ({
      ...card, active: false, progress: 0, duration: 10,
    }));
  });
  const remaining = page.locator(`[data-card-slot="${match.problems[0].table[1].uid}"]`);
  const origin = (await remaining.boundingBox())!;
  await page.locator('.table-cards .card-discard').first().click();
  expect((await remaining.boundingBox())!.x).toBeCloseTo(origin.x, 0);
  await remaining.evaluate(element => element.getAnimations().forEach(animation => { animation.currentTime = 180; }));
  const midway = (await remaining.boundingBox())!;
  await finish(page);
  const settled = (await remaining.boundingBox())!;
  expect(midway.x).toBeLessThan(origin.x);
  expect(midway.x).toBeGreaterThan(settled.x);
});

test('consecutive discards continue the remaining cards from their current position', async ({ page }) => {
  const match = await load(page);
  await page.getByRole('button', { name: '▶ 继续比赛', exact: true }).click();
  await page.locator('.hand-card-slot .game-card').first().click();
  await page.getByRole('button', { name: '弃牌', exact: true }).click();
  await page.locator('[data-card-slot]').evaluateAll(slots => {
    slots.forEach(slot => slot.getAnimations().forEach(animation => { animation.currentTime = 180; }));
  });
  const remaining = page.locator(`[data-card-slot="${match.hand[3].uid}"]`);
  const midway = (await remaining.boundingBox())!;
  await page.locator('.hand-card-slot .game-card').first().click();
  await page.getByRole('button', { name: '弃牌', exact: true }).click();
  expect((await remaining.boundingBox())!.x).toBeCloseTo(midway.x, 0);
  expect((await remaining.boundingBox())!.y).toBeCloseTo(midway.y, 0);
  await finish(page);
});
