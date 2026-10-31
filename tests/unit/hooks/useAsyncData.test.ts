import { StrictMode } from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ApiError } from '@/api/client';
import { useAsyncData } from '@/hooks/useAsyncData';

interface Call {
  signal: AbortSignal;
  resolve: (value: string) => void;
  reject: (reason: unknown) => void;
}

function controlledLoader() {
  const calls: Call[] = [];
  const loader = (signal: AbortSignal) =>
    new Promise<string>((resolve, reject) => {
      calls.push({ signal, resolve, reject });
    });
  return { calls, loader };
}

function at(calls: Call[], index: number): Call {
  const call = calls[index];
  if (!call) throw new Error(`loader call ${index} was not made`);
  return call;
}

const httpError = new ApiError({ kind: 'http', message: 'Server error', status: 500 });

describe('useAsyncData', () => {
  it('starts loading on the first render and resolves to success', async () => {
    const { calls, loader } = controlledLoader();
    const { result } = renderHook(() => useAsyncData('a', loader));
    expect(result.current.state).toEqual({ status: 'loading' });
    expect(calls).toHaveLength(1);

    await act(async () => at(calls, 0).resolve('hello'));
    expect(result.current.state).toEqual({ status: 'success', data: 'hello' });
  });

  it('exposes an ApiError on failure', async () => {
    const { calls, loader } = controlledLoader();
    const { result } = renderHook(() => useAsyncData('a', loader));

    await act(async () => at(calls, 0).reject(httpError));
    expect(result.current.state).toEqual({ status: 'error', error: httpError });
  });

  it('wraps a non-ApiError rejection into an ApiError', async () => {
    const { calls, loader } = controlledLoader();
    const { result } = renderHook(() => useAsyncData('a', loader));

    await act(async () => at(calls, 0).reject(new Error('boom')));
    const { state } = result.current;
    expect(state.status).toBe('error');
    if (state.status === 'error') {
      expect(state.error).toBeInstanceOf(ApiError);
      expect(state.error.message).toBe('boom');
    }
  });

  it('stays idle and never calls the loader for a null key', () => {
    const { calls, loader } = controlledLoader();
    const { result } = renderHook(() => useAsyncData(null, loader));
    expect(result.current.state).toEqual({ status: 'idle' });
    expect(calls).toHaveLength(0);
  });

  it('goes from idle to loading when the key becomes non-null, and back to idle', async () => {
    const { calls, loader } = controlledLoader();
    const { result, rerender } = renderHook(({ k }) => useAsyncData(k, loader), {
      initialProps: { k: null as string | null },
    });
    rerender({ k: 'a' });
    expect(result.current.state).toEqual({ status: 'loading' });
    expect(calls).toHaveLength(1);

    rerender({ k: null });
    expect(result.current.state).toEqual({ status: 'idle' });
    expect(at(calls, 0).signal.aborted).toBe(true);
  });

  it('retry returns to loading, aborts the previous run and keeps a stable identity', async () => {
    const { calls, loader } = controlledLoader();
    const { result } = renderHook(() => useAsyncData('a', loader));
    const firstRetry = result.current.retry;

    await act(async () => at(calls, 0).reject(httpError));
    expect(result.current.state.status).toBe('error');

    act(() => result.current.retry());
    expect(result.current.state).toEqual({ status: 'loading' });
    expect(calls).toHaveLength(2);
    expect(at(calls, 0).signal.aborted).toBe(true);
    expect(at(calls, 1).signal.aborted).toBe(false);
    expect(result.current.retry).toBe(firstRetry);

    await act(async () => at(calls, 1).resolve('ok'));
    expect(result.current.state).toEqual({ status: 'success', data: 'ok' });
  });

  it('reloads on key change, aborts the old run and ignores its late result', async () => {
    const { calls, loader } = controlledLoader();
    const { result, rerender } = renderHook(({ k }) => useAsyncData(k, loader), {
      initialProps: { k: 'a' },
    });
    rerender({ k: 'b' });
    expect(result.current.state).toEqual({ status: 'loading' });
    expect(calls).toHaveLength(2);
    expect(at(calls, 0).signal.aborted).toBe(true);

    await act(async () => at(calls, 0).resolve('stale'));
    expect(result.current.state).toEqual({ status: 'loading' });

    await act(async () => at(calls, 1).resolve('fresh'));
    expect(result.current.state).toEqual({ status: 'success', data: 'fresh' });
  });

  it('ignores a late error from an aborted run', async () => {
    const { calls, loader } = controlledLoader();
    const { result, rerender } = renderHook(({ k }) => useAsyncData(k, loader), {
      initialProps: { k: 'a' },
    });
    rerender({ k: 'b' });
    await act(async () => at(calls, 0).reject(httpError));
    expect(result.current.state).toEqual({ status: 'loading' });
  });

  it('aborts on unmount and ignores the late result', async () => {
    const { calls, loader } = controlledLoader();
    const { unmount } = renderHook(() => useAsyncData('a', loader));
    unmount();
    expect(at(calls, 0).signal.aborted).toBe(true);
    await act(async () => at(calls, 0).resolve('late'));
  });

  it('does not reload on re-render with an inline loader and the same key', async () => {
    const { calls, loader } = controlledLoader();
    const { rerender } = renderHook(() => useAsyncData('a', (s) => loader(s)));
    rerender();
    rerender();
    await waitFor(() => expect(calls).toHaveLength(1));
  });

  it('turns a synchronous loader throw into an error state', async () => {
    const { result } = renderHook(() =>
      useAsyncData<string>('a', () => {
        throw httpError;
      }),
    );
    await waitFor(() =>
      expect(result.current.state).toEqual({ status: 'error', error: httpError }),
    );
  });

  it('reports "Unexpected error" for a non-Error rejection', async () => {
    const { calls, loader } = controlledLoader();
    const { result } = renderHook(() => useAsyncData('a', loader));
    await act(async () => at(calls, 0).reject('nope'));
    const { state } = result.current;
    expect(state.status).toBe('error');
    if (state.status === 'error') {
      expect(state.error).toBeInstanceOf(ApiError);
      expect(state.error.message).toBe('Unexpected error');
    }
  });

  it('shows loading, not the stale result, when returning to an earlier key (a, b, a)', async () => {
    const { calls, loader } = controlledLoader();
    const { result, rerender } = renderHook(({ k }) => useAsyncData(k, loader), {
      initialProps: { k: 'a' },
    });
    await act(async () => at(calls, 0).resolve('A'));
    expect(result.current.state).toEqual({ status: 'success', data: 'A' });

    rerender({ k: 'b' });
    expect(result.current.state).toEqual({ status: 'loading' });
    rerender({ k: 'a' });
    expect(result.current.state).toEqual({ status: 'loading' });
    expect(calls).toHaveLength(3);

    await act(async () => at(calls, 2).resolve('A2'));
    expect(result.current.state).toEqual({ status: 'success', data: 'A2' });
  });

  it('behaves under StrictMode', async () => {
    const { calls, loader } = controlledLoader();
    const { result } = renderHook(() => useAsyncData('a', loader), { wrapper: StrictMode });
    expect(result.current.state).toEqual({ status: 'loading' });
    const last = calls.length - 1;
    expect(last).toBeGreaterThanOrEqual(1);
    expect(at(calls, 0).signal.aborted).toBe(true);
    expect(at(calls, last).signal.aborted).toBe(false);

    await act(async () => at(calls, last).resolve('ok'));
    expect(result.current.state).toEqual({ status: 'success', data: 'ok' });

    act(() => result.current.retry());
    expect(result.current.state).toEqual({ status: 'loading' });
  });
});
