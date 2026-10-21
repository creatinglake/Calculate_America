import { expect, test } from '@playwright/test';
import { ROUTES } from '../src/routes.ts';

for (const { path, title } of ROUTES) {
  test(`${path} loads`, async ({ page }) => {
    const response = await page.goto(path);
    expect(response?.status()).toBe(200);
    await expect(page.getByRole('heading', { level: 2 })).toHaveText(title);
  });
}
