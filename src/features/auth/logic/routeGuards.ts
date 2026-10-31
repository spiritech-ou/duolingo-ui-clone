/** Pure route guard rules of docs/product/app-shell-and-routing.md ("Entry points and routes"). */

export const LOGIN_PATH = '/login';
export const LEARN_PATH = '/learn';
export const ONBOARDING_LEVEL_PATH = '/onboarding/level';
export const ONBOARDING_START_PATH = '/onboarding/start';

export interface GuardOnboarding {
  completed: boolean;
  /** The chosen level, or null when none has been chosen yet. */
  level: number | null;
}

export interface GuardInput {
  hasSession: boolean;
  onboarding: GuardOnboarding;
  pathname: string;
}

export type GuardResult =
  | { kind: 'none' }
  | { kind: 'redirect'; to: string; from?: string };

const NONE: GuardResult = { kind: 'none' };

function isOnboardingPath(pathname: string): boolean {
  return pathname === '/onboarding' || pathname.startsWith('/onboarding/');
}

/** Returns the redirect for the first matching rule (1 to 5), or `{ kind: 'none' }`. */
export function resolveGuard({ hasSession, onboarding, pathname }: GuardInput): GuardResult {
  if (!hasSession) {
    // Rule 1: remember the requested path as `from`.
    return pathname === LOGIN_PATH ? NONE : { kind: 'redirect', to: LOGIN_PATH, from: pathname };
  }
  // Rule 2.
  if (pathname === LOGIN_PATH) return { kind: 'redirect', to: LEARN_PATH };
  const underOnboarding = isOnboardingPath(pathname);
  // Rule 3.
  if (!onboarding.completed && !underOnboarding) {
    return { kind: 'redirect', to: ONBOARDING_LEVEL_PATH };
  }
  // Rule 4.
  if (onboarding.completed && underOnboarding) return { kind: 'redirect', to: LEARN_PATH };
  // Rule 5.
  if (pathname === ONBOARDING_START_PATH && onboarding.level === null) {
    return { kind: 'redirect', to: ONBOARDING_LEVEL_PATH };
  }
  return NONE;
}

/** An app route a login may return to: `/learn`, `/practice` or `/lesson/:lessonId`. */
function isReturnableAppRoute(path: string): boolean {
  if (path === LEARN_PATH || path === '/practice') return true;
  const match = /^\/lesson\/([^/]+)$/.exec(path);
  return match !== null;
}

export interface PostLoginInput {
  /** The path remembered by rule 1, if any. */
  from: string | null | undefined;
  onboarding: GuardOnboarding;
}

/**
 * Where a successful login lands: `from` when it is an app route the guards allow,
 * otherwise the guard's destination (`/learn`, or onboarding when not completed).
 */
export function resolvePostLoginDestination({ from, onboarding }: PostLoginInput): string {
  const guardedHome = resolveGuard({ hasSession: true, onboarding, pathname: LEARN_PATH });
  const fallback = guardedHome.kind === 'redirect' ? guardedHome.to : LEARN_PATH;
  if (from === null || from === undefined || !isReturnableAppRoute(from)) return fallback;
  const guarded = resolveGuard({ hasSession: true, onboarding, pathname: from });
  return guarded.kind === 'none' ? from : fallback;
}
