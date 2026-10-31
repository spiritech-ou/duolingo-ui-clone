import { useEffect, useRef, useState } from 'react';
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

/** Dialogs the container can have open; the dialogs themselves arrive in later tasks. */
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
  /** The learner chose to leave (used by the exit dialog, a later task). */
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
  // `onQuit` is wired by the exit dialog task; it is part of the contract the routes already pass.
}: ExerciseSessionProps) {
  const userId = useSessionStore((store) => store.session?.user.id ?? NO_USER_ID);
  const profile = useProfileStore(selectProfile(userId));
  const loseHeart = useProfileStore((store) => store.loseHeart);

  // The session starts from the profile's hearts and from now (the first exercise appearing). Every
  // loss is saved the moment it happens, so the reducer's hearts and the profile's stay equal.
  const [run, setRun] = useState<Run>(() => ({
    session: createSession({ exercises, mode, hearts: profile.hearts, now: Date.now() }),
    turn: 0,
  }));
  // Seam for the exit dialog and first-mistake modal tasks; null while nothing is open.
  const [openDialog, setOpenDialog] = useState<SessionDialog | null>(null);

  const { session, turn } = run;
  const exercise = getCurrentExercise(session);

  const headingRef = useRef<HTMLHeadingElement>(null);
  const footerRef = useRef<ExerciseFooterHandle>(null);

  function dispatch(action: SessionAction): void {
    const next = sessionReducer(session, action);
    if (next === session) return;
    // A heart is lost on the transition into wrong/skipped, and saved at once.
    if (next.heartsLost === 1 && next.phase !== session.phase) loseHeart(userId);
    setRun({ session: next, turn: action.type === 'continue' ? turn + 1 : turn });
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

  // A lesson that starts with no hearts is out of hearts at once.
  const reportedEmpty = useRef(false);
  useEffect(() => {
    if (session.phase === 'outOfHearts' && !reportedEmpty.current && turn === 0) {
      reportedEmpty.current = true;
      onOutOfHearts();
    }
    // Runs for the initial state only; later transitions call the callbacks from `dispatch`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // A new exercise (including a retried one) moves focus to the question heading.
  useEffect(() => {
    headingRef.current?.focus();
  }, [turn]);

  // After CHECK or SKIP the panel has committed; only then can focus move to CONTINUE.
  const phase = session.phase;
  useEffect(() => {
    if (isFeedback(phase)) footerRef.current?.focusContinue();
  }, [phase]);

  // End screens belong to the routes; the callbacks above already told them.
  if (!exercise || phase === 'lessonOver' || phase === 'practiceComplete' || phase === 'outOfHearts') {
    return null;
  }

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
      // Marks the open dialog until the dialog tasks render real ones.
      data-dialog={openDialog ?? undefined}
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
    </FocusedLayout>
  );
}
