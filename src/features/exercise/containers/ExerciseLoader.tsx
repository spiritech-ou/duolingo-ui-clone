import { useState } from 'react';
import { useNavigate } from 'react-router';
import type { LoadState } from '@/hooks/useAsyncData';
import { PRACTICE_ID } from '@/api/schemas/lesson';
import type { Lesson, Practice } from '@/api/schemas/lesson';
import { getFailureKind } from '../logic/loadStates';
import type { SessionMode } from '../logic/sessionTypes';
import { ExerciseLoadScreen, type RetryInput } from './ExerciseLoadScreen';
import { ExerciseRun } from './ExerciseRun';

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

  // Set from "Try again" until that load settles, with the input that pressed it: the loading screen
  // then takes focus (the pressed button is gone). The first load of a route leaves it unset and
  // moves no focus.
  const [retryInput, setRetryInput] = useState<RetryInput | undefined>(undefined);
  if (retryInput !== undefined && state.status !== 'loading' && state.status !== 'idle') {
    setRetryInput(undefined);
  }
  const handleRetry = (input: RetryInput): void => {
    setRetryInput(input);
    retry();
  };

  switch (state.status) {
    case 'idle':
    case 'loading':
      return (
        <ExerciseLoadScreen
          key="loading"
          kind="loading"
          mode={mode}
          {...(retryInput ? { focusStatus: retryInput } : {})}
          onRetry={handleRetry}
          onLeave={leave}
        />
      );
    case 'error': {
      const kind = getFailureKind(state.error, mode);
      return (
        <ExerciseLoadScreen
          key={kind}
          kind={kind}
          mode={mode}
          error={state.error}
          onRetry={handleRetry}
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
          key={mode === 'lesson' ? lessonId : PRACTICE_ID}
          mode={mode}
          lessonId={mode === 'lesson' ? lessonId : PRACTICE_ID}
          exercises={state.data.exercises}
        />
      );
    default: {
      const unreachable: never = state;
      return unreachable;
    }
  }
}
