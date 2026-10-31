import type { Exercise } from '@/api/schemas/lesson';
import { clampHearts } from '@/store/useProfileStore';
import { calculateAccuracy, isPerfectLesson } from './sessionStats';
import type { CreateSessionInput, SessionAction, SessionState } from './sessionTypes';

/** XP for any completed lesson, replays included. */
export const LESSON_XP = 10;

/**
 * Initial session. A lesson that starts with 0 hearts is out of hearts at once;
 * an empty exercise list is already complete (containers show the empty state
 * before ever creating a session).
 */
export function createSession({ exercises, mode, hearts, now }: CreateSessionInput): SessionState {
  const clamped = clampHearts(hearts);
  const base: SessionState = {
    mode,
    phase: 'idle',
    queue: exercises,
    steps: exercises.length,
    correctCount: 0,
    hearts: clamped,
    heartsLost: 0,
    missedIds: [],
    selectedOptionId: null,
    startedAt: now,
    finishedAt: null,
  };
  if (mode === 'lesson' && clamped === 0) return { ...base, phase: 'outOfHearts' };
  if (exercises.length === 0) {
    return { ...base, phase: endPhase(mode), finishedAt: now };
  }
  return base;
}

function endPhase(mode: SessionState['mode']): 'lessonOver' | 'practiceComplete' {
  return mode === 'lesson' ? 'lessonOver' : 'practiceComplete';
}

/** The exercise being shown (also during its feedback), or undefined when the queue is empty. */
export function getCurrentExercise(state: SessionState): Exercise | undefined {
  return state.queue[0];
}

/** Records a miss (distinct) and takes one heart in lesson mode only. */
function registerMiss(state: SessionState, phase: 'wrong' | 'skipped', exercise: Exercise): SessionState {
  const loses = state.mode === 'lesson' && state.hearts > 0;
  return {
    ...state,
    phase,
    hearts: loses ? state.hearts - 1 : state.hearts,
    heartsLost: loses ? 1 : 0,
    missedIds: state.missedIds.includes(exercise.id)
      ? state.missedIds
      : [...state.missedIds, exercise.id],
  };
}

/** Pure session reducer. Actions that do not apply in the current phase return the same state. */
export function sessionReducer(state: SessionState, action: SessionAction): SessionState {
  const current = state.queue[0];
  if (!current) return state;

  switch (action.type) {
    case 'select': {
      if (state.phase !== 'idle' && state.phase !== 'selected') return state;
      if (!current.options.some((option) => option.id === action.optionId)) return state;
      return { ...state, phase: 'selected', selectedOptionId: action.optionId, heartsLost: 0 };
    }
    case 'check': {
      if (state.phase !== 'selected' || state.selectedOptionId === null) return state;
      if (state.selectedOptionId === current.correctOptionId) {
        return { ...state, phase: 'correct', correctCount: state.correctCount + 1, heartsLost: 0 };
      }
      return registerMiss(state, 'wrong', current);
    }
    case 'skip': {
      if (state.phase !== 'idle' && state.phase !== 'selected') return state;
      return registerMiss(state, 'skipped', current);
    }
    case 'continue': {
      if (state.phase === 'correct') {
        const queue = state.queue.slice(1);
        if (queue.length === 0) {
          return {
            ...state,
            queue,
            phase: endPhase(state.mode),
            selectedOptionId: null,
            heartsLost: 0,
            finishedAt: action.now,
          };
        }
        return { ...state, queue, phase: 'idle', selectedOptionId: null, heartsLost: 0 };
      }
      if (state.phase === 'wrong' || state.phase === 'skipped') {
        if (state.mode === 'lesson' && state.hearts === 0) {
          return { ...state, phase: 'outOfHearts', selectedOptionId: null, heartsLost: 0 };
        }
        return {
          ...state,
          queue: [...state.queue.slice(1), current],
          phase: 'idle',
          selectedOptionId: null,
          heartsLost: 0,
        };
      }
      return state;
    }
  }
}

/** Progress bar value and maximum. */
export function getProgress(state: SessionState): { value: number; max: number } {
  return { value: state.correctCount, max: state.steps };
}

/** Accuracy for the lesson-over screen: `round(100 x (steps - distinct missed) / steps)`. */
export function getAccuracy(state: SessionState): number {
  return calculateAccuracy(state.missedIds.length, state.steps);
}

/** True when every exercise was right the first time ("Perfect lesson!"). */
export function isPerfect(state: SessionState): boolean {
  return isPerfectLesson(state.missedIds.length);
}

/** Milliseconds from the first exercise shown to the last CONTINUE; null while running. */
export function getElapsedMs(state: SessionState): number | null {
  return state.finishedAt === null ? null : Math.max(0, state.finishedAt - state.startedAt);
}
