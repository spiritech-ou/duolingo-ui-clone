import { useCallback, useEffect, useRef, useState } from 'react';
import { useBlocker } from 'react-router';
import type { Location } from 'react-router';
import type { Exercise } from '@/api/schemas/lesson';
import { ExerciseFooter } from '@/components/ui/ExerciseFooter';
import type { ExerciseFooterHandle } from '@/components/ui/ExerciseFooter';
import { ExercisePrompt } from '@/components/ui/ExercisePrompt';
import { ExerciseTopBar } from '@/components/ui/ExerciseTopBar';
import { FocusedLayout } from '@/components/ui/FocusedLayout';
import { PictureChoice } from '@/components/ui/PictureChoice';
import { selectProfile, useProfileStore } from '@/store/useProfileStore';
import { useSessionStore } from '@/store/useSessionStore';
import {
  createSession,
  getAccuracy,
  getCurrentExercise,
  getElapsedMs,
  getProgress,
  isPerfect,
  LESSON_XP,
  sessionReducer,
} from '../logic/sessionReducer';
import {
  getCorrectAnnouncement,
  getIncorrectAnnouncement,
  getPraise,
  getQuestionText,
  getSkippedAnnouncement,
} from '../logic/sessionCopy';
import type { SessionAction, SessionMode, SessionState } from '../logic/sessionTypes';
import { ExitDialog } from './ExitDialog';
import { FirstMistakeModal } from './FirstMistakeModal';
import styles from './ExerciseSession.module.scss';

/** Profile key used while nobody is signed in (the route guard arrives later); reads the defaults. */
const NO_USER_ID = '';

/** What the lesson-over screen shows. */
export interface LessonCompleteStats {
  xp: number;
  /** Percent, 0 to 100. */
  accuracy: number;
  elapsedMs: number;
  /** Every exercise was right the first time. */
  isPerfect: boolean;
}

/** Dialogs the container can have open. */
export type SessionDialog = 'exit' | 'firstMistake';

export interface ExerciseSessionProps {
  mode: SessionMode;
  /** The loaded exercises (10 for a lesson, 5 for practice). Fixed for the life of the session. */
  exercises: readonly Exercise[];
  /** The lesson's queue emptied; the route saves completion and shows the summary. */
  onLessonComplete: (stats: LessonCompleteStats) => void;
  /** Practice's queue emptied; the route awards the heart. */
  onPracticeComplete?: () => void;
  /** A mistake left 0 hearts and the learner pressed CONTINUE (or the lesson started with 0). */
  onOutOfHearts: () => void;
  /** The learner chose QUIT in the exit dialog; the route leaves (replacing the history entry). */
  onQuit: () => void;
}

interface Run {
  session: SessionState;
  /** Counts CONTINUE presses, so focus returns to the question even when the same exercise repeats. */
  turn: number;
}

function isFeedback(phase: SessionState['phase']): phase is 'correct' | 'wrong' | 'skipped' {
  return phase === 'correct' || phase === 'wrong' || phase === 'skipped';
}

function isEnd(
  phase: SessionState['phase'],
): phase is 'lessonOver' | 'practiceComplete' | 'outOfHearts' {
  return phase === 'lessonOver' || phase === 'practiceComplete' || phase === 'outOfHearts';
}

function getAnnouncement(session: SessionState, exercise: Exercise | undefined): string {
  if (!exercise) return '';
  const estonian =
    exercise.options.find((option) => option.id === exercise.correctOptionId)?.estonian ?? '';
  const input = { mode: session.mode, estonian, hearts: session.hearts };
  switch (session.phase) {
    case 'correct':
      return getCorrectAnnouncement(getPraise(session.correctCount - 1));
    case 'wrong':
      return getIncorrectAnnouncement(input);
    case 'skipped':
      return getSkippedAnnouncement(input);
    default:
      return '';
  }
}

