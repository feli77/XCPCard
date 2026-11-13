import { test, expect } from '@playwright/test';
import { cards, rarities } from '../src/content/data';
import { createProfile } from '../src/game/engine';

test('rarity filters show owned cards and combine with category filters', async ({ page }) => {
  const profile = createProfile();
  profile.collection = Object.fromEntries(cards.map(card => [card.id, card.id === 'half-plane' ? 0 : 1]));
  profile.deck = [];
  await page.addInitScript(profile => {
    localStorage.setItem('xcpcard-save', JSON.stringify({ profile, match: null, result: null, openedPack: null }));
  }, profile);
  await page.goto('/');
  await page.getByRole('button', { name: '我的卡组', exact: true }).click();

  const rarityFilter = page.getByRole('group', { name: '稀有度筛选' });
  const categoryFilter = page.getByRole('group', { name: '类别筛选' });
  const names = page.locator('.collection-cards .card-name');
  const owned = cards.filter(card => profile.collection[card.id]);
  await expect(rarityFilter.getByRole('button', { name: '全部', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(names).toHaveText(owned.map(card => card.name));

  for (const [index, rarity] of rarities.entries()) {
    const button = rarityFilter.getByRole('button', { name: rarity.name, exact: true });
    await button.click();
    await expect(button).toHaveAttribute('aria-pressed', 'true');
    await expect(rarityFilter.getByRole('button', { pressed: true })).toHaveCount(1);
    await expect(names).toHaveText(owned.filter(card => card.rarity === index).map(card => card.name));
  }

  await rarityFilter.getByRole('button', { name: '绿', exact: true }).click();
  await categoryFilter.getByRole('button', { name: '数学', exact: true }).click();
  await expect(names).toHaveText(owned.filter(card => card.rarity === 1 && card.categories.includes('数学')).map(card => card.name));
  await categoryFilter.getByRole('button', { name: '技巧', exact: true }).click();
  await expect(names).toHaveText(['咖啡']);
  await rarityFilter.getByRole('button', { name: '黑红', exact: true }).click();
  await expect(names).toHaveCount(0);
  await expect(page.getByText('没有符合筛选条件的卡牌。', { exact: true })).toBeVisible();
  await rarityFilter.getByRole('button', { name: '全部', exact: true }).click();
  await expect(names).toHaveText(owned.filter(card => card.type === 'technique').map(card => card.name));
  await expect(page.getByText('没有符合筛选条件的卡牌。', { exact: true })).toHaveCount(0);

  await rarityFilter.getByRole('button', { name: '灰', exact: true }).click();
  await page.getByRole('button', { name: '赛事大厅', exact: true }).click();
  await page.getByRole('button', { name: '我的卡组', exact: true }).click();
  await expect(names).toHaveText(['祖传模板']);
  await expect(rarityFilter.getByRole('button', { name: '灰', exact: true })).toHaveAttribute('aria-pressed', 'true');
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('xcpcard-save')!));
  expect(saved.profile).toEqual(profile);

  await page.locator('.collection-cards .game-card').click();
  await expect(page.locator('.deck-count')).toHaveText('1 / 24');
  await page.locator('.deck-entry').click();
  await expect(page.locator('.deck-count')).toHaveText('0 / 24');
  await expect(names).toHaveText(['祖传模板']);
  await categoryFilter.getByRole('button', { name: '全部', exact: true }).click();
  await rarityFilter.getByRole('button', { name: '全部', exact: true }).click();
  await expect(names).toHaveText(owned.map(card => card.name));
  await page.screenshot({ path: 'test-results/collection-filters.png', fullPage: true });
});
