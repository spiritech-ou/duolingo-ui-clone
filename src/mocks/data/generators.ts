import type { Course } from '@/api/schemas/course';
import type { Exercise, ExerciseOption, Lesson, Practice } from '@/api/schemas/lesson';
import { PRACTICE_ID } from '@/api/schemas/lesson';
import { createSeededRandom, shuffle, type RandomSource } from '@/lib/random';
import {
  COURSE_FROM_LANGUAGE,
  COURSE_ID,
  COURSE_TITLE,
  COURSE_UNITS,
  UNIT_DEFINITIONS,
  VOCABULARY_ITEMS,
  type VocabularyItem,
} from './vocabulary';

/** Default size of a practice set (`GET /api/practice?count=5`). */
export const DEFAULT_PRACTICE_COUNT = 5;

/** Title of the practice payload; the specs do not define one (reported as a gap). */
export const PRACTICE_TITLE = 'Practice';

const unitIdByLessonId = new Map<string, string>(
  UNIT_DEFINITIONS.flatMap((unit) => unit.lessons.map((lesson) => [lesson.id, unit.id] as const)),
);

function unitOf(item: VocabularyItem): string | undefined {
  return unitIdByLessonId.get(item.lessonId);
}

function toOption(item: VocabularyItem): ExerciseOption {
  return { id: item.id, estonian: item.estonian, picture: item.picture };
}

/**
 * Picks two distractors for `target`: other items, no two options sharing an emoji,
 * from the target's unit when possible, topped up from other units otherwise.
 */
export function pickDistractors(
  target: VocabularyItem,
  random: RandomSource,
): [VocabularyItem, VocabularyItem] {
  const unitId = unitOf(target);
  const others = VOCABULARY_ITEMS.filter((item) => item.id !== target.id);
  const sameUnit = shuffle(
    others.filter((item) => unitOf(item) === unitId),
    random,
  );
  const otherUnits = shuffle(
    others.filter((item) => unitOf(item) !== unitId),
    random,
  );
  const usedEmoji = new Set([target.picture.emoji]);
  const chosen: VocabularyItem[] = [];
  for (const candidate of [...sameUnit, ...otherUnits]) {
    if (chosen.length === 2) break;
    if (usedEmoji.has(candidate.picture.emoji)) continue;
    usedEmoji.add(candidate.picture.emoji);
    chosen.push(candidate);
  }
  const [first, second] = chosen;
  if (!first || !second) throw new Error(`Not enough distractors for "${target.id}"`);
  return [first, second];
}

function buildExercise(
  id: string,
  target: VocabularyItem,
  isNewWord: boolean,
  random: RandomSource,
): Exercise {
  const [first, second] = pickDistractors(target, random);
  // The correct option lands at a random position among the three.
  const [a, b, c] = shuffle([target, first, second], random);
  if (!a || !b || !c) throw new Error('Expected three options');
  return {
    id,
    type: 'picture-choice',
    english: target.english,
    isNewWord,
    options: [toOption(a), toOption(b), toOption(c)],
    correctOptionId: target.id,
  };
}

/** The course tree served by `GET /api/course`, units and lessons in course order. */
export function generateCourse(): Course {
  return {
    id: COURSE_ID,
    title: COURSE_TITLE,
    fromLanguage: COURSE_FROM_LANGUAGE,
    units: COURSE_UNITS.map((unit) => ({
      ...unit,
      lessons: unit.lessons.map((lesson) => ({ ...lesson })),
    })),
  };
}

/**
 * The 10 exercises of a lesson: its 5 words, each asked twice. The first round asks every word
 * once (`isNewWord` true), the second round asks them again in another order (`isNewWord` false).
 * Seeded by the lesson id, so the same id always returns the same exercises, order and options.
 * Returns `undefined` for an unknown lesson id (the handler answers 404).
 */
export function generateLesson(lessonId: string): Lesson | undefined {
  const definition = UNIT_DEFINITIONS.flatMap((unit) => unit.lessons).find(
    (lesson) => lesson.id === lessonId,
  );
  if (!definition) return undefined;

  const random = createSeededRandom(lessonId);
  const items = VOCABULARY_ITEMS.filter((item) => item.lessonId === lessonId);
  const firstRound = shuffle(items, random);
  let secondRound = shuffle(items, random);
  // Avoid asking the same word twice in a row across the two rounds.
  const [head, ...rest] = secondRound;
  if (head && head.id === firstRound[firstRound.length - 1]?.id) {
    secondRound = [...rest, head];
  }

  const exercises = [
    ...firstRound.map((item, index) =>
      buildExercise(`${lessonId}-e${index + 1}`, item, true, random),
    ),
    ...secondRound.map((item, index) =>
      buildExercise(`${lessonId}-e${firstRound.length + index + 1}`, item, false, random),
    ),
  ];
  return { id: lessonId, title: definition.title, exercises };
}

/**
 * A practice set of `count` exercises (default 5) on distinct items drawn at random from
 * all 120, `isNewWord` false. `count` is clamped to 0..120 (pool size). Inject `random` in tests.
 */
export function generatePractice(
  count: number = DEFAULT_PRACTICE_COUNT,
  random: RandomSource = Math.random,
): Practice {
  const size = Math.max(0, Math.min(Math.trunc(count), VOCABULARY_ITEMS.length));
  const drawn = shuffle(VOCABULARY_ITEMS, random).slice(0, size);
  return {
    id: PRACTICE_ID,
    title: PRACTICE_TITLE,
    exercises: drawn.map((item, index) =>
      buildExercise(`${PRACTICE_ID}-e${index + 1}`, item, false, random),
    ),
  };
}
