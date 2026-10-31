/**
 * Remembers what the path looked like when the user left it for a lesson, so the next arrival
 * can tell "back from a completed lesson" apart from a plain visit. Module level on purpose: it
 * must survive the unmount of the learn route. The lesson route (plan 2) only has to mark the
 * lesson completed in the profile store; nothing else is needed from it.
 */
export interface Departure {
  userId: string;
  /** The lesson the user opened. */
  lessonId: string;
  /** `completedLessonIds` at the moment of leaving. */
  completedLessonIds: readonly string[];
  /** The recommended lesson at the moment of leaving. */
  recommendedLessonId: string | null;
}

let departure: Departure | null = null;

export function rememberDeparture(next: Departure): void {
  departure = next;
}

/** The remembered departure of this user, without forgetting it (safe to call while rendering). */
export function peekDeparture(userId: string): Departure | null {
  return departure && departure.userId === userId ? departure : null;
}

export function resetArrivalMemory(): void {
  departure = null;
}

export interface ArrivalTarget {
  /** Lesson to scroll to and focus; `null` means the first node. */
  focusLessonId: string | null;
  /** True when the user returned from a newly completed lesson and the recommendation moved. */
  celebrate: boolean;
}

/**
 * Where a ready arrival lands. The recommended node wins; with none, the lesson just left stays in
 * view; with neither, the first node. `celebrate` needs a newly completed lesson and a different
 * recommended node than before.
 */
export function getArrivalTarget(
  recommendedLessonId: string | null,
  completedLessonIds: readonly string[],
  previous: Departure | null,
): ArrivalTarget {
  const focusLessonId = recommendedLessonId ?? previous?.lessonId ?? null;
  const newlyCompleted =
    previous !== null && completedLessonIds.some((id) => !previous.completedLessonIds.includes(id));
  const celebrate =
    newlyCompleted &&
    recommendedLessonId !== null &&
    recommendedLessonId !== previous?.recommendedLessonId;
  return { focusLessonId, celebrate };
}
