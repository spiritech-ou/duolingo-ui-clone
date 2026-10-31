import type { ComponentPropsWithoutRef } from 'react';
import clsx from 'clsx';
import styles from './SignalBars.module.scss';

const BAR_COUNT = 4;

export interface SignalBarsProps
  extends Omit<ComponentPropsWithoutRef<'span'>, 'children' | 'role' | 'aria-hidden' | 'aria-label' | 'aria-labelledby'> {
  /** Bars to fill, from 0 to 4. Clamped and rounded down to a whole number. */
  level: number;
}

export function SignalBars({ level, className, ...rest }: SignalBarsProps) {
  const filled = Number.isFinite(level) ? Math.min(BAR_COUNT, Math.max(0, Math.floor(level))) : 0;

  return (
    <span
      {...rest}
      className={clsx(styles['root'], className)}
      // Decorative: the option text next to it carries the meaning. Set after the
      // rest props, which the types forbid from touching these but a caller can
      // still force past them.
      role={undefined}
      aria-label={undefined}
      aria-labelledby={undefined}
      aria-hidden="true"
      data-level={filled}
    >
      {Array.from({ length: BAR_COUNT }, (_, index) => (
        <span
          key={index}
          className={clsx(styles['bar'], index < filled && styles['isFilled'])}
          data-filled={index < filled}
        />
      ))}
    </span>
  );
}
