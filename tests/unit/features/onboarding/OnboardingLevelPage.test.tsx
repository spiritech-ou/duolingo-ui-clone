import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider, useLocation } from 'react-router';
import { beforeEach, describe, expect, it } from 'vitest';
import { OnboardingLevelPage } from '@/features/onboarding';
import { useProfileStore } from '@/store/useProfileStore';
import { useSessionStore } from '@/store/useSessionStore';

const USER = { id: 'u1', email: 'a@b.co', displayName: 'Ann' };

function Stub() {
  return <p>At {useLocation().pathname}</p>;
}

function renderPage() {
  const router = createMemoryRouter(
    [
      { path: '/onboarding/level', element: <OnboardingLevelPage /> },
      { path: '/onboarding/start', element: <Stub /> },
      { path: '/learn', element: <Stub /> },
    ],
    { initialEntries: ['/onboarding/level'] },
  );
  return render(<RouterProvider router={router} />);
}

describe('OnboardingLevelPage', () => {
  beforeEach(() => {
    localStorage.clear();
    document.title = '';
    useSessionStore.getState().reset();
    useProfileStore.getState().reset();
    useSessionStore.getState().setSession({ token: 't', user: USER });
  });

  it('focuses the prompt, titles the page and disables CONTINUE with a reason', () => {
    renderPage();
    const prompt = screen.getByRole('heading', { name: 'How much Estonian do you know?' });
    expect(prompt).toHaveFocus();
    expect(document.title).toBe('Onboarding | Spiritech');
    expect(screen.getAllByRole('radio')).toHaveLength(5);
    expect(screen.getByRole('radiogroup', { name: 'How much Estonian do you know?' })).toBeInTheDocument();
    const button = screen.getByRole('button', { name: 'Continue' });
    expect(button).toHaveAttribute('aria-disabled', 'true');
    expect(button).toHaveAccessibleDescription('Choose an option to continue');
  });

  it('does nothing when CONTINUE is pressed with no choice', async () => {
    renderPage();
    await userEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(screen.getByRole('radiogroup')).toBeInTheDocument();
  });

  it('shows the reaction in a status region and enables CONTINUE', async () => {
    renderPage();
    await userEvent.click(screen.getByRole('radio', { name: 'I know some common words' }));
    expect(screen.getByRole('status')).toHaveTextContent('Nice, you already have a head start!');
    expect(screen.getByRole('heading')).toHaveTextContent('Nice, you already have a head start!');
    expect(screen.getByRole('radiogroup', { name: 'How much Estonian do you know?' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Continue' })).not.toHaveAttribute('aria-disabled');
  });

  it('completes onboarding for the lowest level and goes to /learn', async () => {
    renderPage();
    await userEvent.click(screen.getByRole('radio', { name: "I'm new to Estonian" }));
    await userEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(await screen.findByText('At /learn')).toBeInTheDocument();
    const profile = useProfileStore.getState().profiles[USER.id];
    expect(profile?.onboarding).toEqual({ completed: true, level: 0, startChoice: 'scratch' });
    expect(profile?.startUnitIndex).toBe(0);
  });

  it('saves a draft for higher levels and goes to step 2', async () => {
    renderPage();
    await userEvent.click(screen.getByRole('radio', { name: 'I can have basic conversations' }));
    await userEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(await screen.findByText('At /onboarding/start')).toBeInTheDocument();
    const profile = useProfileStore.getState().profiles[USER.id];
    expect(profile?.onboarding).toEqual({ completed: false, level: 2, startChoice: null });
  });

  it('presses CONTINUE with Enter on the selected option', async () => {
    renderPage();
    await userEvent.click(screen.getByRole('radio', { name: 'I can talk about various topics' }));
    await userEvent.keyboard('{Enter}');
    expect(await screen.findByText('At /onboarding/start')).toBeInTheDocument();
    expect(useProfileStore.getState().profiles[USER.id]?.onboarding.level).toBe(3);
  });

  it('navigates once when Enter is pressed twice', async () => {
    const router = createMemoryRouter(
      [
        { path: '/onboarding/level', element: <OnboardingLevelPage /> },
        { path: '/onboarding/start', element: <Stub /> },
      ],
      { initialEntries: ['/onboarding/level'] },
    );
    render(<RouterProvider router={router} />);
    const radio = screen.getByRole('radio', { name: 'I can have basic conversations' });
    await userEvent.click(radio);
    radio.focus();
    await userEvent.keyboard('{Enter}{Enter}');
    expect(await screen.findByText('At /onboarding/start')).toBeInTheDocument();
    expect(router.state.historyAction).toBe('PUSH');
    expect(router.state.location.pathname).toBe('/onboarding/start');
    expect(useProfileStore.getState().profiles[USER.id]?.onboarding.level).toBe(2);
  });

  it('replaces history when level 1 completes, so Back does not return to step 1', async () => {
    const router = createMemoryRouter(
      [
        { path: '/onboarding/level', element: <OnboardingLevelPage /> },
        { path: '/learn', element: <Stub /> },
      ],
      { initialEntries: ['/onboarding/level'] },
    );
    render(<RouterProvider router={router} />);
    await userEvent.click(screen.getByRole('radio', { name: "I'm new to Estonian" }));
    await userEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(await screen.findByText('At /learn')).toBeInTheDocument();
    expect(router.state.historyAction).toBe('REPLACE');
    await router.navigate(-1);
    expect(router.state.location.pathname).not.toBe('/onboarding/level');
  });

  it('preselects the draft level with its reaction', () => {
    useProfileStore.getState().saveDraftLevel(USER.id, 4);
    renderPage();
    expect(screen.getByRole('radio', { name: 'I can discuss most topics in detail' })).toBeChecked();
    expect(screen.getByRole('status')).toHaveTextContent("Wow, you're nearly fluent!");
  });

  it('does not throw without a session', async () => {
    useSessionStore.getState().reset();
    renderPage();
    await userEvent.click(screen.getByRole('radio', { name: 'I can have basic conversations' }));
    await userEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(await screen.findByText('At /onboarding/start')).toBeInTheDocument();
  });
});
