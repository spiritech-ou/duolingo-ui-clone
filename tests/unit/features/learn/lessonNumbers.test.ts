import { describe, expect, it } from 'vitest';
import { getFirstLessonNumbers } from '@/features/learn/logic/learningPath';

const lesson = (id: string) => ({ id, title: id });

describe('getFirstLessonNumbers', () => {
  it('counts lessons across units, 1-based', () => {
    const course = {
      units: [
        { lessons: [lesson('a'), lesson('b'), lesson('c')] },
        { lessons: [lesson('d'), lesson('e')] },
        { lessons: [lesson('f')] },
      ],
    };
    expect(getFirstLessonNumbers(course)).toEqual([1, 4, 6]);
  });

  it('lets an empty unit share the next unit start and handles no units', () => {
    expect(
      getFirstLessonNumbers({ units: [{ lessons: [lesson('a')] }, { lessons: [] }, { lessons: [lesson('b')] }] }),
    ).toEqual([1, 2, 2]);
    expect(getFirstLessonNumbers({ units: [] })).toEqual([]);
  });
});
