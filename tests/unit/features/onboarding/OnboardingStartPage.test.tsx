import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider, useLocation } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { OnboardingLevelPage, OnboardingStartPage } from '@/features/onboarding';
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
      { path: '/onboarding/start', element: <OnboardingStartPage /> },
      { path: '/learn', element: <Stub /> },
    ],
    { initialEntries: ['/onboarding/start'] },
  );
  render(<RouterProvider router={router} />);
  return router;
}

const profile = () => useProfileStore.getState().profiles[USER.id];

describe('OnboardingStartPage', () => {
  beforeEach(() => {
    localStorage.clear();
    document.title = '';
    useSessionStore.getState().reset();
    useProfileStore.getState().reset();
    useSessionStore.getState().setSession({ token: 't', user: USER });
    useProfileStore.getState().saveDraftLevel(USER.id, 3);
  });

  it('focuses the prompt, names the group, lists both cards and disables CONTINUE with a reason', () => {
    renderPage();
    expect(screen.getByRole('heading', { name: "Now let's find the best place to start!" })).toHaveFocus();
    expect(document.title).toBe('Onboarding | Spiritech');
    expect(screen.getByRole('radiogroup', { name: "Now let's find the best place to start!" })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Start from scratch' })).toHaveAccessibleDescription(
      'Take the easiest lesson of the Estonian course',
    );
    expect(screen.getByRole('radio', { name: 'Find my level' })).toHaveAccessibleDescription(
      'Let the flame recommend where you should start learning',
    );
    for (const radio of screen.getAllByRole('radio')) expect(radio).not.toBeChecked();
    const button = screen.getByRole('button', { name: 'Continue' });
    expect(button).toHaveAttribute('aria-disabled', 'true');
    expect(button).toHaveAccessibleDescription('Choose an option to continue');
  });

  it('tabs through Back, the radiogroup and CONTINUE in that order', async () => {
    renderPage();
    const visited: string[] = [];
    await userEvent.click(document.body); // leave the focused prompt: start from the top of the page
    for (let i = 0; i < 6; i += 1) {
      await userEvent.tab();
      const active = document.activeElement;
      const radio = active?.getAttribute('type') === 'radio';
      visited.push(radio ? 'radio' : (active?.textContent ?? ''));
    }
    const back = visited.indexOf('Back');
    const group = visited.indexOf('radio');
    const next = visited.indexOf('Continue');
    expect(back).toBeGreaterThanOrEqual(0);
    expect(back).toBeLessThan(group);
    expect(group).toBeLessThan(next);
  });

  it('does nothing when CONTINUE is pressed with no choice', async () => {
    const router = renderPage();
    await userEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(router.state.location.pathname).toBe('/onboarding/start');
    expect(profile()?.onboarding.completed).toBe(false);
  });

  it('enables CONTINUE after choosing a card', async () => {
    renderPage();
    await userEvent.click(screen.getByRole('radio', { name: 'Find my level' }));
    expect(screen.getByRole('radio', { name: 'Find my level' })).toBeChecked();
    expect(screen.getByRole('button', { name: 'Continue' })).not.toHaveAttribute('aria-disabled');
  });

  it('completes with "scratch" at unit 0 whatever the level, and replaces to /learn', async () => {
    const router = renderPage();
    await userEvent.click(screen.getByRole('radio', { name: 'Start from scratch' }));
    await userEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(await screen.findByText('At /learn')).toBeInTheDocument();
    expect(profile()?.onboarding).toEqual({ completed: true, level: 3, startChoice: 'scratch' });
    expect(profile()?.startUnitIndex).toBe(0);
    expect(router.state.historyAction).toBe('REPLACE');
  });

  it('completes with "find-level" at the level index', async () => {
    renderPage();
    await userEvent.click(screen.getByRole('radio', { name: 'Find my level' }));
    await userEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(await screen.findByText('At /learn')).toBeInTheDocument();
    expect(profile()?.onboarding).toEqual({ completed: true, level: 3, startChoice: 'find-level' });
    expect(profile()?.startUnitIndex).toBe(3);
  });

  it('completes and navigates once when Enter is pressed twice', async () => {
    const router = renderPage();
    const navigate = vi.spyOn(router, 'navigate');
    const complete = vi.spyOn(useProfileStore.getState(), 'completeOnboarding');
    const radio = screen.getByRole('radio', { name: 'Find my level' });
    await userEvent.click(radio);
    radio.focus();
    await userEvent.keyboard('{Enter}{Enter}');
    expect(await screen.findByText('At /learn')).toBeInTheDocument();
    expect(navigate).toHaveBeenCalledTimes(1);
    expect(complete).toHaveBeenCalledTimes(1);
    expect(profile()?.startUnitIndex).toBe(3);
  });

  it('Back returns to step 1 with the previous level selected', async () => {
    renderPage();
    await userEvent.click(screen.getByRole('radio', { name: 'Find my level' }));
    await userEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(await screen.findByRole('radiogroup', { name: 'How much Estonian do you know?' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'I can talk about various topics' })).toBeChecked();
    expect(profile()?.onboarding.completed).toBe(false);
  });

  it('redirects to step 1 without a draft level', async () => {
    useProfileStore.getState().reset();
    const router = renderPage();
    expect(await screen.findByRole('radiogroup', { name: 'How much Estonian do you know?' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/onboarding/level');
    expect(router.state.historyAction).toBe('REPLACE');
  });

  it('does not throw without a session', async () => {
    useSessionStore.getState().reset();
    renderPage();
    // No session reads the default profile, which has no draft: it lands on step 1.
    expect(await screen.findByRole('radiogroup', { name: 'How much Estonian do you know?' })).toBeInTheDocument();
  });
});
