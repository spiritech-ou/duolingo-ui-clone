import { expect, test } from '@playwright/test';
import { UNIT_DEFINITIONS } from '@/mocks/data/vocabulary';
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

const firstUnit = UNIT_DEFINITIONS[0];
const firstLesson = firstUnit?.lessons[0];
const secondLesson = firstUnit?.lessons[1];
if (!firstLesson || !secondLesson) throw new Error('The vocabulary dataset has no first two lessons');

// A lesson asks every word twice: a "new word" round, then a practice round.
const EXERCISE_COUNT = firstLesson.items.length * 2;

// The praise line after the n-th correct answer, repeating after the fourth (product spec, OQ-27).
const PRAISES = ['Great job!', 'Nice one!', 'Perfect!', 'Well done!'] as const;

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// The recommended node pulses forever, which never settles for a pointer click; reduce motion
// so the learner-style click on the node works.
test.use({ reducedMotion: 'reduce' });

test('a learner completes the first lesson with every answer right and returns to the path', async ({ page }) => {
  // The init script runs on every page load: seed only when nothing is stored, so progress survives navigation.
  await page.addInitScript(
    ({ sessionKey, sessionVersion, profileKey, profileVersion, seededSession, profile }) => {
      if (localStorage.getItem(sessionKey) !== null) return;
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

  await page.goto('/learn');

  const firstNode = page.getByRole('button', {
    name: new RegExp(`^Lesson 1, ${escapeRegExp(firstLesson.title)}, recommended`),
  });
  await firstNode.click();
  await expect(page).toHaveURL(new RegExp(`/lesson/${firstLesson.id}$`));

  const progress = page.getByRole('progressbar', { name: 'Lesson progress' });
  await expect(progress).toHaveAttribute('aria-valuenow', '0');
  await expect(progress).toHaveAttribute('aria-valuemax', String(EXERCISE_COUNT));

  for (let index = 0; index < EXERCISE_COUNT; index += 1) {
    await test.step(`exercise ${index + 1} of ${EXERCISE_COUNT}`, async () => {
      const heading = page.getByRole('heading', { level: 1 });
      await expect(heading).toHaveText(/^Which one of these is “.+”\?$/);
      const english = /“(.+)”/.exec((await heading.textContent()) ?? '')?.[1];
      const item = firstLesson.items.find((candidate) => candidate.english === english);
      if (!item) throw new Error(`The question asks about "${english}", which is not in lesson ${firstLesson.id}`);

      // The radio input is visually hidden; the card (its label) is the click target.
      await page.getByRole('img', { name: item.picture.alt, exact: true }).click();
      await expect(page.getByRole('radio', { name: `${item.picture.alt} ${item.estonian}` })).toBeChecked();
      await page.getByRole('button', { name: 'Check', exact: true }).click();

      await expect(page.getByText(PRAISES[index % PRAISES.length] ?? '', { exact: true })).toBeVisible();
      await expect(progress).toHaveAttribute('aria-valuenow', String(index + 1));
      await expect(page.getByRole('img', { name: '5 hearts left', exact: true })).toBeVisible();

      const continueButton = page.getByRole('button', { name: 'Continue', exact: true });
      await continueButton.click();
      if (index < EXERCISE_COUNT - 1) await expect(continueButton).toBeHidden();
    });
  }

  await expect(page.getByRole('heading', { name: 'Perfect lesson!', level: 1 })).toBeVisible();
  const results = page.getByLabel('Lesson results');
  // The stat texts run together ("+10Accuracy"), so guard digits with lookarounds instead of \b.
  await expect(results).toContainText(/(?<!\d)\+10(?!\d)/);
  await expect(results).toContainText(/(?<!\d)100%/);

  await page.getByRole('button', { name: 'Continue', exact: true }).click();

  await expect(page).toHaveURL(/\/learn$/);
  await expect(page.getByRole('img', { name: '5 hearts left', exact: true })).toBeVisible();
  await expect(
    page.getByRole('button', { name: new RegExp(`^Lesson 1, ${escapeRegExp(firstLesson.title)}, completed`) }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: new RegExp(`^Lesson 2, ${escapeRegExp(secondLesson.title)}, recommended`) }),
  ).toBeVisible();
});
