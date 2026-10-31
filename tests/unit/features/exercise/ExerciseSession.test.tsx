import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Exercise } from '@/api/schemas/lesson';
import { ExerciseSession } from '@/features/exercise';
import type { SessionMode } from '@/features/exercise/logic/sessionTypes';
import { selectProfile, useProfileStore } from '@/store/useProfileStore';
import { useSessionStore } from '@/store/useSessionStore';
import { getAnnouncer } from './announcer';
import { makeSynth } from './fakeSynth';

const USER = { id: 'u1', email: 'a@b.co', displayName: 'Ann' };

const WORDS = [
  { english: 'tea', right: 'tee', others: ['kohv', 'leib'], isNew: true },
  { english: 'milk', right: 'piim', others: ['vesi', 'mahl'], isNew: false },
  { english: 'apple', right: 'õun', others: ['pirn', 'banaan'], isNew: false },
];

const makeExercise = (n: number): Exercise => {
  const word = WORDS[n];
  if (!word) throw new Error('fixture');
  const [a, b] = word.others;
  return {
    id: `ex${n}`,
    type: 'picture-choice',
    english: word.english,
    isNewWord: word.isNew,
    options: [
      { id: `ex${n}-a`, estonian: a ?? '', picture: { emoji: 'A', alt: `${a} picture` } },
      { id: `ex${n}-b`, estonian: word.right, picture: { emoji: 'B', alt: `${word.right} picture` } },
      { id: `ex${n}-c`, estonian: b ?? '', picture: { emoji: 'C', alt: `${b} picture` } },
    ],
    correctOptionId: `ex${n}-b`,
  };
};

const lesson = (count = 3): Exercise[] => Array.from({ length: count }, (_, i) => makeExercise(i));

function setup(options: { mode?: SessionMode; count?: number } = {}) {
  const props = {
    onLessonComplete: vi.fn(),
    onPracticeComplete: vi.fn(),
    onOutOfHearts: vi.fn(),
    onQuit: vi.fn(),
  };
  const user = userEvent.setup();
  const synth = makeSynth();
  // The container blocks browser Back, which needs a data router.
  const router = createMemoryRouter([
    {
      path: '/',
      element: (
        <ExerciseSession
          speechAdapter={synth}
          mode={options.mode ?? 'lesson'}
          exercises={lesson(options.count)}
          {...props}
        />
      ),
    },
  ]);
  render(<RouterProvider router={router} />);
  return { user, router, ...props };
}

const hearts = () => selectProfile(USER.id)(useProfileStore.getState()).hearts;
const hasSeenIntro = () =>
  selectProfile(USER.id)(useProfileStore.getState()).hasSeenHeartsIntro;
const markIntroSeen = () => useProfileStore.getState().markHeartsIntroSeen(USER.id);
const card = (word: string) => screen.getByRole('radio', { name: new RegExp(word) });
const bar = () => screen.getByRole('progressbar');

