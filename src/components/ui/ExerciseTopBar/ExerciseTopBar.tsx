import type { ComponentPropsWithoutRef, ReactNode } from 'react';
import clsx from 'clsx';
import { HeartsCounter } from '@/components/ui/HeartsCounter';
import { IconButton } from '@/components/ui/IconButton';
import { ProgressBar } from '@/components/ui/ProgressBar';
import styles from './ExerciseTopBar.module.scss';

export interface ExerciseTopBarProps extends Omit<ComponentPropsWithoutRef<'header'>, 'children'> {
  /** Exercises completed. */
  progress: number;
  /** Exercises in the lesson. */
  total: number;
  /** Hearts left. */
  hearts: number;
  /** Most hearts a learner can hold. */
  maxHearts?: number;
  /** Called when the close button is pressed. */
  onClose: () => void;
  /** Optional control between the progress bar and the hearts, for example the sound-unavailable icon. */
  trailing?: ReactNode;
}

export function ExerciseTopBar({
  progress,
  total,
  hearts,
  maxHearts,
  onClose,
  trailing,
  className,
  ...rest
}: ExerciseTopBarProps) {
  return (
    <header {...rest} className={clsx(styles['root'], className)}>
      <IconButton icon="close" label="Close" onClick={onClose} />
      <div className={styles['progress']}>
        <ProgressBar value={progress} max={total} />
      </div>
      {trailing ? <div className={styles['trailing']}>{trailing}</div> : null}
      {maxHearts === undefined ? (
        <HeartsCounter value={hearts} className={styles['hearts'] ?? ''} />
      ) : (
        <HeartsCounter value={hearts} max={maxHearts} className={styles['hearts'] ?? ''} />
      )}
    </header>
  );
}
