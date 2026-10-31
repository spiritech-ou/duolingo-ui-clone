import { useNavigate } from 'react-router';
import type { LoadState } from '@/hooks/useAsyncData';
import type { Lesson, Practice } from '@/api/schemas/lesson';
import { getFailureKind } from '../logic/loadStates';
import type { SessionMode } from '../logic/sessionTypes';
import { ExerciseLoadScreen } from './ExerciseLoadScreen';
import { ExerciseRun } from './ExerciseRun';

/** `lessonId` ExerciseRun gets in practice mode, where it is ignored. */
const PRACTICE_RUN_ID = 'practice';

export interface ExerciseLoaderProps {
  mode: SessionMode;
  lessonId: string;
  state: LoadState<Lesson | Practice>;
  retry: () => void;
}

/** Turns a lesson or practice `LoadState` into the screen for it, then the run itself. */
export function ExerciseLoader({ mode, lessonId, state, retry }: ExerciseLoaderProps) {
  const navigate = useNavigate();
  const leave = (): void => {
    void navigate('/learn', { replace: true });
  };

  switch (state.status) {
    case 'idle':
    case 'loading':
      return <ExerciseLoadScreen key="loading" kind="loading" mode={mode} onRetry={retry} onLeave={leave} />;
    case 'error': {
      const kind = getFailureKind(state.error, mode);
      return (
        <ExerciseLoadScreen
          key={kind}
          kind={kind}
          mode={mode}
          error={state.error}
          onRetry={retry}
          onLeave={leave}
        />
      );
    }
    case 'success':
      if (state.data.exercises.length === 0) {
        return <ExerciseLoadScreen key="empty" kind="empty" mode={mode} onRetry={retry} onLeave={leave} />;
      }
      return (
        <ExerciseRun
          key={mode === 'lesson' ? lessonId : PRACTICE_RUN_ID}
          mode={mode}
          lessonId={mode === 'lesson' ? lessonId : PRACTICE_RUN_ID}
          exercises={state.data.exercises}
        />
      );
    default: {
      const unreachable: never = state;
      return unreachable;
    }
  }
}
