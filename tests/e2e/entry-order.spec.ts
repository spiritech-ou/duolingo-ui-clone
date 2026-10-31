import { expect, test } from '@playwright/test';
import { MIN_PASSWORD_LENGTH } from '@/api/schemas/auth';
import { LEVEL_OPTIONS, LEVEL_PROMPT } from '@/features/onboarding/logic/levels';

const newLearner = LEVEL_OPTIONS.find((option) => option.level === 0);
if (!newLearner) throw new Error('The lowest level option is missing from LEVEL_OPTIONS');

test('a signed-out visitor is guided from login through onboarding to the learning path, and keeps the session on reload', async ({
  page,
}) => {
  await page.goto('/learn');
  await expect(page).toHaveURL(/\/login$/);

  await page.getByRole('textbox', { name: 'Email' }).fill('learner@example.com');
  await page.getByRole('textbox', { name: 'Password' }).fill('p'.repeat(MIN_PASSWORD_LENGTH));
  await page.getByRole('button', { name: 'LOG IN' }).click();

  await expect(page).toHaveURL(/\/onboarding\/level$/);
  await expect(page.getByRole('heading', { name: LEVEL_PROMPT, level: 1 })).toBeVisible();

  await page.getByText(newLearner.label, { exact: true }).click();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();

  await expect(page).toHaveURL(/\/learn$/);
  await expect(page.getByRole('heading', { name: /^Unit 1\b/, level: 2 })).toBeVisible();
  await expect(page.getByRole('img', { name: '5 hearts left', exact: true })).toBeVisible();

  await page.reload();

  await expect(page).toHaveURL(/\/learn$/);
  await expect(page.getByRole('heading', { name: /^Unit 1\b/, level: 2 })).toBeVisible();
  await expect(page.getByRole('img', { name: '5 hearts left', exact: true })).toBeVisible();
});
