import { expect, test } from '@playwright/test';
import {
  createDefaultProfile,
  PROFILE_STORAGE_KEY,
  PROFILE_STORAGE_VERSION,
  type Profile,
} from '@/store/useProfileStore';
import { SESSION_STORAGE_KEY, SESSION_STORAGE_VERSION, type Session } from '@/store/useSessionStore';

const session: Session = {
  token: 'e2e-token',
  user: { id: 'ada@example.com', email: 'ada@example.com', displayName: 'Ada' },
};

const onboardedProfile: Profile = {
  ...createDefaultProfile(),
  onboarding: { completed: true, level: 0, startChoice: 'scratch' },
};

test('the theme can be switched from the login header', async ({ page }) => {
  await page.goto('/login');
  const root = page.locator('html');
  await expect(root).toHaveAttribute('data-theme', 'dark');
  await page.getByRole('button', { name: 'Switch to light theme', exact: true }).click();
  await expect(root).toHaveAttribute('data-theme', 'light');
  await expect(page.getByRole('button', { name: 'Switch to dark theme', exact: true })).toBeVisible();
});

test('a signed-in, onboarded user sees the 404 page with the header on an unknown URL', async ({ page }) => {
  await page.addInitScript(
    ({ sessionKey, sessionVersion, profileKey, profileVersion, seededSession, profile }) => {
      localStorage.setItem(sessionKey, JSON.stringify({ state: { session: seededSession }, version: sessionVersion }));
      localStorage.setItem(
        profileKey,
        JSON.stringify({ state: { profiles: { [seededSession.user.id]: profile } }, version: profileVersion }),
      );
    },
    {
      sessionKey: SESSION_STORAGE_KEY,
      sessionVersion: SESSION_STORAGE_VERSION,
      profileKey: PROFILE_STORAGE_KEY,
      profileVersion: PROFILE_STORAGE_VERSION,
      seededSession: session,
      profile: onboardedProfile,
    },
  );

  await page.goto('/does-not-exist');

  await expect(page.getByRole('heading', { name: 'Page not found', level: 1, exact: true })).toBeVisible();
  await expect(page.getByRole('banner')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Back to home', exact: true })).toBeVisible();
});
