import type { ComponentPropsWithoutRef } from 'react';
import clsx from 'clsx';
import styles from './Divider.module.scss';

export interface DividerProps
  extends Omit<ComponentPropsWithoutRef<'div'>, 'children' | 'role' | 'aria-hidden'> {
  /** Optional plain-text label centred on the rule, for example "OR". Without it the rule is a plain line. */
  label?: string;
}

export function Divider({ label, className, ...rest }: DividerProps) {
  return (
    <div
      {...rest}
      className={clsx(styles['root'], className)}
      // Set after the rest props so they can never hide the label or add a role.
      role={undefined}
      aria-hidden={undefined}
    >
      {/* Decorative rules: hidden from assistive tech, the label stays readable text. */}
      <span className={styles['rule']} aria-hidden="true" />
      {label ? (
        <>
          <span className={styles['label']}>{label}</span>
          <span className={styles['rule']} aria-hidden="true" />
        </>
      ) : null}
    </div>
  );
}
