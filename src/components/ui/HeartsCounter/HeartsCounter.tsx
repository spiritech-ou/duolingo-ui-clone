import { useState } from 'react';
import type { ComponentPropsWithoutRef } from 'react';
import clsx from 'clsx';
import { Icon } from '@/components/ui/Icon';
import styles from './HeartsCounter.module.scss';

export interface HeartsCounterProps
  extends Omit<ComponentPropsWithoutRef<'span'>, 'children' | 'role' | 'aria-label'> {
  /** Hearts left. Clamped to the range 0 to `max`. */
  value: number;
  /** Most hearts a learner can hold. */
  max?: number;
}

interface Change {
  direction: 'up' | 'down';
  count: number;
}

function getLabel(value: number): string {
  if (value === 0) return 'No hearts left';
  return value === 1 ? '1 heart left' : `${value} hearts left`;
}

export function HeartsCounter({ value, max = 5, className, ...rest }: HeartsCounterProps) {
  const safeMax = Math.max(0, Math.floor(max));
  const current = Math.min(safeMax, Math.max(0, Math.floor(value)));

  // Remember the previous value to know which way it moved (state adjusted
  // during render, so there is no effect). The first render has no change, so
  // nothing animates on mount.
  const [seen, setSeen] = useState(current);
  const [change, setChange] = useState<Change | null>(null);
  if (seen !== current) {
    setSeen(current);
    setChange({ direction: current > seen ? 'up' : 'down', count: (change?.count ?? 0) + 1 });
  }

  return (
    <span
      {...rest}
      // A new key remounts the root, which replays the one-shot animation.
      key={change ? `change-${change.count}` : 'still'}
      className={clsx(
        styles['root'],
        current === 0 && styles['isEmpty'],
        change?.direction === 'up' && styles['isGaining'],
        change?.direction === 'down' && styles['isLosing'],
        className,
      )}
      role="img"
      aria-label={getLabel(current)}
      data-value={current}
    >
      <Icon name="heart" size={24} className={styles['heart'] ?? ''} />
      <span className={styles['number']}>{current}</span>
    </span>
  );
}
