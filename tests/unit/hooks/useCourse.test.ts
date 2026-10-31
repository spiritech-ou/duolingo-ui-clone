import { act, renderHook, waitFor } from '@testing-library/react';
import { delay, http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';
import type { Course } from '@/api/schemas/course';
import { useCourse } from '@/hooks/useCourse';
import { generateCourse } from '@/mocks/data/generators';
import { courseErrorHandler } from '@/mocks/handlers/course';
import { server } from '@/mocks/server';
import { useCourseStore } from '@/store/useCourseStore';

const cachedCourse: Course = { ...generateCourse(), title: 'Cached course' };
const freshCourse: Course = { ...generateCourse(), title: 'Fresh course' };

function respondWith(course: Course, ms = 10) {
  return http.get('*/api/course', async () => {
    await delay(ms);
    return HttpResponse.json(course);
  });
}

describe('useCourse', () => {
  beforeEach(() => {
    localStorage.clear();
    useCourseStore.getState().reset();
  });

  it('is loading on first visit, then success and cached', async () => {
    server.use(respondWith(freshCourse));
    const { result } = renderHook(() => useCourse());
    expect(result.current.state).toEqual({ status: 'loading' });

    await waitFor(() => expect(result.current.state.status).toBe('success'));
    expect(result.current.state).toEqual({ status: 'success', data: freshCourse });
    expect(useCourseStore.getState().course).toEqual(freshCourse);
  });

  it('reports an error on first visit when the request fails', async () => {
    server.use(courseErrorHandler);
    const { result } = renderHook(() => useCourse());
    await waitFor(() => expect(result.current.state.status).toBe('error'));
    expect(useCourseStore.getState().course).toBeNull();
  });

  it('returns the cached course as success at once and updates in place on refresh', async () => {
    useCourseStore.getState().setCourse(cachedCourse);
    server.use(respondWith(freshCourse, 50));
    const { result } = renderHook(() => useCourse());
    expect(result.current.state).toEqual({ status: 'success', data: cachedCourse });

    await waitFor(() =>
      expect(result.current.state).toEqual({ status: 'success', data: freshCourse }),
    );
    expect(useCourseStore.getState().course).toEqual(freshCourse);
  });

  it('keeps the cached course with no error when the refresh fails', async () => {
    useCourseStore.getState().setCourse(cachedCourse);
    let requested = false;
    server.use(
      http.get('*/api/course', async () => {
        requested = true;
        await delay(10);
        return HttpResponse.json({ message: 'boom' }, { status: 500 });
      }),
    );
    const { result } = renderHook(() => useCourse());
    await waitFor(() => expect(requested).toBe(true));
    await act(async () => {
      await delay(100);
    });
    expect(result.current.state).toEqual({ status: 'success', data: cachedCourse });
    expect(useCourseStore.getState().course).toEqual(cachedCourse);
  });

  it('retry reloads after a first-visit error', async () => {
    server.use(courseErrorHandler);
    const { result } = renderHook(() => useCourse());
    await waitFor(() => expect(result.current.state.status).toBe('error'));

    server.use(respondWith(freshCourse));
    act(() => result.current.retry());
    expect(result.current.state).toEqual({ status: 'loading' });
    await waitFor(() =>
      expect(result.current.state).toEqual({ status: 'success', data: freshCourse }),
    );
  });

  it('aborts the request on unmount and does not cache its result', async () => {
    let aborted = false;
    server.use(
      http.get('*/api/course', async ({ request }) => {
        request.signal.addEventListener('abort', () => {
          aborted = true;
        });
        await delay(200);
        return HttpResponse.json(freshCourse);
      }),
    );
    const { unmount } = renderHook(() => useCourse());
    await act(async () => {
      await delay(30);
    });
    unmount();
    await waitFor(() => expect(aborted).toBe(true));
    await act(async () => {
      await delay(250);
    });
    expect(useCourseStore.getState().course).toBeNull();
  });
});
