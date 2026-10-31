import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider, useLocation } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LoginPage, RouteGuard } from '@/features/auth';
import { LearnPage } from '@/features/learn';
import { resetArrivalMemory } from '@/features/learn/logic/arrivalMemory';
import { useCourseStore } from '@/store/useCourseStore';
import { useProfileStore } from '@/store/useProfileStore';
import { useSessionStore } from '@/store/useSessionStore';

function Stub() {
  const { pathname, state } = useLocation();
  return (
    <p>
      At {pathname} state {JSON.stringify(state)}
    </p>
  );
}

function renderApp(entry: string | { pathname: string; state: unknown }) {
  const router = createMemoryRouter(
    [
      {
        element: <RouteGuard />,
        children: [
          { path: '/login', element: <LoginPage /> },
          { path: '/learn', element: <LearnPage /> },
          { path: '/practice', element: <Stub /> },
          { path: '/onboarding/level', element: <Stub /> },
        ],
      },
    ],
    { initialEntries: [entry] },
  );
  const navigate = vi.spyOn(router, 'navigate');
  render(<RouterProvider router={router} />);
  return { router, navigate };
}

async function logIn(email: string) {
  await userEvent.type(screen.getByLabelText('Email'), email);
  await userEvent.type(screen.getByLabelText('Password'), 'password1');
  await userEvent.click(screen.getByRole('button', { name: 'LOG IN' }));
}

describe('RouteGuard with the real pages', () => {
  beforeEach(() => {
    localStorage.clear();
    resetArrivalMemory();
    useSessionStore.getState().reset();
    useProfileStore.getState().reset();
    useCourseStore.getState().reset();
  });

  it('lets an onboarded user return to the remembered from after login (history replaced)', async () => {
    useProfileStore
      .getState()
      .completeOnboarding('ann@example.com', { level: 1, startChoice: 'scratch', startUnitIndex: 0 });
    const { router } = renderApp({ pathname: '/login', state: { from: '/practice' } });
    await logIn('ann@example.com');

    expect(await screen.findByText(/^At \/practice/)).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/practice');
    expect(router.state.historyAction).toBe('REPLACE');
  });

  it('sends a not-onboarded user to /onboarding/level after login', async () => {
    const { router } = renderApp({ pathname: '/login', state: { from: '/practice' } });
    await logIn('ann@example.com');

    expect(await screen.findByText(/^At \/onboarding\/level/)).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/onboarding/level');
    expect(router.state.historyAction).toBe('REPLACE');
  });

  it('redirects signed-out requests with replace and a path-only from', async () => {
    const { router } = renderApp('/learn?x=1#top');
    await screen.findByRole('heading', { name: 'Log in' });
    expect(router.state.location.pathname).toBe('/login');
    expect(router.state.location.state).toEqual({ from: '/learn' });
    expect(router.state.historyAction).toBe('REPLACE');
  });

  // The guard redirects the cleared session first (from = '/learn'); LearnPage's own navigation to
  // /login is the same destination. The leftover `from` is benign: it is /learn, the default landing,
  // and resolvePostLoginDestination lets onboarding win for a user who has not completed it.
  it('log out from /learn ends on /login, replacing history, with at most from = /learn', async () => {
    useSessionStore.getState().setSession({
      token: 't',
      user: { id: 'u1', email: 'a@b.co', displayName: 'Ann' },
    });
    useProfileStore
      .getState()
      .completeOnboarding('u1', { level: 1, startChoice: 'scratch', startUnitIndex: 0 });
    const { router } = renderApp('/learn');
    await userEvent.click(await screen.findByRole('button', { name: 'Log out' }));

    await screen.findByRole('heading', { name: 'Log in' });
    expect(router.state.location.pathname).toBe('/login');
    expect([null, { from: '/learn' }]).toContainEqual(router.state.location.state ?? null);
    expect(router.state.historyAction).toBe('REPLACE');
    expect(useSessionStore.getState().session).toBeNull();
  });
});
