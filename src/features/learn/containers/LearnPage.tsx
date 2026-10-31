import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import type { Course } from '@/api/schemas/course';
import { Button } from '@/components/ui/Button';
import { CourseCompleteCard } from '@/components/ui/CourseCompleteCard';
import { Notice } from '@/components/ui/Notice';
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
  getArrivalTarget,
  peekDeparture,
  rememberDeparture,
  resetArrivalMemory,
} from '../logic/arrivalMemory';
import {
  getFirstLessonNumbers,
  getLoadErrorMessage,
  getNodeAccessibleName,
  getNodeStates,
  getPlacementNoteText,
  getRecommendedLessonId,
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
  const dismissPlacementNote = useProfileStore((store) => store.dismissPlacementNote);

  const titleRef = useRef<HTMLHeadingElement>(null);
  const firstActionRef = useRef<HTMLElement | null>(null);
  const recommendedRef = useRef<HTMLButtonElement>(null);
  const navRef = useRef<HTMLElement>(null);

  const course = state.status === 'success' ? state.data : null;
  const view = getView(state.status, course);

  // Focus rules (data-loading-states.md): error lands on "Try again", empty stays on the heading.
  // The status screen is keyed by view, so its refs are set by the time this effect runs.
  useEffect(() => {
    if (view === 'error') firstActionRef.current?.focus();
    if (view === 'empty') titleRef.current?.focus();
  }, [view]);

  const nodeStates = course ? getNodeStates(course, profile) : null;
  const firstNumbers = course ? getFirstLessonNumbers(course) : [];
  const recommendedId = course ? getRecommendedLessonId(course, profile) : null;
  const lessonIds = course ? course.units.flatMap((unit) => unit.lessons.map((lesson) => lesson.id)) : [];
  const isFinished = lessonIds.length > 0 && recommendedId === null;
  const showPlacementNote =
    profile.onboarding.completed &&
    profile.onboarding.startChoice === 'find-level' &&
    !profile.placementNoteDismissed;

  // Arrival (learning-path.md, Ready): once per visit, when the path is first ready (a cached course
  // counts), centre the target node instantly and focus it. A later silent refresh never re-scrolls.
  const arrivedRef = useRef(false);
  // Read once at mount (the departure is cleared on arrival), so renders stay pure.
  const [departure] = useState(() => peekDeparture(userId));
  const arrival = getArrivalTarget(recommendedId, profile.completedLessonIds, departure);
  const celebratedId = arrival.celebrate ? recommendedId : null;
  useEffect(() => {
    if (view !== 'ready' || arrivedRef.current) return;
    arrivedRef.current = true;
    resetArrivalMemory();
    let target: HTMLElement | null | undefined = recommendedRef.current;
    if (!target) {
      const buttons = navRef.current?.querySelectorAll<HTMLElement>('button');
      const index = arrival.focusLessonId ? lessonIds.indexOf(arrival.focusLessonId) : 0;
      target = buttons?.[Math.max(index, 0)];
    }
    target?.scrollIntoView({ block: 'center', behavior: 'instant' });
    target?.focus({ preventScroll: true });
    // Runs once per visit on purpose: the values it reads are those of the first ready render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);

  // The note's live region is mounted empty and filled one tick later, so assistive tech announces it.
  const [noteText, setNoteText] = useState('');
  useEffect(() => {
    if (view !== 'ready' || !showPlacementNote) return undefined;
    const timer = setTimeout(() => setNoteText(getPlacementNoteText(profile.startUnitIndex)), 0);
    return () => clearTimeout(timer);
  }, [view, showPlacementNote, profile.startUnitIndex]);

  const handleDismissNote = () => {
    dismissPlacementNote(userId);
    // The pressed button disappears; keep focus on the path.
    (recommendedRef.current ?? navRef.current?.querySelector<HTMLElement>('button'))?.focus();
  };

  const handleLogOut = () => {
    resetArrivalMemory();
    clearSession();
    resetCourse();
    void navigate('/login', { replace: true });
  };

  // Empty -> Loading on Reload. A cached empty course would keep `useCourse` in `success`, so the
  // cache is cleared first: the retry then shows the skeleton until the real response arrives.
  const handleReload = () => {
    resetCourse();
    retry();
  };

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
          {showPlacementNote && (
            <Notice
              variant="info"
              role="status"
              actionLabel="Got it"
              onAction={handleDismissNote}
            >
              {noteText}
            </Notice>
          )}
          <nav ref={navRef} aria-label="Learning path">
            <ul className={styles['units']}>
              {course.units.map((unit, unitIndex) => (
                <li key={unit.id}>
                  <UnitSection
                    unitNumber={unitIndex + 1}
                    recommendedRef={recommendedRef}
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
                        className: lesson.id === celebratedId ? styles['arrival'] : undefined,
                        onPress: () => {
                          rememberDeparture({
                            userId,
                            lessonId: lesson.id,
                            completedLessonIds: profile.completedLessonIds,
                            recommendedLessonId: recommendedId,
                          });
                          void navigate(`/lesson/${encodeURIComponent(lesson.id)}`);
                        },
                      };
                    })}
                  />
                </li>
              ))}
            </ul>
          </nav>
          {isFinished && (
            <CourseCompleteCard
              heading="You finished the Estonian course!"
              message="Replay any lesson to keep your words fresh."
            />
          )}
        </>
      )}
    </div>
  );
}
