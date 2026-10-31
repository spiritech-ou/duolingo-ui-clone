import { expect, test } from '@playwright/test';
import { MIN_PASSWORD_LENGTH } from '@/api/schemas/auth';
import { LEVEL_OPTIONS, LEVEL_PROMPT } from '@/features/onboarding/logic/levels';
import { START_OPTIONS, START_PROMPT } from '@/features/onboarding/logic/startChoices';
import { UNIT_DEFINITIONS } from '@/mocks/data/vocabulary';

const basicConversations = LEVEL_OPTIONS.find((option) => option.label === 'I can have basic conversations');
const findLevel = START_OPTIONS.find((option) => option.value === 'find-level');
if (!basicConversations || !findLevel) throw new Error('The level or start-choice option is missing');

// "I can have basic conversations" is level 2 (levels are 0-based); "Find my level" starts at the
// unit with that 0-based index, i.e. index 2, which the page calls "Unit 3".
const startUnitIndex = 2;
if (basicConversations.level !== startUnitIndex) throw new Error('Level numbering changed');
const PLACEMENT_NOTE = 'We recommend starting at Unit 3 based on your answer.';
const startUnit = UNIT_DEFINITIONS[startUnitIndex];
const startLesson = startUnit?.lessons[0];
const firstUnit = UNIT_DEFINITIONS[0];
const firstLesson = firstUnit?.lessons[0];
if (!startLesson || !firstLesson) throw new Error('The vocabulary dataset lacks the start unit or first lesson');

// Lesson numbers keep counting across units.
const startLessonNumber =
  UNIT_DEFINITIONS.slice(0, startUnitIndex).reduce((count, unit) => count + unit.lessons.length, 0) + 1;

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// The recommended node pulses forever, which never settles for a pointer click; reduce motion.
test.use({ reducedMotion: 'reduce' });

test('a new learner who picks "Find my level" starts at the recommended unit and can still open Unit 1', async ({
  page,
}) => {
  await page.goto('/learn');
  await expect(page).toHaveURL(/\/login$/);

  await page.getByRole('textbox', { name: 'Email' }).fill('finder@example.com');
  await page.getByRole('textbox', { name: 'Password' }).fill('p'.repeat(MIN_PASSWORD_LENGTH));
  await page.getByRole('button', { name: 'LOG IN' }).click();

  await expect(page).toHaveURL(/\/onboarding\/level$/);
  await expect(page.getByRole('heading', { name: LEVEL_PROMPT, level: 1 })).toBeVisible();
  await page.getByText(basicConversations.label, { exact: true }).click();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();

  await expect(page).toHaveURL(/\/onboarding\/start$/);
  await expect(page.getByRole('heading', { name: START_PROMPT, level: 1 })).toBeVisible();
  await page.getByText(findLevel.label, { exact: true }).click();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();

  await expect(page).toHaveURL(/\/learn$/);
  const note = page.getByText(PLACEMENT_NOTE, { exact: true });
  // The Notice is a live region filled just after mount; its "Got it" button exists with it.
  const gotIt = page.getByRole('button', { name: 'Got it', exact: true });
  await expect(note).toBeVisible();
  await expect(gotIt).toBeVisible();
  await expect(page.getByRole('heading', { name: /^Unit 3\b/, level: 2 })).toContainText(startUnit?.title ?? '');
  await expect(
    page.getByRole('button', {
      name: new RegExp(`^Lesson ${startLessonNumber}, ${escapeRegExp(startLesson.title)}, recommended`),
    }),
  ).toBeVisible();

  await gotIt.click();
  await expect(gotIt).toBeHidden();
  await expect(note).toBeHidden();

  await page.reload();
  await expect(page).toHaveURL(/\/learn$/);
  // Wait until the path is rendered, then the Notice (button and text) must be absent.
  await expect(page.getByRole('heading', { name: /^Unit 1\b/, level: 2 })).toBeVisible();
  await expect(page.getByRole('button', { name: /^Lesson 9\b/ })).toBeVisible();
  await expect(gotIt).toBeHidden();
  await expect(note).toBeHidden();

  // A Unit 1 lesson is not locked: pressing it opens the lesson screen.
  await page.getByRole('button', { name: new RegExp(`^Lesson 1, ${escapeRegExp(firstLesson.title)}$`) }).click();
  await expect(page).toHaveURL(new RegExp(`/lesson/${firstLesson.id}$`));
  await expect(page.getByRole('heading', { name: /^Which one of these is “.+”\?$/, level: 1 })).toBeVisible();
});
