import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StrictMode } from 'react';
import { createMemoryRouter, RouterProvider, useLocation } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mock, MockInstance } from 'vitest';
import type { Exercise } from '@/api/schemas/lesson';
import { ExerciseRun, ExerciseSession } from '@/features/exercise';
import type { LessonCompleteStats } from '@/features/exercise/containers/ExerciseSession';
import type { SessionMode } from '@/features/exercise/logic/sessionTypes';
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

const exercises = (count: number): Exercise[] => Array.from({ length: count }, (_, i) => makeExercise(i));
const profile = () => selectProfile(USER.id)(useProfileStore.getState());

function Where() {
  return <p>At {useLocation().pathname}</p>;
}

type User = ReturnType<typeof userEvent.setup>;
const press = (user: User, name: string) => user.click(screen.getByRole('button', { name }));
const card = (word: string) => screen.getByRole('radio', { name: new RegExp(word) });

async function answerRight(user: User, n: number) {
  await user.click(card(`oige${n}`));
  await press(user, 'Check');
  await press(user, 'Continue');
}

function resetStores() {
  localStorage.clear();
  useSessionStore.getState().reset();
  useProfileStore.getState().reset();
  useSessionStore.getState().setSession({ token: 't', user: USER });
}

interface RunOptions {
  mode?: SessionMode;
  count?: number;
  strict?: boolean;
  user?: User;
}

function renderRun({ mode = 'lesson', count = 1, strict = false, user }: RunOptions = {}) {
  const router = createMemoryRouter(
    [
      {
        path: '/run',
        element: (
          <ExerciseRun
            mode={mode}
            lessonId="lesson-1"
            speechAdapter={makeSynth()}
            exercises={exercises(count)}
          />
        ),
      },
      { path: '/learn', element: <Where /> },
      { path: '/practice', element: <Where /> },
    ],
    { initialEntries: ['/learn', '/run'], initialIndex: 1 },
  );
  const tree = <RouterProvider router={router} />;
  const view = render(strict ? <StrictMode>{tree}</StrictMode> : tree);
  return { router, view, user: user ?? userEvent.setup() };
}

interface SessionCallbacks {
  onLessonComplete: Mock<(stats: LessonCompleteStats) => void>;
  onPracticeComplete: Mock<() => void>;
  onOutOfHearts: Mock<() => void>;
  onQuit: Mock<() => void>;
}

function renderSession({ mode = 'lesson', count = 2, strict = false, user }: RunOptions = {}) {
  const callbacks: SessionCallbacks = {
    onLessonComplete: vi.fn(),
    onPracticeComplete: vi.fn(),
    onOutOfHearts: vi.fn(),
    onQuit: vi.fn(),
  };
  const router = createMemoryRouter([
    {
      path: '/',
      element: (
        <ExerciseSession
          mode={mode}
          speechAdapter={makeSynth()}
          exercises={exercises(count)}
          {...callbacks}
        />
      ),
    },
  ]);
  const tree = <RouterProvider router={router} />;
  const view = render(strict ? <StrictMode>{tree}</StrictMode> : tree);
  return { router, view, user: user ?? userEvent.setup(), ...callbacks };
}

