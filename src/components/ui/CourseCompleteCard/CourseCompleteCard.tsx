import { useId } from 'react';
import type { ComponentPropsWithoutRef } from 'react';
import clsx from 'clsx';
import { Mascot } from '@/components/ui/Mascot';
import styles from './CourseCompleteCard.module.scss';

export interface CourseCompleteCardProps
  extends Omit<
    ComponentPropsWithoutRef<'section'>,
    'children' | 'role' | 'aria-labelledby' | 'aria-describedby'
  > {
  /** Celebration heading, for example "You finished the Estonian course!". */
  heading: string;
  /** Line under the heading, for example "Replay any lesson to keep your words fresh.". */
  message: string;
  /** Heading level; the path page puts the card under its h1. */
  headingLevel?: 2 | 3;
}

export function CourseCompleteCard({
  heading,
  message,
  headingLevel = 2,
  className,
  ...rest
}: CourseCompleteCardProps) {
  const id = useId();
  const headingId = `${id}-heading`;
  const messageId = `${id}-message`;
  const Heading = headingLevel === 2 ? 'h2' : 'h3';

  return (
    <section
      {...rest}
      className={clsx(styles['root'], className)}
      role="region"
      aria-labelledby={headingId}
      aria-describedby={messageId}
    >
      {/* Decorative: the heading already says what happened. */}
      <Mascot mood="celebrating" size={128} />
      <Heading id={headingId} className={styles['heading']}>
        {heading}
      </Heading>
      <p id={messageId} className={styles['message']}>
        {message}
      </p>
    </section>
  );
}
