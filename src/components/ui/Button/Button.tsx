import clsx from 'clsx';
import type { ButtonHTMLAttributes, MouseEvent } from 'react';
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
  onClick,
  ...rest
}: ButtonProps) {
  // While busy the button stays focusable but ignores activation (click, Enter, Space).
  function handleClick(event: MouseEvent<HTMLButtonElement>) {
    if (isLoading) {
      event.preventDefault();
      return;
    }
    onClick?.(event);
  }

  return (
    <button
      {...rest}
      type={type}
      className={clsx(
        styles['root'],
        styles[variant],
        styles[size],
        isLoading && styles['isLoading'],
        className,
      )}
      disabled={isDisabled}
      aria-disabled={isLoading ? true : rest['aria-disabled']}
      aria-busy={isLoading || undefined}
      onClick={handleClick}
    >
      {isLoading ? <span className={styles['spinner']} aria-hidden="true" /> : null}
      <span className={styles['label']}>{children}</span>
    </button>
  );
}
