import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LearnPage } from '@/features/learn';
import { resetArrivalMemory } from '@/features/learn/logic/arrivalMemory';
import { generateCourse } from '@/mocks/data/generators';
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

const scrollIntoView = vi.fn();

function renderLearn() {
  const router = createMemoryRouter(
    [
      { path: '/learn', element: <LearnPage /> },
      { path: '/lesson/:lessonId', element: <p>Lesson</p> },
    ],
    { initialEntries: ['/learn'] },
  );
  render(<RouterProvider router={router} />);
  return router;
}

const nodeName = (number: number, title: string, suffix = '') => `Lesson ${number}, ${title}${suffix}`;

/** The element `scrollIntoView` was last called on. */
function scrolledElement(): Element | undefined {
  return scrollIntoView.mock.contexts.at(-1) as Element | undefined;
}

describe('LearnPage arrival', () => {
  beforeEach(() => {
    localStorage.clear();
    scrollIntoView.mockReset();
    Element.prototype.scrollIntoView = scrollIntoView;
    resetArrivalMemory();
    useCourseStore.getState().reset();
    useSessionStore.getState().reset();
    useProfileStore.getState().reset();
    useSessionStore.getState().setSession({ token: 't', user: USER });
    server.use(http.get('*/api/course', () => HttpResponse.json(course)));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('centres the recommended node instantly and focuses it', async () => {
    useProfileStore.getState().markLessonCompleted(USER.id, first.id);
    renderLearn();
    const node = await screen.findByRole('button', { name: nodeName(2, second.title, ', recommended, start') });

    expect(scrollIntoView).toHaveBeenCalledWith({ block: 'center', behavior: 'instant' });
    expect(scrolledElement()).toBe(node);
    expect(node).toHaveFocus();
  });

  it('does not scroll again when the cached course is refreshed in place', async () => {
    useCourseStore.getState().setCourse(course);
    renderLearn();
    await screen.findByRole('navigation', { name: 'Learning path' });
    await new Promise((resolve) => setTimeout(resolve, 80));
    expect(scrollIntoView).toHaveBeenCalledTimes(1);
  });

  it('with every lesson completed and no departure, lands on the first node', async () => {
    for (const lesson of allLessons) useProfileStore.getState().markLessonCompleted(USER.id, lesson.id);
    renderLearn();
    const node = await screen.findByRole('button', { name: nodeName(1, first.title, ', completed') });
    expect(scrolledElement()).toBe(node);
    expect(node).toHaveFocus();
  });

  it('with every lesson completed, keeps the lesson just left in view on return', async () => {
    for (const lesson of allLessons.slice(0, -1)) {
      useProfileStore.getState().markLessonCompleted(USER.id, lesson.id);
    }
    const last = allLessons[allLessons.length - 1];
    if (!last) throw new Error('fixture needs lessons');
    const router = renderLearn();
    await userEvent.click(
      await screen.findByRole('button', {
        name: nodeName(allLessons.length, last.title, ', recommended, start'),
      }),
    );
    act(() => useProfileStore.getState().markLessonCompleted(USER.id, last.id));
    await act(() => router.navigate('/learn'));

    const node = await screen.findByRole('button', {
      name: nodeName(allLessons.length, last.title, ', completed'),
    });
    expect(scrolledElement()).toBe(node);
    expect(node).toHaveFocus();
    expect(node.className).not.toMatch(/arrival/);
  });

  it('scales in and highlights a newly recommended node after a completed lesson', async () => {
    const router = renderLearn();
    await userEvent.click(
      await screen.findByRole('button', { name: nodeName(1, first.title, ', recommended, start') }),
    );
    act(() => useProfileStore.getState().markLessonCompleted(USER.id, first.id));
    await act(() => router.navigate('/learn'));

    const node = await screen.findByRole('button', { name: nodeName(2, second.title, ', recommended, start') });
    expect(node.className).toMatch(/arrival/);
    expect(scrolledElement()).toBe(node);
    expect(node).toHaveFocus();
  });

  it('does not celebrate when returning without completing the lesson', async () => {
    const router = renderLearn();
    await userEvent.click(
      await screen.findByRole('button', { name: nodeName(1, first.title, ', recommended, start') }),
    );
    await act(() => router.navigate('/learn'));

    const node = await screen.findByRole('button', { name: nodeName(1, first.title, ', recommended, start') });
    expect(node.className).not.toMatch(/arrival/);
  });
});

describe('LearnPage placement note', () => {
  const findLevel = () =>
    useProfileStore
      .getState()
      .completeOnboarding(USER.id, { level: 2, startChoice: 'find-level', startUnitIndex: 2 });

  beforeEach(() => {
    localStorage.clear();
    Element.prototype.scrollIntoView = scrollIntoView;
    resetArrivalMemory();
    useCourseStore.getState().reset();
    useSessionStore.getState().reset();
    useProfileStore.getState().reset();
    useSessionStore.getState().setSession({ token: 't', user: USER });
    server.use(http.get('*/api/course', () => HttpResponse.json(course)));
  });

  it('shows the note after "Find my level", announced as a status, above the path', async () => {
    findLevel();
    renderLearn();
    const nav = await screen.findByRole('navigation', { name: 'Learning path' });
    const note = screen.getByRole('status');
    await waitFor(() => expect(note).toHaveTextContent('We recommend starting at Unit 3 based on your answer.'));
    expect(screen.getByRole('button', { name: 'Got it' })).toBeInTheDocument();
    expect(note.compareDocumentPosition(nav) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('dismisses with "Got it", saves it, keeps focus on the path and stays gone on a new visit', async () => {
    findLevel();
    renderLearn();
    await userEvent.click(await screen.findByRole('button', { name: 'Got it' }));

    expect(screen.queryByRole('button', { name: 'Got it' })).not.toBeInTheDocument();
    expect(useProfileStore.getState().profiles[USER.id]?.placementNoteDismissed).toBe(true);
    expect(document.activeElement).not.toBe(document.body);
    expect(screen.getByRole('navigation', { name: 'Learning path' })).toContainElement(
      document.activeElement as HTMLElement,
    );
  });

  it('is not shown when starting from scratch', async () => {
    useProfileStore
      .getState()
      .completeOnboarding(USER.id, { level: 0, startChoice: 'scratch', startUnitIndex: 0 });
    renderLearn();
    await screen.findByRole('navigation', { name: 'Learning path' });
    expect(screen.queryByRole('button', { name: 'Got it' })).not.toBeInTheDocument();
  });

  it('is not shown once dismissed', async () => {
    findLevel();
    useProfileStore.getState().dismissPlacementNote(USER.id);
    renderLearn();
    await screen.findByRole('navigation', { name: 'Learning path' });
    expect(screen.queryByRole('button', { name: 'Got it' })).not.toBeInTheDocument();
  });
});

describe('LearnPage finished course', () => {
  beforeEach(() => {
    localStorage.clear();
    Element.prototype.scrollIntoView = scrollIntoView;
    resetArrivalMemory();
    useCourseStore.getState().reset();
    useSessionStore.getState().reset();
    useProfileStore.getState().reset();
    useSessionStore.getState().setSession({ token: 't', user: USER });
    server.use(http.get('*/api/course', () => HttpResponse.json(course)));
  });

  it('shows the closing card after the last unit and no recommended node, nodes still open', async () => {
    for (const lesson of allLessons) useProfileStore.getState().markLessonCompleted(USER.id, lesson.id);
    renderLearn();

    const card = await screen.findByRole('region', { name: 'You finished the Estonian course!' });
    expect(card).toHaveTextContent('Replay any lesson to keep your words fresh.');
    const nav = screen.getByRole('navigation', { name: 'Learning path' });
    expect(nav.compareDocumentPosition(card) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.queryByText('START')).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: nodeName(1, first.title, ', completed') }));
    expect(await screen.findByText('Lesson')).toBeInTheDocument();
  });

  it('does not show the card while a lesson remains', async () => {
    renderLearn();
    await screen.findByRole('navigation', { name: 'Learning path' });
    expect(screen.queryByRole('region', { name: 'You finished the Estonian course!' })).not.toBeInTheDocument();
  });
});
