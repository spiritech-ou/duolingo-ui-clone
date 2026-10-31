import {
  createBrowserRouter,
  Link,
  Navigate,
  Outlet,
  useRouteError,
  type RouteObject,
} from 'react-router';
import { Button } from '@/components/ui/Button';
import { Mascot } from '@/components/ui/Mascot';
import { RouteGuard } from '@/features/auth';
import { useThemeStore } from '@/store/useThemeStore';
import styles from './router.module.scss';

function Layout() {
  const choice = useThemeStore((state) => state.choice);
  const setChoice = useThemeStore((state) => state.setChoice);
  const next = choice === 'dark' ? 'light' : 'dark';

  return (
    <div className={styles['layout']}>
      <header className={styles['header']}>
        <div className={styles['headerRow']}>
          <Link to="/" className={styles['brand']}>
            <Mascot size={32} />
            <span className={styles['brandName']}>Spiritech</span>
          </Link>
          <Button variant="secondary" size="sm" onClick={() => setChoice(next)}>
            Switch to {next} theme
          </Button>
        </div>
      </header>
      <main className={styles['main']}>
        <Outlet />
      </main>
    </div>
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
  // The error element replaces its route's layout, so it carries the page gutters itself.
  return (
    <div className={styles['errorPage']}>
      <section className={styles['hero']} role="alert">
        <h1>Something went wrong</h1>
        <p>{message}</p>
        <Link to="/" className={styles['link']}>
          Back to home
        </Link>
      </section>
    </div>
  );
}

// Header group: wrapped by Layout (flame mark, product name, theme toggle, <main>).
// Only /login, /learn, the / redirect and the not-found route belong here.
const headerGroup: RouteObject = {
  element: <Layout />,
  errorElement: <RouteError />,
  children: [
    { path: '/', element: <Navigate to="/learn" replace /> }, // the guard then applies to /learn
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
  {
    path: '/lesson/:lessonId',
    errorElement: <RouteError />,
    lazy: async () => {
      const { LessonPage } = await import('@/features/exercise');
      return { Component: LessonPage };
    },
  },
  {
    path: '/practice',
    errorElement: <RouteError />,
    lazy: async () => {
      const { PracticePage } = await import('@/features/exercise');
      return { Component: PracticePage };
    },
  },
];

// The guard is a pathless parent of both groups, so it wraps every route including /login.
export const router = createBrowserRouter([
  { element: <RouteGuard />, children: [headerGroup, ...bareGroup] },
]);