describe('the exercise session under StrictMode', () => {
  beforeEach(resetStores);

  it('loses one heart per mistake, shows the first-mistake modal once and completes once', async () => {
    const { user, onLessonComplete, onOutOfHearts } = renderSession({ strict: true });
    expect(profile().hearts).toBe(5);

    await user.click(card('vale0'));
    await press(user, 'Check');
    expect(profile().hearts).toBe(4);
    expect(screen.getAllByRole('dialog')).toHaveLength(1);
    expect(screen.getByRole('dialog', { name: 'Each mistake costs 1 heart!' })).toBeInTheDocument();
    expect(profile().hasSeenHeartsIntro).toBe(false);

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(profile().hasSeenHeartsIntro).toBe(true);
    expect(getAnnouncer()).toHaveTextContent('Incorrect. Correct solution: oige0. 4 hearts left.');

    await press(user, 'Continue');
    // The missed exercise comes back after the next one.
    await answerRight(user, 1);
    await answerRight(user, 0);

    expect(onLessonComplete).toHaveBeenCalledTimes(1);
    expect(onLessonComplete).toHaveBeenCalledWith(
      expect.objectContaining({ xp: 10, accuracy: 50, isPerfect: false }),
    );
    expect(onOutOfHearts).not.toHaveBeenCalled();
    expect(profile().hearts).toBe(4);
  });

  it('keeps the progress bar and the queue right across a double render', async () => {
    const { user } = renderSession({ strict: true });
    const bar = () => screen.getByRole('progressbar');
    expect(bar()).toHaveAttribute('aria-valuemax', '2');
    await user.click(card('oige0'));
    await press(user, 'Check');
    expect(bar()).toHaveAttribute('aria-valuenow', '1');
    await press(user, 'Continue');
    expect(screen.getByRole('heading', { name: /word1/ })).toHaveFocus();
    expect(bar()).toHaveAttribute('aria-valuenow', '1');
  });

  it('a lesson that starts with no hearts reports it once', () => {
    for (let i = 0; i < 5; i += 1) useProfileStore.getState().loseHeart(USER.id);
    const { onOutOfHearts, onLessonComplete } = renderSession({ strict: true, count: 3 });
    expect(onOutOfHearts).toHaveBeenCalledTimes(1);
    expect(onLessonComplete).not.toHaveBeenCalled();
  });

  it('the last-heart mistake reports out of hearts once, on CONTINUE', async () => {
    for (let i = 0; i < 4; i += 1) useProfileStore.getState().loseHeart(USER.id);
    const { user, onOutOfHearts } = renderSession({ strict: true, count: 3 });
    await press(user, 'Skip');
    expect(profile().hearts).toBe(0);
    expect(onOutOfHearts).not.toHaveBeenCalled();
    await press(user, 'Continue');
    expect(onOutOfHearts).toHaveBeenCalledTimes(1);
  });
});

describe('the end screens save once under StrictMode', () => {
  beforeEach(() => {
    resetStores();
    useProfileStore.getState().markHeartsIntroSeen(USER.id);
  });

  it('the lesson is saved once and the summary shown', async () => {
    const { user } = renderRun({ strict: true });
    await answerRight(user, 0);
    expect(await screen.findByRole('heading', { name: 'Perfect lesson!' })).toBeInTheDocument();
    expect(profile().completedLessonIds).toEqual(['lesson-1']);
  });

  it('the practice heart is gained once', async () => {
    for (let i = 0; i < 3; i += 1) useProfileStore.getState().loseHeart(USER.id);
    expect(profile().hearts).toBe(2);
    const { user } = renderRun({ mode: 'practice', strict: true });
    await answerRight(user, 0);
    expect(await screen.findByRole('heading', { name: 'Practice complete!' })).toBeInTheDocument();
    expect(profile().hearts).toBe(3);
    expect(profile().completedLessonIds).toEqual([]);
  });

  it('out of hearts neither saves the lesson nor changes the hearts, and shows once', async () => {
    for (let i = 0; i < 4; i += 1) useProfileStore.getState().loseHeart(USER.id);
    const { user } = renderRun({ strict: true, count: 3 });
    await press(user, 'Skip');
    await press(user, 'Continue');
    expect(await screen.findAllByRole('heading', { name: "You're out of hearts" })).toHaveLength(1);
    expect(profile().completedLessonIds).toEqual([]);
    expect(profile().hearts).toBe(0);
  });

  it('arriving with no hearts under StrictMode shows one out-of-hearts screen', async () => {
    for (let i = 0; i < 5; i += 1) useProfileStore.getState().loseHeart(USER.id);
    renderRun({ strict: true, count: 3 });
    expect(await screen.findAllByRole('heading', { name: "You're out of hearts" })).toHaveLength(1);
    expect(profile().hearts).toBe(0);
    expect(profile().completedLessonIds).toEqual([]);
  });
});

interface Registration {
  target: EventTarget;
  type: string;
  listener: unknown;
  capture: boolean;
}

