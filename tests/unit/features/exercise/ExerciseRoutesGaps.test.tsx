import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { createMemoryRouter, RouterProvider, useLocation } from 'react-router';
import { beforeEach, describe, expect, it } from 'vitest';
import { LessonPage, PracticePage } from '@/features/exercise';
import { CONNECTIVITY_MESSAGE } from '@/features/exercise/logic/loadStates';
import { generateCourse, generateLesson, generatePractice } from '@/mocks/data/generators';
import { server } from '@/mocks/server';
import { selectProfile, useProfileStore } from '@/store/useProfileStore';
import { useSessionStore } from '@/store/useSessionStore';

const USER = { id: 'u1', email: 'a@b.co', displayName: 'Ann' };
const lesson = generateCourse().units[0]?.lessons[0];
if (!lesson) throw new Error('fixture needs a lesson');

function Where() {
  return <p>At {useLocation().pathname}</p>;
}

function renderAt(path: string) {
  const router = createMemoryRouter(
    [
      { path: '/lesson/:lessonId', element: <LessonPage /> },
      { path: '/practice', element: <PracticePage /> },
      { path: '/learn', element: <Where /> },
    ],
    { initialEntries: ['/learn', path], initialIndex: 1 },
  );
  render(<RouterProvider router={router} />);
  return { router, user: userEvent.setup() };
}

function resetStores() {
  localStorage.clear();
  document.title = '';
  useSessionStore.getState().reset();
  useProfileStore.getState().reset();
  useSessionStore.getState().setSession({ token: 't', user: USER });
  useProfileStore.getState().markHeartsIntroSeen(USER.id);
}

const hearts = () => selectProfile(USER.id)(useProfileStore.getState()).hearts;

describe('lesson route: hearts decided once on arrival', () => {
  beforeEach(resetStores);

  it('hearts dropping to 0 mid-lesson keep the run on screen until CONTINUE, without a refetch', async () => {
    for (let i = 0; i < 4; i += 1) useProfileStore.getState().loseHeart(USER.id);
    expect(hearts()).toBe(1);
    let requests = 0;
    server.use(
      http.get('*/api/lessons/:lessonId', () => {
        requests += 1;
        return HttpResponse.json(generateLesson(lesson.id));
      }),
    );
    const { user } = renderAt(`/lesson/${lesson.id}`);
    await screen.findAllByRole('radio');

    await user.click(screen.getByRole('button', { name: 'Skip' }));
    expect(hearts()).toBe(0);
    // The feedback panel is still there: the route did not swap in the out-of-hearts screen.
    expect(screen.getByRole('button', { name: 'Continue' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: "You're out of hearts" })).not.toBeInTheDocument();
    expect(screen.getAllByRole('radio')).not.toHaveLength(0);

    await user.click(screen.getByRole('button', { name: 'Continue' }));
    expect(await screen.findByRole('heading', { name: "You're out of hearts" })).toBeInTheDocument();
    expect(requests).toBe(1);
  });

  it('arriving with 0 hearts stays on the out-of-hearts screen even after a heart is gained', async () => {
    for (let i = 0; i < 5; i += 1) useProfileStore.getState().loseHeart(USER.id);
    renderAt(`/lesson/${lesson.id}`);
    expect(screen.getByRole('heading', { name: "You're out of hearts" })).toBeInTheDocument();

    useProfileStore.getState().gainHeart(USER.id);
    await waitFor(() => expect(hearts()).toBe(1));
    // Decided once: the arrival decision is not revisited, and no request starts.
    expect(screen.getByRole('heading', { name: "You're out of hearts" })).toBeInTheDocument();
    expect(screen.queryByRole('radio')).not.toBeInTheDocument();
  });
});

describe('lesson route: URL-encoded lesson id', () => {
  beforeEach(resetStores);

  it.each([
    ['a%20b%2Fc', '/api/lessons/a%20b%2Fc'],
    ['100%25', '/api/lessons/100%25'],
  ])('%s reaches getLesson decoded and goes out encoded once', async (encoded, expectedPath) => {
    const paths: string[] = [];
    server.use(
      http.get('*/api/lessons/:lessonId', ({ request }) => {
        paths.push(new URL(request.url).pathname);
        return HttpResponse.json(generateLesson(lesson.id));
      }),
    );
    renderAt(`/lesson/${encoded}`);
    await screen.findAllByRole('radio');
    // A double-encoded id would arrive as %2520 / %252F.
    expect(paths).toEqual([expectedPath]);
  });
});

describe('practice route', () => {
  beforeEach(resetStores);

  it('is refetched on every mount, never cached', async () => {
    let requests = 0;
    server.use(
      http.get('*/api/practice', () => {
        requests += 1;
        return HttpResponse.json(generatePractice(5));
      }),
    );
    const { router } = renderAt('/practice');
    await screen.findAllByRole('radio');
    expect(requests).toBe(1);

    await router.navigate('/learn');
    expect(await screen.findByText('At /learn')).toBeInTheDocument();
    await router.navigate('/practice');
    await screen.findAllByRole('radio');
    expect(requests).toBe(2);
  });

  // Keep this the last test of the file, and do not follow the failure with another request: in
  // audited runs the request that came right after a mocked `HttpResponse.error()` sometimes
  // bypassed MSW and hit the real network (ECONNREFUSED), which showed as another offline screen.
  it('shows the offline message when the network fails', async () => {
    server.use(http.get('*/api/practice', () => HttpResponse.error()));
    renderAt('/practice');
    expect(await screen.findByRole('heading', { name: "We couldn't load this practice" })).toBeInTheDocument();
    expect(screen.getByText(CONNECTIVITY_MESSAGE)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });
});
