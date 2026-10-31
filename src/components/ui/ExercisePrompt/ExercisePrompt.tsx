import type { ComponentPropsWithoutRef, Ref } from 'react';
import clsx from 'clsx';
import styles from './ExercisePrompt.module.scss';

export interface ExercisePromptProps
  extends Omit<ComponentPropsWithoutRef<'div'>, 'children' | 'ref'> {
  /** The English word the question is about; the component builds the question text. */
  english: string;
  /** Shows the "NEW WORD" tag above the question. */
  isNewWord?: boolean;
  /** Forwarded to the question heading (`h1`), so a container can focus it when a new exercise appears. */
  ref?: Ref<HTMLHeadingElement>;
}

export function ExercisePrompt({
  english,
  isNewWord = false,
  ref,
  className,
  ...rest
}: ExercisePromptProps) {
  return (
    <div {...rest} className={clsx(styles['root'], className)}>
      {isNewWord ? <span className={styles['tag']}>NEW WORD</span> : null}
      <h1 ref={ref} tabIndex={-1} className={styles['question']}>
        {`Which one of these is “${english}”?`}
      </h1>
    </div>
  );
}
