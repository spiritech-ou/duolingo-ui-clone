import { z } from 'zod';

export const pictureSchema = z.object({
  emoji: z.string(),
  alt: z.string(),
});

export const exerciseOptionSchema = z.object({
  id: z.string(),
  estonian: z.string().min(1),
  picture: pictureSchema,
});

/**
 * One picture-choice exercise. Rules: non-empty `english` and `estonian`,
 * exactly three options with distinct ids, `correctOptionId` among the options.
 */
export const exerciseSchema = z
  .object({
    id: z.string(),
    type: z.literal('picture-choice'),
    english: z.string().min(1),
    isNewWord: z.boolean(),
    options: z.tuple([exerciseOptionSchema, exerciseOptionSchema, exerciseOptionSchema]),
    correctOptionId: z.string(),
  })
  .superRefine((exercise, ctx) => {
    const ids = exercise.options.map((option) => option.id);
    if (new Set(ids).size !== ids.length) {
      ctx.addIssue({
        code: 'custom',
        path: ['options'],
        message: 'Option ids must be distinct',
      });
    }
    if (!ids.includes(exercise.correctOptionId)) {
      ctx.addIssue({
        code: 'custom',
        path: ['correctOptionId'],
        message: 'correctOptionId must be one of the option ids',
      });
    }
  });

/** Body of `GET /api/lessons/:lessonId`. An empty `exercises` list is valid (empty-lesson state). */
export const lessonSchema = z.object({
  id: z.string(),
  title: z.string(),
  exercises: z.array(exerciseSchema),
});

/** Id of the practice set returned by `GET /api/practice`. */
export const PRACTICE_ID = 'practice';

/** Body of `GET /api/practice`: the lesson shape with `id: "practice"`. */
export const practiceSchema = lessonSchema.extend({
  id: z.literal(PRACTICE_ID),
});

export type Picture = z.infer<typeof pictureSchema>;
export type ExerciseOption = z.infer<typeof exerciseOptionSchema>;
export type Exercise = z.infer<typeof exerciseSchema>;
export type Lesson = z.infer<typeof lessonSchema>;
export type Practice = z.infer<typeof practiceSchema>;
