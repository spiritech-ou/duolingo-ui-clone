import { getPractice } from '@/api/endpoints/practice';
import type { Practice } from '@/api/schemas/lesson';
import { useAsyncData, type LoadState } from '@/hooks/useAsyncData';

export interface UsePracticeResult {
  state: LoadState<Practice>;
  retry: () => void;
}

/**
 * Loads a fresh random practice set on every mount (never cached; `retry` draws a new set).
 * The request is aborted on unmount and aborted results are ignored. Errors keep the `ApiError`
 * shape: `kind: 'network'` is a connectivity failure (offline, timeout), anything else is a generic
 * failure. Empty detection (`data.exercises.length === 0`) is left to the caller.
 */
export function usePractice(): UsePracticeResult {
  return useAsyncData('practice', (signal) => getPractice(undefined, signal));
}
