import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { delay, http, HttpResponse } from 'msw';
import { createMemoryRouter, RouterProvider, useLocation } from 'react-router';
import { beforeEach, describe, expect, it } from 'vitest';
import { LessonPage, PracticePage } from '@/features/exercise';
import { CONNECTIVITY_MESSAGE, OTHER_FAILURE_MESSAGE } from '@/features/exercise/logic/loadStates';
import { generateCourse } from '@/mocks/data/generators';
import { lessonEmptyHandler, lessonErrorHandler, lessonNotFoundHandler } from '@/mocks/handlers/lessons';
import { practiceEmptyHandler, practiceErrorHandler } from '@/mocks/handlers/practice';
import { server } from '@/mocks/server';
import { useProfileStore } from '@/store/useProfileStore';
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

const lessonPath = `/lesson/${lesson.id}`;

describe('lesson route', () => {
  beforeEach(() => {
    localStorage.clear();
    document.title = '';
    useSessionStore.getState().reset();
    useProfileStore.getState().reset();
    useSessionStore.getState().setSession({ token: 't', user: USER });
    useProfileStore.getState().markHeartsIntroSeen(USER.id);
  });

  it('shows the loading screen and the document title', () => {
    server.use(
      http.get('*/api/lessons/:lessonId', async () => {
        await delay(30);
        return HttpResponse.json({ id: lesson.id, title: 'T', exercises: [] });
      }),
    );
    renderAt(lessonPath);
    expect(screen.getByRole('heading', { name: 'Getting your lesson ready…' })).toBeInTheDocument();
    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(document.title).toBe('Lesson | Spiritech');
  });

  it('opens the lesson once it loads', async () => {
    renderAt(lessonPath);
    expect(await screen.findAllByRole('radio')).not.toHaveLength(0);
    expect(screen.getAllByRole('main')).toHaveLength(1);
  });

  it('the close button leaves a loading lesson at once, replacing history', async () => {
    let answered = false;
    server.use(
      http.get('*/api/lessons/:lessonId', async () => {
        await delay(100);
        answered = true;
        return HttpResponse.json({ id: lesson.id, title: 'T', exercises: [] });
      }),
    );
    const { router, user } = renderAt(lessonPath);
    await user.click(screen.getByRole('button', { name: 'Close' }));
    expect(screen.getByText('At /learn')).toBeInTheDocument();
    expect(router.state.historyAction).toBe('REPLACE');
    // Let the abandoned request settle so it cannot leak into the next test.
    await waitFor(() => expect(answered).toBe(true));
  });

  it('an unknown lesson is not found, with focus on Back to path', async () => {
    server.use(lessonNotFoundHandler);
    const { user } = renderAt('/lesson/nope');
    expect(await screen.findByRole('heading', { name: "We couldn't find this lesson" })).toBeInTheDocument();
    const back = screen.getByRole('button', { name: 'Back to path' });
    expect(back).toHaveFocus();
    expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument();
    await user.click(back);
    expect(screen.getByText('At /learn')).toBeInTheDocument();
  });

  it('an empty lesson says so and focuses the heading', async () => {
    server.use(lessonEmptyHandler);
    renderAt(lessonPath);
    const title = await screen.findByRole('heading', { name: 'This lesson has no exercises yet' });
    expect(title).toHaveFocus();
    expect(screen.getByRole('button', { name: 'Back to path' })).toBeInTheDocument();
  });

  it('a server failure offers Try again (focused) and Back to path, and retry recovers', async () => {
    server.use(lessonErrorHandler);
    const { user } = renderAt(lessonPath);
    expect(await screen.findByRole('heading', { name: "We couldn't load this lesson" })).toBeInTheDocument();
    expect(screen.getByText(OTHER_FAILURE_MESSAGE)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Try again' })).toHaveFocus();
    expect(screen.getByRole('button', { name: 'Back to path' })).toBeInTheDocument();

    server.resetHandlers();
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findAllByRole('radio')).not.toHaveLength(0);
  });

  it('a connectivity failure gets the offline message', async () => {
    server.use(http.get('*/api/lessons/:lessonId', () => HttpResponse.error()));
    renderAt(lessonPath);
    expect(await screen.findByText(CONNECTIVITY_MESSAGE)).toBeInTheDocument();
  });

  it('Back to path after a failure goes to /learn, replacing history', async () => {
    server.use(lessonErrorHandler);
    const { router, user } = renderAt(lessonPath);
    await user.click(await screen.findByRole('button', { name: 'Back to path' }));
    expect(screen.getByText('At /learn')).toBeInTheDocument();
    expect(router.state.historyAction).toBe('REPLACE');
  });

  describe('with no hearts on arrival', () => {
    beforeEach(() => {
      for (let i = 0; i < 5; i += 1) useProfileStore.getState().loseHeart(USER.id);
    });

    it('shows out of hearts without fetching', async () => {
      let requests = 0;
      server.use(
        http.get('*/api/lessons/:lessonId', () => {
          requests += 1;
          return HttpResponse.json({});
        }),
      );
      renderAt(lessonPath);
      expect(screen.getByRole('heading', { name: "You're out of hearts" })).toHaveFocus();
      await delay(30);
      expect(requests).toBe(0);
    });

    it('Practice to earn a heart goes to /practice', async () => {
      const { user, router } = renderAt(lessonPath);
      await user.click(screen.getByRole('button', { name: 'Practice to earn a heart' }));
      expect(router.state.location.pathname).toBe('/practice');
      expect(await screen.findAllByRole('radio')).not.toHaveLength(0);
    });

    it('Quit lesson goes to /learn', async () => {
      const { user, router } = renderAt(lessonPath);
      await user.click(screen.getByRole('button', { name: 'Quit lesson' }));
      expect(screen.getByText('At /learn')).toBeInTheDocument();
      expect(router.state.historyAction).toBe('REPLACE');
    });
  });
});

describe('practice route', () => {
  beforeEach(() => {
    localStorage.clear();
    document.title = '';
    useSessionStore.getState().reset();
    useProfileStore.getState().reset();
    useSessionStore.getState().setSession({ token: 't', user: USER });
    useProfileStore.getState().markHeartsIntroSeen(USER.id);
  });

  it('shows its loading copy and title, then the exercises', async () => {
    renderAt('/practice');
    expect(screen.getByRole('heading', { name: 'Getting your practice ready…' })).toBeInTheDocument();
    expect(document.title).toBe('Practice | Spiritech');
    expect(await screen.findAllByRole('radio')).not.toHaveLength(0);
  });

  it('loads even with no hearts', async () => {
    for (let i = 0; i < 5; i += 1) useProfileStore.getState().loseHeart(USER.id);
    renderAt('/practice');
    expect(await screen.findAllByRole('radio')).not.toHaveLength(0);
  });

  it('a failure says "this practice" with Try again focused', async () => {
    server.use(practiceErrorHandler);
    renderAt('/practice');
    expect(await screen.findByRole('heading', { name: "We couldn't load this practice" })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Try again' })).toHaveFocus();
  });

  it('an empty set says so', async () => {
    server.use(practiceEmptyHandler);
    renderAt('/practice');
    expect(await screen.findByRole('heading', { name: 'This practice has no exercises yet' })).toBeInTheDocument();
  });
});
