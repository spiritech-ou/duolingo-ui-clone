import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { delay, http, HttpResponse } from 'msw';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Exercise } from '@/api/schemas/lesson';
import blueFlame from '@/assets/brand/flame.svg';
import redFlame from '@/assets/brand/flame-red.svg';
import {
  ExerciseRun,
  LessonOverScreen,
  LessonPage,
  OutOfHeartsScreen,
  PracticeCompleteScreen,
  PracticePage,
} from '@/features/exercise';
import { FirstMistakeModal } from '@/features/exercise/containers/FirstMistakeModal';
import { generateCourse } from '@/mocks/data/generators';
import { lessonEmptyHandler, lessonErrorHandler, lessonNotFoundHandler } from '@/mocks/handlers/lessons';
import { practiceEmptyHandler, practiceErrorHandler } from '@/mocks/handlers/practice';
import { server } from '@/mocks/server';
import { useProfileStore } from '@/store/useProfileStore';
import { useSessionStore } from '@/store/useSessionStore';
import { makeSynth } from './fakeSynth';

const USER = { id: 'u1', email: 'a@b.co', displayName: 'Ann' };
const lesson = generateCourse().units[0]?.lessons[0];
if (!lesson) throw new Error('fixture needs a lesson');

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

/** Every flame on the screen, as `{ src, size }`; flames are decorative, so found by data attribute. */
function flames(root: ParentNode = document.body) {
  return Array.from(root.querySelectorAll<HTMLImageElement>('img[data-mood]')).map((img) => ({
    src: img.getAttribute('src'),
    size: Number(img.getAttribute('width')),
    alt: img.getAttribute('alt'),
  }));
}

const click = (user: ReturnType<typeof userEvent.setup>, name: string) =>
  user.click(screen.getByRole('button', { name }));

function renderRoutes(path: string) {
  const router = createMemoryRouter(
    [
      { path: '/lesson/:lessonId', element: <LessonPage /> },
      { path: '/practice', element: <PracticePage /> },
      { path: '/learn', element: <p>learn</p> },
    ],
    { initialEntries: ['/learn', path], initialIndex: 1 },
  );
  render(<RouterProvider router={router} />);
  return userEvent.setup();
}

function renderRun(mode: 'lesson' | 'practice') {
  const router = createMemoryRouter(
    [
      {
        path: '/run',
        element: (
          <ExerciseRun
            mode={mode}
            lessonId="lesson-1"
            speechAdapter={makeSynth()}
            exercises={[makeExercise(0), makeExercise(1)]}
          />
        ),
      },
      { path: '/learn', element: <p>learn</p> },
    ],
    { initialEntries: ['/run'] },
  );
  render(<RouterProvider router={router} />);
  return userEvent.setup();
}

