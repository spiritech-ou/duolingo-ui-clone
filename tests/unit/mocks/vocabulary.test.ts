import { describe, expect, it } from 'vitest';
import {
  COURSE_UNITS,
  UNIT_DEFINITIONS,
  VOCABULARY_ITEMS,
} from '@/mocks/data/vocabulary';

const lessons = UNIT_DEFINITIONS.flatMap((unit) => unit.lessons);
const VALID_ESTONIAN = /^[a-zõäöüšž]+$/;

describe('vocabulary dataset', () => {
  it('has 6 units, 24 lessons and exactly 120 items', () => {
    expect(UNIT_DEFINITIONS).toHaveLength(6);
    expect(lessons).toHaveLength(24);
    expect(VOCABULARY_ITEMS).toHaveLength(120);
    expect(COURSE_UNITS).toHaveLength(6);
  });

  it.each(['õ', 'ä', 'ö', 'ü', 'š', 'ž'])('contains the special letter %s', (letter) => {
    expect(VOCABULARY_ITEMS.some((item) => item.estonian.includes(letter))).toBe(true);
  });

  it('has the same number of items as lessons times five', () => {
    expect(VOCABULARY_ITEMS).toHaveLength(lessons.length * 5);
  });

  it('has 4 lessons in every unit', () => {
    for (const unit of UNIT_DEFINITIONS) {
      expect(unit.lessons, unit.id).toHaveLength(4);
    }
  });

  it('puts exactly 5 items in every lesson', () => {
    for (const lesson of lessons) {
      const count = VOCABULARY_ITEMS.filter((item) => item.lessonId === lesson.id).length;
      expect(count, lesson.id).toBe(5);
    }
  });

  it('assigns every item to an existing lesson', () => {
    const lessonIds = new Set(lessons.map((lesson) => lesson.id));
    for (const item of VOCABULARY_ITEMS) {
      expect(lessonIds.has(item.lessonId), item.id).toBe(true);
    }
  });

  it('has unique item ids, lesson ids and unit ids', () => {
    const itemIds = VOCABULARY_ITEMS.map((item) => item.id);
    expect(new Set(itemIds).size).toBe(itemIds.length);
    const lessonIds = lessons.map((lesson) => lesson.id);
    expect(new Set(lessonIds).size).toBe(lessonIds.length);
    const unitIds = UNIT_DEFINITIONS.map((unit) => unit.id);
    expect(new Set(unitIds).size).toBe(unitIds.length);
  });

  it('has unique estonian values', () => {
    const words = VOCABULARY_ITEMS.map((item) => item.estonian);
    expect(new Set(words).size).toBe(words.length);
  });

  it('repeats no emoji within a lesson', () => {
    for (const lesson of lessons) {
      const emojis = VOCABULARY_ITEMS.filter((item) => item.lessonId === lesson.id).map(
        (item) => item.picture.emoji,
      );
      expect(new Set(emojis).size, lesson.id).toBe(emojis.length);
    }
  });

  it('stores every estonian value in NFC', () => {
    for (const item of VOCABULARY_ITEMS) {
      expect(item.estonian, item.id).toBe(item.estonian.normalize('NFC'));
    }
  });

  it('uses only valid Estonian letters in estonian values', () => {
    for (const item of VOCABULARY_ITEMS) {
      expect(item.estonian, item.id).toMatch(VALID_ESTONIAN);
    }
  });

  it('has non-empty english, estonian, emoji and alt text', () => {
    for (const item of VOCABULARY_ITEMS) {
      expect(item.english.trim(), item.id).not.toBe('');
      expect(item.estonian.trim(), item.id).not.toBe('');
      expect(item.picture.emoji.trim(), item.id).not.toBe('');
      expect(item.picture.alt.trim(), item.id).not.toBe('');
    }
  });

  it('has english titles and descriptions for units and lessons', () => {
    for (const unit of UNIT_DEFINITIONS) {
      expect(unit.title.trim(), unit.id).not.toBe('');
      expect(unit.description.trim(), unit.id).not.toBe('');
      for (const lesson of unit.lessons) {
        expect(lesson.title.trim(), lesson.id).not.toBe('');
        expect(lesson.description.trim(), lesson.id).not.toBe('');
      }
    }
  });

  it('exposes the course tree in course order', () => {
    expect(COURSE_UNITS.map((unit) => unit.id)).toEqual(UNIT_DEFINITIONS.map((unit) => unit.id));
    expect(COURSE_UNITS.flatMap((unit) => unit.lessons.map((lesson) => lesson.id))).toEqual(
      lessons.map((lesson) => lesson.id),
    );
  });
});
