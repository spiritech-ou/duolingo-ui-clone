import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useLesson } from '@/hooks/useLesson';
import { selectProfile, useProfileStore } from '@/store/useProfileStore';
import { useSessionStore } from '@/store/useSessionStore';
import { ExerciseLoader } from './ExerciseLoader';
import { OutOfHeartsScreen } from './OutOfHeartsScreen';

/** Profile key used while nobody is signed in; reads the defaults. */
const NO_USER_ID = '';

interface LessonRouteProps {
  lessonId: string;
}

function LessonRoute({ lessonId }: LessonRouteProps) {
  const navigate = useNavigate();
  const userId = useSessionStore((store) => store.session?.user.id ?? NO_USER_ID);
  const hearts = useProfileStore(selectProfile(userId)).hearts;
  // Decided once on arrival: losing the last heart mid-lesson is the session's own end screen,
  // and must not swap the route's content from under the run.
  const [arrivedWithoutHearts] = useState(hearts === 0);
  const { state, retry } = useLesson(arrivedWithoutHearts ? null : lessonId);

  if (arrivedWithoutHearts) {
    return (
      <OutOfHeartsScreen
        onPractice={() => void navigate('/practice', { replace: true })}
        onQuit={() => void navigate('/learn', { replace: true })}
      />
    );
  }
  return <ExerciseLoader mode="lesson" lessonId={lessonId} state={state} retry={retry} />;
}

/** `/lesson/:lessonId`: loads the lesson, then runs it. */
export function LessonPage() {
  useDocumentTitle('Lesson');
  const { lessonId = '' } = useParams();
  // A per-lesson key, so one lesson's state never leaks into another.
  return <LessonRoute key={lessonId} lessonId={lessonId} />;
}