describe('ExerciseSession', () => {
  beforeEach(() => {
    localStorage.clear();
    useSessionStore.getState().reset();
    useProfileStore.getState().reset();
    useSessionStore.getState().setSession({ token: 't', user: USER });
    // The first-mistake modal has its own describe below; everywhere else it was seen already.
    markIntroSeen();
  });

  it('starts idle: tag, question focused, SKIP enabled, CHECK disabled, nothing announced', () => {
    setup();
    const heading = screen.getByRole('heading', { name: 'Which one of these is “tea”?' });
    expect(heading).toHaveFocus();
    expect(screen.getByText('NEW WORD')).toBeInTheDocument();
    expect(screen.getAllByRole('radio')).toHaveLength(3);
    expect(screen.getByRole('button', { name: 'Skip' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Check' })).toBeDisabled();
    expect(getAnnouncer()).toBeEmptyDOMElement();
    expect(screen.getByRole('img', { name: '5 hearts left' })).toBeInTheDocument();
  });

  it('selecting a card enables CHECK and moving the pick keeps one selected', async () => {
    const { user } = setup();
    await user.click(card('kohv'));
    expect(card('kohv')).toBeChecked();
    expect(screen.getByRole('button', { name: 'Check' })).toBeEnabled();
    await user.click(card('leib'));
    expect(card('leib')).toBeChecked();
    expect(card('kohv')).not.toBeChecked();
  });

  it('the correct path moves the bar, praises in order, and completes with stats', async () => {
    const { user, onLessonComplete, onOutOfHearts } = setup();
    expect(bar()).toHaveAttribute('aria-valuenow', '0');
    expect(bar()).toHaveAttribute('aria-valuemax', '3');

    await user.click(card('tee'));
    await user.click(screen.getByRole('button', { name: 'Check' }));
    expect(bar()).toHaveAttribute('aria-valuenow', '1');
    expect(getAnnouncer()).toHaveTextContent('Correct. Great job!');
    expect(screen.getByRole('button', { name: 'Continue' })).toHaveFocus();
    expect(card('tee')).toBeChecked();
    await user.click(screen.getByRole('button', { name: 'Continue' }));

    expect(screen.getByRole('heading', { name: /“milk”/ })).toHaveFocus();
    expect(screen.queryByText('NEW WORD')).not.toBeInTheDocument();
    await user.click(card('piim'));
    await user.click(screen.getByRole('button', { name: 'Check' }));
    expect(getAnnouncer()).toHaveTextContent('Correct. Nice one!');
    await user.click(screen.getByRole('button', { name: 'Continue' }));

    await user.click(card('õun'));
    await user.click(screen.getByRole('button', { name: 'Check' }));
    expect(getAnnouncer()).toHaveTextContent('Correct. Perfect!');
    expect(onLessonComplete).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Continue' }));

    expect(onLessonComplete).toHaveBeenCalledTimes(1);
    expect(onLessonComplete).toHaveBeenCalledWith({
      xp: 10,
      accuracy: 100,
      elapsedMs: expect.any(Number) as number,
      isPerfect: true,
    });
    expect(onOutOfHearts).not.toHaveBeenCalled();
    expect(hearts()).toBe(5);
    expect(screen.queryByRole('radiogroup')).not.toBeInTheDocument();
  });

  it('wrong: marks the pick, reveals the right card, saves the heart, then retries at the end', async () => {
    const { user } = setup({ count: 2 });
    await user.click(card('kohv'));
    await user.click(screen.getByRole('button', { name: 'Check' }));

    expect(hearts()).toBe(4);
    expect(screen.getByRole('img', { name: '4 hearts left' })).toBeInTheDocument();
    expect(bar()).toHaveAttribute('aria-valuenow', '0');
    expect(screen.getByText('Correct solution:')).toBeInTheDocument();
    expect(getAnnouncer()).toHaveTextContent(
      'Incorrect. Correct solution: tee. 4 hearts left.',
    );
    expect(screen.getByRole('button', { name: 'Continue' })).toHaveFocus();
    expect(card('kohv')).toBeChecked();
    expect(card('kohv')).toHaveAttribute('aria-disabled', 'true');
    expect(card('tee')).not.toBeChecked();

    await user.click(screen.getByRole('button', { name: 'Continue' }));
    // The missed exercise went to the end: the second one comes first.
    expect(screen.getByRole('heading', { name: /“milk”/ })).toHaveFocus();
    await user.click(card('piim'));
    await user.click(screen.getByRole('button', { name: 'Check' }));
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    // Now the retry of "tea".
    expect(screen.getByRole('heading', { name: /“tea”/ })).toHaveFocus();
    expect(screen.getAllByRole('radio').every((radio) => !(radio as HTMLInputElement).checked)).toBe(
      true,
    );
    await user.click(card('tee'));
    await user.click(screen.getByRole('button', { name: 'Check' }));
    expect(bar()).toHaveAttribute('aria-valuenow', '2');
    expect(hearts()).toBe(4);
  });

  it('a lone exercise retried after a mistake still takes focus back to the question', async () => {
    const { user } = setup({ count: 1 });
    await user.click(card('kohv'));
    await user.click(screen.getByRole('button', { name: 'Check' }));
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    expect(screen.getByRole('heading', { name: /“tea”/ })).toHaveFocus();
  });

  it('skip: loses a heart, marks no card wrong, reveals the right one, ignoring an earlier pick', async () => {
    const { user } = setup();
    await user.click(card('kohv'));
    await user.click(screen.getByRole('button', { name: 'Skip' }));

    expect(hearts()).toBe(4);
    expect(bar()).toHaveAttribute('aria-valuenow', '0');
    expect(getAnnouncer()).toHaveTextContent(
      'Skipped. Correct solution: tee. 4 hearts left.',
    );
    expect(screen.getByRole('button', { name: 'Continue' })).toHaveFocus();
    expect(card('kohv')).not.toBeChecked();
    expect(card('tee')).not.toBeChecked();
    expect(screen.queryByText(/incorrect/i)).not.toBeInTheDocument();
  });

  it('skip from idle works and the skipped exercise returns', async () => {
    const { user } = setup({ count: 2 });
    await user.click(screen.getByRole('button', { name: 'Skip' }));
    expect(hearts()).toBe(4);
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    expect(screen.getByRole('heading', { name: /“milk”/ })).toBeInTheDocument();
  });

  it('starts from the profile hearts, saves each loss at once and reports out of hearts on CONTINUE', async () => {
    useProfileStore.setState({
      profiles: { [USER.id]: { ...selectProfile(USER.id)(useProfileStore.getState()), hearts: 1 } },
    });
    const { user, onOutOfHearts, onLessonComplete } = setup();
    expect(screen.getByRole('img', { name: '1 heart left' })).toBeInTheDocument();
    await user.click(card('kohv'));
    await user.click(screen.getByRole('button', { name: 'Check' }));
    expect(hearts()).toBe(0);
    expect(getAnnouncer()).toHaveTextContent('No hearts left.');
    expect(onOutOfHearts).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    expect(onOutOfHearts).toHaveBeenCalledTimes(1);
    expect(onLessonComplete).not.toHaveBeenCalled();
  });

  it('reports out of hearts at once when a lesson starts with no hearts', () => {
    useProfileStore.setState({
      profiles: { [USER.id]: { ...selectProfile(USER.id)(useProfileStore.getState()), hearts: 0 } },
    });
    const { onOutOfHearts } = setup();
    expect(onOutOfHearts).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('radiogroup')).not.toBeInTheDocument();
  });

  it('practice never changes hearts and omits the heart sentence', async () => {
    const { user, onPracticeComplete, onLessonComplete } = setup({ mode: 'practice', count: 1 });
    await user.click(card('kohv'));
    await user.click(screen.getByRole('button', { name: 'Check' }));
    expect(hearts()).toBe(5);
    expect(screen.getByRole('img', { name: '5 hearts left' })).toBeInTheDocument();
    expect(getAnnouncer().textContent).toBe('Incorrect. Correct solution: tee.');
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    await user.click(card('tee'));
    await user.click(screen.getByRole('button', { name: 'Check' }));
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    expect(onPracticeComplete).toHaveBeenCalledTimes(1);
    expect(onLessonComplete).not.toHaveBeenCalled();
    expect(hearts()).toBe(5);
  });

  it('counts a repeated mistake once in accuracy and still completes', async () => {
    const { user, onLessonComplete } = setup({ count: 1 });
    for (let i = 0; i < 2; i += 1) {
      await user.click(card('kohv'));
      await user.click(screen.getByRole('button', { name: 'Check' }));
      await user.click(screen.getByRole('button', { name: 'Continue' }));
    }
    await user.click(card('tee'));
    await user.click(screen.getByRole('button', { name: 'Check' }));
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    expect(onLessonComplete).toHaveBeenCalledWith(
      expect.objectContaining({ accuracy: 0, isPerfect: false }),
    );
    expect(hearts()).toBe(3);
  });

});

describe('ExerciseSession first-mistake modal', () => {
  beforeEach(() => {
    localStorage.clear();
    useSessionStore.getState().reset();
    useProfileStore.getState().reset();
    useSessionStore.getState().setSession({ token: 't', user: USER });
  });

  const wrongAnswer = async (user: ReturnType<typeof userEvent.setup>) => {
    await user.click(card('kohv'));
    await user.click(screen.getByRole('button', { name: 'Check' }));
  };
  const dialog = () => screen.getByRole('dialog', { name: 'Each mistake costs 1 heart!' });
  const noDialog = () => expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

  it('opens on the first wrong answer with the loss, the copy and KEEP GOING focused, panel behind', async () => {
    const { user } = setup();
    await wrongAnswer(user);

    const modal = dialog();
    expect(modal).toHaveAccessibleDescription('Stay sharp and focused to keep your hearts. You got this!');
    expect(within(modal).getByRole('img', { name: '4 hearts left' })).toBeInTheDocument();
    expect(within(modal).getByRole('button', { name: 'Keep going' })).toHaveFocus();
    // The Wrong panel is behind it, and the page behind is inert.
    expect(screen.getByText('Correct solution:')).toBeInTheDocument();
    expect(getAnnouncer()).toHaveTextContent('Incorrect. Correct solution: tee. 4 hearts left.');
    expect(document.querySelector('[inert] [role="radiogroup"]')).not.toBeNull();
    expect(hasSeenIntro()).toBe(false);
  });

  it('a skip counts as the first mistake and opens it too', async () => {
    const { user } = setup();
    await user.click(screen.getByRole('button', { name: 'Skip' }));
    expect(dialog()).toBeInTheDocument();
    expect(hearts()).toBe(4);
  });

  it('KEEP GOING saves the flag, closes it and leaves focus on CONTINUE', async () => {
    const { user } = setup();
    await wrongAnswer(user);
    await user.click(within(dialog()).getByRole('button', { name: 'Keep going' }));

    noDialog();
    expect(hasSeenIntro()).toBe(true);
    expect(screen.getByRole('button', { name: 'Continue' })).toHaveFocus();
  });

  it('Escape dismisses it like the button', async () => {
    const { user } = setup();
    await wrongAnswer(user);
    await user.keyboard('{Escape}');

    noDialog();
    expect(hasSeenIntro()).toBe(true);
    expect(screen.getByRole('button', { name: 'Continue' })).toHaveFocus();
  });

  it('Enter dismisses it without pressing CONTINUE, even when held down', async () => {
    const { user } = setup();
    await wrongAnswer(user);
    await user.keyboard('{Enter>3}');

    noDialog();
    expect(hasSeenIntro()).toBe(true);
    expect(screen.getByRole('button', { name: 'Continue' })).toHaveFocus();
    // Still on the Wrong panel of the same exercise: the key did not also continue.
    expect(screen.getByText('Correct solution:')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /“tea”/ })).toBeInTheDocument();
    await user.keyboard('{/Enter}');
    expect(screen.getByText('Correct solution:')).toBeInTheDocument();
  });

  it('Enter dismisses it when focus is on the dialog panel rather than the button', async () => {
    const { user } = setup();
    await wrongAnswer(user);
    dialog().focus();
    await user.keyboard('{Enter}');

    noDialog();
    expect(hasSeenIntro()).toBe(true);
    expect(screen.getByRole('button', { name: 'Continue' })).toHaveFocus();
    expect(screen.getByText('Correct solution:')).toBeInTheDocument();
  });

  it('after a skip the dismissal still ends on CONTINUE', async () => {
    const { user } = setup();
    await user.click(screen.getByRole('button', { name: 'Skip' }));
    await user.keyboard('{Escape}');
    expect(screen.getByRole('button', { name: 'Continue' })).toHaveFocus();
  });

  it('is shown once: a later mistake after dismissal does not reopen it', async () => {
    const { user } = setup();
    await wrongAnswer(user);
    await user.keyboard('{Escape}');
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    await user.click(card('vesi'));
    await user.click(screen.getByRole('button', { name: 'Check' }));
    noDialog();
    expect(hearts()).toBe(3);
  });

  it('is not shown to a user who has seen it', async () => {
    markIntroSeen();
    const { user } = setup();
    await wrongAnswer(user);
    noDialog();
    expect(screen.getByRole('button', { name: 'Continue' })).toHaveFocus();
  });

  it('is shown per user: another user has not seen it yet', async () => {
    markIntroSeen();
    useSessionStore.getState().setSession({ token: 't2', user: { ...USER, id: 'u2' } });
    const { user } = setup();
    await wrongAnswer(user);
    expect(dialog()).toBeInTheDocument();
  });

  it('is never shown in practice, and the flag stays unset', async () => {
    const { user } = setup({ mode: 'practice' });
    await wrongAnswer(user);
    noDialog();
    expect(hasSeenIntro()).toBe(false);
    expect(screen.getByRole('button', { name: 'Continue' })).toHaveFocus();
  });

  it('does not open for a correct answer', async () => {
    const { user } = setup();
    await user.click(card('tee'));
    await user.click(screen.getByRole('button', { name: 'Check' }));
    noDialog();
  });
});
