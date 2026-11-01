import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { delay, http, HttpResponse } from 'msw';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { beforeEach, describe, expect, it } from 'vitest';
import { LessonPage, PracticePage } from '@/features/exercise';
import { generateCourse, generateLesson, generatePractice } from '@/mocks/data/generators';
import { lessonErrorHandler } from '@/mocks/handlers/lessons';
import { practiceErrorHandler } from '@/mocks/handlers/practice';
import { serverErrorResponse } from '@/mocks/scenario';
import { server } from '@/mocks/server';
import { useProfileStore } from '@/store/useProfileStore';
import { useSessionStore } from '@/store/useSessionStore';

const USER = { id: 'u1', email: 'a@b.co', displayName: 'Ann' };
const lesson = generateCourse().units[0]?.lessons[0];
if (!lesson) throw new Error('fixture needs a lesson');
const lessonBody = generateLesson(lesson.id);
if (!lessonBody) throw new Error('fixture needs a lesson body');

function renderAt(path: string) {
  const router = createMemoryRouter(
    [
      { path: '/lesson/:lessonId', element: <LessonPage /> },
      { path: '/practice', element: <PracticePage /> },
      { path: '/learn', element: <p>Learn</p> },
    ],
    { initialEntries: [path] },
  );
  render(<RouterProvider router={router} />);
  return userEvent.setup();
}

const cases = [
  {
    name: 'lesson',
    path: `/lesson/${lesson.id}`,
    errorHandler: lessonErrorHandler,
    url: '*/api/lessons/:lessonId',
    emptyBody: { ...lessonBody, exercises: [] },
    loadingTitle: 'Getting your lesson ready…',
    failedTitle: "We couldn't load this lesson",
    emptyTitle: 'This lesson has no exercises yet',
  },
  {
    name: 'practice',
    path: '/practice',
    errorHandler: practiceErrorHandler,
    url: '*/api/practice',
    emptyBody: generatePractice(0),
    loadingTitle: 'Getting your practice ready…',
    failedTitle: "We couldn't load this practice",
    emptyTitle: 'This practice has no exercises yet',
  },
] as const;

describe.each(cases)(
  'focus after Try again on the $name route',
  ({ path, errorHandler, url, emptyBody, loadingTitle, failedTitle, emptyTitle }) => {
    // A slow answer keeps the Loading state on screen long enough to inspect it.
    const slowEmpty = http.get(url, async () => {
      await delay(80);
      return HttpResponse.json(emptyBody);
    });

    beforeEach(() => {
      localStorage.clear();
      document.title = '';
      useSessionStore.getState().reset();
      useProfileStore.getState().reset();
      useSessionStore.getState().setSession({ token: 't', user: USER });
      useProfileStore.getState().markHeartsIntroSeen(USER.id);
    });

    it('moves focus to the loading status text, which is not a tab stop', async () => {
      server.use(errorHandler);
      const user = renderAt(path);
      await screen.findByRole('heading', { name: failedTitle });
      await waitFor(() => expect(screen.getByRole('button', { name: 'Try again' })).toHaveFocus());

      server.use(slowEmpty);
      await user.click(screen.getByRole('button', { name: 'Try again' }));

      const status = screen.getByRole('status');
      expect(status).toHaveTextContent(loadingTitle);
      expect(status).toHaveAttribute('tabindex', '-1');
      await waitFor(() => expect(status).toHaveFocus());
      expect(document.body).not.toHaveFocus();

      // Tab continues in DOM order; it does not park on the status region.
      await user.tab();
      expect(status).not.toHaveFocus();

      // Let the request settle so it cannot leak into the next test.
      await screen.findByRole('heading', { name: emptyTitle });
    });

    it('moves focus to the loading status text when Try again is pressed with the keyboard', async () => {
      server.use(errorHandler);
      const user = renderAt(path);
      await screen.findByRole('heading', { name: failedTitle });
      await waitFor(() => expect(screen.getByRole('button', { name: 'Try again' })).toHaveFocus());

      server.use(slowEmpty);
      await user.keyboard('{Enter}');

      const status = screen.getByRole('status');
      expect(status).toHaveTextContent(loadingTitle);
      await waitFor(() => expect(status).toHaveFocus());

      await screen.findByRole('heading', { name: emptyTitle });
    });

    it('a second failure still focuses Try again', async () => {
      server.use(errorHandler);
      const user = renderAt(path);
      await screen.findByRole('heading', { name: failedTitle });
      await waitFor(() => expect(screen.getByRole('button', { name: 'Try again' })).toHaveFocus());

      server.use(
        http.get(url, async () => {
          await delay(60);
          return serverErrorResponse();
        }),
      );
      await user.click(screen.getByRole('button', { name: 'Try again' }));
      await waitFor(() => expect(screen.getByRole('status')).toHaveFocus());

      await screen.findByRole('heading', { name: failedTitle });
      await waitFor(() => expect(screen.getByRole('button', { name: 'Try again' })).toHaveFocus());
    });

    it('the first load moves no focus', async () => {
      server.use(slowEmpty);
      renderAt(path);

      const status = screen.getByRole('status');
      expect(status).toHaveTextContent(loadingTitle);
      // Give a (wrong) focus effect time to run.
      await new Promise<void>((resolve) => setTimeout(resolve, 20));
      expect(status).not.toHaveFocus();
      expect(document.body).toHaveFocus();

      await screen.findByRole('heading', { name: emptyTitle });
    });
  },
);
