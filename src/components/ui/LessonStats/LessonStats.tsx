import type { ComponentPropsWithoutRef } from 'react';
import clsx from 'clsx';
import styles from './LessonStats.module.scss';

export interface LessonStat {
  /** Short name of the stat, for example "XP". */
  label: string;
  /** Formatted value, for example "+10". */
  value: string;
}

export interface LessonStatsProps extends Omit<ComponentPropsWithoutRef<'ul'>, 'children'> {
  /** The stats to show, in order. Labels are used as keys, so keep them unique. */
  items: readonly LessonStat[];
}

export function LessonStats({ items, className, ...rest }: LessonStatsProps) {
  return (
    <ul {...rest} className={clsx(styles['root'], className)}>
      {items.map((item) => (
        <li key={item.label} className={styles['item']}>
          <span className={styles['label']}>{item.label}</span>
          {/* Hidden separator so assistive technology reads "label: value". */}
          <span className={styles['separator']}>: </span>
          <span className={styles['value']}>{item.value}</span>
        </li>
      ))}
    </ul>
  );
}
