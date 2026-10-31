import { create } from 'zustand';
import type { Course } from '@/api/schemas/course';

interface CourseState {
  /** Last course payload loaded this session, or null before the first load. Not persisted. */
  course: Course | null;
  setCourse: (course: Course) => void;
  reset: () => void;
}

export const useCourseStore = create<CourseState>()((set) => ({
  course: null,
  setCourse: (course) => set({ course }),
  reset: () => set({ course: null }),
}));
