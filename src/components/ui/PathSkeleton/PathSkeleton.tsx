import type { ComponentPropsWithoutRef, CSSProperties, Ref } from 'react';
import clsx from 'clsx';
import styles from './PathSkeleton.module.scss';

/** Same zigzag as UnitSection: the first five offsets of its pattern. */
const OFFSETS = [0, 1, 2, 1, 0] as const;

export interface PathSkeletonProps extends Omit<ComponentPropsWithoutRef<'div'>, 'children' | 'aria-busy'> {
  /**
   * Receives the polite status text. It is programmatically focusable (`tabIndex={-1}`, not a tab
   * stop), so a container can move focus to it, for example after "Try again".
   */
  statusRef?: Ref<HTMLSpanElement>;
}

export function PathSkeleton({ statusRef, className, ...rest }: PathSkeletonProps) {
  return (
    <div {...rest} className={clsx(styles['root'], className)} aria-busy="true">
      <span ref={statusRef} role="status" tabIndex={-1} className={styles['status']}>
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
