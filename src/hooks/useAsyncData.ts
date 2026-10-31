import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError, isApiError } from '@/api/client';

export type LoadState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: ApiError };

export type AsyncLoader<T> = (signal: AbortSignal) => Promise<T>;

export interface UseAsyncDataResult<T> {
  state: LoadState<T>;
  retry: () => void;
}

interface Settled<T> {
  runId: number;
  state: Extract<LoadState<T>, { status: 'success' | 'error' }>;
}

interface Run {
  key: string | null;
  id: number;
}

function toApiError(error: unknown): ApiError {
  if (isApiError(error)) return error;
  return new ApiError({
    kind: 'network',
    message: error instanceof Error ? error.message : 'Unexpected error',
  });
}

/**
 * Runs `loader` and returns its `LoadState`. `key` identifies the parameters: a
 * new key starts a new load, and a `null` key stays `idle`. The loader gets an
 * `AbortSignal` that is aborted on unmount, on key change and on retry; results
 * of an aborted run are ignored. Loading starts on the first render, without delay.
 * `retry` is stable. The latest `loader` is used, so it needs no memoization.
 */
export function useAsyncData<T>(
  key: string | null,
  loader: AsyncLoader<T>,
): UseAsyncDataResult<T> {
  const [run, setRun] = useState<Run>({ key, id: 0 });
  const [settled, setSettled] = useState<Settled<T> | null>(null);
  const loaderRef = useRef(loader);

  let current = run;
  if (run.key !== key) {
    // New parameters start a new run; adjusting during render avoids a stale frame.
    current = { key, id: run.id + 1 };
    setRun(current);
  }
  const runKey = current.key;
  const runId = current.id;

  useEffect(() => {
    loaderRef.current = loader;
  });

  useEffect(() => {
    if (runKey === null) return;
    const controller = new AbortController();
    let pending: Promise<T>;
    try {
      pending = loaderRef.current(controller.signal);
    } catch (error) {
      pending = Promise.reject(error);
    }
    pending
      .then(
        (data): Settled<T>['state'] => ({ status: 'success', data }),
        (error: unknown): Settled<T>['state'] => ({
          status: 'error',
          error: toApiError(error),
        }),
      )
      .then((state) => {
        if (controller.signal.aborted) return;
        setSettled({ runId, state });
      });
    return () => controller.abort();
  }, [runKey, runId]);

  const retry = useCallback(() => {
    setRun((previous) => ({ key: previous.key, id: previous.id + 1 }));
  }, []);

  let state: LoadState<T>;
  if (key === null) state = { status: 'idle' };
  else if (settled && settled.runId === runId) state = settled.state;
  else state = { status: 'loading' };

  return { state, retry };
}
