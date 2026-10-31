import { act, renderHook, waitFor } from '@testing-library/react';
import { delay, http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { useLesson } from '@/hooks/useLesson';
import { generateCourse, generateLesson } from '@/mocks/data/generators';
import {
  lessonEmptyHandler,
  lessonErrorHandler,
  lessonNotFoundHandler,
} from '@/mocks/handlers/lessons';
import { server } from '@/mocks/server';

const lessonId = generateCourse().units[0]?.lessons[0]?.id ?? '';
const otherLessonId = generateCourse().units[0]?.lessons[1]?.id ?? '';

describe('useLesson', () => {
  it('has real lesson ids to test with', () => {
    expect(lessonId).not.toBe('');
    expect(otherLessonId).not.toBe('');
    expect(otherLessonId).not.toBe(lessonId);
  });

  it('stays idle and sends no request for a null id', async () => {
    let requested = false;
    server.use(
      http.get('*/api/lessons/:lessonId', () => {
        requested = true;
        return HttpResponse.json({});
      }),
    );
    const { result } = renderHook(() => useLesson(null));
    expect(result.current.state).toEqual({ status: 'idle' });
    await act(async () => {
      await delay(50);
    });
    expect(result.current.state).toEqual({ status: 'idle' });
    expect(requested).toBe(false);
  });

  it('is loading, then success with the lesson', async () => {
    const { result } = renderHook(() => useLesson(lessonId));
    expect(result.current.state).toEqual({ status: 'loading' });
    await waitFor(() => expect(result.current.state.status).toBe('success'));
    expect(result.current.state).toEqual({ status: 'success', data: generateLesson(lessonId) });
  });

  it('succeeds with no exercises for an empty lesson', async () => {
    server.use(lessonEmptyHandler);
    const { result } = renderHook(() => useLesson(lessonId));
    await waitFor(() => expect(result.current.state.status).toBe('success'));
    expect(result.current.state).toMatchObject({
      status: 'success',
      data: { id: lessonId, exercises: [] },
    });
  });

  it('reports a 404 as an http error with status 404', async () => {
    server.use(lessonNotFoundHandler);
    const { result } = renderHook(() => useLesson(lessonId));
    await waitFor(() => expect(result.current.state.status).toBe('error'));
    expect(result.current.state).toMatchObject({
      status: 'error',
      error: { kind: 'http', status: 404 },
    });
  });

  it('reports an unknown lesson id as a 404 with the default handler', async () => {
    const { result } = renderHook(() => useLesson('no-such-lesson'));
    await waitFor(() => expect(result.current.state.status).toBe('error'));
    expect(result.current.state).toMatchObject({
      status: 'error',
      error: { kind: 'http', status: 404 },
    });
  });

  it('reports a server failure as an http error that is not a 404', async () => {
    server.use(lessonErrorHandler);
    const { result } = renderHook(() => useLesson(lessonId));
    await waitFor(() => expect(result.current.state.status).toBe('error'));
    const state = result.current.state;
    expect(state.status === 'error' && state.error.kind).toBe('http');
    expect(state.status === 'error' && state.error.status).toBeGreaterThanOrEqual(500);
  });

  it('reports a connectivity failure as a network error', async () => {
    server.use(http.get('*/api/lessons/:lessonId', () => HttpResponse.error()));
    const { result } = renderHook(() => useLesson(lessonId));
    await waitFor(() => expect(result.current.state.status).toBe('error'));
    expect(result.current.state).toMatchObject({ status: 'error', error: { kind: 'network' } });
  });

  it('retry reloads after an error', async () => {
    server.use(lessonErrorHandler);
    const { result } = renderHook(() => useLesson(lessonId));
    await waitFor(() => expect(result.current.state.status).toBe('error'));

    server.resetHandlers();
    act(() => result.current.retry());
    expect(result.current.state).toEqual({ status: 'loading' });
    await waitFor(() => expect(result.current.state.status).toBe('success'));
  });

  it('loads the new lesson when the id changes and ignores the superseded response', async () => {
    let firstAborted = false;
    server.use(
      http.get('*/api/lessons/:lessonId', async ({ params, request }) => {
        if (params['lessonId'] === lessonId) {
          request.signal.addEventListener('abort', () => {
            firstAborted = true;
          });
          await delay(150);
        }
        return HttpResponse.json(generateLesson(String(params['lessonId'])));
      }),
    );
    const { result, rerender } = renderHook(({ id }) => useLesson(id), {
      initialProps: { id: lessonId as string | null },
    });
    await act(async () => {
      await delay(20);
    });
    rerender({ id: otherLessonId });
    expect(result.current.state).toEqual({ status: 'loading' });
    await waitFor(() => expect(result.current.state.status).toBe('success'));
    expect(result.current.state).toEqual({
      status: 'success',
      data: generateLesson(otherLessonId),
    });
    expect(firstAborted).toBe(true);
    await act(async () => {
      await delay(200);
    });
    expect(result.current.state).toEqual({
      status: 'success',
      data: generateLesson(otherLessonId),
    });
  });

  it('goes back to idle when the id becomes null', async () => {
    const { result, rerender } = renderHook(({ id }) => useLesson(id), {
      initialProps: { id: lessonId as string | null },
    });
    await waitFor(() => expect(result.current.state.status).toBe('success'));
    rerender({ id: null });
    expect(result.current.state).toEqual({ status: 'idle' });
  });

  it('aborts the request on unmount', async () => {
    let aborted = false;
    server.use(
      http.get('*/api/lessons/:lessonId', async ({ request }) => {
        request.signal.addEventListener('abort', () => {
          aborted = true;
        });
        await delay(200);
        return HttpResponse.json(generateLesson(lessonId));
      }),
    );
    const { unmount } = renderHook(() => useLesson(lessonId));
    await act(async () => {
      await delay(30);
    });
    unmount();
    await waitFor(() => expect(aborted).toBe(true));
  });
});