/** Records the listeners still attached to `document` and `window`, for the given event types. */
function trackListeners(types: readonly string[]) {
  const active: Registration[] = [];
  const spies: MockInstance[] = [];
  const captureOf = (options?: boolean | AddEventListenerOptions | EventListenerOptions): boolean =>
    typeof options === 'boolean' ? options : (options?.capture ?? false);
  for (const target of [document, window]) {
    const originalAdd = target.addEventListener.bind(target);
    const originalRemove = target.removeEventListener.bind(target);
    spies.push(
      vi.spyOn(target, 'addEventListener').mockImplementation((type, listener, options) => {
        const capture = captureOf(options);
        const known = active.some(
          (entry) =>
            entry.target === target &&
            entry.type === type &&
            entry.listener === listener &&
            entry.capture === capture,
        );
        if (types.includes(type) && !known) active.push({ target, type, listener, capture });
        originalAdd(type, listener, options);
      }),
      vi.spyOn(target, 'removeEventListener').mockImplementation((type, listener, options) => {
        const capture = captureOf(options);
        const index = active.findIndex(
          (entry) =>
            entry.target === target &&
            entry.type === type &&
            entry.listener === listener &&
            entry.capture === capture,
        );
        if (index >= 0) active.splice(index, 1);
        originalRemove(type, listener, options);
      }),
    );
  }
  return {
    count: (type: string) => active.filter((entry) => entry.type === type).length,
    total: () => active.length,
    restore: () => spies.forEach((spy) => spy.mockRestore()),
  };
}

const TRACKED = ['keydown', 'keyup', 'pointerdown', 'blur'] as const;

describe('listeners are removed when the session and the end screens go away', () => {
  let tracker: ReturnType<typeof trackListeners> | undefined;

  beforeEach(resetStores);
  afterEach(() => {
    tracker?.restore();
    tracker = undefined;
  });

  it('the session registers its listeners and removes every one on unmount', () => {
    useProfileStore.getState().markHeartsIntroSeen(USER.id);
    // user-event prepares the document with its own listeners on first setup; create it first.
    const user = userEvent.setup();
    tracker = trackListeners(TRACKED);
    const { view } = renderSession({ user });
    // Enter/select/shortcut keydown (capture) and the Escape keydown, keyup, pointerdown, blur.
    expect(tracker.count('keydown')).toBe(2);
    expect(tracker.count('keyup')).toBe(1);
    expect(tracker.count('pointerdown')).toBe(1);
    expect(tracker.count('blur')).toBe(1);

    view.unmount();
    expect(tracker.total()).toBe(0);
  });

  it('a dialog opening and closing leaves no extra Escape listener behind', async () => {
    useProfileStore.getState().markHeartsIntroSeen(USER.id);
    const user = userEvent.setup();
    tracker = trackListeners(TRACKED);
    const { view } = renderSession({ user });
    const before = tracker.count('keydown');

    await user.keyboard('{Escape}');
    expect(screen.getByRole('dialog', { name: 'Quit lesson?' })).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(tracker.count('keydown')).toBe(before);

    view.unmount();
    expect(tracker.total()).toBe(0);
  });

  it('after the session ends and Enter continues from the end screen, nothing is left listening', async () => {
    useProfileStore.getState().markHeartsIntroSeen(USER.id);
    const user = userEvent.setup();
    tracker = trackListeners(TRACKED);
    const { router } = renderRun({ user });
    const navigate = vi.spyOn(router, 'navigate');

    await answerRight(user, 0);
    expect(await screen.findByRole('heading', { name: 'Perfect lesson!' })).toBeInTheDocument();
    // The session's listeners went with it; the end screen listens for Enter only.
    expect(tracker.count('keyup')).toBe(0);
    expect(tracker.count('pointerdown')).toBe(0);
    expect(tracker.count('blur')).toBe(0);
    expect(tracker.count('keydown')).toBe(1);

    fireEvent.keyDown(document.body, { key: 'Enter' });
    expect(router.state.location.pathname).toBe('/learn');
    expect(screen.getByText('At /learn')).toBeInTheDocument();
    expect(tracker.total()).toBe(0);

    // Keys pressed after leaving reach nobody.
    navigate.mockClear();
    fireEvent.keyDown(document.body, { key: 'Enter' });
    fireEvent.keyDown(document.body, { key: 'Escape' });
    fireEvent.keyDown(document.body, { key: '1' });
    expect(navigate).not.toHaveBeenCalled();
    expect(router.state.location.pathname).toBe('/learn');
  });

  it.each([
    ['practice complete', 'practice' as const, 0],
    ['out of hearts', 'lesson' as const, 4],
  ])('leaving from the %s screen with Enter leaves no listener', async (_label, mode, heartsLost) => {
    for (let i = 0; i < heartsLost; i += 1) useProfileStore.getState().loseHeart(USER.id);
    useProfileStore.getState().markHeartsIntroSeen(USER.id);
    const user = userEvent.setup();
    tracker = trackListeners(TRACKED);
    const { router } = renderRun({ mode, count: mode === 'lesson' ? 3 : 1, user });

    if (mode === 'practice') {
      await answerRight(user, 0);
      expect(await screen.findByRole('heading', { name: 'Practice complete!' })).toBeInTheDocument();
      fireEvent.keyDown(document.body, { key: 'Enter' });
      expect(router.state.location.pathname).toBe('/learn');
    } else {
      await press(user, 'Skip');
      await press(user, 'Continue');
      expect(await screen.findByRole('heading', { name: "You're out of hearts" })).toBeInTheDocument();
      // The primary action is practice.
      fireEvent.keyDown(document.body, { key: 'Enter' });
      expect(router.state.location.pathname).toBe('/practice');
    }
    expect(tracker.total()).toBe(0);
  });
});

