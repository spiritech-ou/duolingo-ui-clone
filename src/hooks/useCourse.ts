import { useEffect } from 'react';
import { getCourse } from '@/api/endpoints/course';
import type { Course } from '@/api/schemas/course';
import { useAsyncData, type LoadState } from '@/hooks/useAsyncData';
import { useCourseStore } from '@/store/useCourseStore';

export interface UseCourseResult {
  state: LoadState<Course>;
  retry: () => void;
}

/**
 * Loads the course. With no cached course the state follows the request (loading, success,
 * error). With a cached course it is `success` straight away while a silent refresh runs: the
 * data updates in place when the refresh succeeds and stays as cached, without error, when it
 * fails. Empty detection is left to the caller.
 */
export function useCourse(): UseCourseResult {
  const cached = useCourseStore((store) => store.course);
  const setCourse = useCourseStore((store) => store.setCourse);
  const { state: loaded, retry } = useAsyncData('course', getCourse);

  useEffect(() => {
    if (loaded.status === 'success') setCourse(loaded.data);
  }, [loaded, setCourse]);

  let state: LoadState<Course> = loaded;
  if (loaded.status !== 'success' && cached) state = { status: 'success', data: cached };
  return { state, retry };
}
