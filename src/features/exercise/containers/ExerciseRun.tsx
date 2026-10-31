import { useState } from 'react';
import { useNavigate } from 'react-router';
import type { Exercise } from '@/api/schemas/lesson';
import type { SpeechAdapter } from '@/hooks/useSpeech';
import { selectProfile, useProfileStore } from '@/store/useProfileStore';
import { useSessionStore } from '@/store/useSessionStore';
import type { SessionMode } from '../logic/sessionTypes';
import { ExerciseSession } from './ExerciseSession';
import type { LessonCompleteStats } from './ExerciseSession';
import { LessonOverScreen } from './LessonOverScreen';
import { OutOfHeartsScreen } from './OutOfHeartsScreen';
import { PracticeCompleteScreen } from './PracticeCompleteScreen';

/** Profile key used while nobody is signed in (the route guard arrives later); reads the defaults. */
const NO_USER_ID = '';

export interface ExerciseRunProps {
  mode: SessionMode;
  /** The lesson saved as completed in lesson mode (ignored in practice). */
  lessonId: string;
  /** The loaded exercises. Fixed for the life of the run: mount with a per-session `key`. */
  exercises: readonly Exercise[];
  /** Speech synthesis seam for tests. */
  speechAdapter?: SpeechAdapter;
}

type End =
  | { kind: 'lessonOver'; stats: LessonCompleteStats }
  | { kind: 'practiceComplete' }
  | { kind: 'outOfHearts' };

/**
 * One exercise run: the session, then the end screen that takes its place. Saves completion and
 * the practice heart, and owns every navigation out (always replacing the history entry, so Back
 * does not reopen the lesson).
 */
export function ExerciseRun({ mode, lessonId, exercises, speechAdapter }: ExerciseRunProps) {
  const navigate = useNavigate();
  const userId = useSessionStore((store) => store.session?.user.id ?? NO_USER_ID);
  const hearts = useProfileStore(selectProfile(userId)).hearts;
  const markLessonCompleted = useProfileStore((store) => store.markLessonCompleted);
  const gainHeart = useProfileStore((store) => store.gainHeart);
  const [end, setEnd] = useState<End | null>(null);

  const goToPath = (): void => {
    void navigate('/learn', { replace: true });
  };
  const goToPractice = (): void => {
    void navigate('/practice', { replace: true });
  };

  // The callbacks run once, from the session's CONTINUE press, so the saves happen exactly once.
  const handleLessonComplete = (stats: LessonCompleteStats): void => {
    if (mode === 'lesson') markLessonCompleted(userId, lessonId);
    setEnd({ kind: 'lessonOver', stats });
  };
  const handlePracticeComplete = (): void => {
    gainHeart(userId);
    setEnd({ kind: 'practiceComplete' });
  };
  const handleOutOfHearts = (): void => setEnd({ kind: 'outOfHearts' });

  if (end?.kind === 'lessonOver') {
    return <LessonOverScreen key="lessonOver" stats={end.stats} onContinue={goToPath} />;
  }
  if (end?.kind === 'practiceComplete') {
    return <PracticeCompleteScreen key="practiceComplete" hearts={hearts} onContinue={goToPath} />;
  }
  if (end?.kind === 'outOfHearts') {
    return <OutOfHeartsScreen key="outOfHearts" onPractice={goToPractice} onQuit={goToPath} />;
  }
  return (
    <ExerciseSession
      mode={mode}
      exercises={exercises}
      {...(speechAdapter ? { speechAdapter } : {})}
      onLessonComplete={handleLessonComplete}
      onPracticeComplete={handlePracticeComplete}
      onOutOfHearts={handleOutOfHearts}
      onQuit={goToPath}
    />
  );
}
