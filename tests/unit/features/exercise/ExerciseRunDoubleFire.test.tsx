import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StrictMode } from 'react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { beforeEach, describe, expect, it } from 'vitest';
import type { Exercise } from '@/api/schemas/lesson';
import { ExerciseRun } from '@/features/exercise';
import { selectProfile, useProfileStore } from '@/store/useProfileStore';
import { useSessionStore } from '@/store/useSessionStore';
import { makeSynth } from './fakeSynth';

const USER = { id: 'u1', email: 'a@b.co', displayName: 'Ann' };

const exercise: Exercise = {
  id: 'ex0',
  type: 'picture-choice',
  english: 'word0',
  isNewWord: false,
  options: [
    { id: 'ex0-a', estonian: 'vale0', picture: { emoji: 'A', alt: 'vale0 picture' } },
    { id: 'ex0-b', estonian: 'oige0', picture: { emoji: 'B', alt: 'oige0 picture' } },
    { id: 'ex0-c', estonian: 'muu0', picture: { emoji: 'C', alt: 'muu0 picture' } },
  ],
  correctOptionId: 'ex0-b',
};

const profile = () => selectProfile(USER.id)(useProfileStore.getState());

async function renderRunAtContinue(mode: 'lesson' | 'practice'): Promise<HTMLElement> {
  const router = createMemoryRouter(
    [
      {
        path: '/run',
        element: (
          <ExerciseRun
            mode={mode}
            lessonId="lesson-1"
            speechAdapter={makeSynth()}
            exercises={[exercise]}
          />
        ),
      },
      { path: '/learn', element: <p>learn page</p> },
    ],
    { initialEntries: ['/run'] },
  );
  render(
    <StrictMode>
      <RouterProvider router={router} />
    </StrictMode>,
  );
  const user = userEvent.setup();
  await user.click(screen.getByRole('radio', { name: /oige/ }));
  await user.click(screen.getByRole('button', { name: 'Check' }));
  return screen.getByRole('button', { name: 'Continue' });
}

describe('ExerciseRun completion fired twice', () => {
  beforeEach(() => {
    localStorage.clear();
    useSessionStore.getState().reset();
    useProfileStore.getState().reset();
    useSessionStore.getState().setSession({ token: 't', user: USER });
    useProfileStore.getState().markHeartsIntroSeen(USER.id);
  });

  it('gains the practice heart once', async () => {
    for (let i = 0; i < 3; i += 1) useProfileStore.getState().loseHeart(USER.id);
    expect(profile().hearts).toBe(2);
    const continueButton = await renderRunAtContinue('practice');
    // Two presses before React re-renders: the session reports completion twice.
    act(() => {
      continueButton.click();
      continueButton.click();
    });
    expect(await screen.findByRole('heading', { name: 'Practice complete!' })).toBeInTheDocument();
    expect(profile().hearts).toBe(3);
  });

  it.each([0, 1, 4])('with %i hearts before: shows +1 heart and the counter one higher', async (before) => {
    for (let i = 0; i < 5 - before; i += 1) useProfileStore.getState().loseHeart(USER.id);
    expect(profile().hearts).toBe(before);
    const continueButton = await renderRunAtContinue('practice');
    act(() => {
      continueButton.click();
    });
    expect(await screen.findByRole('heading', { name: 'Practice complete!' })).toBeInTheDocument();
    expect(screen.getByText('+1 heart')).toBeInTheDocument();
    const after = before + 1;
    expect(screen.getByLabelText(after === 1 ? '1 heart left' : `${after} hearts left`)).toBeInTheDocument();
    expect(profile().hearts).toBe(after);
  });

  it('with 5 hearts before: no +1 heart line, the counter reads 5, nothing changes', async () => {
    expect(profile().hearts).toBe(5);
    const continueButton = await renderRunAtContinue('practice');
    act(() => {
      continueButton.click();
      continueButton.click();
    });
    expect(await screen.findByRole('heading', { name: 'Practice complete!' })).toBeInTheDocument();
    expect(screen.queryByText(/\+1/)).not.toBeInTheDocument();
    expect(screen.getByLabelText('5 hearts left')).toBeInTheDocument();
    expect(profile().hearts).toBe(5);
  });

  it('saves the lesson once', async () => {
    const continueButton = await renderRunAtContinue('lesson');
    act(() => {
      continueButton.click();
      continueButton.click();
    });
    expect(await screen.findByRole('heading', { name: 'Perfect lesson!' })).toBeInTheDocument();
    expect(profile().completedLessonIds).toEqual(['lesson-1']);
  });
});
