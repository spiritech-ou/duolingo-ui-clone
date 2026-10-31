import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { createMemoryRouter, RouterProvider, useLocation } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LoginPage } from '@/features/auth';
import { LearnPage } from '@/features/learn';
import { server } from '@/mocks/server';
import { useCourseStore } from '@/store/useCourseStore';
import { useProfileStore } from '@/store/useProfileStore';
import { useSessionStore } from '@/store/useSessionStore';

const FAILED = "We couldn't log you in. Check your connection and try again.";

function Stub() {
  return <p>At {useLocation().pathname}</p>;
}

function renderLogin(entry: string | { pathname: string; state: unknown } = '/login') {
  const router = createMemoryRouter(
    [
      { path: '/login', element: <LoginPage /> },
      { path: '/learn', element: <Stub /> },
      { path: '/practice', element: <Stub /> },
      { path: '/onboarding/level', element: <Stub /> },
    ],
    { initialEntries: [entry] },
  );
  const navigate = vi.spyOn(router, 'navigate');
  render(<RouterProvider router={router} />);
  return { router, navigate };
}

async function submit(email: string, password = 'password1') {
  await userEvent.type(screen.getByLabelText('Email'), email);
  await userEvent.type(screen.getByLabelText('Password'), password);
  await userEvent.click(screen.getByRole('button', { name: 'LOG IN' }));
}

describe('LoginPage', () => {
  beforeEach(() => {
    localStorage.clear();
    document.title = '';
    useSessionStore.getState().reset();
    useProfileStore.getState().reset();
    useCourseStore.getState().reset();
  });

  it('renders without a session, titles the page and focuses the heading', () => {
    renderLogin();
    expect(screen.getByRole('heading', { name: 'Log in' })).toHaveFocus();
    expect(document.title).toBe('Log in | Spiritech');
  });

  it('stores the session, creates the profile and replaces history with onboarding for a new user', async () => {
    const { router, navigate } = renderLogin();
    await submit('Ann@Example.com');

    expect(await screen.findByText('At /onboarding/level')).toBeInTheDocument();
    expect(useSessionStore.getState().session?.user.id).toBe('ann@example.com');
    expect(useProfileStore.getState().profiles['ann@example.com']).toBeDefined();
    expect(navigate).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledWith('/onboarding/level', expect.objectContaining({ replace: true }));
    expect(router.state.historyAction).toBe('REPLACE');
  });

  it('goes to /learn when the user has already onboarded', async () => {
    useProfileStore
      .getState()
      .completeOnboarding('ann@example.com', { level: 1, startChoice: 'scratch', startUnitIndex: 0 });
    const { navigate } = renderLogin();
    await submit('ann@example.com');

    expect(await screen.findByText('At /learn')).toBeInTheDocument();
    expect(navigate).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledWith('/learn', expect.objectContaining({ replace: true }));
  });

  it('returns to the remembered from when it is allowed', async () => {
    useProfileStore
      .getState()
      .completeOnboarding('ann@example.com', { level: 1, startChoice: 'scratch', startUnitIndex: 0 });
    const { navigate } = renderLogin({ pathname: '/login', state: { from: '/practice' } });
    await submit('ann@example.com');

    expect(await screen.findByText('At /practice')).toBeInTheDocument();
    expect(navigate).toHaveBeenCalledWith('/practice', expect.objectContaining({ replace: true }));
  });

  it('ignores a from that is not an app route', async () => {
    useProfileStore
      .getState()
      .completeOnboarding('ann@example.com', { level: 1, startChoice: 'scratch', startUnitIndex: 0 });
    renderLogin({ pathname: '/login', state: { from: '/elsewhere' } });
    await submit('ann@example.com');
    expect(await screen.findByText('At /learn')).toBeInTheDocument();
  });

  it('shows the incorrect-credentials banner for a 401, keeps the fields and the page', async () => {
    const { navigate } = renderLogin();
    await submit('ann@fail.test');

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Incorrect email or password.');
    expect(alert.parentElement).toHaveFocus();
    expect(screen.getByLabelText('Email')).toHaveValue('ann@fail.test');
    expect(useSessionStore.getState().session).toBeNull();
    expect(useProfileStore.getState().profiles['ann@fail.test']).toBeUndefined();
    expect(navigate).not.toHaveBeenCalled();
  });

  it('shows the request-failed banner for a 5xx', async () => {
    const { navigate } = renderLogin();
    await submit('ann@error.test');

    expect(await screen.findByRole('alert')).toHaveTextContent(FAILED);
    expect(useSessionStore.getState().session).toBeNull();
    expect(navigate).not.toHaveBeenCalled();
  });

  it('shows the request-failed banner for a network failure', async () => {
    server.use(http.post('*/api/auth/login', () => HttpResponse.error()));
    renderLogin();
    await submit('ann@example.com');
    expect(await screen.findByRole('alert')).toHaveTextContent(FAILED);
  });

  it('shows the request-failed banner for a non-401 client error', async () => {
    server.use(
      http.post('*/api/auth/login', () =>
        HttpResponse.json({ code: 'invalid_request', message: 'x' }, { status: 400 }),
      ),
    );
    renderLogin();
    await submit('ann@example.com');
    expect(await screen.findByRole('alert')).toHaveTextContent(FAILED);
  });

  it('sends one request per submit and allows a resubmit after a failure', async () => {
    let calls = 0;
    server.use(
      http.post('*/api/auth/login', () => {
        calls += 1;
        return HttpResponse.json({ code: 'server_error', message: 'x' }, { status: 500 });
      }),
    );
    renderLogin();
    await submit('ann@example.com');
    await screen.findByRole('alert');
    expect(calls).toBe(1);
    await userEvent.click(screen.getByRole('button', { name: 'LOG IN' }));
    await waitFor(() => expect(calls).toBe(2));
  });

  it('does not call the endpoint when the form is invalid', async () => {
    let calls = 0;
    server.use(
      http.post('*/api/auth/login', () => {
        calls += 1;
        return HttpResponse.error();
      }),
    );
    renderLogin();
    await userEvent.click(screen.getByRole('button', { name: 'LOG IN' }));
    expect(await screen.findByText('Invalid email address')).toBeInTheDocument();
    expect(calls).toBe(0);
  });
});

describe('log out from the learning path', () => {
  it('lands on the login page with the session cleared', async () => {
    localStorage.clear();
    useSessionStore.getState().reset();
    useProfileStore.getState().reset();
    useCourseStore.getState().reset();
    useSessionStore.getState().setSession({
      token: 't',
      user: { id: 'u1', email: 'a@b.co', displayName: 'Ann' },
    });
    const router = createMemoryRouter(
      [
        { path: '/learn', element: <LearnPage /> },
        { path: '/login', element: <LoginPage /> },
      ],
      { initialEntries: ['/learn'] },
    );
    render(<RouterProvider router={router} />);

    await userEvent.click(await screen.findByRole('button', { name: 'Log out' }));

    expect(await screen.findByRole('heading', { name: 'Log in' })).toHaveFocus();
    expect(router.state.location.pathname).toBe('/login');
    expect(router.state.historyAction).toBe('REPLACE');
    expect(useSessionStore.getState().session).toBeNull();
  });
});
