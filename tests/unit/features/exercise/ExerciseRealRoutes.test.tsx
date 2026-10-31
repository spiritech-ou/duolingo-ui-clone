import { act, render, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { createMemoryRouter, matchRoutes, RouterProvider } from 'react-router';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { CONNECTIVITY_MESSAGE } from '@/features/exercise/logic/loadStates';
import { generateCourse } from '@/mocks/data/generators';
import { lessonNotFoundHandler } from '@/mocks/handlers/lessons';
import { server } from '@/mocks/server';
import { router as appRouter } from '@/router';
import { useProfileStore } from '@/store/useProfileStore';
import { useSessionStore } from '@/store/useSessionStore';

// The real route table of src/router.tsx (the other exercise tests use hand-built routers). Kept in
// its own file: the lazy routes load their feature chunk on first visit, and after earlier tests of
// the same file had made requests, the first request of a lazily mounted page bypassed MSW and hit
// the network (ECONNREFUSED, shown as the offline screen). A file of its own starts clean.

const USER = { id: 'u1', email: 'a@b.co', displayName: 'Ann' };
const lesson = generateCourse().units[0]?.lessons[0];
if (!lesson) throw new Error('fixture needs a lesson');

describe('the real route table of src/router.tsx', () => {
  afterAll(() => {
    appRouter.dispose();
  });

  beforeEach(() => {
    localStorage.clear();
    document.title = '';
    useSessionStore.getState().reset();
    useProfileStore.getState().reset();
    useSessionStore.getState().setSession({ token: 't', user: USER });
    useProfileStore.getState().markHeartsIntroSeen(USER.id);
    useProfileStore
      .getState()
      .completeOnboarding(USER.id, { level: 1, startChoice: 'scratch', startUnitIndex: 0 });
  });

  const noAppHeader = () => {
    // The app header (brand link, theme toggle) belongs to the other route group.
    expect(screen.queryByRole('link', { name: /Spiritech/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /theme/ })).not.toBeInTheDocument();
  };

  it.each([
    ['/lesson/u1-l1', { lessonId: 'u1-l1' }],
    ['/lesson/a%20b', { lessonId: 'a b' }],
    ['/practice', {}],
  ])('%s matches a lazy, error-handled route in the bare group (no app header layout)', (path, params) => {
    const matches = matchRoutes(appRouter.routes, path);
    expect(matches).not.toBeNull();
    // The pathless guard, then the leaf: the header Layout is not in the chain.
    expect(matches).toHaveLength(2);
    const leaf = matches?.[1];
    expect(leaf?.params).toEqual(params);
    expect(leaf?.route.errorElement).toBeDefined();
    // Resolved lazily on first visit; a route that lost `lazy` would be bundled eagerly.
    expect(leaf?.route.lazy).toBeTypeOf('function');
    expect(leaf?.route.Component).toBeUndefined();
    expect(leaf?.route.element).toBeUndefined();
  });

  it('/learn stays in the header group, one level deeper', () => {
    expect(matchRoutes(appRouter.routes, '/learn')).toHaveLength(3);
  });

  // One mounted router for the whole walk: each step waits on its outcome before the next one
  // starts, so no request outlives its step.
  it('serves the lesson, the practice and their failure screens through the real route table', async () => {
    const router = createMemoryRouter(appRouter.routes, {
      initialEntries: [`/lesson/${lesson.id}`],
    });
    render(<RouterProvider router={router} />);
    const go = (path: string) =>
      act(async () => {
        await router.navigate(path);
      });

    // /lesson/:lessonId loads and runs.
    expect(await screen.findAllByRole('radio')).not.toHaveLength(0);
    expect(screen.getAllByRole('main')).toHaveLength(1);
    noAppHeader();
    expect(document.title).toBe('Lesson | Spiritech');

    // /practice loads and runs.
    await go('/practice');
    await waitFor(() => expect(document.title).toBe('Practice | Spiritech'));
    expect(await screen.findAllByRole('radio')).not.toHaveLength(0);
    expect(screen.getAllByRole('main')).toHaveLength(1);
    noAppHeader();

    // An unknown lesson is the not-found screen, not the route error element.
    server.use(lessonNotFoundHandler);
    await go('/lesson/nope');
    expect(await screen.findByRole('heading', { name: "We couldn't find this lesson" })).toBeInTheDocument();
    expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument();

    // Practice offline.
    server.use(http.get('*/api/practice', () => HttpResponse.error()));
    await go('/practice');
    expect(await screen.findByText(CONNECTIVITY_MESSAGE)).toBeInTheDocument();

    // A lesson opened with no hearts is the out-of-hearts screen.
    server.resetHandlers();
    for (let i = 0; i < 5; i += 1) useProfileStore.getState().loseHeart(USER.id);
    await go(`/lesson/${lesson.id}`);
    expect(await screen.findByRole('heading', { name: "You're out of hearts" })).toBeInTheDocument();
  });

  it('a signed-out visit to /practice is sent to /login by the guard', async () => {
    useSessionStore.getState().reset();
    const router = createMemoryRouter(appRouter.routes, { initialEntries: ['/practice'] });
    render(<RouterProvider router={router} />);
    await screen.findByRole('heading', { name: 'Log in' });
    expect(router.state.location.pathname).toBe('/login');
    expect(router.state.location.state).toEqual({ from: '/practice' });
  });
});
