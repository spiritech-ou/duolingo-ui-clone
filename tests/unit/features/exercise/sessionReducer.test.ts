import { describe, expect, it } from 'vitest';
import type { Exercise } from '@/api/schemas/lesson';
import {
  createSession,
  getAccuracy,
  getCurrentExercise,
  getElapsedMs,
  getProgress,
  isPerfect,
  sessionReducer,
} from '@/features/exercise/logic/sessionReducer';
import type {
  SessionAction,
  SessionMode,
  SessionState,
} from '@/features/exercise/logic/sessionTypes';

const makeExercise = (n: number): Exercise => ({
  id: `ex${n}`,
  type: 'picture-choice',
  english: `word${n}`,
  isNewWord: false,
  options: [
    { id: `ex${n}-a`, estonian: 'a', picture: { emoji: 'A', alt: 'a' } },
    { id: `ex${n}-b`, estonian: 'b', picture: { emoji: 'B', alt: 'b' } },
    { id: `ex${n}-c`, estonian: 'c', picture: { emoji: 'C', alt: 'c' } },
  ],
  correctOptionId: `ex${n}-a`,
});

const exercises = (count: number): Exercise[] =>
  Array.from({ length: count }, (_, i) => makeExercise(i + 1));

const start = (count = 3, mode: SessionMode = 'lesson', hearts = 5): SessionState =>
  createSession({ exercises: exercises(count), mode, hearts, now: 1000 });

const run = (state: SessionState, ...actions: SessionAction[]): SessionState =>
  actions.reduce(sessionReducer, state);

const answerRight = (state: SessionState, now = 2000): SessionState => {
  const current = getCurrentExercise(state);
  if (!current) throw new Error('no current exercise');
  return run(
    state,
    { type: 'select', optionId: current.correctOptionId },
    { type: 'check' },
    { type: 'continue', now },
  );
};

const answerWrong = (state: SessionState): SessionState => {
  const current = getCurrentExercise(state);
  if (!current) throw new Error('no current exercise');
  return run(state, { type: 'select', optionId: `${current.id}-b` }, { type: 'check' });
};

describe('createSession', () => {
  it('starts idle on the first exercise with progress 0 of steps', () => {
    const state = start(10);
    expect(state.phase).toBe('idle');
    expect(getCurrentExercise(state)?.id).toBe('ex1');
    expect(getProgress(state)).toEqual({ value: 0, max: 10 });
    expect(state.startedAt).toBe(1000);
    expect(state.finishedAt).toBeNull();
  });

  it('is out of hearts at once in lesson mode with 0 hearts, but not in practice', () => {
    expect(start(3, 'lesson', 0).phase).toBe('outOfHearts');
    expect(start(3, 'practice', 0).phase).toBe('idle');
  });

  it('clamps hearts into 0..5', () => {
    expect(start(3, 'lesson', 9).hearts).toBe(5);
    expect(start(3, 'practice', -2).hearts).toBe(0);
  });

  it('treats an empty list as already complete', () => {
    const state = createSession({ exercises: [], mode: 'practice', hearts: 3, now: 5 });
    expect(state.phase).toBe('practiceComplete');
    expect(getElapsedMs(state)).toBe(0);
  });
});

describe('selecting', () => {
  it('selects a card and moves it when another is chosen', () => {
    const state = run(start(), { type: 'select', optionId: 'ex1-b' });
    expect(state.phase).toBe('selected');
    expect(state.selectedOptionId).toBe('ex1-b');
    const moved = run(state, { type: 'select', optionId: 'ex1-c' });
    expect(moved.selectedOptionId).toBe('ex1-c');
  });

  it('keeps the card selected when the same one is chosen again', () => {
    const state = run(start(), { type: 'select', optionId: 'ex1-b' }, { type: 'select', optionId: 'ex1-b' });
    expect(state.phase).toBe('selected');
    expect(state.selectedOptionId).toBe('ex1-b');
  });

  it('ignores an option that is not on the current exercise', () => {
    const state = start();
    expect(sessionReducer(state, { type: 'select', optionId: 'ex2-a' })).toBe(state);
  });

  it('ignores selection once the cards are locked', () => {
    const wrong = answerWrong(start());
    expect(sessionReducer(wrong, { type: 'select', optionId: 'ex1-a' })).toBe(wrong);
  });
});

describe('check', () => {
  it('does nothing without a selection', () => {
    const state = start();
    expect(sessionReducer(state, { type: 'check' })).toBe(state);
  });

  it('a correct answer advances progress by one and costs nothing', () => {
    const state = run(start(), { type: 'select', optionId: 'ex1-a' }, { type: 'check' });
    expect(state.phase).toBe('correct');
    expect(getProgress(state)).toEqual({ value: 1, max: 3 });
    expect(state.hearts).toBe(5);
    expect(state.heartsLost).toBe(0);
    expect(state.missedIds).toEqual([]);
  });

  it('a wrong answer loses one heart, marks the miss and leaves progress alone', () => {
    const state = answerWrong(start());
    expect(state.phase).toBe('wrong');
    expect(state.hearts).toBe(4);
    expect(state.heartsLost).toBe(1);
    expect(state.missedIds).toEqual(['ex1']);
    expect(getProgress(state).value).toBe(0);
    expect(state.selectedOptionId).toBe('ex1-b');
  });

  it('check is ignored during feedback (no double heart loss)', () => {
    const wrong = answerWrong(start());
    expect(sessionReducer(wrong, { type: 'check' })).toBe(wrong);
  });
});

