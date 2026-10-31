import { expect, test } from '@playwright/test';
import { UNIT_DEFINITIONS, VOCABULARY_ITEMS } from '@/mocks/data/vocabulary';
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

const firstLesson = UNIT_DEFINITIONS[0]?.lessons[0];
if (!firstLesson) throw new Error('The vocabulary dataset has no first lesson');

// The learner starts with all hearts and every skip costs one (product spec).
const STARTING_HEARTS = onboardedProfile.hearts;
// A practice session asks five exercises (product spec).
const PRACTICE_EXERCISE_COUNT = 5;

// Same literal sequence as complete-lesson.spec.ts (product spec, OQ-27).
const PRAISES = ['Great job!', 'Nice one!', 'Perfect!', 'Well done!'] as const;

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function heartsLabel(count: number): string {
  if (count === 0) return 'No hearts left';
  return count === 1 ? '1 heart left' : `${count} hearts left`;
}

// The recommended node pulses forever, which never settles for a pointer click; reduce motion
// so the learner-style click on the node works.
test.use({ reducedMotion: 'reduce' });

test('a learner runs out of hearts, practises and earns one back', async ({ page }) => {
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
  await expect(page.getByRole('img', { name: heartsLabel(STARTING_HEARTS), exact: true })).toBeVisible();

  await page
    .getByRole('button', { name: new RegExp(`^Lesson 1, ${escapeRegExp(firstLesson.title)}, recommended`) })
    .click();
  await expect(page).toHaveURL(new RegExp(`/lesson/${firstLesson.id}$`));

  const firstMistakeModal = page.getByRole('dialog', { name: 'Each mistake costs 1 heart!' });
  const skip = page.getByRole('button', { name: 'Skip', exact: true });
  const continueButton = page.getByRole('button', { name: 'Continue', exact: true });

  // Skipping costs a heart just like a wrong answer: spend them all.
  for (let mistake = 1; mistake <= STARTING_HEARTS; mistake += 1) {
    await test.step(`mistake ${mistake} of ${STARTING_HEARTS}`, async () => {
      const remaining = STARTING_HEARTS - mistake;
      await skip.click();
      await expect(page.getByRole('img', { name: heartsLabel(remaining), exact: true }).first()).toBeVisible();

      if (mistake === 1) {
        // The modal appears for the first mistake only.
        await expect(firstMistakeModal).toBeVisible();
        await page.getByRole('button', { name: 'Keep going', exact: true }).click();
        await expect(firstMistakeModal).toBeHidden();
      } else {
        await expect(firstMistakeModal).toBeHidden();
      }

      await continueButton.click();
    });
  }

  await expect(page.getByRole('heading', { name: "You're out of hearts", level: 1 })).toBeVisible();
  await page.getByRole('button', { name: 'Practice to earn a heart', exact: true }).click();
  await expect(page).toHaveURL(/\/practice$/);
  await expect(page.getByRole('img', { name: heartsLabel(0), exact: true })).toBeVisible();

  for (let index = 0; index < PRACTICE_EXERCISE_COUNT; index += 1) {
    await test.step(`practice exercise ${index + 1} of ${PRACTICE_EXERCISE_COUNT}`, async () => {
      const heading = page.getByRole('heading', { level: 1 });
      await expect(heading).toHaveText(/^Which one of these is “.+”\?$/);
      const english = /“(.+)”/.exec((await heading.textContent()) ?? '')?.[1];
      const item = VOCABULARY_ITEMS.find((candidate) => candidate.english === english);
      if (!item) throw new Error(`The question asks about "${english}", which is not in the vocabulary dataset`);

      // The radio input is visually hidden; the card (its label) is the click target.
      await page.getByRole('img', { name: item.picture.alt, exact: true }).click();
      await expect(page.getByRole('radio', { name: `${item.picture.alt} ${item.estonian}` })).toBeChecked();
      await page.getByRole('button', { name: 'Check', exact: true }).click();

      await expect(page.getByText(PRAISES[index % PRAISES.length] ?? '', { exact: true })).toBeVisible();
      await continueButton.click();
      if (index < PRACTICE_EXERCISE_COUNT - 1) await expect(continueButton).toBeHidden();
    });
  }

  await expect(page.getByRole('heading', { name: 'Practice complete!' })).toBeVisible();
  await expect(page.getByText('+1 heart', { exact: true })).toBeVisible();
  await expect(page.getByRole('img', { name: heartsLabel(1), exact: true })).toBeVisible();

  await continueButton.click();

  await expect(page).toHaveURL(/\/learn$/);
  await expect(page.getByRole('img', { name: heartsLabel(1), exact: true })).toBeVisible();
});
