import { describe, expect, it } from 'vitest';
import { courseSchema } from '@/api/schemas/course';

const course = {
  id: 'et',
  title: 'Estonian',
  fromLanguage: 'English',
  units: [
    {
      id: 'unit-1',
      title: 'Food and drink',
      description: 'Everyday things to eat and drink.',
      lessons: [
        { id: 'lesson-1', title: 'Basics' },
        { id: 'lesson-2', title: 'More food' },
      ],
    },
    {
      id: 'unit-2',
      title: 'Animals',
      description: 'Pets and farm animals.',
      lessons: [{ id: 'lesson-5', title: 'Pets' }],
    },
  ],
};

function omit(source: Record<string, unknown>, key: string): Record<string, unknown> {
  return Object.fromEntries(Object.entries(source).filter(([name]) => name !== key));
}

describe('courseSchema', () => {
  it('accepts a course with units and lessons and keeps their order', () => {
    const parsed = courseSchema.parse(course);
    expect(parsed).toEqual(course);
    expect(parsed.units.map((unit) => unit.id)).toEqual(['unit-1', 'unit-2']);
    expect(parsed.units[0]?.lessons.map((lesson) => lesson.id)).toEqual(['lesson-1', 'lesson-2']);
  });

  it('accepts a course with no units (empty state)', () => {
    expect(courseSchema.safeParse({ ...course, units: [] }).success).toBe(true);
  });

  it('accepts a unit with no lessons (empty state)', () => {
    const [unit] = course.units;
    expect(courseSchema.safeParse({ ...course, units: [{ ...unit, lessons: [] }] }).success).toBe(
      true,
    );
  });

  it.each(['id', 'title', 'fromLanguage', 'units'] as const)('rejects a course without %s', (key) => {
    expect(courseSchema.safeParse(omit(course, key)).success).toBe(false);
  });

  it('rejects a unit without a description', () => {
    const unit = omit(course.units[0] ?? {}, 'description');
    expect(courseSchema.safeParse({ ...course, units: [unit] }).success).toBe(false);
  });

  it('rejects a lesson without a title', () => {
    const units = [{ ...course.units[0], lessons: [{ id: 'lesson-1' }] }];
    expect(courseSchema.safeParse({ ...course, units }).success).toBe(false);
  });

  it('rejects a body that is not an object', () => {
    expect(courseSchema.safeParse(null).success).toBe(false);
    expect(courseSchema.safeParse([]).success).toBe(false);
  });
});