describe('skip', () => {
  it('works with no selection: skipped, a heart lost, missed', () => {
    const state = run(start(), { type: 'skip' });
    expect(state.phase).toBe('skipped');
    expect(state.hearts).toBe(4);
    expect(state.heartsLost).toBe(1);
    expect(state.missedIds).toEqual(['ex1']);
    expect(state.selectedOptionId).toBeNull();
  });

  it('works with a selection and keeps no card marked as chosen wrong by the phase', () => {
    const state = run(start(), { type: 'select', optionId: 'ex1-a' }, { type: 'skip' });
    expect(state.phase).toBe('skipped');
    expect(state.hearts).toBe(4);
    expect(getProgress(state).value).toBe(0);
  });

  it('is ignored during feedback', () => {
    const wrong = answerWrong(start());
    expect(sessionReducer(wrong, { type: 'skip' })).toBe(wrong);
  });
});

describe('continue and the queue', () => {
  it('a correct answer leaves the queue and shows the next exercise idle', () => {
    const state = answerRight(start());
    expect(state.phase).toBe('idle');
    expect(state.queue.map((e) => e.id)).toEqual(['ex2', 'ex3']);
    expect(state.selectedOptionId).toBeNull();
    expect(state.heartsLost).toBe(0);
  });

  it('a wrong answer goes to the end of the queue and comes back', () => {
    const afterWrong = run(answerWrong(start()), { type: 'continue', now: 2000 });
    expect(afterWrong.phase).toBe('idle');
    expect(afterWrong.queue.map((e) => e.id)).toEqual(['ex2', 'ex3', 'ex1']);
    expect(afterWrong.selectedOptionId).toBeNull();

    const retried = answerRight(answerRight(afterWrong));
    expect(getCurrentExercise(retried)?.id).toBe('ex1');
    expect(retried.queue).toHaveLength(1);
  });

  it('a skipped exercise also goes to the end of the queue', () => {
    const state = run(start(), { type: 'skip' }, { type: 'continue', now: 2000 });
    expect(state.queue.map((e) => e.id)).toEqual(['ex2', 'ex3', 'ex1']);
  });

  it('a single remaining exercise answered wrongly is retried', () => {
    const state = run(answerWrong(start(1)), { type: 'continue', now: 2000 });
    expect(state.phase).toBe('idle');
    expect(state.queue.map((e) => e.id)).toEqual(['ex1']);
  });

  it('progress counts only correct answers across retries', () => {
    let state = start(2);
    state = run(answerWrong(state), { type: 'continue', now: 2 }); // ex1 wrong
    state = run(state, { type: 'skip' }, { type: 'continue', now: 3 }); // ex2 skipped
    expect(getProgress(state).value).toBe(0);
    state = answerRight(state); // ex1
    expect(getProgress(state).value).toBe(1);
    state = answerRight(state); // ex2
    expect(getProgress(state)).toEqual({ value: 2, max: 2 });
    expect(state.phase).toBe('lessonOver');
  });

  it('continue is ignored while idle or selected', () => {
    const idle = start();
    expect(sessionReducer(idle, { type: 'continue', now: 5 })).toBe(idle);
    const selected = run(idle, { type: 'select', optionId: 'ex1-a' });
    expect(sessionReducer(selected, { type: 'continue', now: 5 })).toBe(selected);
  });
});

describe('end of session', () => {
  it('lesson mode ends in lessonOver with the finish time passed by the caller', () => {
    const state = answerRight(start(1), 61_000);
    expect(state.phase).toBe('lessonOver');
    expect(state.queue).toEqual([]);
    expect(state.finishedAt).toBe(61_000);
    expect(getElapsedMs(state)).toBe(60_000);
  });

  it('practice mode ends in practiceComplete', () => {
    const state = answerRight(start(1, 'practice'));
    expect(state.phase).toBe('practiceComplete');
  });

  it('elapsed time is null while the session runs', () => {
    expect(getElapsedMs(start())).toBeNull();
  });

  it('is terminal: further actions change nothing', () => {
    const over = answerRight(start(1));
    expect(sessionReducer(over, { type: 'check' })).toBe(over);
    expect(sessionReducer(over, { type: 'continue', now: 9 })).toBe(over);
  });
});

