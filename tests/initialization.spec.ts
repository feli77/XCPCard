import { test, expect, type Page } from '@playwright/test';
import type { Profile } from '../src/game/types';

async function state(page: Page) {
  return page.evaluate(() => JSON.parse(localStorage.getItem('xcpcard-save')!) as { profile: Profile; openedPack: { revealed: number[] } | null });
}

function collectionSize(profile: Profile) {
  return Object.values(profile.collection).reduce((sum, count) => sum + count, 0);
}

test('new players receive eight packs and opening cards persists without granting a deck', async ({ page }) => {
  await page.goto('/');
  const initial = (await state(page)).profile;
  expect(initial.collection).toEqual({});
  expect(initial.deck).toEqual([]);
  expect(initial.packs).toHaveLength(8);
  expect(new Set(initial.packs.map(pack => pack.id)).size).toBe(8);
  expect(initial.packs.every(pack => pack.guarantee === 0)).toBe(true);

  await page.reload();
  expect((await state(page)).profile).toEqual(initial);
  await page.getByRole('button', { name: /^卡包仓库/ }).click();
  await expect(page.locator('.pack-item')).toHaveCount(8);
  await expect(page.locator('.pack-item').first()).toContainText('新手礼包');
  await page.locator('.pack-item').first().click();
  await expect(page.locator('.pack-open-heading')).toContainText('新手礼包');
  expect((await state(page)).profile.packs).toHaveLength(7);
  expect(collectionSize((await state(page)).profile)).toBe(0);
  await page.getByRole('button', { name: '翻开第 1 张卡', exact: true }).click();
  expect(collectionSize((await state(page)).profile)).toBe(1);

  await page.reload();
  expect((await state(page)).openedPack?.revealed).toEqual([0]);
  expect(collectionSize((await state(page)).profile)).toBe(1);
  await page.getByRole('button', { name: '一键全开 →', exact: true }).click();
  expect(collectionSize((await state(page)).profile)).toBe(5);
  await page.getByRole('button', { name: '收好，下一包。 →', exact: true }).click();
  await page.getByRole('button', { name: '我的卡组', exact: true }).click();
  await expect(page.locator('.deck-count')).toHaveText('0 / 24');
  await page.locator('.collection-cards .game-card').first().click();
  await expect(page.locator('.deck-count')).toHaveText('1 / 24');
  const assembled = (await state(page)).profile;
  await page.reload();
  expect((await state(page)).profile).toEqual(assembled);
  expect(assembled.packs).toHaveLength(7);
});