describe('the elapsed time starts when the first exercise appears', () => {
  const START = 1_700_000_000_000;

  beforeEach(() => {
    resetStores();
    useProfileStore.getState().markHeartsIntroSeen(USER.id);
    // Only Date is faked: timers stay real, so user-event and MSW keep working.
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(START));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  const at = (offsetMs: number) => vi.setSystemTime(new Date(START + offsetMs));

  it('reports the exact time from mount to the last CONTINUE', async () => {
    const { user, onLessonComplete } = renderSession({ count: 1 });
    at(5_000);
    await user.click(card('oige0'));
    at(100_000);
    await press(user, 'Check');
    at(134_000);
    await press(user, 'Continue');

    expect(onLessonComplete).toHaveBeenCalledTimes(1);
    expect(onLessonComplete).toHaveBeenCalledWith({
      xp: 10,
      accuracy: 100,
      elapsedMs: 134_000,
      isPerfect: true,
    });
  });

  it('is not restarted by later exercises, a retried one or a re-render', async () => {
    const { user, onLessonComplete } = renderSession({ count: 2, strict: true });
    await user.click(card('vale0'));
    at(10_000);
    await press(user, 'Check');
    at(20_000);
    await press(user, 'Continue');
    at(30_000);
    await answerRight(user, 1);
    at(61_000);
    await answerRight(user, 0);

    expect(onLessonComplete).toHaveBeenCalledTimes(1);
    expect(onLessonComplete).toHaveBeenCalledWith(expect.objectContaining({ elapsedMs: 61_000 }));
  });

  it('is shown on the lesson-over screen as minutes and seconds', async () => {
    const { user } = renderRun({ count: 1 });
    await user.click(card('oige0'));
    await press(user, 'Check');
    at(134_000);
    await press(user, 'Continue');
    expect(await screen.findByRole('heading', { name: 'Perfect lesson!' })).toBeInTheDocument();
    expect(screen.getByText('2:14')).toBeInTheDocument();
  });

  it('is zero when everything happens at the same instant', async () => {
    const { user, onLessonComplete } = renderSession({ count: 1 });
    await user.click(card('oige0'));
    await press(user, 'Check');
    await press(user, 'Continue');
    expect(onLessonComplete).toHaveBeenCalledWith(expect.objectContaining({ elapsedMs: 0 }));
  });
});
