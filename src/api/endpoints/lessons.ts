import { request } from '@/api/client';
import { lessonSchema, type Lesson } from '@/api/schemas/lesson';

/** `GET /api/lessons/:lessonId`. The id is URL-encoded. */
export function getLesson(lessonId: string, signal?: AbortSignal): Promise<Lesson> {
  return request(`/lessons/${encodeURIComponent(lessonId)}`, {
    schema: lessonSchema,
    ...(signal ? { signal } : {}),
  });
}
