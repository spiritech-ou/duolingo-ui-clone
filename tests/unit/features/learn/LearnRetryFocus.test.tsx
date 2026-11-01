import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { delay, http, HttpResponse } from 'msw';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { beforeEach, describe, expect, it } from 'vitest';
import type { Course } from '@/api/schemas/course';
import { LearnPage } from '@/features/learn';
import { resetArrivalMemory } from '@/features/learn/logic/arrivalMemory';
import { generateCourse } from '@/mocks/data/generators';
import { courseErrorHandler } from '@/mocks/handlers/course';
import { serverErrorResponse } from '@/mocks/scenario';
import { server } from '@/mocks/server';
import { useCourseStore } from '@/store/useCourseStore';
import { useProfileStore } from '@/store/useProfileStore';
import { useSessionStore } from '@/store/useSessionStore';

const USER = { id: 'u1', email: 'a@b.co', displayName: 'Ann' };
const course = generateCourse();
const emptyCourse: Course = { ...course, units: [] };

function renderLearn() {
  const router = createMemoryRouter([{ path: '/learn', element: <LearnPage /> }], {
    initialEntries: ['/learn'],
  });
  render(<RouterProvider router={router} />);
  return userEvent.setup();
}

function slowResponse(body: Course, ms = 80) {
  return http.get('*/api/course', async () => {
    await delay(ms);
    return HttpResponse.json(body);
  });
}

describe('LearnPage focus after Try again', () => {
  beforeEach(() => {
    localStorage.clear();
    document.title = '';
    resetArrivalMemory();
    useCourseStore.getState().reset();
    useSessionStore.getState().reset();
    useProfileStore.getState().reset();
    useSessionStore.getState().setSession({ token: 't', user: USER });
  });

  it('moves focus to the skeleton status text, which is not a tab stop', async () => {
    server.use(courseErrorHandler);
    const user = renderLearn();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Try again' })).toHaveFocus());

    server.use(slowResponse(course));
    await user.click(screen.getByRole('button', { name: 'Try again' }));

    const status = screen.getByRole('status');
    expect(status).toHaveTextContent('Loading your lessons');
    expect(status).toHaveAttribute('tabindex', '-1');
    await waitFor(() => expect(status).toHaveFocus());
    expect(document.body).not.toHaveFocus();
    // The skeleton keeps its busy semantics.
    expect(status.parentElement).toHaveAttribute('aria-busy', 'true');

    await user.tab();
    expect(status).not.toHaveFocus();

    await screen.findByRole('navigation', { name: 'Learning path' });
  });

  it('a second failure still focuses Try again', async () => {
    server.use(courseErrorHandler);
    const user = renderLearn();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Try again' })).toHaveFocus());

    server.use(
      http.get('*/api/course', async () => {
        await delay(60);
        return serverErrorResponse();
      }),
    );
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    await waitFor(() => expect(screen.getByRole('status')).toHaveFocus());

    await screen.findByRole('alert');
    await waitFor(() => expect(screen.getByRole('button', { name: 'Try again' })).toHaveFocus());
  });

  it('the first load moves no focus', async () => {
    server.use(slowResponse(course));
    renderLearn();

    const status = screen.getByRole('status');
    expect(status).toHaveTextContent('Loading your lessons');
    // Give a (wrong) focus effect time to run.
    await new Promise<void>((resolve) => setTimeout(resolve, 20));
    expect(status).not.toHaveFocus();
    expect(document.body).toHaveFocus();

    await screen.findByRole('navigation', { name: 'Learning path' });
  });

  it('Reload on the empty state does not move focus to the skeleton (OQ-59)', async () => {
    server.use(slowResponse(emptyCourse, 5));
    const user = renderLearn();
    await screen.findByRole('heading', { name: 'No lessons yet' });

    server.use(slowResponse(course));
    await user.click(screen.getByRole('button', { name: 'Reload' }));
    const status = screen.getByRole('status');
    expect(status).toHaveTextContent('Loading your lessons');
    await new Promise<void>((resolve) => setTimeout(resolve, 20));
    expect(status).not.toHaveFocus();

    await screen.findByRole('navigation', { name: 'Learning path' });
  });
});
