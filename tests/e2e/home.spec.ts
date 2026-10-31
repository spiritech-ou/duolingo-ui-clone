import { expect, test } from '@playwright/test';

test('the placeholder home route renders and its button is reachable', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Welcome' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Get started' })).toBeEnabled();
});

test('the theme can be switched', async ({ page }) => {
  await page.goto('/');
  const root = page.locator('html');
  await expect(root).toHaveAttribute('data-theme', 'dark');
  await page.getByRole('button', { name: 'Switch to light theme' }).click();
  await expect(root).toHaveAttribute('data-theme', 'light');
});

test('an unknown route shows the 404 page', async ({ page }) => {
  await page.goto('/does-not-exist');
  await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible();
});
