import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { delay, http, HttpResponse } from 'msw';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { beforeEach, describe, expect, it } from 'vitest';
import type { Course } from '@/api/schemas/course';
import blueFlame from '@/assets/brand/flame.svg';
import redFlame from '@/assets/brand/flame-red.svg';
import { LearnPage } from '@/features/learn';
import { resetArrivalMemory } from '@/features/learn/logic/arrivalMemory';
import { generateCourse } from '@/mocks/data/generators';
import { serverErrorResponse } from '@/mocks/scenario';
import { server } from '@/mocks/server';
import { useCourseStore } from '@/store/useCourseStore';
import { useProfileStore } from '@/store/useProfileStore';
import { useSessionStore } from '@/store/useSessionStore';

const USER = { id: 'u1', email: 'a@b.co', displayName: 'Ann' };
const course = generateCourse();

const flameSources = () =>
  Array.from(document.body.querySelectorAll<HTMLImageElement>('img[data-mood]')).map((img) =>
    img.getAttribute('src'),
  );

function renderLearn() {
  const router = createMemoryRouter([{ path: '/learn', element: <LearnPage /> }], {
    initialEntries: ['/learn'],
  });
  render(<RouterProvider router={router} />);
  return userEvent.setup();
}

describe('flame colour on the learning path', () => {
  beforeEach(() => {
    localStorage.clear();
    resetArrivalMemory();
    useCourseStore.getState().reset();
    useSessionStore.getState().reset();
    useProfileStore.getState().reset();
    useSessionStore.getState().setSession({ token: 't', user: USER });
  });

  it('the loading skeleton has no mascot, and the ready path has none either', async () => {
    server.use(
      http.get('*/api/course', async () => {
        await delay(30);
        return HttpResponse.json(course);
      }),
    );
    renderLearn();
    expect(screen.getByRole('status')).toHaveTextContent('Loading your lessons');
    expect(flameSources()).toEqual([]);
    await screen.findByRole('navigation', { name: 'Learning path' });
    expect(flameSources()).toEqual([]);
  });

  it('a load error is the red flame, and Try again shows the skeleton without a mascot', async () => {
    server.use(http.get('*/api/course', () => serverErrorResponse()));
    const user = renderLearn();
    await screen.findByRole('heading', { name: "We couldn't load your lessons" });
    expect(flameSources()).toEqual([redFlame]);

    server.use(
      http.get('*/api/course', async () => {
        await delay(50);
        return HttpResponse.json(course);
      }),
    );
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(flameSources()).toEqual([]);
  });

  it('an empty course is the blue flame (not a failure)', async () => {
    const empty: Course = { ...course, units: [] };
    server.use(http.get('*/api/course', () => HttpResponse.json(empty)));
    renderLearn();
    await screen.findByRole('heading', { name: 'No lessons yet' });
    expect(flameSources()).toEqual([blueFlame]);
  });
});
