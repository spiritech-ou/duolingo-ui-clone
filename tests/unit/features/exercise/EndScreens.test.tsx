import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Exercise } from '@/api/schemas/lesson';
import {
  ExerciseRun,
  LessonOverScreen,
  OutOfHeartsScreen,
  PracticeCompleteScreen,
} from '@/features/exercise';
import { selectProfile, useProfileStore } from '@/store/useProfileStore';
import { useSessionStore } from '@/store/useSessionStore';
import { makeSynth } from './fakeSynth';

const USER = { id: 'u1', email: 'a@b.co', displayName: 'Ann' };

const makeExercise = (n: number): Exercise => ({
  id: `ex${n}`,
  type: 'picture-choice',
  english: `word${n}`,
  isNewWord: false,
  options: [
    { id: `ex${n}-a`, estonian: `vale${n}`, picture: { emoji: 'A', alt: `vale${n} picture` } },
    { id: `ex${n}-b`, estonian: `oige${n}`, picture: { emoji: 'B', alt: `oige${n} picture` } },
    { id: `ex${n}-c`, estonian: `muu${n}`, picture: { emoji: 'C', alt: `muu${n} picture` } },
  ],
  correctOptionId: `ex${n}-b`,
});

const profile = () => selectProfile(USER.id)(useProfileStore.getState());

function setupRun(mode: 'lesson' | 'practice', count = 1) {
  const router = createMemoryRouter(
    [
      {
        path: '/run',
        element: (
          <ExerciseRun
            mode={mode}
            lessonId="lesson-1"
            speechAdapter={makeSynth()}
            exercises={Array.from({ length: count }, (_, i) => makeExercise(i))}
          />
        ),
      },
      { path: '/learn', element: <p>learn page</p> },
      { path: '/practice', element: <p>practice page</p> },
    ],
    { initialEntries: ['/run'] },
  );
  render(<RouterProvider router={router} />);
  return { router, user: userEvent.setup() };
}

const click = (user: ReturnType<typeof userEvent.setup>, name: string) =>
  user.click(screen.getByRole('button', { name }));

async function answerRight(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('radio', { name: /oige/ }));
  await click(user, 'Check');
  await click(user, 'Continue');
}

