import { useEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router';
import {
  selectProfile,
  selectStorageUnreadable,
  useProfileStore,
} from '@/store/useProfileStore';
import { useSessionStore } from '@/store/useSessionStore';
import { LOGIN_PATH, resolveGuard, resolvePostLoginDestination } from '../logic/routeGuards';

/** The path remembered in location state (`{ from }`), if it is a string. */
function readFrom(state: unknown): string | null {
  if (typeof state !== 'object' || state === null) return null;
  const from = (state as { from?: unknown }).from;
  return typeof from === 'string' ? from : null;
}

/**
 * Parent layout of every route: applies the pure guard rules to the session and the signed-in
 * user's profile, redirects when one matches, otherwise renders the matched child route.
 *
 * A stored profile that failed zod parsing (`storageUnreadable`) signs the user out: the session is
 * cleared, the flag acknowledged, and the rules then send the user to /login.
 */
export function RouteGuard() {
  const { pathname, state } = useLocation();
  const session = useSessionStore((store) => store.session);
  const clearSession = useSessionStore((store) => store.clearSession);
  const userId = session?.user.id ?? null;
  // A user without a profile yet reads the default (not onboarded).
  const profile = useProfileStore(selectProfile(userId ?? ''));
  const storageUnreadable = useProfileStore(selectStorageUnreadable);
  const acknowledge = useProfileStore((store) => store.acknowledgeUnreadableStorage);

  useEffect(() => {
    if (!storageUnreadable) return;
    clearSession();
    acknowledge();
  }, [storageUnreadable, clearSession, acknowledge]);

  const onboarding = { completed: profile.onboarding.completed, level: profile.onboarding.level };
  const result = resolveGuard({
    hasSession: userId !== null && !storageUnreadable,
    onboarding,
    pathname,
  });

  if (result.kind === 'redirect') {
    // Signed in on /login (a login just stored the session): go where the login would go, i.e.
    // the remembered `from` when allowed. This keeps this redirect from overriding the login
    // container's own navigation, whichever of the two runs first.
    if (userId !== null && !storageUnreadable && pathname === LOGIN_PATH) {
      const to = resolvePostLoginDestination({ from: readFrom(state), onboarding });
      return <Navigate to={to} replace />;
    }
    // `from` is the path only (no query or hash), as resolvePostLoginDestination expects.
    const from = result.from;
    return <Navigate to={result.to} state={from === undefined ? undefined : { from }} replace />;
  }
  return <Outlet />;
}
