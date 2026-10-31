import type { ApiError } from '@/api/client';
import type { SessionMode } from './sessionTypes';

/** The screens a lesson or practice route shows before the exercises can start. */
export type LoadScreenKind = 'loading' | 'error' | 'notFound' | 'empty';

export interface LoadScreenCopy {
  title: string;
  message?: string;
}

export const CONNECTIVITY_MESSAGE =
  'You seem to be offline, or the connection is slow. Check it and try again.';
export const OTHER_FAILURE_MESSAGE = 'Something went wrong on our side. Try again in a moment.';

const subject = (mode: SessionMode): string => (mode === 'lesson' ? 'lesson' : 'practice');

export function getLoadingTitle(mode: SessionMode): string {
  return `Getting your ${subject(mode)} ready…`;
}

/**
 * Which failure screen an error gets. Only a lesson can be "not found" (HTTP 404); a practice set
 * has no id, so its 404 is a generic failure.
 */
export function getFailureKind(error: ApiError, mode: SessionMode): 'error' | 'notFound' {
  return mode === 'lesson' && error.kind === 'http' && error.status === 404 ? 'notFound' : 'error';
}

/** Connectivity failures (offline, network error, timeout) vs everything else. */
export function getFailureMessage(error: ApiError): string {
  return error.kind === 'network' ? CONNECTIVITY_MESSAGE : OTHER_FAILURE_MESSAGE;
}

export function getLoadScreenCopy(
  kind: LoadScreenKind,
  mode: SessionMode,
  error?: ApiError,
): LoadScreenCopy {
  switch (kind) {
    case 'loading':
      return { title: getLoadingTitle(mode) };
    case 'notFound':
      return { title: "We couldn't find this lesson" };
    case 'empty':
      return { title: `This ${subject(mode)} has no exercises yet` };
    case 'error':
      return {
        title: `We couldn't load this ${subject(mode)}`,
        ...(error ? { message: getFailureMessage(error) } : {}),
      };
    default: {
      const unreachable: never = kind;
      return unreachable;
    }
  }
}
