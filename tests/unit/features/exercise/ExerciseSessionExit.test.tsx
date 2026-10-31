import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Exercise } from '@/api/schemas/lesson';
import { ExerciseSession } from '@/features/exercise';
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

function setup(options: { mode?: SessionMode; count?: number } = {}) {
  const user = userEvent.setup();
  const router = createMemoryRouter(
    [
      { path: '/learn', element: <p>Learn page</p> },
      {
        path: '/lesson',
        element: (
          <ExerciseSession
            speechAdapter={makeSynth()}
            mode={options.mode ?? 'lesson'}
            exercises={Array.from({ length: options.count ?? 2 }, (_, i) => makeExercise(i))}
            onLessonComplete={() => {
              void router.navigate('/learn', { replace: true });
            }}
            onOutOfHearts={vi.fn()}
            onQuit={onQuit}
          />
        ),
      },
    ],
    { initialEntries: ['/learn', '/lesson'], initialIndex: 1 },
  );
  render(<RouterProvider router={router} />);
  return { user, router };
}

const onQuit = vi.fn(() => {
  // What the route does: leave for /learn, replacing the lesson's entry.
  void currentRouter?.navigate('/learn', { replace: true });
});
let currentRouter: ReturnType<typeof createMemoryRouter> | undefined;

const dialog = (name = 'Quit lesson?') => screen.getByRole('dialog', { name });
const noDialog = () => expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
const closeButton = () => screen.getByRole('button', { name: 'Close' });
const pressBack = () =>
  act(async () => {
    await currentRouter?.navigate(-1);
  });
const start = (options: Parameters<typeof setup>[0] = {}) => {
  const result = setup(options);
  currentRouter = result.router;
  return result;
};

