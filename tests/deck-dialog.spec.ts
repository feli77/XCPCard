import { test, expect, type Page } from '@playwright/test';
import { cardById, startMatch } from '../src/game/engine';
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
  return match;
}

async function savedMatch(page: Page): Promise<Match> {
  return page.evaluate(() => JSON.parse(localStorage.getItem('xcpcard-save')!).match);
}

test('deck dialog shows every remaining copy and supports mouse, keyboard and card details', async ({ page }) => {
  const match = await load(page, match => { match.discard = match.deck.splice(0, 2); });
  const deck = page.getByRole('button', { name: `牌库，${match.deck.length} 张` });
  await page.locator('.hand-card-slot .game-card').first().click();
  const before = await savedMatch(page);
  await deck.click();
  const dialog = page.getByRole('dialog', { name: '牌库剩余' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('heading')).toHaveText(`牌库剩余 ${match.deck.length} 张`);
  await expect(dialog.locator('.card-name')).toHaveText(match.deck.map(card => cardById[card.cardId].name));
  await expect(dialog.locator('[data-draggable]')).toHaveCount(0);
  await dialog.locator('.game-card').first().click();
  await expect(dialog).toBeVisible();
  await page.getByRole('button', { name: '关闭牌库' }).hover();
  await dialog.locator('.game-card').first().hover();
  await expect(dialog.getByRole('tooltip')).toBeVisible();
  await page.getByRole('button', { name: '关闭牌库' }).hover();
  await page.screenshot({ path: 'test-results/deck-dialog.png', fullPage: true });
  await page.setViewportSize({ width: 1040, height: 768 });
  expect(await dialog.locator('.game-card').evaluateAll(cards => {
    const bounds = cards.map(card => card.getBoundingClientRect());
    return bounds.every((card, index) => bounds.slice(0, index).every(other =>
      card.left >= other.right || card.right <= other.left || card.top >= other.bottom || card.bottom <= other.top));
  })).toBe(true);
  await dialog.locator('.game-card').last().scrollIntoViewIfNeeded();
  await expect(dialog.locator('.game-card').last()).toBeInViewport();
  await expect(page.getByRole('button', { name: '关闭牌库' })).toBeInViewport();
  await page.screenshot({ path: 'test-results/deck-dialog-compact.png', fullPage: true });
  await page.getByRole('button', { name: '关闭牌库' }).click();
  await expect(dialog).toHaveCount(0);
  await expect(deck).toBeFocused();
  await expect(page.locator('.hand-card-slot .selected')).toHaveCount(1);

  await deck.press('Enter');
  await expect(dialog).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(deck).toBeFocused();
  await deck.press('Space');
  await expect(dialog).toBeVisible();
  await page.mouse.click(10, 10);
  await expect(dialog).toHaveCount(0);
  expect(await savedMatch(page)).toEqual(before);
});

test('open deck dialog updates on draw and gives way to match results', async ({ page }) => {
  await page.clock.install();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await load(page, match => {
    match.discard = match.deck.splice(1);
    match.discard.push(match.hand.pop()!);
    match.drawProgress = 3;
  });
  await page.getByRole('button', { name: '▶ 继续比赛', exact: true }).click();
  await page.getByRole('button', { name: '牌库，1 张' }).click();
  const dialog = page.getByRole('dialog', { name: '牌库剩余' });
  await expect(dialog.locator('.game-card')).toHaveCount(1);
  await page.clock.runFor(1100);
  await expect(dialog.getByRole('heading')).toHaveText('牌库剩余 0 张');
  await expect(dialog.locator('.game-card')).toHaveCount(0);
  await expect(dialog.getByText('牌库已空')).toBeVisible();
  expect((await savedMatch(page)).paused).toBe(false);
  expect((await savedMatch(page)).hand).toHaveLength(8);
  await page.clock.runFor(299000);
  await expect(dialog).toHaveCount(0);
  await expect(page.locator('.result-modal')).toBeVisible();
});

test('an empty deck can be inspected without showing the discard pile', async ({ page }) => {
  await load(page, match => { match.discard = match.deck.splice(0); });
  await page.setViewportSize({ width: 1040, height: 768 });
  await page.getByRole('button', { name: '牌库，0 张' }).click();
  const dialog = page.getByRole('dialog', { name: '牌库剩余' });
  await expect(dialog.getByText('牌库已空')).toBeVisible();
  await expect(dialog.locator('.game-card')).toHaveCount(0);
  await page.getByRole('button', { name: '关闭牌库' }).click();
  await expect(dialog).toHaveCount(0);
});
