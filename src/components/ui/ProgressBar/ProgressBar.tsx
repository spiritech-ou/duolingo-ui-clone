import type { ComponentPropsWithoutRef, CSSProperties } from 'react';
import clsx from 'clsx';
import styles from './ProgressBar.module.scss';

export interface ProgressBarProps
  extends Omit<
    ComponentPropsWithoutRef<'div'>,
    'children' | 'role' | 'aria-valuenow' | 'aria-valuemin' | 'aria-valuemax'
  > {
  /** Steps completed. Clamped to the range 0 to `max`. */
  value: number;
  /** Total steps. */
  max: number;
  /** Accessible name; defaults to "Lesson progress". */
  label?: string;
}

export function ProgressBar({
  value,
  max,
  label = 'Lesson progress',
  className,
  ...rest
}: ProgressBarProps) {
  const safeMax = Math.max(0, Math.floor(max));
  const current = Math.min(safeMax, Math.max(0, Math.floor(value)));
  const percent = safeMax === 0 ? 0 : (current / safeMax) * 100;

  return (
    <div
      aria-label={label}
      {...rest}
      className={clsx(styles['root'], className)}
      role="progressbar"
      aria-valuemin={0}
      aria-valuenow={current}
      aria-valuemax={safeMax}
    >
      {/* Cast: CSSProperties has no index signature for custom properties. */}
      <div className={styles['fill']} style={{ '--progress': `${percent}%` } as CSSProperties} />
    </div>
  );
}
