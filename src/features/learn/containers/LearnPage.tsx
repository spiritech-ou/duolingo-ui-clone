import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import type { Course } from '@/api/schemas/course';
import { Button } from '@/components/ui/Button';
import { PathSkeleton } from '@/components/ui/PathSkeleton';
import { PathTopBar } from '@/components/ui/PathTopBar';
import { StatusScreen } from '@/components/ui/StatusScreen';
import { UnitSection } from '@/components/ui/UnitSection';
import { useCourse } from '@/hooks/useCourse';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useCourseStore } from '@/store/useCourseStore';
import { selectProfile, useProfileStore } from '@/store/useProfileStore';
import { useSessionStore } from '@/store/useSessionStore';
import {
  getFirstLessonNumbers,
  getLoadErrorMessage,
  getNodeAccessibleName,
  getNodeStates,
  isCourseEmpty,
  LOAD_ERROR_TITLE,
} from '../logic/learningPath';
import styles from './LearnPage.module.scss';

/** Profile key used while nobody is signed in (the route guard arrives later); reads the defaults. */
const NO_USER_ID = '';

type View = 'loading' | 'error' | 'empty' | 'ready';

function getView(status: 'idle' | 'loading' | 'success' | 'error', course: Course | null): View {
  if (status === 'error') return 'error';
  if (status === 'success' && course) return isCourseEmpty(course) ? 'empty' : 'ready';
  return 'loading';
}

export function LearnPage() {
  useDocumentTitle('Learn');
  const navigate = useNavigate();
  const { state, retry } = useCourse();
  const resetCourse = useCourseStore((store) => store.reset);
  const userId = useSessionStore((store) => store.session?.user.id ?? NO_USER_ID);
  const clearSession = useSessionStore((store) => store.clearSession);
  const profile = useProfileStore(selectProfile(userId));

  const titleRef = useRef<HTMLHeadingElement>(null);
  const firstActionRef = useRef<HTMLElement | null>(null);

  const course = state.status === 'success' ? state.data : null;
  const view = getView(state.status, course);

  // Focus rules (data-loading-states.md): error lands on "Try again", empty stays on the heading.
  // The status screen is keyed by view, so its refs are set by the time this effect runs.
  useEffect(() => {
    if (view === 'error') firstActionRef.current?.focus();
    if (view === 'empty') titleRef.current?.focus();
  }, [view]);

  const handleLogOut = () => {
    clearSession();
    resetCourse();
  };

  // Empty -> Loading on Reload. A cached empty course would keep `useCourse` in `success`, so the
  // cache is cleared first: the retry then shows the skeleton until the real response arrives.
  const handleReload = () => {
    resetCourse();
    retry();
  };

  const nodeStates = course ? getNodeStates(course, profile) : null;
  const firstNumbers = course ? getFirstLessonNumbers(course) : [];

  return (
    <div className={styles['page']}>
      <PathTopBar hearts={profile.hearts} onLogOut={handleLogOut} />
      {view === 'loading' && <PathSkeleton />}
      {view === 'error' && state.status === 'error' && (
        <StatusScreen
          key="error"
          variant="error"
          mood="sad"
          title={LOAD_ERROR_TITLE}
          message={getLoadErrorMessage(state.error.kind)}
          className={styles['state']}
          titleRef={titleRef}
          firstActionRef={firstActionRef}
          actions={<Button onClick={retry}>Try again</Button>}
        />
      )}
      {view === 'empty' && (
        <StatusScreen
          key="empty"
          variant="empty"
          title="No lessons yet"
          message="Check back soon."
          className={styles['state']}
          titleRef={titleRef}
          firstActionRef={firstActionRef}
          actions={<Button onClick={handleReload}>Reload</Button>}
        />
      )}
      {view === 'ready' && course && nodeStates && (
        <>
          <h1 className={styles['heading']}>Learning path</h1>
          <nav aria-label="Learning path">
            <ul className={styles['units']}>
              {course.units.map((unit, unitIndex) => (
                <li key={unit.id}>
                  <UnitSection
                    unitNumber={unitIndex + 1}
                    title={unit.title}
                    description={unit.description}
                    lessons={unit.lessons.map((lesson, lessonIndex) => {
                      const number = (firstNumbers[unitIndex] ?? 1) + lessonIndex;
                      const status = nodeStates.get(lesson.id) ?? 'available';
                      return {
                        id: lesson.id,
                        label: getNodeAccessibleName(number, lesson.title, status),
                        status,
                        lessonNumber: number,
                        onPress: () => void navigate(`/lesson/${encodeURIComponent(lesson.id)}`),
                      };
                    })}
                  />
                </li>
              ))}
            </ul>
          </nav>
        </>
      )}
    </div>
  );
}
