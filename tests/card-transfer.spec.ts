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
  await page.locator('.card-flight').evaluateAll(flights => {
    for (const flight of flights) {
      for (const animation of flight.getAnimations({ subtree: true })) animation.finish();
    }
  });
  await expect(page.locator('.card-flight')).toHaveCount(0);
  await expect(page.locator('.card-in-transit')).toHaveCount(0);
}

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
  await page.screenshot({ path: 'test-results/hand-piles.png', fullPage: true });
});

test('draw travels from the deck to the rightmost hand slot before revealing its face', async ({ page }) => {
  await page.clock.install();
  const match = await load(page, match => {
    match.discard = match.hand.splice(0, 1);
    match.drawProgress = 3;
  });
  await page.getByRole('button', { name: '▶ 继续比赛', exact: true }).click();
  await page.clock.runFor(1100);
  const flight = page.locator('.card-flight-draw');
  await expect(flight).toHaveCount(1);
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

test('queued batch discard flips in place before flying onto the left pile', async ({ page }) => {
  await load(page);
  await page.locator('.hand-card-slot').nth(0).locator('.game-card').click();
  await page.locator('.hand-card-slot').nth(1).locator('.game-card').click();
  await page.getByRole('button', { name: '预排弃牌', exact: true }).click();
  await expect(page.locator('.card-flight')).toHaveCount(0);
  await expect(page.locator('.discard-pile .pile-layer')).toHaveCount(0);
  await page.mouse.move(10, 100);
  await page.getByRole('button', { name: '▶ 继续比赛', exact: true }).click();
  await expect(page.locator('.card-flight-discard')).toHaveCount(2);
  await expect(page.locator('.discard-pile .pile-layer')).toHaveCount(2);
  const flight = page.locator('.card-flight-discard').first();
  const origin = (await flight.boundingBox())!;
  await seek(page, 0.35);
  for (const back of await page.locator('.card-flight-discard .card-flight-back').all()) {
    await expect(back).toBeVisible();
  }
  const flipped = (await flight.boundingBox())!;
  expect(flipped.x).toBeCloseTo(origin.x, 0);
  expect(flipped.y).toBeCloseTo(origin.y - 12, 0);
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
});
