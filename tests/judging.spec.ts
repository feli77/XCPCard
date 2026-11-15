import { test, expect, type Page } from '@playwright/test';
import { startMatch } from '../src/game/engine';
import type { Match } from '../src/game/types';
import { createTestProfile } from './fixtures';

const storageKey = 'xcpcard-save';
const colors = {
  AC: 'rgb(224, 232, 212)',
  WA: 'rgb(237, 217, 211)',
};
const currentColors = {
  AC: 'rgb(203, 215, 188)',
  WA: 'rgb(223, 194, 186)',
};

async function state(page: Page): Promise<Match> {
  return page.evaluate(key => JSON.parse(localStorage.getItem(key)!).match, storageKey);
}

async function load(page: Page, match: Match) {
  await page.clock.install({ time: new Date('2026-01-01T00:00:00Z') });
  await page.clock.pauseAt(new Date('2026-01-01T00:00:01Z'));
  await page.goto('/');
  await page.evaluate(({ key, profile, match }) => {
    localStorage.setItem(key, JSON.stringify({ profile, match, result: null, openedPack: null }));
  }, { key: storageKey, profile: createTestProfile(), match });
  await page.reload();
}

for (const result of ['AC', 'WA'] as const) {
  test(`${result}: judging cycles colors, pauses, survives reload and keeps the final color`, async ({ page }) => {
    const match = startMatch(createTestProfile(), 'school', 222);
    const problem = match.problems[0];
    problem.readProgress = problem.readTime;
    problem.difficulty = result === 'AC' ? -100000 : 100000;
    problem.table = [{ ...match.hand.shift()!, progress: 6, duration: 6, active: true }];
    await load(page, match);
    await page.getByRole('button', { name: '▶ 继续比赛', exact: true }).click();
    await page.getByRole('button', { name: '提交 ↵', exact: true }).click();
    const desk = page.locator('.table-panel');
    const menuItem = page.locator('.problem-button').first();
    await expect(desk).toHaveAttribute('aria-busy', 'true');
    await expect(menuItem).toHaveAttribute('aria-busy', 'true');
    await expect(page.getByRole('button', { name: '判题中 ↵', exact: true })).toBeDisabled();
    await expect(page.locator('.judge-toast:not(.judging-toast)')).toHaveCount(0);
    expect((await state(page)).problems[0].attempts).toHaveLength(0);
    await expect(page.locator('.table-cards .game-card')).toHaveCount(1);
    await expect(page.locator('.table-cards .game-card')).not.toHaveAttribute('data-draggable');
    await expect(page.locator('.table-cards .card-discard')).toHaveCount(0);
    for (const [elapsed, color] of [[0, 'AC'], [200, 'AC'], [100, 'WA'], [200, 'AC']] as const) {
      await page.clock.runFor(elapsed);
      await expect(desk).toHaveCSS('background-color', colors[color]);
      await expect(menuItem).toHaveCSS('background-color', currentColors[color]);
    }
    await page.locator('.problem-button').nth(1).click();
    await expect(desk).toHaveCSS('background-color', 'rgb(238, 236, 227)');
    await page.clock.runFor(300);
    await expect(menuItem).toHaveCSS('background-color', colors.WA);
    await page.locator('.problem-button').first().click();
    await expect(desk).toHaveCSS('background-color', colors.WA);
    if (result === 'AC') await page.screenshot({ path: 'test-results/judging-active.png' });
    await page.getByRole('button', { name: 'Ⅱ 暂停', exact: true }).click();
    const paused = await state(page);
    const pausedColor = await desk.evaluate(element => getComputedStyle(element).backgroundColor);
    const pausedMenuColor = await menuItem.evaluate(element => getComputedStyle(element).backgroundColor);
    await page.clock.runFor(6000);
    expect(await state(page)).toEqual(paused);
    await expect(desk).toHaveCSS('background-color', pausedColor);
    await expect(menuItem).toHaveCSS('background-color', pausedMenuColor);
    await page.reload();
    expect((await state(page)).problems[0].judging).toEqual(paused.problems[0].judging);
    await expect(desk).toHaveCSS('background-color', pausedColor);
    await expect(menuItem).toHaveCSS('background-color', pausedMenuColor);
    await page.getByRole('button', { name: '▶ 继续比赛', exact: true }).click();
    await page.locator('.problem-button').nth(1).click();
    const remaining = paused.problems[0].judging!.remaining;
    await page.clock.runFor(Math.ceil(remaining / 100) * 100);
    await expect(menuItem).toHaveAttribute('aria-busy', 'false');
    await expect(menuItem).not.toHaveClass(/judging/);
    await expect(menuItem).toHaveCSS('background-color', colors[result]);
    await page.locator('.problem-button').first().click();
    await expect(desk).toHaveAttribute('aria-busy', 'false');
    const attempt = (await state(page)).problems[0].attempts[0];
    expect(attempt.result).toBe(result);
    const color = colors[attempt.result];
    await expect(desk).toHaveCSS('background-color', color);
    await expect(menuItem).toHaveCSS('background-color', currentColors[result]);
    if (result === 'AC') await page.screenshot({ path: 'test-results/judging-result.png' });
    await page.locator('.problem-button').nth(1).click();
    await expect(desk).toHaveCSS('background-color', 'rgb(238, 236, 227)');
    await expect(menuItem).toHaveCSS('background-color', color);
    await page.locator('.problem-button').first().click();
    await expect(desk).toHaveCSS('background-color', color);
    await expect(menuItem).toHaveCSS('background-color', currentColors[result]);
    await page.clock.runFor(6000);
    await expect(desk).toHaveCSS('background-color', color);
  });
}

