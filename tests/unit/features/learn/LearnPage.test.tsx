import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { delay, http, HttpResponse } from 'msw';
import { createMemoryRouter, RouterProvider, useLocation } from 'react-router';
import { beforeEach, describe, expect, it } from 'vitest';
import type { Course } from '@/api/schemas/course';
import { LearnPage } from '@/features/learn';
import { peekDeparture, rememberDeparture, resetArrivalMemory } from '@/features/learn/logic/arrivalMemory';
import { getLoadErrorMessage } from '@/features/learn/logic/learningPath';
import { generateCourse } from '@/mocks/data/generators';
import { courseErrorHandler } from '@/mocks/handlers/course';
import { serverErrorResponse } from '@/mocks/scenario';
import { server } from '@/mocks/server';
import { useCourseStore } from '@/store/useCourseStore';
import { useProfileStore } from '@/store/useProfileStore';
import { useSessionStore } from '@/store/useSessionStore';

const USER = { id: 'u1', email: 'a@b.co', displayName: 'Ann' };
const course = generateCourse();
const allLessons = course.units.flatMap((unit) => unit.lessons);
const first = allLessons[0];
const second = allLessons[1];
if (!first || !second) throw new Error('fixture needs two lessons');

function LessonStub() {
  return <p>At {useLocation().pathname}</p>;
}

function renderLearn() {
  const router = createMemoryRouter(
    [
      { path: '/learn', element: <LearnPage /> },
      { path: '/lesson/:lessonId', element: <LessonStub /> },
    ],
    { initialEntries: ['/learn'] },
  );
  return render(<RouterProvider router={router} />);
}

function respondWith(body: Course, ms = 5) {
  return http.get('*/api/course', async () => {
    await delay(ms);
    return HttpResponse.json(body);
  });
}

const emptyCourse: Course = { ...course, units: [] };

