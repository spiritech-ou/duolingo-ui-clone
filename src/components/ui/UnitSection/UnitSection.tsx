import { useId } from 'react';
import type { ComponentPropsWithoutRef, Ref } from 'react';
import clsx from 'clsx';
import { PathNode } from '@/components/ui/PathNode';
import type { PathNodeStatus } from '@/components/ui/PathNode';
import styles from './UnitSection.module.scss';

/** Horizontal steps from the column centre, repeating along the unit. */
const OFFSET_PATTERN = [0, 1, 2, 1, 0, -1, -2, -1] as const;

/** Offset of the node at `index` (0-based within its unit). */
function offsetAt(index: number): number {
  return OFFSET_PATTERN[index % OFFSET_PATTERN.length] ?? 0;
}

export interface UnitLesson {
  id: string;
  /** Accessible name, for example "Lesson 4, Food, recommended, start". */
  label: string;
  status: PathNodeStatus;
  onPress: () => void;
  /** Shown inside an available node; a book icon otherwise. */
  lessonNumber?: number | undefined;
  /** Extra class for this node, for example a container-owned scale-in. */
  className?: string | undefined;
}

export interface UnitSectionProps
  extends Omit<
    ComponentPropsWithoutRef<'div'>,
    'children' | 'role' | 'aria-labelledby' | 'aria-describedby'
  > {
  /** 1-based unit number, shown as "Unit N". */
  unitNumber: number;
  title: string;
  description: string;
  lessons: readonly UnitLesson[];
  /** Receives the recommended node's button, so the container can scroll to it and focus it. */
  recommendedRef?: Ref<HTMLButtonElement>;
  /** Heading level of the banner; the path page puts it under an h1. */
  headingLevel?: 2 | 3;
}

export function UnitSection({
  unitNumber,
  title,
  description,
  lessons,
  recommendedRef,
  headingLevel = 2,
  className,
  ...rest
}: UnitSectionProps) {
  const id = useId();
  const headingId = `${id}-heading`;
  const descriptionId = `${id}-description`;
  const Heading = headingLevel === 2 ? 'h2' : 'h3';
  const recommendedIndex = lessons.findIndex((lesson) => lesson.status === 'recommended');

  return (
    <div
      {...rest}
      className={clsx(styles['root'], className)}
      role="group"
      aria-labelledby={headingId}
      aria-describedby={descriptionId}
    >
      <div className={styles['banner']}>
        <Heading id={headingId} className={styles['heading']}>
          <span className={styles['unitNumber']}>Unit {unitNumber}</span>{' '}
          <span className={styles['title']}>{title}</span>
        </Heading>
        <p id={descriptionId} className={styles['description']}>
          {description}
        </p>
      </div>
      <ol className={styles['list']}>
        {lessons.map((lesson, index) => (
          <li
            key={lesson.id}
            className={clsx(styles['item'], lesson.status === 'recommended' && styles['recommended'])}
          >
            <PathNode
              ref={index === recommendedIndex ? recommendedRef : undefined}
              status={lesson.status}
              label={lesson.label}
              offset={offsetAt(index)}
              lessonNumber={lesson.lessonNumber}
              className={lesson.className}
              onClick={lesson.onPress}
            />
          </li>
        ))}
      </ol>
    </div>
  );
}
