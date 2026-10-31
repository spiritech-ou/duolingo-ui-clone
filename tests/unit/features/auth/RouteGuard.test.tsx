import { render, screen, waitFor } from '@testing-library/react';
import { createMemoryRouter, Outlet, RouterProvider, useLocation } from 'react-router';
import { beforeEach, describe, expect, it } from 'vitest';
import { RouteGuard } from '@/features/auth';
import { createDefaultProfile, useProfileStore, type Profile } from '@/store/useProfileStore';
import { useSessionStore, type Session } from '@/store/useSessionStore';

const session: Session = {
  token: 'token',
  user: { id: 'ada@example.com', email: 'ada@example.com', displayName: 'Ada' },
};

const onboarded: Profile = {
  ...createDefaultProfile(),
  onboarding: { completed: true, level: 0, startChoice: 'scratch' },
};

function Stub({ name }: { name: string }) {
  const { pathname, state } = useLocation();
  return (
    <p>
      {name} at {pathname} from {(state as { from?: string } | null)?.from ?? 'nowhere'}
    </p>
  );
}

function renderGuard(entry: string) {
  const router = createMemoryRouter(
    [
      {
        element: <RouteGuard />,
        children: [
          { path: '/login', element: <Stub name="login" /> },
          { path: '/learn', element: <Stub name="learn" /> },
          { path: '/onboarding/level', element: <Stub name="level" /> },
          { path: '/onboarding/start', element: <Stub name="start" /> },
          { path: '/', element: <Outlet /> },
        ],
      },
    ],
    { initialEntries: [entry] },
  );
  render(<RouterProvider router={router} />);
  return router;
}

describe('RouteGuard', () => {
  beforeEach(() => {
    localStorage.clear();
    useSessionStore.getState().reset();
    useProfileStore.getState().reset();
  });

  describe('signed out', () => {
    it('sends a protected path to /login and remembers its path as from', () => {
      const router = renderGuard('/learn?x=1#top');
      expect(screen.getByText('login at /login from /learn')).toBeInTheDocument();
      expect(router.state.location.pathname).toBe('/login');
    });

    it('renders /login itself', () => {
      renderGuard('/login');
      expect(screen.getByText('login at /login from nowhere')).toBeInTheDocument();
    });
  });

  describe('signed in, not onboarded', () => {
    beforeEach(() => useSessionStore.getState().setSession(session));

    it('treats a user without a profile yet as not onboarded', () => {
      renderGuard('/learn');
      expect(screen.getByText(/^level at \/onboarding\/level/)).toBeInTheDocument();
    });

    it('sends /login to the onboarding level step', () => {
      renderGuard('/login');
      expect(screen.getByText(/^level at \/onboarding\/level/)).toBeInTheDocument();
    });

    it('sends the start step to the level step while no level is chosen', () => {
      useProfileStore.getState().ensureProfile(session.user.id);
      renderGuard('/onboarding/start');
      expect(screen.getByText(/^level at \/onboarding\/level/)).toBeInTheDocument();
    });

    it('renders the start step once a level is chosen', () => {
      useProfileStore.getState().saveDraftLevel(session.user.id, 1);
      renderGuard('/onboarding/start');
      expect(screen.getByText(/^start at \/onboarding\/start/)).toBeInTheDocument();
    });
  });

  describe('signed in, onboarded', () => {
    beforeEach(() => {
      useSessionStore.getState().setSession(session);
      useProfileStore.setState({ profiles: { [session.user.id]: onboarded } });
    });

    it('renders /learn', () => {
      renderGuard('/learn');
      expect(screen.getByText(/^learn at \/learn/)).toBeInTheDocument();
    });

    it('sends /login and onboarding paths to /learn', () => {
      renderGuard('/login');
      expect(screen.getByText(/^learn at \/learn/)).toBeInTheDocument();
    });

    it('sends onboarding to /learn', () => {
      renderGuard('/onboarding/level');
      expect(screen.getByText(/^learn at \/learn/)).toBeInTheDocument();
    });
  });

  describe('unreadable stored profile', () => {
    it('signs the user out, sends them to /login and acknowledges the flag', async () => {
      useSessionStore.getState().setSession(session);
      useProfileStore.setState({ profiles: {}, storageUnreadable: true });
      renderGuard('/learn');
      await waitFor(() => expect(screen.getByText(/^login at \/login/)).toBeInTheDocument());
      expect(useProfileStore.getState().storageUnreadable).toBe(false);
      expect(useSessionStore.getState().session).toBeNull();
    });
  });
});
