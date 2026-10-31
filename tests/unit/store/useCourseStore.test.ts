import { beforeEach, describe, expect, it } from 'vitest';
import { generateCourse } from '@/mocks/data/generators';
import { useCourseStore } from '@/store/useCourseStore';

describe('useCourseStore', () => {
  beforeEach(() => {
    localStorage.clear();
    useCourseStore.getState().reset();
  });

  it('starts with no course', () => {
    expect(useCourseStore.getState().course).toBeNull();
  });

  it('keeps the course it is given', () => {
    const course = generateCourse();
    useCourseStore.getState().setCourse(course);
    expect(useCourseStore.getState().course).toBe(course);
  });

  it('reset() clears the course', () => {
    useCourseStore.getState().setCourse(generateCourse());
    useCourseStore.getState().reset();
    expect(useCourseStore.getState().course).toBeNull();
  });

  it('is not persisted', () => {
    useCourseStore.getState().setCourse(generateCourse());
    expect(localStorage.length).toBe(0);
  });
});
