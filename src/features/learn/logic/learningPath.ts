/** Pure learning path rules of docs/product/learning-path.md (node states, OQ-40). */
import type { Course } from '@/api/schemas/course';

export type NodeState = 'completed' | 'recommended' | 'available';

export interface PathLesson {
  id: string;
  title: string;
}

export interface PathUnit {
  lessons: readonly PathLesson[];
}

export interface PathCourse {
  units: readonly PathUnit[];
}

export interface PathProfile {
  completedLessonIds: readonly string[];
  startUnitIndex: number;
}

/** Lesson ids in course order. */
function flattenLessonIds(course: PathCourse): string[] {
  return course.units.flatMap((unit) => unit.lessons.map((lesson) => lesson.id));
}

/** True when there are no units, or no unit has a lesson (the Empty state). */
export function isCourseEmpty(course: Pick<Course, 'units'> | PathCourse): boolean {
  return course.units.every((unit) => unit.lessons.length === 0);
}

/**
 * The recommended lesson id (OQ-40): the first not-completed lesson in course order from the
 * first lesson of unit `startUnitIndex` (capped at the last unit) onward; if none remains,
 * the first not-completed lesson before it; `null` when everything is completed or the course is empty.
 */
export function getRecommendedLessonId(course: PathCourse, profile: PathProfile): string | null {
  if (course.units.length === 0) return null;
  const completed = new Set(profile.completedLessonIds);
  const unitIndex = Math.min(Math.max(profile.startUnitIndex, 0), course.units.length - 1);

  // Index in the flat lesson list of the first lesson of the start unit (empty units add nothing).
  const startOffset = course.units
    .slice(0, unitIndex)
    .reduce((count, unit) => count + unit.lessons.length, 0);

  const ids = flattenLessonIds(course);
  const after = ids.slice(startOffset).find((id) => !completed.has(id));
  if (after !== undefined) return after;
  return ids.slice(0, startOffset).find((id) => !completed.has(id)) ?? null;
}

/** The state of every lesson id, in course order. */
export function getNodeStates(course: PathCourse, profile: PathProfile): Map<string, NodeState> {
  const completed = new Set(profile.completedLessonIds);
  const recommended = getRecommendedLessonId(course, profile);
  const states = new Map<string, NodeState>();
  for (const id of flattenLessonIds(course)) {
    if (completed.has(id)) states.set(id, 'completed');
    else states.set(id, id === recommended ? 'recommended' : 'available');
  }
  return states;
}

/**
 * Accessible name of a node: "Lesson 3, Greetings, completed",
 * "Lesson 4, Food, recommended, start", "Lesson 5, Drinks". `lessonNumber` is 1-based.
 */
export function getNodeAccessibleName(lessonNumber: number, title: string, state: NodeState): string {
  const base = `Lesson ${lessonNumber}, ${title}`;
  if (state === 'completed') return `${base}, completed`;
  if (state === 'recommended') return `${base}, recommended, start`;
  return base;
}

/** The placement note; `startUnitIndex` is 0-based, the text counts units from 1. */
export function getPlacementNoteText(startUnitIndex: number): string {
  return `We recommend starting at Unit ${startUnitIndex + 1} based on your answer.`;
}
