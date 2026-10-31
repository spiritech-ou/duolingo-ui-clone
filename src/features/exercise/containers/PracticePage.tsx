import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { usePractice } from '@/hooks/usePractice';
import { ExerciseLoader } from './ExerciseLoader';

/** `/practice`: draws a fresh practice set on every visit, then runs it. */
export function PracticePage() {
  useDocumentTitle('Practice');
  const { state, retry } = usePractice();
  return <ExerciseLoader mode="practice" lessonId="practice" state={state} retry={retry} />;
}
