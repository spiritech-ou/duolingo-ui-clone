import { useEffect, useRef } from 'react';
import type { ApiError } from '@/api/client';
import { Button } from '@/components/ui/Button';
import { FocusedLayout } from '@/components/ui/FocusedLayout';
import { IconButton } from '@/components/ui/IconButton';
import { StatusScreen } from '@/components/ui/StatusScreen';
import { getLoadScreenCopy, type LoadScreenKind } from '../logic/loadStates';
import type { SessionMode } from '../logic/sessionTypes';
import styles from './StateScreen.module.scss';

export interface ExerciseLoadScreenProps {
  kind: LoadScreenKind;
  mode: SessionMode;
  /** The failure behind an `error` screen, for its message. */
  error?: ApiError;
  onRetry: () => void;
  /** Close button of the loading screen, and "Back to path". */
  onLeave: () => void;
}

/**
 * Loading, load-error, not-found and empty screens of a lesson or practice route.
 * Remount it (`key={kind}`) when the kind changes so the focus rules run for each screen.
 */
export function ExerciseLoadScreen({ kind, mode, error, onRetry, onLeave }: ExerciseLoadScreenProps) {
  const titleRef = useRef<HTMLHeadingElement>(null);
  const firstActionRef = useRef<HTMLElement>(null);
  const copy = getLoadScreenCopy(kind, mode, error);

  useEffect(() => {
    // Error and not found: the main action; empty: the heading; loading: nothing.
    if (kind === 'error' || kind === 'notFound') firstActionRef.current?.focus();
    else if (kind === 'empty') titleRef.current?.focus();
  }, [kind]);

  const backButton = (
    <Button variant={kind === 'error' ? 'secondary' : 'primary'} onClick={onLeave}>
      Back to path
    </Button>
  );

  return (
    // 480px column. The header slot is rendered for every kind, empty after loading, with the
    // same height, so the column keeps its place when the screen changes from loading to error.
    <FocusedLayout
      headerMaxWidth="100%"
      contentMaxWidth="30rem"
      header={
        <div className={styles['headerSlot']}>
          {kind === 'loading' ? <IconButton icon="close" label="Close" onClick={onLeave} /> : null}
        </div>
      }
    >
      <div className={styles['column']}>
        <StatusScreen
          // Failures (load error and not found) are alerts; the empty lesson is a polite status.
          variant={kind === 'loading' ? 'loading' : kind === 'error' || kind === 'notFound' ? 'error' : 'empty'}
          // Red flame only for failures; loading and the empty lesson keep the blue one.
          mood={kind === 'error' || kind === 'notFound' ? 'sad' : 'default'}
          title={copy.title}
          {...(copy.message ? { message: copy.message } : {})}
          titleRef={titleRef}
          firstActionRef={firstActionRef}
          {...(kind === 'loading'
            ? {}
            : {
                actions:
                  kind === 'error' ? (
                    <>
                      <Button onClick={onRetry}>Try again</Button>
                      {backButton}
                    </>
                  ) : (
                    backButton
                  ),
              })}
        />
      </div>
    </FocusedLayout>
  );
}
