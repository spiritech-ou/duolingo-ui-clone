import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Exercise } from '@/api/schemas/lesson';
import { ExerciseSession } from '@/features/exercise';
import { selectProfile, useProfileStore } from '@/store/useProfileStore';
import { useSessionStore } from '@/store/useSessionStore';
import { getAnnouncer } from './announcer';
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

function setup(count = 3) {
  const onLessonComplete = vi.fn();
  const user = userEvent.setup();
  const router = createMemoryRouter([
    {
      path: '/',
      element: (
        <ExerciseSession
          speechAdapter={makeSynth()}
          mode="lesson"
          exercises={Array.from({ length: count }, (_, i) => makeExercise(i))}
          onLessonComplete={onLessonComplete}
          onOutOfHearts={vi.fn()}
          onQuit={vi.fn()}
        />
      ),
    },
  ]);
  const { unmount } = render(<RouterProvider router={router} />);
  return { user, onLessonComplete, unmount };
}

const card = (word: string) => screen.getByRole('radio', { name: new RegExp(word) });
const check = () => screen.getByRole('button', { name: 'Check' });
const heading = (n: number) => screen.getByRole('heading', { name: new RegExp(`word${n}`) });
const hearts = () => selectProfile(USER.id)(useProfileStore.getState()).hearts;

