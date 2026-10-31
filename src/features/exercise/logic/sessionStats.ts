/** Exercises in a lesson (practice has 5); the accuracy denominator of the spec. */
export const LESSON_EXERCISE_COUNT = 10;

/**
 * Accuracy for the lesson-over screen: `round(100 x (total - distinct missed) / total)`.
 * `total` defaults to the 10 exercises of a lesson; a missed exercise counts once however
 * often it was missed. Out-of-range input is clamped to 0..100; a total of 0 gives 100.
 */
export function calculateAccuracy(
  distinctMissed: number,
  total: number = LESSON_EXERCISE_COUNT,
): number {
  if (total <= 0) return 100;
  const missed = Math.min(total, Math.max(0, distinctMissed));
  return Math.round((100 * (total - missed)) / total);
}

/** "Perfect lesson!" applies when no exercise was missed or skipped. */
export function isPerfectLesson(distinctMissed: number): boolean {
  return distinctMissed === 0;
}

/** Elapsed milliseconds as `m:ss` (minutes are not padded, and may exceed 59). */
export function formatElapsed(elapsedMs: number): string {
  const totalSeconds = Math.floor(Math.max(0, elapsedMs) / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}
