import { z } from 'zod';

/** A lesson as listed in the course tree (`GET /api/course`); its exercises come from `lesson.ts`. */
export const lessonSummarySchema = z.object({
  id: z.string(),
  title: z.string(),
});

/** A unit banner plus its lessons, in course order. An empty `lessons` list is valid (empty state). */
export const courseUnitSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  lessons: z.array(lessonSummarySchema),
});

/** Body of `GET /api/course`. An empty `units` list is valid (empty state). */
export const courseSchema = z.object({
  id: z.string(),
  title: z.string(),
  fromLanguage: z.string(),
  units: z.array(courseUnitSchema),
});

export type LessonSummary = z.infer<typeof lessonSummarySchema>;
export type CourseUnit = z.infer<typeof courseUnitSchema>;
export type Course = z.infer<typeof courseSchema>;