describe('ExerciseSession exit dialog', () => {
  beforeEach(() => {
    localStorage.clear();
    onQuit.mockClear();
    useSessionStore.getState().reset();
    useProfileStore.getState().reset();
    useSessionStore.getState().setSession({ token: 't', user: USER });
    useProfileStore.getState().markHeartsIntroSeen(USER.id);
  });

  it('the close button opens it with the lesson copy, focus on KEEP LEARNING, the page inert', async () => {
    const { user } = start();
    await user.click(closeButton());

    const modal = dialog();
    expect(modal).toHaveAccessibleDescription("You'll lose your progress in this lesson.");
    expect(within(modal).getByRole('button', { name: 'Keep learning' })).toHaveFocus();
    expect(within(modal).getByRole('button', { name: 'Quit' })).toBeInTheDocument();
    expect(document.querySelector('[inert] [role="radiogroup"]')).not.toBeNull();
    expect(onQuit).not.toHaveBeenCalled();
  });

  it('uses the practice wording in practice', async () => {
    const { user } = start({ mode: 'practice' });
    await user.click(closeButton());
    expect(dialog('Quit practice?')).toHaveAccessibleDescription(
      "You'll lose your progress in this practice.",
    );
  });

  it('KEEP LEARNING closes it, restores focus to the close button and keeps the session', async () => {
    const { user, router } = start();
    await user.click(screen.getByRole('radio', { name: /vale0/ }));
    await user.click(closeButton());
    await user.click(screen.getByRole('button', { name: 'Keep learning' }));

    noDialog();
    expect(closeButton()).toHaveFocus();
    expect(screen.getByRole('radio', { name: /vale0/ })).toBeChecked();
    expect(onQuit).not.toHaveBeenCalled();
    expect(router.state.location.pathname).toBe('/lesson');
  });

  it('QUIT calls onQuit once and the route leaves without being blocked', async () => {
    const { user, router } = start();
    await user.click(closeButton());
    await user.click(screen.getByRole('button', { name: 'Quit' }));

    expect(onQuit).toHaveBeenCalledTimes(1);
    expect(router.state.location.pathname).toBe('/learn');
    expect(screen.getByText('Learn page')).toBeInTheDocument();
    // The lesson entry was replaced: Back from /learn does not return to it.
    expect(router.state.historyAction).toBe('REPLACE');
  });

  it('Escape outside a modal opens it; Escape again closes it and focus goes back', async () => {
    const { user } = start();
    const heading = screen.getByRole('heading', { name: /word0/ });
    expect(heading).toHaveFocus();

    await user.keyboard('{Escape}');
    expect(screen.getAllByRole('dialog')).toHaveLength(1);
    expect(dialog()).toBeInTheDocument();

    await user.keyboard('{Escape}');
    noDialog();
    expect(heading).toHaveFocus();
  });

  it('a held Escape opens it only once', async () => {
    const { user } = start();
    await user.keyboard('{Escape>3}');
    expect(screen.getAllByRole('dialog')).toHaveLength(1);
    await user.keyboard('{/Escape}');
  });

  it('browser Back opens it instead of leaving; KEEP LEARNING stays and Back works again', async () => {
    const { user, router } = start();
    await pressBack();

    expect(dialog()).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/lesson');

    await user.click(screen.getByRole('button', { name: 'Keep learning' }));
    noDialog();
    expect(router.state.location.pathname).toBe('/lesson');

    await pressBack();
    expect(dialog()).toBeInTheDocument();
  });

  it('Escape while the dialog came from Back closes it and stays', async () => {
    const { user, router } = start();
    await pressBack();
    await user.keyboard('{Escape}');
    noDialog();
    expect(router.state.location.pathname).toBe('/lesson');
  });

  it('QUIT after Back is not stuck behind the blocker', async () => {
    const { user, router } = start();
    await pressBack();
    await user.click(screen.getByRole('button', { name: 'Quit' }));

    expect(onQuit).toHaveBeenCalledTimes(1);
    expect(router.state.location.pathname).toBe('/learn');
    expect(screen.getByText('Learn page')).toBeInTheDocument();
  });

  it('does not block leaving once the lesson is complete', async () => {
    const { user, router } = start({ count: 1 });
    await user.click(screen.getByRole('radio', { name: /oige0/ }));
    await user.click(screen.getByRole('button', { name: 'Check' }));
    await user.click(screen.getByRole('button', { name: 'Continue' }));

    expect(router.state.location.pathname).toBe('/learn');
    noDialog();
  });
});

describe('ExerciseSession exit dialog and the first-mistake modal', () => {
  beforeEach(() => {
    localStorage.clear();
    onQuit.mockClear();
    useSessionStore.getState().reset();
    useProfileStore.getState().reset();
    useSessionStore.getState().setSession({ token: 't', user: USER });
  });

  const mistake = async (user: ReturnType<typeof userEvent.setup>) => {
    await user.click(screen.getByRole('radio', { name: /vale0/ }));
    await user.click(screen.getByRole('button', { name: 'Check' }));
  };

  it('Escape closes only the first-mistake modal and does not stack the exit dialog', async () => {
    const { user } = start();
    await mistake(user);
    expect(dialog('Each mistake costs 1 heart!')).toBeInTheDocument();

    await user.keyboard('{Escape}');
    noDialog();
    expect(screen.getByRole('button', { name: 'Continue' })).toHaveFocus();
  });

  it('Back while the first-mistake modal is open does not stack a dialog and does not leave', async () => {
    const { user, router } = start();
    await mistake(user);
    await pressBack();

    expect(screen.getAllByRole('dialog')).toHaveLength(1);
    expect(dialog('Each mistake costs 1 heart!')).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/lesson');

    await user.keyboard('{Escape}');
    noDialog();
  });

  it('the close button works on a feedback panel and returns focus to itself', async () => {
    markSeen();
    const { user } = start();
    await mistake(user);
    await user.click(closeButton());
    expect(dialog()).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Keep learning' }));
    expect(closeButton()).toHaveFocus();
  });
});

function markSeen() {
  useProfileStore.getState().markHeartsIntroSeen(USER.id);
}
