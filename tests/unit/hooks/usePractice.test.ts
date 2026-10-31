import { act, renderHook, waitFor } from '@testing-library/react';
import { delay, http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { usePractice } from '@/hooks/usePractice';
import { practiceEmptyHandler, practiceErrorHandler } from '@/mocks/handlers/practice';
import { server } from '@/mocks/server';

function exerciseIds(result: { current: ReturnType<typeof usePractice> }): string[] {
  const state = result.current.state;
  return state.status === 'success' ? state.data.exercises.map((e) => e.id) : [];
}

describe('usePractice', () => {
  it('is loading, then success with a practice set', async () => {
    const { result } = renderHook(() => usePractice());
    expect(result.current.state).toEqual({ status: 'loading' });
    await waitFor(() => expect(result.current.state.status).toBe('success'));
    expect(result.current.state).toMatchObject({ status: 'success', data: { title: 'Practice' } });
    expect(exerciseIds(result)).toHaveLength(5);
  });

  it('succeeds with no exercises for an empty practice set', async () => {
    server.use(practiceEmptyHandler);
    const { result } = renderHook(() => usePractice());
    await waitFor(() => expect(result.current.state.status).toBe('success'));
    expect(result.current.state).toMatchObject({ status: 'success', data: { exercises: [] } });
  });

  it('reports a server failure as an http error', async () => {
    server.use(practiceErrorHandler);
    const { result } = renderHook(() => usePractice());
    await waitFor(() => expect(result.current.state.status).toBe('error'));
    const state = result.current.state;
    expect(state.status === 'error' && state.error.kind).toBe('http');
    expect(state.status === 'error' && state.error.status).toBeGreaterThanOrEqual(500);
  });

  it('reports a connectivity failure as a network error', async () => {
    server.use(http.get('*/api/practice', () => HttpResponse.error()));
    const { result } = renderHook(() => usePractice());
    await waitFor(() => expect(result.current.state.status).toBe('error'));
    expect(result.current.state).toMatchObject({ status: 'error', error: { kind: 'network' } });
  });

  it('retry reloads after an error', async () => {
    server.use(practiceErrorHandler);
    const { result } = renderHook(() => usePractice());
    await waitFor(() => expect(result.current.state.status).toBe('error'));

    server.resetHandlers();
    act(() => result.current.retry());
    expect(result.current.state).toEqual({ status: 'loading' });
    await waitFor(() => expect(result.current.state.status).toBe('success'));
  });

  it('refetches on every mount and does not reuse the previous set', async () => {
    let requests = 0;
    server.use(
      http.get('*/api/practice', async () => {
        requests += 1;
        await delay(10);
        return HttpResponse.json({
          id: 'practice',
          title: 'Practice',
          exercises: [],
        });
      }),
    );
    const first = renderHook(() => usePractice());
    await waitFor(() => expect(first.result.current.state.status).toBe('success'));
    first.unmount();

    const second = renderHook(() => usePractice());
    expect(second.result.current.state).toEqual({ status: 'loading' });
    await waitFor(() => expect(second.result.current.state.status).toBe('success'));
    expect(requests).toBe(2);
  });

  it('retry after success requests a new set', async () => {
    let requests = 0;
    server.use(
      http.get('*/api/practice', async () => {
        requests += 1;
        await delay(10);
        return HttpResponse.json({ id: 'practice', title: `Practice ${requests}`, exercises: [] });
      }),
    );
    const { result } = renderHook(() => usePractice());
    await waitFor(() => expect(result.current.state.status).toBe('success'));

    act(() => result.current.retry());
    await waitFor(() =>
      expect(result.current.state).toMatchObject({ data: { title: 'Practice 2' } }),
    );
    expect(requests).toBe(2);
  });

  it('aborts the request on unmount', async () => {
    let aborted = false;
    server.use(
      http.get('*/api/practice', async ({ request }) => {
        request.signal.addEventListener('abort', () => {
          aborted = true;
        });
        await delay(200);
        return HttpResponse.json({ id: 'practice', title: 'Practice', exercises: [] });
      }),
    );
    const { unmount } = renderHook(() => usePractice());
    await act(async () => {
      await delay(30);
    });
    unmount();
    await waitFor(() => expect(aborted).toBe(true));
  });
});
