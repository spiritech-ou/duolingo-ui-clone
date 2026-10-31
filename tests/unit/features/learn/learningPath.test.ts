import { describe, expect, it } from 'vitest';
import {
  getNodeAccessibleName,
  getNodeStates,
  getPlacementNoteText,
  getRecommendedLessonId,
  isCourseEmpty,
} from '@/features/learn/logic/learningPath';

/** 3 units of 2 lessons: u1l1 u1l2 | u2l1 u2l2 | u3l1 u3l2. */
const course = {
  units: [1, 2, 3].map((u) => ({
    lessons: [1, 2].map((l) => ({ id: `u${u}l${l}`, title: `T${u}${l}` })),
  })),
};
const rec = (completed: string[], startUnitIndex = 0) =>
  getRecommendedLessonId(course, { completedLessonIds: completed, startUnitIndex });

describe('getRecommendedLessonId', () => {
  it('is the first lesson when nothing is done', () => {
    expect(rec([])).toBe('u1l1');
  });
  it('starts from the first lesson of the start unit', () => {
    expect(rec([], 1)).toBe('u2l1');
    expect(rec([], 2)).toBe('u3l1');
  });
  it('skips completed lessons in course order', () => {
    expect(rec(['u1l1'])).toBe('u1l2');
    expect(rec(['u1l1', 'u1l2'])).toBe('u2l1');
  });
  it('does not move past earlier unfinished lessons after an out-of-order completion', () => {
    expect(rec(['u1l2'])).toBe('u1l1');
    expect(rec(['u2l1', 'u3l2'])).toBe('u1l1');
  });
  it('ignores completions of lessons before the start unit while later ones remain', () => {
    expect(rec(['u2l1'], 1)).toBe('u2l2');
    expect(rec(['u1l1'], 1)).toBe('u2l1');
  });
  it('finds a gap inside the start unit even when later lessons are done', () => {
    expect(rec(['u2l2', 'u3l1', 'u3l2'], 1)).toBe('u2l1');
  });
  it('wraps to the first not-completed lesson before the start unit when none remains after', () => {
    expect(rec(['u2l1', 'u2l2', 'u3l1', 'u3l2'], 1)).toBe('u1l1');
    expect(rec(['u1l1', 'u2l1', 'u2l2', 'u3l1', 'u3l2'], 1)).toBe('u1l2');
    expect(rec(['u3l1', 'u3l2'], 2)).toBe('u1l1');
    expect(rec(['u1l1', 'u3l1', 'u3l2'], 2)).toBe('u1l2');
    expect(rec(['u1l1', 'u1l2', 'u3l1', 'u3l2'], 2)).toBe('u2l1');
  });
  it('caps a start unit index beyond the last unit', () => {
    expect(rec([], 99)).toBe('u3l1');
    expect(rec(['u3l1', 'u3l2'], 99)).toBe('u1l1');
  });
  it('treats a negative start unit index as the first unit', () => {
    expect(rec([], -1)).toBe('u1l1');
  });
  it('is null when everything is completed', () => {
    const all = ['u1l1', 'u1l2', 'u2l1', 'u2l2', 'u3l1', 'u3l2'];
    for (const start of [0, 1, 2, 5]) expect(rec(all, start)).toBeNull();
  });
  it('ignores completed ids that are not in the course', () => {
    expect(rec(['gone', 'u1l1'])).toBe('u1l2');
  });
  it('is null for an empty course', () => {
    expect(getRecommendedLessonId({ units: [] }, { completedLessonIds: [], startUnitIndex: 0 })).toBeNull();
    expect(
      getRecommendedLessonId({ units: [{ lessons: [] }] }, { completedLessonIds: [], startUnitIndex: 0 }),
    ).toBeNull();
  });
  it('handles units with no lessons in the middle', () => {
    const gappy = {
      units: [
        { lessons: [{ id: 'a', title: 'A' }] },
        { lessons: [] },
        { lessons: [{ id: 'b', title: 'B' }] },
      ],
    };
    const at = (completed: string[], startUnitIndex: number) =>
      getRecommendedLessonId(gappy, { completedLessonIds: completed, startUnitIndex });
    expect(at([], 1)).toBe('b');
    expect(at(['b'], 1)).toBe('a');
    expect(at([], 2)).toBe('b');
  });
});

describe('getNodeStates', () => {
  it('labels completed, recommended and available nodes', () => {
    const states = getNodeStates(course, { completedLessonIds: ['u1l2', 'u2l1'], startUnitIndex: 0 });
    expect([...states.entries()]).toEqual([
      ['u1l1', 'recommended'],
      ['u1l2', 'completed'],
      ['u2l1', 'completed'],
      ['u2l2', 'available'],
      ['u3l1', 'available'],
      ['u3l2', 'available'],
    ]);
  });
  it('has exactly one recommended node, and none when all are completed', () => {
    const none = getNodeStates(course, { completedLessonIds: [], startUnitIndex: 1 });
    expect([...none.values()].filter((s) => s === 'recommended')).toHaveLength(1);
    const all = getNodeStates(course, {
      completedLessonIds: ['u1l1', 'u1l2', 'u2l1', 'u2l2', 'u3l1', 'u3l2'],
      startUnitIndex: 0,
    });
    expect([...all.values()].every((s) => s === 'completed')).toBe(true);
  });
  it('is empty for an empty course', () => {
    expect(getNodeStates({ units: [] }, { completedLessonIds: [], startUnitIndex: 0 }).size).toBe(0);
  });
});

describe('getNodeAccessibleName', () => {
  it('matches the copy of the spec', () => {
    expect(getNodeAccessibleName(3, 'Greetings', 'completed')).toBe('Lesson 3, Greetings, completed');
    expect(getNodeAccessibleName(4, 'Food', 'recommended')).toBe('Lesson 4, Food, recommended, start');
    expect(getNodeAccessibleName(5, 'Drinks', 'available')).toBe('Lesson 5, Drinks');
  });
});

describe('isCourseEmpty', () => {
  it('is true with no units or only lesson-less units', () => {
    expect(isCourseEmpty({ units: [] })).toBe(true);
    expect(isCourseEmpty({ units: [{ lessons: [] }, { lessons: [] }] })).toBe(true);
  });
  it('is false when any unit has a lesson', () => {
    expect(isCourseEmpty({ units: [{ lessons: [] }, { lessons: [{ id: 'a', title: 'A' }] }] })).toBe(false);
  });
});

describe('getPlacementNoteText', () => {
  it('counts units from 1', () => {
    expect(getPlacementNoteText(0)).toBe('We recommend starting at Unit 1 based on your answer.');
    expect(getPlacementNoteText(2)).toBe('We recommend starting at Unit 3 based on your answer.');
  });
});
