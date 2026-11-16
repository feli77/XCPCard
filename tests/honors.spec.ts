import { test, expect, type Page } from '@playwright/test';
import { events } from '../src/content/data';
import { createProfile, settleMatch, startMatch } from '../src/game/engine';
import type { Profile } from '../src/game/types';

async function openHonors(page: Page, profile: Profile) {
  await page.addInitScript(profile => {
    if (!localStorage.getItem('xcpcard-save')) {
      localStorage.setItem('xcpcard-save', JSON.stringify({ profile, match: null, result: null, openedPack: null }));
    }
  }, profile);
  await page.goto('/');
  await page.getByRole('button', { name: '成就', exact: true }).click();
  await expect(page.locator('.honors-page')).toBeVisible();
}

function resultAt(eventId: string, rank: number, season: number) {
  const profile = createProfile();
  profile.season = season;
  const game = startMatch(profile, eventId, 42);
  game.status = 'finished';
  game.time = 300;
  game.problems[0].acTime = 100;
  game.problems[0].attempts = [{ time: 100, result: 'AC', score: 2000 }];
  const opponent = game.opponents[0];
  game.opponents = Array.from({ length: 49 }, (_, index) => ({
    ...structuredClone(opponent),
    id: `opponent-${index}`,
    results: game.problems.map((_, problemIndex) => ({
      attempts: problemIndex === 0 ? 1 : 0,
      acTime: problemIndex === 0 ? (index < rank - 1 ? 50 : 150) : null,
    })),
  }));
  return settleMatch(profile, game).result;
}

test('empty collection shows zero awards and achievement progress', async ({ page }) => {
  await openHonors(page, createProfile());
  await expect(page.locator('.highest-honor')).toBeVisible();
  await expect(page.locator('.highest-honor .award-badge')).toHaveCount(0);
  await expect(page.locator('.honor-stat strong')).toHaveText(['0', '0', '0', '0', '0', '0']);
  await expect(page.locator('.history-table tbody tr')).toHaveCount(0);
  await expect(page.getByText('成就系统', { exact: true })).toBeVisible();
  await expect(page.locator('.achievement-card')).toHaveCount(11);
  await expect(page.locator('.achievement-card.is-hidden')).toHaveCount(5);
  await expect(page.locator('[data-achievement="sorting"]')).toContainText('0 / 6');
  await expect(page.locator('.achievements')).not.toContainText('开发中');
});

test('collection totals, highest honor and history persist across seasons and reloads', async ({ page }) => {
  const profile = createProfile();
  const firstSeason = profile.season;
  profile.history = [
    resultAt('school', 1, firstSeason),
    resultAt('online', 2, firstSeason),
    resultAt('provincial', 1, firstSeason),
    resultAt('invitational', 2, firstSeason),
    resultAt('regional', 3, firstSeason),
    resultAt('ecf', 10, firstSeason),
    resultAt('wf', 20, firstSeason),
    resultAt('wf', 40, firstSeason),
    resultAt('wf', 25, firstSeason),
    resultAt('ecf', 2, firstSeason + 1),
  ];
  profile.season = firstSeason + 1;
  profile.playedEvents = ['ecf'];
  await openHonors(page, profile);

  const expectedCounts = { gold: 4, silver: 1, bronze: 2, champion: 1, 'runner-up': 2, 'third-place': 1 };
  for (const [award, count] of Object.entries(expectedCounts)) {
    await expect(page.locator(`.honor-stat[data-award="${award}"] strong`)).toHaveText(String(count));
  }
  const highest = page.locator('.highest-honor');
  await expect(highest).toContainText(String(firstSeason));
  await expect(highest).toContainText('WF');
  await expect(highest).toContainText('铜牌');
  await expect(highest).toContainText('第 20 名');

  const rows = page.locator('.history-table tbody tr');
  await expect(rows).toHaveCount(profile.history.length);
  for (const [index, result] of [...profile.history].reverse().entries()) {
    const row = rows.nth(index);
    await expect(row).toContainText(String(result.season));
    await expect(row).toContainText(events.find(event => event.id === result.eventId)!.name);
    await expect(row).toContainText(`#${result.rank}`);
    if (result.eventId === 'school' || result.eventId === 'online') {
      await expect(row.locator('.award-badge')).toHaveCount(0);
    }
  }

  await page.screenshot({ path: 'test-results/honors-desktop.png', fullPage: true, animations: 'disabled' });
  await page.reload();
  await page.getByRole('button', { name: '成就', exact: true }).click();
  await expect(rows).toHaveCount(profile.history.length);
  await expect(highest).toContainText('铜牌');
  const savedHistory = await page.evaluate(() => JSON.parse(localStorage.getItem('xcpcard-save')!).profile.history);
  expect(savedHistory).toEqual(profile.history);

  await page.setViewportSize({ width: 1040, height: 844 });
  await expect(page.getByRole('button', { name: '成就', exact: true })).toBeVisible();
  await expect(highest).toBeVisible();
  await page.screenshot({ path: 'test-results/honors-compact.png', fullPage: true, animations: 'disabled' });
});