describe('flame colour on the exercise surfaces', () => {
  beforeEach(() => {
    localStorage.clear();
    useSessionStore.getState().reset();
    useProfileStore.getState().reset();
    useSessionStore.getState().setSession({ token: 't', user: USER });
    useProfileStore.getState().markHeartsIntroSeen(USER.id);
  });

  describe('state screens of the lesson route', () => {
    const lessonPath = `/lesson/${lesson.id}`;

    it('loading is the blue flame', async () => {
      server.use(
        http.get('*/api/lessons/:lessonId', async () => {
          await delay(30);
          return HttpResponse.json({ id: lesson.id, title: 'T', exercises: [] });
        }),
      );
      renderRoutes(lessonPath);
      expect(flames()).toEqual([{ src: blueFlame, size: 120, alt: '' }]);
      // Let the request settle: an in-flight request must not outlive its test (it would leak into the next).
      await screen.findByRole('heading', { name: 'This lesson has no exercises yet' });
    });

    it('a load error is the red flame, and Try again returns to the blue one', async () => {
      server.use(lessonErrorHandler);
      const user = renderRoutes(lessonPath);
      await screen.findByRole('heading', { name: "We couldn't load this lesson" });
      expect(flames()).toEqual([{ src: redFlame, size: 120, alt: '' }]);

      server.use(
        http.get('*/api/lessons/:lessonId', async () => {
          await delay(50);
          return HttpResponse.json({ id: lesson.id, title: 'T', exercises: [] });
        }),
      );
      await click(user, 'Try again');
      expect(flames().map((flame) => flame.src)).toEqual([blueFlame]);
      // Let the retry settle (an empty lesson, also blue) so no request outlives the test.
      await screen.findByRole('heading', { name: 'This lesson has no exercises yet' });
      expect(flames().map((flame) => flame.src)).toEqual([blueFlame]);
    });

    it('not found is the red flame', async () => {
      server.use(lessonNotFoundHandler);
      renderRoutes('/lesson/nope');
      await screen.findByRole('heading', { name: "We couldn't find this lesson" });
      expect(flames().map((flame) => flame.src)).toEqual([redFlame]);
    });

    it('an empty lesson is the blue flame (not a failure)', async () => {
      server.use(lessonEmptyHandler);
      renderRoutes(lessonPath);
      await screen.findByRole('heading', { name: 'This lesson has no exercises yet' });
      expect(flames().map((flame) => flame.src)).toEqual([blueFlame]);
    });
  });

  describe('state screens of the practice route', () => {
    it('a load error is the red flame', async () => {
      server.use(practiceErrorHandler);
      renderRoutes('/practice');
      await screen.findByRole('heading', { name: "We couldn't load this practice" });
      expect(flames().map((flame) => flame.src)).toEqual([redFlame]);
    });

    it('an empty practice is the blue flame', async () => {
      server.use(practiceEmptyHandler);
      renderRoutes('/practice');
      await screen.findByRole('heading', { name: 'This practice has no exercises yet' });
      expect(flames().map((flame) => flame.src)).toEqual([blueFlame]);
    });
  });

  describe('end screens', () => {
    it('out of hearts is the red flame at 160px', () => {
      render(<OutOfHeartsScreen onPractice={vi.fn()} onQuit={vi.fn()} />);
      expect(flames()).toEqual([{ src: redFlame, size: 160, alt: '' }]);
    });

    it('lesson over is the blue flame at 160px', () => {
      render(
        <LessonOverScreen
          stats={{ xp: 10, accuracy: 100, elapsedMs: 5000, isPerfect: true }}
          onContinue={vi.fn()}
        />,
      );
      expect(flames()).toEqual([{ src: blueFlame, size: 160, alt: '' }]);
    });

    it('practice complete is the blue flame at 160px', () => {
      render(<PracticeCompleteScreen hearts={4} onContinue={vi.fn()} />);
      expect(flames()).toEqual([{ src: blueFlame, size: 160, alt: '' }]);
    });
  });

  describe('first-mistake modal', () => {
    it('shows the red 96px flame above the hearts row, decorative', () => {
      render(<FirstMistakeModal hearts={4} onDismiss={vi.fn()} />);
      const dialog = screen.getByRole('dialog', { name: 'Each mistake costs 1 heart!' });
      expect(flames(dialog)).toEqual([{ src: redFlame, size: 96, alt: '' }]);
      const flame = dialog.querySelector('img[data-mood]');
      const hearts = within(dialog).getByRole('img', { name: '4 hearts left' });
      expect(flame?.compareDocumentPosition(hearts)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    });
  });

  describe('answer feedback panels', () => {
    it('the Correct panel has no flame', async () => {
      const user = renderRun('lesson');
      await user.click(screen.getByRole('radio', { name: /oige0/ }));
      await click(user, 'Check');
      expect(await screen.findByRole('button', { name: 'Continue' })).toBeInTheDocument();
      expect(flames()).toEqual([]);
    });

    it('the Wrong panel shows the small red flame', async () => {
      const user = renderRun('lesson');
      await user.click(screen.getByRole('radio', { name: /vale0/ }));
      await click(user, 'Check');
      await screen.findByText('Correct solution:');
      // The first-mistake modal is already seen (beforeEach), so only the panel flame shows.
      expect(flames()).toEqual([{ src: redFlame, size: 32, alt: '' }]);
    });

    it('the Skipped panel shows the small red flame', async () => {
      const user = renderRun('lesson');
      await click(user, 'Skip');
      await screen.findByText('Correct solution:');
      expect(flames()).toEqual([{ src: redFlame, size: 32, alt: '' }]);
    });

    it('a wrong answer in practice shows the panel flame and never the modal flame', async () => {
      const user = renderRun('practice');
      await user.click(screen.getByRole('radio', { name: /vale0/ }));
      await click(user, 'Check');
      await screen.findByText('Correct solution:');
      expect(flames()).toEqual([{ src: redFlame, size: 32, alt: '' }]);
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('the first mistake in a lesson shows the 96px modal flame over the panel flame', async () => {
      useProfileStore.getState().reset();
      const user = renderRun('lesson');
      await user.click(screen.getByRole('radio', { name: /vale0/ }));
      await click(user, 'Check');
      const dialog = await screen.findByRole('dialog', { name: 'Each mistake costs 1 heart!' });
      await waitFor(() => expect(flames(dialog)).toHaveLength(1));
      expect(flames(dialog)).toEqual([{ src: redFlame, size: 96, alt: '' }]);
      // The panel behind it keeps its own red flame, and nothing is blue.
      expect(flames().map((flame) => flame.src)).toEqual([redFlame, redFlame]);
    });
  });
});
