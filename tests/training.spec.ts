import { test, expect, type Page, type Locator } from '@playwright/test';
import { cards } from '../src/content/data';
import { advanceMatch, startMatch } from '../src/game/engine';
import { createTestProfile } from './fixtures';
import type { Profile } from '../src/game/types';

async function state(page: Page) {
  return page.evaluate(() => JSON.parse(localStorage.getItem('xcpcard-save')!) as { profile: Profile });
}
async function load(page: Page, profile = createTestProfile(), match: unknown = null) {
  await page.goto('/');
  await page.evaluate(session => localStorage.setItem('xcpcard-save', JSON.stringify(session)), { profile, match, result: null, openedPack: null });
  await page.reload();
}
async function drag(page: Page, source: Locator) {
  await source.scrollIntoViewIfNeeded();
  const a = (await source.boundingBox())!;
  const b = (await page.getByLabel('知识回炉', { exact: true }).boundingBox())!;
  await page.mouse.move(a.x + 25, a.y + 20);
  await page.mouse.down();
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 12 });
  await page.mouse.up();
}

test('加训兑换、限购、类别拆包和余额持久化', async ({ page }) => {
  const profile = { ...createTestProfile(), trainingPoints: 5000 };
  await load(page, profile);
  await page.getByRole('button', { name: '加训', exact: true }).click();
  await expect(page.locator('.training-packs .training-item')).toHaveCount(3);
  await expect(page.locator('.training-cards .training-item')).toHaveCount(5);
  const pack = page.locator('.training-packs .training-item').nth(1);
  await pack.getByRole('button').click();
  await expect(pack.getByRole('button', { name: '已兑换' })).toBeDisabled();
  const single = profile.trainingOffers.find(o => o.kind === 'card')!;
  await page.locator('.training-cards .training-item').first().getByRole('button').click();
  let updated = (await state(page)).profile;
  expect(updated.trainingPoints).toBe(5000 - 150 - single.price);
  if (single.kind === 'card') expect(updated.collection[single.cardId]).toBe(1);
  await page.reload();
  expect((await state(page)).profile).toEqual(updated);
  await page.getByRole('button', { name: /^卡包/ }).click();
  await page.locator('.pack-item').click();
  await expect(page.locator('.pack-open-heading')).toContainText('加训兑换');
  await page.getByRole('button', { name: '一键全开 →', exact: true }).click();
  await expect(page.locator('.reveal-rarity')).toHaveCount(5);
  await page.getByRole('button', { name: '收好，下一包。 →', exact: true }).click();
  updated = (await state(page)).profile;
  expect(updated.packs).toHaveLength(0);
});

test('余额不足时不能兑换；旧档补充首轮，刷新不换货', async ({ page }) => {
  const { trainingPoints, trainingOffers, ...old } = createTestProfile();
  await load(page, old as Profile);
  await page.getByRole('button', { name: '加训', exact: true }).click();
  await expect(page.locator('.training-item button:disabled')).toHaveCount(8);
  const profile = (await state(page)).profile;
  expect(profile.trainingPoints).toBe(0);
  await page.reload();
  expect((await state(page)).profile).toEqual(profile);
});

test('回炉低稀有度副本，紫卡取消和确认，卡组同步', async ({ page }) => {
  const rare = cards.find(c => c.rarity === 4)!;
  const profile = createTestProfile();
  profile.collection = { enumerate: 2, [rare.id]: 1 };
  profile.deck = ['enumerate', rare.id];
  await load(page, profile);
  await page.getByRole('button', { name: '收藏', exact: true }).click();
  await drag(page, page.locator('.collection-cards .game-card').filter({ hasText: '枚举' }));
  expect((await state(page)).profile.trainingPoints).toBe(5);
  expect((await state(page)).profile.deck).toEqual(profile.deck);
  const rareCard = page.locator('.collection-cards .game-card').filter({ hasText: rare.name });
  await drag(page, rareCard);
  await expect(page.getByRole('dialog')).toContainText('这张卡也会从参赛卡组中移出');
  await page.getByRole('button', { name: '取消', exact: true }).click();
  expect((await state(page)).profile.collection[rare.id]).toBe(1);
  await drag(page, rareCard);
  await page.getByRole('button', { name: '确认分解', exact: true }).click();
  expect((await state(page)).profile.trainingPoints).toBe(55);
  expect((await state(page)).profile.collection[rare.id]).toBeUndefined();
  expect((await state(page)).profile.deck).toEqual(['enumerate']);
  await drag(page, page.locator('.deck-entry'));
  expect((await state(page)).profile.trainingPoints).toBe(60);
  expect((await state(page)).profile.deck).toEqual([]);
  await page.reload();
  expect((await state(page)).profile.trainingPoints).toBe(60);
});

test('比赛结算发点和刷新只执行一次', async ({ page }) => {
  const profile = createTestProfile();
  const match = advanceMatch(startMatch(profile, 'school', 42), 300);
  await load(page, profile, match);
  await expect(page.locator('.reward-label')).toContainText('+100 训练点');
  const updated = (await state(page)).profile;
  expect(updated.trainingPoints).toBe(100);
  expect(updated.trainingOffers).not.toEqual(profile.trainingOffers);
  await page.reload();
  expect((await state(page)).profile).toEqual(updated);
});

test('1040px 窄屏加训页可完整展示', async ({ page }) => {
  await page.setViewportSize({ width: 1040, height: 900 });
  await load(page);
  await page.getByRole('button', { name: '加训', exact: true }).click();
  await expect(page.getByRole('heading', { name: '重点突破' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(1040);
  await page.screenshot({ path: 'test-results/training-narrow.png', fullPage: true });
});
