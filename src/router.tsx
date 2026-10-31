import { createBrowserRouter, Link, Outlet, useRouteError, type RouteObject } from 'react-router';
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
          <span>Spiritech</span>
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

// Header group: wrapped by Layout (flame mark, product name, theme toggle, <main>).
// Only /login, /learn, the placeholder Home and the not-found route belong here.
const headerGroup: RouteObject = {
  element: <Layout />,
  errorElement: <RouteError />,
  children: [
    { path: '/', element: <Home /> }, // placeholder; replaced by the redirect to /learn with the guard task
    {
      path: '/login',
      lazy: async () => {
        const { LoginPage } = await import('@/features/auth');
        return { Component: LoginPage };
      },
    },
    {
      path: '/learn',
      lazy: async () => {
        const { LearnPage } = await import('@/features/learn');
        return { Component: LearnPage };
      },
    },
    { path: '*', element: <NotFound /> },
  ],
};

// Bare group: focused full-screen routes with no app header (OQ-34). Each page renders
// FocusedLayout, which owns <main>, so these must stay outside Layout.
// Later: /lesson/:lessonId and /practice are added here.
const bareGroup: RouteObject[] = [
  {
    path: '/onboarding/level',
    errorElement: <RouteError />,
    lazy: async () => {
      const { OnboardingLevelPage } = await import('@/features/onboarding');
      return { Component: OnboardingLevelPage };
    },
  },
  {
    path: '/onboarding/start',
    errorElement: <RouteError />,
    lazy: async () => {
      const { OnboardingStartPage } = await import('@/features/onboarding');
      return { Component: OnboardingStartPage };
    },
  },
];

export const router = createBrowserRouter([headerGroup, ...bareGroup]);
