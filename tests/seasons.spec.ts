import { test, expect } from '@playwright/test';
import { createProfile, settleMatch, startMatch } from '../src/game/engine';

for (const recordedSeasons of [false, true]) {
  test(`migrates legacy seasons and awards while preserving an active match (recorded seasons: ${recordedSeasons})`, async ({ page }) => {
    const profile = createProfile();
    profile.season = 3;
    profile.history = ['regional', 'ecf'].map((eventId, index) => {
      const oldProfile = { ...profile, season: index + 1 };
      const game = startMatch(oldProfile, eventId, 42);
      game.opponents = game.opponents.slice(0, 19);
      const result = settleMatch(oldProfile, game).result;
      return { ...result, rank: index ? 4 : 2, seasonEnded: true };
    });
    const legacyProfile = { ...profile, history: profile.history.map(({ season, medal, title, ...result }) =>
      recordedSeasons ? { ...result, season } : result,
    ) };
    const match = startMatch(profile, 'school', 123);
    match.time = 17;
    match.opponents = match.opponents.slice(0, 19);
    await page.addInitScript(session => {
      if (!localStorage.getItem('xcpcard-save')) localStorage.setItem('xcpcard-save', JSON.stringify(session));
    }, { profile: legacyProfile, match, result: null, openedPack: null });
    await page.goto('/');
    await expect(page.locator('.match-title')).toContainText('2028 赛季');
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('xcpcard-save')!));
    expect(saved.profile.season).toBe(2028);
    expect(saved.profile.history.map((result: { season: number }) => result.season)).toEqual([2026, 2027]);
    expect(saved.profile.history.map((result: { medal: string }) => result.medal)).toEqual(['gold', 'silver']);
    expect(saved.profile.history[0].title).toBe('runner-up');
    expect(saved.match).toEqual({ ...match, paused: true });
    await page.getByRole('button', { name: '保存并离场' }).click();
    await expect(page.locator('.ticket-top')).toContainText('2028');
    await page.getByRole('button', { name: '收藏', exact: true }).click();
    await expect(page.locator('.highest-honor')).toContainText('2027 赛季 EC-Final');
    await expect(page.locator('.highest-honor')).toContainText('银牌');
    await expect(page.locator('.history-table tbody tr').last()).toContainText('2026 赛季');
    await page.reload();
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('xcpcard-save')!).profile)).toEqual(saved.profile);
  });
}
