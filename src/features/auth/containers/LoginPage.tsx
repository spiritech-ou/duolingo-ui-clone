import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { isApiError } from '@/api/client';
import { login } from '@/api/endpoints/auth';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { selectProfile, useProfileStore } from '@/store/useProfileStore';
import { useSessionStore } from '@/store/useSessionStore';
import { LoginForm, REQUEST_FAILED_MESSAGE } from '../forms/LoginForm';
import type { LoginFormValues } from '../forms/LoginForm.schema';
import { resolvePostLoginDestination } from '../logic/routeGuards';

export const INVALID_CREDENTIALS_MESSAGE = 'Incorrect email or password.';

/** The path the guard remembered in location state (`{ from }`), if it is a string. */
function readFrom(state: unknown): string | null {
  if (typeof state !== 'object' || state === null) return null;
  const from = (state as { from?: unknown }).from;
  return typeof from === 'string' ? from : null;
}

export function LoginPage() {
  useDocumentTitle('Log in');
  const navigate = useNavigate();
  const location = useLocation();
  const setSession = useSessionStore((store) => store.setSession);
  const ensureProfile = useProfileStore((store) => store.ensureProfile);
  const rootRef = useRef<HTMLDivElement>(null);

  // Arrival: focus the "Log in" heading (rendered by the form, made focusable here).
  useEffect(() => {
    const heading = rootRef.current?.querySelector('h1');
    if (!heading) return;
    heading.tabIndex = -1;
    heading.focus();
  }, []);

  // The form shows a rejection's message as the banner (see LoginForm's onSubmit contract).
  const handleSubmit = async (values: LoginFormValues): Promise<void> => {
    let session;
    try {
      session = await login(values);
    } catch (error) {
      if (isApiError(error) && error.kind === 'http' && error.status === 401) {
        throw new Error(INVALID_CREDENTIALS_MESSAGE);
      }
      throw new Error(REQUEST_FAILED_MESSAGE);
    }
    setSession(session);
    ensureProfile(session.user.id);
    const { onboarding } = selectProfile(session.user.id)(useProfileStore.getState());
    void navigate(resolvePostLoginDestination({ from: readFrom(location.state), onboarding }), {
      replace: true,
    });
  };

  return (
    <div ref={rootRef}>
      <LoginForm onSubmit={handleSubmit} />
    </div>
  );
}
