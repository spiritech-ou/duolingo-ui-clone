import { getLesson } from '@/api/endpoints/lessons';
import type { Lesson } from '@/api/schemas/lesson';
import { useAsyncData, type LoadState } from '@/hooks/useAsyncData';

export interface UseLessonResult {
  state: LoadState<Lesson>;
  retry: () => void;
}

/**
 * Loads one lesson. A `null` id stays `idle` (no request), for containers that must not fetch,
 * for example with no hearts left. A new id starts a new load; the request is aborted on unmount,
 * id change and retry, and aborted results are ignored.
 *
 * Errors keep the `ApiError` shape: `kind: 'http'` with `status: 404` is an unknown lesson,
 * `kind: 'network'` is a connectivity failure (offline, timeout), anything else is a generic failure.
 * Empty detection (`data.exercises.length === 0`) is left to the caller.
 */
export function useLesson(lessonId: string | null): UseLessonResult {
  return useAsyncData(lessonId, (signal) => {
    if (lessonId === null) return Promise.reject(new Error('No lesson id'));
    return getLesson(lessonId, signal);
  });
}
