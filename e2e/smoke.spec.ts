import { expect, test } from '@playwright/test';
import { ROUTES } from '../src/routes.ts';

for (const { path, title } of ROUTES) {
  test(`${path} loads`, async ({ page }) => {
    const response = await page.goto(path);
    expect(response?.status()).toBe(200);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(title);
  });
}

test('calculator returns a result', async ({ page }) => {
  await page.goto('/explore/');
  await page.getByLabel('Wages and salary').fill('60,000');
  await expect(page.getByRole('heading', { name: 'Your result' })).toBeVisible();
  await expect(page.getByText(/Difference:/)).toBeVisible();
});

test('scenario state survives a reload', async ({ page }) => {
  await page.goto('/explore/?s=year&y=1980');
  await expect(page.getByLabel('Year')).toHaveValue('1980');
});