for (const verdict of ['AC', 'WA', 'TLE', 'MLE', 'RE'] as const) {
  test(`${verdict} uses the success or failure background after loading`, async ({ page }) => {
    const match = startMatch(createTestProfile(), 'school', 222);
    match.problems[0].attempts = [{ time: 0, score: 1000, result: verdict === 'AC' ? 'AC' : 'WA', verdict }];
    await load(page, match);
    const result = verdict === 'AC' ? 'AC' : 'WA';
    const menuItem = page.locator('.problem-button').first();
    await expect(page.locator('.table-panel')).toHaveCSS('background-color', colors[result]);
    await expect(menuItem).toHaveCSS('background-color', currentColors[result]);
    await page.locator('.problem-button').nth(1).click();
    await expect(menuItem).toHaveCSS('background-color', colors[result]);
    await expect(page.locator('.problem-button').nth(1)).toHaveCSS('background-color', 'rgb(222, 217, 206)');
    await menuItem.hover();
    await expect(menuItem).toHaveCSS('background-color', colors[result]);
  });
}

test('contest settlement waits for the final in-flight judgement', async ({ page }) => {
  const match = startMatch(createTestProfile(), 'school', 222);
  match.time = 299;
  const problem = match.problems[0];
  problem.readProgress = problem.readTime;
  problem.difficulty = -100000;
  problem.table = [{ ...match.hand.shift()!, progress: 6, duration: 6, active: true }];
  await load(page, match);
  await page.getByRole('button', { name: '▶ 继续比赛', exact: true }).click();
  await page.getByRole('button', { name: '提交 ↵', exact: true }).click();
  const judging = (await state(page)).problems[0].judging!;
  expect(judging.duration).toBeGreaterThan(1000);
  await page.clock.runFor(1000);
  expect((await state(page)).status).toBe('finished');
  await expect(page.locator('.result-modal')).toHaveCount(0);
  await page.clock.runFor(4000);
  await expect(page.locator('.result-modal')).toBeVisible();
  expect((await state(page)).problems[0].acTime).toBe(299);
  await expect(page.locator('.result-values > div').first()).toContainText('1');
});