describe('ExerciseSession keyboard shortcuts', () => {
  beforeEach(() => {
    localStorage.clear();
    useSessionStore.getState().reset();
    useProfileStore.getState().reset();
    useSessionStore.getState().setSession({ token: 't', user: USER });
    useProfileStore.getState().markHeartsIntroSeen(USER.id);
  });

  it('number keys select the card in idle and move the selection when selected', async () => {
    const { user } = setup();
    await user.keyboard('2');
    expect(card('oige0')).toBeChecked();
    expect(check()).toBeEnabled();
    await user.keyboard('3');
    expect(card('muu0')).toBeChecked();
    expect(card('oige0')).not.toBeChecked();
  });

  it('the selected card number keeps it selected', async () => {
    const { user } = setup();
    await user.keyboard('1');
    await user.keyboard('1');
    expect(card('vale0')).toBeChecked();
    expect(check()).toBeEnabled();
  });

  it('Enter does nothing in idle', async () => {
    const { user } = setup();
    await user.keyboard('{Enter}');
    expect(card('vale0')).not.toBeChecked();
    expect(check()).toBeDisabled();
    expect(hearts()).toBe(5);
  });

  it('Enter checks, then continues from the panel, exactly once each', async () => {
    const { user } = setup();
    await user.keyboard('2');
    await user.keyboard('{Enter}');
    expect(getAnnouncer()).toHaveTextContent('Correct.');
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '1');
    // Focus is now on CONTINUE: the button handles this Enter, the resolver must not add a second.
    await user.keyboard('{Enter}');
    expect(heading(1)).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '1');
  });

  it('Enter continues from a wrong panel and the exercise returns', async () => {
    const { user } = setup(2);
    await user.keyboard('1');
    await user.keyboard('{Enter}');
    expect(hearts()).toBe(4);
    await user.keyboard('{Enter}');
    expect(heading(1)).toBeInTheDocument();
  });

  it('Enter on a focused card checks (a radio has no Enter action of its own)', async () => {
    const { user } = setup();
    await user.click(card('oige0'));
    expect(card('oige0')).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(getAnnouncer()).toHaveTextContent('Correct.');
  });

  it('Enter on the focused SKIP button skips once and gives no extra action', async () => {
    const { user } = setup();
    screen.getByRole('button', { name: 'Skip' }).focus();
    await user.keyboard('{Enter}');
    expect(hearts()).toBe(4);
    expect(getAnnouncer()).toHaveTextContent('Skipped.');
  });

  it('a held Enter checks once and does not continue', async () => {
    const { user } = setup();
    await user.keyboard('2');
    await user.keyboard('{Enter>4}');
    expect(getAnnouncer()).toHaveTextContent('Correct.');
    expect(heading(0)).toBeInTheDocument();
    await user.keyboard('{/Enter}');
    expect(heading(0)).toBeInTheDocument();
  });

  it('ignores keys with a modifier held', async () => {
    const { user } = setup();
    await user.keyboard('{Control>}1{/Control}');
    await user.keyboard('{Meta>}2{/Meta}');
    await user.keyboard('{Alt>}3{/Alt}');
    expect(screen.getAllByRole('radio').every((radio) => !(radio as HTMLInputElement).checked)).toBe(true);
    await user.keyboard('1');
    await user.keyboard('{Shift>}{Enter}{/Shift}');
    expect(card('vale0')).toBeChecked();
    expect(check()).toBeEnabled();
  });

  it('ignores numbers and Enter while the exit dialog is open', async () => {
    const { user } = setup();
    await user.keyboard('1');
    await user.click(screen.getByRole('button', { name: 'Close' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    await user.keyboard('2');
    // Focus is on KEEP LEARNING: Enter is its click; the answer is not checked behind the dialog.
    await user.keyboard('{Enter}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(card('vale0')).toBeChecked();
    expect(card('oige0')).not.toBeChecked();
    expect(hearts()).toBe(5);
  });

  it('a skip has no shortcut key', async () => {
    const { user } = setup();
    await user.keyboard('s');
    expect(hearts()).toBe(5);
    expect(check()).toBeDisabled();
  });

  it('removes its keydown listener when the container unmounts', () => {
    const { unmount } = setup();
    const spy = vi.spyOn(document, 'removeEventListener');
    unmount();
    expect(spy).toHaveBeenCalledWith('keydown', expect.any(Function), true);
    spy.mockRestore();
  });
});

describe('ExerciseSession shortcuts with the first-mistake modal', () => {
  beforeEach(() => {
    localStorage.clear();
    useSessionStore.getState().reset();
    useProfileStore.getState().reset();
    useSessionStore.getState().setSession({ token: 't', user: USER });
  });

  const openModal = async (user: ReturnType<typeof userEvent.setup>) => {
    await user.keyboard('1');
    await user.keyboard('{Enter}');
    return screen.getByRole('dialog', { name: 'Each mistake costs 1 heart!' });
  };

  it('Enter that opened it does not dismiss it, and keys are ignored while it is open', async () => {
    const { user } = setup();
    await openModal(user);
    await user.keyboard('2');
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(card('oige0')).not.toBeChecked();
  });

  it('a held Enter that opened it neither dismisses it nor presses CONTINUE', async () => {
    const { user } = setup();
    await user.keyboard('1');
    await user.keyboard('{Enter>4}');
    expect(screen.getByRole('dialog', { name: 'Each mistake costs 1 heart!' })).toBeInTheDocument();
    expect(screen.getByText('Correct solution:')).toBeInTheDocument();
    await user.keyboard('{/Enter}');
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('a repeated Enter on the KEEP GOING button is swallowed, a fresh Enter dismisses once', async () => {
    const { user } = setup();
    await openModal(user);
    const keep = screen.getByRole('button', { name: 'Keep going' });
    expect(keep).toHaveFocus();
    // The browser would click the button per repeat; the guard stops them.
    const repeat = fireEvent.keyDown(keep, { key: 'Enter', repeat: true });
    expect(repeat).toBe(false);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    fireEvent.keyUp(keep, { key: 'Enter' });
    await user.keyboard('{Enter}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByText('Correct solution:')).toBeInTheDocument();
  });

  it('a hold whose keyup was lost is cleared by a window blur', () => {
    setup();
    fireEvent.keyDown(document.body, { key: 'Enter' });
    expect(fireEvent.keyDown(document.body, { key: 'Enter', repeat: true })).toBe(false);
    fireEvent.blur(window);
    expect(fireEvent.keyDown(document.body, { key: 'Enter', repeat: true })).toBe(true);
  });

  it('a pointer press clears a stale hold', () => {
    setup();
    fireEvent.keyDown(document.body, { key: 'Enter' });
    fireEvent.pointerDown(document.body);
    expect(fireEvent.keyDown(document.body, { key: 'Enter', repeat: true })).toBe(true);
  });
});
