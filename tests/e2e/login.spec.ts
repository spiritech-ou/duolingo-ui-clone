import { expect, test } from '@playwright/test';
import { INVALID_EMAIL_MESSAGE, MIN_PASSWORD_LENGTH, PASSWORD_TOO_SHORT_MESSAGE } from '@/api/schemas/auth';
import { LEVEL_PROMPT } from '@/features/onboarding/logic/levels';

test('logging in with valid credentials lands on the onboarding level question', async ({ page }) => {
  await page.goto('/login');
  await expect(page.getByRole('heading', { name: 'Log in', level: 1 })).toBeVisible();

  await page.getByRole('textbox', { name: 'Email' }).fill('learner@example.com');
  await page.getByRole('textbox', { name: 'Password' }).fill('p'.repeat(MIN_PASSWORD_LENGTH));
  await page.getByRole('button', { name: 'LOG IN' }).click();

  await expect(page).toHaveURL(/\/onboarding\/level$/);
  await expect(page.getByRole('heading', { name: LEVEL_PROMPT, level: 1 })).toBeVisible();
});

test('pressing LOG IN with empty fields shows both validation messages and stays on the login screen', async ({
  page,
}) => {
  await page.goto('/login');

  await page.getByRole('button', { name: 'LOG IN' }).click();

  await expect(page.getByText(INVALID_EMAIL_MESSAGE)).toBeVisible();
  await expect(page.getByText(PASSWORD_TOO_SHORT_MESSAGE)).toBeVisible();
  await expect(page).toHaveURL(/\/login$/);
});
