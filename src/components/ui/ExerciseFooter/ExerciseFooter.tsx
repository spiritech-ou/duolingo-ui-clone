import { useImperativeHandle, useRef } from 'react';
import type { ComponentPropsWithoutRef, Ref } from 'react';
import clsx from 'clsx';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import styles from './ExerciseFooter.module.scss';

export type ExerciseFooterStatus = 'idle' | 'selected' | 'correct' | 'wrong' | 'skipped';

/** What a container can do with the footer through its `ref`. */
export interface ExerciseFooterHandle {
  /** Moves focus to the Continue button. Does nothing while Continue is not shown. */
  focusContinue: () => void;
}

export interface ExerciseFooterProps
  extends Omit<ComponentPropsWithoutRef<'div'>, 'children' | 'ref'> {
  status: ExerciseFooterStatus;
  /** The Estonian answer, shown in the correct, wrong and skipped panels. */
  word?: string;
  /** The praise line of the correct panel, for example "Nicely done!". */
  praise?: string;
  /**
   * Text for the polite live region, set by the container. Its change is what gets read, so it
   * is how the right card is conveyed (for example "Wrong. The correct answer is tee").
   */
  announcement?: string;
  onSkip?: () => void;
  onCheck?: () => void;
  onContinue?: () => void;
  /** Gives the container `focusContinue()`, used after CHECK or SKIP. */
  ref?: Ref<ExerciseFooterHandle>;
}

export function ExerciseFooter({
  status,
  word,
  praise = 'Nicely done!',
  announcement = '',
  onSkip,
  onCheck,
  onContinue,
  ref,
  className,
  ...rest
}: ExerciseFooterProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useImperativeHandle(ref, () => ({
    focusContinue: () => {
      panelRef.current?.querySelector('button')?.focus();
    },
  }));

  const isPanel = status === 'correct' || status === 'wrong' || status === 'skipped';
  const isCorrect = status === 'correct';

  return (
    <div {...rest} className={clsx(styles['root'], className)}>
      {/* Always mounted, in every status, so a text change is announced. */}
      <div className={styles['announcer']} role="status" aria-live="polite" aria-atomic="true">
        {announcement}
      </div>
      {isPanel ? (
        // The key remounts the panel when the status changes, which replays the slide-up.
        <div
          key={status}
          ref={panelRef}
          className={clsx(styles['panel'], isCorrect ? styles['correct'] : styles['wrong'])}
        >
          <div className={styles['panelColumn']}>
            <span className={styles['iconCircle']}>
              <Icon name={isCorrect ? 'check' : 'close'} size={48} className={styles['icon']} />
            </span>
            <div className={styles['body']}>
              <p className={styles['title']}>{isCorrect ? praise : 'Correct solution:'}</p>
              {word ? (
                <p className={styles['word']} lang="et">
                  {word}
                </p>
              ) : null}
            </div>
            <Button size="lg" className={styles['continue']} onClick={onContinue}>
              Continue
            </Button>
          </div>
        </div>
      ) : (
        <div className={styles['actions']}>
          <div className={styles['actionsColumn']}>
            <Button variant="secondary" size="lg" className={styles['skip']} onClick={onSkip}>
              Skip
            </Button>
            <Button
              size="lg"
              className={styles['check']}
              isDisabled={status === 'idle'}
              onClick={onCheck}
            >
              Check
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