export function ExerciseSession({
  mode,
  exercises,
  onLessonComplete,
  onPracticeComplete,
  onOutOfHearts,
  onQuit,
}: ExerciseSessionProps) {
  const userId = useSessionStore((store) => store.session?.user.id ?? NO_USER_ID);
  const profile = useProfileStore(selectProfile(userId));
  const loseHeart = useProfileStore((store) => store.loseHeart);
  const markHeartsIntroSeen = useProfileStore((store) => store.markHeartsIntroSeen);

  // The session starts from the profile's hearts and from now (the first exercise appearing). Every
  // loss is saved the moment it happens, so the reducer's hearts and the profile's stay equal.
  const [run, setRun] = useState<Run>(() => ({
    session: createSession({ exercises, mode, hearts: profile.hearts, now: Date.now() }),
    turn: 0,
  }));
  // The dialog opened by a button, key or the first mistake; null while nothing is open.
  const [openDialog, setOpenDialog] = useState<SessionDialog | null>(null);

  // Set the moment the session is over or the learner chose to quit, so the navigation that follows
  // (set synchronously, before any re-render) is never intercepted by the Back blocker.
  const isLeaving = useRef(false);
  // Browser Back (or any other leave) while the session is in progress is held by the router's
  // blocker; the exit dialog asks what to do. Moves within the same path are not leaving.
  const blocker = useBlocker(
    useCallback(
      ({ currentLocation, nextLocation }: { currentLocation: Location; nextLocation: Location }) =>
        !isLeaving.current && currentLocation.pathname !== nextLocation.pathname,
      [],
    ),
  );
  const isBlocked = blocker.state === 'blocked';

  const { session, turn } = run;
  const exercise = getCurrentExercise(session);

  const headingRef = useRef<HTMLHeadingElement>(null);
  const footerRef = useRef<ExerciseFooterHandle>(null);

  // Set when CONTINUE should take focus once nothing modal is open (after CHECK or SKIP, or after
  // the first-mistake modal closes, because the Dialog gives focus back to its own opener first).
  const wantsContinueFocus = useRef(false);
  // True from an Enter press that dismissed the modal until Enter is released, so holding it
  // cannot repeat onto CONTINUE (which now has focus).
  const enterHeld = useRef(false);

  const dismissFirstMistake = useCallback((): void => {
    markHeartsIntroSeen(userId);
    wantsContinueFocus.current = true;
    setOpenDialog((current) => (current === 'firstMistake' ? null : current));
  }, [markHeartsIntroSeen, userId]);

  function dispatch(action: SessionAction): void {
    const next = sessionReducer(session, action);
    if (next === session) return;
    // A heart is lost on the transition into wrong/skipped, and saved at once.
    const lostHeart = next.heartsLost === 1 && next.phase !== session.phase;
    if (lostHeart) {
      loseHeart(userId);
      // The first mistake ever (a skip counts) explains hearts once; lessons only.
      if (!profile.hasSeenHeartsIntro) setOpenDialog('firstMistake');
    }
    if (isFeedback(next.phase) && next.phase !== session.phase) wantsContinueFocus.current = true;
    setRun({ session: next, turn: action.type === 'continue' ? turn + 1 : turn });
    if (isEnd(next.phase)) isLeaving.current = true;
    if (action.type !== 'continue') return;
    if (next.phase === 'lessonOver') {
      onLessonComplete({
        xp: LESSON_XP,
        accuracy: getAccuracy(next),
        elapsedMs: getElapsedMs(next) ?? 0,
        isPerfect: isPerfect(next),
      });
    } else if (next.phase === 'practiceComplete') {
      onPracticeComplete?.();
    } else if (next.phase === 'outOfHearts') {
      onOutOfHearts();
    }
  }

  // Selection seam: speech and the number-key shortcuts of later tasks go through this handler.
  const handleSelect = (optionId: string): void => dispatch({ type: 'select', optionId });
  const handleCheck = (): void => dispatch({ type: 'check' });
  const handleSkip = (): void => dispatch({ type: 'skip' });
  const handleContinue = (): void => dispatch({ type: 'continue', now: Date.now() });
  const handleClose = (): void => setOpenDialog('exit');
  // KEEP LEARNING and Escape: close the dialog and release a held Back, which stays on the page.
  const handleKeepLearning = (): void => {
    setOpenDialog((current) => (current === 'exit' ? null : current));
    if (blocker.state === 'blocked') blocker.reset();
  };
  // QUIT: stop blocking first, drop a held Back (the route then leaves, replacing the entry), and tell it.
  const handleQuit = (): void => {
    isLeaving.current = true;
    if (blocker.state === 'blocked') blocker.reset();
    onQuit();
  };

  // Back arrived while the first-mistake modal is open: only one dialog at a time, so ignore it.
  useEffect(() => {
    if (isBlocked && openDialog === 'firstMistake') blocker.reset();
  }, [isBlocked, openDialog, blocker]);

  // A lesson that starts with no hearts is out of hearts at once.
  const reportedEmpty = useRef(false);
  useEffect(() => {
    if (session.phase === 'outOfHearts' && !reportedEmpty.current && turn === 0) {
      reportedEmpty.current = true;
      isLeaving.current = true;
      onOutOfHearts();
    }
    // Runs for the initial state only; later transitions call the callbacks from `dispatch`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // A new exercise (including a retried one) moves focus to the question heading.
  useEffect(() => {
    headingRef.current?.focus();
  }, [turn]);

  // After CHECK or SKIP the panel has committed; only then can focus move to CONTINUE. While the
  // first-mistake modal is open it keeps focus; closing it ends here, after the Dialog has
  // restored focus to its opener (that opener may be gone or stale).
  const phase = session.phase;
  useEffect(() => {
    if (!wantsContinueFocus.current || openDialog !== null || !isFeedback(phase)) return;
    wantsContinueFocus.current = false;
    footerRef.current?.focusContinue();
  }, [phase, openDialog]);

  // Enter dismisses the first-mistake modal like its button, and nothing else happens: a press on
  // the button itself is left to the button's own click, any other focus (the panel) is handled
  // here, and repeats of a press that dismissed it are swallowed.
  const isFirstMistakeOpen = openDialog === 'firstMistake';
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key !== 'Enter' || event.isComposing) return;
      if (event.repeat) {
        if (enterHeld.current) {
          event.preventDefault();
          event.stopPropagation();
        }
        return;
      }
      if (!isFirstMistakeOpen) return;
      enterHeld.current = true;
      if (event.target instanceof HTMLButtonElement) return;
      event.preventDefault();
      event.stopPropagation();
      dismissFirstMistake();
    };
    const handleKeyUp = (event: KeyboardEvent): void => {
      if (event.key === 'Enter') enterHeld.current = false;
    };
    document.addEventListener('keydown', handleKeyDown, true);
    document.addEventListener('keyup', handleKeyUp, true);
    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
      document.removeEventListener('keyup', handleKeyUp, true);
    };
  }, [isFirstMistakeOpen, dismissFirstMistake]);

  // Escape outside a modal opens the exit dialog. A bubble-phase listener on purpose: an open
  // Dialog handles its own Escape in the capture phase and stops it, so a second one never stacks.
  const isInProgress = exercise !== undefined && !isEnd(phase);
  const isExitOpen = openDialog === 'exit' || (isBlocked && openDialog !== 'firstMistake');
  const isAnyDialogOpen = isExitOpen || openDialog === 'firstMistake';
  useEffect(() => {
    if (!isInProgress || isAnyDialogOpen) return undefined;
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key !== 'Escape' || event.isComposing || event.repeat || event.defaultPrevented) {
        return;
      }
      setOpenDialog('exit');
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isInProgress, isAnyDialogOpen]);

  // End screens belong to the routes; the callbacks above already told them.
  if (!exercise || isEnd(phase)) return null;

  const feedback = isFeedback(phase);
  const isSkipped = phase === 'skipped';
  // A skip ignores any card that was selected before it.
  const selectedId = isSkipped ? null : session.selectedOptionId;
  const correctWord =
    exercise.options.find((option) => option.id === exercise.correctOptionId)?.estonian;
  const progress = getProgress(session);

  return (
    <FocusedLayout
      header={
        <ExerciseTopBar
          progress={progress.value}
          total={progress.max}
          hearts={session.hearts}
          onClose={handleClose}
        />
      }
      footer={
        <ExerciseFooter
          ref={footerRef}
          status={phase}
          {...(feedback && correctWord ? { word: correctWord } : {})}
          {...(phase === 'correct' ? { praise: getPraise(session.correctCount - 1) } : {})}
          announcement={getAnnouncement(session, exercise)}
          onSkip={handleSkip}
          onCheck={handleCheck}
          onContinue={handleContinue}
        />
      }
    >
      <div className={styles['stack']}>
        <ExercisePrompt ref={headingRef} english={exercise.english} isNewWord={exercise.isNewWord} />
        <PictureChoice
          question={getQuestionText(exercise.english)}
          options={exercise.options.map((option) => ({
            id: option.id,
            word: option.estonian,
            picture: option.picture,
          }))}
          selectedId={selectedId}
          correctId={feedback ? exercise.correctOptionId : undefined}
          wrongId={phase === 'wrong' ? (session.selectedOptionId ?? undefined) : undefined}
          isLocked={feedback}
          onSelect={handleSelect}
        />
      </div>
      {isFirstMistakeOpen ? (
        <FirstMistakeModal hearts={session.hearts} onDismiss={dismissFirstMistake} />
      ) : null}
      {isExitOpen ? (
        <ExitDialog mode={mode} onKeepLearning={handleKeepLearning} onQuit={handleQuit} />
      ) : null}
    </FocusedLayout>
  );
}