describe('end screens', () => {
  beforeEach(() => {
    localStorage.clear();
    useSessionStore.getState().reset();
    useProfileStore.getState().reset();
    useSessionStore.getState().setSession({ token: 't', user: USER });
    useProfileStore.getState().markHeartsIntroSeen(USER.id);
  });

  describe('screens', () => {
    it('lesson over shows the stats, focuses the title and continues', async () => {
      const onContinue = vi.fn();
      const user = userEvent.setup();
      render(
        <LessonOverScreen
          stats={{ xp: 10, accuracy: 80, elapsedMs: 134000, isPerfect: false }}
          onContinue={onContinue}
        />,
      );
      const title = screen.getByRole('heading', { name: 'Lesson complete!' });
      expect(title).toHaveFocus();
      expect(screen.getByRole('main')).toBeInTheDocument();
      expect(screen.getByText('+10')).toBeInTheDocument();
      expect(screen.getByText('80%')).toBeInTheDocument();
      expect(screen.getByText('2:14')).toBeInTheDocument();
      await click(user, 'Continue');
      expect(onContinue).toHaveBeenCalledTimes(1);
    });

    it('a perfect lesson says so', () => {
      render(
        <LessonOverScreen
          stats={{ xp: 10, accuracy: 100, elapsedMs: 5000, isPerfect: true }}
          onContinue={vi.fn()}
        />,
      );
      expect(screen.getByRole('heading', { name: 'Perfect lesson!' })).toBeInTheDocument();
      expect(screen.getByText('0:05')).toBeInTheDocument();
    });

    it('practice complete shows +1 heart and the counter', () => {
      render(<PracticeCompleteScreen hearts={4} gainedHeart onContinue={vi.fn()} />);
      expect(screen.getByRole('heading', { name: 'Practice complete!' })).toHaveFocus();
      expect(screen.getByText('+1 heart')).toBeInTheDocument();
      expect(screen.getByLabelText('4 hearts left')).toBeInTheDocument();
    });

    it('practice complete at 5 hearts shows the counter and no +1 heart line', () => {
      render(<PracticeCompleteScreen hearts={5} gainedHeart={false} onContinue={vi.fn()} />);
      expect(screen.getByRole('heading', { name: 'Practice complete!' })).toHaveFocus();
      expect(screen.queryByText(/\+1/)).not.toBeInTheDocument();
      expect(screen.getByLabelText('5 hearts left')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Continue' })).toBeInTheDocument();
    });

    it('out of hearts offers practice and quit', async () => {
      const onPractice = vi.fn();
      const onQuit = vi.fn();
      const user = userEvent.setup();
      render(<OutOfHeartsScreen onPractice={onPractice} onQuit={onQuit} />);
      expect(screen.getByRole('heading', { name: "You're out of hearts" })).toHaveFocus();
      expect(screen.getByText('Practice to earn a heart, or come back later.')).toBeInTheDocument();
      await click(user, 'Quit lesson');
      expect(onQuit).toHaveBeenCalledTimes(1);
      await click(user, 'Practice to earn a heart');
      expect(onPractice).toHaveBeenCalledTimes(1);
    });
  });

  describe('Enter', () => {
    it('continues from the end screen, once', () => {
      const onContinue = vi.fn();
      render(
        <LessonOverScreen
          stats={{ xp: 10, accuracy: 100, elapsedMs: 0, isPerfect: true }}
          onContinue={onContinue}
        />,
      );
      fireEvent.keyDown(document.body, { key: 'Enter' });
      expect(onContinue).toHaveBeenCalledTimes(1);
    });

    it('ignores a held (repeating) Enter, modifiers and a focused button', () => {
      const onContinue = vi.fn();
      render(<PracticeCompleteScreen hearts={5} gainedHeart={false} onContinue={onContinue} />);
      fireEvent.keyDown(document.body, { key: 'Enter', repeat: true });
      fireEvent.keyDown(document.body, { key: 'Enter', ctrlKey: true });
      fireEvent.keyDown(screen.getByRole('button', { name: 'Continue' }), { key: 'Enter' });
      expect(onContinue).not.toHaveBeenCalled();
    });

    it('runs the primary action on the out-of-hearts screen', () => {
      const onPractice = vi.fn();
      const onQuit = vi.fn();
      render(<OutOfHeartsScreen onPractice={onPractice} onQuit={onQuit} />);
      fireEvent.keyDown(document.body, { key: 'Enter' });
      expect(onPractice).toHaveBeenCalledTimes(1);
      expect(onQuit).not.toHaveBeenCalled();
    });

    it('out of hearts: Enter with the heading focused runs Practice once and not Quit', async () => {
      const onPractice = vi.fn();
      const onQuit = vi.fn();
      const user = userEvent.setup();
      render(<OutOfHeartsScreen onPractice={onPractice} onQuit={onQuit} />);
      expect(screen.getByRole('heading', { name: "You're out of hearts" })).toHaveFocus();
      await user.keyboard('{Enter}');
      expect(onPractice).toHaveBeenCalledTimes(1);
      expect(onQuit).not.toHaveBeenCalled();
    });

    it('out of hearts: Enter with Quit lesson focused runs only Quit', async () => {
      const onPractice = vi.fn();
      const onQuit = vi.fn();
      const user = userEvent.setup();
      render(<OutOfHeartsScreen onPractice={onPractice} onQuit={onQuit} />);
      await user.tab();
      await user.tab();
      expect(screen.getByRole('button', { name: 'Quit lesson' })).toHaveFocus();
      await user.keyboard('{Enter}');
      expect(onQuit).toHaveBeenCalledTimes(1);
      expect(onPractice).not.toHaveBeenCalled();
    });

    it('out of hearts: Enter with Practice focused runs Practice once', async () => {
      const onPractice = vi.fn();
      const onQuit = vi.fn();
      const user = userEvent.setup();
      render(<OutOfHeartsScreen onPractice={onPractice} onQuit={onQuit} />);
      await user.tab();
      expect(screen.getByRole('button', { name: 'Practice to earn a heart' })).toHaveFocus();
      await user.keyboard('{Enter}');
      expect(onPractice).toHaveBeenCalledTimes(1);
      expect(onQuit).not.toHaveBeenCalled();
    });

    it('out of hearts: a held (repeating) Enter does nothing', () => {
      const onPractice = vi.fn();
      const onQuit = vi.fn();
      render(<OutOfHeartsScreen onPractice={onPractice} onQuit={onQuit} />);
      fireEvent.keyDown(document.body, { key: 'Enter', repeat: true });
      fireEvent.keyDown(screen.getByRole('heading', { name: "You're out of hearts" }), {
        key: 'Enter',
        repeat: true,
      });
      expect(onPractice).not.toHaveBeenCalled();
      expect(onQuit).not.toHaveBeenCalled();
    });

    it('out of hearts: Practice is the primary button, first in order, and Quit the secondary', () => {
      render(<OutOfHeartsScreen onPractice={vi.fn()} onQuit={vi.fn()} />);
      const [first, second] = screen.getAllByRole('button');
      expect(first).toHaveAccessibleName('Practice to earn a heart');
      expect(first?.className).toMatch(/primary/);
      expect(first?.className).not.toMatch(/secondary/);
      expect(second).toHaveAccessibleName('Quit lesson');
      expect(second?.className).toMatch(/secondary/);
    });

    it('the Enter that pressed Continue into out of hearts does not also run Practice', async () => {
      for (let i = 0; i < 4; i += 1) useProfileStore.getState().loseHeart(USER.id);
      const { router, user } = setupRun('lesson', 3);
      await click(user, 'Skip');
      fireEvent.keyDown(document.body, { key: 'Enter' });
      expect(await screen.findByRole('heading', { name: "You're out of hearts" })).toBeInTheDocument();
      expect(router.state.location.pathname).toBe('/run');
      fireEvent.keyDown(document.body, { key: 'Enter', repeat: true });
      expect(router.state.location.pathname).toBe('/run');
      fireEvent.keyDown(document.body, { key: 'Enter' });
      expect(router.state.location.pathname).toBe('/practice');
    });

    it('a held Enter that finished the last exercise does not press Continue on the end screen', async () => {
      const { router, user } = setupRun('lesson');
      await user.keyboard('2');
      await user.keyboard('{Enter}');
      fireEvent.keyDown(document.body, { key: 'Enter' });
      expect(await screen.findByRole('heading', { name: 'Perfect lesson!' })).toBeInTheDocument();
      fireEvent.keyDown(document.body, { key: 'Enter', repeat: true });
      expect(router.state.location.pathname).toBe('/run');
      fireEvent.keyDown(document.body, { key: 'Enter' });
      expect(router.state.location.pathname).toBe('/learn');
    });
  });

  describe('ExerciseRun', () => {
    it('finishing a lesson saves it once, shows the screen and continues to /learn replacing the entry', async () => {
      const { router, user } = setupRun('lesson');
      await answerRight(user);
      expect(
        await screen.findByRole('heading', { name: 'Perfect lesson!' }),
      ).toBeInTheDocument();
      expect(screen.getByText('+10')).toBeInTheDocument();
      expect(screen.getByText('100%')).toBeInTheDocument();
      expect(profile().completedLessonIds).toEqual(['lesson-1']);
      await click(user, 'Continue');
      expect(router.state.location.pathname).toBe('/learn');
      expect(screen.getByText('learn page')).toBeInTheDocument();
      await router.navigate(-1);
      // The /run entry was replaced, so Back does not reopen the lesson.
      expect(screen.queryByText('word0', { exact: false })).not.toBeInTheDocument();
    });

    it('a missed exercise gives "Lesson complete!" with the accuracy', async () => {
      const { user } = setupRun('lesson', 2);
      await user.click(screen.getByRole('radio', { name: /vale0/ }));
      await click(user, 'Check');
      await click(user, 'Continue');
      await answerRight(user);
      // The missed exercise comes back at the end of the queue.
      await answerRight(user);
      expect(await screen.findByRole('heading', { name: 'Lesson complete!' })).toBeInTheDocument();
      expect(screen.getByText('50%')).toBeInTheDocument();
    });

    it('losing the last heart leads to the out-of-hearts screen without saving the lesson', async () => {
      for (let i = 0; i < 4; i += 1) useProfileStore.getState().loseHeart(USER.id);
      const { router, user } = setupRun('lesson', 3);
      await click(user, 'Skip');
      await click(user, 'Continue');
      expect(await screen.findByRole('heading', { name: "You're out of hearts" })).toBeInTheDocument();
      expect(profile().completedLessonIds).toEqual([]);
      await click(user, 'Practice to earn a heart');
      expect(router.state.location.pathname).toBe('/practice');
    });

    it('quit lesson goes to /learn', async () => {
      for (let i = 0; i < 4; i += 1) useProfileStore.getState().loseHeart(USER.id);
      const { router, user } = setupRun('lesson', 3);
      await click(user, 'Skip');
      await click(user, 'Continue');
      await click(user, 'Quit lesson');
      expect(router.state.location.pathname).toBe('/learn');
      expect(profile().hearts).toBe(0);
    });

    it('arriving with no hearts shows the out-of-hearts screen at once', async () => {
      for (let i = 0; i < 5; i += 1) useProfileStore.getState().loseHeart(USER.id);
      setupRun('lesson', 3);
      expect(await screen.findByRole('heading', { name: "You're out of hearts" })).toBeInTheDocument();
    });

    it('practice complete gives one heart and continues to /learn', async () => {
      useProfileStore.getState().loseHeart(USER.id);
      useProfileStore.getState().loseHeart(USER.id);
      const { router, user } = setupRun('practice');
      await answerRight(user);
      expect(await screen.findByRole('heading', { name: 'Practice complete!' })).toBeInTheDocument();
      expect(profile().hearts).toBe(4);
      expect(screen.getByLabelText('4 hearts left')).toBeInTheDocument();
      expect(profile().completedLessonIds).toEqual([]);
      await click(user, 'Continue');
      expect(router.state.location.pathname).toBe('/learn');
    });

    it('practice never raises hearts above 5', async () => {
      const { user } = setupRun('practice');
      await answerRight(user);
      expect(await screen.findByRole('heading', { name: 'Practice complete!' })).toBeInTheDocument();
      expect(profile().hearts).toBe(5);
      expect(screen.getByLabelText('5 hearts left')).toBeInTheDocument();
    });
  });
});
