import { expect, test } from '@playwright/test';
import { ROUTES } from '../src/routes.ts';

const HEADINGS: Record<string, string> = {
  '/explore/': 'Same size economy, divided another way',
  '/top/': 'Ten times smaller, again and again',
};

for (const { path, title } of ROUTES) {
  test(`${path} loads`, async ({ page }) => {
    const response = await page.goto(path);
    expect(response?.status()).toBe(200);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(HEADINGS[path] ?? title);
  });
}

test('calculator returns a result', async ({ page }) => {
  await page.goto('/explore/');
  await page.getByLabel('Wages and salary').fill('60,000');
  await expect(page.getByRole('heading', { name: 'Your result' })).toBeVisible();
  await expect(page.getByLabel(/Difference per year/)).toBeVisible();
  await expect(page.getByText(/Higher than about/)).toBeVisible();
});

test('scenario state survives a reload', async ({ page }) => {
  await page.goto('/explore/?s=year&y=1980');
  await expect(page.getByLabel("Divide today's income like the US in")).toHaveValue('1980');
});

test('zoom grid opens the top 1%', async ({ page }) => {
  await page.goto('/top/');
  await page.getByRole('button', { name: /Zoom in to the top 1%/ }).click();
  await expect(page.getByText(/The top 1% of adults/)).toBeVisible();
});