describe('LearnPage', () => {
  beforeEach(() => {
    localStorage.clear();
    document.title = '';
    resetArrivalMemory();
    useCourseStore.getState().reset();
    useSessionStore.getState().reset();
    useProfileStore.getState().reset();
    useSessionStore.getState().setSession({ token: 't', user: USER });
  });

  it('shows the skeleton with hearts and log out on first visit, then the path', async () => {
    server.use(respondWith(course, 30));
    renderLearn();

    expect(screen.getByRole('status')).toHaveTextContent('Loading your lessons');
    expect(screen.getByRole('img', { name: '5 hearts left' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Log out' })).toBeInTheDocument();
    expect(document.title).toBe('Learn | Spiritech');

    const nav = await screen.findByRole('navigation', { name: 'Learning path' });
    expect(within(nav).getAllByRole('group')).toHaveLength(course.units.length);
    expect(within(nav).getAllByRole('button')).toHaveLength(allLessons.length);
    expect(screen.queryByText('Loading your lessons')).not.toBeInTheDocument();
  });

  it('marks node states from the profile and numbers lessons across units', async () => {
    useProfileStore.getState().markLessonCompleted(USER.id, first.id);
    server.use(respondWith(course));
    renderLearn();

    await screen.findByRole('navigation', { name: 'Learning path' });
    expect(screen.getByRole('button', { name: `Lesson 1, ${first.title}, completed` })).toBeInTheDocument();
    const recommended = screen.getByRole('button', {
      name: `Lesson 2, ${second.title}, recommended, start`,
    });
    expect(recommended).toHaveAttribute('aria-current', 'step');
    const lastIndex = allLessons.length - 1;
    const last = allLessons[lastIndex];
    expect(
      screen.getByRole('button', { name: `Lesson ${allLessons.length}, ${last?.title ?? ''}` }),
    ).toBeInTheDocument();
  });

  it('shows a cached course at once and updates it in place after the refresh', async () => {
    useCourseStore.getState().setCourse({ ...course, units: course.units.slice(0, 1) });
    server.use(respondWith(course, 40));
    renderLearn();

    // No spinner, no skeleton: the cached path is there on the first frame.
    expect(screen.getByRole('navigation', { name: 'Learning path' })).toBeInTheDocument();
    expect(screen.queryByText('Loading your lessons')).not.toBeInTheDocument();
    expect(screen.getAllByRole('group')).toHaveLength(1);

    await waitFor(() => expect(screen.getAllByRole('group')).toHaveLength(course.units.length));
  });

  it('keeps the cached path and shows no error when the silent refresh fails', async () => {
    useCourseStore.getState().setCourse(course);
    let answered = false;
    server.use(
      http.get('*/api/course', () => {
        answered = true;
        return serverErrorResponse();
      }),
    );
    renderLearn();
    await waitFor(() => expect(answered).toBe(true));
    // Let the failed response travel through the client and the hook (macrotasks, not wall-clock time).
    for (let tick = 0; tick < 10; tick += 1) {
      await act(() => new Promise<void>((resolve) => setTimeout(resolve, 0)));
    }
    expect(screen.getByRole('navigation', { name: 'Learning path' })).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows the empty state, and Reload returns to loading before the real response', async () => {
    server.use(respondWith(emptyCourse));
    renderLearn();

    const heading = await screen.findByRole('heading', { name: 'No lessons yet' });
    await waitFor(() => expect(heading).toHaveFocus());
    expect(screen.getByText('Check back soon.')).toBeInTheDocument();

    // The next response has lessons; a cached empty course must not mask the loading state.
    server.use(respondWith(course, 60));
    await userEvent.click(screen.getByRole('button', { name: 'Reload' }));
    expect(screen.getByText('Loading your lessons')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'No lessons yet' })).not.toBeInTheDocument();
    expect(await screen.findByRole('navigation', { name: 'Learning path' })).toBeInTheDocument();
  });

  it('treats units without lessons as empty', async () => {
    server.use(respondWith({ ...course, units: course.units.map((unit) => ({ ...unit, lessons: [] })) }));
    renderLearn();
    expect(await screen.findByRole('heading', { name: 'No lessons yet' })).toBeInTheDocument();
  });

  it('shows the other-failure error, focuses Try again and keeps Log out reachable', async () => {
    server.use(courseErrorHandler);
    renderLearn();

    const alert = await screen.findByRole('alert');
    expect(within(alert).getByRole('heading', { name: "We couldn't load your lessons" })).toBeInTheDocument();
    expect(alert).toHaveTextContent('Something went wrong on our side. Try again in a moment.');
    await waitFor(() => expect(screen.getByRole('button', { name: 'Try again' })).toHaveFocus());
    expect(screen.getByRole('button', { name: 'Log out' })).toBeInTheDocument();
  });

  it('shows the connectivity message when the network fails', async () => {
    server.use(http.get('*/api/course', () => HttpResponse.error()));
    renderLearn();

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(
      'You seem to be offline, or the connection is slow. Check it and try again.',
    );
  });

  it('maps failure kinds to the two messages', () => {
    expect(getLoadErrorMessage('network')).toMatch(/offline/);
    expect(getLoadErrorMessage('http')).toMatch(/our side/);
    expect(getLoadErrorMessage('invalid-payload')).toMatch(/our side/);
  });

  it('retries from the error: loading first, then the path', async () => {
    server.use(courseErrorHandler);
    renderLearn();
    const retry = await screen.findByRole('button', { name: 'Try again' });

    server.use(respondWith(course, 80));
    await userEvent.click(retry);
    expect(screen.getByText('Loading your lessons')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(await screen.findByRole('navigation', { name: 'Learning path' })).toBeInTheDocument();
  });

  it('log out clears the session and the course cache', async () => {
    server.use(respondWith(course));
    renderLearn();
    await screen.findByRole('navigation', { name: 'Learning path' });
    expect(useCourseStore.getState().course).not.toBeNull();

    await userEvent.click(screen.getByRole('button', { name: 'Log out' }));
    expect(useSessionStore.getState().session).toBeNull();
    expect(useCourseStore.getState().course).toBeNull();
  });

  it('log out forgets where the user left the path', async () => {
    server.use(respondWith(course));
    renderLearn();
    await screen.findByRole('navigation', { name: 'Learning path' });
    rememberDeparture({
      userId: USER.id,
      lessonId: first.id,
      completedLessonIds: [],
      recommendedLessonId: first.id,
    });
    expect(peekDeparture(USER.id)).not.toBeNull();

    await userEvent.click(screen.getByRole('button', { name: 'Log out' }));
    expect(peekDeparture(USER.id)).toBeNull();
  });

  it('opens /lesson/:lessonId when a node is pressed, completed or not', async () => {
    useProfileStore.getState().markLessonCompleted(USER.id, first.id);
    server.use(respondWith(course));
    renderLearn();

    await userEvent.click(
      await screen.findByRole('button', { name: `Lesson 1, ${first.title}, completed` }),
    );
    expect(await screen.findByText(`At /lesson/${first.id}`)).toBeInTheDocument();
  });

  it('shows zero hearts as "No hearts left" while nodes still open', async () => {
    for (let i = 0; i < 5; i += 1) useProfileStore.getState().loseHeart(USER.id);
    server.use(respondWith(course));
    renderLearn();

    expect(screen.getByRole('img', { name: 'No hearts left' })).toBeInTheDocument();
    await userEvent.click(
      await screen.findByRole('button', { name: `Lesson 1, ${first.title}, recommended, start` }),
    );
    expect(await screen.findByText(`At /lesson/${first.id}`)).toBeInTheDocument();
  });

  it('does not throw without a session or profile and shows the default hearts', async () => {
    useSessionStore.getState().reset();
    server.use(respondWith(course));
    renderLearn();
    expect(screen.getByRole('img', { name: '5 hearts left' })).toBeInTheDocument();
    expect(await screen.findByRole('navigation', { name: 'Learning path' })).toBeInTheDocument();
    expect(useProfileStore.getState().profiles).toEqual({});
  });
});