describe('hearts', () => {
  it('CONTINUE after a mistake that left 0 hearts goes to outOfHearts', () => {
    const wrong = answerWrong(start(3, 'lesson', 1));
    expect(wrong.hearts).toBe(0);
    expect(wrong.phase).toBe('wrong');
    const out = run(wrong, { type: 'continue', now: 2000 });
    expect(out.phase).toBe('outOfHearts');
    expect(out.finishedAt).toBeNull();
  });

  it('a skip that empties the hearts also ends in outOfHearts', () => {
    const state = run(start(3, 'lesson', 1), { type: 'skip' }, { type: 'continue', now: 2 });
    expect(state.phase).toBe('outOfHearts');
  });

  it('hearts never go below 0', () => {
    const state = answerWrong(start(3, 'lesson', 1));
    expect(state.hearts).toBe(0);
    // A further miss (not reachable through the UI) must clamp.
    const forced = registerAgain(state);
    expect(forced.hearts).toBe(0);
    expect(forced.heartsLost).toBe(0);
  });

  it('outOfHearts is terminal', () => {
    const out = run(answerWrong(start(3, 'lesson', 1)), { type: 'continue', now: 2 });
    expect(sessionReducer(out, { type: 'skip' })).toBe(out);
    expect(sessionReducer(out, { type: 'continue', now: 3 })).toBe(out);
  });

  it('the last exercise wrong with 0 hearts is out of hearts, not retried', () => {
    const out = run(answerWrong(start(1, 'lesson', 1)), { type: 'continue', now: 2 });
    expect(out.phase).toBe('outOfHearts');
  });

  it('practice mode never costs a heart, even through many mistakes', () => {
    let state = start(2, 'practice', 3);
    for (let i = 0; i < 4; i += 1) {
      state = run(answerWrong(state), { type: 'continue', now: 2 });
      state = run(state, { type: 'skip' }, { type: 'continue', now: 3 });
    }
    expect(state.hearts).toBe(3);
    expect(state.heartsLost).toBe(0);
    expect(state.phase).toBe('idle');
    expect(state.missedIds).toEqual(['ex1', 'ex2']);
  });

  it('practice with 0 hearts stays free and playable', () => {
    const state = answerWrong(start(2, 'practice', 0));
    expect(state.hearts).toBe(0);
    expect(run(state, { type: 'continue', now: 2 }).phase).toBe('idle');
  });
});

// Re-registers a miss on a state already at 0 hearts by skipping from a rebuilt idle state.
function registerAgain(state: SessionState): SessionState {
  return sessionReducer({ ...state, phase: 'idle', selectedOptionId: null }, { type: 'skip' });
}

describe('missed set and stats', () => {
  it('an exercise missed twice counts once', () => {
    let state = start(2);
    state = run(answerWrong(state), { type: 'continue', now: 2 }); // ex1 wrong (1st)
    state = answerRight(state); // ex2
    state = run(answerWrong(state), { type: 'continue', now: 3 }); // ex1 wrong (2nd)
    expect(state.missedIds).toEqual(['ex1']);
    expect(state.hearts).toBe(3); // each miss still costs a heart
    state = answerRight(state, 9000);
    expect(state.phase).toBe('lessonOver');
    expect(state.missedIds).toEqual(['ex1']);
    expect(getAccuracy(state)).toBe(50);
  });

  it('a wrong answer and a skip on the same exercise count once', () => {
    let state = run(answerWrong(start(3)), { type: 'continue', now: 2 }); // ex1 wrong
    state = answerRight(answerRight(state)); // ex2, ex3
    state = run(state, { type: 'skip' }); // ex1 skipped
    expect(getCurrentExercise(state)?.id).toBe('ex1');
    expect(state.missedIds).toEqual(['ex1']);
    expect(state.hearts).toBe(3);
  });

  it('a perfect lesson has 100% accuracy and is flagged perfect', () => {
    const state = answerRight(answerRight(answerRight(start(3))));
    expect(isPerfect(state)).toBe(true);
    expect(getAccuracy(state)).toBe(100);
  });

  it('accuracy rounds: 2 missed of 10 is 80%, 1 of 3 is 67%', () => {
    let ten = start(10);
    ten = run(answerWrong(ten), { type: 'continue', now: 2 });
    ten = run(answerWrong(ten), { type: 'continue', now: 2 });
    for (let i = 0; i < 10; i += 1) ten = answerRight(ten);
    expect(ten.phase).toBe('lessonOver');
    expect(getAccuracy(ten)).toBe(80);
    expect(isPerfect(ten)).toBe(false);

    let three = run(answerWrong(start(3)), { type: 'continue', now: 2 });
    for (let i = 0; i < 3; i += 1) three = answerRight(three);
    expect(getAccuracy(three)).toBe(67);
  });
});

describe('purity', () => {
  it('does not mutate the previous state', () => {
    const before = start();
    const snapshot = JSON.stringify(before);
    run(before, { type: 'select', optionId: 'ex1-b' }, { type: 'check' }, { type: 'continue', now: 5 });
    expect(JSON.stringify(before)).toBe(snapshot);
  });
});
