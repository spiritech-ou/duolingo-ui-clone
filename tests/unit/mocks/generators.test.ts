import { describe, expect, it } from 'vitest';
import { courseSchema } from '@/api/schemas/course';
import { lessonSchema, practiceSchema, type Exercise } from '@/api/schemas/lesson';
import { createSeededRandom } from '@/lib/random';
import {
  DEFAULT_PRACTICE_COUNT,
  generateCourse,
  generateLesson,
  generatePractice,
} from '@/mocks/data/generators';
import { UNIT_DEFINITIONS, VOCABULARY_ITEMS } from '@/mocks/data/vocabulary';

const lessons = UNIT_DEFINITIONS.flatMap((unit) =>
  unit.lessons.map((lesson) => ({ ...lesson, unitId: unit.id })),
);
const itemById = new Map(VOCABULARY_ITEMS.map((item) => [item.id, item]));
const unitByLesson = new Map(lessons.map((lesson) => [lesson.id, lesson.unitId]));

function requireItem(id: string) {
  const item = itemById.get(id);
  if (!item) throw new Error(`Unknown item ${id}`);
  return item;
}

function requireLesson(id: string) {
  const lesson = generateLesson(id);
  if (!lesson) throw new Error(`Unknown lesson ${id}`);
  return lesson;
}

const unitOfItemId = (id: string) => unitByLesson.get(requireItem(id).lessonId);

function checkDistractors(exercise: Exercise) {
  const ids = exercise.options.map((option) => option.id);
  expect(new Set(ids).size).toBe(3);
  const emoji = exercise.options.map((option) => option.picture.emoji);
  expect(new Set(emoji).size).toBe(3);
  const target = requireItem(exercise.correctOptionId);
  expect(target.english).toBe(exercise.english);
  const targetUnit = unitOfItemId(target.id);
  for (const id of ids.filter((value) => value !== target.id)) {
    expect(unitOfItemId(id), `${exercise.id} distractor ${id}`).toBe(targetUnit);
  }
}

describe('generateCourse', () => {
  it('passes the course schema with 6 units and 24 lessons in order', () => {
    const course = generateCourse();
    expect(courseSchema.parse(course)).toEqual(course);
    expect(course).toMatchObject({ id: 'et', title: 'Estonian', fromLanguage: 'English' });
    expect(course.units.map((unit) => unit.id)).toEqual(UNIT_DEFINITIONS.map((unit) => unit.id));
    expect(course.units.flatMap((unit) => unit.lessons.map((lesson) => lesson.id))).toEqual(
      lessons.map((lesson) => lesson.id),
    );
  });
});

describe('generateLesson', () => {
  it('returns undefined for an unknown lesson id', () => {
    expect(generateLesson('nope')).toBeUndefined();
  });

  describe.each(lessons.map((lesson) => lesson.id))('lesson %s', (lessonId) => {
    const lesson = requireLesson(lessonId);
    const words = VOCABULARY_ITEMS.filter((item) => item.lessonId === lessonId).map((i) => i.id);

    it('passes the lesson schema with 10 exercises', () => {
      expect(lessonSchema.parse(lesson)).toEqual(lesson);
      expect(lesson.exercises).toHaveLength(10);
      expect(new Set(lesson.exercises.map((e) => e.id)).size).toBe(10);
    });

    it('is deterministic: same exercises, order and option order every call', () => {
      expect(generateLesson(lessonId)).toEqual(lesson);
    });

    it('asks each of its 5 words exactly twice, flagging only the first ask as new', () => {
      const asked = lesson.exercises.map((e) => e.correctOptionId);
      for (const word of words) expect(asked.filter((id) => id === word)).toHaveLength(2);
      const seen = new Set<string>();
      for (const exercise of lesson.exercises) {
        const first = !seen.has(exercise.correctOptionId);
        expect(exercise.isNewWord, exercise.id).toBe(first);
        seen.add(exercise.correctOptionId);
      }
      expect(lesson.exercises.filter((e) => e.isNewWord)).toHaveLength(5);
    });

    it('never asks the same word twice in a row', () => {
      for (let i = 1; i < 10; i += 1) {
        expect(lesson.exercises[i]?.correctOptionId).not.toBe(
          lesson.exercises[i - 1]?.correctOptionId,
        );
      }
    });

    it('follows the distractor rules in every exercise', () => {
      lesson.exercises.forEach(checkDistractors);
    });
  });

  it('varies the position of the correct option across the dataset', () => {
    const positions = new Set(
      lessons.flatMap((l) =>
        requireLesson(l.id).exercises.map((e) =>
          e.options.findIndex((o) => o.id === e.correctOptionId),
        ),
      ),
    );
    expect(positions).toEqual(new Set([0, 1, 2]));
  });

  it('gives different lessons different orders', () => {
    const orders = new Set(
      lessons.map((l) =>
        requireLesson(l.id)
          .exercises.slice(0, 5)
          .map((e) => VOCABULARY_ITEMS.findIndex((i) => i.id === e.correctOptionId) % 5)
          .join(),
      ),
    );
    expect(orders.size).toBeGreaterThan(1);
  });
});

describe('generatePractice', () => {
  it('returns 5 exercises by default, passing the practice schema', () => {
    const practice = generatePractice(undefined, createSeededRandom('p'));
    expect(practiceSchema.parse(practice)).toEqual(practice);
    expect(practice.id).toBe('practice');
    expect(practice.exercises).toHaveLength(DEFAULT_PRACTICE_COUNT);
  });

  it('honours count, uses distinct items, flags no new words and follows distractor rules', () => {
    const practice = generatePractice(20, createSeededRandom(7));
    expect(practice.exercises).toHaveLength(20);
    expect(new Set(practice.exercises.map((e) => e.correctOptionId)).size).toBe(20);
    for (const exercise of practice.exercises) {
      expect(exercise.isNewWord).toBe(false);
      checkDistractors(exercise);
    }
  });

  it('is a pure function of the injected random source', () => {
    expect(generatePractice(5, createSeededRandom(1))).toEqual(
      generatePractice(5, createSeededRandom(1)),
    );
  });

  it('differs between random sources and draws from the whole pool', () => {
    const a = generatePractice(5, createSeededRandom(1));
    const b = generatePractice(5, createSeededRandom(2));
    expect(a).not.toEqual(b);
    const drawn = new Set<string>();
    for (let seed = 0; seed < 60; seed += 1) {
      generatePractice(5, createSeededRandom(seed)).exercises.forEach((e) =>
        drawn.add(e.correctOptionId),
      );
    }
    const units = new Set([...drawn].map(unitOfItemId));
    expect(units.size).toBe(UNIT_DEFINITIONS.length);
  });

  it('clamps count to the pool size', () => {
    expect(generatePractice(500, createSeededRandom(1)).exercises).toHaveLength(120);
    expect(generatePractice(0).exercises).toHaveLength(0);
  });
});
