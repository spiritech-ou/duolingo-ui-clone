import { createBrowserRouter, Link, Outlet, useRouteError } from 'react-router';
import { Button } from '@/components/ui/Button';
import { Mascot } from '@/components/ui/Mascot';
import { useThemeStore } from '@/store/useThemeStore';
import styles from './router.module.scss';

function Layout() {
  const choice = useThemeStore((state) => state.choice);
  const setChoice = useThemeStore((state) => state.setChoice);
  const next = choice === 'dark' ? 'light' : 'dark';

  return (
    <div className={styles['layout']}>
      <header className={styles['header']}>
        <Link to="/" className={styles['brand']}>
          <Mascot size={32} />
          <span>Duolingo UI Clone</span>
        </Link>
        <Button variant="secondary" size="sm" onClick={() => setChoice(next)}>
          Switch to {next} theme
        </Button>
      </header>
      <main className={styles['main']}>
        <Outlet />
      </main>
    </div>
  );
}

function Home() {
  return (
    <section className={styles['hero']}>
      <Mascot size={128} label="Spiritech flame" />
      <h1>Welcome</h1>
      <p>The app shell is ready. Features come next.</p>
      <Button>Get started</Button>
    </section>
  );
}

function NotFound() {
  return (
    <section className={styles['hero']}>
      <h1>Page not found</h1>
      <Link to="/" className={styles['link']}>
        Back to home
      </Link>
    </section>
  );
}

function RouteError() {
  const error = useRouteError();
  const message = error instanceof Error ? error.message : 'Unknown error';
  return (
    <section className={styles['hero']} role="alert">
      <h1>Something went wrong</h1>
      <p>{message}</p>
      <Link to="/" className={styles['link']}>
        Back to home
      </Link>
    </section>
  );
}

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    errorElement: <RouteError />,
    children: [
      { index: true, element: <Home /> },
      {
        path: 'learn',
        lazy: async () => {
          const { LearnPage } = await import('@/features/learn');
          return { Component: LearnPage };
        },
      },
      { path: '*', element: <NotFound /> },
    ],
  },
  // Focused flow: a sibling of the header layout (no app header, OQ-34); FocusedLayout owns <main>.
  {
    path: '/onboarding/level',
    errorElement: <RouteError />,
    lazy: async () => {
      const { OnboardingLevelPage } = await import('@/features/onboarding');
      return { Component: OnboardingLevelPage };
    },
  },
]);
