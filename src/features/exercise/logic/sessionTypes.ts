import type { Exercise } from '@/api/schemas/lesson';

export type SessionMode = 'lesson' | 'practice';

/**
 * Where the session is, named after the states of `docs/product/exercise-session.md`.
 * - `idle`: an exercise is shown, nothing selected
 * - `selected`: a card is selected
 * - `correct` / `wrong` / `skipped`: the feedback panel is showing (cards locked)
 * - `lessonOver` / `practiceComplete`: the queue is empty
 * - `outOfHearts`: CONTINUE after a mistake that left 0 hearts (progress discarded)
 */
export type SessionPhase =
  | 'idle'
  | 'selected'
  | 'correct'
  | 'wrong'
  | 'skipped'
  | 'lessonOver'
  | 'practiceComplete'
  | 'outOfHearts';

export interface SessionState {
  readonly mode: SessionMode;
  readonly phase: SessionPhase;
  /**
   * Exercises still to answer correctly; the head is the current exercise.
   * During a feedback phase the head is still the exercise being reviewed:
   * CONTINUE removes it (correct) or moves it to the end (wrong or skipped).
   */
  readonly queue: readonly Exercise[];
  /** Initial number of exercises: the progress bar maximum. */
  readonly steps: number;
  /** Correct answers so far: the progress bar value (wrong and skipped never move it). */
  readonly correctCount: number;
  /** Hearts left. Only lesson mode ever changes it; the caller persists changes. */
  readonly hearts: number;
  /** Hearts removed by the most recent answer (0 or 1), for the counter animation. */
  readonly heartsLost: number;
  /** Distinct ids of exercises answered wrongly or skipped at least once. */
  readonly missedIds: readonly string[];
  /** Selected option id of the current exercise, or null. */
  readonly selectedOptionId: string | null;
  /** Caller-supplied time of the first exercise being shown. */
  readonly startedAt: number;
  /** Caller-supplied time of the last CONTINUE; null until the session ends in an end screen. */
  readonly finishedAt: number | null;
}

export type SessionAction =
  | { readonly type: 'select'; readonly optionId: string }
  | { readonly type: 'check' }
  | { readonly type: 'skip' }
  | { readonly type: 'continue'; readonly now: number };

export interface CreateSessionInput {
  readonly exercises: readonly Exercise[];
  readonly mode: SessionMode;
  /** Current hearts of the profile. */
  readonly hearts: number;
  /** Start time, supplied by the caller so the reducer stays pure. */
  readonly now: number;
}
