import { request } from '@/api/client';
import { courseSchema, type Course } from '@/api/schemas/course';

/** `GET /api/course`. */
export function getCourse(signal?: AbortSignal): Promise<Course> {
  return request('/course', { schema: courseSchema, ...(signal ? { signal } : {}) });
}
