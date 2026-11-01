import { render, screen } from '@testing-library/react';
import { RouterProvider } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { routerBasename } from '@/lib/baseUrl';
import { createAppRouter } from '@/router';
import { useCourseStore } from '@/store/useCourseStore';
import { useProfileStore } from '@/store/useProfileStore';
import { useSessionStore } from '@/store/useSessionStore';

// The app router under the GitHub Pages sub path. createBrowserRouter reads the browser location
// when it is created, so each test puts the URL in place first, then builds the router.

const PAGES_BASE = '/duolingo-ui-clone/';
const USER = { id: 'u1', email: 'a@b.co', displayName: 'Ann' };

function visit(url: string) {
  window.history.pushState({}, '', url);
}

function mount(basename: string) {
  const router = createAppRouter(basename);
  render(<RouterProvider router={router} />);
  return router;
}

describe('the app router under a base URL', () => {
  beforeEach(() => {
    localStorage.clear();
    useCourseStore.getState().reset();
    useSessionStore.getState().reset();
    useProfileStore.getState().reset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    visit('/');
  });

  function signInOnboarded() {
    useSessionStore.getState().setSession({ token: 't', user: USER });
    useProfileStore
      .getState()
      .completeOnboarding(USER.id, { level: 1, startChoice: 'scratch', startUnitIndex: 0 });
  }

  it('renders the learning path at /duolingo-ui-clone/learn', async () => {
    vi.stubEnv('BASE_URL', PAGES_BASE);
    signInOnboarded();
    visit('/duolingo-ui-clone/learn');
    const router = mount(routerBasename());

    expect(await screen.findByRole('navigation', { name: 'Learning path' })).toBeInTheDocument();
    expect(window.location.pathname).toBe('/duolingo-ui-clone/learn');
    expect(router.state.location.pathname).toBe('/duolingo-ui-clone/learn');
    router.dispose();
  });

  it('sends /duolingo-ui-clone/ to the learning path, as / does at the root', async () => {
    vi.stubEnv('BASE_URL', PAGES_BASE);
    signInOnboarded();
    visit('/duolingo-ui-clone/');
    const router = mount(routerBasename());

    expect(await screen.findByRole('navigation', { name: 'Learning path' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/duolingo-ui-clone/learn');
    expect(window.location.pathname).toBe('/duolingo-ui-clone/learn');
    router.dispose();
  });

  it('keeps the base when the guard redirects a signed-out visit to /login', async () => {
    vi.stubEnv('BASE_URL', PAGES_BASE);
    visit('/duolingo-ui-clone/learn');
    const router = mount(routerBasename());

    await screen.findByRole('heading', { name: 'Log in' });
    // `from` is what the routes saw (base-free); the URL keeps the base.
    expect(router.state.location.pathname).toBe('/duolingo-ui-clone/login');
    expect(router.state.location.state).toEqual({ from: '/learn' });
    expect(window.location.pathname).toBe('/duolingo-ui-clone/login');
    router.dispose();
  });

  it('changes nothing at the root base', async () => {
    signInOnboarded();
    visit('/');
    expect(routerBasename()).toBe('/');
    const router = mount(routerBasename());

    expect(await screen.findByRole('navigation', { name: 'Learning path' })).toBeInTheDocument();
    expect(window.location.pathname).toBe('/learn');
    router.dispose();
  });

  it('builds the exported router from the base URL in effect when the module loads', async () => {
    vi.stubEnv('BASE_URL', PAGES_BASE);
    visit('/duolingo-ui-clone/login');
    vi.resetModules();
    const { router } = await import('@/router');

    expect(router.basename).toBe('/duolingo-ui-clone');
    expect(router.state.location.pathname).toBe('/duolingo-ui-clone/login');
    router.dispose();
  });
});
