import type { ComponentPropsWithoutRef, CSSProperties, Ref } from 'react';
import clsx from 'clsx';
import { Icon } from '@/components/ui/Icon';
import styles from './PathNode.module.scss';

export type PathNodeStatus = 'completed' | 'recommended' | 'available';

export interface PathNodeProps
  extends Omit<
    ComponentPropsWithoutRef<'button'>,
    'children' | 'aria-label' | 'aria-current' | 'type' | 'disabled'
  > {
  status: PathNodeStatus;
  /** Accessible name, for example "Lesson 4, Food, recommended, start". */
  label: string;
  /** Horizontal steps from the column centre (the container computes it from the zigzag). Rounded to an integer. */
  offset?: number;
  /** Shown inside an available node. Without it an available node shows a book icon. */
  lessonNumber?: number | undefined;
  /** The button element, so a container can scroll to it or focus it. */
  ref?: Ref<HTMLButtonElement> | undefined;
}

export function PathNode({
  status,
  label,
  offset = 0,
  lessonNumber,
  ref,
  className,
  style,
  ...rest
}: PathNodeProps) {
  const steps = Math.round(Number.isFinite(offset) ? offset : 0);
  const nodeStyle = { ...style, '--path-node-offset': steps } as CSSProperties;

  return (
    <button
      {...rest}
      ref={ref}
      type="button"
      disabled={false}
      className={clsx(styles['root'], styles[status], className)}
      style={nodeStyle}
      aria-label={label}
      aria-current={status === 'recommended' ? 'step' : undefined}
      data-status={status}
    >
      {status === 'recommended' && (
        <span className={styles['bubble']} aria-hidden="true">
          START
        </span>
      )}
      {status === 'completed' && <Icon name="check" size={32} />}
      {status === 'recommended' && <Icon name="play" size={32} />}
      {status === 'available' &&
        (lessonNumber === undefined ? (
          <Icon name="book" size={28} />
        ) : (
          <span className={styles['number']} aria-hidden="true">
            {lessonNumber}
          </span>
        ))}
    </button>
  );
}
