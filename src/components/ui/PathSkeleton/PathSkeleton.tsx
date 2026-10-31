import type { ComponentPropsWithoutRef, CSSProperties } from 'react';
import clsx from 'clsx';
import styles from './PathSkeleton.module.scss';

/** Same zigzag as UnitSection: the first five offsets of its pattern. */
const OFFSETS = [0, 1, 2, 1, 0] as const;

// A type alias: the interface form would be empty, which the linter forbids.
export type PathSkeletonProps = Omit<ComponentPropsWithoutRef<'div'>, 'children' | 'aria-busy'>;

export function PathSkeleton({ className, ...rest }: PathSkeletonProps) {
  return (
    <div {...rest} className={clsx(styles['root'], className)} aria-busy="true">
      <span role="status" className={styles['status']}>
        Loading your lessons
      </span>
      <div className={clsx(styles['shape'], styles['banner'])} aria-hidden="true" />
      <div className={styles['list']} aria-hidden="true">
        {OFFSETS.map((offset, index) => (
          <div key={index} className={styles['item']}>
            <div
              className={clsx(styles['shape'], styles['node'])}
              style={{ '--path-node-offset': offset } as CSSProperties}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
