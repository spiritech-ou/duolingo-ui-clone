import clsx from 'clsx';
import type { ButtonHTMLAttributes } from 'react';
import styles from './Button.module.scss';

export interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'disabled'> {
  variant?: 'primary' | 'secondary';
  size?: 'sm' | 'md' | 'lg';
  isDisabled?: boolean;
  isLoading?: boolean;
}

export function Button({
  variant = 'primary',
  size = 'md',
  isDisabled = false,
  isLoading = false,
  type = 'button',
  className,
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      {...rest}
      type={type}
      className={clsx(styles['root'], styles[variant], styles[size], className)}
      disabled={isDisabled || isLoading}
      aria-busy={isLoading || undefined}
    >
      {isLoading ? <span className={styles['spinner']} aria-hidden="true" /> : null}
      <span>{children}</span>
    </button>
  );
}
