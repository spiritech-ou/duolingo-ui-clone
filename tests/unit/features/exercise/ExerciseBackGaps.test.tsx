import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider, useLocation } from 'react-router';
import { beforeEach, describe, expect, it } from 'vitest';
import type { Exercise } from '@/api/schemas/lesson';
import { ExerciseRun, ExerciseSession } from '@/features/exercise';
import type { SessionMode } from '@/features/exercise/logic/sessionTypes';
import { useProfileStore } from '@/store/useProfileStore';
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

function Where() {
  return <p>At {useLocation().pathname}</p>;
}

type TestRouter = ReturnType<typeof createMemoryRouter>;
type User = ReturnType<typeof userEvent.setup>;

/** A full run (session and end screens) with /learn behind it in history, so Back has somewhere to go. */
function renderRun(mode: SessionMode, count = 1) {
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
      { path: '/learn', element: <Where /> },
      { path: '/practice', element: <Where /> },
    ],
    { initialEntries: ['/learn', '/run'], initialIndex: 1 },
  );
  render(<RouterProvider router={router} />);
  return { router, user: userEvent.setup() };
}

const pressBack = (router: TestRouter) =>
  act(async () => {
    await router.navigate(-1);
  });
const press = (user: User, name: string) => user.click(screen.getByRole('button', { name }));
const noDialog = () => expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

async function answerRight(user: User) {
  await user.click(screen.getByRole('radio', { name: /oige/ }));
  await press(user, 'Check');
  await press(user, 'Continue');
}

describe('Back around the exercise run', () => {
  beforeEach(() => {
    localStorage.clear();
    useSessionStore.getState().reset();
    useProfileStore.getState().reset();
    useSessionStore.getState().setSession({ token: 't', user: USER });
    useProfileStore.getState().markHeartsIntroSeen(USER.id);
  });

  it('in practice mode Back opens the practice exit dialog; KEEP LEARNING stays, QUIT leaves', async () => {
    const { router, user } = renderRun('practice', 2);
    await pressBack(router);

    expect(screen.getByRole('dialog', { name: 'Quit practice?' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/run');

    await press(user, 'Keep learning');
    noDialog();
    expect(router.state.location.pathname).toBe('/run');

    await pressBack(router);
    await press(user, 'Quit');
    expect(router.state.location.pathname).toBe('/learn');
    expect(router.state.historyAction).toBe('REPLACE');
  });

  it('after practice complete Back leaves at once, with no dialog', async () => {
    const { router, user } = renderRun('practice');
    await answerRight(user);
    expect(await screen.findByRole('heading', { name: 'Practice complete!' })).toBeInTheDocument();

    await pressBack(router);
    expect(router.state.location.pathname).toBe('/learn');
    expect(screen.getByText('At /learn')).toBeInTheDocument();
    noDialog();
  });

  it('after the lesson is complete Back leaves at once, with no dialog', async () => {
    const { router, user } = renderRun('lesson');
    await answerRight(user);
    expect(await screen.findByRole('heading', { name: 'Perfect lesson!' })).toBeInTheDocument();

    await pressBack(router);
    expect(router.state.location.pathname).toBe('/learn');
    noDialog();
  });

  it('after out of hearts Back leaves at once, with no dialog', async () => {
    for (let i = 0; i < 4; i += 1) useProfileStore.getState().loseHeart(USER.id);
    const { router, user } = renderRun('lesson', 3);
    await press(user, 'Skip');
    await press(user, 'Continue');
    expect(await screen.findByRole('heading', { name: "You're out of hearts" })).toBeInTheDocument();

    await pressBack(router);
    expect(router.state.location.pathname).toBe('/learn');
    noDialog();
  });

  it('arriving with no hearts, Back leaves at once too', async () => {
    for (let i = 0; i < 5; i += 1) useProfileStore.getState().loseHeart(USER.id);
    const { router } = renderRun('lesson', 3);
    expect(await screen.findByRole('heading', { name: "You're out of hearts" })).toBeInTheDocument();

    await pressBack(router);
    expect(router.state.location.pathname).toBe('/learn');
    noDialog();
  });
});

describe('the Back blocker never blocks the navigation that ends a session', () => {
  beforeEach(() => {
    localStorage.clear();
    useSessionStore.getState().reset();
    useProfileStore.getState().reset();
    useSessionStore.getState().setSession({ token: 't', user: USER });
    useProfileStore.getState().markHeartsIntroSeen(USER.id);
  });

  /** The session alone, with the routes' callbacks navigating the way ExerciseRun does. */
  function renderSession(mode: SessionMode, count = 1) {
    const router: TestRouter = createMemoryRouter(
      [
        {
          path: '/run',
          element: (
            <ExerciseSession
              mode={mode}
              speechAdapter={makeSynth()}
              exercises={Array.from({ length: count }, (_, i) => makeExercise(i))}
              onLessonComplete={() => {
                void router.navigate('/learn', { replace: true });
              }}
              onPracticeComplete={() => {
                void router.navigate('/learn', { replace: true });
              }}
              onOutOfHearts={() => {
                void router.navigate('/practice', { replace: true });
              }}
              onQuit={() => {
                void router.navigate('/learn', { replace: true });
              }}
            />
          ),
        },
        { path: '/learn', element: <Where /> },
        { path: '/practice', element: <Where /> },
      ],
      { initialEntries: ['/learn', '/run'], initialIndex: 1 },
    );
    render(<RouterProvider router={router} />);
    return { router, user: userEvent.setup() };
  }

  it('practice complete navigates straight out', async () => {
    const { router, user } = renderSession('practice');
    await answerRight(user);
    expect(router.state.location.pathname).toBe('/learn');
    noDialog();
  });

  it('out of hearts (after CONTINUE on the last-heart mistake) navigates straight out', async () => {
    for (let i = 0; i < 4; i += 1) useProfileStore.getState().loseHeart(USER.id);
    const { router, user } = renderSession('lesson', 3);
    await press(user, 'Skip');
    expect(router.state.location.pathname).toBe('/run');
    await press(user, 'Continue');
    expect(router.state.location.pathname).toBe('/practice');
    noDialog();
  });

  it('a lesson that starts with no hearts navigates straight out', () => {
    for (let i = 0; i < 5; i += 1) useProfileStore.getState().loseHeart(USER.id);
    const { router } = renderSession('lesson', 3);
    expect(router.state.location.pathname).toBe('/practice');
    noDialog();
  });

  it('a mistake alone does not release the blocker: Back still asks', async () => {
    const { router, user } = renderSession('lesson', 2);
    await user.click(screen.getByRole('radio', { name: /vale0/ }));
    await press(user, 'Check');
    await pressBack(router);
    expect(screen.getByRole('dialog', { name: 'Quit lesson?' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/run');
  });
});
