import { useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import type { Exercise } from '@/api/schemas/lesson';
import type { SpeechAdapter } from '@/hooks/useSpeech';
import { selectProfile, useProfileStore } from '@/store/useProfileStore';
import { selectCurrentUserId, useSessionStore } from '@/store/useSessionStore';
import type { SessionMode } from '../logic/sessionTypes';
import { ExerciseSession } from './ExerciseSession';
import type { LessonCompleteStats } from './ExerciseSession';
import { LessonOverScreen } from './LessonOverScreen';
import { OutOfHeartsScreen } from './OutOfHeartsScreen';
import { PracticeCompleteScreen } from './PracticeCompleteScreen';

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
  const userId = useSessionStore(selectCurrentUserId);
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

  // The run ends once. A second completion callback (a double firing, also under StrictMode) is
  // ignored, so the heart is gained and the lesson saved exactly once. A ref survives StrictMode's
  // re-render and remount, and is set synchronously, before any state update lands.
  const hasEnded = useRef(false);
  const claimEnd = (): boolean => {
    if (hasEnded.current) return false;
    hasEnded.current = true;
    return true;
  };
  const handleLessonComplete = (stats: LessonCompleteStats): void => {
    if (!claimEnd()) return;
    if (mode === 'lesson') markLessonCompleted(userId, lessonId);
    setEnd({ kind: 'lessonOver', stats });
  };
  const handlePracticeComplete = (): void => {
    if (!claimEnd()) return;
    gainHeart(userId);
    setEnd({ kind: 'practiceComplete' });
  };
  const handleOutOfHearts = (): void => {
    if (!claimEnd()) return;
    setEnd({ kind: 'outOfHearts' });
  };

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
